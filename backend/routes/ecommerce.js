const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const EcommerceStore = require('../models/EcommerceStore');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const { auth, requirePlan } = require('../middleware/auth');
const { uploadFromBuffer } = require('../services/cloudinaryService');
const { createJazzCashPayment, createEasyPaisaPayment } = require('../services/paymentService');
const deliveryService = require('../services/deliveryService');
const { sendOrderConfirmation } = require('../services/emailService');
const { sendOrderConfirmation: sendOrderSMS } = require('../services/smsService');
const multer = require('multer');

const router = express.Router();

// Configure multer for product image uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   GET /api/ecommerce/store
// @desc    Get user's ecommerce store
// @access  Private
router.get('/store', auth, async (req, res) => {
  try {
    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Update analytics before sending
    await store.updateAnalytics();

    res.json({
      success: true,
      store: {
        id: store._id,
        settings: store.storeSettings,
        products: store.products.map(product => ({
          id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          currency: product.currency,
          images: product.images,
          category: product.category,
          subcategory: product.subcategory,
          tags: product.tags,
          inventory: product.inventory,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          views: product.views,
          orders: product.orders,
          revenue: product.revenue,
          createdAt: product.createdAt
        })),
        categories: store.categories,
        analytics: store.analytics,
        storeUrl: store.storeUrl,
        settings: store.settings,
        businessHours: store.storeSettings.businessHours
      }
    });

  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/ecommerce/store/settings
// @desc    Update store settings
// @access  Private
router.put('/store/settings', [
  body('name').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Store name must be 2-200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long'),
  body('tagline').optional().trim().isLength({ max: 100 }).withMessage('Tagline too long'),
  body('theme').optional().isIn(['modern', 'classic', 'minimal', 'colorful']),
  body('primaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format'),
  body('secondaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      tagline,
      theme,
      primaryColor,
      secondaryColor,
      contact,
      address,
      businessHours
    } = req.body;

    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Update store settings
    if (name) store.storeSettings.name = name;
    if (description) store.storeSettings.description = description;
    if (tagline) store.storeSettings.tagline = tagline;
    if (theme) store.storeSettings.theme = theme;
    if (primaryColor) store.storeSettings.primaryColor = primaryColor;
    if (secondaryColor) store.storeSettings.secondaryColor = secondaryColor;

    if (contact) {
      store.storeSettings.contact = {
        ...store.storeSettings.contact,
        ...contact
      };
    }

    if (address) {
      store.storeSettings.address = {
        ...store.storeSettings.address,
        ...address
      };
    }

    if (businessHours) {
      store.storeSettings.businessHours = {
        ...store.storeSettings.businessHours,
        ...businessHours
      };
    }

    await store.save();

    res.json({
      success: true,
      message: 'Store settings updated successfully',
      store: {
        settings: store.storeSettings,
        storeUrl: store.storeUrl
      }
    });

  } catch (error) {
    console.error('Update store settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/ecommerce/products
// @desc    Add new product
// @access  Private
router.post('/products', [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be 2-200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('inventory.quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be non-negative')
], auth, upload.array('images', 5), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      price,
      originalPrice,
      category,
      subcategory,
      tags,
      inventory,
      seo
    } = req.body;

    // Check subscription limits
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });
    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Check product limit
    if (store.products.length >= subscription.features.maxProducts) {
      return res.status(403).json({
        success: false,
        message: `Your ${subscription.plan} plan allows maximum ${subscription.features.maxProducts} products`,
        currentCount: store.products.length,
        limit: subscription.features.maxProducts
      });
    }

    // Upload product images
    const productImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadFromBuffer(
          file.buffer,
          `stores/${store._id}/products`,
          null,
          ['product', 'ecommerce']
        );

        if (uploadResult.success) {
          productImages.push({
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            alt: `${name} - Product Image`
          });
        }
      }
    }

    // Create product object
    const newProduct = {
      name: name,
      description: description || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      currency: 'PKR',
      images: productImages,
      category: category,
      subcategory: subcategory || '',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      inventory: {
        trackQuantity: inventory?.trackQuantity !== false,
        quantity: parseInt(inventory?.quantity) || 0,
        lowStockThreshold: parseInt(inventory?.lowStockThreshold) || 5,
        sku: inventory?.sku || `PRD-${Date.now()}`
      },
      isActive: true,
      isFeatured: false,
      seo: {
        metaTitle: seo?.metaTitle || name,
        metaDescription: seo?.metaDescription || description?.substring(0, 160),
        keywords: seo?.keywords || tags || []
      },
      views: 0,
      orders: 0,
      revenue: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add product to store
    store.products.push(newProduct);
    
    // Update analytics
    store.analytics.totalProducts = store.products.length;
    store.analytics.activeProducts = store.products.filter(p => p.isActive).length;
    
    await store.save();

    // Get the added product with its ID
    const addedProduct = store.products[store.products.length - 1];

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product: {
        id: addedProduct._id,
        name: addedProduct.name,
        description: addedProduct.description,
        price: addedProduct.price,
        originalPrice: addedProduct.originalPrice,
        images: addedProduct.images,
        category: addedProduct.category,
        inventory: addedProduct.inventory,
        isActive: addedProduct.isActive,
        createdAt: addedProduct.createdAt
      }
    });

  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during product creation',
      error: error.message
    });
  }
});

// @route   PUT /api/ecommerce/products/:productId
// @desc    Update product
// @access  Private
router.put('/products/:productId', [
  body('name').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be 2-200 characters'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number')
], auth, upload.array('newImages', 5), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId } = req.params;
    const {
      name,
      description,
      price,
      originalPrice,
      category,
      subcategory,
      tags,
      inventory,
      isActive,
      isFeatured,
      seo,
      removeImageIds
    } = req.body;

    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const product = store.products.id(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update product fields
    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (price) product.price = parseFloat(price);
    if (originalPrice !== undefined) product.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
    if (category) product.category = category;
    if (subcategory !== undefined) product.subcategory = subcategory;
    if (tags) product.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (isActive !== undefined) product.isActive = isActive;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;

    if (inventory) {
      product.inventory = {
        ...product.inventory,
        ...inventory
      };
    }

    if (seo) {
      product.seo = {
        ...product.seo,
        ...seo
      };
    }

    // Remove specified images
    if (removeImageIds && Array.isArray(removeImageIds)) {
      const { deleteFile } = require('../services/cloudinaryService');
      
      product.images = product.images.filter(img => {
        if (removeImageIds.includes(img.publicId)) {
          // Delete from Cloudinary
          deleteFile(img.publicId).catch(err => console.error('Image deletion error:', err));
          return false;
        }
        return true;
      });
    }

    // Add new images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadFromBuffer(
          file.buffer,
          `stores/${store._id}/products`,
          null,
          ['product', 'ecommerce']
        );

        if (uploadResult.success) {
          product.images.push({
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            alt: `${product.name} - Product Image`
          });
        }
      }
    }

    product.updatedAt = new Date();
    await store.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: {
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        images: product.images,
        category: product.category,
        subcategory: product.subcategory,
        tags: product.tags,
        inventory: product.inventory,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        seo: product.seo,
        updatedAt: product.updatedAt
      }
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during product update',
      error: error.message
    });
  }
});

// @route   DELETE /api/ecommerce/products/:productId
// @desc    Delete product
// @access  Private
router.delete('/products/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;

    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const product = store.products.id(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete product images from Cloudinary
    const { deleteFile } = require('../services/cloudinaryService');
    for (const image of product.images) {
      await deleteFile(image.publicId).catch(err => console.error('Image deletion error:', err));
    }

    // Remove product from store
    store.products.pull(productId);
    
    // Update analytics
    store.analytics.totalProducts = store.products.length;
    store.analytics.activeProducts = store.products.filter(p => p.isActive).length;
    
    await store.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during product deletion',
      error: error.message
    });
  }
});

// @route   GET /api/ecommerce/orders
// @desc    Get store orders
// @access  Private
router.get('/orders', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', startDate = '', endDate = '' } = req.query;

    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    let orders = store.orders;

    // Filter by status
    if (status) {
      orders = orders.filter(order => order.status === status);
    }

    // Filter by date range
    if (startDate || endDate) {
      orders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        if (startDate && orderDate < new Date(startDate)) return false;
        if (endDate && orderDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Sort by creation date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = orders.slice(startIndex, endIndex);

    const totalOrders = orders.length;
    const totalPages = Math.ceil(totalOrders / limit);

    // Calculate order statistics
    const stats = {
      total: store.orders.length,
      pending: store.orders.filter(o => o.status === 'pending').length,
      confirmed: store.orders.filter(o => o.status === 'confirmed').length,
      shipped: store.orders.filter(o => o.status === 'shipped').length,
      delivered: store.orders.filter(o => o.status === 'delivered').length,
      cancelled: store.orders.filter(o => o.status === 'cancelled').length,
      completed: store.orders.filter(o => o.status === 'completed').length,
      totalRevenue: store.orders
        .filter(o => ['delivered', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + o.totals.total, 0)
    };

    res.json({
      success: true,
      orders: paginatedOrders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        items: order.items,
        totals: order.totals,
        payment: order.payment,
        delivery: order.delivery,
        status: order.status,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalOrders: totalOrders,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats: stats
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/ecommerce/orders/:orderId/status
// @desc    Update order status
// @access  Private
router.put('/orders/:orderId/status', [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'completed']).withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes too long')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId } = req.params;
    const { status, notes, trackingNumber } = req.body;

    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const order = store.orders.id(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const oldStatus = order.status;
    order.status = status;
    order.updatedAt = new Date();

    if (notes) {
      order.notes = notes;
    }

    // Update delivery status based on order status
    if (status === 'shipped' && trackingNumber) {
      order.delivery.status = 'shipped';
      order.delivery.trackingNumber = trackingNumber;
    } else if (status === 'delivered') {
      order.delivery.status = 'delivered';
      order.delivery.deliveredAt = new Date();
    } else if (status === 'confirmed') {
      order.delivery.status = 'confirmed';
    }

    await store.save();

    // Send notification to customer
    try {
      if (order.customer.email) {
        await sendOrderConfirmation(order, store);
      }
      
      if (order.customer.phone) {
        await sendOrderSMS(order.customer.phone, order.orderNumber, status);
      }
    } catch (notificationError) {
      console.error('Order notification error:', notificationError);
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        delivery: order.delivery,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during order update',
      error: error.message
    });
  }
});

// @route   POST /api/ecommerce/orders/:orderId/refund
// @desc    Process order refund
// @access  Private
router.post('/orders/:orderId/refund', [
  body('reason').notEmpty().withMessage('Refund reason is required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Invalid refund amount')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId } = req.params;
    const { reason, amount } = req.body;

    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const order = store.orders.id(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.payment.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund unpaid order'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled'
      });
    }

    const refundAmount = amount || order.totals.total;

    // Update order status
    order.status = 'cancelled';
    order.payment.status = 'refunded';
    order.refund = {
      amount: refundAmount,
      reason: reason,
      processedAt: new Date(),
      processedBy: req.user._id
    };
    order.updatedAt = new Date();

    await store.save();

    // Note: In production, integrate with actual payment gateway for refund processing

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: refundAmount,
        reason: reason,
        processedAt: order.refund.processedAt
      }
    });

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during refund processing',
      error: error.message
    });
  }
});

// @route   GET /api/ecommerce/customers
// @desc    Get store customers
// @access  Private
router.get('/customers', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;

    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    let customers = store.customers;

    // Search filter
    if (search) {
      customers = customers.filter(customer =>
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.email.toLowerCase().includes(search.toLowerCase()) ||
        customer.phone.includes(search)
      );
    }

    // Sort by join date (newest first)
    customers.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedCustomers = customers.slice(startIndex, endIndex);

    const totalCustomers = customers.length;
    const totalPages = Math.ceil(totalCustomers / limit);

    // Calculate customer statistics
    const stats = {
      total: store.customers.length,
      newThisMonth: store.customers.filter(c => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(c.joinedAt) > monthAgo;
      }).length,
      topSpenders: store.customers
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5)
        .map(c => ({
          name: c.name,
          totalSpent: c.totalSpent,
          totalOrders: c.totalOrders
        })),
      averageOrderValue: store.customers.length > 0 ?
        store.customers.reduce((sum, c) => sum + (c.totalSpent / Math.max(c.totalOrders, 1)), 0) / store.customers.length : 0
    };

    res.json({
      success: true,
      customers: paginatedCustomers.map(customer => ({
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        lastOrderDate: customer.lastOrderDate,
        addresses: customer.addresses,
        joinedAt: customer.joinedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalCustomers: totalCustomers,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats: stats
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/ecommerce/analytics
// @desc    Get store analytics
// @access  Private
router.get('/analytics', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Calculate date range
    let startDate;
    const endDate = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Filter orders for the period
    const periodOrders = store.orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });

    // Calculate revenue analytics
    const revenueAnalytics = {
      totalRevenue: periodOrders.reduce((sum, order) => sum + order.totals.total, 0),
      totalOrders: periodOrders.length,
      averageOrderValue: periodOrders.length > 0 ?
        periodOrders.reduce((sum, order) => sum + order.totals.total, 0) / periodOrders.length : 0,
      completedOrders: periodOrders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
      pendingOrders: periodOrders.filter(o => o.status === 'pending').length,
      cancelledOrders: periodOrders.filter(o => o.status === 'cancelled').length
    };

    // Product performance
    const productPerformance = {};
    periodOrders.forEach(order => {
      order.items.forEach(item => {
        if (productPerformance[item.name]) {
          productPerformance[item.name].quantity += item.quantity;
          productPerformance[item.name].revenue += item.total;
        } else {
          productPerformance[item.name] = {
            name: item.name,
            quantity: item.quantity,
            revenue: item.total
          };
        }
      });
    });

    const topProducts = Object.values(productPerformance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Customer analytics
    const periodCustomers = store.customers.filter(customer => {
      const joinDate = new Date(customer.joinedAt);
      return joinDate >= startDate && joinDate <= endDate;
    });

    const customerAnalytics = {
      newCustomers: periodCustomers.length,
      returningCustomers: periodOrders.filter(order => {
        const customer = store.customers.find(c => c.email === order.customer.email);
        return customer && customer.totalOrders > 1;
      }).length,
      topCustomers: store.customers
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .map(c => ({
          name: c.name,
          email: c.email,
          totalSpent: c.totalSpent,
          totalOrders: c.totalOrders
        }))
    };

    // Daily breakdown for charts
    const dailyBreakdown = [];
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let d = new Date(startDate); d <= endDate; d.setTime(d.getTime() + dayMs)) {
      const dayStart = new Date(d);
      const dayEnd = new Date(d.getTime() + dayMs - 1);
      
      const dayOrders = periodOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });

      dailyBreakdown.push({
        date: dayStart.toISOString().split('T')[0],
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, order) => sum + order.totals.total, 0),
        customers: new Set(dayOrders.map(o => o.customer.email)).size
      });
    }

    res.json({
      success: true,
      period: period,
      dateRange: { start: startDate, end: endDate },
      analytics: {
        revenue: revenueAnalytics,
        products: {
          total: store.products.length,
          active: store.products.filter(p => p.isActive).length,
          topPerforming: topProducts
        },
        customers: customerAnalytics,
        timeline: dailyBreakdown
      }
    });

  } catch (error) {
    console.error('Get store analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
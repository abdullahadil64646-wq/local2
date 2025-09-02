const express = require('express');
const EcommerceStore = require('../models/EcommerceStore');
const { groceryCategories, popularProducts, storeSettings } = require('../config/groceryConfig');
const { 
  createJazzCashPayment, 
  createEasyPaisaPayment,
  verifyJazzCashPayment,
  verifyEasyPaisaPayment 
} = require('../services/paymentService');
const DeliveryService = require('../services/deliveryService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   GET /api/store/:storeUrl
// @desc    Get public store data for customers
// @access  Public
router.get('/:storeUrl', async (req, res) => {
  try {
    const { storeUrl } = req.params;

    // Find store by URL
    const store = await EcommerceStore.findOne({ 
      'storeSettings.storeUrl': storeUrl,
      'storeSettings.isActive': true 
    }).populate('owner', 'businessName email phone');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Prepare public store data
    const publicStoreData = {
      store: {
        id: store._id,
        settings: {
          name: store.storeSettings.storeName || store.owner.businessName,
          description: store.storeSettings.description,
          logo: store.storeSettings.logo,
          banner: store.storeSettings.banner,
          tagline: store.storeSettings.tagline,
          phone: store.storeSettings.contactInfo?.phone || store.owner.phone,
          email: store.storeSettings.contactInfo?.email || store.owner.email,
          address: store.storeSettings.contactInfo?.address,
          businessHours: store.storeSettings.businessHours || storeSettings.businessHours,
          deliverySettings: store.storeSettings.deliverySettings || storeSettings.deliverySettings,
          paymentMethods: store.storeSettings.paymentMethods || storeSettings.paymentMethods
        }
      },
      products: store.products.filter(product => product.isActive).map(product => ({
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
        unit: product.inventory?.unit || 'piece',
        inStock: product.inventory?.quantity > 0,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        orders: product.orders || 0
      })),
      categories: store.categories.filter(cat => cat.isActive),
      analytics: {
        totalProducts: store.products.filter(p => p.isActive).length,
        totalOrders: store.analytics?.totalOrders || 0,
        isOpen: checkIfStoreOpen(store.storeSettings.businessHours)
      }
    };

    res.json({
      success: true,
      ...publicStoreData
    });

  } catch (error) {
    console.error('Get public store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/store/:storeUrl/orders
// @desc    Create new order from customer
// @access  Public
router.post('/:storeUrl/orders', [
  body('customerInfo.name').trim().isLength({ min: 2 }).withMessage('Name is required'),
  body('customerInfo.email').isEmail().withMessage('Valid email is required'),
  body('customerInfo.phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('customerInfo.address.street').notEmpty().withMessage('Street address is required'),
  body('customerInfo.address.city').notEmpty().withMessage('City is required'),
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('paymentMethod').isIn(['cod', 'jazzcash', 'easypaisa']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { storeUrl } = req.params;
    const { 
      customerInfo, 
      items, 
      totals, 
      paymentMethod, 
      deliveryOption = 'standard',
      specialInstructions 
    } = req.body;

    // Find store
    const store = await EcommerceStore.findOne({ 
      'storeSettings.storeUrl': storeUrl,
      'storeSettings.isActive': true 
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Validate products and calculate totals
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = store.products.id(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.name} is not available`
        });
      }

      // Check inventory
      if (product.inventory?.trackQuantity && product.inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      const itemTotal = product.price * item.quantity;
      calculatedSubtotal += itemTotal;

      validatedItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal
      });
    }

    // Calculate delivery fee
    const deliveryFee = deliveryOption === 'express' 
      ? 300 
      : (calculatedSubtotal >= 2000 ? 0 : 150);

    // Calculate tax (5%)
    const tax = Math.round(calculatedSubtotal * 0.05);
    
    // Calculate total
    const total = calculatedSubtotal + deliveryFee + tax;

    // Create order object
    const newOrder = {
      orderNumber,
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      items: validatedItems,
      totals: {
        subtotal: calculatedSubtotal,
        delivery: deliveryFee,
        tax: tax,
        discount: 0,
        total: total
      },
      payment: {
        method: paymentMethod,
        status: 'pending',
        details: {}
      },
      delivery: {
        option: deliveryOption,
        status: 'pending',
        instructions: specialInstructions,
        estimatedTime: deliveryOption === 'express' ? '30-60 minutes' : '2-4 hours'
      },
      status: 'pending',
      notes: specialInstructions,
      createdAt: new Date()
    };

    // Add order to store
    store.orders.push(newOrder);

    // Update product inventory
    validatedItems.forEach(item => {
      const product = store.products.id(item.product);
      if (product.inventory?.trackQuantity) {
        product.inventory.quantity -= item.quantity;
      }
      product.orders = (product.orders || 0) + item.quantity;
      product.revenue = (product.revenue || 0) + item.total;
    });

    // Update store analytics
    store.analytics.totalOrders = (store.analytics.totalOrders || 0) + 1;
    store.analytics.revenue.total = (store.analytics.revenue.total || 0) + total;

    // Add customer to store if new
    const existingCustomer = store.customers.find(c => c.email === customerInfo.email);
    if (!existingCustomer) {
      store.customers.push({
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        totalOrders: 1,
        totalSpent: total,
        lastOrderDate: new Date(),
        addresses: [customerInfo.address],
        joinedAt: new Date()
      });
    } else {
      existingCustomer.totalOrders += 1;
      existingCustomer.totalSpent += total;
      existingCustomer.lastOrderDate = new Date();
    }

    // Save store with new order
    await store.save();

    // Process payment based on method
    let paymentResult = null;

    if (paymentMethod !== 'cod') {
      const orderData = {
        orderNumber,
        totalAmount: total,
        customerInfo,
        items: validatedItems
      };
      
      if (paymentMethod === 'jazzcash') {
        paymentResult = await createJazzCashPayment({ 
          orderNumber, 
          total,
          storeId: store._id 
        }, customerInfo);
      } else if (paymentMethod === 'easypaisa') {
        paymentResult = await createEasyPaisaPayment({ 
          orderNumber, 
          total,
          storeId: store._id 
        }, customerInfo);
      }
      
      if (paymentResult && !paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Payment processing failed',
          error: paymentResult.error
        });
      }
    }

    // Prepare response
    const response = {
      success: true,
      message: 'Order placed successfully',
      order: {
        orderNumber,
        status: 'pending',
        total,
        estimatedDelivery: newOrder.delivery.estimatedTime
      }
    };

    // Add payment URL if online payment
    if (paymentResult && paymentResult.paymentUrl) {
      response.paymentUrl = paymentResult.paymentUrl;
      response.paymentData = paymentResult.paymentData;
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during order creation',
      error: error.message
    });
  }
});

// @route   GET /api/store/:storeUrl/categories
// @desc    Get store categories with grocery defaults
// @access  Public
router.get('/:storeUrl/categories', async (req, res) => {
  try {
    const { storeUrl } = req.params;

    const store = await EcommerceStore.findOne({ 
      'storeSettings.storeUrl': storeUrl,
      'storeSettings.isActive': true 
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Combine store categories with default grocery categories
    const storeCategories = store.categories.filter(cat => cat.isActive);
    const defaultCategories = groceryCategories.filter(cat => 
      !storeCategories.find(sc => sc.name.toLowerCase() === cat.name.toLowerCase())
    );

    res.json({
      success: true,
      categories: [...storeCategories, ...defaultCategories],
      defaultCategories: groceryCategories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/store/:storeUrl/search
// @desc    Search products in store
// @access  Public
router.get('/:storeUrl/search', async (req, res) => {
  try {
    const { storeUrl } = req.params;
    const { q, category, minPrice, maxPrice, sortBy = 'popular', page = 1, limit = 20 } = req.query;

    const store = await EcommerceStore.findOne({ 
      'storeSettings.storeUrl': storeUrl,
      'storeSettings.isActive': true 
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    let products = store.products.filter(product => product.isActive);

    // Apply search query
    if (q) {
      const searchTerm = q.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply category filter
    if (category && category !== 'all') {
      products = products.filter(product => 
        product.category === category || product.subcategory === category
      );
    }

    // Apply price filter
    if (minPrice) {
      products = products.filter(product => product.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      products = products.filter(product => product.price <= parseFloat(maxPrice));
    }

    // Apply sorting
    products.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'popular':
        default:
          return (b.orders || 0) - (a.orders || 0);
      }
    });

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      success: true,
      products: paginatedProducts.map(product => ({
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
        unit: product.inventory?.unit || 'piece',
        inStock: product.inventory?.quantity > 0,
        orders: product.orders || 0
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: products.length,
        totalPages: Math.ceil(products.length / parseInt(limit)),
        hasNext: endIndex < products.length,
        hasPrev: startIndex > 0
      },
      filters: {
        categories: [...new Set(store.products.filter(p => p.isActive).map(p => p.category))],
        priceRange: {
          min: Math.min(...store.products.filter(p => p.isActive).map(p => p.price)),
          max: Math.max(...store.products.filter(p => p.isActive).map(p => p.price))
        }
      }
    });

  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Helper function to check if store is open
function checkIfStoreOpen(businessHours = storeSettings.businessHours) {
  const now = new Date();
  const currentDay = now.toLocaleLowerCase().slice(0, 3) + 
    now.toLocaleDateString('en', { weekday: 'long' }).toLowerCase().slice(3);
  const currentTime = now.toTimeString().slice(0, 5);

  const todayHours = businessHours[currentDay];
  if (!todayHours || !todayHours.isOpen) {
    return false;
  }

  return currentTime >= todayHours.open && currentTime <= todayHours.close;
}

module.exports = router;
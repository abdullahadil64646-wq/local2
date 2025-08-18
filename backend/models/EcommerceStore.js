const mongoose = require('mongoose');

const ecommerceStoreSchema = new mongoose.Schema({
  // Store Owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Store Basic Information
  storeSettings: {
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      maxlength: [200, 'Store name cannot exceed 200 characters']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    tagline: String,
    
    // Store URLs
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    customDomain: String,
    
    // Store Design
    theme: {
      type: String,
      enum: ['modern', 'classic', 'minimal', 'colorful'],
      default: 'modern'
    },
    primaryColor: { type: String, default: '#3B82F6' },
    secondaryColor: { type: String, default: '#1F2937' },
    
    // Store Images
    logo: {
      url: String,
      publicId: String
    },
    banner: {
      url: String,
      publicId: String
    },
    
    // Contact Information
    contact: {
      phone: String,
      whatsapp: String,
      email: String,
      facebook: String,
      instagram: String
    },
    
    // Store Address
    address: {
      street: String,
      area: String,
      city: { type: String, default: 'Karachi' },
      province: { type: String, default: 'Sindh' },
      postalCode: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    
    // Business Hours
    businessHours: {
      monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
    }
  },
  
  // Products
  products: [{
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    description: {
      type: String,
      maxlength: [2000, 'Product description cannot exceed 2000 characters']
    },
    
    // Pricing
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    originalPrice: Number, // For discount display
    currency: { type: String, default: 'PKR' },
    
    // Product Images
    images: [{
      url: String,
      publicId: String,
      alt: String
    }],
    
    // Categories
    category: {
      type: String,
      required: [true, 'Product category is required']
    },
    subcategory: String,
    tags: [String],
    
    // Inventory
    inventory: {
      trackQuantity: { type: Boolean, default: true },
      quantity: { type: Number, default: 0 },
      lowStockThreshold: { type: Number, default: 5 },
      sku: String
    },
    
    // Product Status
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    
    // SEO
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String]
    },
    
    // Analytics
    views: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  
  // Product Categories
  categories: [{
    name: String,
    description: String,
    image: {
      url: String,
      publicId: String
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  }],
  
  // Orders
  orders: [{
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    
    // Customer Information
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: {
        street: String,
        area: String,
        city: String,
        postalCode: String,
        coordinates: {
          lat: Number,
          lng: Number
        }
      }
    },
    
    // Order Items
    items: [{
      product: { type: mongoose.Schema.Types.ObjectId },
      name: String,
      price: Number,
      quantity: Number,
      total: Number
    }],
    
    // Order Totals
    totals: {
      subtotal: { type: Number, required: true },
      delivery: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true }
    },
    
    // Payment Information
    payment: {
      method: {
        type: String,
        enum: ['jazzcash', 'easypaisa', 'cod', 'bank_transfer'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
      },
      transactionId: String,
      paidAt: Date
    },
    
    // Delivery Information
    delivery: {
      method: {
        type: String,
        enum: ['bykea', 'tcs', 'leopards', 'pickup'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
      },
      trackingNumber: String,
      estimatedDelivery: Date,
      deliveredAt: Date
    },
    
    // Order Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'completed'],
      default: 'pending'
    },
    
    notes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  
  // Store Customers
  customers: [{
    name: String,
    email: String,
    phone: String,
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastOrderDate: Date,
    addresses: [{
      street: String,
      area: String,
      city: String,
      postalCode: String,
      isDefault: { type: Boolean, default: false }
    }],
    joinedAt: { type: Date, default: Date.now }
  }],
  
  // Store Analytics
  analytics: {
    // Basic Stats
    totalProducts: { type: Number, default: 0 },
    activeProducts: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 },
    
    // Revenue Stats
    revenue: {
      today: { type: Number, default: 0 },
      thisWeek: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      lastMonth: { type: Number, default: 0 },
      allTime: { type: Number, default: 0 }
    },
    
    // Order Stats
    orders: { type: Number, default: 0 },
    pendingOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    
    // Product Performance
    topSellingProducts: [{
      productId: mongoose.Schema.Types.ObjectId,
      name: String,
      sales: Number,
      revenue: Number
    }],
    
    // Customer Analytics
    newCustomers: { type: Number, default: 0 },
    returningCustomers: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    
    // Traffic Analytics
    pageViews: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // Store Settings
  settings: {
    // General Settings
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },
    allowGuestCheckout: { type: Boolean, default: true },
    requirePhoneVerification: { type: Boolean, default: false },
    
    // Payment Settings
    acceptedPayments: {
      jazzcash: { type: Boolean, default: true },
      easypaisa: { type: Boolean, default: true },
      cod: { type: Boolean, default: true },
      bankTransfer: { type: Boolean, default: false }
    },
    
    // Delivery Settings
    deliveryMethods: {
      bykea: { 
        enabled: { type: Boolean, default: true },
        freeDeliveryThreshold: { type: Number, default: 1000 }
      },
      tcs: { 
        enabled: { type: Boolean, default: true },
        freeDeliveryThreshold: { type: Number, default: 2000 }
      },
      pickup: { 
        enabled: { type: Boolean, default: true },
        instructions: String
      }
    },
    
    // Notification Settings
    notifications: {
      newOrder: { type: Boolean, default: true },
      paymentReceived: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      customerMessage: { type: Boolean, default: true }
    },
    
    // SEO Settings
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
      socialImage: {
        url: String,
        publicId: String
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for store URL
ecommerceStoreSchema.virtual('storeUrl').get(function() {
  if (this.storeSettings.customDomain) {
    return `https://${this.storeSettings.customDomain}`;
  }
  return `https://localstores.pk/store/${this.storeSettings.slug}`;
});

// Virtual for total revenue
ecommerceStoreSchema.virtual('totalRevenue').get(function() {
  return this.analytics.revenue.allTime || 0;
});

// Method to add product
ecommerceStoreSchema.methods.addProduct = function(productData) {
  this.products.push(productData);
  this.analytics.totalProducts = this.products.length;
  this.analytics.activeProducts = this.products.filter(p => p.isActive).length;
  return this.save();
};

// Method to update analytics
ecommerceStoreSchema.methods.updateAnalytics = function() {
  // Update product counts
  this.analytics.totalProducts = this.products.length;
  this.analytics.activeProducts = this.products.filter(p => p.isActive).length;
  
  // Update order counts
  this.analytics.totalOrders = this.orders.length;
  this.analytics.pendingOrders = this.orders.filter(o => o.status === 'pending').length;
  this.analytics.completedOrders = this.orders.filter(o => o.status === 'completed').length;
  
  // Update customer count
  this.analytics.totalCustomers = this.customers.length;
  
  this.analytics.lastUpdated = new Date();
  return this.save();
};

// Indexes for performance
ecommerceStoreSchema.index({ owner: 1 });
ecommerceStoreSchema.index({ 'storeSettings.slug': 1 });
ecommerceStoreSchema.index({ 'products.isActive': 1 });
ecommerceStoreSchema.index({ 'orders.orderNumber': 1 });
ecommerceStoreSchema.index({ 'orders.status': 1 });

module.exports = mongoose.model('EcommerceStore', ecommerceStoreSchema);
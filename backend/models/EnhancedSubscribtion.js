const mongoose = require('mongoose');
const { Schema } = mongoose;

// Plan Features Schema
const PlanFeaturesSchema = new Schema({
  // Social Media Features
  socialPlatforms: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  monthlyPosts: {
    type: Number,
    required: true,
    min: 1,
    max: 10000
  },
  monthlyVideos: {
    type: Number,
    default: 0,
    min: 0,
    max: 1000
  },
  monthlyImages: {
    type: Number,
    default: 0,
    min: 0,
    max: 1000
  },
  scheduledPosts: {
    type: Boolean,
    default: true
  },
  autoPosting: {
    type: Boolean,
    default: false
  },
  
  // E-commerce Features
  maxProducts: {
    type: Number,
    required: true,
    min: 0,
    max: 999999
  },
  hasShoppingCart: {
    type: Boolean,
    default: false
  },
  hasPaymentGateway: {
    type: Boolean,
    default: false
  },
  hasAIChatbot: {
    type: Boolean,
    default: false
  },
  hasDeliveryIntegration: {
    type: Boolean,
    default: false
  },
  
  // Analytics & SEO
  seoLevel: {
    type: String,
    enum: ['basic', 'good', 'advanced', 'premium'],
    default: 'basic'
  },
  hasHashtagResearch: {
    type: Boolean,
    default: false
  },
  hasAnalytics: {
    type: Boolean,
    default: false
  },
  hasAdvancedAnalytics: {
    type: Boolean,
    default: false
  },
  
  // AI Features
  aiContentGeneration: {
    type: Boolean,
    default: false
  },
  aiImageGeneration: {
    type: Boolean,
    default: false
  },
  aiVideoGeneration: {
    type: Boolean,
    default: false
  },
  
  // Storage & Bandwidth
  storageLimit: {
    type: Number, // in GB
    default: 1,
    min: 0.1,
    max: 1000
  },
  bandwidthLimit: {
    type: Number, // in GB per month
    default: 10,
    min: 1,
    max: 10000
  },
  
  // Support Features
  supportLevel: {
    type: String,
    enum: ['email', 'priority', 'dedicated', 'phone'],
    default: 'email'
  },
  supportLanguages: [{
    type: String,
    enum: ['english', 'urdu', 'both'],
    default: 'english'
  }],
  
  // Pakistani Business Specific
  pakistaniPaymentGateways: {
    jazzcash: { type: Boolean, default: false },
    easypaisa: { type: Boolean, default: false },
    bankTransfer: { type: Boolean, default: false },
    cod: { type: Boolean, default: true }
  },
  pakistaniDeliveryServices: {
    bykea: { type: Boolean, default: false },
    tcs: { type: Boolean, default: false },
    leopards: { type: Boolean, default: false },
    callCourier: { type: Boolean, default: false }
  },
  localBusinessTools: {
    urduSupport: { type: Boolean, default: false },
    localSEO: { type: Boolean, default: false },
    pakistaniHolidays: { type: Boolean, default: false },
    localMarketInsights: { type: Boolean, default: false }
  },
  
  // Advanced Features
  customBranding: {
    type: Boolean,
    default: false
  },
  whiteLabel: {
    type: Boolean,
    default: false
  },
  apiAccess: {
    type: Boolean,
    default: false
  },
  multiUser: {
    type: Boolean,
    default: false
  },
  maxUsers: {
    type: Number,
    default: 1,
    min: 1,
    max: 100
  }
});

// Usage Tracking Schema
const UsageSchema = new Schema({
  currentMonth: {
    postsGenerated: { type: Number, default: 0 },
    videosGenerated: { type: Number, default: 0 },
    imagesGenerated: { type: Number, default: 0 },
    storeViews: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }, // in MB
    bandwidthUsed: { type: Number, default: 0 }, // in MB
    apiCalls: { type: Number, default: 0 },
    month: { type: Number, default: () => new Date().getMonth() + 1 },
    year: { type: Number, default: () => new Date().getFullYear() }
  },
  previousMonth: {
    postsGenerated: { type: Number, default: 0 },
    videosGenerated: { type: Number, default: 0 },
    imagesGenerated: { type: Number, default: 0 },
    storeViews: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 },
    bandwidthUsed: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    month: { type: Number },
    year: { type: Number }
  },
  lifetime: {
    postsGenerated: { type: Number, default: 0 },
    videosGenerated: { type: Number, default: 0 },
    imagesGenerated: { type: Number, default: 0 },
    totalStoreViews: { type: Number, default: 0 },
    totalStorageUsed: { type: Number, default: 0 },
    totalBandwidthUsed: { type: Number, default: 0 },
    totalApiCalls: { type: Number, default: 0 }
  },
  dailyUsage: [{
    date: { type: Date, default: Date.now },
    posts: { type: Number, default: 0 },
    videos: { type: Number, default: 0 },
    images: { type: Number, default: 0 },
    storeViews: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 },
    bandwidthUsed: { type: Number, default: 0 }
  }],
  lastResetAt: { type: Date, default: Date.now }
});

// Billing Schema
const BillingSchema = new Schema({
  currentPeriodStart: {
    type: Date,
    required: true,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  nextBillingDate: {
    type: Date,
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  currency: {
    type: String,
    default: 'PKR'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 50
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  lastPaymentDate: Date,
  lastPaymentAmount: Number,
  lastPaymentMethod: String,
  failedPayments: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Pakistani Payment Methods
  preferredPaymentMethod: {
    type: String,
    enum: ['jazzcash', 'easypaisa', 'bank_transfer', 'cod', 'credit_card'],
    default: 'jazzcash'
  },
  
  // Invoicing
  invoicePrefix: {
    type: String,
    default: 'SL'
  },
  lastInvoiceNumber: {
    type: Number,
    default: 0
  },
  
  // Payment History
  paymentHistory: [{
    amount: Number,
    currency: String,
    method: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date,
    invoiceNumber: String,
    description: String
  }]
});

// Trial Schema
const TrialSchema = new Schema({
  isActive: {
    type: Boolean,
    default: false
  },
  startDate: Date,
  endDate: Date,
  daysRemaining: {
    type: Number,
    default: 0,
    min: 0
  },
  trialType: {
    type: String,
    enum: ['free', 'extended', 'premium_trial'],
    default: 'free'
  },
  hasUsedTrial: {
    type: Boolean,
    default: false
  },
  trialExtensions: [{
    reason: String,
    days: Number,
    extendedAt: Date,
    extendedBy: String
  }],
  conversionDate: Date,
  conversionPlan: String
});

// Pakistani Business Context Schema
const PakistaniBusinessSchema = new Schema({
  businessRegistration: {
    ntn: String, // National Tax Number
    strn: String, // Sales Tax Registration Number
    businessLicense: String,
    chamberOfCommerce: String,
    secp: String // Securities and Exchange Commission of Pakistan
  },
  
  localCompliance: {
    saleaTaxApplicable: { type: Boolean, default: false },
    incomeTaxApplicable: { type: Boolean, default: false },
    fbr: { // Federal Board of Revenue
      registered: { type: Boolean, default: false },
      category: String
    }
  },
  
  regionalSettings: {
    primaryCity: {
      type: String,
      enum: [
        'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
        'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
        'Hyderabad', 'Bahawalpur', 'Other'
      ]
    },
    operatingHours: {
      timezone: { type: String, default: 'Asia/Karachi' },
      workingDays: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }],
      prayerTimeAdjustments: { type: Boolean, default: true },
      ramadanSchedule: { type: Boolean, default: true }
    },
    
    marketingPreferences: {
      urduContent: { type: Boolean, default: false },
      localFestivals: { type: Boolean, default: true },
      islamicCalendar: { type: Boolean, default: true },
      culturalSensitivity: { type: Boolean, default: true }
    }
  },
  
  industrySpecific: {
    halaalCertification: { type: Boolean, default: false },
    exportOriented: { type: Boolean, default: false },
    smeStatus: { type: Boolean, default: true }, // Small Medium Enterprise
    womeMentrepreneurship: { type: Boolean, default: false },
    youthBusiness: { type: Boolean, default: false }
  }
});

// Main Enhanced Subscription Schema
const EnhancedSubscriptionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Plan Information
  plan: {
    type: String,
    required: true,
    enum: ['basic', 'pro', 'premium', 'enterprise', 'custom'],
    index: true
  },
  planName: {
    type: String,
    required: true
  },
  features: {
    type: PlanFeaturesSchema,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'suspended', 'expired', 'trial'],
    default: 'trial',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Trial Information
  trial: {
    type: TrialSchema,
    default: () => ({})
  },
  
  // Usage Tracking
  usage: {
    type: UsageSchema,
    default: () => ({})
  },
  
  // Billing Information
  billing: {
    type: BillingSchema,
    required: true
  },
  
  // Pakistani Business Context
  pakistaniContext: {
    type: PakistaniBusinessSchema,
    default: () => ({})
  },
  
  // Add-ons and Customizations
  addOns: [{
    name: String,
    description: String,
    price: Number,
    features: [String],
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Subscription Lifecycle
  lifecycle: {
    createdAt: { type: Date, default: Date.now },
    activatedAt: Date,
    cancelledAt: Date,
    suspendedAt: Date,
    expiredAt: Date,
    renewedAt: Date,
    downgradedAt: Date,
    upgradedAt: Date,
    
    // Cancellation
    cancellationReason: String,
    cancellationFeedback: String,
    
    // Auto-renewal
    autoRenewal: { type: Boolean, default: true },
    renewalReminders: [{
      sentAt: Date,
      reminderType: String,
      daysBeforeRenewal: Number
    }]
  },
  
  // Notifications & Alerts
  notifications: {
    usageAlerts: {
      enabled: { type: Boolean, default: true },
      thresholds: {
        posts: { type: Number, default: 80 }, // Alert at 80% usage
        storage: { type: Number, default: 90 },
        bandwidth: { type: Number, default: 85 }
      }
    },
    billingAlerts: {
      enabled: { type: Boolean, default: true },
      daysBeforeExpiry: [7, 3, 1], // Alert 7, 3, and 1 day before
      failedPaymentAlerts: { type: Boolean, default: true }
    },
    featureUpdates: {
      enabled: { type: Boolean, default: true }
    }
  },
  
  // Analytics & Metrics
  metrics: {
    roi: { // Return on Investment
      revenue: { type: Number, default: 0 },
      subscriptionCost: { type: Number, default: 0 },
      roiPercentage: { type: Number, default: 0 }
    },
    engagement: {
      averageDailyPosts: { type: Number, default: 0 },
      averageEngagementRate: { type: Number, default: 0 },
      peakUsageHours: [String],
      mostUsedFeatures: [String]
    },
    business: {
      storeConversionRate: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      customerGrowthRate: { type: Number, default: 0 },
      socialMediaGrowth: { type: Number, default: 0 }
    }
  },
  
  // Custom Fields for Enterprise
  customFields: [{
    name: String,
    value: Schema.Types.Mixed,
    type: String // 'string', 'number', 'boolean', 'date'
  }],
  
  // Integration Settings
  integrations: {
    webhook: {
      enabled: { type: Boolean, default: false },
      url: String,
      events: [String], // 'billing', 'usage', 'status_change'
      secret: String
    },
    api: {
      enabled: { type: Boolean, default: false },
      key: String,
      rateLimits: {
        requestsPerMinute: { type: Number, default: 60 },
        requestsPerDay: { type: Number, default: 1000 }
      }
    }
  },
  
  // Support & Help
  support: {
    assignedAgent: String,
    supportTickets: [{
      ticketId: String,
      subject: String,
      status: String,
      priority: String,
      createdAt: Date,
      resolvedAt: Date
    }],
    onboardingCompleted: { type: Boolean, default: false },
    trainingProvided: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
EnhancedSubscriptionSchema.index({ user: 1, status: 1 });
EnhancedSubscriptionSchema.index({ plan: 1, status: 1 });
EnhancedSubscriptionSchema.index({ 'billing.nextBillingDate': 1 });
EnhancedSubscriptionSchema.index({ 'trial.isActive': 1, 'trial.endDate': 1 });
EnhancedSubscriptionSchema.index({ status: 1, 'lifecycle.activatedAt': 1 });

// Virtual fields
EnhancedSubscriptionSchema.virtual('isTrialActive').get(function() {
  return this.trial.isActive && this.trial.endDate > new Date();
});

EnhancedSubscriptionSchema.virtual('daysUntilRenewal').get(function() {
  if (!this.billing.nextBillingDate) return 0;
  const diffTime = this.billing.nextBillingDate - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

EnhancedSubscriptionSchema.virtual('usagePercentage').get(function() {
  const usage = this.usage.currentMonth;
  const features = this.features;
  
  return {
    posts: (usage.postsGenerated / features.monthlyPosts) * 100,
    videos: features.monthlyVideos > 0 ? (usage.videosGenerated / features.monthlyVideos) * 100 : 0,
    images: features.monthlyImages > 0 ? (usage.imagesGenerated / features.monthlyImages) * 100 : 0,
    storage: (usage.storageUsed / (features.storageLimit * 1024)) * 100 // Convert GB to MB
  };
});

EnhancedSubscriptionSchema.virtual('isExpiringSoon').get(function() {
  const daysUntilRenewal = this.daysUntilRenewal;
  return daysUntilRenewal <= 7 && daysUntilRenewal > 0;
});

// Instance Methods
EnhancedSubscriptionSchema.methods.canUseFeature = function(featureName) {
  return this.features[featureName] === true || this.features[featureName] > 0;
};

EnhancedSubscriptionSchema.methods.getRemainingUsage = function(usageType) {
  const usage = this.usage.currentMonth;
  const features = this.features;
  
  switch (usageType) {
    case 'posts':
      return Math.max(0, features.monthlyPosts - usage.postsGenerated);
    case 'videos':
      return Math.max(0, features.monthlyVideos - usage.videosGenerated);
    case 'images':
      return Math.max(0, features.monthlyImages - usage.imagesGenerated);
    case 'storage':
      return Math.max(0, (features.storageLimit * 1024) - usage.storageUsed); // in MB
    default:
      return 0;
  }
};

EnhancedSubscriptionSchema.methods.incrementUsage = function(usageType, amount = 1) {
  const usage = this.usage;
  
  // Update current month
  if (usage.currentMonth[usageType] !== undefined) {
    usage.currentMonth[usageType] += amount;
  }
  
  // Update lifetime
  const lifetimeKey = usageType === 'storeViews' ? 'totalStoreViews' : 
                      usageType === 'storageUsed' ? 'totalStorageUsed' :
                      usageType === 'bandwidthUsed' ? 'totalBandwidthUsed' :
                      usageType === 'apiCalls' ? 'totalApiCalls' :
                      usageType + 'Generated';
                      
  if (usage.lifetime[lifetimeKey] !== undefined) {
    usage.lifetime[lifetimeKey] += amount;
  }
  
  // Update daily usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let dailyUsage = usage.dailyUsage.find(d => 
    d.date.getTime() === today.getTime()
  );
  
  if (!dailyUsage) {
    dailyUsage = {
      date: today,
      posts: 0,
      videos: 0,
      images: 0,
      storeViews: 0,
      storageUsed: 0,
      bandwidthUsed: 0
    };
    usage.dailyUsage.push(dailyUsage);
  }
  
  if (dailyUsage[usageType] !== undefined) {
    dailyUsage[usageType] += amount;
  }
  
  // Keep only last 30 days of daily usage
  if (usage.dailyUsage.length > 30) {
    usage.dailyUsage = usage.dailyUsage.slice(-30);
  }
  
  return this.save();
};

EnhancedSubscriptionSchema.methods.resetMonthlyUsage = function() {
  // Move current to previous
  this.usage.previousMonth = { ...this.usage.currentMonth };
  
  // Reset current month
  this.usage.currentMonth = {
    postsGenerated: 0,
    videosGenerated: 0,
    imagesGenerated: 0,
    storeViews: 0,
    storageUsed: 0,
    bandwidthUsed: 0,
    apiCalls: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  };
  
  this.usage.lastResetAt = new Date();
  
  return this.save();
};

EnhancedSubscriptionSchema.methods.upgradePlan = function(newPlan, newFeatures) {
  this.plan = newPlan;
  this.features = { ...this.features, ...newFeatures };
  this.lifecycle.upgradedAt = new Date();
  
  return this.save();
};

EnhancedSubscriptionSchema.methods.downgradePlan = function(newPlan, newFeatures) {
  this.plan = newPlan;
  this.features = { ...this.features, ...newFeatures };
  this.lifecycle.downgradedAt = new Date();
  
  return this.save();
};

EnhancedSubscriptionSchema.methods.cancelSubscription = function(reason, feedback) {
  this.status = 'cancelled';
  this.lifecycle.cancelledAt = new Date();
  this.lifecycle.cancellationReason = reason;
  this.lifecycle.cancellationFeedback = feedback;
  this.lifecycle.autoRenewal = false;
  
  return this.save();
};

EnhancedSubscriptionSchema.methods.activateSubscription = function() {
  this.status = 'active';
  this.isActive = true;
  this.lifecycle.activatedAt = new Date();
  
  // End trial if active
  if (this.trial.isActive) {
    this.trial.isActive = false;
    this.trial.conversionDate = new Date();
    this.trial.conversionPlan = this.plan;
  }
  
  return this.save();
};

EnhancedSubscriptionSchema.methods.extendTrial = function(days, reason) {
  if (this.trial.isActive) {
    this.trial.endDate = new Date(this.trial.endDate.getTime() + days * 24 * 60 * 60 * 1000);
    this.trial.daysRemaining += days;
    
    this.trial.trialExtensions.push({
      reason,
      days,
      extendedAt: new Date(),
      extendedBy: 'system'
    });
  }
  
  return this.save();
};

EnhancedSubscriptionSchema.methods.addPayment = function(paymentData) {
  this.billing.paymentHistory.push({
    amount: paymentData.amount,
    currency: paymentData.currency || 'PKR',
    method: paymentData.method,
    transactionId: paymentData.transactionId,
    status: paymentData.status || 'completed',
    paidAt: new Date(),
    invoiceNumber: this.generateInvoiceNumber(),
    description: paymentData.description
  });
  
  if (paymentData.status === 'completed') {
    this.billing.lastPaymentDate = new Date();
    this.billing.lastPaymentAmount = paymentData.amount;
    this.billing.lastPaymentMethod = paymentData.method;
    this.billing.failedPayments = 0; // Reset failed payments counter
    
    // Update next billing date
    const currentEnd = this.billing.currentPeriodEnd;
    this.billing.currentPeriodStart = currentEnd;
    
    if (this.billing.billingCycle === 'monthly') {
      this.billing.currentPeriodEnd = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
      this.billing.nextBillingDate = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (this.billing.billingCycle === 'yearly') {
      this.billing.currentPeriodEnd = new Date(currentEnd.getTime() + 365 * 24 * 60 * 60 * 1000);
      this.billing.nextBillingDate = new Date(currentEnd.getTime() + 365 * 24 * 60 * 60 * 1000);
    }
    
    this.lifecycle.renewedAt = new Date();
  } else if (paymentData.status === 'failed') {
    this.billing.failedPayments += 1;
  }
  
  return this.save();
};

EnhancedSubscriptionSchema.methods.generateInvoiceNumber = function() {
  this.billing.lastInvoiceNumber += 1;
  const prefix = this.billing.invoicePrefix || 'SL';
  const year = new Date().getFullYear();
  const number = this.billing.lastInvoiceNumber.toString().padStart(6, '0');
  
  return `${prefix}-${year}-${number}`;
};

// Static Methods
EnhancedSubscriptionSchema.statics.getActiveSubscriptions = function() {
  return this.find({ status: 'active', isActive: true });
};

EnhancedSubscriptionSchema.statics.getExpiringSubscriptions = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    'billing.nextBillingDate': { $lte: futureDate }
  });
};

EnhancedSubscriptionSchema.statics.getTrialSubscriptions = function() {
  return this.find({ 
    'trial.isActive': true,
    'trial.endDate': { $gte: new Date() }
  });
};

EnhancedSubscriptionSchema.statics.getRevenueStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        'billing.paymentHistory.paidAt': {
          $gte: startDate,
          $lte: endDate
        },
        'billing.paymentHistory.status': 'completed'
      }
    },
    {
      $unwind: '$billing.paymentHistory'
    },
    {
      $match: {
        'billing.paymentHistory.paidAt': {
          $gte: startDate,
          $lte: endDate
        },
        'billing.paymentHistory.status': 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$billing.paymentHistory.amount' },
        totalPayments: { $sum: 1 },
        averagePayment: { $avg: '$billing.paymentHistory.amount' }
      }
    }
  ]);
};

module.exports = mongoose.model('EnhancedSubscription', EnhancedSubscriptionSchema);
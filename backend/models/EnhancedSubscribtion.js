const mongoose = require('mongoose');

const enhancedSubscriptionSchema = new mongoose.Schema({
  // User Reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Subscription Details
  plan: {
    type: String,
    enum: ['basic', 'pro', 'premium'],
    required: true,
    default: 'basic'
  },
  
  // Plan Pricing (PKR)
  pricing: {
    basic: { type: Number, default: 1500 },
    pro: { type: Number, default: 3000 },
    premium: { type: Number, default: 5000 }
  },
  
  // Current Plan Features
  features: {
    // Social Media
    socialPlatforms: {
      type: Number,
      default: function() {
        switch(this.plan) {
          case 'basic': return 1;  // Facebook only
          case 'pro': return 2;    // Facebook + Instagram
          case 'premium': return 3; // Facebook + Instagram + Twitter
          default: return 1;
        }
      }
    },
    
    // Content Generation
    monthlyPosts: {
      type: Number,
      default: function() {
        switch(this.plan) {
          case 'basic': return 6;   // 6 posts per month
          case 'pro': return 10;    // 10 posts per month
          case 'premium': return 10; // 10 posts per month
          default: return 6;
        }
      }
    },
    monthlyVideos: {
      type: Number,
      default: function() {
        switch(this.plan) {
          case 'basic': return 0;   // No videos
          case 'pro': return 2;     // 2 videos per month
          case 'premium': return 5; // 5 videos per month
          default: return 0;
        }
      }
    },
    
    // Ecommerce Features
    maxProducts: {
      type: Number,
      default: function() {
        switch(this.plan) {
          case 'basic': return 20;      // 20 products max
          case 'pro': return 100;       // 100 products max
          case 'premium': return 99999; // Unlimited products
          default: return 20;
        }
      }
    },
    hasShoppingCart: {
      type: Boolean,
      default: function() {
        return this.plan !== 'basic'; // Pro and Premium only
      }
    },
    hasPaymentGateway: {
      type: Boolean,
      default: function() {
        return this.plan !== 'basic'; // Pro and Premium only
      }
    },
    hasAIChatbot: {
      type: Boolean,
      default: function() {
        return this.plan === 'premium'; // Premium only
      }
    },
    hasDeliveryIntegration: {
      type: Boolean,
      default: function() {
        return this.plan === 'premium'; // Premium only
      }
    },
    
    // SEO Features
    seoLevel: {
      type: String,
      enum: ['basic', 'good', 'advanced'],
      default: function() {
        switch(this.plan) {
          case 'basic': return 'basic';
          case 'pro': return 'good';
          case 'premium': return 'advanced';
          default: return 'basic';
        }
      }
    },
    hasHashtagResearch: {
      type: Boolean,
      default: function() {
        return this.plan === 'premium'; // Premium only
      }
    },
    hasAnalytics: {
      type: Boolean,
      default: function() {
        return this.plan !== 'basic'; // Pro and Premium only
      }
    }
  },
  
  // Usage Tracking
  usage: {
    currentMonth: {
      postsGenerated: { type: Number, default: 0 },
      videosGenerated: { type: Number, default: 0 },
      postsPublished: { type: Number, default: 0 }
    },
    lastMonth: {
      postsGenerated: { type: Number, default: 0 },
      videosGenerated: { type: Number, default: 0 },
      postsPublished: { type: Number, default: 0 }
    },
    totalLifetime: {
      postsGenerated: { type: Number, default: 0 },
      videosGenerated: { type: Number, default: 0 },
      postsPublished: { type: Number, default: 0 }
    }
  },
  
  // Billing Information
  billing: {
    status: {
      type: String,
      enum: ['active', 'cancelled', 'suspended', 'pending'],
      default: 'pending'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    
    // Payment History
    payments: [{
      amount: Number,
      currency: { type: String, default: 'PKR' },
      status: { type: String, enum: ['paid', 'failed', 'pending'] },
      stripePaymentIntentId: String,
      paidAt: Date,
      createdAt: { type: Date, default: Date.now }
    }],
    
    // Next billing
    nextBillingDate: Date,
    nextBillingAmount: Number
  },
  
  // Trial Information
  trial: {
    isActive: { type: Boolean, default: false },
    startDate: Date,
    endDate: Date,
    daysRemaining: {
      type: Number,
      default: 0
    }
  },
  
  // Applied Offers
  appliedOffers: [{
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    offerCode: String,
    discountAmount: Number,
    discountPercentage: Number,
    appliedAt: { type: Date, default: Date.now }
  }],
  
  // Subscription Analytics
  analytics: {
    activeDays: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageMonthlyRevenue: { type: Number, default: 0 },
    churnRisk: { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
  },
  
  // Auto-renewal settings
  autoRenewal: {
    enabled: { type: Boolean, default: true },
    reminderSent: { type: Boolean, default: false },
    reminderDate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for days until next billing
enhancedSubscriptionSchema.virtual('daysUntilNextBilling').get(function() {
  if (!this.billing.nextBillingDate) return 0;
  const today = new Date();
  const nextBilling = new Date(this.billing.nextBillingDate);
  const diffTime = nextBilling - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for current plan price
enhancedSubscriptionSchema.virtual('currentPlanPrice').get(function() {
  return this.pricing[this.plan] || 0;
});

// Virtual for usage percentage
enhancedSubscriptionSchema.virtual('usagePercentage').get(function() {
  const postsUsed = this.usage.currentMonth.postsGenerated;
  const postsLimit = this.features.monthlyPosts;
  return postsLimit > 0 ? Math.round((postsUsed / postsLimit) * 100) : 0;
});

// Method to check if user can generate more posts
enhancedSubscriptionSchema.methods.canGeneratePost = function() {
  return this.usage.currentMonth.postsGenerated < this.features.monthlyPosts;
};

// Method to check if user can generate more videos
enhancedSubscriptionSchema.methods.canGenerateVideo = function() {
  return this.usage.currentMonth.videosGenerated < this.features.monthlyVideos;
};

// Method to increment usage
enhancedSubscriptionSchema.methods.incrementUsage = function(type) {
  if (type === 'post') {
    this.usage.currentMonth.postsGenerated += 1;
    this.usage.totalLifetime.postsGenerated += 1;
  } else if (type === 'video') {
    this.usage.currentMonth.videosGenerated += 1;
    this.usage.totalLifetime.videosGenerated += 1;
  } else if (type === 'published') {
    this.usage.currentMonth.postsPublished += 1;
    this.usage.totalLifetime.postsPublished += 1;
  }
  return this.save();
};

// Method to reset monthly usage (called at start of each month)
enhancedSubscriptionSchema.methods.resetMonthlyUsage = function() {
  this.usage.lastMonth = { ...this.usage.currentMonth };
  this.usage.currentMonth = {
    postsGenerated: 0,
    videosGenerated: 0,
    postsPublished: 0
  };
  return this.save();
};

// Method to upgrade plan
enhancedSubscriptionSchema.methods.upgradePlan = function(newPlan) {
  if (['basic', 'pro', 'premium'].includes(newPlan)) {
    this.plan = newPlan;
    // Update features based on new plan
    this.features.socialPlatforms = newPlan === 'basic' ? 1 : newPlan === 'pro' ? 2 : 3;
    this.features.monthlyPosts = newPlan === 'basic' ? 6 : 10;
    this.features.monthlyVideos = newPlan === 'basic' ? 0 : newPlan === 'pro' ? 2 : 5;
    this.features.maxProducts = newPlan === 'basic' ? 20 : newPlan === 'pro' ? 100 : 99999;
    this.features.hasShoppingCart = newPlan !== 'basic';
    this.features.hasPaymentGateway = newPlan !== 'basic';
    this.features.hasAIChatbot = newPlan === 'premium';
    this.features.hasDeliveryIntegration = newPlan === 'premium';
    this.features.seoLevel = newPlan === 'basic' ? 'basic' : newPlan === 'pro' ? 'good' : 'advanced';
    this.features.hasHashtagResearch = newPlan === 'premium';
    this.features.hasAnalytics = newPlan !== 'basic';
  }
  return this.save();
};

// Static method to find active subscriptions
enhancedSubscriptionSchema.statics.findActiveSubscriptions = function() {
  return this.find({ 'billing.status': 'active' });
};

// Indexes
enhancedSubscriptionSchema.index({ user: 1 });
enhancedSubscriptionSchema.index({ plan: 1 });
enhancedSubscriptionSchema.index({ 'billing.status': 1 });
enhancedSubscriptionSchema.index({ 'billing.nextBillingDate': 1 });

module.exports = mongoose.model('EnhancedSubscription', enhancedSubscriptionSchema);
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  // Offer Basic Info
  name: {
    type: String,
    required: [true, 'Offer name is required'],
    trim: true,
    maxlength: [200, 'Offer name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Offer description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Offer Code
  code: {
    type: String,
    required: [true, 'Offer code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9]{3,20}$/, 'Offer code must be 3-20 characters, letters and numbers only']
  },
  
  // Discount Details
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'free_trial'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: [0, 'Discount value cannot be negative']
    },
    maxDiscount: Number, // For percentage discounts
    currency: { type: String, default: 'PKR' }
  },
  
  // Offer Validity
  validity: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    timezone: { type: String, default: 'Asia/Karachi' }
  },
  
  // Usage Limits
  usage: {
    totalLimit: {
      type: Number,
      default: null // null means unlimited
    },
    perUserLimit: {
      type: Number,
      default: 1
    },
    currentUsage: {
      type: Number,
      default: 0
    }
  },
  
  // Target Audience
  targeting: {
    // User Type
    userType: {
      type: String,
      enum: ['all', 'new_users', 'existing_users', 'premium_users'],
      default: 'all'
    },
    
    // Business Type
    businessTypes: {
      type: [String],
      default: ['all'] // ['restaurant', 'retail', 'salon', 'gym', 'services', 'cafe', 'karyana']
    },
    
    // Geographic
    cities: {
      type: [String],
      default: ['all'] // ['karachi', 'lahore', 'islamabad', 'peshawar', 'quetta']
    },
    
    // Plan Targeting
    applicablePlans: {
      type: [String],
      enum: ['basic', 'pro', 'premium'],
      default: ['basic', 'pro', 'premium']
    },
    
    // First Time Users Only
    firstTimeOnly: {
      type: Boolean,
      default: false
    }
  },
  
  // Offer Conditions
  conditions: {
    minimumCommitment: {
      months: { type: Number, default: 1 },
      required: { type: Boolean, default: false }
    },
    
    // Auto-apply conditions
    autoApply: {
      enabled: { type: Boolean, default: false },
      conditions: [String] // e.g., ['new_signup', 'first_subscription']
    },
    
    // Stackable with other offers
    stackable: { type: Boolean, default: false },
    
    // Requires specific actions
    requiresAction: {
      socialMediaConnection: { type: Boolean, default: false },
      profileCompletion: { type: Boolean, default: false },
      emailVerification: { type: Boolean, default: false }
    }
  },
  
  // Offer Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Creator (Admin who created this offer)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Analytics
  analytics: {
    totalViews: { type: Number, default: 0 },
    totalClaims: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    
    // Usage by user type
    usageByUserType: {
      newUsers: { type: Number, default: 0 },
      existingUsers: { type: Number, default: 0 }
    },
    
    // Usage by business type
    usageByBusinessType: [{
      businessType: String,
      count: { type: Number, default: 0 }
    }],
    
    // Monthly breakdown
    monthlyUsage: [{
      month: String, // YYYY-MM format
      usage: Number,
      revenue: Number
    }]
  },
  
  // Marketing
  marketing: {
    featured: { type: Boolean, default: false },
    displayOnHomepage: { type: Boolean, default: false },
    emailCampaign: { type: Boolean, default: false },
    socialMediaPromo: { type: Boolean, default: false },
    
    // Campaign tracking
    campaignSource: String,
    campaignMedium: String,
    campaignName: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for offer validity status
offerSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && 
         now >= this.validity.startDate && 
         now <= this.validity.endDate &&
         (this.usage.totalLimit === null || this.usage.currentUsage < this.usage.totalLimit);
});

// Virtual for days remaining
offerSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const endDate = new Date(this.validity.endDate);
  const diffTime = endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for usage percentage
offerSchema.virtual('usagePercentage').get(function() {
  if (this.usage.totalLimit === null) return 0;
  return Math.round((this.usage.currentUsage / this.usage.totalLimit) * 100);
});

// Method to check if user can use this offer
offerSchema.methods.canUserUse = function(user, userOfferUsage = 0) {
  // Check if offer is valid
  if (!this.isValid) return false;
  
  // Check per-user limit
  if (userOfferUsage >= this.usage.perUserLimit) return false;
  
  // Check user type targeting
  if (this.targeting.userType === 'new_users' && user.totalPosts > 0) return false;
  if (this.targeting.userType === 'existing_users' && user.totalPosts === 0) return false;
  
  // Check business type targeting
  if (!this.targeting.businessTypes.includes('all') && 
      !this.targeting.businessTypes.includes(user.businessType)) return false;
  
  // Check city targeting
  if (!this.targeting.cities.includes('all') && 
      !this.targeting.cities.includes(user.address.city.toLowerCase())) return false;
  
  return true;
};

// Method to apply offer
offerSchema.methods.applyOffer = function(originalAmount) {
  let discountAmount = 0;
  
  if (this.discount.type === 'percentage') {
    discountAmount = Math.round((originalAmount * this.discount.value) / 100);
    if (this.discount.maxDiscount) {
      discountAmount = Math.min(discountAmount, this.discount.maxDiscount);
    }
  } else if (this.discount.type === 'fixed') {
    discountAmount = Math.min(this.discount.value, originalAmount);
  } else if (this.discount.type === 'free_trial') {
    discountAmount = originalAmount; // Full discount for trial
  }
  
  return {
    originalAmount,
    discountAmount,
    finalAmount: Math.max(0, originalAmount - discountAmount),
    discountPercentage: Math.round((discountAmount / originalAmount) * 100)
  };
};

// Method to increment usage
offerSchema.methods.incrementUsage = function(userId, revenue = 0) {
  this.usage.currentUsage += 1;
  this.analytics.totalClaims += 1;
  this.analytics.totalRevenue += revenue;
  
  // Update conversion rate
  if (this.analytics.totalViews > 0) {
    this.analytics.conversionRate = (this.analytics.totalClaims / this.analytics.totalViews) * 100;
  }
  
  return this.save();
};

// Static method to find valid offers for user
offerSchema.statics.findValidOffersForUser = function(user) {
  const now = new Date();
  
  return this.find({
    isActive: true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now },
    $or: [
      { 'usage.totalLimit': null },
      { $expr: { $lt: ['$usage.currentUsage', '$usage.totalLimit'] } }
    ]
  });
};

// Indexes
offerSchema.index({ code: 1 });
offerSchema.index({ isActive: 1, 'validity.startDate': 1, 'validity.endDate': 1 });
offerSchema.index({ 'targeting.userType': 1 });
offerSchema.index({ 'targeting.businessTypes': 1 });

module.exports = mongoose.model('Offer', offerSchema);
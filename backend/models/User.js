const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  
  // Business Information
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [100, 'Business name cannot exceed 100 characters']
  },
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
    enum: [
      'restaurant', 'retail', 'salon', 'gym', 'cafe', 'karyana', 
      'services', 'technology', 'healthcare', 'education', 
      'real_estate', 'automotive', 'beauty', 'fitness',
      'fashion', 'food', 'travel', 'entertainment', 
      'finance', 'manufacturing', 'other'
    ]
  },
  businessDescription: {
    type: String,
    maxlength: [500, 'Business description cannot exceed 500 characters']
  },
  businessCategory: {
    type: String,
    enum: ['small', 'medium', 'large', 'enterprise'],
    default: 'small'
  },
  businessRegistrationNumber: String,
  taxNumber: String,
  
  // Contact Information
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^(\+92|0)[0-9]{10}$/, 'Please enter a valid Pakistani phone number']
  },
  whatsapp: String,
  alternateEmail: String,
  
  // Address Information
  address: {
    street: String,
    area: String,
    city: {
      type: String,
      required: true,
      enum: [
        'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
        'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
        'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
        'Mardan', 'Mingora', 'Sheikhupura', 'Jhang', 'Rahim Yar Khan',
        'Gujrat', 'Kasur', 'Dera Ghazi Khan', 'Sahiwal', 'Okara',
        'Wah Cantonment', 'Burewala', 'Kohat', 'Muzaffargarh', 'Other'
      ]
    },
    province: {
      type: String,
      enum: ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Islamabad', 'AJK', 'GB'],
      required: true
    },
    postalCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Profile & Preferences
  avatar: {
    url: String,
    publicId: String
  },
  timezone: {
    type: String,
    default: 'Asia/Karachi'
  },
  language: {
    type: String,
    enum: ['en', 'ur', 'both'],
    default: 'en'
  },
  currency: {
    type: String,
    default: 'PKR'
  },
  
  // Account Verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  emailVerifiedAt: Date,
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerificationCode: String,
  phoneVerificationExpire: Date,
  phoneVerifiedAt: Date,
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: String,
  suspensionDate: Date,
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Social Media Connections
  socialMedia: {
    facebook: {
      connected: { type: Boolean, default: false },
      pageId: String,
      pageName: String,
      accessToken: String,
      connectedAt: Date,
      lastChecked: Date,
      followers: { type: Number, default: 0 },
      isValid: { type: Boolean, default: true }
    },
    instagram: {
      connected: { type: Boolean, default: false },
      accountId: String,
      username: String,
      accessToken: String,
      connectedAt: Date,
      lastChecked: Date,
      followers: { type: Number, default: 0 },
      mediaCount: { type: Number, default: 0 },
      isValid: { type: Boolean, default: true }
    },
    twitter: {
      connected: { type: Boolean, default: false },
      userId: String,
      username: String,
      accessToken: String,
      accessSecret: String,
      connectedAt: Date,
      lastChecked: Date,
      followers: { type: Number, default: 0 },
      isValid: { type: Boolean, default: true }
    },
    linkedin: {
      connected: { type: Boolean, default: false },
      profileId: String,
      accessToken: String,
      connectedAt: Date,
      lastChecked: Date,
      connections: { type: Number, default: 0 },
      isValid: { type: Boolean, default: true }
    },
    tiktok: {
      connected: { type: Boolean, default: false },
      userId: String,
      username: String,
      accessToken: String,
      connectedAt: Date,
      lastChecked: Date,
      followers: { type: Number, default: 0 },
      isValid: { type: Boolean, default: true }
    }
  },
  
  // Business Analytics & Insights
  businessInsights: {
    targetAudience: {
      type: String,
      enum: [
        'local_customers', 'young_adults', 'families', 'professionals',
        'students', 'seniors', 'businesses', 'tourists', 'all'
      ],
      default: 'local_customers'
    },
    businessGoals: [{
      type: String,
      enum: [
        'brand_awareness', 'lead_generation', 'sales', 'engagement',
        'traffic', 'app_installs', 'event_promotion', 'customer_retention',
        'social_media_growth', 'email_subscribers'
      ]
    }],
    monthlyBudget: {
      type: Number,
      min: 0,
      max: 1000000
    },
    competitorAnalysis: {
      enabled: { type: Boolean, default: false },
      competitors: [String],
      lastAnalyzed: Date
    },
    marketingChannels: [{
      channel: String,
      effectiveness: { type: Number, min: 1, max: 10 },
      budget: Number
    }]
  },
  
  // Subscription & Billing
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EnhancedSubscription'
  },
  
  // Store Reference
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EcommerceStore'
  },
  
  // Usage Analytics
  usageStats: {
    totalLogins: { type: Number, default: 0 },
    lastLoginAt: Date,
    lastLoginIP: String,
    totalPostsCreated: { type: Number, default: 0 },
    totalImagesGenerated: { type: Number, default: 0 },
    totalVideosCreated: { type: Number, default: 0 },
    totalStoreViews: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 }
  },
  
  // Preferences & Settings
  preferences: {
    notifications: {
      email: {
        marketing: { type: Boolean, default: true },
        posts: { type: Boolean, default: true },
        orders: { type: Boolean, default: true },
        analytics: { type: Boolean, default: false },
        security: { type: Boolean, default: true }
      },
      sms: {
        important: { type: Boolean, default: true },
        orders: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false }
      },
      push: {
        posts: { type: Boolean, default: true },
        orders: { type: Boolean, default: true },
        reminders: { type: Boolean, default: true }
      }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'business_only'],
        default: 'business_only'
      },
      dataSharing: { type: Boolean, default: false },
      analyticsSharing: { type: Boolean, default: true }
    },
    automation: {
      autoPost: { type: Boolean, default: false },
      autoRespond: { type: Boolean, default: false },
      smartScheduling: { type: Boolean, default: true },
      contentSuggestions: { type: Boolean, default: true }
    },
    appearance: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
      },
      dashboardLayout: {
        type: String,
        enum: ['compact', 'comfortable', 'spacious'],
        default: 'comfortable'
      }
    }
  },
  
  // Security Settings
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    trustedDevices: [{
      deviceId: String,
      deviceName: String,
      lastUsed: Date,
      ipAddress: String,
      userAgent: String
    }],
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    passwordChangedAt: Date,
    securityQuestions: [{
      question: String,
      answer: String
    }]
  },
  
  // API Access
  apiAccess: {
    enabled: { type: Boolean, default: false },
    apiKey: String,
    apiSecret: String,
    rateLimits: {
      requestsPerHour: { type: Number, default: 100 },
      requestsPerDay: { type: Number, default: 1000 }
    },
    lastApiCall: Date
  },
  
  // Tags & Organization
  tags: [String],
  notes: String,
  
  // Referral System
  referral: {
    code: {
      type: String,
      unique: true,
      sparse: true
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    referredUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      signupDate: Date,
      commissionEarned: Number,
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'paid'],
        default: 'pending'
      }
    }],
    totalCommission: { type: Number, default: 0 },
    paidCommission: { type: Number, default: 0 }
  },
  
  // Onboarding & Help
  onboarding: {
    completed: { type: Boolean, default: false },
    currentStep: { type: Number, default: 1 },
    stepsCompleted: [Number],
    completedAt: Date,
    skipped: { type: Boolean, default: false }
  },
  
  // Compliance & Legal
  compliance: {
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: Date,
    privacyPolicyAccepted: { type: Boolean, default: false },
    privacyPolicyAcceptedAt: Date,
    marketingConsent: { type: Boolean, default: false },
    dataProcessingConsent: { type: Boolean, default: false }
  },
  
  // Meta Information
  source: {
    type: String,
    enum: ['direct', 'google', 'facebook', 'referral', 'advertisement'],
    default: 'direct'
  },
  utm: {
    source: String,
    medium: String,
    campaign: String,
    term: String,
    content: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ businessType: 1 });
UserSchema.index({ 'address.city': 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'subscription': 1 });
UserSchema.index({ 'referral.code': 1 });

// Virtual for account lock status
UserSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Virtual for full address
UserSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street ? addr.street + ', ' : ''}${addr.area ? addr.area + ', ' : ''}${addr.city}, ${addr.province}`;
});

// Virtual for social media connections count
UserSchema.virtual('connectedPlatforms').get(function() {
  const platforms = this.socialMedia;
  return Object.keys(platforms).filter(platform => platforms[platform].connected).length;
});

// Virtual for business age
UserSchema.virtual('businessAge').get(function() {
  const diffTime = Math.abs(new Date() - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware
UserSchema.pre('save', async function(next) {
  // Hash password if modified
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  this.security.passwordChangedAt = Date.now() - 1000;
  next();
});

// Pre-save middleware for referral code
UserSchema.pre('save', function(next) {
  if (!this.referral.code && this.isNew) {
    this.referral.code = `SL${this.businessName.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-4)}`;
  }
  next();
});

// Instance methods
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

UserSchema.methods.generateResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

UserSchema.methods.generatePhoneVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.phoneVerificationCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');
    
  this.phoneVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return code;
};

UserSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockUntil': 1 },
      $set: { 'security.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // If we have max attempts and no lock, lock account
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      businessType: this.businessType 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

UserSchema.methods.updateLastLogin = function(ipAddress) {
  this.usageStats.lastLoginAt = new Date();
  this.usageStats.lastLoginIP = ipAddress;
  this.usageStats.totalLogins += 1;
  
  // Reset login attempts on successful login
  this.security.loginAttempts = 0;
  this.security.lockUntil = undefined;
  
  return this.save();
};

UserSchema.methods.addTrustedDevice = function(deviceInfo) {
  const device = {
    deviceId: deviceInfo.deviceId,
    deviceName: deviceInfo.deviceName || 'Unknown Device',
    lastUsed: new Date(),
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.userAgent
  };
  
  // Remove existing device with same ID
  this.security.trustedDevices = this.security.trustedDevices.filter(
    d => d.deviceId !== deviceInfo.deviceId
  );
  
  this.security.trustedDevices.push(device);
  
  // Keep only last 10 devices
  if (this.security.trustedDevices.length > 10) {
    this.security.trustedDevices = this.security.trustedDevices.slice(-10);
  }
  
  return this.save();
};

UserSchema.methods.connectSocialMedia = function(platform, credentials) {
  this.socialMedia[platform] = {
    ...this.socialMedia[platform],
    ...credentials,
    connected: true,
    connectedAt: new Date(),
    lastChecked: new Date(),
    isValid: true
  };
  
  return this.save();
};

UserSchema.methods.disconnectSocialMedia = function(platform) {
  this.socialMedia[platform] = {
    connected: false,
    disconnectedAt: new Date()
  };
  
  return this.save();
};

UserSchema.methods.updateBusinessInsights = function(insights) {
  this.businessInsights = {
    ...this.businessInsights,
    ...insights
  };
  
  return this.save();
};

UserSchema.methods.completeOnboardingStep = function(step) {
  if (!this.onboarding.stepsCompleted.includes(step)) {
    this.onboarding.stepsCompleted.push(step);
  }
  
  this.onboarding.currentStep = Math.max(this.onboarding.currentStep, step + 1);
  
  // Check if onboarding is complete (assuming 5 steps)
  if (this.onboarding.stepsCompleted.length >= 5) {
    this.onboarding.completed = true;
    this.onboarding.completedAt = new Date();
  }
  
  return this.save();
};

UserSchema.methods.addReferral = function(referredUserId) {
  this.referral.referredUsers.push({
    user: referredUserId,
    signupDate: new Date(),
    commissionEarned: 0,
    status: 'pending'
  });
  
  return this.save();
};

// Static methods
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

UserSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ 'referral.code': code });
};

UserSchema.statics.getBusinessTypeStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$businessType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

UserSchema.statics.getCityStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$address.city', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

UserSchema.statics.findSimilarBusinesses = function(user) {
  return this.find({
    _id: { $ne: user._id },
    businessType: user.businessType,
    'address.city': user.address.city,
    isActive: true
  }).limit(10);
};

module.exports = mongoose.model('User', UserSchema);
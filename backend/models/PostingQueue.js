const mongoose = require('mongoose');
const { Schema } = mongoose;

// Content schema for rich media and text content
const ContentSchema = new Schema({
  text: {
    type: String,
    required: true,
    maxlength: 2200,
    trim: true
  },
  hashtags: [{
    type: String,
    validate: {
      validator: function(v) {
        return v.startsWith('#') && v.length <= 50;
      },
      message: 'Hashtag must start with # and be less than 50 characters'
    }
  }],
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'gif'],
      required: true
    },
    url: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Media URL must be a valid HTTP/HTTPS URL'
      }
    },
    publicId: String, // Cloudinary public ID
    originalName: String,
    size: Number, // File size in bytes
    dimensions: {
      width: Number,
      height: Number
    },
    duration: Number, // For videos in seconds
    thumbnail: String, // Thumbnail URL for videos
    altText: String, // Accessibility description
    aiGenerated: {
      type: Boolean,
      default: false
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'completed'
    },
    metadata: {
      format: String,
      colorSpace: String,
      hasAudio: Boolean,
      bitrate: Number,
      fps: Number // Frames per second for videos
    }
  }],
  contentType: {
    type: String,
    enum: ['promotional', 'educational', 'entertainment', 'news', 'engagement', 'sales', 'announcement', 'story', 'poll', 'event'],
    default: 'promotional'
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  customPrompt: {
    type: String,
    maxlength: 500
  },
  language: {
    type: String,
    enum: ['en', 'ur', 'mixed'],
    default: 'en'
  },
  tone: {
    type: String,
    enum: ['professional', 'casual', 'friendly', 'humorous', 'inspiring', 'urgent', 'formal'],
    default: 'professional'
  },
  wordCount: {
    type: Number,
    min: 0
  },
  characterCount: {
    type: Number,
    min: 0
  },
  readingTime: {
    type: Number, // In seconds
    min: 0
  },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral'
  }
});

// Platform-specific configuration schema
const PlatformConfigSchema = new Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  posted: {
    type: Boolean,
    default: false
  },
  postId: String, // Platform-specific post ID
  postUrl: String, // Direct link to the post
  postedAt: Date,
  error: String,
  retryCount: {
    type: Number,
    default: 0
  },
  lastRetryAt: Date,
  platformSpecificContent: {
    text: String, // Platform-optimized content
    hashtags: [String],
    mentions: [String]
  },
  targetAudience: {
    demographics: {
      ageRange: {
        min: Number,
        max: Number
      },
      gender: {
        type: String,
        enum: ['all', 'male', 'female', 'other']
      },
      locations: [String],
      interests: [String],
      languages: [String]
    },
    customAudiences: [String],
    excludedAudiences: [String]
  },
  budget: {
    type: Number,
    min: 0
  },
  boosted: {
    type: Boolean,
    default: false
  },
  campaignId: String,
  adSetId: String
});

// Advanced scheduling schema
const ScheduleSchema = new Schema({
  scheduledFor: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Scheduled time must be in the future'
    }
  },
  timezone: {
    type: String,
    default: 'Asia/Karachi',
    validate: {
      validator: function(v) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: v });
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid timezone'
    }
  },
  scheduleType: {
    type: String,
    enum: ['now', 'scheduled', 'recurring', 'optimal'],
    default: 'now'
  },
  recurring: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom']
    },
    interval: Number, // For custom frequency
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    }],
    daysOfMonth: [{
      type: Number,
      min: 1,
      max: 31
    }],
    endDate: Date,
    maxOccurrences: Number,
    currentOccurrence: {
      type: Number,
      default: 0
    }
  },
  optimalTiming: {
    enabled: {
      type: Boolean,
      default: false
    },
    audienceTimezone: String,
    platformOptimization: {
      type: Boolean,
      default: true
    }
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
});

// Performance analytics schema
const PerformanceSchema = new Schema({
  totalEngagement: {
    type: Number,
    default: 0,
    min: 0
  },
  totalReach: {
    type: Number,
    default: 0,
    min: 0
  },
  totalImpressions: {
    type: Number,
    default: 0,
    min: 0
  },
  totalClicks: {
    type: Number,
    default: 0,
    min: 0
  },
  totalShares: {
    type: Number,
    default: 0,
    min: 0
  },
  totalComments: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLikes: {
    type: Number,
    default: 0,
    min: 0
  },
  engagementRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  clickThroughRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  conversionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  costPerClick: {
    type: Number,
    default: 0,
    min: 0
  },
  returnOnAdSpend: {
    type: Number,
    default: 0,
    min: 0
  },
  // Platform-specific metrics
  facebook: {
    engagement: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    reactions: {
      like: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      haha: { type: Number, default: 0 },
      wow: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
      angry: { type: Number, default: 0 }
    },
    videoMetrics: {
      views: { type: Number, default: 0 },
      watchTime: { type: Number, default: 0 },
      averageWatchTime: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 }
    }
  },
  instagram: {
    engagement: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    profileVisits: { type: Number, default: 0 },
    websiteClicks: { type: Number, default: 0 },
    storyMetrics: {
      views: { type: Number, default: 0 },
      exits: { type: Number, default: 0 },
      replies: { type: Number, default: 0 },
      taps: { type: Number, default: 0 }
    }
  },
  twitter: {
    engagement: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    quotes: { type: Number, default: 0 },
    bookmarks: { type: Number, default: 0 },
    profileClicks: { type: Number, default: 0 },
    urlClicks: { type: Number, default: 0 },
    hashtagClicks: { type: Number, default: 0 },
    detailExpands: { type: Number, default: 0 }
  },
  demographics: {
    age: [{
      range: String,
      percentage: Number
    }],
    gender: [{
      type: String,
      percentage: Number
    }],
    location: [{
      country: String,
      city: String,
      percentage: Number
    }],
    interests: [{
      category: String,
      percentage: Number
    }],
    devices: [{
      type: String,
      percentage: Number
    }]
  },
  hourlyData: [{
    hour: {
      type: Number,
      min: 0,
      max: 23
    },
    engagement: Number,
    reach: Number,
    impressions: Number
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Business context schema
const BusinessContextSchema = new Schema({
  businessType: {
    type: String,
    enum: [
      'restaurant', 'retail', 'services', 'technology', 'healthcare', 
      'education', 'real_estate', 'automotive', 'beauty', 'fitness',
      'fashion', 'food', 'travel', 'entertainment', 'finance', 'other'
    ],
    default: 'other'
  },
  businessGoals: [{
    type: String,
    enum: [
      'brand_awareness', 'lead_generation', 'sales', 'engagement',
      'traffic', 'app_installs', 'event_promotion', 'customer_retention'
    ]
  }],
  targetAudience: {
    type: String,
    enum: [
      'local_customers', 'young_adults', 'families', 'professionals',
      'students', 'seniors', 'businesses', 'tourists', 'all'
    ],
    default: 'local_customers'
  },
  seasonality: {
    campaign: String,
    season: {
      type: String,
      enum: ['spring', 'summer', 'fall', 'winter', 'ramadan', 'eid', 'independence_day']
    },
    isHoliday: {
      type: Boolean,
      default: false
    },
    holidayName: String
  },
  location: {
    country: {
      type: String,
      default: 'Pakistan'
    },
    city: String,
    region: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    timezone: {
      type: String,
      default: 'Asia/Karachi'
    }
  },
  competitorAnalysis: {
    enabled: {
      type: Boolean,
      default: false
    },
    competitors: [String],
    benchmarkMetrics: {
      engagementRate: Number,
      postFrequency: Number,
      audienceGrowth: Number
    }
  },
  brandVoice: {
    personality: [{
      type: String,
      enum: ['professional', 'friendly', 'humorous', 'inspiring', 'authoritative', 'casual']
    }],
    keywords: [String],
    avoidWords: [String],
    brandColors: [String],
    brandFonts: [String]
  },
  storeUrl: String,
  website: String,
  contactInfo: {
    phone: String,
    email: String,
    whatsapp: String
  }
});

// Error tracking schema
const ErrorSchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  platform: {
    type: String,
    enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok']
  },
  errorType: {
    type: String,
    enum: [
      'authentication_error', 'api_limit_exceeded', 'content_violation',
      'network_error', 'platform_error', 'media_processing_error',
      'scheduling_error', 'validation_error', 'unknown_error'
    ]
  },
  errorCode: String,
  message: {
    type: String,
    required: true
  },
  details: mongoose.Schema.Types.Mixed,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolution: String,
  retryable: {
    type: Boolean,
    default: true
  }
});

// A/B testing schema
const ABTestSchema = new Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  testName: String,
  variants: [{
    name: String,
    content: {
      text: String,
      hashtags: [String],
      media: [String]
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    performance: {
      engagement: Number,
      reach: Number,
      clicks: Number,
      conversions: Number
    }
  }],
  winner: String,
  confidence: Number,
  testDuration: {
    start: Date,
    end: Date
  },
  metrics: [{
    name: String,
    primary: Boolean
  }],
  status: {
    type: String,
    enum: ['draft', 'running', 'completed', 'cancelled'],
    default: 'draft'
  }
});

// Main PostingQueue Schema
const PostingQueueSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: ContentSchema,
    required: true
  },
  platforms: {
    facebook: {
      type: PlatformConfigSchema,
      default: () => ({})
    },
    instagram: {
      type: PlatformConfigSchema,
      default: () => ({})
    },
    twitter: {
      type: PlatformConfigSchema,
      default: () => ({})
    },
    linkedin: {
      type: PlatformConfigSchema,
      default: () => ({})
    },
    tiktok: {
      type: PlatformConfigSchema,
      default: () => ({})
    }
  },
  schedule: {
    type: ScheduleSchema,
    required: true
  },
  performance: {
    type: PerformanceSchema,
    default: () => ({})
  },
  businessContext: {
    type: BusinessContextSchema,
    default: () => ({})
  },
  status: {
    type: String,
    enum: [
      'draft', 'pending', 'scheduled', 'processing', 'posted', 
      'failed', 'cancelled', 'expired', 'review_required'
    ],
    default: 'draft',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  retries: {
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10
    },
    lastRetry: Date,
    backoffMultiplier: {
      type: Number,
      default: 2,
      min: 1,
      max: 10
    },
    nextRetryAt: Date
  },
  errors: [ErrorSchema],
  abTest: ABTestSchema,
  tags: [{
    type: String,
    maxlength: 50
  }],
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'Template'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_required'],
    default: 'not_required'
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  notifications: {
    onSuccess: {
      type: Boolean,
      default: true
    },
    onFailure: {
      type: Boolean,
      default: true
    },
    channels: [{
      type: String,
      enum: ['email', 'sms', 'push', 'webhook']
    }],
    webhookUrl: String
  },
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'automation', 'import'],
      default: 'web'
    },
    version: {
      type: String,
      default: '1.0'
    },
    clientInfo: {
      userAgent: String,
      ipAddress: String,
      device: String,
      location: String
    },
    processingTime: Number, // Time taken to process in milliseconds
    queuePosition: Number,
    estimatedPublishTime: Date
  },
  analytics: {
    trackingEnabled: {
      type: Boolean,
      default: true
    },
    utmParameters: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String
    },
    conversionTracking: {
      enabled: {
        type: Boolean,
        default: false
      },
      goals: [{
        name: String,
        value: Number,
        currency: String
      }]
    },
    customEvents: [{
      name: String,
      value: mongoose.Schema.Types.Mixed,
      timestamp: Date
    }]
  },
  compliance: {
    contentReviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: String,
    reviewedAt: Date,
    complianceScore: {
      type: Number,
      min: 0,
      max: 100
    },
    flags: [{
      type: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      message: String
    }],
    approvalRequired: {
      type: Boolean,
      default: false
    }
  },
  backup: {
    originalContent: mongoose.Schema.Types.Mixed,
    versions: [{
      timestamp: Date,
      content: mongoose.Schema.Types.Mixed,
      changedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      changeReason: String
    }]
  }
}, {
  timestamps: true,
  collection: 'posting_queue'
});

// Indexes for performance optimization
PostingQueueSchema.index({ user: 1, status: 1 });
PostingQueueSchema.index({ 'schedule.scheduledFor': 1, status: 1 });
PostingQueueSchema.index({ status: 1, priority: 1, 'schedule.scheduledFor': 1 });
PostingQueueSchema.index({ user: 1, createdAt: -1 });
PostingQueueSchema.index({ user: 1, 'content.contentType': 1 });
PostingQueueSchema.index({ 'platforms.facebook.posted': 1, 'platforms.facebook.postedAt': 1 });
PostingQueueSchema.index({ 'platforms.instagram.posted': 1, 'platforms.instagram.postedAt': 1 });
PostingQueueSchema.index({ 'platforms.twitter.posted': 1, 'platforms.twitter.postedAt': 1 });
PostingQueueSchema.index({ campaignId: 1 });
PostingQueueSchema.index({ tags: 1 });
PostingQueueSchema.index({ 'schedule.recurring.enabled': 1, 'schedule.recurring.frequency': 1 });

// Virtual fields
PostingQueueSchema.virtual('selectedPlatforms').get(function() {
  return Object.keys(this.platforms).filter(platform => this.platforms[platform].enabled);
});

PostingQueueSchema.virtual('totalEngagement').get(function() {
  return this.performance.totalEngagement || 0;
});

PostingQueueSchema.virtual('isScheduled').get(function() {
  return this.status === 'scheduled' && this.schedule.scheduledFor > new Date();
});

PostingQueueSchema.virtual('isPastDue').get(function() {
  return this.status === 'scheduled' && this.schedule.scheduledFor <= new Date();
});

PostingQueueSchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && this.retries.count < this.retries.maxRetries;
});

PostingQueueSchema.virtual('nextRetryTime').get(function() {
  if (!this.canRetry) return null;
  const delay = Math.pow(this.retries.backoffMultiplier, this.retries.count) * 60000; // Base delay of 1 minute
  return new Date(Date.now() + delay);
});

// Instance methods
PostingQueueSchema.methods.addError = function(platform, errorType, message, details = {}) {
  this.errors.push({
    platform,
    errorType,
    message,
    details,
    timestamp: new Date()
  });
  
  if (platform && this.platforms[platform]) {
    this.platforms[platform].error = message;
    this.platforms[platform].retryCount += 1;
    this.platforms[platform].lastRetryAt = new Date();
  }
  
  return this.save();
};

PostingQueueSchema.methods.markAsPosted = function(platform, postId, postUrl) {
  if (this.platforms[platform]) {
    this.platforms[platform].posted = true;
    this.platforms[platform].postId = postId;
    this.platforms[platform].postUrl = postUrl;
    this.platforms[platform].postedAt = new Date();
    this.platforms[platform].error = null;
  }
  
  // Check if all enabled platforms are posted
  const enabledPlatforms = Object.keys(this.platforms).filter(p => this.platforms[p].enabled);
  const postedPlatforms = enabledPlatforms.filter(p => this.platforms[p].posted);
  
  if (enabledPlatforms.length === postedPlatforms.length) {
    this.status = 'posted';
  }
  
  return this.save();
};

PostingQueueSchema.methods.updatePerformance = function(platform, metrics) {
  if (platform && this.performance[platform]) {
    Object.assign(this.performance[platform], metrics);
  }
  
  // Update total metrics
  this.performance.totalEngagement = Object.keys(this.platforms)
    .filter(p => this.platforms[p].enabled)
    .reduce((total, p) => total + (this.performance[p]?.engagement || 0), 0);
    
  this.performance.totalReach = Object.keys(this.platforms)
    .filter(p => this.platforms[p].enabled)
    .reduce((total, p) => total + (this.performance[p]?.reach || 0), 0);
    
  this.performance.totalImpressions = Object.keys(this.platforms)
    .filter(p => this.platforms[p].enabled)
    .reduce((total, p) => total + (this.performance[p]?.impressions || 0), 0);
  
  // Calculate engagement rate
  if (this.performance.totalReach > 0) {
    this.performance.engagementRate = (this.performance.totalEngagement / this.performance.totalReach) * 100;
  }
  
  this.performance.lastUpdated = new Date();
  return this.save();
};

PostingQueueSchema.methods.canBeProcessed = function() {
  return this.status === 'pending' || 
         (this.status === 'scheduled' && this.schedule.scheduledFor <= new Date()) ||
         (this.status === 'failed' && this.canRetry);
};

PostingQueueSchema.methods.getNextRetryTime = function() {
  if (!this.canRetry) return null;
  
  const baseDelay = 5 * 60 * 1000; // 5 minutes
  const delay = baseDelay * Math.pow(this.retries.backoffMultiplier, this.retries.count);
  const maxDelay = 24 * 60 * 60 * 1000; // 24 hours
  
  return new Date(Date.now() + Math.min(delay, maxDelay));
};

PostingQueueSchema.methods.incrementRetry = function() {
  this.retries.count += 1;
  this.retries.lastRetry = new Date();
  this.retries.nextRetryAt = this.getNextRetryTime();
  
  if (this.retries.count >= this.retries.maxRetries) {
    this.status = 'failed';
  }
  
  return this.save();
};

PostingQueueSchema.methods.resetRetries = function() {
  this.retries.count = 0;
  this.retries.lastRetry = null;
  this.retries.nextRetryAt = null;
  this.status = 'pending';
  
  return this.save();
};

PostingQueueSchema.methods.cancel = function(reason = 'Cancelled by user') {
  this.status = 'cancelled';
  this.addError(null, 'scheduling_error', reason);
  
  return this.save();
};

PostingQueueSchema.methods.duplicate = function(newScheduleTime) {
  const duplicate = new this.constructor(this.toObject());
  duplicate._id = undefined;
  duplicate.isNew = true;
  duplicate.createdAt = undefined;
  duplicate.updatedAt = undefined;
  duplicate.status = 'draft';
  
  if (newScheduleTime) {
    duplicate.schedule.scheduledFor = newScheduleTime;
  }
  
  // Reset platform posting status
  Object.keys(duplicate.platforms).forEach(platform => {
    if (duplicate.platforms[platform]) {
      duplicate.platforms[platform].posted = false;
      duplicate.platforms[platform].postId = null;
      duplicate.platforms[platform].postUrl = null;
      duplicate.platforms[platform].postedAt = null;
      duplicate.platforms[platform].error = null;
    }
  });
  
  // Reset performance metrics
  duplicate.performance = {};
  duplicate.errors = [];
  duplicate.retries.count = 0;
  duplicate.retries.lastRetry = null;
  duplicate.retries.nextRetryAt = null;
  
  return duplicate;
};

// Static methods
PostingQueueSchema.statics.findReadyForPosting = function() {
  return this.find({
    status: { $in: ['pending', 'scheduled'] },
    'schedule.scheduledFor': { $lte: new Date() },
    $or: [
      { 'retries.nextRetryAt': { $exists: false } },
      { 'retries.nextRetryAt': { $lte: new Date() } }
    ]
  }).sort({ priority: -1, 'schedule.scheduledFor': 1 });
};

PostingQueueSchema.statics.findFailedRetryable = function() {
  return this.find({
    status: 'failed',
    'retries.count': { $lt: this.schema.path('retries.maxRetries').defaultValue },
    'retries.nextRetryAt': { $lte: new Date() }
  });
};

PostingQueueSchema.statics.getAnalytics = function(userId, dateRange = {}) {
  const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = dateRange;
  
  return this.aggregate([
    {
      $match: {
        user: userId,
        status: 'posted',
        'platforms.facebook.postedAt': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        totalEngagement: { $sum: '$performance.totalEngagement' },
        totalReach: { $sum: '$performance.totalReach' },
        totalImpressions: { $sum: '$performance.totalImpressions' },
        averageEngagementRate: { $avg: '$performance.engagementRate' },
        platforms: {
          $push: {
            facebook: '$platforms.facebook.posted',
            instagram: '$platforms.instagram.posted',
            twitter: '$platforms.twitter.posted'
          }
        }
      }
    }
  ]);
};

PostingQueueSchema.statics.getTopPerformingPosts = function(userId, limit = 10) {
  return this.find({
    user: userId,
    status: 'posted'
  })
  .sort({ 'performance.totalEngagement': -1 })
  .limit(limit)
  .select('content.text content.contentType performance platforms createdAt');
};

PostingQueueSchema.statics.getUserStatistics = function(userId) {
  return this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEngagement: { $sum: '$performance.totalEngagement' }
      }
    }
  ]);
};

// Pre-save middleware
PostingQueueSchema.pre('save', function(next) {
  // Update word and character count
  if (this.isModified('content.text')) {
    const text = this.content.text || '';
    this.content.wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    this.content.characterCount = text.length;
    this.content.readingTime = Math.ceil(this.content.wordCount / 200 * 60); // 200 WPM
  }
  
  // Validate scheduled time
  if (this.isModified('schedule.scheduledFor') && this.schedule.scheduledFor <= new Date()) {
    if (this.schedule.scheduleType === 'scheduled') {
      const error = new Error('Scheduled time must be in the future');
      return next(error);
    }
  }
  
  // Set initial metadata
  if (this.isNew) {
    this.metadata.version = this.metadata.version || '1.0';
    this.metadata.estimatedPublishTime = this.schedule.scheduledFor;
  }
  
  next();
});

// Post-save middleware for notifications
PostingQueueSchema.post('save', function(doc, next) {
  if (doc.status === 'posted' && doc.notifications.onSuccess) {
    // Trigger success notification
    // This would be handled by a notification service
  } else if (doc.status === 'failed' && doc.notifications.onFailure) {
    // Trigger failure notification
    // This would be handled by a notification service
  }
  
  next();
});

// Export model
module.exports = mongoose.model('PostingQueue', PostingQueueSchema);
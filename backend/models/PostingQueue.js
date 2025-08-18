const mongoose = require('mongoose');

const postingQueueSchema = new mongoose.Schema({
  // User Reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Content Details
  content: {
    text: {
      type: String,
      required: true,
      maxlength: [2000, 'Post content cannot exceed 2000 characters']
    },
    hashtags: [String],
    mentions: [String],
    
    // Media Content
    media: [{
      type: { type: String, enum: ['image', 'video', 'carousel'] },
      url: String,
      publicId: String,
      caption: String,
      alt: String
    }],
    
    // AI Generated Content
    aiGenerated: { type: Boolean, default: true },
    aiPrompt: String,
    contentType: {
      type: String,
      enum: ['promotional', 'educational', 'behind_scenes', 'product_showcase', 'customer_story', 'tips', 'news'],
      default: 'promotional'
    }
  },
  
  // Posting Schedule
  schedule: {
    scheduledFor: {
      type: Date,
      required: true
    },
    timezone: { type: String, default: 'Asia/Karachi' },
    isRecurring: { type: Boolean, default: false },
    recurringPattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    }
  },
  
  // Target Platforms
  platforms: {
    facebook: {
      enabled: { type: Boolean, default: false },
      pageId: String,
      postId: String,
      posted: { type: Boolean, default: false },
      postedAt: Date,
      error: String,
      engagement: {
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        reach: { type: Number, default: 0 }
      }
    },
    instagram: {
      enabled: { type: Boolean, default: false },
      accountId: String,
      postId: String,
      posted: { type: Boolean, default: false },
      postedAt: Date,
      error: String,
      engagement: {
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        saves: { type: Number, default: 0 },
        reach: { type: Number, default: 0 }
      }
    },
    twitter: {
      enabled: { type: Boolean, default: false },
      tweetId: String,
      posted: { type: Boolean, default: false },
      postedAt: Date,
      error: String,
      engagement: {
        likes: { type: Number, default: 0 },
        retweets: { type: Number, default: 0 },
        replies: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 }
      }
    }
  },
  
  // Processing Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'posted', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Business Context
  businessContext: {
    businessType: String,
    productCategories: [String],
    targetAudience: String,
    businessGoals: [String],
    storeUrl: String
  },
  
  // Performance Analytics
  performance: {
    totalEngagement: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    clickThroughRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    storeVisits: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },
  
  // Error Handling
  errors: [{
    platform: String,
    error: String,
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
  }],
  
  // Retry Logic
  retries: {
    count: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    lastRetry: Date,
    nextRetry: Date
  }
}, {
  timestamps: true
});

// Indexes
postingQueueSchema.index({ user: 1, 'schedule.scheduledFor': 1 });
postingQueueSchema.index({ status: 1 });
postingQueueSchema.index({ 'schedule.scheduledFor': 1 });

module.exports = mongoose.model('PostingQueue', postingQueueSchema);
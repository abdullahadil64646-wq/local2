const mongoose = require('mongoose');

const userOfferSchema = new mongoose.Schema({
  // User and Offer References
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true
  },
  
  // Usage Details
  usage: {
    timesUsed: { type: Number, default: 0 },
    totalSavings: { type: Number, default: 0 },
    lastUsedAt: Date,
    firstUsedAt: Date
  },
  
  // Application Details
  applications: [{
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'EnhancedSubscription' },
    originalAmount: Number,
    discountAmount: Number,
    finalAmount: Number,
    appliedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['applied', 'used', 'expired', 'cancelled'],
      default: 'applied'
    }
  }],
  
  // Status
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Compound index to ensure one document per user-offer pair
userOfferSchema.index({ user: 1, offer: 1 }, { unique: true });

module.exports = mongoose.model('UserOffer', userOfferSchema);
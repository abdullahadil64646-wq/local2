const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  
  // Profile Information
  businessName: {
    type: String,
    trim: true,
    maxlength: [200, 'Business name cannot exceed 200 characters']
  },
  businessType: {
    type: String,
    enum: ['restaurant', 'retail', 'salon', 'gym', 'services', 'cafe', 'karyana', 'clothing', 'electronics', 'other'],
    default: 'other'
  },
  businessDescription: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Contact Information
  phone: {
    type: String,
    match: [/^(\+92|0)?[0-9]{10}$/, 'Please enter a valid Pakistani phone number']
  },
  whatsapp: {
    type: String,
    match: [/^(\+92|0)?[0-9]{10}$/, 'Please enter a valid WhatsApp number']
  },
  
  // Address
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
  
  // Business Images
  businessImages: [{
    url: String,
    publicId: String,
    type: { type: String, enum: ['logo', 'banner', 'product', 'interior'] }
  }],
  
  // Social Media Accounts
  socialMedia: {
    facebook: {
      connected: { type: Boolean, default: false },
      pageId: String,
      accessToken: String,
      pageName: String
    },
    instagram: {
      connected: { type: Boolean, default: false },
      accountId: String,
      accessToken: String,
      username: String
    },
    twitter: {
      connected: { type: Boolean, default: false },
      username: String,
      accessToken: String,
      accessSecret: String
    }
  },
  
  // Account Status
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  
  // Verification Tokens
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Analytics & Usage
  totalPosts: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  lastLoginAt: Date,
  loginCount: { type: Number, default: 0 },
  
  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true }
    },
    posting: {
      bestTimes: [String], // ['09:00', '15:00', '19:00']
      skipWeekends: { type: Boolean, default: false },
      includeHashtags: { type: Boolean, default: true }
    },
    language: { type: String, default: 'urdu', enum: ['urdu', 'english', 'both'] }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for subscription
userSchema.virtual('subscription', {
  ref: 'EnhancedSubscription',
  localField: '_id',
  foreignField: 'user',
  justOne: true
});

// Virtual for ecommerce store
userSchema.virtual('store', {
  ref: 'EcommerceStore',
  localField: '_id',
  foreignField: 'owner',
  justOne: true
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to create email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.emailVerificationToken = resetToken;
  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Instance method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ businessType: 1 });
userSchema.index({ 'address.city': 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
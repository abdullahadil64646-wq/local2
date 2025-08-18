const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const EcommerceStore = require('../models/EcommerceStore');
const PostingQueue = require('../models/PostingQueue');
const { auth } = require('../middleware/auth');
const { uploadFromBuffer } = require('../services/cloudinaryService');
const multer = require('multer');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// @route   GET /api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });
    const store = await EcommerceStore.findOne({ owner: req.user._id });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get recent posts count
    const recentPostsCount = await PostingQueue.countDocuments({
      user: req.user._id,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        businessType: user.businessType,
        businessDescription: user.businessDescription,
        phone: user.phone,
        whatsapp: user.whatsapp,
        address: user.address,
        businessImages: user.businessImages,
        socialMedia: user.socialMedia,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        totalPosts: user.totalPosts,
        totalOrders: user.totalOrders,
        totalRevenue: user.totalRevenue,
        recentPostsCount: recentPostsCount,
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount,
        preferences: user.preferences,
        subscription: subscription ? {
          plan: subscription.plan,
          status: subscription.billing.status,
          features: subscription.features,
          usage: subscription.usage,
          nextBillingDate: subscription.billing.nextBillingDate,
          usagePercentage: subscription.usagePercentage
        } : null,
        store: store ? {
          id: store._id,
          name: store.storeSettings.name,
          slug: store.storeSettings.slug,
          url: store.storeUrl,
          isActive: store.settings.isActive,
          totalProducts: store.analytics.totalProducts,
          totalOrders: store.analytics.totalOrders,
          totalCustomers: store.analytics.totalCustomers
        } : null,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('businessName').optional().trim().isLength({ max: 200 }).withMessage('Business name too long'),
  body('businessDescription').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('businessType').optional().isIn(['restaurant', 'retail', 'salon', 'gym', 'services', 'cafe', 'karyana', 'clothing', 'electronics', 'other']),
  body('phone').optional().matches(/^(\+92|0)?[0-9]{10}$/).withMessage('Invalid Pakistani phone number'),
  body('whatsapp').optional().matches(/^(\+92|0)?[0-9]{10}$/).withMessage('Invalid WhatsApp number')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      businessName,
      businessDescription,
      businessType,
      phone,
      whatsapp,
      address,
      preferences
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (businessName) user.businessName = businessName;
    if (businessDescription) user.businessDescription = businessDescription;
    if (businessType) user.businessType = businessType;
    if (phone) user.phone = phone;
    if (whatsapp) user.whatsapp = whatsapp;
    
    if (address) {
      user.address = {
        ...user.address,
        ...address
      };
    }

    if (preferences) {
      user.preferences = {
        ...user.preferences,
        ...preferences
      };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        businessType: user.businessType,
        businessDescription: user.businessDescription,
        phone: user.phone,
        whatsapp: user.whatsapp,
        address: user.address,
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/users/upload-image
// @desc    Upload business image
// @access  Private
router.post('/upload-image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const { type = 'general' } = req.body;
    const validTypes = ['logo', 'banner', 'product', 'interior', 'general'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image type'
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadFromBuffer(
      req.file.buffer,
      `users/${req.user._id}`,
      null,
      [type, 'business-image']
    );

    if (!uploadResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to upload image',
        error: uploadResult.error
      });
    }

    // Update user's business images
    const user = await User.findById(req.user._id);
    
    // Remove old image of the same type if exists
    if (type === 'logo' || type === 'banner') {
      user.businessImages = user.businessImages.filter(img => img.type !== type);
    }

    user.businessImages.push({
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      type: type
    });

    await user.save();

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      image: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        type: type
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during image upload',
      error: error.message
    });
  }
});

// @route   DELETE /api/users/remove-image/:publicId
// @desc    Remove business image
// @access  Private
router.delete('/remove-image/:publicId', auth, async (req, res) => {
  try {
    const { publicId } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find and remove image from user's business images
    const imageIndex = user.businessImages.findIndex(img => img.publicId === publicId);

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Remove from Cloudinary
    const { deleteFile } = require('../services/cloudinaryService');
    await deleteFile(publicId);

    // Remove from user's images array
    user.businessImages.splice(imageIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Image removed successfully'
    });

  } catch (error) {
    console.error('Image removal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during image removal',
      error: error.message
    });
  }
});

// @route   POST /api/users/connect-social-media
// @desc    Connect social media account
// @access  Private
router.post('/connect-social-media', [
  body('platform').isIn(['facebook', 'instagram', 'twitter']).withMessage('Invalid platform'),
  body('accessToken').notEmpty().withMessage('Access token is required')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { platform, accessToken, pageId, accountId, username, pageName } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify the access token by making a test API call
    const socialMediaService = require('../services/socialMediaService');
    let verification;

    try {
      switch (platform) {
        case 'facebook':
          verification = await socialMediaService.facebook.getPageInfo(pageId, accessToken);
          break;
        case 'instagram':
          verification = await socialMediaService.instagram.getAccountInfo(accountId, accessToken);
          break;
        case 'twitter':
          // Twitter verification would go here
          verification = { success: true };
          break;
      }

      if (!verification.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid access token or account credentials'
        });
      }
    } catch (verificationError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to verify social media account'
      });
    }

    // Update user's social media connections
    switch (platform) {
      case 'facebook':
        user.socialMedia.facebook = {
          connected: true,
          pageId: pageId,
          accessToken: accessToken,
          pageName: pageName || verification.pageInfo?.name
        };
        break;
      case 'instagram':
        user.socialMedia.instagram = {
          connected: true,
          accountId: accountId,
          accessToken: accessToken,
          username: username || verification.accountInfo?.username
        };
        break;
      case 'twitter':
        user.socialMedia.twitter = {
          connected: true,
          username: username,
          accessToken: accessToken
        };
        break;
    }

    await user.save();

    res.json({
      success: true,
      message: `${platform} account connected successfully`,
      socialMedia: user.socialMedia
    });

  } catch (error) {
    console.error('Social media connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during social media connection',
      error: error.message
    });
  }
});

// @route   POST /api/users/disconnect-social-media
// @desc    Disconnect social media account
// @access  Private
router.post('/disconnect-social-media', [
  body('platform').isIn(['facebook', 'instagram', 'twitter']).withMessage('Invalid platform')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { platform } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Disconnect the specified platform
    switch (platform) {
      case 'facebook':
        user.socialMedia.facebook = {
          connected: false,
          pageId: null,
          accessToken: null,
          pageName: null
        };
        break;
      case 'instagram':
        user.socialMedia.instagram = {
          connected: false,
          accountId: null,
          accessToken: null,
          username: null
        };
        break;
      case 'twitter':
        user.socialMedia.twitter = {
          connected: false,
          username: null,
          accessToken: null,
          accessSecret: null
        };
        break;
    }

    await user.save();

    res.json({
      success: true,
      message: `${platform} account disconnected successfully`,
      socialMedia: user.socialMedia
    });

  } catch (error) {
    console.error('Social media disconnection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during social media disconnection',
      error: error.message
    });
  }
});

// @route   GET /api/users/analytics
// @desc    Get user analytics
// @access  Private
router.get('/analytics', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    let startDate;
    const endDate = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get post analytics
    const posts = await PostingQueue.find({
      user: req.user._id,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const postAnalytics = {
      totalPosts: posts.length,
      publishedPosts: posts.filter(p => p.status === 'posted').length,
      failedPosts: posts.filter(p => p.status === 'failed').length,
      pendingPosts: posts.filter(p => p.status === 'pending').length,
      totalEngagement: posts.reduce((sum, p) => sum + (p.performance.totalEngagement || 0), 0),
      totalReach: posts.reduce((sum, p) => sum + (p.performance.totalReach || 0), 0),
      averageEngagement: 0,
      postsByPlatform: {
        facebook: posts.filter(p => p.platforms.facebook.posted).length,
        instagram: posts.filter(p => p.platforms.instagram.posted).length,
        twitter: posts.filter(p => p.platforms.twitter.posted).length
      }
    };

    if (postAnalytics.publishedPosts > 0) {
      postAnalytics.averageEngagement = Math.round(postAnalytics.totalEngagement / postAnalytics.publishedPosts);
    }

    // Get store analytics if user has a store
    const store = await EcommerceStore.findOne({ owner: req.user._id });
    let storeAnalytics = null;

    if (store) {
      const periodOrders = store.orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });

      storeAnalytics = {
        totalOrders: periodOrders.length,
        totalRevenue: periodOrders.reduce((sum, order) => sum + order.totals.total, 0),
        averageOrderValue: periodOrders.length > 0 ? 
          Math.round(periodOrders.reduce((sum, order) => sum + order.totals.total, 0) / periodOrders.length) : 0,
        completedOrders: periodOrders.filter(o => o.status === 'completed').length,
        pendingOrders: periodOrders.filter(o => o.status === 'pending').length,
        cancelledOrders: periodOrders.filter(o => o.status === 'cancelled').length,
        topProducts: []
      };

      // Calculate top products
      const productSales = {};
      periodOrders.forEach(order => {
        order.items.forEach(item => {
          if (productSales[item.name]) {
            productSales[item.name].quantity += item.quantity;
            productSales[item.name].revenue += item.total;
          } else {
            productSales[item.name] = {
              name: item.name,
              quantity: item.quantity,
              revenue: item.total
            };
          }
        });
      });

      storeAnalytics.topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    }

    // Get subscription analytics
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });
    let subscriptionAnalytics = null;

    if (subscription) {
      subscriptionAnalytics = {
        plan: subscription.plan,
        status: subscription.billing.status,
        activeDays: subscription.analytics.activeDays,
        totalRevenue: subscription.analytics.totalRevenue,
        usage: subscription.usage,
        features: subscription.features,
        nextBillingDate: subscription.billing.nextBillingDate,
        daysUntilNextBilling: subscription.daysUntilNextBilling
      };
    }

    res.json({
      success: true,
      analytics: {
        period: period,
        dateRange: {
          start: startDate,
          end: endDate
        },
        posts: postAnalytics,
        store: storeAnalytics,
        subscription: subscriptionAnalytics
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/users/verify-phone
// @desc    Send phone verification code
// @access  Private
router.post('/verify-phone', [
  body('phone').matches(/^(\+92|0)?[0-9]{10}$/).withMessage('Invalid Pakistani phone number')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code (in production, use Redis or database with expiry)
    user.phoneVerificationCode = verificationCode;
    user.phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.phone = phone; // Update phone number
    await user.save();

    // Send SMS
    const { sendVerificationOTP } = require('../services/smsService');
    const smsResult = await sendVerificationOTP(phone, verificationCode);

    if (!smsResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to send verification code'
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to your phone'
    });

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/users/confirm-phone
// @desc    Confirm phone verification code
// @access  Private
router.post('/confirm-phone', [
  body('code').isLength({ min: 6, max: 6 }).withMessage('Invalid verification code')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { code } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if code is valid and not expired
    if (user.phoneVerificationCode !== code || 
        !user.phoneVerificationExpires || 
        user.phoneVerificationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Mark phone as verified
    user.isPhoneVerified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Phone number verified successfully'
    });

  } catch (error) {
    console.error('Phone confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cancel active subscription
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });
    if (subscription && subscription.billing.status === 'active') {
      if (subscription.billing.stripeSubscriptionId) {
        const { cancelStripeSubscription } = require('../services/stripeService');
        await cancelStripeSubscription(subscription.billing.stripeSubscriptionId);
      }
    }

    // Delete related data
    await EnhancedSubscription.deleteMany({ user: req.user._id });
    await EcommerceStore.deleteMany({ owner: req.user._id });
    await PostingQueue.deleteMany({ user: req.user._id });

    // Delete user images from Cloudinary
    const { deleteFile } = require('../services/cloudinaryService');
    for (const image of user.businessImages) {
      await deleteFile(image.publicId);
    }

    // Delete user account
    await User.findByIdAndDelete(req.user._id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during account deletion',
      error: error.message
    });
  }
});

module.exports = router;
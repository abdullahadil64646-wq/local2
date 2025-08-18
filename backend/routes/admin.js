const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const EcommerceStore = require('../models/EcommerceStore');
const PostingQueue = require('../models/PostingQueue');
const Offer = require('../models/Offer');
const UserOffer = require('../models/UserOffer');
const { auth, isOwner } = require('../middleware/auth');

const router = express.Router();

// Apply owner middleware to all routes
router.use(auth);
router.use(isOwner);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard analytics
// @access  Private (Owner only)
router.get('/dashboard', async (req, res) => {
  try {
    // Get current date and time ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // User Analytics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersToday = await User.countDocuments({ 
      createdAt: { $gte: todayStart } 
    });
    const newUsersThisMonth = await User.countDocuments({ 
      createdAt: { $gte: thisMonthStart } 
    });

    // Subscription Analytics
    const totalSubscriptions = await EnhancedSubscription.countDocuments();
    const activeSubscriptions = await EnhancedSubscription.countDocuments({
      'billing.status': 'active'
    });
    const trialSubscriptions = await EnhancedSubscription.countDocuments({
      'trial.isActive': true
    });

    // Plan Distribution
    const planDistribution = await EnhancedSubscription.aggregate([
      {
        $match: { 'billing.status': 'active' }
      },
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          revenue: { $sum: '$billing.nextBillingAmount' }
        }
      }
    ]);

    // Revenue Analytics
    const monthlyRevenue = await EnhancedSubscription.aggregate([
      {
        $match: { 
          'billing.status': 'active',
          'billing.payments.paidAt': { $gte: thisMonthStart }
        }
      },
      {
        $unwind: '$billing.payments'
      },
      {
        $match: {
          'billing.payments.status': 'paid',
          'billing.payments.paidAt': { $gte: thisMonthStart }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$billing.payments.amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const lastMonthRevenue = await EnhancedSubscription.aggregate([
      {
        $match: { 
          'billing.payments.paidAt': { 
            $gte: lastMonthStart, 
            $lte: lastMonthEnd 
          }
        }
      },
      {
        $unwind: '$billing.payments'
      },
      {
        $match: {
          'billing.payments.status': 'paid',
          'billing.payments.paidAt': { 
            $gte: lastMonthStart, 
            $lte: lastMonthEnd 
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$billing.payments.amount' }
        }
      }
    ]);

    // Content Analytics
    const totalPosts = await PostingQueue.countDocuments();
    const postsToday = await PostingQueue.countDocuments({
      createdAt: { $gte: todayStart }
    });
    const pendingPosts = await PostingQueue.countDocuments({
      status: 'pending'
    });
    const failedPosts = await PostingQueue.countDocuments({
      status: 'failed'
    });

    // Store Analytics
    const totalStores = await EcommerceStore.countDocuments();
    const activeStores = await EcommerceStore.countDocuments({
      'settings.isActive': true
    });

    // Top Users by Revenue
    const topUsers = await EnhancedSubscription.aggregate([
      {
        $match: { 'billing.status': 'active' }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          name: '$userInfo.name',
          email: '$userInfo.email',
          businessName: '$userInfo.businessName',
          plan: '$plan',
          revenue: '$analytics.totalRevenue',
          activeDays: '$analytics.activeDays'
        }
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Recent Activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email businessName createdAt');

    const recentPayments = await EnhancedSubscription.aggregate([
      {
        $unwind: '$billing.payments'
      },
      {
        $match: {
          'billing.payments.status': 'paid'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          name: '$userInfo.name',
          email: '$userInfo.email',
          amount: '$billing.payments.amount',
          paidAt: '$billing.payments.paidAt',
          plan: '$plan'
        }
      },
      {
        $sort: { paidAt: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Calculate growth rates
    const currentMonthRevenue = monthlyRevenue[0]?.total || 0;
    const previousMonthRevenue = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = previousMonthRevenue > 0 ? 
      ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

    res.json({
      success: true,
      analytics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday,
          newThisMonth: newUsersThisMonth
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          trial: trialSubscriptions,
          planDistribution: planDistribution
        },
        revenue: {
          thisMonth: currentMonthRevenue,
          lastMonth: previousMonthRevenue,
          growth: Math.round(revenueGrowth * 100) / 100,
          totalPayments: monthlyRevenue[0]?.count || 0
        },
        content: {
          totalPosts: totalPosts,
          postsToday: postsToday,
          pending: pendingPosts,
          failed: failedPosts
        },
        stores: {
          total: totalStores,
          active: activeStores
        },
        topUsers: topUsers,
        recentActivity: {
          users: recentUsers,
          payments: recentPayments
        }
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Private (Owner only)
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', plan = '', status = '' } = req.query;

    // Build filter query
    let filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      if (status === 'active') filter.isActive = true;
      if (status === 'inactive') filter.isActive = false;
    }

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get subscription info for each user
    const userIds = users.map(user => user._id);
    const subscriptions = await EnhancedSubscription.find({
      user: { $in: userIds }
    }).lean();

    // Merge subscription data with users
    const usersWithSubscriptions = users.map(user => {
      const subscription = subscriptions.find(sub => 
        sub.user.toString() === user._id.toString()
      );
      
      return {
        ...user,
        subscription: subscription ? {
          plan: subscription.plan,
          status: subscription.billing.status,
          nextBillingDate: subscription.billing.nextBillingDate,
          totalRevenue: subscription.analytics.totalRevenue
        } : null
      };
    });

    // Filter by plan if specified
    let filteredUsers = usersWithSubscriptions;
    if (plan) {
      filteredUsers = usersWithSubscriptions.filter(user => 
        user.subscription?.plan === plan
      );
    }

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      users: filteredUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalUsers: totalUsers,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/users/:userId/subscription
// @desc    Update user's subscription plan
// @access  Private (Owner only)
router.put('/users/:userId/subscription', [
  body('plan').isIn(['basic', 'pro', 'premium']).withMessage('Invalid plan'),
  body('status').optional().isIn(['active', 'cancelled', 'suspended']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { plan, status } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let subscription = await EnhancedSubscription.findOne({ user: userId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Update plan if provided
    if (plan && plan !== subscription.plan) {
      await subscription.upgradePlan(plan);
    }

    // Update status if provided
    if (status) {
      subscription.billing.status = status;
    }

    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: {
        plan: subscription.plan,
        status: subscription.billing.status,
        features: subscription.features
      }
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/admin/offers
// @desc    Create new offer
// @access  Private (Owner only)
router.post('/offers', [
  body('name').trim().isLength({ min: 3 }).withMessage('Offer name required'),
  body('code').trim().isLength({ min: 3 }).withMessage('Offer code required'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description required'),
  body('discount.type').isIn(['percentage', 'fixed', 'free_trial']).withMessage('Invalid discount type'),
  body('discount.value').isFloat({ min: 0 }).withMessage('Invalid discount value'),
  body('validity.startDate').isISO8601().withMessage('Invalid start date'),
  body('validity.endDate').isISO8601().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const offer = new Offer({
      ...req.body,
      createdBy: req.user._id,
      code: req.body.code.toUpperCase()
    });

    await offer.save();

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      offer: {
        id: offer._id,
        name: offer.name,
        code: offer.code,
        discount: offer.discount,
        validity: offer.validity
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Offer code already exists'
      });
    }

    console.error('Create offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/offers
// @desc    Get all offers
// @access  Private (Owner only)
router.get('/offers', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;

    let filter = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const offers = await Offer.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email');

    const totalOffers = await Offer.countDocuments(filter);

    res.json({
      success: true,
      offers: offers.map(offer => ({
        id: offer._id,
        name: offer.name,
        code: offer.code,
        description: offer.description,
        discount: offer.discount,
        validity: offer.validity,
        usage: offer.usage,
        isActive: offer.isActive,
        isValid: offer.isValid,
        analytics: offer.analytics,
        createdBy: offer.createdBy,
        createdAt: offer.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOffers / limit),
        totalOffers: totalOffers
      }
    });

  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/offers/:offerId
// @desc    Update offer
// @access  Private (Owner only)
router.put('/offers/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    const updates = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'isActive', 'validity', 'usage', 'targeting'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        offer[key] = updates[key];
      }
    });

    await offer.save();

    res.json({
      success: true,
      message: 'Offer updated successfully',
      offer: offer
    });

  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/revenue
// @desc    Get detailed revenue analytics
// @access  Private (Owner only)
router.get('/revenue', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let groupBy;
    let dateRange;
    const now = new Date();

    if (period === 'week') {
      groupBy = {
        year: { $year: '$billing.payments.paidAt' },
        week: { $week: '$billing.payments.paidAt' }
      };
      dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      groupBy = {
        year: { $year: '$billing.payments.paidAt' },
        month: { $month: '$billing.payments.paidAt' }
      };
      dateRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    } else {
      groupBy = {
        year: { $year: '$billing.payments.paidAt' },
        month: { $month: '$billing.payments.paidAt' },
        day: { $dayOfMonth: '$billing.payments.paidAt' }
      };
      dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const revenueData = await EnhancedSubscription.aggregate([
      {
        $unwind: '$billing.payments'
      },
      {
        $match: {
          'billing.payments.status': 'paid',
          'billing.payments.paidAt': { $gte: dateRange }
        }
      },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: '$billing.payments.amount' },
          totalPayments: { $sum: 1 },
          averagePayment: { $avg: '$billing.payments.amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Revenue by plan
    const revenueByPlan = await EnhancedSubscription.aggregate([
      {
        $match: { 'billing.status': 'active' }
      },
      {
        $group: {
          _id: '$plan',
          subscribers: { $sum: 1 },
          monthlyRevenue: { $sum: '$billing.nextBillingAmount' },
          totalRevenue: { $sum: '$analytics.totalRevenue' }
        }
      }
    ]);

    res.json({
      success: true,
      revenue: {
        timeline: revenueData,
        byPlan: revenueByPlan,
        period: period
      }
    });

  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
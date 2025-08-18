const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const EcommerceStore = require('../models/EcommerceStore');
const PostingQueue = require('../models/PostingQueue');
const socialMediaService = require('../services/socialMediaService');
const openaiService = require('../services/openaiService');
const cloudinaryService = require('../services/cloudinaryService');
const emailService = require('../services/emailService');
const {
  auth,
  requireEmailVerification,
  checkUsageLimit,
  requireFeature,
  logActivity
} = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all dashboard routes
router.use(auth);

// @route   GET /api/dashboard/overview
// @desc    Get comprehensive dashboard overview with analytics
// @access  Private
router.get('/overview', requireEmailVerification, logActivity('view_dashboard'), async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const userId = req.user._id;

    // Calculate date ranges based on period
    const now = new Date();
    let startDate, endDate, previousStartDate, previousEndDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEndDate = startDate;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = now;
        previousStartDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        previousEndDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
    }

    // Parallel data fetching for better performance
    const [
      currentPosts,
      previousPosts,
      subscription,
      store,
      recentPosts,
      scheduledPosts,
      failedPosts
    ] = await Promise.all([
      // Current period posts
      PostingQueue.find({
        user: userId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: -1 }),

      // Previous period posts for comparison
      PostingQueue.find({
        user: userId,
        createdAt: { $gte: previousStartDate, $lte: previousEndDate }
      }),

      // User subscription
      EnhancedSubscription.findOne({ user: userId }),

      // User store
      EcommerceStore.findOne({ owner: userId }),

      // Recent posts (last 10)
      PostingQueue.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('content.text platforms status createdAt postedAt performance'),

      // Scheduled posts (next 5)
      PostingQueue.find({
        user: userId,
        status: 'pending',
        'schedule.scheduledFor': { $gte: now }
      })
        .sort({ 'schedule.scheduledFor': 1 })
        .limit(5)
        .select('content.text platforms schedule.scheduledFor'),

      // Failed posts needing attention
      PostingQueue.find({
        user: userId,
        status: 'failed',
        createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      }).limit(5)
    ]);

    // Calculate current period statistics
    const currentStats = {
      totalPosts: currentPosts.length,
      publishedPosts: currentPosts.filter(p => p.status === 'posted').length,
      scheduledPosts: currentPosts.filter(p => p.status === 'pending').length,
      failedPosts: currentPosts.filter(p => p.status === 'failed').length,
      totalEngagement: currentPosts.reduce((sum, p) => sum + (p.performance?.totalEngagement || 0), 0),
      totalReach: currentPosts.reduce((sum, p) => sum + (p.performance?.totalReach || 0), 0),
      averageEngagement: 0
    };

    if (currentStats.publishedPosts > 0) {
      currentStats.averageEngagement = Math.round(currentStats.totalEngagement / currentStats.publishedPosts);
    }

    // Calculate previous period statistics for trends
    const previousStats = {
      totalPosts: previousPosts.length,
      publishedPosts: previousPosts.filter(p => p.status === 'posted').length,
      totalEngagement: previousPosts.reduce((sum, p) => sum + (p.performance?.totalEngagement || 0), 0),
      totalReach: previousPosts.reduce((sum, p) => sum + (p.performance?.totalReach || 0), 0)
    };

    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const trends = {
      postsTrend: calculateTrend(currentStats.totalPosts, previousStats.totalPosts),
      engagementTrend: calculateTrend(currentStats.totalEngagement, previousStats.totalEngagement),
      reachTrend: calculateTrend(currentStats.totalReach, previousStats.totalReach)
    };

    // Store analytics if store exists
    let storeStats = null;
    if (store) {
      const storeOrders = store.orders.filter(order => 
        new Date(order.createdAt) >= startDate && new Date(order.createdAt) <= endDate
      );
      
      const previousStoreOrders = store.orders.filter(order => 
        new Date(order.createdAt) >= previousStartDate && new Date(order.createdAt) <= previousEndDate
      );

      const totalRevenue = storeOrders.reduce((sum, order) => sum + order.totals.total, 0);
      const previousRevenue = previousStoreOrders.reduce((sum, order) => sum + order.totals.total, 0);

      const newCustomers = store.customers.filter(customer => 
        new Date(customer.joinedAt) >= startDate && new Date(customer.joinedAt) <= endDate
      ).length;

      const previousNewCustomers = store.customers.filter(customer => 
        new Date(customer.joinedAt) >= previousStartDate && new Date(customer.joinedAt) <= previousEndDate
      ).length;

      storeStats = {
        totalProducts: store.products.length,
        activeProducts: store.products.filter(p => p.isActive).length,
        totalOrders: storeOrders.length,
        totalRevenue: totalRevenue,
        newCustomers: newCustomers,
        averageOrderValue: storeOrders.length > 0 ? Math.round(totalRevenue / storeOrders.length) : 0,
        conversionRate: store.analytics.conversionRate || 0,
        storeViews: store.analytics.totalViews || 0,
        trends: {
          ordersTrend: calculateTrend(storeOrders.length, previousStoreOrders.length),
          revenueTrend: calculateTrend(totalRevenue, previousRevenue),
          customersTrend: calculateTrend(newCustomers, previousNewCustomers)
        },
        recentOrders: storeOrders.slice(-3).map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          total: order.totals.total,
          status: order.status,
          createdAt: order.createdAt,
          customer: order.customer.name
        }))
      };
    }

    // Platform breakdown
    const platformBreakdown = {
      facebook: {
        postsThisMonth: currentPosts.filter(p => p.platforms.facebook.enabled).length,
        engagementThisMonth: currentPosts
          .filter(p => p.platforms.facebook.enabled && p.platforms.facebook.posted)
          .reduce((sum, p) => sum + (p.performance?.facebook?.engagement || 0), 0),
        connected: req.user.socialMedia?.facebook?.connected || false
      },
      instagram: {
        postsThisMonth: currentPosts.filter(p => p.platforms.instagram.enabled).length,
        engagementThisMonth: currentPosts
          .filter(p => p.platforms.instagram.enabled && p.platforms.instagram.posted)
          .reduce((sum, p) => sum + (p.performance?.instagram?.engagement || 0), 0),
        connected: req.user.socialMedia?.instagram?.connected || false
      },
      twitter: {
        postsThisMonth: currentPosts.filter(p => p.platforms.twitter.enabled).length,
        engagementThisMonth: currentPosts
          .filter(p => p.platforms.twitter.enabled && p.platforms.twitter.posted)
          .reduce((sum, p) => sum + (p.performance?.twitter?.engagement || 0), 0),
        connected: req.user.socialMedia?.twitter?.connected || false
      }
    };

    // Generate performance charts data
    const chartData = generateChartData(currentPosts, period, startDate, endDate);

    // Calculate business health score
    const businessHealth = calculateBusinessHealthScore(req.user, subscription, currentStats, storeStats);

    // Generate quick actions based on user's current state
    const quickActions = generateQuickActions(req.user, subscription, currentStats, storeStats, failedPosts);

    // Usage statistics
    const usageStats = subscription ? {
      plan: subscription.plan,
      usagePercentage: Math.round((subscription.usage.currentMonth.postsGenerated / subscription.features.monthlyPosts) * 100),
      postsUsed: subscription.usage.currentMonth.postsGenerated,
      postsLimit: subscription.features.monthlyPosts,
      videosUsed: subscription.usage.currentMonth.videosGenerated,
      videosLimit: subscription.features.monthlyVideos,
      imagesUsed: subscription.usage.currentMonth.imagesGenerated,
      imagesLimit: subscription.features.monthlyImages,
      storageUsed: subscription.usage.currentMonth.storageUsed,
      storageLimit: subscription.features.storageLimit * 1024, // Convert GB to MB
      canGenerate: {
        posts: subscription.canGeneratePost(),
        videos: subscription.canGenerateVideo(),
        images: subscription.canGenerateImage()
      }
    } : null;

    // Compile dashboard data
    const dashboardData = {
      stats: {
        ...currentStats,
        ...trends,
        plan: subscription?.plan || 'basic',
        usagePercentage: usageStats?.usagePercentage || 0,
        storeViews: storeStats?.storeViews || 0,
        totalCustomers: storeStats ? store.customers.length : 0,
        totalOrders: storeStats?.totalOrders || 0
      },
      charts: {
        postPerformance: chartData.postPerformance,
        platformBreakdown: platformBreakdown,
        revenueChart: storeStats ? {
          thisMonth: storeStats.totalRevenue,
          lastMonth: storeStats.totalRevenue - (storeStats.trends.revenueTrend / 100) * storeStats.totalRevenue
        } : null,
        engagementTrend: chartData.engagementTrend
      },
      recentPosts: recentPosts.map(post => ({
        id: post._id,
        content: post.content.text.substring(0, 100) + (post.content.text.length > 100 ? '...' : ''),
        platforms: Object.keys(post.platforms).filter(p => post.platforms[p].enabled),
        status: post.status,
        createdAt: post.createdAt,
        postedAt: post.postedAt,
        engagement: post.performance?.totalEngagement || 0,
        reach: post.performance?.totalReach || 0
      })),
      scheduledPosts: scheduledPosts.map(post => ({
        id: post._id,
        content: post.content.text.substring(0, 100) + (post.content.text.length > 100 ? '...' : ''),
        platforms: Object.keys(post.platforms).filter(p => post.platforms[p].enabled),
        scheduledFor: post.schedule.scheduledFor
      })),
      failedPosts: failedPosts.map(post => ({
        id: post._id,
        content: post.content.text.substring(0, 100) + (post.content.text.length > 100 ? '...' : ''),
        platforms: Object.keys(post.platforms).filter(p => post.platforms[p].enabled),
        error: post.errors[post.errors.length - 1]?.message || 'Unknown error',
        createdAt: post.createdAt
      })),
      storeSummary: storeStats,
      businessHealth: businessHealth,
      quickActions: quickActions,
      usage: usageStats,
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.billing.status,
        trial: subscription.trial,
        nextBilling: subscription.billing.nextBillingDate,
        features: subscription.features
      } : null
    };

    res.json({
      success: true,
      data: dashboardData,
      period: period,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/dashboard/quick-stats
// @desc    Get quick stats for header/sidebar
// @access  Private
router.get('/quick-stats', requireEmailVerification, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [subscription, monthlyPosts, todayPosts] = await Promise.all([
      EnhancedSubscription.findOne({ user: userId }),
      PostingQueue.countDocuments({
        user: userId,
        createdAt: { $gte: startOfMonth }
      }),
      PostingQueue.countDocuments({
        user: userId,
        createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) }
      })
    ]);

    const stats = {
      plan: subscription?.plan || 'basic',
      postsThisMonth: monthlyPosts,
      postsToday: todayPosts,
      usagePercentage: subscription ? Math.round((subscription.usage.currentMonth.postsGenerated / subscription.features.monthlyPosts) * 100) : 0,
      canCreatePost: subscription ? subscription.canGeneratePost() : false,
      trialDaysRemaining: subscription?.trial?.isActive ? subscription.trial.daysRemaining : 0,
      isTrialActive: subscription?.trial?.isActive || false
    };

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load quick stats'
    });
  }
});

// @route   GET /api/dashboard/notifications
// @desc    Get user notifications
// @access  Private
router.get('/notifications', requireEmailVerification, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10, unreadOnly = false } = req.query;

    // Get recent activities and system notifications
    const notifications = [];

    // Check for failed posts in last 24 hours
    const recentFailedPosts = await PostingQueue.find({
      user: userId,
      status: 'failed',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).limit(5);

    recentFailedPosts.forEach(post => {
      notifications.push({
        id: `failed-post-${post._id}`,
        type: 'error',
        title: 'Post Failed to Publish',
        message: `Your post "${post.content.text.substring(0, 50)}..." failed to publish.`,
        priority: 'high',
        createdAt: post.updatedAt,
        action: {
          text: 'Retry Post',
          url: `/dashboard/posts/${post._id}`
        }
      });
    });

    // Check subscription status
    const subscription = await EnhancedSubscription.findOne({ user: userId });
    if (subscription) {
      // Trial expiring soon
      if (subscription.trial.isActive && subscription.trial.daysRemaining <= 3) {
        notifications.push({
          id: 'trial-expiring',
          type: 'warning',
          title: 'Trial Expiring Soon',
          message: `Your trial expires in ${subscription.trial.daysRemaining} days. Upgrade to continue using all features.`,
          priority: 'medium',
          createdAt: new Date(),
          action: {
            text: 'Upgrade Now',
            url: '/dashboard/subscription'
          }
        });
      }

      // Usage limit warnings
      const usagePercentage = (subscription.usage.currentMonth.postsGenerated / subscription.features.monthlyPosts) * 100;
      if (usagePercentage >= 80 && usagePercentage < 100) {
        notifications.push({
          id: 'usage-warning',
          type: 'warning',
          title: 'Usage Limit Warning',
          message: `You've used ${Math.round(usagePercentage)}% of your monthly post limit.`,
          priority: 'medium',
          createdAt: new Date(),
          action: {
            text: 'View Usage',
            url: '/dashboard/subscription'
          }
        });
      } else if (usagePercentage >= 100) {
        notifications.push({
          id: 'usage-exceeded',
          type: 'error',
          title: 'Usage Limit Exceeded',
          message: 'You\'ve reached your monthly post limit. Upgrade your plan to continue.',
          priority: 'high',
          createdAt: new Date(),
          action: {
            text: 'Upgrade Plan',
            url: '/dashboard/subscription'
          }
        });
      }
    }

    // Check for unconnected social media accounts
    const user = req.user;
    const unconnectedPlatforms = [];
    if (!user.socialMedia?.facebook?.connected) unconnectedPlatforms.push('Facebook');
    if (!user.socialMedia?.instagram?.connected) unconnectedPlatforms.push('Instagram');
    if (!user.socialMedia?.twitter?.connected) unconnectedPlatforms.push('Twitter');

    if (unconnectedPlatforms.length > 0) {
      notifications.push({
        id: 'connect-platforms',
        type: 'info',
        title: 'Connect Social Media',
        message: `Connect ${unconnectedPlatforms.join(', ')} to maximize your reach.`,
        priority: 'low',
        createdAt: new Date(),
        action: {
          text: 'Connect Now',
          url: '/dashboard/social-media'
        }
      });
    }

    // Welcome notification for new users
    const daysSinceSignup = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceSignup <= 1) {
      notifications.push({
        id: 'welcome',
        type: 'success',
        title: 'Welcome to SaaS Local!',
        message: 'Complete your profile and create your first AI-generated post to get started.',
        priority: 'medium',
        createdAt: user.createdAt,
        action: {
          text: 'Create First Post',
          url: '/dashboard/create-post'
        }
      });
    }

    // Sort notifications by priority and date
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    notifications.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Apply filters and limits
    let filteredNotifications = notifications;
    if (unreadOnly === 'true') {
      // In a real app, you'd track read status in database
      filteredNotifications = notifications; // For now, show all as unread
    }

    const limitedNotifications = filteredNotifications.slice(0, parseInt(limit));
    const unreadCount = notifications.filter(n => n.priority === 'high').length;

    res.json({
      success: true,
      notifications: limitedNotifications,
      unreadCount: unreadCount,
      totalCount: notifications.length
    });

  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load notifications'
    });
  }
});

// @route   GET /api/dashboard/analytics
// @desc    Get detailed analytics data
// @access  Private
router.get('/analytics', requireEmailVerification, requireFeature('analytics'), async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'month', metric = 'all' } = req.query;

    // Calculate date ranges
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
    }

    // Fetch posts data
    const posts = await PostingQueue.find({
      user: userId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'posted'
    }).sort({ createdAt: 1 });

    // Generate comprehensive analytics
    const analytics = {
      overview: {
        totalPosts: posts.length,
        totalEngagement: posts.reduce((sum, p) => sum + (p.performance?.totalEngagement || 0), 0),
        totalReach: posts.reduce((sum, p) => sum + (p.performance?.totalReach || 0), 0),
        averageEngagementRate: 0,
        bestPerformingPlatform: '',
        topContentType: ''
      },
      platformBreakdown: {},
      contentTypeAnalysis: {},
      timeAnalysis: {},
      engagementTrends: [],
      topPerformingPosts: [],
      insights: []
    };

    // Calculate platform performance
    const platforms = ['facebook', 'instagram', 'twitter'];
    platforms.forEach(platform => {
      const platformPosts = posts.filter(p => p.platforms[platform]?.posted);
      const totalEngagement = platformPosts.reduce((sum, p) => sum + (p.performance?.[platform]?.engagement || 0), 0);
      const totalReach = platformPosts.reduce((sum, p) => sum + (p.performance?.[platform]?.reach || 0), 0);

      analytics.platformBreakdown[platform] = {
        posts: platformPosts.length,
        engagement: totalEngagement,
        reach: totalReach,
        averageEngagement: platformPosts.length > 0 ? Math.round(totalEngagement / platformPosts.length) : 0,
        engagementRate: totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : 0
      };
    });

    // Find best performing platform
    const bestPlatform = Object.keys(analytics.platformBreakdown).reduce((best, platform) => {
      const current = analytics.platformBreakdown[platform];
      const bestData = analytics.platformBreakdown[best] || { engagement: 0 };
      return current.engagement > bestData.engagement ? platform : best;
    }, 'facebook');

    analytics.overview.bestPerformingPlatform = bestPlatform;

    // Analyze content types
    const contentTypes = {};
    posts.forEach(post => {
      const type = post.content.contentType || 'general';
      if (!contentTypes[type]) {
        contentTypes[type] = { count: 0, engagement: 0, reach: 0 };
      }
      contentTypes[type].count++;
      contentTypes[type].engagement += post.performance?.totalEngagement || 0;
      contentTypes[type].reach += post.performance?.totalReach || 0;
    });

    analytics.contentTypeAnalysis = contentTypes;

    // Find top content type
    const topContentType = Object.keys(contentTypes).reduce((top, type) => {
      return contentTypes[type].engagement > (contentTypes[top]?.engagement || 0) ? type : top;
    }, Object.keys(contentTypes)[0] || 'general');

    analytics.overview.topContentType = topContentType;

    // Time-based analysis (best posting times)
    const hourlyData = Array(24).fill(0).map(() => ({ posts: 0, engagement: 0 }));
    const dailyData = Array(7).fill(0).map(() => ({ posts: 0, engagement: 0 }));

    posts.forEach(post => {
      const postDate = new Date(post.postedAt || post.createdAt);
      const hour = postDate.getHours();
      const day = postDate.getDay();

      hourlyData[hour].posts++;
      hourlyData[hour].engagement += post.performance?.totalEngagement || 0;

      dailyData[day].posts++;
      dailyData[day].engagement += post.performance?.totalEngagement || 0;
    });

    analytics.timeAnalysis = {
      hourly: hourlyData,
      daily: dailyData,
      bestHour: hourlyData.reduce((best, current, index) => 
        current.engagement > hourlyData[best].engagement ? index : best, 0),
      bestDay: dailyData.reduce((best, current, index) => 
        current.engagement > dailyData[best].engagement ? index : best, 0)
    };

    // Generate engagement trends (daily data)
    const dailyTrends = {};
    posts.forEach(post => {
      const dateKey = new Date(post.postedAt || post.createdAt).toISOString().split('T')[0];
      if (!dailyTrends[dateKey]) {
        dailyTrends[dateKey] = { posts: 0, engagement: 0, reach: 0 };
      }
      dailyTrends[dateKey].posts++;
      dailyTrends[dateKey].engagement += post.performance?.totalEngagement || 0;
      dailyTrends[dateKey].reach += post.performance?.totalReach || 0;
    });

    analytics.engagementTrends = Object.keys(dailyTrends)
      .sort()
      .map(date => ({
        date,
        ...dailyTrends[date]
      }));

    // Top performing posts
    analytics.topPerformingPosts = posts
      .sort((a, b) => (b.performance?.totalEngagement || 0) - (a.performance?.totalEngagement || 0))
      .slice(0, 10)
      .map(post => ({
        id: post._id,
        content: post.content.text.substring(0, 100) + '...',
        contentType: post.content.contentType,
        engagement: post.performance?.totalEngagement || 0,
        reach: post.performance?.totalReach || 0,
        platforms: Object.keys(post.platforms).filter(p => post.platforms[p].posted),
        postedAt: post.postedAt || post.createdAt
      }));

    // Calculate overall engagement rate
    if (analytics.overview.totalReach > 0) {
      analytics.overview.averageEngagementRate = 
        ((analytics.overview.totalEngagement / analytics.overview.totalReach) * 100).toFixed(2);
    }

    // Generate insights
    analytics.insights = generateAnalyticsInsights(analytics, posts.length);

    res.json({
      success: true,
      analytics: analytics,
      period: period,
      dateRange: { startDate, endDate },
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load analytics data'
    });
  }
});

// @route   POST /api/dashboard/test-connections
// @desc    Test all social media connections
// @access  Private
router.post('/test-connections', requireEmailVerification, logActivity('test_connections'), async (req, res) => {
  try {
    const user = req.user;
    const results = await socialMediaService.verifyConnections(user.socialMedia);

    // Update user's connection status based on test results
    if (results.success) {
      const updatedSocialMedia = { ...user.socialMedia };
      
      Object.keys(results.status).forEach(platform => {
        if (updatedSocialMedia[platform]) {
          updatedSocialMedia[platform].connected = results.status[platform].success;
          updatedSocialMedia[platform].lastChecked = new Date();
          if (!results.status[platform].success) {
            updatedSocialMedia[platform].error = results.status[platform].error;
          } else {
            updatedSocialMedia[platform].error = null;
          }
        }
      });

      await User.findByIdAndUpdate(user._id, {
        socialMedia: updatedSocialMedia
      });
    }

    res.json({
      success: true,
      connections: results.status,
      message: 'Connection test completed'
    });

  } catch (error) {
    console.error('Test connections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connections'
    });
  }
});

// Helper function to generate chart data
function generateChartData(posts, period, startDate, endDate) {
  const data = {
    postPerformance: [],
    engagementTrend: []
  };

  // Generate daily data points
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const interval = period === 'year' ? 30 : period === 'quarter' ? 7 : 1; // days

  for (let i = 0; i < daysDiff; i += interval) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const nextDate = new Date(date.getTime() + interval * 24 * 60 * 60 * 1000);
    
    const periodPosts = posts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= date && postDate < nextDate;
    });

    const dataPoint = {
      date: date.toISOString().split('T')[0],
      posts: periodPosts.length,
      engagement: periodPosts.reduce((sum, p) => sum + (p.performance?.totalEngagement || 0), 0),
      reach: periodPosts.reduce((sum, p) => sum + (p.performance?.totalReach || 0), 0)
    };

    data.postPerformance.push(dataPoint);
    data.engagementTrend.push(dataPoint);
  }

  return data;
}

// Helper function to calculate business health score
function calculateBusinessHealthScore(user, subscription, stats, storeStats) {
  const factors = [];
  let totalScore = 0;
  const maxScore = 100;

  // Social media connectivity (25 points)
  const connectedPlatforms = Object.keys(user.socialMedia || {}).filter(platform => 
    user.socialMedia[platform]?.connected
  ).length;
  const socialScore = Math.min((connectedPlatforms / 3) * 25, 25);
  factors.push({
    factor: 'Social Media',
    score: Math.round(socialScore),
    maxScore: 25,
    status: socialScore >= 20 ? 'good' : socialScore >= 10 ? 'okay' : 'poor'
  });
  totalScore += socialScore;

  // Content consistency (25 points)
  const consistencyScore = Math.min((stats.totalPosts / 10) * 25, 25);
  factors.push({
    factor: 'Content Consistency',
    score: Math.round(consistencyScore),
    maxScore: 25,
    status: consistencyScore >= 20 ? 'good' : consistencyScore >= 10 ? 'okay' : 'poor'
  });
  totalScore += consistencyScore;

  // Engagement performance (25 points)
  const avgEngagement = stats.publishedPosts > 0 ? stats.totalEngagement / stats.publishedPosts : 0;
  const engagementScore = Math.min((avgEngagement / 50) * 25, 25);
  factors.push({
    factor: 'Engagement',
    score: Math.round(engagementScore),
    maxScore: 25,
    status: engagementScore >= 20 ? 'good' : engagementScore >= 10 ? 'okay' : 'poor'
  });
  totalScore += engagementScore;

  // Business setup (25 points)
  let setupScore = 0;
  if (user.isEmailVerified) setupScore += 5;
  if (user.businessDescription) setupScore += 5;
  if (user.phone) setupScore += 5;
  if (storeStats && storeStats.totalProducts > 0) setupScore += 10;
  factors.push({
    factor: 'Business Setup',
    score: setupScore,
    maxScore: 25,
    status: setupScore >= 20 ? 'good' : setupScore >= 10 ? 'okay' : 'poor'
  });
  totalScore += setupScore;

  const overallScore = Math.round(totalScore);
  let grade = 'D';
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';

  return {
    overallScore,
    grade,
    factors
  };
}

// Helper function to generate quick actions
function generateQuickActions(user, subscription, stats, storeStats, failedPosts) {
  const actions = [];

  // Failed posts need attention
  if (failedPosts.length > 0) {
    actions.push({
      title: 'Fix Failed Posts',
      description: `${failedPosts.length} posts failed to publish`,
      url: '/dashboard/posts?filter=failed',
      priority: 'high'
    });
  }

  // No posts this week
  if (stats.totalPosts === 0) {
    actions.push({
      title: 'Create Your First Post',
      description: 'Start your social media presence',
      url: '/dashboard/create-post',
      priority: 'high'
    });
  }

  // Social media not connected
  const connectedPlatforms = Object.keys(user.socialMedia || {}).filter(platform => 
    user.socialMedia[platform]?.connected
  ).length;
  
  if (connectedPlatforms === 0) {
    actions.push({
      title: 'Connect Social Media',
      description: 'Connect Facebook, Instagram, or Twitter',
      url: '/dashboard/social-media',
      priority: 'medium'
    });
  }

  // No products in store
  if (storeStats && storeStats.totalProducts === 0) {
    actions.push({
      title: 'Add Products',
      description: 'Start selling with your first product',
      url: '/dashboard/store/products/new',
      priority: 'medium'
    });
  }

  // Email not verified
  if (!user.isEmailVerified) {
    actions.push({
      title: 'Verify Email',
      description: 'Verify your email to unlock all features',
      url: '/dashboard/profile',
      priority: 'medium'
    });
  }

  // Trial expiring
  if (subscription?.trial?.isActive && subscription.trial.daysRemaining <= 7) {
    actions.push({
      title: 'Upgrade Plan',
      description: `Trial expires in ${subscription.trial.daysRemaining} days`,
      url: '/dashboard/subscription',
      priority: 'medium'
    });
  }

  return actions.slice(0, 6); // Limit to 6 actions
}

// Helper function to generate analytics insights
function generateAnalyticsInsights(analytics, totalPosts) {
  const insights = [];

  if (totalPosts === 0) {
    insights.push({
      type: 'info',
      message: 'Start creating posts to see detailed analytics and insights.'
    });
    return insights;
  }

  // Best performing platform insight
  const platforms = Object.keys(analytics.platformBreakdown);
  const bestPlatform = platforms.reduce((best, platform) => {
    const current = analytics.platformBreakdown[platform];
    const bestData = analytics.platformBreakdown[best] || { engagement: 0 };
    return current.engagement > bestData.engagement ? platform : best;
  }, platforms[0]);

  if (bestPlatform && analytics.platformBreakdown[bestPlatform].engagement > 0) {
    insights.push({
      type: 'success',
      message: `${bestPlatform.charAt(0).toUpperCase() + bestPlatform.slice(1)} is your best performing platform with ${analytics.platformBreakdown[bestPlatform].engagement} total engagement.`
    });
  }

  // Posting time insight
  const bestHour = analytics.timeAnalysis.bestHour;
  const hourlyEngagement = analytics.timeAnalysis.hourly[bestHour].engagement;
  if (hourlyEngagement > 0) {
    const timeStr = bestHour === 0 ? '12 AM' : bestHour < 12 ? `${bestHour} AM` : bestHour === 12 ? '12 PM' : `${bestHour - 12} PM`;
    insights.push({
      type: 'tip',
      message: `Your posts perform best around ${timeStr}. Consider scheduling more content at this time.`
    });
  }

  // Content type insight
  if (analytics.overview.topContentType && analytics.overview.topContentType !== 'general') {
    insights.push({
      type: 'info',
      message: `${analytics.overview.topContentType.charAt(0).toUpperCase() + analytics.overview.topContentType.slice(1)} content generates the most engagement for your audience.`
    });
  }

  // Engagement rate insight
  const engagementRate = parseFloat(analytics.overview.averageEngagementRate);
  if (engagementRate > 0) {
    if (engagementRate >= 3) {
      insights.push({
        type: 'success',
        message: `Excellent! Your ${engagementRate}% engagement rate is above industry average.`
      });
    } else if (engagementRate >= 1) {
      insights.push({
        type: 'info',
        message: `Your ${engagementRate}% engagement rate is good. Try posting more interactive content to improve it.`
      });
    } else {
      insights.push({
        type: 'warning',
        message: `Your ${engagementRate}% engagement rate could be improved. Focus on creating more engaging content.`
      });
    }
  }

  return insights;
}

module.exports = router;
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const User = require('../models/User');
const PostingQueue = require('../models/PostingQueue');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const socialMediaService = require('../services/socialMediaService');
const openaiService = require('../services/openaiService');
const cloudinaryService = require('../services/cloudinaryService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const {
  auth,
  requireEmailVerification,
  checkUsageLimit,
  requireFeature,
  requirePlan,
  logActivity
} = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(auth);
router.use(requireEmailVerification);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }
  }
});

// @route   GET /api/social-media/connections
// @desc    Get all social media connections status
// @access  Private
router.get('/connections', logActivity('view_connections'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('socialMedia');
    
    // Test all connections
    const connectionStatus = await socialMediaService.verifyConnections(user.socialMedia);
    
    // Get platform analytics if connected
    const platformAnalytics = {};
    
    if (user.socialMedia.facebook?.connected) {
      try {
        const pageInfo = await socialMediaService.facebook.getPageInfo(
          user.socialMedia.facebook.pageId,
          user.socialMedia.facebook.accessToken
        );
        if (pageInfo.success) {
          platformAnalytics.facebook = {
            ...pageInfo.pageInfo,
            connected: true,
            lastChecked: new Date()
          };
        }
      } catch (error) {
        console.error('Facebook analytics error:', error);
        platformAnalytics.facebook = { connected: false, error: error.message };
      }
    }

    if (user.socialMedia.instagram?.connected) {
      try {
        const accountInfo = await socialMediaService.instagram.getAccountInfo(
          user.socialMedia.instagram.accountId,
          user.socialMedia.instagram.accessToken
        );
        if (accountInfo.success) {
          platformAnalytics.instagram = {
            ...accountInfo.accountInfo,
            connected: true,
            lastChecked: new Date()
          };
        }
      } catch (error) {
        console.error('Instagram analytics error:', error);
        platformAnalytics.instagram = { connected: false, error: error.message };
      }
    }

    if (user.socialMedia.twitter?.connected) {
      try {
        const userInfo = await socialMediaService.twitter.getUserInfo(
          user.socialMedia.twitter.username,
          user.socialMedia.twitter.accessToken
        );
        if (userInfo.success) {
          platformAnalytics.twitter = {
            ...userInfo.userInfo,
            connected: true,
            lastChecked: new Date()
          };
        }
      } catch (error) {
        console.error('Twitter analytics error:', error);
        platformAnalytics.twitter = { connected: false, error: error.message };
      }
    }

    // Get recent posts for each platform
    const recentPosts = await PostingQueue.find({
      user: req.user._id,
      status: 'posted'
    })
    .sort({ postedAt: -1 })
    .limit(20)
    .select('platforms content performance postedAt');

    // Calculate platform-specific metrics
    const platformMetrics = {
      facebook: calculatePlatformMetrics(recentPosts, 'facebook'),
      instagram: calculatePlatformMetrics(recentPosts, 'instagram'),
      twitter: calculatePlatformMetrics(recentPosts, 'twitter')
    };

    // Get optimal posting times
    const optimalTimes = {
      facebook: socialMediaService.getOptimalPostingTimes(req.user.businessType),
      instagram: socialMediaService.getOptimalPostingTimes(req.user.businessType),
      twitter: socialMediaService.getOptimalPostingTimes(req.user.businessType)
    };

    // Get content recommendations
    const contentRecommendations = {
      facebook: socialMediaService.getContentRecommendations(req.user.businessType, 'facebook'),
      instagram: socialMediaService.getContentRecommendations(req.user.businessType, 'instagram'),
      twitter: socialMediaService.getContentRecommendations(req.user.businessType, 'twitter')
    };

    res.json({
      success: true,
      connections: {
        facebook: {
          connected: user.socialMedia.facebook?.connected || false,
          pageId: user.socialMedia.facebook?.pageId,
          pageName: user.socialMedia.facebook?.pageName,
          analytics: platformAnalytics.facebook,
          metrics: platformMetrics.facebook,
          optimalTimes: optimalTimes.facebook,
          recommendations: contentRecommendations.facebook,
          status: connectionStatus.status?.facebook
        },
        instagram: {
          connected: user.socialMedia.instagram?.connected || false,
          accountId: user.socialMedia.instagram?.accountId,
          username: user.socialMedia.instagram?.username,
          analytics: platformAnalytics.instagram,
          metrics: platformMetrics.instagram,
          optimalTimes: optimalTimes.instagram,
          recommendations: contentRecommendations.instagram,
          status: connectionStatus.status?.instagram
        },
        twitter: {
          connected: user.socialMedia.twitter?.connected || false,
          username: user.socialMedia.twitter?.username,
          analytics: platformAnalytics.twitter,
          metrics: platformMetrics.twitter,
          optimalTimes: optimalTimes.twitter,
          recommendations: contentRecommendations.twitter,
          status: connectionStatus.status?.twitter
        }
      },
      subscription: await getSubscriptionLimits(req.user._id)
    });

  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection status'
    });
  }
});

// @route   POST /api/social-media/connect/facebook
// @desc    Connect Facebook account
// @access  Private
router.post('/connect/facebook', logActivity('connect_facebook'), async (req, res) => {
  try {
    const { accessToken, pageId } = req.body;

    if (!accessToken || !pageId) {
      return res.status(400).json({
        success: false,
        message: 'Access token and page ID are required'
      });
    }

    // Verify Facebook connection
    const verification = await socialMediaService.facebook.verifyConnection({
      accessToken,
      pageId
    });

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to verify Facebook connection',
        error: verification.error
      });
    }

    // Get page information
    const pageInfo = await socialMediaService.facebook.getPageInfo(pageId, accessToken);
    
    if (!pageInfo.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get page information',
        error: pageInfo.error
      });
    }

    // Update user's Facebook connection
    const user = await User.findById(req.user._id);
    user.socialMedia.facebook = {
      connected: true,
      accessToken: accessToken,
      pageId: pageId,
      pageName: pageInfo.pageInfo.name,
      connectedAt: new Date(),
      lastChecked: new Date(),
      followers: pageInfo.pageInfo.followers || 0
    };

    await user.save();

    // Send connection success email
    try {
      await emailService.sendSocialMediaConnectionSuccess(user, 'Facebook', pageInfo.pageInfo.name);
    } catch (emailError) {
      console.error('Connection email error:', emailError);
    }

    res.json({
      success: true,
      message: 'Facebook page connected successfully',
      pageInfo: pageInfo.pageInfo
    });

  } catch (error) {
    console.error('Facebook connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Facebook account'
    });
  }
});

// @route   POST /api/social-media/connect/instagram
// @desc    Connect Instagram account
// @access  Private
router.post('/connect/instagram', requirePlan('pro'), logActivity('connect_instagram'), async (req, res) => {
  try {
    const { accessToken, accountId } = req.body;

    if (!accessToken || !accountId) {
      return res.status(400).json({
        success: false,
        message: 'Access token and account ID are required'
      });
    }

    // Verify Instagram connection
    const verification = await socialMediaService.instagram.verifyConnection({
      accessToken,
      accountId
    });

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to verify Instagram connection',
        error: verification.error
      });
    }

    // Get account information
    const accountInfo = await socialMediaService.instagram.getAccountInfo(accountId, accessToken);
    
    if (!accountInfo.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get account information',
        error: accountInfo.error
      });
    }

    // Update user's Instagram connection
    const user = await User.findById(req.user._id);
    user.socialMedia.instagram = {
      connected: true,
      accessToken: accessToken,
      accountId: accountId,
      username: accountInfo.accountInfo.username,
      connectedAt: new Date(),
      lastChecked: new Date(),
      followers: accountInfo.accountInfo.followers || 0,
      mediaCount: accountInfo.accountInfo.mediaCount || 0
    };

    await user.save();

    // Send connection success email
    try {
      await emailService.sendSocialMediaConnectionSuccess(user, 'Instagram', accountInfo.accountInfo.username);
    } catch (emailError) {
      console.error('Connection email error:', emailError);
    }

    res.json({
      success: true,
      message: 'Instagram account connected successfully',
      accountInfo: accountInfo.accountInfo
    });

  } catch (error) {
    console.error('Instagram connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Instagram account'
    });
  }
});

// @route   POST /api/social-media/connect/twitter
// @desc    Connect Twitter account
// @access  Private
router.post('/connect/twitter', requirePlan('premium'), logActivity('connect_twitter'), async (req, res) => {
  try {
    const { accessToken, accessSecret, username } = req.body;

    if (!accessToken || !accessSecret || !username) {
      return res.status(400).json({
        success: false,
        message: 'Access token, access secret, and username are required'
      });
    }

    // Verify Twitter connection
    const verification = await socialMediaService.twitter.verifyConnection({
      accessToken,
      accessSecret,
      username
    });

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to verify Twitter connection',
        error: verification.error
      });
    }

    // Update user's Twitter connection
    const user = await User.findById(req.user._id);
    user.socialMedia.twitter = {
      connected: true,
      accessToken: accessToken,
      accessSecret: accessSecret,
      username: username,
      connectedAt: new Date(),
      lastChecked: new Date()
    };

    await user.save();

    // Send connection success email
    try {
      await emailService.sendSocialMediaConnectionSuccess(user, 'Twitter', username);
    } catch (emailError) {
      console.error('Connection email error:', emailError);
    }

    res.json({
      success: true,
      message: 'Twitter account connected successfully',
      username: username
    });

  } catch (error) {
    console.error('Twitter connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Twitter account'
    });
  }
});

// @route   DELETE /api/social-media/disconnect/:platform
// @desc    Disconnect social media platform
// @access  Private
router.delete('/disconnect/:platform', logActivity('disconnect_social_media'), async (req, res) => {
  try {
    const { platform } = req.params;
    
    if (!['facebook', 'instagram', 'twitter'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user.socialMedia[platform]?.connected) {
      return res.status(400).json({
        success: false,
        message: `${platform} is not connected`
      });
    }

    // Disconnect the platform
    user.socialMedia[platform] = {
      connected: false,
      disconnectedAt: new Date()
    };

    await user.save();

    // Cancel any pending posts for this platform
    await PostingQueue.updateMany(
      {
        user: req.user._id,
        status: 'pending',
        [`platforms.${platform}.enabled`]: true
      },
      {
        $set: {
          [`platforms.${platform}.enabled`]: false,
          [`platforms.${platform}.error`]: 'Platform disconnected'
        }
      }
    );

    res.json({
      success: true,
      message: `${platform} disconnected successfully`
    });

  } catch (error) {
    console.error('Disconnect platform error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect platform'
    });
  }
});

// @route   POST /api/social-media/create-post
// @desc    Create and schedule social media post
// @access  Private
router.post('/create-post', 
  checkUsageLimit('posts'), 
  upload.array('media', 10), 
  logActivity('create_post'), 
  async (req, res) => {
  try {
    const {
      content,
      contentType = 'promotional',
      customPrompt,
      platforms,
      scheduleType = 'now',
      scheduledFor,
      hashtags,
      businessGoals
    } = req.body;

    // Validate input
    if (!content && !customPrompt) {
      return res.status(400).json({
        success: false,
        message: 'Content or custom prompt is required'
      });
    }

    // Parse platforms if it's a string
    let platformsObj;
    try {
      platformsObj = typeof platforms === 'string' ? JSON.parse(platforms) : platforms;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platforms format'
      });
    }

    // Validate platform selection
    const selectedPlatforms = Object.keys(platformsObj || {}).filter(p => platformsObj[p]);
    if (selectedPlatforms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one platform must be selected'
      });
    }

    // Check if selected platforms are connected
    const user = await User.findById(req.user._id);
    const unconnectedPlatforms = selectedPlatforms.filter(platform => 
      !user.socialMedia[platform]?.connected
    );

    if (unconnectedPlatforms.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please connect ${unconnectedPlatforms.join(', ')} first`,
        unconnectedPlatforms
      });
    }

    // Validate scheduled time
    let scheduledDateTime = null;
    if (scheduleType === 'scheduled') {
      if (!scheduledFor) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date and time is required'
        });
      }

      scheduledDateTime = new Date(scheduledFor);
      if (scheduledDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled time must be in the future'
        });
      }
    }

    // Process uploaded media
    const processedMedia = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          let processedFile;
          
          if (file.mimetype.startsWith('image/')) {
            // Process and optimize image
            processedFile = await processImage(file);
          } else if (file.mimetype.startsWith('video/')) {
            // Process and optimize video
            processedFile = await processVideo(file);
          }

          if (processedFile) {
            // Upload to cloud storage
            const uploadResult = await cloudinaryService.uploadMedia(
              processedFile.buffer || processedFile.path,
              {
                resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
                folder: `saaslocal/posts/${req.user._id}`,
                public_id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                transformation: file.mimetype.startsWith('image/') ? [
                  { width: 1080, height: 1080, crop: 'fill' },
                  { quality: 'auto:good' }
                ] : [
                  { width: 1080, height: 1080, crop: 'fill' },
                  { quality: 'auto:good', video_codec: 'h264' }
                ]
              }
            );

            if (uploadResult.success) {
              processedMedia.push({
                type: file.mimetype.startsWith('video/') ? 'video' : 'image',
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                originalName: file.originalname,
                size: file.size,
                dimensions: uploadResult.width && uploadResult.height ? {
                  width: uploadResult.width,
                  height: uploadResult.height
                } : null
              });
            }
          }
        } catch (mediaError) {
          console.error('Media processing error:', mediaError);
          // Continue with other files if one fails
        }
      }
    }

    // Generate or use provided content
    let finalContent = content;
    let generatedHashtags = [];
    let aiGenerated = false;

    if (!content && customPrompt) {
      // Generate AI content
      const aiResult = await openaiService.generatePostContent(
        user.toObject(),
        contentType,
        customPrompt
      );

      if (aiResult.success) {
        finalContent = aiResult.content;
        generatedHashtags = aiResult.hashtags || [];
        aiGenerated = true;
      } else {
        // Use fallback content
        const fallback = aiResult.fallbackContent;
        finalContent = fallback.content;
        generatedHashtags = fallback.hashtags || [];
      }
    }

    // Parse and combine hashtags
    let finalHashtags = [];
    if (hashtags) {
      try {
        const parsedHashtags = typeof hashtags === 'string' ? JSON.parse(hashtags) : hashtags;
        finalHashtags = Array.isArray(parsedHashtags) ? parsedHashtags : [];
      } catch (error) {
        console.error('Hashtag parsing error:', error);
      }
    }

    // Add generated hashtags
    finalHashtags = [...finalHashtags, ...generatedHashtags];
    finalHashtags = [...new Set(finalHashtags)]; // Remove duplicates

    // Add Pakistani business hashtags if not present
    const businessHashtags = socialMediaService.getHashtagRecommendations(
      user.businessType,
      user.address?.city || 'Pakistan'
    );
    finalHashtags = [...finalHashtags, ...businessHashtags.slice(0, 3)];
    finalHashtags = [...new Set(finalHashtags)].slice(0, 15); // Limit to 15 hashtags

    // Create post object
    const platformsConfig = {};
    selectedPlatforms.forEach(platform => {
      platformsConfig[platform] = {
        enabled: true,
        posted: false,
        postId: null,
        postedAt: null,
        error: null
      };
    });

    const newPost = new PostingQueue({
      user: req.user._id,
      content: {
        text: finalContent,
        hashtags: finalHashtags,
        media: processedMedia,
        contentType: contentType,
        aiGenerated: aiGenerated,
        customPrompt: customPrompt || null
      },
      platforms: platformsConfig,
      schedule: {
        scheduledFor: scheduleType === 'now' ? new Date() : scheduledDateTime,
        timezone: 'Asia/Karachi',
        scheduleType: scheduleType
      },
      businessContext: {
        businessType: user.businessType,
        businessGoals: businessGoals ? (typeof businessGoals === 'string' ? JSON.parse(businessGoals) : businessGoals) : ['engagement'],
        targetAudience: user.targetAudience || 'local_customers',
        storeUrl: user.store ? `${process.env.FRONTEND_URL}/store/${user.store.storeUrl}` : null
      },
      performance: {
        totalEngagement: 0,
        totalReach: 0,
        totalClicks: 0,
        facebook: { engagement: 0, reach: 0, clicks: 0 },
        instagram: { engagement: 0, reach: 0, clicks: 0 },
        twitter: { engagement: 0, reach: 0, clicks: 0 }
      },
      status: scheduleType === 'now' ? 'pending' : 'scheduled',
      retries: {
        count: 0,
        maxRetries: 3,
        lastRetry: null
      }
    });

    await newPost.save();

    // Update subscription usage
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });
    if (subscription) {
      await subscription.incrementUsage('post');
    }

    // If posting now, add to immediate processing queue
    if (scheduleType === 'now') {
      // This would trigger immediate processing
      console.log(`📤 Post ${newPost._id} queued for immediate processing`);
    }

    // Send confirmation email for scheduled posts
    if (scheduleType === 'scheduled') {
      try {
        await emailService.sendPostScheduledConfirmation(user, newPost);
      } catch (emailError) {
        console.error('Scheduled post email error:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: scheduleType === 'now' ? 'Post created and queued for publishing' : 'Post scheduled successfully',
      post: {
        id: newPost._id,
        content: {
          text: newPost.content.text,
          hashtags: newPost.content.hashtags,
          mediaCount: processedMedia.length,
          aiGenerated: aiGenerated
        },
        platforms: selectedPlatforms,
        scheduledFor: newPost.schedule.scheduledFor,
        status: newPost.status
      },
      usage: subscription ? {
        postsUsed: subscription.usage.currentMonth.postsGenerated,
        postsLimit: subscription.features.monthlyPosts,
        canCreateMore: subscription.canGeneratePost()
      } : null
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/social-media/posts
// @desc    Get user's social media posts with advanced filtering
// @access  Private
router.get('/posts', logActivity('view_posts'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      platform,
      contentType,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = { user: req.user._id };

    if (status) {
      filter.status = status;
    }

    if (platform) {
      filter[`platforms.${platform}.enabled`] = true;
    }

    if (contentType) {
      filter['content.contentType'] = contentType;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { 'content.text': { $regex: search, $options: 'i' } },
        { 'content.hashtags': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get posts with pagination
    const [posts, totalPosts] = await Promise.all([
      PostingQueue.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PostingQueue.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalPosts / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    // Get aggregated statistics
    const stats = await PostingQueue.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          publishedPosts: {
            $sum: {
              $cond: [{ $eq: ['$status', 'posted'] }, 1, 0]
            }
          },
          scheduledPosts: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          failedPosts: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
            }
          },
          totalEngagement: { $sum: '$performance.totalEngagement' },
          totalReach: { $sum: '$performance.totalReach' }
        }
      }
    ]);

    // Format posts for response
    const formattedPosts = posts.map(post => ({
      id: post._id,
      content: {
        text: post.content.text,
        hashtags: post.content.hashtags,
        mediaCount: post.content.media ? post.content.media.length : 0,
        contentType: post.content.contentType,
        aiGenerated: post.content.aiGenerated
      },
      platforms: Object.keys(post.platforms).filter(p => post.platforms[p].enabled),
      platformStatus: Object.fromEntries(
        Object.entries(post.platforms).map(([platform, data]) => [
          platform,
          {
            enabled: data.enabled,
            posted: data.posted,
            postId: data.postId,
            error: data.error
          }
        ])
      ),
      schedule: {
        scheduledFor: post.schedule.scheduledFor,
        scheduleType: post.schedule.scheduleType
      },
      performance: post.performance,
      status: post.status,
      createdAt: post.createdAt,
      postedAt: post.postedAt,
      retries: post.retries
    }));

    res.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      },
      stats: stats[0] || {
        totalPosts: 0,
        publishedPosts: 0,
        scheduledPosts: 0,
        failedPosts: 0,
        totalEngagement: 0,
        totalReach: 0
      }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get posts'
    });
  }
});

// @route   GET /api/social-media/posts/:id
// @desc    Get single post details
// @access  Private
router.get('/posts/:id', logActivity('view_post_details'), async (req, res) => {
  try {
    const { id } = req.params;

    const post = await PostingQueue.findOne({
      _id: id,
      user: req.user._id
    }).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Get detailed analytics for each platform
    const platformAnalytics = {};
    
    for (const platform of Object.keys(post.platforms)) {
      if (post.platforms[platform].posted && post.platforms[platform].postId) {
        try {
          const user = await User.findById(req.user._id);
          const analytics = await socialMediaService.getAllPlatformAnalytics(
            user.socialMedia,
            { [platform]: post.platforms[platform].postId }
          );
          
          if (analytics.success && analytics.analytics[platform]) {
            platformAnalytics[platform] = analytics.analytics[platform].analytics;
          }
        } catch (analyticsError) {
          console.error(`${platform} analytics error:`, analyticsError);
        }
      }
    }

    res.json({
      success: true,
      post: {
        ...post,
        platformAnalytics
      }
    });

  } catch (error) {
    console.error('Get post details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get post details'
    });
  }
});

// @route   DELETE /api/social-media/posts/:id
// @desc    Delete post (cancel if scheduled, remove if failed)
// @access  Private
router.delete('/posts/:id', logActivity('delete_post'), async (req, res) => {
  try {
    const { id } = req.params;

    const post = await PostingQueue.findOne({
      _id: id,
      user: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Only allow deletion of pending, failed, or scheduled posts
    if (post.status === 'posted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete published posts'
      });
    }

    await PostingQueue.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post'
    });
  }
});

// @route   POST /api/social-media/posts/:id/retry
// @desc    Retry failed post
// @access  Private
router.post('/posts/:id/retry', logActivity('retry_post'), async (req, res) => {
  try {
    const { id } = req.params;

    const post = await PostingQueue.findOne({
      _id: id,
      user: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Only failed posts can be retried'
      });
    }

    if (post.retries.count >= post.retries.maxRetries) {
      return res.status(400).json({
        success: false,
        message: 'Maximum retry attempts exceeded'
      });
    }

    // Reset post for retry
    post.status = 'pending';
    post.schedule.scheduledFor = new Date();
    post.retries.count += 1;
    post.retries.lastRetry = new Date();

    // Clear previous errors
    Object.keys(post.platforms).forEach(platform => {
      if (post.platforms[platform].enabled) {
        post.platforms[platform].error = null;
        post.platforms[platform].posted = false;
        post.platforms[platform].postId = null;
        post.platforms[platform].postedAt = null;
      }
    });

    await post.save();

    res.json({
      success: true,
      message: 'Post queued for retry',
      retryCount: post.retries.count
    });

  } catch (error) {
    console.error('Retry post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry post'
    });
  }
});

// @route   POST /api/social-media/generate-content
// @desc    Generate AI content for social media
// @access  Private
router.post('/generate-content', 
  checkUsageLimit('posts'), 
  logActivity('generate_ai_content'), 
  async (req, res) => {
  try {
    const {
      contentType = 'promotional',
      customPrompt,
      includeImage = false,
      businessContext
    } = req.body;

    const user = await User.findById(req.user._id);

    // Generate text content
    const contentResult = await openaiService.generatePostContent(
      user.toObject(),
      contentType,
      customPrompt
    );

    let imageResult = null;
    if (includeImage) {
      try {
        // Generate AI image
        imageResult = await cloudinaryService.generateAIImage(
          user.businessType || 'services',
          contentType,
          customPrompt
        );
      } catch (imageError) {
        console.error('AI image generation error:', imageError);
        // Continue without image if generation fails
      }
    }

    if (!contentResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate content',
        error: contentResult.error
      });
    }

    // Get hashtag recommendations
    const hashtagRecommendations = socialMediaService.getHashtagRecommendations(
      user.businessType,
      user.address?.city || 'Pakistan'
    );

    // Combine generated and recommended hashtags
    const allHashtags = [
      ...(contentResult.hashtags || []),
      ...hashtagRecommendations.slice(0, 5)
    ];
    const uniqueHashtags = [...new Set(allHashtags)].slice(0, 15);

    res.json({
      success: true,
      content: {
        text: contentResult.content,
        hashtags: uniqueHashtags,
        contentType: contentType,
        wordCount: contentResult.wordCount,
        aiGenerated: true,
        image: imageResult?.success ? {
          url: imageResult.url,
          publicId: imageResult.publicId
        } : null
      },
      recommendations: {
        hashtags: hashtagRecommendations,
        optimalTimes: socialMediaService.getOptimalPostingTimes(user.businessType),
        contentTips: socialMediaService.getContentRecommendations(user.businessType, 'facebook')
      }
    });

  } catch (error) {
    console.error('Generate content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate content'
    });
  }
});

// @route   GET /api/social-media/analytics
// @desc    Get social media analytics
// @access  Private
router.get('/analytics', requireFeature('analytics'), logActivity('view_analytics'), async (req, res) => {
  try {
    const { period = 'month', platform } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Build filter
    const filter = {
      user: req.user._id,
      status: 'posted',
      postedAt: { $gte: startDate, $lte: now }
    };

    if (platform) {
      filter[`platforms.${platform}.posted`] = true;
    }

    // Get posts
    const posts = await PostingQueue.find(filter);

    // Calculate analytics
    const analytics = calculateDetailedAnalytics(posts, platform);

    res.json({
      success: true,
      analytics,
      period,
      dateRange: { startDate, endDate: now }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics'
    });
  }
});

// Helper Functions

// Calculate platform-specific metrics
function calculatePlatformMetrics(posts, platform) {
  const platformPosts = posts.filter(post => 
    post.platforms[platform]?.posted && post.platforms[platform]?.postId
  );

  if (platformPosts.length === 0) {
    return {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      averageEngagement: 0,
      engagementRate: 0,
      bestPost: null
    };
  }

  const totalEngagement = platformPosts.reduce((sum, post) => 
    sum + (post.performance?.[platform]?.engagement || 0), 0
  );

  const totalReach = platformPosts.reduce((sum, post) => 
    sum + (post.performance?.[platform]?.reach || 0), 0
  );

  const bestPost = platformPosts.reduce((best, current) => {
    const bestEngagement = best.performance?.[platform]?.engagement || 0;
    const currentEngagement = current.performance?.[platform]?.engagement || 0;
    return currentEngagement > bestEngagement ? current : best;
  });

  return {
    totalPosts: platformPosts.length,
    totalEngagement,
    totalReach,
    averageEngagement: Math.round(totalEngagement / platformPosts.length),
    engagementRate: totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : 0,
    bestPost: bestPost ? {
      id: bestPost._id,
      content: bestPost.content.text.substring(0, 100) + '...',
      engagement: bestPost.performance?.[platform]?.engagement || 0,
      postedAt: bestPost.postedAt
    } : null
  };
}

// Get subscription limits
async function getSubscriptionLimits(userId) {
  try {
    const subscription = await EnhancedSubscription.findOne({ user: userId });
    
    if (!subscription) {
      return {
        plan: 'basic',
        socialPlatforms: 1,
        monthlyPosts: 10,
        canConnectMultiplePlatforms: false
      };
    }

    return {
      plan: subscription.plan,
      socialPlatforms: subscription.features.socialPlatforms,
      monthlyPosts: subscription.features.monthlyPosts,
      canConnectMultiplePlatforms: subscription.features.socialPlatforms > 1,
      usedPosts: subscription.usage.currentMonth.postsGenerated,
      remainingPosts: Math.max(0, subscription.features.monthlyPosts - subscription.usage.currentMonth.postsGenerated)
    };
  } catch (error) {
    console.error('Get subscription limits error:', error);
    return {
      plan: 'basic',
      socialPlatforms: 1,
      monthlyPosts: 10,
      canConnectMultiplePlatforms: false
    };
  }
}

// Process uploaded image
async function processImage(file) {
  try {
    // Optimize image using Sharp
    const optimizedBuffer = await sharp(file.buffer)
      .resize(1080, 1080, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toBuffer();

    return {
      buffer: optimizedBuffer,
      mimetype: 'image/jpeg',
      size: optimizedBuffer.length
    };
  } catch (error) {
    console.error('Image processing error:', error);
    return file; // Return original if processing fails
  }
}

// Process uploaded video
async function processVideo(file) {
  try {
    // For video processing, we'd typically use FFmpeg
    // This is a simplified version - in production you'd want more robust video processing
    return file; // Return as-is for now
  } catch (error) {
    console.error('Video processing error:', error);
    return file;
  }
}

// Calculate detailed analytics
function calculateDetailedAnalytics(posts, platform) {
  const analytics = {
    overview: {
      totalPosts: posts.length,
      totalEngagement: 0,
      totalReach: 0,
      averageEngagement: 0,
      engagementRate: 0
    },
    platformBreakdown: {},
    contentTypeAnalysis: {},
    timeAnalysis: {
      hourly: Array(24).fill(0).map(() => ({ posts: 0, engagement: 0 })),
      daily: Array(7).fill(0).map(() => ({ posts: 0, engagement: 0 }))
    },
    topPosts: [],
    trends: []
  };

  // Calculate totals
  posts.forEach(post => {
    analytics.overview.totalEngagement += post.performance?.totalEngagement || 0;
    analytics.overview.totalReach += post.performance?.totalReach || 0;

    // Time analysis
    const postDate = new Date(post.postedAt || post.createdAt);
    const hour = postDate.getHours();
    const day = postDate.getDay();

    analytics.timeAnalysis.hourly[hour].posts++;
    analytics.timeAnalysis.hourly[hour].engagement += post.performance?.totalEngagement || 0;

    analytics.timeAnalysis.daily[day].posts++;
    analytics.timeAnalysis.daily[day].engagement += post.performance?.totalEngagement || 0;

    // Content type analysis
    const contentType = post.content.contentType || 'general';
    if (!analytics.contentTypeAnalysis[contentType]) {
      analytics.contentTypeAnalysis[contentType] = {
        posts: 0,
        engagement: 0,
        reach: 0
      };
    }
    analytics.contentTypeAnalysis[contentType].posts++;
    analytics.contentTypeAnalysis[contentType].engagement += post.performance?.totalEngagement || 0;
    analytics.contentTypeAnalysis[contentType].reach += post.performance?.totalReach || 0;
  });

  // Calculate averages
  if (posts.length > 0) {
    analytics.overview.averageEngagement = Math.round(analytics.overview.totalEngagement / posts.length);
    
    if (analytics.overview.totalReach > 0) {
      analytics.overview.engagementRate = ((analytics.overview.totalEngagement / analytics.overview.totalReach) * 100).toFixed(2);
    }
  }

  // Get top posts
  analytics.topPosts = posts
    .sort((a, b) => (b.performance?.totalEngagement || 0) - (a.performance?.totalEngagement || 0))
    .slice(0, 10)
    .map(post => ({
      id: post._id,
      content: post.content.text.substring(0, 100) + '...',
      engagement: post.performance?.totalEngagement || 0,
      reach: post.performance?.totalReach || 0,
      postedAt: post.postedAt || post.createdAt
    }));

  return analytics;
}

module.exports = router;
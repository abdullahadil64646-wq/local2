const cron = require('node-cron');
const PostingQueue = require('../models/PostingQueue');
const User = require('../models/User');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const EcommerceStore = require('../models/EcommerceStore');
const socialMediaService = require('./socialMediaService');
const openaiService = require('./openaiService');
const emailService = require('./emailService');
const smsService = require('./smsService');
const cloudinaryService = require('./cloudinaryService');

// Track automation status
let automationStatus = {
  isRunning: false,
  lastRun: null,
  totalProcessed: 0,
  successCount: 0,
  failureCount: 0,
  errors: []
};

// Initialize automation service
const initializeAutomation = () => {
  console.log('🤖 SaaS Local Automation Service Starting...');
  
  // Schedule post processing every minute
  cron.schedule('* * * * *', async () => {
    if (!automationStatus.isRunning) {
      await processScheduledPosts();
    }
  });

  // Generate daily automated content at 9 AM Pakistan time
  cron.schedule('0 9 * * *', async () => {
    console.log('🌅 Daily content generation started...');
    await generateDailyContent();
  }, {
    timezone: "Asia/Karachi"
  });

  // Weekly analytics report every Sunday at 10 AM
  cron.schedule('0 10 * * 0', async () => {
    console.log('📊 Weekly analytics report generation...');
    await generateWeeklyReports();
  }, {
    timezone: "Asia/Karachi"
  });

  // Monthly subscription processing on 1st of every month
  cron.schedule('0 0 1 * *', async () => {
    console.log('💳 Monthly subscription processing...');
    await processMonthlySubscriptions();
  }, {
    timezone: "Asia/Karachi"
  });

  // Daily cleanup of old data at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Daily cleanup started...');
    await performDailyCleanup();
  }, {
    timezone: "Asia/Karachi"
  });

  console.log('✅ SaaS Local Automation Service Initialized Successfully!');
};

// Process scheduled posts
const processScheduledPosts = async () => {
  try {
    automationStatus.isRunning = true;
    automationStatus.lastRun = new Date();

    const now = new Date();
    
    // Find posts that are due for posting
    const duePosts = await PostingQueue.find({
      status: 'pending',
      'schedule.scheduledFor': { $lte: now }
    }).populate('user');

    console.log(`📱 Processing ${duePosts.length} scheduled posts...`);

    for (const post of duePosts) {
      try {
        await processPost(post);
        automationStatus.successCount++;
      } catch (error) {
        console.error(`❌ Error processing post ${post._id}:`, error);
        automationStatus.failureCount++;
        automationStatus.errors.push({
          postId: post._id,
          error: error.message,
          timestamp: new Date()
        });
        
        // Update post status to failed
        post.status = 'failed';
        post.errors.push({
          message: error.message,
          timestamp: new Date(),
          retryCount: post.retries.count
        });
        await post.save();
      }
      
      automationStatus.totalProcessed++;
    }

  } catch (error) {
    console.error('❌ Error in processScheduledPosts:', error);
  } finally {
    automationStatus.isRunning = false;
  }
};

// Process individual post
const processPost = async (post) => {
  try {
    console.log(`📤 Processing post ${post._id} for user ${post.user.name}`);
    
    // Update status to processing
    post.status = 'processing';
    await post.save();

    // Get user's social media connections
    const user = await User.findById(post.user._id);
    const postResults = {};

    // Post to Facebook
    if (post.platforms.facebook.enabled && user.socialMedia.facebook.connected) {
      try {
        const facebookResult = await socialMediaService.facebook.createPost(
          user.socialMedia.facebook,
          {
            message: post.content.text,
            media: post.content.media
          }
        );

        if (facebookResult.success) {
          post.platforms.facebook.posted = true;
          post.platforms.facebook.postId = facebookResult.postId;
          post.platforms.facebook.postedAt = new Date();
          postResults.facebook = { success: true, postId: facebookResult.postId };
          
          console.log(`✅ Facebook post successful: ${facebookResult.postId}`);
        } else {
          throw new Error(facebookResult.error);
        }
      } catch (error) {
        console.error(`❌ Facebook posting failed:`, error);
        post.platforms.facebook.error = error.message;
        postResults.facebook = { success: false, error: error.message };
      }
    }

    // Post to Instagram
    if (post.platforms.instagram.enabled && user.socialMedia.instagram.connected) {
      try {
        const instagramResult = await socialMediaService.instagram.createPost(
          user.socialMedia.instagram,
          {
            caption: post.content.text,
            media: post.content.media
          }
        );

        if (instagramResult.success) {
          post.platforms.instagram.posted = true;
          post.platforms.instagram.postId = instagramResult.postId;
          post.platforms.instagram.postedAt = new Date();
          postResults.instagram = { success: true, postId: instagramResult.postId };
          
          console.log(`✅ Instagram post successful: ${instagramResult.postId}`);
        } else {
          throw new Error(instagramResult.error);
        }
      } catch (error) {
        console.error(`❌ Instagram posting failed:`, error);
        post.platforms.instagram.error = error.message;
        postResults.instagram = { success: false, error: error.message };
      }
    }

    // Post to Twitter
    if (post.platforms.twitter.enabled && user.socialMedia.twitter.connected) {
      try {
        const twitterResult = await socialMediaService.twitter.createPost(
          user.socialMedia.twitter,
          {
            text: post.content.text,
            media: post.content.media
          }
        );

        if (twitterResult.success) {
          post.platforms.twitter.posted = true;
          post.platforms.twitter.postId = twitterResult.postId;
          post.platforms.twitter.postedAt = new Date();
          postResults.twitter = { success: true, postId: twitterResult.postId };
          
          console.log(`✅ Twitter post successful: ${twitterResult.postId}`);
        } else {
          throw new Error(twitterResult.error);
        }
      } catch (error) {
        console.error(`❌ Twitter posting failed:`, error);
        post.platforms.twitter.error = error.message;
        postResults.twitter = { success: false, error: error.message };
      }
    }

    // Check if at least one platform was successful
    const hasSuccess = Object.values(postResults).some(result => result.success);

    if (hasSuccess) {
      post.status = 'posted';
      post.postedAt = new Date();
      
      // Update user's total posts count
      user.totalPosts = (user.totalPosts || 0) + 1;
      await user.save();
      
      console.log(`✅ Post ${post._id} successfully processed`);
      
      // Send success notification
      try {
        await emailService.sendPostConfirmation(user, post, postResults);
      } catch (notificationError) {
        console.error('📧 Email notification failed:', notificationError);
      }
      
    } else {
      // All platforms failed
      post.status = 'failed';
      post.retries.count += 1;
      
      // Schedule retry if under limit
      if (post.retries.count < post.retries.maxRetries) {
        const retryDelay = Math.min(post.retries.count * 5, 30); // 5, 10, 15... max 30 minutes
        post.schedule.scheduledFor = new Date(Date.now() + retryDelay * 60 * 1000);
        post.status = 'pending';
        console.log(`🔄 Scheduling retry ${post.retries.count} for post ${post._id} in ${retryDelay} minutes`);
      } else {
        console.log(`❌ Post ${post._id} permanently failed after ${post.retries.count} attempts`);
      }
    }

    await post.save();
    return postResults;

  } catch (error) {
    console.error(`❌ Error in processPost:`, error);
    post.status = 'failed';
    post.errors.push({
      message: error.message,
      timestamp: new Date(),
      retryCount: post.retries.count
    });
    await post.save();
    throw error;
  }
};

// Generate daily automated content for active users
const generateDailyContent = async () => {
  try {
    console.log('🎯 Starting daily content generation...');
    
    // Find users with active subscriptions who have auto-content enabled
    const activeUsers = await User.find({
      'preferences.autoContentGeneration': true,
      isActive: true
    }).populate('subscription');

    console.log(`👥 Found ${activeUsers.length} users for daily content generation`);

    for (const user of activeUsers) {
      try {
        // Check if user has remaining posts in their plan
        const subscription = await EnhancedSubscription.findOne({ user: user._id });
        
        if (!subscription || !subscription.canGeneratePost()) {
          console.log(`⏭️ Skipping user ${user.name} - no remaining posts`);
          continue;
        }

        // Check if user hasn't posted today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayPosts = await PostingQueue.countDocuments({
          user: user._id,
          createdAt: { $gte: today }
        });

        if (todayPosts > 0) {
          console.log(`⏭️ User ${user.name} already posted today`);
          continue;
        }

        // Generate content
        await generateAutomatedContentForUser(user, subscription);
        
      } catch (userError) {
        console.error(`❌ Error generating content for user ${user.name}:`, userError);
      }
    }

    console.log('✅ Daily content generation completed');

  } catch (error) {
    console.error('❌ Error in generateDailyContent:', error);
  }
};

// Generate automated content for a specific user
const generateAutomatedContentForUser = async (user, subscription) => {
  try {
    console.log(`🤖 Generating automated content for ${user.name} (${user.businessType})`);
    
    // Determine content type based on day of week and business type
    const contentTypes = ['promotional', 'educational', 'behind_scenes', 'product_showcase'];
    const dayOfWeek = new Date().getDay();
    const contentType = contentTypes[dayOfWeek % contentTypes.length];

    // Generate AI content
    const contentResult = await openaiService.generatePostContent(
      user.toObject(),
      contentType,
      `Create engaging daily content for our ${user.businessType} business. Make it relevant and interesting for our Pakistani customers.`
    );

    if (!contentResult.success) {
      console.log(`⚠️ AI generation failed for ${user.name}, using fallback`);
      const fallbackContent = contentResult.fallbackContent;
      contentResult.content = fallbackContent.content;
      contentResult.hashtags = fallbackContent.hashtags;
    }

    // Generate accompanying image
    let imageResult = null;
    try {
      imageResult = await cloudinaryService.generateAIImage(
        user.businessType || 'services',
        contentType
      );
    } catch (imageError) {
      console.log(`⚠️ Image generation failed for ${user.name}:`, imageError.message);
    }

    // Determine posting platforms based on subscription
    const platforms = {
      facebook: user.socialMedia.facebook.connected,
      instagram: user.socialMedia.instagram.connected && subscription.features.socialPlatforms >= 2,
      twitter: user.socialMedia.twitter.connected && subscription.features.socialPlatforms >= 3
    };

    // Schedule for optimal posting time (different for each business type)
    const postingTimes = {
      restaurant: { hour: 11, minute: 30 }, // Before lunch
      retail: { hour: 14, minute: 0 },      // Afternoon shopping
      salon: { hour: 10, minute: 0 },       // Morning beauty
      cafe: { hour: 16, minute: 0 },        // Tea time
      gym: { hour: 6, minute: 30 },         // Morning workout
      default: { hour: 12, minute: 0 }      // Noon default
    };

    const optimalTime = postingTimes[user.businessType] || postingTimes.default;
    const scheduledFor = new Date();
    scheduledFor.setHours(optimalTime.hour, optimalTime.minute, 0, 0);

    // If time has passed for today, schedule for tomorrow
    if (scheduledFor <= new Date()) {
      scheduledFor.setDate(scheduledFor.getDate() + 1);
    }

    // Create automated post
    const automatedPost = new PostingQueue({
      user: user._id,
      content: {
        text: contentResult.content,
        hashtags: contentResult.hashtags || [],
        media: imageResult?.success ? [{
          type: 'image',
          url: imageResult.url,
          caption: contentResult.content.substring(0, 50) + '...'
        }] : [],
        aiGenerated: true,
        contentType: contentType
      },
      schedule: {
        scheduledFor: scheduledFor,
        timezone: 'Asia/Karachi'
      },
      platforms: platforms,
      businessContext: {
        businessType: user.businessType,
        businessGoals: ['engagement', 'brand_awareness'],
        automated: true,
        storeUrl: user.store?.storeUrl
      },
      isAutomated: true
    });

    await automatedPost.save();

    // Increment usage
    await subscription.incrementUsage('post');

    console.log(`✅ Automated content scheduled for ${user.name} at ${scheduledFor.toLocaleString()}`);

    // Send notification about scheduled content
    try {
      await emailService.sendAutomatedContentNotification(user, automatedPost);
    } catch (notificationError) {
      console.error('📧 Automated content notification failed:', notificationError);
    }

  } catch (error) {
    console.error(`❌ Error generating automated content for ${user.name}:`, error);
    throw error;
  }
};

// Generate weekly analytics reports
const generateWeeklyReports = async () => {
  try {
    console.log('📊 Generating weekly analytics reports...');
    
    const activeUsers = await User.find({ isActive: true });
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const user of activeUsers) {
      try {
        // Get user's posts from last week
        const weeklyPosts = await PostingQueue.find({
          user: user._id,
          createdAt: { $gte: weekAgo }
        });

        // Get store analytics if applicable
        const store = await EcommerceStore.findOne({ owner: user._id });
        let storeAnalytics = null;

        if (store) {
          const weeklyOrders = store.orders.filter(order => 
            new Date(order.createdAt) >= weekAgo
          );
          
          storeAnalytics = {
            totalOrders: weeklyOrders.length,
            revenue: weeklyOrders.reduce((sum, order) => sum + order.totals.total, 0),
            newCustomers: store.customers.filter(customer => 
              new Date(customer.joinedAt) >= weekAgo
            ).length
          };
        }

        // Calculate social media analytics
        const socialAnalytics = {
          totalPosts: weeklyPosts.length,
          publishedPosts: weeklyPosts.filter(p => p.status === 'posted').length,
          totalEngagement: weeklyPosts.reduce((sum, p) => sum + (p.performance.totalEngagement || 0), 0),
          totalReach: weeklyPosts.reduce((sum, p) => sum + (p.performance.totalReach || 0), 0)
        };

        // Send weekly report email
        await emailService.sendWeeklyReport(user, {
          social: socialAnalytics,
          store: storeAnalytics,
          period: { start: weekAgo, end: new Date() }
        });

        console.log(`📧 Weekly report sent to ${user.name}`);

      } catch (userError) {
        console.error(`❌ Error generating report for ${user.name}:`, userError);
      }
    }

    console.log('✅ Weekly reports generation completed');

  } catch (error) {
    console.error('❌ Error in generateWeeklyReports:', error);
  }
};

// Process monthly subscriptions
const processMonthlySubscriptions = async () => {
  try {
    console.log('💳 Processing monthly subscriptions...');
    
    const subscriptions = await EnhancedSubscription.find({
      'billing.status': 'active',
      'billing.nextBillingDate': { $lte: new Date() }
    }).populate('user');

    for (const subscription of subscriptions) {
      try {
        // Reset monthly usage
        subscription.usage.currentMonth = {
          postsGenerated: 0,
          videosGenerated: 0,
          imagesGenerated: 0,
          storeViews: 0,
          storageUsed: 0
        };

        // Update next billing date
        const nextBilling = new Date(subscription.billing.nextBillingDate);
        nextBilling.setMonth(nextBilling.getMonth() + 1);
        subscription.billing.nextBillingDate = nextBilling;

        // Update analytics
        subscription.analytics.activeDays += 30;
        subscription.analytics.totalRevenue += subscription.billing.currentPlan.price;

        await subscription.save();

        // Send renewal confirmation
        await emailService.sendSubscriptionRenewalConfirmation(subscription.user, subscription);

        console.log(`✅ Subscription renewed for ${subscription.user.name}`);

      } catch (subscriptionError) {
        console.error(`❌ Error processing subscription for ${subscription.user.name}:`, subscriptionError);
      }
    }

    console.log('✅ Monthly subscription processing completed');

  } catch (error) {
    console.error('❌ Error in processMonthlySubscriptions:', error);
  }
};

// Perform daily cleanup
const performDailyCleanup = async () => {
  try {
    console.log('🧹 Starting daily cleanup...');
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Clean up old failed posts (older than 7 days)
    const deletedPosts = await PostingQueue.deleteMany({
      status: 'failed',
      createdAt: { $lt: sevenDaysAgo }
    });

    // Clean up old automation errors
    automationStatus.errors = automationStatus.errors.filter(
      error => error.timestamp > sevenDaysAgo
    );

    // Clean up old temporary files (this would integrate with file storage)
    // Implementation depends on your file storage solution

    console.log(`🗑️ Cleaned up ${deletedPosts.deletedCount} old failed posts`);
    console.log('✅ Daily cleanup completed');

  } catch (error) {
    console.error('❌ Error in performDailyCleanup:', error);
  }
};

// Manual trigger for post processing (for admin use)
const triggerPostProcessing = async () => {
  if (!automationStatus.isRunning) {
    console.log('🔄 Manually triggering post processing...');
    await processScheduledPosts();
    return { success: true, message: 'Post processing triggered successfully' };
  } else {
    return { success: false, message: 'Post processing is already running' };
  }
};

// Get automation status
const getAutomationStatus = () => {
  return {
    ...automationStatus,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cronJobs: {
      postProcessing: '* * * * *',
      dailyContent: '0 9 * * *',
      weeklyReports: '0 10 * * 0',
      monthlyBilling: '0 0 1 * *',
      dailyCleanup: '0 0 * * *'
    }
  };
};

// Stop all automation (for maintenance)
const stopAutomation = () => {
  console.log('⏹️ Stopping automation service...');
  // Note: node-cron doesn't provide a direct way to stop all tasks
  // In production, you might want to track task references
  return { success: true, message: 'Automation stop requested' };
};

// Retry failed posts manually
const retryFailedPosts = async (userId = null) => {
  try {
    const filter = { status: 'failed' };
    if (userId) {
      filter.user = userId;
    }

    const failedPosts = await PostingQueue.find(filter).populate('user');
    
    console.log(`🔄 Retrying ${failedPosts.length} failed posts...`);
    
    let successCount = 0;
    let failCount = 0;

    for (const post of failedPosts) {
      try {
        // Reset retry count and schedule immediately
        post.retries.count = 0;
        post.status = 'pending';
        post.schedule.scheduledFor = new Date();
        await post.save();
        
        // Process the post
        await processPost(post);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Retry failed for post ${post._id}:`, error);
        failCount++;
      }
    }

    return {
      success: true,
      total: failedPosts.length,
      successful: successCount,
      failed: failCount
    };

  } catch (error) {
    console.error('❌ Error in retryFailedPosts:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeAutomation,
  processScheduledPosts,
  processPost,
  generateDailyContent,
  generateAutomatedContentForUser,
  generateWeeklyReports,
  processMonthlySubscriptions,
  performDailyCleanup,
  triggerPostProcessing,
  getAutomationStatus,
  stopAutomation,
  retryFailedPosts
};
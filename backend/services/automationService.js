const User = require('../models/User');
const PostingQueue = require('../models/PostingQueue');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const openaiService = require('./openaiService');
const socialMediaService = require('./socialMediaService');
const emailService = require('./emailService');
const cloudinaryService = require('./cloudinaryService');

// Run daily automation tasks
const runDailyAutomation = async () => {
  try {
    console.log('Starting daily automation tasks...');
    
    // 1. Process pending posts in queue
    await processPostingQueue();
    
    // 2. Generate new posts for eligible users
    await generateScheduledPosts();
    
    // 3. Check subscription renewals
    await checkSubscriptionRenewals();
    
    console.log('Daily automation tasks completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Daily automation error:', error);
    return { success: false, error: error.message };
  }
};

// Process posting queue
const processPostingQueue = async () => {
  try {
    const now = new Date();
    
    // Find posts that are scheduled to be posted now or in the past
    const pendingPosts = await PostingQueue.find({
      status: 'pending',
      'schedule.scheduledFor': { $lte: now }
    }).populate('user');
    
    console.log(`Found ${pendingPosts.length} pending posts to process`);
    
    // Process each post
    for (const post of pendingPosts) {
      await processPost(post);
    }
    
    return { success: true, processed: pendingPosts.length };
  } catch (error) {
    console.error('Posting queue processing error:', error);
    throw error;
  }
};

// Process a single post
const processPost = async (post) => {
  try {
    // Update status to processing
    post.status = 'processing';
    await post.save();
    
    // Get user's social media connections
    const userSocialMedia = post.user.socialMedia;
    
    // Post to enabled platforms
    const enabledPlatforms = [];
    if (post.platforms.facebook.enabled) enabledPlatforms.push('facebook');
    if (post.platforms.instagram.enabled) enabledPlatforms.push('instagram');
    if (post.platforms.twitter.enabled) enabledPlatforms.push('twitter');
    
    if (enabledPlatforms.length === 0) {
      post.status = 'failed';
      post.errors.push({
        platform: 'all',
        error: 'No platforms enabled for posting',
        timestamp: new Date()
      });
      await post.save();
      return;
    }
    
    // Get media URLs for posting
    const mediaUrls = post.content.media.map(m => m.url);
    
    // Post to all enabled platforms
    const postResult = await socialMediaService.postToAllPlatforms(
      userSocialMedia,
      post.content.text,
      mediaUrls
    );
    
    // Update post with results
    if (postResult.success) {
      post.status = 'posted';
      
      // Update platform-specific results
      if (postResult.results.facebook?.success) {
        post.platforms.facebook.posted = true;
        post.platforms.facebook.postedAt = new Date();
        post.platforms.facebook.postId = postResult.results.facebook.postId;
      } else if (postResult.results.facebook?.error) {
        post.errors.push({
          platform: 'facebook',
          error: postResult.results.facebook.error,
          timestamp: new Date()
        });
      }
      
      if (postResult.results.instagram?.success) {
        post.platforms.instagram.posted = true;
        post.platforms.instagram.postedAt = new Date();
        post.platforms.instagram.postId = postResult.results.instagram.postId;
      } else if (postResult.results.instagram?.error) {
        post.errors.push({
          platform: 'instagram',
          error: postResult.results.instagram.error,
          timestamp: new Date()
        });
      }
      
      if (postResult.results.twitter?.success) {
        post.platforms.twitter.posted = true;
        post.platforms.twitter.postedAt = new Date();
        post.platforms.twitter.postId = postResult.results.twitter.postId;
      } else if (postResult.results.twitter?.error) {
        post.errors.push({
          platform: 'twitter',
          error: postResult.results.twitter.error,
          timestamp: new Date()
        });
      }
      
      // Increment user's post count
      await User.findByIdAndUpdate(post.user._id, {
        $inc: { totalPosts: 1 }
      });
      
      // Increment subscription usage
      const subscription = await EnhancedSubscription.findOne({ user: post.user._id });
      if (subscription) {
        await subscription.incrementUsage('published');
      }
      
      // Send notification email
      await emailService.sendEmail({
        to: post.user.email,
        subject: 'Your Social Media Post Has Been Published!',
        template: 'post-published',
        data: {
          name: post.user.name,
          platforms: postResult.postedTo.join(', '),
          postUrl: postResult.results[postResult.postedTo[0]]?.url || '#'
        }
      });
      
    } else {
      post.status = 'failed';
      post.errors.push({
        platform: 'all',
        error: postResult.error,
        timestamp: new Date()
      });
      
      // Increment retry count and schedule next retry
      post.retries.count += 1;
      post.retries.lastRetry = new Date();
      
      if (post.retries.count < post.retries.maxRetries) {
        post.retries.nextRetry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours later
        post.status = 'pending';
      }
    }
    
    await post.save();
    return { success: postResult.success };
    
  } catch (error) {
    console.error('Post processing error:', error);
    post.status = 'failed';
    post.errors.push({
      platform: 'all',
      error: error.message,
      timestamp: new Date()
    });
    await post.save();
    return { success: false, error: error.message };
  }
};

// Generate scheduled posts for eligible users
const generateScheduledPosts = async () => {
  try {
    // Find active subscriptions with available post credits
    const subscriptions = await EnhancedSubscription.find({
      'billing.status': 'active',
      $expr: {
        $lt: ['$usage.currentMonth.postsGenerated', '$features.monthlyPosts']
      }
    }).populate('user');
    
    console.log(`Found ${subscriptions.length} eligible users for post generation`);
    
    // Generate posts for each user
    const results = [];
    for (const subscription of subscriptions) {
      // Check if user can generate more posts
      if (!subscription.canGeneratePost()) continue;
      
      // Generate content
      const contentTypes = ['promotional', 'educational', 'behind_scenes', 'product_showcase', 'customer_story'];
      const randomType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      
      const content = await openaiService.generatePostContent(
        subscription.user,
        randomType
      );
      
      if (!content.success) {
        console.error(`Failed to generate content for user ${subscription.user._id}`);
        continue;
      }
      
      // Generate image using AI
      const mediaUrls = [];
      try {
        const image = await cloudinaryService.generateAIImage(
          subscription.user.businessType,
          randomType
        );
        
        if (image.success) {
          mediaUrls.push({
            type: 'image',
            url: image.url,
            publicId: image.publicId,
            caption: content.content.substring(0, 30) + '...'
          });
        }
      } catch (error) {
        console.error('Image generation error:', error);
      }
      
      // Create posting queue entry
      const now = new Date();
      const scheduledFor = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      
      // Determine which platforms to post to based on subscription
      const platformCount = subscription.features.socialPlatforms;
      const platformsEnabled = {
        facebook: platformCount >= 1,
        instagram: platformCount >= 2,
        twitter: platformCount >= 3
      };
      
      const post = new PostingQueue({
        user: subscription.user._id,
        content: {
          text: content.content,
          hashtags: content.hashtags || [],
          aiGenerated: true,
          aiPrompt: `Generate ${randomType} post for ${subscription.user.businessType} business`,
          contentType: randomType,
          media: mediaUrls
        },
        schedule: {
          scheduledFor: scheduledFor,
          timezone: 'Asia/Karachi'
        },
        platforms: {
          facebook: {
            enabled: platformsEnabled.facebook && subscription.user.socialMedia.facebook.connected,
            pageId: subscription.user.socialMedia.facebook.pageId
          },
          instagram: {
            enabled: platformsEnabled.instagram && subscription.user.socialMedia.instagram.connected,
            accountId: subscription.user.socialMedia.instagram.accountId
          },
          twitter: {
            enabled: platformsEnabled.twitter && subscription.user.socialMedia.twitter.connected
          }
        },
        businessContext: {
          businessType: subscription.user.businessType,
          businessGoals: ['engagement', 'sales'],
          storeUrl: subscription.user.store?.storeUrl
        }
      });
      
      await post.save();
      
      // Increment usage
      await subscription.incrementUsage('post');
      
      results.push({
        userId: subscription.user._id,
        postId: post._id,
        scheduledFor: scheduledFor
      });
    }
    
    return { success: true, generated: results.length, results };
  } catch (error) {
    console.error('Post generation error:', error);
    throw error;
  }
};

// Check subscription renewals
const checkSubscriptionRenewals = async () => {
  try {
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    
    // Find subscriptions that need renewal in the next 3 days
    const subscriptions = await EnhancedSubscription.find({
      'billing.status': 'active',
      'billing.nextBillingDate': { $lte: threeDaysFromNow },
      'autoRenewal.reminderSent': false
    }).populate('user');
    
    console.log(`Found ${subscriptions.length} subscriptions for renewal reminders`);
    
    // Send renewal reminders
    for (const subscription of subscriptions) {
      await emailService.sendEmail({
        to: subscription.user.email,
        subject: `Your Subscription Renewal - SaaS Local Stores`,
        template: 'subscription-renewal',
        data: {
          name: subscription.user.name,
          plan: subscription.plan,
          renewalDate: subscription.billing.nextBillingDate.toLocaleDateString(),
          amount: subscription.billing.nextBillingAmount
        }
      });
      
      // Mark reminder as sent
      subscription.autoRenewal.reminderSent = true;
      subscription.autoRenewal.reminderDate = new Date();
      await subscription.save();
    }
    
    return { success: true, reminded: subscriptions.length };
  } catch (error) {
    console.error('Subscription renewal check error:', error);
    throw error;
  }
};

// Monthly reset for all users (run on the 1st of each month)
const monthlyReset = async () => {
  try {
    // Reset monthly usage for all subscriptions
    const result = await EnhancedSubscription.updateMany(
      { 'billing.status': 'active' },
      {
        $set: {
          'usage.lastMonth': '$usage.currentMonth',
          'usage.currentMonth.postsGenerated': 0,
          'usage.currentMonth.videosGenerated': 0,
          'usage.currentMonth.postsPublished': 0,
          'autoRenewal.reminderSent': false
        }
      }
    );
    
    console.log(`Reset monthly usage for ${result.modifiedCount} subscriptions`);
    
    return { success: true, reset: result.modifiedCount };
  } catch (error) {
    console.error('Monthly reset error:', error);
    throw error;
  }
};

module.exports = {
  runDailyAutomation,
  processPostingQueue,
  generateScheduledPosts,
  checkSubscriptionRenewals,
  monthlyReset
};
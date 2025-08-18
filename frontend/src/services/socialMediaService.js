const axios = require('axios');
const FormData = require('form-data');

// Facebook Graph API Service
const facebook = {
  // Create a Facebook post
  createPost: async (facebookConfig, postData) => {
    try {
      const { pageId, accessToken } = facebookConfig;
      const { message, media = [] } = postData;

      let postUrl = `https://graph.facebook.com/v18.0/${pageId}/feed`;
      let postParams = {
        message: message,
        access_token: accessToken
      };

      // Handle media uploads
      if (media.length > 0) {
        const mediaItem = media[0]; // Facebook allows one image per post via feed endpoint
        
        if (mediaItem.type === 'image') {
          // Upload photo and post
          postUrl = `https://graph.facebook.com/v18.0/${pageId}/photos`;
          postParams = {
            message: message,
            url: mediaItem.url,
            access_token: accessToken
          };
        }
      }

      const response = await axios.post(postUrl, postParams);

      return {
        success: true,
        postId: response.data.id,
        platform: 'facebook',
        postedAt: new Date(),
        postUrl: `https://facebook.com/${response.data.id}`
      };

    } catch (error) {
      console.error('Facebook posting error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        platform: 'facebook'
      };
    }
  },

  // Get Facebook page information
  getPageInfo: async (pageId, accessToken) => {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
        params: {
          fields: 'id,name,category,followers_count,fan_count',
          access_token: accessToken
        }
      });

      return {
        success: true,
        pageInfo: {
          id: response.data.id,
          name: response.data.name,
          category: response.data.category,
          followers: response.data.followers_count || response.data.fan_count || 0
        }
      };

    } catch (error) {
      console.error('Facebook page info error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  },

  // Get post analytics
  getPostAnalytics: async (facebookConfig, postId) => {
    try {
      const { accessToken } = facebookConfig;
      
      const response = await axios.get(`https://graph.facebook.com/v18.0/${postId}`, {
        params: {
          fields: 'likes.summary(true),comments.summary(true),shares,reactions.summary(true)',
          access_token: accessToken
        }
      });

      const likes = response.data.likes?.summary?.total_count || 0;
      const comments = response.data.comments?.summary?.total_count || 0;
      const shares = response.data.shares?.count || 0;
      const reactions = response.data.reactions?.summary?.total_count || likes;

      return {
        success: true,
        analytics: {
          likes: likes,
          comments: comments,
          shares: shares,
          reactions: reactions,
          engagement: likes + comments + shares,
          reach: Math.round((likes + comments + shares) * 15) // Estimated reach
        }
      };

    } catch (error) {
      console.error('Facebook analytics error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  },

  // Verify Facebook connection
  verifyConnection: async (facebookConfig) => {
    try {
      const { pageId, accessToken } = facebookConfig;
      
      const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
        params: {
          fields: 'id,name',
          access_token: accessToken
        }
      });

      return {
        success: true,
        connected: true,
        pageInfo: {
          id: response.data.id,
          name: response.data.name
        }
      };

    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
};

// Instagram Basic Display API Service
const instagram = {
  // Create Instagram post
  createPost: async (instagramConfig, postData) => {
    try {
      const { accountId, accessToken } = instagramConfig;
      const { caption, media = [] } = postData;

      if (media.length === 0) {
        throw new Error('Instagram posts require at least one image or video');
      }

      const mediaItem = media[0];
      
      // Step 1: Create media object
      let mediaObjectParams = {
        access_token: accessToken
      };

      if (mediaItem.type === 'image') {
        mediaObjectParams.image_url = mediaItem.url;
        mediaObjectParams.caption = caption;
      } else if (mediaItem.type === 'video') {
        mediaObjectParams.video_url = mediaItem.url;
        mediaObjectParams.caption = caption;
        mediaObjectParams.media_type = 'VIDEO';
      }

      const mediaResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${accountId}/media`,
        mediaObjectParams
      );

      const mediaId = mediaResponse.data.id;

      // Step 2: Publish the media
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${accountId}/media_publish`,
        {
          creation_id: mediaId,
          access_token: accessToken
        }
      );

      return {
        success: true,
        postId: publishResponse.data.id,
        platform: 'instagram',
        postedAt: new Date(),
        postUrl: `https://instagram.com/p/${publishResponse.data.id}`
      };

    } catch (error) {
      console.error('Instagram posting error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        platform: 'instagram'
      };
    }
  },

  // Get Instagram account info
  getAccountInfo: async (accountId, accessToken) => {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${accountId}`, {
        params: {
          fields: 'id,username,account_type,media_count,followers_count',
          access_token: accessToken
        }
      });

      return {
        success: true,
        accountInfo: {
          id: response.data.id,
          username: response.data.username,
          accountType: response.data.account_type,
          mediaCount: response.data.media_count || 0,
          followers: response.data.followers_count || 0
        }
      };

    } catch (error) {
      console.error('Instagram account info error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  },

  // Get Instagram post analytics
  getPostAnalytics: async (instagramConfig, postId) => {
    try {
      const { accessToken } = instagramConfig;
      
      const response = await axios.get(`https://graph.facebook.com/v18.0/${postId}`, {
        params: {
          fields: 'like_count,comments_count,media_type,media_url,permalink',
          access_token: accessToken
        }
      });

      const likes = response.data.like_count || 0;
      const comments = response.data.comments_count || 0;

      return {
        success: true,
        analytics: {
          likes: likes,
          comments: comments,
          engagement: likes + comments,
          reach: Math.round((likes + comments) * 20), // Estimated reach
          mediaType: response.data.media_type,
          permalink: response.data.permalink
        }
      };

    } catch (error) {
      console.error('Instagram analytics error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  },

  // Verify Instagram connection
  verifyConnection: async (instagramConfig) => {
    try {
      const { accountId, accessToken } = instagramConfig;
      
      const response = await axios.get(`https://graph.facebook.com/v18.0/${accountId}`, {
        params: {
          fields: 'id,username',
          access_token: accessToken
        }
      });

      return {
        success: true,
        connected: true,
        accountInfo: {
          id: response.data.id,
          username: response.data.username
        }
      };

    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
};

// Twitter API v2 Service
const twitter = {
  // Create Twitter post (tweet)
  createPost: async (twitterConfig, postData) => {
    try {
      const { accessToken, accessSecret } = twitterConfig;
      const { text, media = [] } = postData;

      // Note: This is a simplified implementation
      // In production, you would use Twitter API v2 with proper OAuth 2.0
      const tweetData = {
        text: text.substring(0, 280) // Twitter character limit
      };

      // For media uploads, you would need to implement Twitter's media upload endpoint
      if (media.length > 0) {
        // Simplified - in reality, you'd upload media first, then reference it
        console.log('Twitter media upload would be implemented here');
      }

      // This is a mock response - implement actual Twitter API call
      const mockResponse = {
        data: {
          id: `twitter_${Date.now()}`,
          text: tweetData.text
        }
      };

      return {
        success: true,
        postId: mockResponse.data.id,
        platform: 'twitter',
        postedAt: new Date(),
        postUrl: `https://twitter.com/user/status/${mockResponse.data.id}`
      };

    } catch (error) {
      console.error('Twitter posting error:', error.message);
      return {
        success: false,
        error: error.message,
        platform: 'twitter'
      };
    }
  },

  // Get Twitter user info
  getUserInfo: async (username, accessToken) => {
    try {
      // Mock implementation - replace with actual Twitter API v2 call
      return {
        success: true,
        userInfo: {
          id: `user_${username}`,
          username: username,
          followers: Math.floor(Math.random() * 1000),
          following: Math.floor(Math.random() * 500)
        }
      };

    } catch (error) {
      console.error('Twitter user info error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get Twitter post analytics
  getPostAnalytics: async (twitterConfig, postId) => {
    try {
      // Mock implementation - replace with actual Twitter API v2 call
      const mockAnalytics = {
        likes: Math.floor(Math.random() * 50),
        retweets: Math.floor(Math.random() * 20),
        replies: Math.floor(Math.random() * 10),
        impressions: Math.floor(Math.random() * 1000)
      };

      return {
        success: true,
        analytics: {
          likes: mockAnalytics.likes,
          retweets: mockAnalytics.retweets,
          replies: mockAnalytics.replies,
          impressions: mockAnalytics.impressions,
          engagement: mockAnalytics.likes + mockAnalytics.retweets + mockAnalytics.replies
        }
      };

    } catch (error) {
      console.error('Twitter analytics error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Verify Twitter connection
  verifyConnection: async (twitterConfig) => {
    try {
      const { username } = twitterConfig;
      
      // Mock verification - replace with actual Twitter API call
      return {
        success: true,
        connected: true,
        userInfo: {
          username: username
        }
      };

    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.message
      };
    }
  }
};

// Combined service functions
const socialMediaService = {
  facebook,
  instagram,
  twitter,

  // Post to multiple platforms
  postToMultiplePlatforms: async (userSocialMedia, postData) => {
    const results = {};

    // Post to Facebook
    if (userSocialMedia.facebook.connected && postData.platforms.facebook) {
      results.facebook = await facebook.createPost(userSocialMedia.facebook, postData);
    }

    // Post to Instagram
    if (userSocialMedia.instagram.connected && postData.platforms.instagram) {
      results.instagram = await instagram.createPost(userSocialMedia.instagram, postData);
    }

    // Post to Twitter
    if (userSocialMedia.twitter.connected && postData.platforms.twitter) {
      results.twitter = await twitter.createPost(userSocialMedia.twitter, postData);
    }

    return results;
  },

  // Verify all platform connections
  verifyConnections: async (userSocialMedia) => {
    const results = {};

    try {
      // Check Facebook connection
      if (userSocialMedia.facebook?.connected) {
        results.facebook = await facebook.verifyConnection(userSocialMedia.facebook);
      }

      // Check Instagram connection
      if (userSocialMedia.instagram?.connected) {
        results.instagram = await instagram.verifyConnection(userSocialMedia.instagram);
      }

      // Check Twitter connection
      if (userSocialMedia.twitter?.connected) {
        results.twitter = await twitter.verifyConnection(userSocialMedia.twitter);
      }

      return {
        success: true,
        status: results
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: results
      };
    }
  },

  // Get analytics from all platforms
  getAllPlatformAnalytics: async (userSocialMedia, postIds) => {
    const results = {};

    try {
      // Get Facebook analytics
      if (postIds.facebook && userSocialMedia.facebook?.connected) {
        results.facebook = await facebook.getPostAnalytics(userSocialMedia.facebook, postIds.facebook);
      }

      // Get Instagram analytics
      if (postIds.instagram && userSocialMedia.instagram?.connected) {
        results.instagram = await instagram.getPostAnalytics(userSocialMedia.instagram, postIds.instagram);
      }

      // Get Twitter analytics
      if (postIds.twitter && userSocialMedia.twitter?.connected) {
        results.twitter = await twitter.getPostAnalytics(userSocialMedia.twitter, postIds.twitter);
      }

      return {
        success: true,
        analytics: results
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        analytics: results
      };
    }
  },

  // Get optimal posting times for Pakistani businesses
  getOptimalPostingTimes: (businessType, timezone = 'Asia/Karachi') => {
    const postingTimes = {
      restaurant: [
        { day: 'monday', time: '11:30', description: 'Pre-lunch promotion' },
        { day: 'tuesday', time: '16:00', description: 'Tea time special' },
        { day: 'wednesday', time: '19:30', description: 'Dinner time' },
        { day: 'thursday', time: '12:00', description: 'Lunch deals' },
        { day: 'friday', time: '13:30', description: 'After Friday prayers' },
        { day: 'saturday', time: '18:00', description: 'Weekend dinner' },
        { day: 'sunday', time: '14:00', description: 'Family time' }
      ],
      retail: [
        { day: 'monday', time: '10:00', description: 'Week start shopping' },
        { day: 'tuesday', time: '15:00', description: 'Afternoon browsing' },
        { day: 'wednesday', time: '11:00', description: 'Mid-week deals' },
        { day: 'thursday', time: '16:30', description: 'Pre-weekend shopping' },
        { day: 'friday', time: '14:00', description: 'Post-prayer shopping' },
        { day: 'saturday', time: '11:00', description: 'Weekend shopping' },
        { day: 'sunday', time: '15:00', description: 'Family shopping' }
      ],
      salon: [
        { day: 'monday', time: '10:00', description: 'Week prep' },
        { day: 'tuesday', time: '14:00', description: 'Afternoon appointments' },
        { day: 'wednesday', time: '11:00', description: 'Mid-week touch-up' },
        { day: 'thursday', time: '15:00', description: 'Weekend prep' },
        { day: 'friday', time: '09:00', description: 'Friday prayer prep' },
        { day: 'saturday', time: '10:00', description: 'Weekend beauty' },
        { day: 'sunday', time: '12:00', description: 'Weekend pampering' }
      ],
      default: [
        { day: 'monday', time: '09:00', description: 'Week start' },
        { day: 'tuesday', time: '14:00', description: 'Afternoon engagement' },
        { day: 'wednesday', time: '11:00', description: 'Mid-week' },
        { day: 'thursday', time: '15:00', description: 'Pre-weekend' },
        { day: 'friday', time: '13:00', description: 'Post-prayer' },
        { day: 'saturday', time: '10:00', description: 'Weekend morning' },
        { day: 'sunday', time: '16:00', description: 'Sunday evening' }
      ]
    };

    return postingTimes[businessType] || postingTimes.default;
  },

  // Get platform-specific content recommendations
  getContentRecommendations: (businessType, platform) => {
    const recommendations = {
      facebook: {
        restaurant: [
          'Share daily specials with mouth-watering photos',
          'Post customer reviews and testimonials',
          'Behind-the-scenes cooking videos',
          'Special occasion menu highlights'
        ],
        retail: [
          'Showcase new arrivals with multiple product images',
          'Customer styling tips and outfit ideas',
          'Store events and sale announcements',
          'Product reviews and comparisons'
        ],
        salon: [
          'Before and after transformation photos',
          'Beauty tips and tutorials',
          'Staff introductions and expertise',
          'Seasonal beauty trends'
        ]
      },
      instagram: {
        restaurant: [
          'High-quality food photography',
          'Stories showing cooking process',
          'Customer dining experiences',
          'Chef spotlight posts'
        ],
        retail: [
          'Fashion lookbooks and styling',
          'Product flat lays and details',
          'Customer outfit posts (user-generated)',
          'Store ambiance and displays'
        ],
        salon: [
          'Beauty transformation reels',
          'Quick beauty tips videos',
          'Product recommendations',
          'Client testimonial stories'
        ]
      },
      twitter: {
        restaurant: [
          'Quick updates on daily specials',
          'Engage with local food community',
          'Share food-related news and trends',
          'Customer service and responses'
        ],
        retail: [
          'Flash sale announcements',
          'Fashion trend discussions',
          'Customer service updates',
          'Industry news sharing'
        ],
        salon: [
          'Beauty tips in thread format',
          'Appointment availability updates',
          'Beauty industry news',
          'Client testimonial quotes'
        ]
      }
    };

    return recommendations[platform]?.[businessType] || recommendations[platform]?.['default'] || [];
  },

  // Calculate engagement rate
  calculateEngagementRate: (likes, comments, shares, followers) => {
    if (!followers || followers === 0) return 0;
    
    const totalEngagement = (likes || 0) + (comments || 0) + (shares || 0);
    return ((totalEngagement / followers) * 100).toFixed(2);
  },

  // Get hashtag recommendations for Pakistani businesses
  getHashtagRecommendations: (businessType, location = 'Pakistan') => {
    const baseHashtags = ['#Pakistan', '#LocalBusiness', '#SupportLocal'];
    
    const businessHashtags = {
      restaurant: ['#PakistaniFood', '#DesiFood', '#FoodLovers', '#BiryaniLovers', '#KarahiSpecial', '#AuthenticFlavors'],
      retail: ['#PakistaniFashion', '#Shopping', '#StylePakistan', '#FashionPK', '#BrandedClothes', '#LatestTrends'],
      salon: ['#BeautySalon', '#PakistaniBeauty', '#BridalMakeup', '#BeautyTreatments', '#HairStyling', '#GlowUp'],
      cafe: ['#CafeLife', '#CoffeLovers', '#ChaiTime', '#CafePakistan', '#FreshBrew', '#RelaxAndUnwind'],
      gym: ['#FitnessMotivation', '#GymLife', '#HealthyPakistan', '#WorkoutGoals', '#FitnessPK', '#StrongAndHealthy']
    };

    const locationHashtags = location !== 'Pakistan' ? [`#${location}`, `#${location}Business`] : ['#Karachi', '#Lahore', '#Islamabad'];

    return [
      ...baseHashtags,
      ...(businessHashtags[businessType] || []),
      ...locationHashtags.slice(0, 2)
    ].slice(0, 10);
  }
};

module.exports = socialMediaService;
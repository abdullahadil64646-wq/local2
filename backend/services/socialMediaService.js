const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Facebook Graph API Service
class FacebookService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v18.0';
  }

  // Post text content to Facebook page
  async postToPage(pageId, accessToken, content, mediaUrls = []) {
    try {
      const postData = {
        message: content,
        access_token: accessToken
      };

      // If media URLs provided, upload and attach them
      if (mediaUrls && mediaUrls.length > 0) {
        if (mediaUrls.length === 1) {
          // Single media post
          const mediaId = await this.uploadMedia(pageId, accessToken, mediaUrls[0]);
          if (mediaId) {
            postData.object_attachment = mediaId;
          }
        } else {
          // Multiple media - create carousel/album
          const mediaIds = await Promise.all(
            mediaUrls.map(url => this.uploadMedia(pageId, accessToken, url))
          );
          
          if (mediaIds.filter(Boolean).length > 0) {
            postData.attached_media = mediaIds.filter(Boolean).map(id => ({ media_fbid: id }));
          }
        }
      }

      const response = await axios.post(`${this.baseURL}/${pageId}/feed`, postData);

      return {
        success: true,
        postId: response.data.id,
        platform: 'facebook',
        url: `https://facebook.com/${response.data.id}`
      };

    } catch (error) {
      console.error('Facebook posting error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        platform: 'facebook'
      };
    }
  }

  // Upload media to Facebook
  async uploadMedia(pageId, accessToken, mediaUrl) {
    try {
      // Download media first
      const mediaResponse = await axios.get(mediaUrl, { responseType: 'stream' });
      
      const formData = new FormData();
      formData.append('source', mediaResponse.data);
      formData.append('access_token', accessToken);
      formData.append('published', 'false'); // Upload but don't publish yet

      const uploadResponse = await axios.post(
        `${this.baseURL}/${pageId}/photos`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      return uploadResponse.data.id;

    } catch (error) {
      console.error('Facebook media upload error:', error.response?.data || error.message);
      return null;
    }
  }

  // Get page information
  async getPageInfo(pageId, accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/${pageId}`, {
        params: {
          fields: 'name,category,fan_count,followers_count,picture',
          access_token: accessToken
        }
      });

      return {
        success: true,
        pageInfo: response.data
      };

    } catch (error) {
      console.error('Facebook page info error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Get post analytics
  async getPostAnalytics(postId, accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/${postId}/insights`, {
        params: {
          metric: 'post_impressions,post_engaged_users,post_clicks,post_reactions_like_total',
          access_token: accessToken
        }
      });

      const insights = {};
      response.data.data.forEach(metric => {
        insights[metric.name] = metric.values[0]?.value || 0;
      });

      return {
        success: true,
        analytics: {
          reach: insights.post_impressions || 0,
          engagement: insights.post_engaged_users || 0,
          clicks: insights.post_clicks || 0,
          likes: insights.post_reactions_like_total || 0
        }
      };

    } catch (error) {
      console.error('Facebook analytics error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

// Instagram Basic Display API Service
class InstagramService {
  constructor() {
    this.baseURL = 'https://graph.instagram.com';
  }

  // Post to Instagram (requires media)
  async postToInstagram(accountId, accessToken, content, mediaUrls = []) {
    try {
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error('Instagram requires at least one media file');
      }

      let containerId;

      if (mediaUrls.length === 1) {
        // Single media post
        containerId = await this.createMediaContainer(accountId, accessToken, content, mediaUrls[0]);
      } else {
        // Carousel post
        containerId = await this.createCarouselContainer(accountId, accessToken, content, mediaUrls);
      }

      if (!containerId) {
        throw new Error('Failed to create media container');
      }

      // Publish the media
      const publishResponse = await axios.post(`${this.baseURL}/${accountId}/media_publish`, {
        creation_id: containerId,
        access_token: accessToken
      });

      return {
        success: true,
        postId: publishResponse.data.id,
        platform: 'instagram',
        url: `https://instagram.com/p/${publishResponse.data.id}`
      };

    } catch (error) {
      console.error('Instagram posting error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        platform: 'instagram'
      };
    }
  }

  // Create single media container
  async createMediaContainer(accountId, accessToken, caption, mediaUrl) {
    try {
      const mediaType = this.getMediaType(mediaUrl);
      
      const containerData = {
        image_url: mediaType === 'IMAGE' ? mediaUrl : undefined,
        video_url: mediaType === 'VIDEO' ? mediaUrl : undefined,
        media_type: mediaType,
        caption: caption,
        access_token: accessToken
      };

      // Remove undefined values
      Object.keys(containerData).forEach(key => 
        containerData[key] === undefined && delete containerData[key]
      );

      const response = await axios.post(`${this.baseURL}/${accountId}/media`, containerData);

      return response.data.id;

    } catch (error) {
      console.error('Instagram container creation error:', error.response?.data || error.message);
      return null;
    }
  }

  // Create carousel container
  async createCarouselContainer(accountId, accessToken, caption, mediaUrls) {
    try {
      // Create individual media containers first
      const childContainers = await Promise.all(
        mediaUrls.map(async (url) => {
          const mediaType = this.getMediaType(url);
          const response = await axios.post(`${this.baseURL}/${accountId}/media`, {
            image_url: mediaType === 'IMAGE' ? url : undefined,
            video_url: mediaType === 'VIDEO' ? url : undefined,
            media_type: mediaType,
            is_carousel_item: true,
            access_token: accessToken
          });
          return response.data.id;
        })
      );

      // Create carousel container
      const carouselResponse = await axios.post(`${this.baseURL}/${accountId}/media`, {
        media_type: 'CAROUSEL',
        children: childContainers.join(','),
        caption: caption,
        access_token: accessToken
      });

      return carouselResponse.data.id;

    } catch (error) {
      console.error('Instagram carousel creation error:', error.response?.data || error.message);
      return null;
    }
  }

  // Determine media type from URL
  getMediaType(url) {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm'];
    const isVideo = videoExtensions.some(ext => url.toLowerCase().includes(ext));
    return isVideo ? 'VIDEO' : 'IMAGE';
  }

  // Get Instagram account info
  async getAccountInfo(accountId, accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/${accountId}`, {
        params: {
          fields: 'account_type,username,name,profile_picture_url,followers_count,media_count',
          access_token: accessToken
        }
      });

      return {
        success: true,
        accountInfo: response.data
      };

    } catch (error) {
      console.error('Instagram account info error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Get media analytics
  async getMediaAnalytics(mediaId, accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/${mediaId}/insights`, {
        params: {
          metric: 'impressions,reach,engagement,likes,comments,saves,shares',
          access_token: accessToken
        }
      });

      const insights = {};
      response.data.data.forEach(metric => {
        insights[metric.name] = metric.values[0]?.value || 0;
      });

      return {
        success: true,
        analytics: {
          impressions: insights.impressions || 0,
          reach: insights.reach || 0,
          engagement: insights.engagement || 0,
          likes: insights.likes || 0,
          comments: insights.comments || 0,
          saves: insights.saves || 0,
          shares: insights.shares || 0
        }
      };

    } catch (error) {
      console.error('Instagram analytics error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

// Twitter API v2 Service
class TwitterService {
  constructor() {
    this.baseURL = 'https://api.twitter.com/2';
  }

  // Post tweet
  async postTweet(accessToken, content, mediaIds = []) {
    try {
      const tweetData = {
        text: content
      };

      if (mediaIds && mediaIds.length > 0) {
        tweetData.media = {
          media_ids: mediaIds
        };
      }

      const response = await axios.post(`${this.baseURL}/tweets`, tweetData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        postId: response.data.data.id,
        platform: 'twitter',
        url: `https://twitter.com/user/status/${response.data.data.id}`
      };

    } catch (error) {
      console.error('Twitter posting error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        platform: 'twitter'
      };
    }
  }

  // Upload media to Twitter
  async uploadMedia(accessToken, mediaUrl) {
    try {
      // Twitter media upload is more complex and requires chunked upload for larger files
      // This is a simplified version
      const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
      
      const formData = new FormData();
      formData.append('media', Buffer.from(mediaResponse.data), 'media.jpg');

      const uploadResponse = await axios.post('https://upload.twitter.com/1.1/media/upload.json', formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...formData.getHeaders()
        }
      });

      return uploadResponse.data.media_id_string;

    } catch (error) {
      console.error('Twitter media upload error:', error.response?.data || error.message);
      return null;
    }
  }

  // Get tweet analytics
  async getTweetAnalytics(tweetId, accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/tweets/${tweetId}`, {
        params: {
          'tweet.fields': 'public_metrics'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const metrics = response.data.data.public_metrics;

      return {
        success: true,
        analytics: {
          impressions: metrics.impression_count || 0,
          likes: metrics.like_count || 0,
          retweets: metrics.retweet_count || 0,
          replies: metrics.reply_count || 0,
          quotes: metrics.quote_count || 0
        }
      };

    } catch (error) {
      console.error('Twitter analytics error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

// Main Social Media Service
class SocialMediaService {
  constructor() {
    this.facebook = new FacebookService();
    this.instagram = new InstagramService();
    this.twitter = new TwitterService();
  }

  // Post to multiple platforms
  async postToAllPlatforms(userSocialMedia, content, mediaUrls = []) {
    const results = {};

    try {
      // Post to Facebook
      if (userSocialMedia.facebook?.connected && userSocialMedia.facebook?.pageId) {
        results.facebook = await this.facebook.postToPage(
          userSocialMedia.facebook.pageId,
          userSocialMedia.facebook.accessToken,
          content,
          mediaUrls
        );
      }

      // Post to Instagram
      if (userSocialMedia.instagram?.connected && userSocialMedia.instagram?.accountId) {
        results.instagram = await this.instagram.postToInstagram(
          userSocialMedia.instagram.accountId,
          userSocialMedia.instagram.accessToken,
          content,
          mediaUrls
        );
      }

      // Post to Twitter
      if (userSocialMedia.twitter?.connected && userSocialMedia.twitter?.accessToken) {
        // Upload media first if provided
        const mediaIds = [];
        if (mediaUrls && mediaUrls.length > 0) {
          for (const url of mediaUrls) {
            const mediaId = await this.twitter.uploadMedia(userSocialMedia.twitter.accessToken, url);
            if (mediaId) mediaIds.push(mediaId);
          }
        }

        results.twitter = await this.twitter.postTweet(
          userSocialMedia.twitter.accessToken,
          content,
          mediaIds
        );
      }

      return {
        success: true,
        results: results,
        postedTo: Object.keys(results).filter(platform => results[platform].success)
      };

    } catch (error) {
      console.error('Multi-platform posting error:', error);
      return {
        success: false,
        error: error.message,
        results: results
      };
    }
  }

  // Get analytics from all platforms
  async getAllPlatformAnalytics(userSocialMedia, postIds) {
    const analytics = {};

    try {
      // Facebook analytics
      if (postIds.facebook && userSocialMedia.facebook?.connected) {
        analytics.facebook = await this.facebook.getPostAnalytics(
          postIds.facebook,
          userSocialMedia.facebook.accessToken
        );
      }

      // Instagram analytics
      if (postIds.instagram && userSocialMedia.instagram?.connected) {
        analytics.instagram = await this.instagram.getMediaAnalytics(
          postIds.instagram,
          userSocialMedia.instagram.accessToken
        );
      }

      // Twitter analytics
      if (postIds.twitter && userSocialMedia.twitter?.connected) {
        analytics.twitter = await this.twitter.getTweetAnalytics(
          postIds.twitter,
          userSocialMedia.twitter.accessToken
        );
      }

      return {
        success: true,
        analytics: analytics
      };

    } catch (error) {
      console.error('Analytics retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify social media connections
  async verifyConnections(userSocialMedia) {
    const status = {};

    try {
      // Verify Facebook
      if (userSocialMedia.facebook?.connected) {
        status.facebook = await this.facebook.getPageInfo(
          userSocialMedia.facebook.pageId,
          userSocialMedia.facebook.accessToken
        );
      }

      // Verify Instagram
      if (userSocialMedia.instagram?.connected) {
        status.instagram = await this.instagram.getAccountInfo(
          userSocialMedia.instagram.accountId,
          userSocialMedia.instagram.accessToken
        );
      }

      // Twitter verification would go here
      if (userSocialMedia.twitter?.connected) {
        status.twitter = { success: true, message: 'Connected' };
      }

      return {
        success: true,
        status: status
      };

    } catch (error) {
      console.error('Connection verification error:', error);
      return {
        success: false,
        error: error.message,
        status: status
      };
    }
  }
}

module.exports = new SocialMediaService();
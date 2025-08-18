import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  PhotoIcon,
  CalendarIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShareIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon
} from '../../components/icons/SocialIcons';

const CreatePostPage = () => {
  const { user, canAccessFeature } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    content: '',
    contentType: 'promotional',
    customPrompt: '',
    platforms: {
      facebook: true,
      instagram: false,
      twitter: false
    },
    scheduleType: 'now',
    scheduledFor: '',
    hashtags: [],
    mediaUrls: []
  });

  const [aiGenerated, setAiGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');

  // Content type options
  const contentTypes = [
    { 
      value: 'promotional', 
      label: 'Promotional', 
      description: 'Promote products, services, or special offers',
      icon: '📢'
    },
    { 
      value: 'educational', 
      label: 'Educational', 
      description: 'Share tips, tutorials, or industry insights',
      icon: '📚'
    },
    { 
      value: 'behind_scenes', 
      label: 'Behind the Scenes', 
      description: 'Show your work process or team',
      icon: '🎬'
    },
    { 
      value: 'product_showcase', 
      label: 'Product Showcase', 
      description: 'Highlight specific products or services',
      icon: '🛍️'
    },
    { 
      value: 'customer_story', 
      label: 'Customer Story', 
      description: 'Share customer testimonials or reviews',
      icon: '⭐'
    }
  ];

  // Platform options with access control
  const platformOptions = [
    {
      key: 'facebook',
      name: 'Facebook',
      icon: FacebookIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      connected: user?.socialMedia?.facebook?.connected || false,
      available: true
    },
    {
      key: 'instagram',
      name: 'Instagram',
      icon: InstagramIcon,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      connected: user?.socialMedia?.instagram?.connected || false,
      available: canAccessFeature('multiple_platforms')
    },
    {
      key: 'twitter',
      name: 'Twitter',
      icon: TwitterIcon,
      color: 'text-blue-400',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      connected: user?.socialMedia?.twitter?.connected || false,
      available: canAccessFeature('multiple_platforms')
    }
  ];

  // Fetch user subscription info
  const { data: subscriptionInfo } = useQuery('subscriptionUsage', async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/subscriptions/usage`);
    return response.data;
  });

  // Generate AI content mutation
  const generateContentMutation = useMutation(
    async (data) => {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/social-media/generate-content`, data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setFormData(prev => ({
          ...prev,
          content: data.content.text,
          hashtags: data.content.hashtags || []
        }));
        setAiGenerated(true);
        toast.success('AI content generated successfully!');
        
        // Add generated image if available
        if (data.content.image) {
          setSelectedMedia([{
            type: 'image',
            url: data.content.image.url,
            publicId: data.content.image.publicId,
            caption: data.content.text.substring(0, 30) + '...'
          }]);
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to generate content');
      },
      onSettled: () => {
        setIsGenerating(false);
      }
    }
  );

  // Create post mutation
  const createPostMutation = useMutation(
    async (data) => {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/social-media/create-post`, data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries('dashboardData');
        queryClient.invalidateQueries('socialMediaPosts');
        navigate('/dashboard/posts');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create post');
      }
    }
  );

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset AI generated flag when content is manually edited
    if (field === 'content' && aiGenerated) {
      setAiGenerated(false);
    }
  };

  // Handle platform selection
  const handlePlatformChange = (platform, checked) => {
    setFormData(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: checked
      }
    }));
  };

  // Generate AI content
  const handleGenerateContent = () => {
    if (!subscriptionInfo?.usage?.canGenerate?.posts) {
      toast.error('You have reached your monthly post generation limit');
      navigate('/dashboard/subscription');
      return;
    }

    setIsGenerating(true);
    generateContentMutation.mutate({
      contentType: formData.contentType,
      customPrompt: formData.customPrompt,
      businessContext: {
        businessType: user?.businessType,
        businessName: user?.businessName,
        businessDescription: user?.businessDescription
      }
    });
  };

  // Add hashtag
  const addHashtag = () => {
    if (hashtagInput.trim() && !formData.hashtags.includes(hashtagInput.trim())) {
      const newHashtag = hashtagInput.trim().startsWith('#') ? hashtagInput.trim() : `#${hashtagInput.trim()}`;
      setFormData(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, newHashtag]
      }));
      setHashtagInput('');
    }
  };

  // Remove hashtag
  const removeHashtag = (index) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter((_, i) => i !== index)
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.content.trim()) {
      toast.error('Please enter post content');
      return;
    }

    const selectedPlatforms = Object.keys(formData.platforms).filter(p => formData.platforms[p]);
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    // Check if selected platforms are connected
    const unconnectedPlatforms = selectedPlatforms.filter(platform => {
      const platformConfig = platformOptions.find(p => p.key === platform);
      return !platformConfig?.connected;
    });

    if (unconnectedPlatforms.length > 0) {
      toast.error(`Please connect your ${unconnectedPlatforms.join(', ')} account(s) first`);
      return;
    }

    // Validate scheduled date
    if (formData.scheduleType === 'scheduled') {
      if (!formData.scheduledFor) {
        toast.error('Please select a scheduled date and time');
        return;
      }
      
      const scheduledDate = new Date(formData.scheduledFor);
      const now = new Date();
      
      if (scheduledDate <= now) {
        toast.error('Scheduled time must be in the future');
        return;
      }
    }

    // Submit the form
    createPostMutation.mutate({
      content: formData.content,
      platforms: formData.platforms,
      scheduleType: formData.scheduleType,
      scheduledFor: formData.scheduleType === 'scheduled' ? formData.scheduledFor : undefined,
      mediaUrls: selectedMedia.map(m => m.url),
      hashtags: formData.hashtags,
      contentType: formData.contentType
    });
  };

  // Set minimum date for scheduling (current time + 5 minutes)
  const getMinScheduleDate = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  // Character count for content
  const getCharacterCount = () => {
    return formData.content.length;
  };

  // Platform-specific character limits
  const getCharacterLimit = () => {
    const selectedPlatforms = Object.keys(formData.platforms).filter(p => formData.platforms[p]);
    
    if (selectedPlatforms.includes('twitter')) return 280;
    if (selectedPlatforms.includes('instagram')) return 2200;
    return 63206; // Facebook limit
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Social Media Post</h1>
            <p className="mt-1 text-gray-600">
              Generate AI-powered content or create your own engaging posts
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Usage indicator */}
            {subscriptionInfo && (
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  Posts: {subscriptionInfo.usage.currentMonth.postsGenerated} / {subscriptionInfo.features.monthlyPosts}
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full ${
                      subscriptionInfo.usagePercentage >= 90 ? 'bg-red-500' :
                      subscriptionInfo.usagePercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(subscriptionInfo.usagePercentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              {previewMode ? 'Edit' : 'Preview'}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Type Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contentTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`relative flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      formData.contentType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="contentType"
                      value={type.value}
                      checked={formData.contentType === type.value}
                      onChange={(e) => handleInputChange('contentType', e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{type.icon}</span>
                        <span className="text-sm font-medium text-gray-900">{type.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                    </div>
                    {formData.contentType === type.value && (
                      <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* AI Content Generation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">AI Content Generator</h2>
                {aiGenerated && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    AI Generated
                  </span>
                )}
              </div>

              {/* Custom prompt input */}
              <div className="mb-4">
                <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  id="customPrompt"
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Include information about our new winter collection sale..."
                  value={formData.customPrompt}
                  onChange={(e) => handleInputChange('customPrompt', e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateContent}
                disabled={isGenerating || !subscriptionInfo?.usage?.canGenerate?.posts}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Generate AI Content
                  </>
                )}
              </button>

              {!subscriptionInfo?.usage?.canGenerate?.posts && (
                <p className="mt-2 text-sm text-red-600">
                  <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                  You've reached your monthly limit. Upgrade to generate more content.
                </p>
              )}
            </div>

            {/* Content Editor */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Post Content</h2>
                <div className="text-sm text-gray-500">
                  {getCharacterCount()} / {getCharacterLimit()} characters
                </div>
              </div>

              {previewMode ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[200px]">
                  <div className="prose prose-sm max-w-none">
                    {formData.content.split('\n').map((line, index) => (
                      <p key={index} className="mb-2">
                        {line || '\u00A0'}
                      </p>
                    ))}
                  </div>
                  {formData.hashtags.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {formData.hashtags.map((hashtag, index) => (
                          <span key={index} className="text-blue-600 text-sm">
                            {hashtag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  rows={8}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    getCharacterCount() > getCharacterLimit() 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Write your post content here or use AI to generate it..."
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  required
                />
              )}

              {getCharacterCount() > getCharacterLimit() && (
                <p className="mt-2 text-sm text-red-600">
                  Content exceeds the character limit for selected platforms
                </p>
              )}
            </div>

            {/* Hashtags */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Hashtags</h2>
              
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add hashtag (without #)"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                />
                <button
                  type="button"
                  onClick={addHashtag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add
                </button>
              </div>

              {formData.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.hashtags.map((hashtag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {hashtag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Platform Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Platforms</h2>
              <div className="space-y-3">
                {platformOptions.map((platform) => {
                  const Icon = platform.icon;
                  const isSelected = formData.platforms[platform.key];
                  const isDisabled = !platform.available || !platform.connected;

                  return (
                    <label
                      key={platform.key}
                      className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected && !isDisabled
                          ? `${platform.bgColor} ${platform.borderColor} border-2`
                          : isDisabled
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handlePlatformChange(platform.key, e.target.checked)}
                        disabled={isDisabled}
                        className="sr-only"
                      />
                      
                      <Icon className={`h-6 w-6 mr-3 ${platform.color} ${isDisabled ? 'opacity-50' : ''}`} />
                      
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className={`text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                            {platform.name}
                          </span>
                          {!platform.available && (
                            <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                              Pro
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {platform.connected ? 'Connected' : 'Not connected'}
                        </div>
                      </div>

                      {isSelected && !isDisabled && (
                        <CheckCircleIcon className={`h-5 w-5 ${platform.color}`} />
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Connect platforms link */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/social-media')}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  <ShareIcon className="h-4 w-4 inline mr-1" />
                  Manage Connections
                </button>
              </div>
            </div>

            {/* Scheduling */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
              
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scheduleType"
                    value="now"
                    checked={formData.scheduleType === 'now'}
                    onChange={(e) => handleInputChange('scheduleType', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">Post now</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scheduleType"
                    value="scheduled"
                    checked={formData.scheduleType === 'scheduled'}
                    onChange={(e) => handleInputChange('scheduleType', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">Schedule for later</span>
                </label>

                {formData.scheduleType === 'scheduled' && (
                  <div className="ml-6">
                    <input
                      type="datetime-local"
                      min={getMinScheduleDate()}
                      value={formData.scheduledFor}
                      onChange={(e) => handleInputChange('scheduledFor', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required={formData.scheduleType === 'scheduled'}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <button
                type="submit"
                disabled={createPostMutation.isLoading || !formData.content.trim()}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createPostMutation.isLoading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    {formData.scheduleType === 'now' ? 'Publishing...' : 'Scheduling...'}
                  </>
                ) : (
                  <>
                    {formData.scheduleType === 'now' ? (
                      <>
                        <ShareIcon className="h-4 w-4 mr-2" />
                        Publish Post
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Schedule Post
                      </>
                    )}
                  </>
                )}
              </button>

              {formData.scheduleType === 'scheduled' && formData.scheduledFor && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  <ClockIcon className="h-3 w-3 inline mr-1" />
                  Will be posted on {new Date(formData.scheduledFor).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;
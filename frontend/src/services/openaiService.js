const { Configuration, OpenAIApi } = require('openai');

// Initialize OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// Content type templates for better AI generation
const CONTENT_TEMPLATES = {
  promotional: {
    systemPrompt: "You are a skilled social media marketing expert specializing in promotional content for Pakistani local businesses. Create engaging, persuasive content that drives sales while maintaining cultural sensitivity and local appeal.",
    userPromptTemplate: "Create a promotional post for a {businessType} business called '{businessName}' in Pakistan. {customInstructions} Make it engaging, include a clear call-to-action, and use local Pakistani context where appropriate. Keep it authentic and relatable to Pakistani customers."
  },
  educational: {
    systemPrompt: "You are an educational content creator who specializes in creating informative posts for Pakistani businesses. Your content should be helpful, informative, and establish the business as an expert in their field.",
    userPromptTemplate: "Create an educational post for a {businessType} business called '{businessName}' in Pakistan. {customInstructions} Share valuable tips, insights, or knowledge that would be helpful to their Pakistani customers. Make it informative yet engaging."
  },
  behind_scenes: {
    systemPrompt: "You are a storytelling expert who creates authentic behind-the-scenes content for Pakistani businesses. Your content should humanize the brand and build emotional connections with customers.",
    userPromptTemplate: "Create a behind-the-scenes post for a {businessType} business called '{businessName}' in Pakistan. {customInstructions} Show the human side of the business, the work process, or team. Make it authentic and relatable to Pakistani culture and work ethic."
  },
  product_showcase: {
    systemPrompt: "You are a product marketing specialist who creates compelling product showcase content for Pakistani businesses. Your content should highlight product benefits and create desire.",
    userPromptTemplate: "Create a product showcase post for a {businessType} business called '{businessName}' in Pakistan. {customInstructions} Highlight the product features, benefits, and value proposition. Make it appealing to Pakistani customers and include pricing in PKR if relevant."
  },
  customer_story: {
    systemPrompt: "You are a customer success storyteller who creates authentic testimonial and customer story content for Pakistani businesses. Your content should build trust and social proof.",
    userPromptTemplate: "Create a customer story post for a {businessType} business called '{businessName}' in Pakistan. {customInstructions} Share a customer success story, testimonial, or review. Make it authentic and relatable to Pakistani customers, focusing on the positive impact of the business."
  },
  tips: {
    systemPrompt: "You are a helpful advisor who creates practical tip-based content for Pakistani businesses. Your content should provide actionable advice that establishes expertise.",
    userPromptTemplate: "Create a tips post for a {businessType} business called '{businessName}' in Pakistan. {customInstructions} Share 3-5 practical tips related to their industry that would be valuable to Pakistani customers. Make it actionable and easy to understand."
  },
  news: {
    systemPrompt: "You are a business news communicator who creates timely news and update content for Pakistani businesses. Your content should inform customers about important business developments.",
    userPromptTemplate: "Create a news/update post for a {businessType} business called '{businessName}' in Pakistan. {customInstructions} Share important business news, updates, or announcements. Make it informative and exciting for Pakistani customers."
  }
};

// Business-specific context for better content generation
const BUSINESS_CONTEXTS = {
  restaurant: {
    keywords: ['delicious', 'fresh', 'authentic', 'Pakistani cuisine', 'taste', 'flavors', 'desi food', 'biryani', 'karahi', 'traditional'],
    commonTopics: ['daily specials', 'new dishes', 'ingredients', 'cooking methods', 'family recipes', 'dining experience'],
    callToActions: ['Order now', 'Visit us today', 'Try our signature dish', 'Book a table', 'Call for delivery']
  },
  retail: {
    keywords: ['quality', 'affordable', 'latest collection', 'trendy', 'Pakistani fashion', 'branded', 'original', 'discount'],
    commonTopics: ['new arrivals', 'seasonal collection', 'quality assurance', 'customer service', 'shopping experience'],
    callToActions: ['Shop now', 'Visit our store', 'Check out our collection', 'Limited time offer', 'Call for prices']
  },
  salon: {
    keywords: ['beautiful', 'professional', 'skilled', 'modern', 'Pakistani beauty', 'bridal', 'expert', 'experienced'],
    commonTopics: ['beauty treatments', 'bridal packages', 'hair styling', 'skin care', 'professional services'],
    callToActions: ['Book appointment', 'Call us today', 'Visit for consultation', 'Try our services', 'Special packages available']
  },
  gym: {
    keywords: ['fitness', 'healthy', 'strong', 'transformation', 'Pakistani fitness', 'professional trainers', 'modern equipment'],
    commonTopics: ['workout routines', 'fitness tips', 'member transformations', 'equipment', 'training programs'],
    callToActions: ['Join today', 'Start your fitness journey', 'Book a trial', 'Contact for membership', 'Transform your life']
  },
  cafe: {
    keywords: ['cozy', 'fresh', 'aromatic', 'Pakistani tea culture', 'comfortable', 'friendly', 'quality coffee'],
    commonTopics: ['coffee varieties', 'snacks', 'ambiance', 'meeting place', 'study spot', 'comfort food'],
    callToActions: ['Visit us today', 'Try our special brew', 'Perfect for meetings', 'Order online', 'Come relax with us']
  },
  karyana: {
    keywords: ['fresh', 'quality', 'daily needs', 'Pakistani households', 'essential items', 'convenient', 'trusted'],
    commonTopics: ['fresh produce', 'daily essentials', 'convenience', 'quality products', 'household items'],
    callToActions: ['Shop with us', 'Call for home delivery', 'Visit our store', 'Quality guaranteed', 'Your neighborhood store']
  },
  services: {
    keywords: ['professional', 'reliable', 'experienced', 'Pakistani service', 'quality work', 'trusted', 'affordable'],
    commonTopics: ['service quality', 'customer satisfaction', 'professional expertise', 'reliable service'],
    callToActions: ['Contact us today', 'Book our service', 'Call for consultation', 'Quality service guaranteed', 'Professional help available']
  }
};

// Pakistani-specific hashtags based on business type
const PAKISTANI_HASHTAGS = {
  general: ['#Pakistan', '#LocalBusiness', '#PakistaniBusiness', '#SupportLocal', '#MadeInPakistan', '#PakistaniEntrepreneur'],
  restaurant: ['#PakistaniFood', '#DesiFood', '#Biryani', '#Karahi', '#PakistaniCuisine', '#AuthenticFlavors', '#FoodLovers', '#DeliverableFood'],
  retail: ['#PakistaniShopping', '#PakistaniFashion', '#QualityProducts', '#BrandedItems', '#ShoppingInPakistan', '#PakistaniStyle'],
  salon: ['#PakistaniBeauty', '#BeautySalon', '#BridalMakeup', '#HairStyling', '#PakistaniWedding', '#BeautyTreatments'],
  gym: ['#PakistaniFitness', '#GymLife', '#HealthyPakistan', '#FitnessMotivation', '#WorkoutInPakistan', '#HealthyLifestyle'],
  cafe: ['#PakistaniCafe', '#CoffeeLovers', '#TeaCulture', '#CafeLife', '#PakistaniTea', '#CoffeeTime'],
  karyana: ['#GroceryStore', '#FreshProduce', '#DailyNeeds', '#ConvenienceStore', '#PakistaniGrocery', '#HouseholdItems'],
  services: ['#ProfessionalServices', '#QualityService', '#ReliableService', '#PakistaniServices', '#TrustedService']
};

// Generate social media post content using OpenAI
const generatePostContent = async (userProfile, contentType = 'promotional', customPrompt = '') => {
  try {
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return {
        success: false,
        error: 'AI service not configured',
        fallbackContent: generateFallbackContent(userProfile, contentType)
      };
    }

    // Get content template
    const template = CONTENT_TEMPLATES[contentType] || CONTENT_TEMPLATES.promotional;
    const businessContext = BUSINESS_CONTEXTS[userProfile.businessType] || BUSINESS_CONTEXTS.services;

    // Prepare the user prompt
    let userPrompt = template.userPromptTemplate
      .replace('{businessType}', userProfile.businessType || 'business')
      .replace('{businessName}', userProfile.businessName || userProfile.name || 'our business');

    // Add custom instructions if provided
    const customInstructions = customPrompt ? `Additional context: ${customPrompt}.` : '';
    userPrompt = userPrompt.replace('{customInstructions}', customInstructions);

    // Add business description if available
    if (userProfile.businessDescription) {
      userPrompt += ` Business description: ${userProfile.businessDescription}`;
    }

    // Add location context
    const location = userProfile.address?.city || 'Pakistan';
    userPrompt += ` The business is located in ${location}.`;

    // Prepare the complete prompt
    const systemMessage = template.systemPrompt;
    const contentGuidelines = `
Guidelines:
- Write in English but use some Urdu/Hindi words naturally where appropriate
- Keep it between 100-250 words
- Include relevant emojis
- Make it engaging and authentic
- Include a clear call-to-action
- Consider Pakistani culture and values
- Use conversational tone
- Avoid overly promotional language
- Focus on customer benefits
- Include pricing in PKR if mentioning costs
    `;

    const messages = [
      { role: 'system', content: systemMessage + contentGuidelines },
      { role: 'user', content: userPrompt }
    ];

    // Make OpenAI API call with retry logic
    let response;
    let retries = 3;
    
    while (retries > 0) {
      try {
        response = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 500,
          temperature: 0.8,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        });
        break; // Success, exit retry loop
      } catch (apiError) {
        retries--;
        if (retries === 0) {
          throw apiError;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const generatedContent = response.data.choices[0].message.content.trim();

    // Generate relevant hashtags
    const hashtags = generateRelevantHashtags(userProfile.businessType, contentType, customPrompt);

    // Calculate word count
    const wordCount = generatedContent.split(/\s+/).length;

    return {
      success: true,
      content: generatedContent,
      hashtags: hashtags,
      wordCount: wordCount,
      contentType: contentType,
      aiGenerated: true,
      generatedAt: new Date(),
      model: 'gpt-3.5-turbo'
    };

  } catch (error) {
    console.error('OpenAI content generation error:', error);
    
    // Return fallback content on error
    return {
      success: false,
      error: error.message,
      fallbackContent: generateFallbackContent(userProfile, contentType)
    };
  }
};

// Generate video script content
const generateVideoScript = async (userProfile, topic, duration = 30) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        error: 'AI service not configured'
      };
    }

    const systemPrompt = `You are a video script writer specializing in short-form social media videos for Pakistani businesses. Create engaging, authentic scripts that work well for Instagram Reels, Facebook videos, or TikTok.`;

    const userPrompt = `Create a ${duration}-second video script for ${userProfile.businessName || 'a business'} (${userProfile.businessType || 'general business'}) about "${topic}". 

Requirements:
- Write in English with some Urdu words naturally mixed in
- Include scene descriptions and text overlays
- Make it engaging from the first second
- Include a strong hook in the first 3 seconds
- Add a clear call-to-action at the end
- Consider Pakistani culture and values
- Format as: [Scene 1: Description] "Dialogue/Text" [Text overlay: "Text"]

The business is located in ${userProfile.address?.city || 'Pakistan'}.
${userProfile.businessDescription ? `Business description: ${userProfile.businessDescription}` : ''}`;

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.8
    });

    const script = response.data.choices[0].message.content.trim();

    return {
      success: true,
      script: script,
      duration: duration,
      topic: topic,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('Video script generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate relevant hashtags based on business and content type
const generateRelevantHashtags = (businessType, contentType, customPrompt = '') => {
  const hashtags = [];
  
  // Add general Pakistani business hashtags
  hashtags.push(...PAKISTANI_HASHTAGS.general.slice(0, 2));
  
  // Add business-specific hashtags
  const businessHashtags = PAKISTANI_HASHTAGS[businessType] || PAKISTANI_HASHTAGS.services;
  hashtags.push(...businessHashtags.slice(0, 3));
  
  // Add content-type specific hashtags
  switch (contentType) {
    case 'promotional':
      hashtags.push('#Sale', '#Offer', '#Discount', '#SpecialDeal');
      break;
    case 'educational':
      hashtags.push('#Tips', '#Knowledge', '#Learn', '#HowTo');
      break;
    case 'behind_scenes':
      hashtags.push('#BehindTheScenes', '#TeamWork', '#Process', '#Authentic');
      break;
    case 'product_showcase':
      hashtags.push('#NewProduct', '#Quality', '#Featured', '#MustHave');
      break;
    case 'customer_story':
      hashtags.push('#CustomerLove', '#Testimonial', '#HappyCustomer', '#Success');
      break;
  }
  
  // Add general engagement hashtags
  hashtags.push('#SmallBusiness', '#CustomerFirst', '#Quality');
  
  // Shuffle and return up to 10 hashtags
  const shuffledHashtags = hashtags.sort(() => 0.5 - Math.random());
  return shuffledHashtags.slice(0, Math.min(10, shuffledHashtags.length));
};

// Generate fallback content when AI is not available
const generateFallbackContent = (userProfile, contentType) => {
  const businessName = userProfile.businessName || userProfile.name || 'our business';
  const businessType = userProfile.businessType || 'business';
  const businessContext = BUSINESS_CONTEXTS[businessType] || BUSINESS_CONTEXTS.services;
  
  const templates = {
    promotional: `🎉 Special offer at ${businessName}! 

Experience the best ${businessType} services in town. We're committed to providing quality and value to our customers.

${businessContext.callToActions[0]} and discover why customers love us! 

📞 Contact us for more details
📍 Visit us today

#${businessName.replace(/\s+/g, '')} #QualityService #LocalBusiness`,

    educational: `💡 Pro tip from ${businessName}!

Did you know? Here's something valuable we'd like to share with our amazing customers about ${businessType} services.

Our experienced team has learned that quality and customer satisfaction are the keys to success.

Follow us for more helpful tips! 

#Tips #Knowledge #${businessType} #ProfessionalAdvice`,

    behind_scenes: `👀 Behind the scenes at ${businessName}!

Take a look at how we work hard every day to serve our customers with dedication and passion.

Our team believes in delivering the best ${businessType} experience for everyone who visits us.

${businessContext.callToActions[0]}!

#BehindTheScenes #TeamWork #Dedication #QualityWork`,

    product_showcase: `✨ Featuring our amazing ${businessType} services!

At ${businessName}, we take pride in offering high-quality products and services that our customers love.

Every item is carefully selected to ensure the best value and satisfaction.

${businessContext.callToActions[0]} and see the difference!

#Featured #Quality #CustomerFavorite #BestValue`,

    customer_story: `❤️ Customer love at ${businessName}!

We're grateful for all the wonderful feedback from our amazing customers. Your satisfaction is our biggest reward!

Thank you for choosing us for your ${businessType} needs. We're committed to serving you with excellence.

Join our happy customers today!

#CustomerLove #Grateful #Excellence #HappyCustomers`
  };

  return {
    content: templates[contentType] || templates.promotional,
    hashtags: generateRelevantHashtags(businessType, contentType),
    wordCount: templates[contentType]?.split(/\s+/).length || 50,
    aiGenerated: false,
    fallback: true
  };
};

// Generate product descriptions
const generateProductDescription = async (productName, category, businessType, customDetails = '') => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        error: 'AI service not configured'
      };
    }

    const systemPrompt = `You are a product description writer for Pakistani e-commerce businesses. Write compelling, SEO-friendly product descriptions that appeal to Pakistani customers.`;

    const userPrompt = `Write a product description for "${productName}" in the ${category} category for a ${businessType} business in Pakistan.

${customDetails ? `Additional details: ${customDetails}` : ''}

Requirements:
- 100-200 words
- Highlight key features and benefits
- Use Pakistani context where relevant
- Include emotional appeal
- Mention quality and value
- Use some Urdu/Hindi terms naturally
- Make it SEO-friendly
- End with a call-to-action`;

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.7
    });

    const description = response.data.choices[0].message.content.trim();

    return {
      success: true,
      description: description,
      productName: productName,
      category: category,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('Product description generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate business description
const generateBusinessDescription = async (businessName, businessType, location, services = []) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        error: 'AI service not configured'
      };
    }

    const systemPrompt = `You are a business copywriter specializing in Pakistani businesses. Create compelling business descriptions that attract customers and establish credibility.`;

    const userPrompt = `Write a business description for "${businessName}", a ${businessType} business located in ${location}, Pakistan.

${services.length > 0 ? `Services offered: ${services.join(', ')}` : ''}

Requirements:
- 150-250 words
- Professional yet approachable tone
- Highlight unique value proposition
- Include Pakistani cultural context
- Mention commitment to quality and customer service
- Use some Urdu/Hindi words naturally
- Make it engaging and trustworthy
- Include call-to-action`;

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const description = response.data.choices[0].message.content.trim();

    return {
      success: true,
      description: description,
      businessName: businessName,
      businessType: businessType,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('Business description generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate customer response templates
const generateCustomerResponse = async (customerMessage, businessType, responseType = 'helpful') => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        error: 'AI service not configured'
      };
    }

    const systemPrompt = `You are a customer service expert for Pakistani businesses. Generate professional, helpful, and culturally appropriate responses to customer inquiries.`;

    const userPrompt = `Generate a ${responseType} response to this customer message: "${customerMessage}"

This is for a ${businessType} business in Pakistan.

Requirements:
- Professional and courteous tone
- Pakistani cultural sensitivity
- Address the customer's concern directly
- Offer solutions where possible
- Use respectful language
- Include some Urdu/Hindi courtesy words naturally
- Keep it concise but complete
- End with willingness to help further`;

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 300,
      temperature: 0.6
    });

    const responseText = response.data.choices[0].message.content.trim();

    return {
      success: true,
      response: responseText,
      originalMessage: customerMessage,
      responseType: responseType,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('Customer response generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Analyze content performance and suggest improvements
const analyzeContentPerformance = async (content, engagement, reach, platform) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        error: 'AI service not configured'
      };
    }

    const systemPrompt = `You are a social media analytics expert. Analyze content performance and provide actionable insights for improvement.`;

    const userPrompt = `Analyze this social media post performance:

Content: "${content}"
Platform: ${platform}
Engagement: ${engagement}
Reach: ${reach}

Provide:
1. Performance assessment (Good/Average/Poor)
2. What worked well
3. Areas for improvement
4. Specific suggestions for better performance
5. Hashtag recommendations

Keep recommendations practical for Pakistani businesses.`;

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 0.6
    });

    const analysis = response.data.choices[0].message.content.trim();

    return {
      success: true,
      analysis: analysis,
      content: content,
      metrics: { engagement, reach, platform },
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('Content analysis error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generatePostContent,
  generateVideoScript,
  generateProductDescription,
  generateBusinessDescription,
  generateCustomerResponse,
  analyzeContentPerformance,
  generateRelevantHashtags,
  generateFallbackContent
};
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Business type specific prompts
const businessPrompts = {
  restaurant: {
    themes: ['food-showcase', 'behind-scenes', 'special-offers', 'customer-stories', 'cooking-tips'],
    style: 'appetizing and mouth-watering'
  },
  retail: {
    themes: ['product-showcase', 'new-arrivals', 'sales-promotions', 'styling-tips', 'customer-reviews'],
    style: 'trendy and appealing'
  },
  salon: {
    themes: ['transformation-photos', 'beauty-tips', 'new-services', 'client-testimonials', 'trend-updates'],
    style: 'elegant and professional'
  },
  gym: {
    themes: ['workout-tips', 'transformation-stories', 'equipment-showcase', 'nutrition-advice', 'member-achievements'],
    style: 'motivational and energetic'
  },
  cafe: {
    themes: ['coffee-art', 'cozy-ambiance', 'seasonal-drinks', 'pastry-showcase', 'morning-motivation'],
    style: 'warm and inviting'
  },
  karyana: {
    themes: ['fresh-products', 'daily-essentials', 'home-delivery', 'quality-guarantee', 'family-values'],
    style: 'trustworthy and reliable'
  },
  services: {
    themes: ['service-benefits', 'before-after', 'expert-tips', 'customer-satisfaction', 'professional-quality'],
    style: 'professional and trustworthy'
  }
};

// Generate social media post content
const generatePostContent = async (userProfile, contentType = 'promotional', customPrompt = null) => {
  try {
    const businessType = userProfile.businessType || 'services';
    const businessName = userProfile.businessName || userProfile.name;
    const businessInfo = businessPrompts[businessType] || businessPrompts.services;
    
    let prompt;
    
    if (customPrompt) {
      prompt = customPrompt;
    } else {
      const themes = businessInfo.themes;
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      
      prompt = `Create a ${businessInfo.style} social media post for ${businessName}, a ${businessType} business in Pakistan. 

Business Details:
- Name: ${businessName}
- Type: ${businessType}
- Location: ${userProfile.address?.city || 'Karachi'}, Pakistan

Post Requirements:
- Theme: ${randomTheme}
- Content Type: ${contentType}
- Language: Mix of English and Urdu (Roman)
- Length: 150-200 characters
- Include call-to-action
- Add relevant emojis
- Mention online store if applicable
- Use Pakistani cultural context
- Make it engaging and shareable

The post should sound natural, not obviously AI-generated, and should encourage customer engagement.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a Pakistani social media marketing expert specializing in local businesses. Create engaging posts that resonate with Pakistani audience, mixing English and Roman Urdu naturally. Always include relevant emojis and call-to-actions.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    // Generate hashtags
    const hashtags = await generateHashtags(businessType, userProfile.address?.city);
    
    // Combine content with hashtags
    const finalContent = `${content}\n\n${hashtags.join(' ')}`;

    return {
      success: true,
      content: finalContent,
      rawContent: content,
      hashtags: hashtags,
      theme: contentType,
      wordCount: content.split(' ').length
    };

  } catch (error) {
    console.error('OpenAI content generation error:', error);
    return {
      success: false,
      error: error.message,
      fallbackContent: generateFallbackContent(userProfile, contentType)
    };
  }
};

// Generate relevant hashtags
const generateHashtags = async (businessType, city = 'Karachi') => {
  try {
    const baseHashtags = {
      restaurant: ['#PakistaniFood', '#Foodie', '#Restaurant', '#Desi', '#Halal'],
      retail: ['#Shopping', '#Fashion', '#Pakistan', '#Online', '#Sale'],
      salon: ['#Beauty', '#Salon', '#Makeup', '#Hair', '#Karachi'],
      gym: ['#Fitness', '#Gym', '#Workout', '#Health', '#Strong'],
      cafe: ['#Cafe', '#Coffee', '#Pakistan', '#Coffeetime', '#Cozy'],
      karyana: ['#Grocery', '#Fresh', '#HomeDelivery', '#Quality', '#Pakistan'],
      services: ['#Services', '#Professional', '#Quality', '#Pakistan', '#Trusted']
    };

    const businessHashtags = baseHashtags[businessType] || baseHashtags.services;
    const locationHashtags = [`#${city}`, '#Pakistan', '#Local'];
    const generalHashtags = ['#SmallBusiness', '#LocalBusiness', '#OnlineStore'];

    // Combine and randomize
    const allHashtags = [...businessHashtags, ...locationHashtags, ...generalHashtags];
    const selectedHashtags = allHashtags.slice(0, 8); // Limit to 8 hashtags

    return selectedHashtags;

  } catch (error) {
    console.error('Hashtag generation error:', error);
    return ['#Pakistan', '#Business', '#Quality', '#Local'];
  }
};

// Generate video content script
const generateVideoScript = async (userProfile, duration = 30) => {
  try {
    const businessType = userProfile.businessType || 'services';
    const businessName = userProfile.businessName || userProfile.name;

    const prompt = `Create a ${duration}-second video script for ${businessName}, a ${businessType} business in Pakistan.

Requirements:
- Duration: ${duration} seconds
- Language: Mix of English and Urdu (Roman)
- Include visual cues
- Make it engaging and professional
- Add background music suggestions
- Include call-to-action
- Mention online store/contact info
- Keep Pakistani audience in mind

Format the response as:
SCENE 1 (0-10s): [Visual description] - [Dialogue/Text]
SCENE 2 (10-20s): [Visual description] - [Dialogue/Text]
SCENE 3 (20-30s): [Visual description] - [Dialogue/Text]

Background Music: [Suggestion]
Text Overlays: [Key messages]
Call-to-Action: [Final CTA]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a video marketing expert creating scripts for Pakistani businesses. Focus on local culture, values, and effective storytelling."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const script = completion.choices[0]?.message?.content?.trim();

    return {
      success: true,
      script: script,
      duration: duration,
      businessType: businessType
    };

  } catch (error) {
    console.error('Video script generation error:', error);
    return {
      success: false,
      error: error.message,
      fallbackScript: generateFallbackVideoScript(userProfile, duration)
    };
  }
};

// Generate SEO optimized content
const generateSEOContent = async (userProfile, seoLevel = 'basic') => {
  try {
    const businessType = userProfile.businessType || 'services';
    const businessName = userProfile.businessName || userProfile.name;
    const city = userProfile.address?.city || 'Karachi';

    let prompt;

    if (seoLevel === 'advanced') {
      prompt = `Generate advanced SEO content for ${businessName}, a ${businessType} in ${city}, Pakistan.

Include:
1. Primary keywords research for ${businessType} in ${city}
2. Long-tail keywords
3. Local SEO keywords
4. Meta title (under 60 characters)
5. Meta description (under 160 characters)
6. 10 trending hashtags
7. Content suggestions for better ranking
8. Local search optimization tips

Focus on Pakistani market and local search behavior.`;
    } else {
      prompt = `Generate basic SEO content for ${businessName}, a ${businessType} in ${city}, Pakistan.

Include:
1. 5 main keywords
2. Meta title
3. Meta description
4. 5 relevant hashtags
5. One content suggestion

Keep it simple and effective for local business.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an SEO expert specializing in Pakistani local businesses. Provide actionable SEO recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: seoLevel === 'advanced' ? 800 : 400,
      temperature: 0.6,
    });

    const seoContent = completion.choices[0]?.message?.content?.trim();

    return {
      success: true,
      seoContent: seoContent,
      level: seoLevel,
      businessType: businessType
    };

  } catch (error) {
    console.error('SEO content generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate customer service responses (for AI chatbot)
const generateChatbotResponse = async (customerMessage, businessContext) => {
  try {
    const prompt = `You are a helpful customer service representative for ${businessContext.businessName}, a ${businessContext.businessType} business in Pakistan.

Customer Message: "${customerMessage}"

Business Info:
- Name: ${businessContext.businessName}
- Type: ${businessContext.businessType}
- Location: ${businessContext.city || 'Karachi'}
- Contact: ${businessContext.phone || 'Available on website'}

Respond in a helpful, professional, and friendly manner. Use mix of English and Roman Urdu as appropriate. Provide accurate information and be genuinely helpful. If you don't know something, politely direct them to contact directly.

Keep response under 150 words.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional customer service representative for Pakistani businesses. Be helpful, courteous, and culturally appropriate."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content?.trim();

    return {
      success: true,
      response: response,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Chatbot response generation error:', error);
    return {
      success: false,
      error: error.message,
      fallbackResponse: "Shukria aapke message ke liye! Humara team aapko jaldi respond karega. Koi urgent query hai to please direct call karen."
    };
  }
};

// Fallback content generators
const generateFallbackContent = (userProfile, contentType) => {
  const businessName = userProfile.businessName || userProfile.name;
  
  const fallbacks = {
    promotional: `🌟 ${businessName} mein aaye! Quality products aur best service guaranteed! 📞 Contact kren aur special offers payen. #Pakistan #Quality #LocalBusiness`,
    educational: `💡 Tips aur advice sirf ${businessName} se! Humara experience aapke kaam aaye ga. Visit karen aur faida uthayen! #Tips #Expert #Advice`,
    behind_scenes: `👥 ${businessName} ki team hard work kar rahi hai aapke liye! Dekhen humara dedication aur quality standards. #TeamWork #Quality #Behind_Scenes`
  };

  return fallbacks[contentType] || fallbacks.promotional;
};

const generateFallbackVideoScript = (userProfile, duration) => {
  const businessName = userProfile.businessName || userProfile.name;
  
  return `SCENE 1 (0-10s): Close-up of business logo/storefront - "${businessName} mein aapka swagat hai!"
SCENE 2 (10-20s): Product/service showcase - "Quality aur trust ka naam hai ${businessName}"
SCENE 3 (20-${duration}s): Contact information display - "Abhi contact karen aur special offers payen!"

Background Music: Upbeat Pakistani instrumental
Text Overlays: "Quality Guaranteed", "Contact Now"
Call-to-Action: "Call now or visit our store!"`;
};

// Check if OpenAI API is working
const checkOpenAIStatus = async () => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Hello, this is a test message."
        }
      ],
      max_tokens: 10,
    });

    return {
      success: true,
      status: 'operational',
      model: 'gpt-3.5-turbo'
    };

  } catch (error) {
    console.error('OpenAI status check failed:', error);
    return {
      success: false,
      status: 'error',
      error: error.message
    };
  }
};

module.exports = {
  generatePostContent,
  generateHashtags,
  generateVideoScript,
  generateSEOContent,
  generateChatbotResponse,
  checkOpenAIStatus
};
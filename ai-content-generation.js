/**
 * AI-Powered Content Generation and Sentiment Analysis for Monetixra
 * Features: AI content generation, sentiment analysis, trend prediction, content optimization
 */

const AIContentGeneration = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
    GOOGLE_VISION_KEY: process.env.GOOGLE_VISION_KEY || '',
    CONTENT_GENERATION_ENABLED: true,
    SENTIMENT_ANALYSIS_ENABLED: true,
    TREND_PREDICTION_ENABLED: true
  };

  // State
  let generatedContentCache = new Map();
  let sentimentCache = new Map();
  let trendCache = new Map();

  // ── AI Content Generation ───────────────────────────────────────────────────

  /**
   * Generate AI-powered post caption
   * @param {object} options - Generation options
   */
  async function generateCaption(options = {}) {
    try {
      const {
        topic = '',
        tone = 'engaging',
        length = 'medium',
        platform = 'social',
        language = 'english',
        hashtags = true
      } = options;

      // Check cache
      const cacheKey = `caption:${topic}:${tone}:${length}:${language}`;
      if (generatedContentCache.has(cacheKey)) {
        return generatedContentCache.get(cacheKey);
      }

      // Generate caption using AI
      const prompt = `Generate a ${tone} ${length} social media caption about ${topic}. Make it ${platform}-friendly and include ${hashtags ? 'relevant hashtags' : 'no hashtags'}. Language: ${language}.`;

      const caption = await callAIAPI(prompt);
      
      if (caption) {
        generatedContentCache.set(cacheKey, caption);
      }

      console.log('[AI Content] Caption generated:', topic);
      return caption;
    } catch (error) {
      console.error('[AI Content] Caption generation failed:', error);
      return null;
    }
  }

  /**
   * Generate AI-powered hashtags
   * @param {string} content - Content to analyze
   * @param {number} count - Number of hashtags
   */
  async function generateHashtags(content, count = 10) {
    try {
      const prompt = `Generate ${count} relevant and trending hashtags for this content: "${content}". Make them lowercase and remove spaces.`;

      const hashtags = await callAIAPI(prompt);
      
      if (hashtags) {
        const hashtagArray = hashtags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.startsWith('#'))
          .slice(0, count);

        return hashtagArray;
      }

      return [];
    } catch (error) {
      console.error('[AI Content] Hashtag generation failed:', error);
      return [];
    }
  }

  /**
   * Generate AI-powered image prompt
   * @param {string} description - Image description
   * @param {string} style - Image style
   */
  async function generateImagePrompt(description, style = 'realistic') {
    try {
      const prompt = `Generate a detailed AI image generation prompt for: "${description}". Style: ${style}. Include details about lighting, composition, and mood.`;

      const imagePrompt = await callAIAPI(prompt);
      
      console.log('[AI Content] Image prompt generated');
      return imagePrompt;
    } catch (error) {
      console.error('[AI Content] Image prompt generation failed:', error);
      return null;
    }
  }

  /**
   * Generate AI-powered video script
   * @param {string} topic - Video topic
   * @param {number} duration - Video duration in minutes
   */
  async function generateVideoScript(topic, duration = 5) {
    try {
      const prompt = `Generate a ${duration}-minute video script about "${topic}". Include intro, main content, and conclusion. Add visual cues and timing markers.`;

      const script = await callAIAPI(prompt);
      
      console.log('[AI Content] Video script generated');
      return script;
    } catch (error) {
      console.error('[AI Content] Video script generation failed:', error);
      return null;
    }
  }

  /**
   * Generate AI-powered response to comment
   * @param {string} comment - User comment
   * @param {string} context - Post context
   */
  async function generateCommentResponse(comment, context = '') {
    try {
      const prompt = `Generate a helpful and engaging response to this comment: "${comment}". Context: "${context}". Keep it friendly and concise.`;

      const response = await callAIAPI(prompt);
      
      console.log('[AI Content] Comment response generated');
      return response;
    } catch (error) {
      console.error('[AI Content] Comment response generation failed:', error);
      return null;
    }
  }

  /**
   * Optimize content for engagement
   * @param {string} content - Content to optimize
   * @param {string} platform - Target platform
   */
  async function optimizeContent(content, platform = 'social') {
    try {
      const prompt = `Optimize this content for maximum engagement on ${platform}: "${content}". Improve clarity, add emotional hooks, and include a call-to-action.`;

      const optimized = await callAIAPI(prompt);
      
      console.log('[AI Content] Content optimized');
      return optimized;
    } catch (error) {
      console.error('[AI Content] Content optimization failed:', error);
      return null;
    }
  }

  // ── Sentiment Analysis ───────────────────────────────────────────────────────

  /**
   * Analyze sentiment of text
   * @param {string} text - Text to analyze
   */
  async function analyzeSentiment(text) {
    try {
      if (!CONFIG.SENTIMENT_ANALYSIS_ENABLED) {
        return null;
      }

      // Check cache
      const cacheKey = `sentiment:${text.substring(0, 50)}`;
      if (sentimentCache.has(cacheKey)) {
        return sentimentCache.get(cacheKey);
      }

      const prompt = `Analyze the sentiment of this text: "${text}". Return JSON with sentiment (positive/negative/neutral), confidence (0-1), and emotions (array of emotions with scores).`;

      const analysis = await callAIAPI(prompt);
      
      if (analysis) {
        try {
          const parsed = JSON.parse(analysis);
          sentimentCache.set(cacheKey, parsed);
          return parsed;
        } catch (e) {
          // Fallback to simple analysis
          const simpleAnalysis = {
            sentiment: analyzeSimpleSentiment(text),
            confidence: 0.7,
            emotions: ['neutral']
          };
          sentimentCache.set(cacheKey, simpleAnalysis);
          return simpleAnalysis;
        }
      }

      return null;
    } catch (error) {
      console.error('[AI Content] Sentiment analysis failed:', error);
      return null;
    }
  }

  /**
   * Simple sentiment analysis (fallback)
   * @param {string} text - Text to analyze
   */
  function analyzeSimpleSentiment(text) {
    const positiveWords = ['good', 'great', 'awesome', 'love', 'happy', 'excellent', 'amazing', 'wonderful', 'fantastic', 'brilliant'];
    const negativeWords = ['bad', 'terrible', 'hate', 'sad', 'awful', 'horrible', 'disappointing', 'poor', 'worst', 'disgusting'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  /**
   * Analyze sentiment of post comments
   * @param {array} comments - Array of comments
   */
  async function analyzeCommentsSentiment(comments) {
    try {
      const sentiments = [];
      
      for (const comment of comments) {
        const sentiment = await analyzeSentiment(comment.text || comment);
        if (sentiment) {
          sentiments.push({
            commentId: comment.id,
            sentiment: sentiment.sentiment,
            confidence: sentiment.confidence,
            emotions: sentiment.emotions
          });
        }
      }

      // Calculate overall sentiment
      const positiveCount = sentiments.filter(s => s.sentiment === 'positive').length;
      const negativeCount = sentiments.filter(s => s.sentiment === 'negative').length;
      const neutralCount = sentiments.filter(s => s.sentiment === 'neutral').length;

      const overallSentiment = positiveCount > negativeCount ? 'positive' : 
                             negativeCount > positiveCount ? 'negative' : 'neutral';

      return {
        comments: sentiments,
        overall: overallSentiment,
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount
      };
    } catch (error) {
      console.error('[AI Content] Comments sentiment analysis failed:', error);
      return null;
    }
  }

  /**
   * Detect emotions in text
   * @param {string} text - Text to analyze
   */
  async function detectEmotions(text) {
    try {
      const prompt = `Detect emotions in this text: "${text}". Return JSON with detected emotions (joy, sadness, anger, fear, surprise, disgust) and their confidence scores (0-1).`;

      const emotions = await callAIAPI(prompt);
      
      if (emotions) {
        try {
          return JSON.parse(emotions);
        } catch (e) {
          return { emotions: ['neutral'], confidence: 0.5 };
        }
      }

      return null;
    } catch (error) {
      console.error('[AI Content] Emotion detection failed:', error);
      return null;
    }
  }

  // ── Trend Prediction ────────────────────────────────────────────────────────

  /**
   * Predict trending topics
   * @param {string} category - Content category
   * @param {number} count - Number of predictions
   */
  async function predictTrendingTopics(category = '', count = 5) {
    try {
      if (!CONFIG.TREND_PREDICTION_ENABLED) {
        return [];
      }

      // Check cache
      const cacheKey = `trends:${category}:${count}`;
      if (trendCache.has(cacheKey)) {
        return trendCache.get(cacheKey);
      }

      const prompt = `Predict ${count} trending topics for ${category || 'social media'} in the next 7 days. Consider current events, seasons, and viral patterns. Return as JSON array.`;

      const trends = await callAIAPI(prompt);
      
      if (trends) {
        try {
          const parsed = JSON.parse(trends);
          trendCache.set(cacheKey, parsed);
          return parsed;
        } catch (e) {
          // Fallback to mock trends
          const mockTrends = [
            { topic: 'AI Technology', growth: 85, timeframe: '7 days' },
            { topic: 'Sustainable Living', growth: 72, timeframe: '7 days' },
            { topic: 'Digital Wellness', growth: 68, timeframe: '7 days' },
            { topic: 'Remote Work', growth: 65, timeframe: '7 days' },
            { topic: 'Crypto Gaming', growth: 62, timeframe: '7 days' }
          ];
          trendCache.set(cacheKey, mockTrends);
          return mockTrends;
        }
      }

      return [];
    } catch (error) {
      console.error('[AI Content] Trend prediction failed:', error);
      return [];
    }
  }

  /**
   * Predict content performance
   * @param {object} content - Content data
   */
  async function predictContentPerformance(content) {
    try {
      const { caption, mediaType, hashtags, postingTime } = content;
      
      const prompt = `Predict the performance of this social media post based on these factors:
- Caption: "${caption}"
- Media Type: ${mediaType}
- Hashtags: ${hashtags?.join(', ') || 'none'}
- Posting Time: ${postingTime}

Return JSON with predicted engagement rate (0-100), reach, and performance score (0-100).`;

      const prediction = await callAIAPI(prompt);
      
      if (prediction) {
        try {
          return JSON.parse(prediction);
        } catch (e) {
          return {
            engagementRate: Math.floor(Math.random() * 30) + 10,
            reach: Math.floor(Math.random() * 10000) + 1000,
            performanceScore: Math.floor(Math.random() * 40) + 60
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[AI Content] Performance prediction failed:', error);
      return null;
    }
  }

  /**
   * Get optimal posting time
   * @param {string} audience - Target audience
   */
  async function getOptimalPostingTime(audience = 'general') {
    try {
      const prompt = `Suggest the optimal posting times for ${audience} audience on social media. Consider timezone patterns and user behavior. Return JSON with best times for each day of the week.`;

      const times = await callAIAPI(prompt);
      
      if (times) {
        try {
          return JSON.parse(times);
        } catch (e) {
          // Fallback to default times
          return {
            monday: ['9:00 AM', '12:00 PM', '7:00 PM'],
            tuesday: ['9:00 AM', '12:00 PM', '7:00 PM'],
            wednesday: ['9:00 AM', '12:00 PM', '7:00 PM'],
            thursday: ['9:00 AM', '12:00 PM', '7:00 PM'],
            friday: ['9:00 AM', '12:00 PM', '8:00 PM'],
            saturday: ['10:00 AM', '2:00 PM', '9:00 PM'],
            sunday: ['10:00 AM', '2:00 PM', '9:00 PM']
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[AI Content] Optimal time calculation failed:', error);
      return null;
    }
  }

  // ── Content Suggestions ─────────────────────────────────────────────────────

  /**
   * Get content suggestions based on user interests
   * @param {array} interests - User interests
   * @param {number} count - Number of suggestions
   */
  async function getContentSuggestions(interests, count = 10) {
    try {
      const prompt = `Generate ${count} content ideas based on these interests: ${interests.join(', ')}. Make them diverse and engaging. Return as JSON array with topic, type, and description.`;

      const suggestions = await callAIAPI(prompt);
      
      if (suggestions) {
        try {
          return JSON.parse(suggestions);
        } catch (e) {
          // Fallback to mock suggestions
          return interests.map(interest => ({
            topic: interest,
            type: 'post',
            description: `Share your thoughts about ${interest}`
          }));
        }
      }

      return [];
    } catch (error) {
      console.error('[AI Content] Content suggestions failed:', error);
      return [];
    }
  }

  /**
   * Get content improvement suggestions
   * @param {string} content - Content to improve
   */
  async function getContentImprovements(content) {
    try {
      const prompt = `Analyze this content and suggest 5 specific improvements: "${content}". Focus on engagement, clarity, and viral potential. Return as JSON array with suggestion and reason.`;

      const improvements = await callAIAPI(prompt);
      
      if (improvements) {
        try {
          return JSON.parse(improvements);
        } catch (e) {
          return [
            { suggestion: 'Add more emojis', reason: 'Increases visual appeal' },
            { suggestion: 'Include a question', reason: 'Encourages engagement' },
            { suggestion: 'Use trending hashtags', reason: 'Increases discoverability' },
            { suggestion: 'Add a call-to-action', reason: 'Drives user action' },
            { suggestion: 'Shorten the caption', reason: 'Improves readability' }
          ];
        }
      }

      return [];
    } catch (error) {
      console.error('[AI Content] Improvement suggestions failed:', error);
      return [];
    }
  }

  // ── AI API Integration ───────────────────────────────────────────────────────

  /**
   * Call AI API (OpenAI or DeepSeek)
   * @param {string} prompt - AI prompt
   */
  async function callAIAPI(prompt) {
    try {
      const _fetchFn = (typeof window !== 'undefined' && window.fetch) ? window.fetch.bind(window) : (typeof require !== 'undefined' ? require('node-fetch') : null);
      if (!_fetchFn) throw new Error('Fetch API not available');
      
      // Try OpenAI first
      if (CONFIG.OPENAI_API_KEY) {
        const response = await _fetchFn('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a helpful AI assistant for social media content generation.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7
          })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
          return data.choices[0].message.content;
        }
      }

      // Fallback to DeepSeek
      if (CONFIG.DEEPSEEK_API_KEY) {
        const response = await _fetchFn('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'You are a helpful AI assistant for social media content generation.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7
          })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
          return data.choices[0].message.content;
        }
      }

      return null;
    } catch (error) {
      console.error('[AI Content] API call failed:', error);
      return null;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Content Generation
    generateCaption: generateCaption,
    generateHashtags: generateHashtags,
    generateImagePrompt: generateImagePrompt,
    generateVideoScript: generateVideoScript,
    generateCommentResponse: generateCommentResponse,
    optimizeContent: optimizeContent,
    
    // Sentiment Analysis
    analyzeSentiment: analyzeSentiment,
    analyzeCommentsSentiment: analyzeCommentsSentiment,
    detectEmotions: detectEmotions,
    
    // Trend Prediction
    predictTrends: predictTrendingTopics,
    predictPerformance: predictContentPerformance,
    getOptimalTime: getOptimalPostingTime,
    
    // Content Suggestions
    getContentSuggestions: getContentSuggestions,
    getContentImprovements: getContentImprovements,
    
    // State
    clearCache: () => {
      generatedContentCache.clear();
      sentimentCache.clear();
      trendCache.clear();
    },
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIContentGeneration;
}

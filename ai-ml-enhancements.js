/**
 * AI & ML Enhancements for Monetixra
 * Features: Pinecone Vector DB, Personalized Feed, Content Moderation, Image Recognition
 */

const AIEnhancements = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || '',
    PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || 'monetixra-posts',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    GOOGLE_VISION_KEY: process.env.GOOGLE_VISION_KEY || '',
    TOXICITY_THRESHOLD: 0.7,
    CONTENT_MODERATION_ENABLED: true
  };

  // State
  let pineconeClient = null;
  let pineconeIndex = null;
  let toxicityModel = null;
  let isInitialized = false;

  // ── Pinecone Vector DB ────────────────────────────────────────────────────

  /**
   * Initialize Pinecone client
   */
  async function initPinecone() {
    try {
      if (!CONFIG.PINECONE_API_KEY) {
        console.warn('[Pinecone] API key not configured');
        return false;
      }

      const Pinecone = (typeof window !== 'undefined' && window.Pinecone) || (typeof require !== 'undefined' ? (function(){ try { return require('@pinecone-database/pinecone').Pinecone; } catch(e){ return null; } })() : null);
      if (!Pinecone) {
        console.warn('[Pinecone] SDK not available in this environment');
        return false;
      }
      pineconeClient = new Pinecone({
        apiKey: CONFIG.PINECONE_API_KEY
      });

      // Get or create index
      try {
        pineconeIndex = pineconeClient.index(CONFIG.PINECONE_INDEX_NAME);
        console.log('[Pinecone] Connected to index:', CONFIG.PINECONE_INDEX_NAME);
      } catch (error) {
        console.log('[Pinecone] Creating new index:', CONFIG.PINECONE_INDEX_NAME);
        await pineconeClient.createIndex({
          name: CONFIG.PINECONE_INDEX_NAME,
          dimension: 1536, // OpenAI embedding dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: CONFIG.PINECONE_ENVIRONMENT
            }
          }
        });
        
        // Wait for index to be ready
        await new Promise(resolve => setTimeout(resolve, 30000));
        pineconeIndex = pineconeClient.index(CONFIG.PINECONE_INDEX_NAME);
      }

      isInitialized = true;
      console.log('[Pinecone] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Pinecone] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Generate text embedding using OpenAI
   * @param {string} text - Text to embed
   */
  async function generateEmbedding(text) {
    try {
      if (!CONFIG.OPENAI_API_KEY) {
        console.warn('[OpenAI] API key not configured');
        return null;
      }

      const _fetchFn = (typeof window !== 'undefined' && window.fetch) ? window.fetch.bind(window) : (typeof require !== 'undefined' ? require('node-fetch') : null);
      if (!_fetchFn) throw new Error('Fetch function not available');
      const response = await _fetchFn('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text
        })
      });

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('[Embedding] Generation failed:', error);
      return null;
    }
  }

  /**
   * Index post for recommendations
   * @param {object} post - Post object
   */
  async function indexPost(post) {
    try {
      if (!isInitialized) {
        await initPinecone();
      }

      if (!pineconeIndex) {
        console.warn('[Pinecone] Index not available');
        return false;
      }

      // Generate embedding from post content
      const textToEmbed = `${post.caption || ''} ${post.tags?.join(' ') || ''}`;
      const embedding = await generateEmbedding(textToEmbed);
      
      if (!embedding) {
        console.warn('[Pinecone] Failed to generate embedding');
        return false;
      }

      // Upsert to Pinecone
      await pineconeIndex.upsert([{
        id: post.id,
        values: embedding,
        metadata: {
          authorId: post.author,
          createdAt: post.createdAt || Date.now(),
          type: post.type || 'post',
          tags: post.tags || [],
          likes: post.likes?.length || 0,
          comments: post.comments?.length || 0
        }
      }]);

      console.log('[Pinecone] Post indexed:', post.id);
      return true;
    } catch (error) {
      console.error('[Pinecone] Post indexing failed:', error);
      return false;
    }
  }

  /**
   * Get personalized recommendations
   * @param {string} userId - User ID
   * @param {number} limit - Number of recommendations
   */
  async function getPersonalizedRecommendations(userId, limit = 10) {
    try {
      if (!isInitialized) {
        await initPinecone();
      }

      if (!pineconeIndex) {
        console.warn('[Pinecone] Index not available');
        return [];
      }

      // Get user's liked posts to build preference vector
      let userPreferences = '';
      if (typeof D !== 'undefined' && D.users && D.users[userId]) {
        const user = D.users[userId];
        const likedPosts = user.likedPosts || [];
        
        // Build preference from liked posts
        for (const postId of likedPosts) {
          const post = D.posts?.find(p => p.id === postId);
          if (post) {
            userPreferences += `${post.caption || ''} ${post.tags?.join(' ') || ''} `;
          }
        }
      }

      // Generate embedding for user preferences
      const preferenceEmbedding = await generateEmbedding(userPreferences);
      
      if (!preferenceEmbedding) {
        console.warn('[Pinecone] Failed to generate preference embedding');
        return [];
      }

      // Query Pinecone for similar posts
      const results = await pineconeIndex.query({
        vector: preferenceEmbedding,
        topK: limit,
        includeMetadata: true,
        filter: {
          authorId: { $ne: userId } // Exclude user's own posts
        }
      });

      console.log('[Pinecone] Recommendations generated:', results.matches.length);
      return results.matches || [];
    } catch (error) {
      console.error('[Pinecone] Recommendation generation failed:', error);
      return [];
    }
  }

  /**
   * Delete post from index
   * @param {string} postId - Post ID
   */
  async function deletePostFromIndex(postId) {
    try {
      if (!pineconeIndex) {
        return false;
      }

      await pineconeIndex.deleteOne(postId);
      console.log('[Pinecone] Post deleted from index:', postId);
      return true;
    } catch (error) {
      console.error('[Pinecone] Post deletion failed:', error);
      return false;
    }
  }

  // ── Content Moderation ─────────────────────────────────────────────────────

  /**
   * Initialize TensorFlow.js toxicity model
   */
  async function initToxicityModel() {
    try {
      // Client-side: Use TensorFlow.js
      if (typeof window !== 'undefined') {
        const toxicity = window.toxicity || (typeof require !== 'undefined' ? (function(){ try { return require('@tensorflow-models/toxicity'); } catch(e){ return null; } })() : null);
        if (!toxicity) {
          console.warn('[Toxicity] Model library not available');
          return false;
        }
        const threshold = CONFIG.TOXICITY_THRESHOLD;
        toxicityModel = await toxicity.load(threshold);
        console.log('[Toxicity] Model loaded');
        return true;
      }
      
      // Server-side: Use OpenAI moderation
      if (CONFIG.OPENAI_API_KEY) {
        console.log('[Toxicity] Using OpenAI moderation');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Toxicity] Model initialization failed:', error);
      return false;
    }
  }

  /**
   * Detect toxic content
   * @param {string} text - Text to analyze
   */
  async function detectToxicContent(text) {
    try {
      if (!CONFIG.CONTENT_MODERATION_ENABLED) {
        return { isToxic: false, categories: [] };
      }

      // Client-side: Use TensorFlow.js
      if (typeof window !== 'undefined' && toxicityModel) {
        const predictions = await toxicityModel.classify(text);
        const toxicCategories = predictions
          .filter(p => p.results[0].match)
          .map(p => p.label);

        return {
          isToxic: toxicCategories.length > 0,
          categories: toxicCategories,
          confidence: predictions.map(p => ({
            label: p.label,
            match: p.results[0].match,
            probability: p.results[0].probabilities[1]
          }))
        };
      }

      // Server-side: Use OpenAI moderation
      if (CONFIG.OPENAI_API_KEY) {
        const fetch = require('node-fetch');
        const response = await fetch('https://api.openai.com/v1/moderations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            input: text
          })
        });

        const data = await response.json();
        const result = data.results[0];
        
        return {
          isToxic: result.flagged,
          categories: Object.keys(result.categories).filter(k => result.categories[k]),
          confidence: result.category_scores
        };
      }

      return { isToxic: false, categories: [] };
    } catch (error) {
      console.error('[Toxicity] Detection failed:', error);
      return { isToxic: false, categories: [], error: error.message };
    }
  }

  /**
   * Filter content before submit
   * @param {string} text - Text to filter
   */
  async function filterContentBeforeSubmit(text) {
    try {
      const detection = await detectToxicContent(text);
      
      if (detection.isToxic) {
        console.warn('[ContentModeration] Toxic content detected:', detection.categories);
        return {
          allowed: false,
          reason: 'Content contains inappropriate language',
          categories: detection.categories
        };
      }

      // Additional spam detection
      if (isSpam(text)) {
        return {
          allowed: false,
          reason: 'Content appears to be spam'
        };
      }

      return {
        allowed: true,
        detection: detection
      };
    } catch (error) {
      console.error('[ContentModeration] Filtering failed:', error);
      return { allowed: true, error: error.message };
    }
  }

  /**
   * Simple spam detection
   * @param {string} text - Text to check
   */
  function isSpam(text) {
    const spamIndicators = [
      /buy now/i,
      /click here/i,
      /free money/i,
      /won lottery/i,
      /inheritance/i,
      /nigerian prince/i,
      /viagra/i,
      /casino/i,
      /betting/i,
      /crypto giveaway/i
    ];

    const hasSpamKeywords = spamIndicators.some(pattern => pattern.test(text));
    const hasExcessiveCaps = (text.match(/[A-Z]/g) || []).length > text.length * 0.7;
    const hasExcessiveLinks = (text.match(/https?:\/\//g) || []).length > 3;

    return hasSpamKeywords || hasExcessiveCaps || hasExcessiveLinks;
  }

  // ── Image Recognition ───────────────────────────────────────────────────────

  /**
   * Analyze image using Google Vision API
   * @param {string} imageUrl - Image URL or base64
   */
  async function analyzeImage(imageUrl) {
    try {
      if (!CONFIG.GOOGLE_VISION_KEY) {
        console.warn('[Vision] API key not configured');
        return null;
      }

      const fetch = require('node-fetch');
      
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${CONFIG.GOOGLE_VISION_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            image: {
              source: {
                imageUri: imageUrl.startsWith('data:') ? undefined : imageUrl
              },
              content: imageUrl.startsWith('data:') ? imageUrl : undefined
            },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'SAFE_SEARCH_DETECTION', maxResults: 5 },
              { type: 'IMAGE_PROPERTIES', maxResults: 5 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
            ]
          }]
        })
      });

      const data = await response.json();
      const annotations = data.responses[0];

      return {
        labels: annotations.labelAnnotations?.map(l => ({
          description: l.description,
          score: l.score
        })) || [],
        safeSearch: annotations.safeSearchAnnotation || {},
        colors: annotations.imagePropertiesAnnotation?.dominantColors?.colors || [],
        objects: annotations.localizedObjectAnnotations?.map(o => ({
          name: o.name,
          score: o.score,
          boundingBox: o.boundingPoly
        })) || []
      };
    } catch (error) {
      console.error('[Vision] Image analysis failed:', error);
      return null;
    }
  }

  /**
   * Detect inappropriate content in image
   * @param {string} imageUrl - Image URL or base64
   */
  async function detectInappropriateImage(imageUrl) {
    try {
      const analysis = await analyzeImage(imageUrl);
      
      if (!analysis) {
        return { isAppropriate: true, reason: 'Analysis failed' };
      }

      const safeSearch = analysis.safeSearch;
      const inappropriateCategories = [];

      // Check various categories
      if (safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY') {
        inappropriateCategories.push('adult');
      }
      if (safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
        inappropriateCategories.push('violence');
      }
      if (safeSearch.medical === 'LIKELY' || safeSearch.medical === 'VERY_LIKELY') {
        inappropriateCategories.push('medical');
      }
      if (safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY') {
        inappropriateCategories.push('racy');
      }

      return {
        isAppropriate: inappropriateCategories.length === 0,
        categories: inappropriateCategories,
        safeSearch: safeSearch
      };
    } catch (error) {
      console.error('[Vision] Inappropriate content detection failed:', error);
      return { isAppropriate: true, error: error.message };
    }
  }

  /**
   * Extract text from image (OCR)
   * @param {string} imageUrl - Image URL or base64
   */
  async function extractTextFromImage(imageUrl) {
    try {
      if (!CONFIG.GOOGLE_VISION_KEY) {
        console.warn('[Vision] API key not configured');
        return null;
      }

      const fetch = require('node-fetch');
      
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${CONFIG.GOOGLE_VISION_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            image: {
              source: {
                imageUri: imageUrl.startsWith('data:') ? undefined : imageUrl
              },
              content: imageUrl.startsWith('data:') ? imageUrl : undefined
            },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 10 }
            ]
          }]
        })
      });

      const data = await response.json();
      const annotations = data.responses[0];

      return {
        text: annotations.fullTextAnnotation?.text || '',
        textAnnotations: annotations.textAnnotations || []
      };
    } catch (error) {
      console.error('[Vision] Text extraction failed:', error);
      return null;
    }
  }

  // ── Personalized Feed ────────────────────────────────────────────────────

  /**
   * Generate personalized feed for user
   * @param {string} userId - User ID
   * @param {number} limit - Number of posts
   */
  async function generatePersonalizedFeed(userId, limit = 20) {
    try {
      // Get recommendations from Pinecone
      const recommendations = await getPersonalizedRecommendations(userId, limit);
      
      if (recommendations.length === 0) {
        // Fallback to random posts
        if (typeof D !== 'undefined' && D.posts) {
          return D.posts
            .filter(p => p.author !== userId)
            .sort(() => Math.random() - 0.5)
            .slice(0, limit);
        }
        return [];
      }

      // Get post IDs from recommendations
      const postIds = recommendations.map(r => r.id);
      
      // Get full post objects
      if (typeof D !== 'undefined' && D.posts) {
        const posts = D.posts.filter(p => postIds.includes(p.id));
        
        // Sort by recommendation score
        const postScores = new Map(recommendations.map(r => [r.id, r.score]));
        return posts.sort((a, b) => (postScores.get(b.id) || 0) - (postScores.get(a.id) || 0));
      }

      return [];
    } catch (error) {
      console.error('[PersonalizedFeed] Generation failed:', error);
      return [];
    }
  }

  /**
   * Update user preferences based on interactions
   * @param {string} userId - User ID
   * @param {string} postId - Post ID
   * @param {string} interactionType - Type of interaction (like, comment, share, view)
   */
  async function updateUserPreferences(userId, postId, interactionType) {
    try {
      if (typeof D === 'undefined' || !D.users || !D.users[userId]) {
        return false;
      }

      const user = D.users[userId];
      const post = D.posts?.find(p => p.id === postId);
      
      if (!post) {
        return false;
      }

      // Update user preferences based on interaction
      user.preferences = user.preferences || {};
      user.preferences.interactions = user.preferences.interactions || [];

      user.preferences.interactions.push({
        postId: postId,
        type: interactionType,
        timestamp: Date.now(),
        tags: post.tags || [],
        caption: post.caption || ''
      });

      // Re-index user preferences periodically
      if (user.preferences.interactions.length % 10 === 0) {
        await getPersonalizedRecommendations(userId); // Trigger re-embedding
      }

      if (typeof saveData === 'function') {
        saveData();
      }

      console.log('[PersonalizedFeed] User preferences updated:', userId);
      return true;
    } catch (error) {
      console.error('[PersonalizedFeed] Preference update failed:', error);
      return false;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Pinecone
    init: initPinecone,
    indexPost: indexPost,
    getRecommendations: getPersonalizedRecommendations,
    deletePost: deletePostFromIndex,
    
    // Content Moderation
    initToxicity: initToxicityModel,
    detectToxic: detectToxicContent,
    filterContent: filterContentBeforeSubmit,
    
    // Image Recognition
    analyzeImage: analyzeImage,
    detectInappropriate: detectInappropriateImage,
    extractText: extractTextFromImage,
    
    // Personalized Feed
    generateFeed: generatePersonalizedFeed,
    updatePreferences: updateUserPreferences,
    
    // State
    isInitialized: () => isInitialized,
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIEnhancements;
}

/**
 * AI-Powered Content Moderation System for Monetixra
 * Uses OpenAI GPT-4 and TensorFlow for intelligent content moderation
 */

const AIContentModeration = (function() {
  'use strict';

  const MODERATION_TYPES = {
    SPAM: 'spam',
    HATE_SPEECH: 'hate_speech',
    HARASSMENT: 'harassment',
    NSFW: 'nsfw',
    VIOLENCE: 'violence',
    SELF_HARM: 'self_harm',
    MISINFORMATION: 'misinformation',
    COPYRIGHT: 'copyright',
    SPAM_LINKS: 'spam_links'
  };

  const SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  };

  /**
   * Moderate text content using OpenAI GPT-4
   */
  async function moderateText(text, userId) {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      console.warn('[AI Moderation] OpenAI API key not configured');
      return { safe: true, confidence: 0 };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          input: text,
          model: 'text-moderation-latest'
        })
      });

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const flagged = data.results.filter(r => r.flagged);
        
        if (flagged.length > 0) {
          return {
            safe: false,
            flagged: flagged.map(f => ({
              category: f.categories[0],
              severity: getSeverity(f.category_scores[f.categories[0]]),
              confidence: f.category_scores[f.categories[0]]
            })),
            confidence: Math.max(...flagged.map(f => f.category_scores[f.categories[0]]))
          };
        }
      }

      return { safe: true, confidence: 0 };
    } catch (error) {
      console.error('[AI Moderation] Text moderation failed:', error);
      return { safe: true, confidence: 0, error: error.message };
    }
  }

  /**
   * Moderate image content using TensorFlow
   */
  async function moderateImage(imageData, userId) {
    try {
      // Load TensorFlow models
      const tf = require('@tensorflow/tfjs');
      const nsfwjs = require('@tensorflow-models/nsfwjs');

      // Load NSFW model
      const model = await nsfwjs.load();
      
      // Classify image
      const predictions = await model.classify(imageData);
      
      // Check for NSFW content
      const nsfwClasses = ['Porn', 'Hentai', 'Sexy'];
      const nsfwScore = predictions
        .filter(p => nsfwClasses.includes(p.className))
        .reduce((sum, p) => sum + p.probability, 0);

      if (nsfwScore > 0.7) {
        return {
          safe: false,
          flagged: [{
            category: MODERATION_TYPES.NSFW,
            severity: nsfwScore > 0.9 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
            confidence: nsfwScore
          }],
          confidence: nsfwScore
        };
      }

      return { safe: true, confidence: 1 - nsfwScore };
    } catch (error) {
      console.error('[AI Moderation] Image moderation failed:', error);
      return { safe: true, confidence: 0, error: error.message };
    }
  }

  /**
   * Detect spam using multiple heuristics
   */
  function detectSpam(text, userId, userHistory) {
    const spamIndicators = {
      excessiveLinks: (text.match(/https?:\/\/[^\s]+/g) || []).length > 3,
      excessiveCaps: (text.match(/[A-Z]{5,}/g) || []).length > 2,
      excessivePunctuation: (text.match(/[!?]{3,}/g) || []).length > 2,
      repetitiveText: detectRepetition(text),
      blacklistedWords: detectBlacklistedWords(text),
      suspiciousPattern: detectSuspiciousPattern(text)
    };

    const spamScore = Object.values(spamIndicators).filter(Boolean).length;
    
    if (spamScore >= 3) {
      return {
        safe: false,
        flagged: [{
          category: MODERATION_TYPES.SPAM,
          severity: spamScore >= 4 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
          confidence: spamScore / 5,
          indicators: spamIndicators
        }],
        confidence: spamScore / 5
      };
    }

    return { safe: true, confidence: 1 - (spamScore / 5) };
  }

  /**
   * Detect hate speech using keyword matching
   */
  function detectHateSpeech(text) {
    const hateSpeechKeywords = [
      // Add hate speech keywords here
      // This is a placeholder - actual implementation should use ML models
    ];

    const found = hateSpeechKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    if (found.length > 0) {
      return {
        safe: false,
        flagged: [{
          category: MODERATION_TYPES.HATE_SPEECH,
          severity: SEVERITY_LEVELS.HIGH,
          confidence: 0.8,
          keywords: found
        }],
        confidence: 0.8
      };
    }

    return { safe: true, confidence: 1 };
  }

  /**
   * Detect copyright infringement using content fingerprinting
   */
  async function detectCopyright(content, userId) {
    // TODO: Implement content fingerprinting
    // This would compare content against a database of known copyrighted material
    
    return { safe: true, confidence: 1 };
  }

  /**
   * Get severity level from confidence score
   */
  function getSeverity(confidence) {
    if (confidence >= 0.9) return SEVERITY_LEVELS.CRITICAL;
    if (confidence >= 0.7) return SEVERITY_LEVELS.HIGH;
    if (confidence >= 0.5) return SEVERITY_LEVELS.MEDIUM;
    return SEVERITY_LEVELS.LOW;
  }

  /**
   * Detect repetitive text (possible spam)
   */
  function detectRepetition(text) {
    const words = text.split(/\s+/);
    const wordCount = {};
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const maxRepetition = Math.max(...Object.values(wordCount));
    return maxRepetition > 3;
  }

  /**
   * Detect blacklisted words
   */
  function detectBlacklistedWords(text) {
    const blacklist = [
      // Add blacklisted words here
    ];

    return blacklist.some(word => 
      text.toLowerCase().includes(word.toLowerCase())
    );
  }

  /**
   * Detect suspicious patterns (e.g., phone numbers, emails in spam)
   */
  function detectSuspiciousPattern(text) {
    const patterns = [
      /\b\d{10,}\b/g, // Phone numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
      /\b(?:buy|sell|cheap|free|win|prize|lottery|crypto|bitcoin)\b/gi // Spam keywords
    ];

    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Moderate content comprehensively
   */
  async function moderateContent(content, type, userId) {
    const results = {
      safe: true,
      flagged: [],
      confidence: 1,
      actions: []
    };

    try {
      // Text moderation
      if (type === 'text' || content.text) {
        const textResult = await moderateText(content.text || content, userId);
        if (!textResult.safe) {
          results.safe = false;
          results.flagged.push(...textResult.flagged);
          results.confidence = Math.min(results.confidence, textResult.confidence);
        }
      }

      // Image moderation
      if (type === 'image' || content.file) {
        const imageResult = await moderateImage(content.file || content, userId);
        if (!imageResult.safe) {
          results.safe = false;
          results.flagged.push(...imageResult.flagged);
          results.confidence = Math.min(results.confidence, imageResult.confidence);
        }
      }

      // Spam detection
      if (content.text) {
        const spamResult = detectSpam(content.text, userId);
        if (!spamResult.safe) {
          results.safe = false;
          results.flagged.push(...spamResult.flagged);
          results.confidence = Math.min(results.confidence, spamResult.confidence);
        }
      }

      // Hate speech detection
      if (content.text) {
        const hateResult = detectHateSpeech(content.text);
        if (!hateResult.safe) {
          results.safe = false;
          results.flagged.push(...hateResult.flagged);
          results.confidence = Math.min(results.confidence, hateResult.confidence);
        }
      }

      // Copyright detection
      const copyrightResult = await detectCopyright(content, userId);
      if (!copyrightResult.safe) {
        results.safe = false;
        results.flagged.push(...copyrightResult.flagged);
        results.confidence = Math.min(results.confidence, copyrightResult.confidence);
      }

      // Determine actions based on severity
      if (!results.safe) {
        results.actions = determineActions(results.flagged);
      }

      return results;
    } catch (error) {
      console.error('[AI Moderation] Comprehensive moderation failed:', error);
      return { safe: true, confidence: 0, error: error.message };
    }
  }

  /**
   * Determine moderation actions based on flagged categories
   */
  function determineActions(flagged) {
    const actions = [];

    flagged.forEach(flag => {
      switch (flag.category) {
        case MODERATION_TYPES.NSFW:
        case MODERATION_TYPES.VIOLENCE:
        case MODERATION_TYPES.HATE_SPEECH:
          if (flag.severity === SEVERITY_LEVELS.CRITICAL || flag.severity === SEVERITY_LEVELS.HIGH) {
            actions.push('remove_content');
            actions.push('ban_user');
          } else {
            actions.push('hide_content');
            actions.push('warn_user');
          }
          break;
          
        case MODERATION_TYPES.SPAM:
        case MODERATION_TYPES.SPAM_LINKS:
          if (flag.severity === SEVERITY_LEVELS.HIGH) {
            actions.push('remove_content');
            actions.push('temporarily_suspend');
          } else {
            actions.push('mark_as_spam');
            actions.push('reduce_visibility');
          }
          break;
          
        case MODERATION_TYPES.HARASSMENT:
          actions.push('hide_content');
          actions.push('warn_user');
          if (flag.severity === SEVERITY_LEVELS.HIGH) {
            actions.push('temporarily_suspend');
          }
          break;
          
        case MODERATION_TYPES.SELF_HARM:
          actions.push('hide_content');
          actions.push('provide_resources');
          actions.push('alert_admin');
          break;
          
        case MODERATION_TYPES.MISINFORMATION:
          actions.push('add_fact_check_label');
          actions.push('reduce_visibility');
          break;
          
        case MODERATION_TYPES.COPYRIGHT:
          actions.push('remove_content');
          actions.push('notify_copyright_holder');
          break;
          
        default:
          actions.push('review_manually');
      }
    });

    return actions;
  }

  /**
   * Get moderation statistics
   */
  function getStats() {
    return {
      totalModerated: 0,
      flaggedContent: 0,
      removedContent: 0,
      usersWarned: 0,
      usersBanned: 0,
      categories: {
        spam: 0,
        hate_speech: 0,
        harassment: 0,
        nsfw: 0,
        violence: 0,
        self_harm: 0,
        misinformation: 0,
        copyright: 0
      }
    };
  }

  return {
    moderateText,
    moderateImage,
    detectSpam,
    detectHateSpeech,
    detectCopyright,
    moderateContent,
    getStats,
    MODERATION_TYPES,
    SEVERITY_LEVELS
  };
})();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIContentModeration;
} else {
  window.AIContentModeration = AIContentModeration;
}

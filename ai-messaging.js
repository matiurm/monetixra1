/**
 * ================================================================
 *  AI-POWERED MESSAGING SYSTEM (ENHANCED)
 *  Smart Replies | Auto Summary | Sentiment Analysis | Translation
 *  Voice Transcription | Spam Detection | Intent Recognition
 *  Context-Aware AI | Message Prioritization | Auto-Response
 * ================================================================
 */

const AIMessaging = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    version: '2.0.0',
    maxHistoryLength: 100,
    maxReplies: 5,
    enableSentiment: true,
    enableTranslation: true,
    enableSmartReplies: true,
    enableVoiceTranscription: true,
    enableSpamDetection: true,
    enableIntentRecognition: true,
    enableAutoResponse: true,
    enableMessagePrioritization: true,
    enableConversationMemory: true
  };

  // State
  let state = {
    apiKey: null,
    provider: 'openai', // 'openai' or 'anthropic'
    model: 'gpt-4-turbo-preview',
    chatHistory: new Map(),
    sentimentCache: new Map(),
    translationCache: new Map(),
    conversationMemory: new Map(),
    userPreferences: new Map(),
    spamScores: new Map(),
    intentHistory: new Map()
  };

  // ============================================
  // SMART REPLIES
  // ============================================

  async function getSmartReplies(chatId, lastMessage, context = {}) {
    try {
      if (!CONFIG.enableSmartReplies || !state.apiKey) {
        return [];
      }

      const history = getChatHistory(chatId);
      const recentMessages = history.slice(-10);

      const prompt = `
You are a helpful assistant suggesting reply options for a messaging app.
Context: User is in a chat conversation.
Last message: "${lastMessage}"
Recent conversation history:
${recentMessages.map(m => `${m.from === CU?.id ? 'You' : 'Other'}: ${m.text || m.message || '[Media]'}`).join('\n')}

Generate 3 short, natural, and helpful reply suggestions (max 20 words each).
Return as JSON array of strings.
Example: ["That sounds great!", "Let me check and get back to you", "Thanks for letting me know"]
`;

      const response = await callAI(prompt);
      const replies = parseJSONResponse(response);

      return replies.slice(0, CONFIG.maxReplies);
    } catch (error) {
      console.error('[AIMessaging] Smart replies failed:', error);
      return [];
    }
  }

  // ============================================
  // CONVERSATION SUMMARY
  // ============================================

  async function summarizeConversation(chatId, limit = 20) {
    try {
      const history = getChatHistory(chatId);
      if (history.length < 5) {
        return { summary: 'Not enough messages to summarize', keyPoints: [] };
      }

      const messages = history.slice(-limit);
      const conversation = messages.map(m =>
        `${m.from === CU?.id ? 'You' : 'Other'}: ${m.text || m.message || '[Media]'}`
      ).join('\n');

      const prompt = `
Summarize the following conversation in 2-3 sentences. Also extract 3-5 key points or action items.

Conversation:
${conversation}

Return as JSON:
{
  "summary": "2-3 sentence summary",
  "keyPoints": ["point 1", "point 2", ...]
}
`;

      const response = await callAI(prompt);
      const result = parseJSONResponse(response);

      return result;
    } catch (error) {
      console.error('[AIMessaging] Summary failed:', error);
      return { summary: 'Summary generation failed', keyPoints: [] };
    }
  }

  // ============================================
  // SENTIMENT ANALYSIS
  // ============================================

  async function analyzeSentiment(message) {
    try {
      if (!CONFIG.enableSentiment) {
        return { sentiment: 'neutral', confidence: 0.5 };
      }

      // Check cache
      const cacheKey = message.toLowerCase().trim();
      if (state.sentimentCache.has(cacheKey)) {
        return state.sentimentCache.get(cacheKey);
      }

      const prompt = `
Analyze the sentiment of the following message. Return as JSON:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0,
  "emotions": ["emotion1", "emotion2"],
  "intensity": "low|medium|high"
}

Message: "${message}"
`;

      const response = await callAI(prompt);
      const result = parseJSONResponse(response);

      // Cache result
      state.sentimentCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('[AIMessaging] Sentiment analysis failed:', error);
      return { sentiment: 'neutral', confidence: 0.5 };
    }
  }

  // ============================================
  // TRANSLATION
  // ============================================

  async function translateText(text, targetLanguage, sourceLanguage = 'auto') {
    try {
      if (!CONFIG.enableTranslation) {
        return text;
      }

      // Check cache
      const cacheKey = `${sourceLanguage}-${targetLanguage}-${text}`;
      if (state.translationCache.has(cacheKey)) {
        return state.translationCache.get(cacheKey);
      }

      const prompt = sourceLanguage === 'auto'
        ? `Translate the following text to ${targetLanguage}. Detect the source language automatically.`
        : `Translate the following text from ${sourceLanguage} to ${targetLanguage}.`;

      const fullPrompt = `${prompt}\n\nText: "${text}"\n\nReturn only the translated text, nothing else.`;

      const response = await callAI(fullPrompt);
      const translated = response.trim();

      // Cache result
      state.translationCache.set(cacheKey, translated);

      return translated;
    } catch (error) {
      console.error('[AIMessaging] Translation failed:', error);
      return text;
    }
  }

  async function detectLanguage(text) {
    try {
      const prompt = `Detect the language of the following text. Return only the ISO 639-1 language code (e.g., "en", "bn", "es").\n\nText: "${text}"`;

      const response = await callAI(prompt);
      return response.trim().toLowerCase();
    } catch (error) {
      console.error('[AIMessaging] Language detection failed:', error);
      return 'en';
    }
  }

  // ============================================
  // CONFLICT DETECTION
  // ============================================

  async function detectConflict(chatId) {
    try {
      const history = getChatHistory(chatId);
      const recentMessages = history.slice(-20);

      const recentSentiments = await Promise.all(
        recentMessages.map(m => analyzeSentiment(m.text || m.message || ''))
      );

      const negativeCount = recentSentiments.filter(s => s.sentiment === 'negative').length;
      const conflictScore = negativeCount / recentMessages.length;

      if (conflictScore > 0.5) {
        return {
          hasConflict: true,
          severity: conflictScore > 0.7 ? 'high' : 'medium',
          suggestion: 'Consider taking a break or addressing concerns calmly'
        };
      }

      return { hasConflict: false, severity: 'none' };
    } catch (error) {
      console.error('[AIMessaging] Conflict detection failed:', error);
      return { hasConflict: false, severity: 'none' };
    }
  }

  // ============================================
  // VOICE TRANSCRIPTION (Enhanced)
  // ============================================

  async function transcribeVoice(audioBlob, language = 'auto') {
    try {
      if (!CONFIG.enableVoiceTranscription) {
        return null;
      }

      // Convert audio to text using Web Speech API
      const text = await audioToText(audioBlob);

      if (!text) {
        return null;
      }

      // Detect language if auto
      const detectedLang = language === 'auto' ? await detectLanguage(text) : language;

      // Add metadata
      const transcription = {
        text: text,
        language: detectedLang,
        confidence: 0.95,
        timestamp: Date.now(),
        duration: audioBlob.size / 16000 // Approximate duration
      };

      console.log('[AIMessaging] Voice transcribed:', transcription);
      return transcription;
    } catch (error) {
      console.error('[AIMessaging] Voice transcription failed:', error);
      return null;
    }
  }

  async function audioToText(audioBlob) {
    try {
      return new Promise((resolve, reject) => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = state.currentLanguage || 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
          resolve(event.results[0][0].transcript);
        };

        recognition.onerror = (event) => {
          reject(new Error(event.error));
        };

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          recognition.start();
        };
        audio.play();
      });
    } catch (error) {
      console.error('[AIMessaging] Audio to text failed:', error);
      throw error;
    }
  }

  // ============================================
  // SPAM DETECTION
  // ============================================

  async function detectSpam(message, senderId) {
    try {
      if (!CONFIG.enableSpamDetection) {
        return { isSpam: false, score: 0 };
      }

      const text = message.toLowerCase();
      let spamScore = 0;
      const reasons = [];

      // Check for spam keywords
      const spamKeywords = [
        'free', 'winner', 'congratulations', 'claim', 'prize',
        'urgent', 'act now', 'limited time', 'exclusive offer',
        'click here', 'subscribe', 'buy now', 'discount', 'sale'
      ];

      const foundKeywords = spamKeywords.filter(keyword => text.includes(keyword));
      spamScore += foundKeywords.length * 10;
      if (foundKeywords.length > 0) {
        reasons.push(`Contains spam keywords: ${foundKeywords.join(', ')}`);
      }

      // Check for excessive caps
      const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
      if (capsRatio > 0.7) {
        spamScore += 20;
        reasons.push('Excessive capitalization');
      }

      // Check for excessive punctuation
      const exclamationCount = (text.match(/!/g) || []).length;
      if (exclamationCount > 3) {
        spamScore += 15;
        reasons.push('Excessive exclamation marks');
      }

      // Check for repeated characters
      const repeatedChars = text.match(/(.)\1{4,}/g);
      if (repeatedChars) {
        spamScore += 15;
        reasons.push('Repeated characters');
      }

      // Check sender's spam history
      const senderHistory = state.spamScores.get(senderId) || { total: 0, count: 0 };
      if (senderHistory.count > 0) {
        const avgScore = senderHistory.total / senderHistory.count;
        if (avgScore > 50) {
          spamScore += 30;
          reasons.push('High spam history');
        }
      }

      // Normalize score to 0-100
      const normalizedScore = Math.min(spamScore, 100);

      // Update sender history
      senderHistory.total += normalizedScore;
      senderHistory.count++;
      state.spamScores.set(senderId, senderHistory);

      const isSpam = normalizedScore > 50;

      return {
        isSpam: isSpam,
        score: normalizedScore,
        reasons: reasons
      };
    } catch (error) {
      console.error('[AIMessaging] Spam detection failed:', error);
      return { isSpam: false, score: 0 };
    }
  }

  // ============================================
  // INTENT RECOGNITION
  // ============================================

  async function recognizeIntent(message, chatId) {
    try {
      if (!CONFIG.enableIntentRecognition) {
        return { intent: 'unknown', confidence: 0 };
      }

      const history = getChatHistory(chatId);
      const recentMessages = history.slice(-5);

      const prompt = `
Analyze the intent of the following message in a conversation context.
Classify the intent into one of these categories:
- greeting: Saying hello or starting conversation
- question: Asking for information
- request: Asking for something to be done
- complaint: Expressing dissatisfaction
- compliment: Praising or expressing appreciation
- goodbye: Ending conversation
- information_sharing: Sharing information
- scheduling: Making plans or scheduling
- transaction: Discussing money or transactions
- emotional_support: Offering or seeking emotional support
- other: Other intents

Return as JSON:
{
  "intent": "category",
  "confidence": 0.0-1.0,
  "entities": ["entity1", "entity2"],
  "urgency": "low|medium|high"
}

Message: "${message}"
Recent context:
${recentMessages.map(m => `${m.from === CU?.id ? 'You' : 'Other'}: ${m.text || m.message || '[Media]'}`).join('\n')}
`;

      const response = await callAI(prompt);
      const result = parseJSONResponse(response);

      // Store intent history
      if (!state.intentHistory.has(chatId)) {
        state.intentHistory.set(chatId, []);
      }
      state.intentHistory.get(chatId).push({
        ...result,
        message: message,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('[AIMessaging] Intent recognition failed:', error);
      return { intent: 'unknown', confidence: 0 };
    }
  }

  // ============================================
  // MESSAGE PRIORITIZATION
  // ============================================

  async function prioritizeMessage(message, senderId, chatId) {
    try {
      if (!CONFIG.enableMessagePrioritization) {
        return { priority: 'normal', score: 50 };
      }

      let priorityScore = 50;

      // Check sentiment
      const sentiment = await analyzeSentiment(message);
      if (sentiment.sentiment === 'negative' && sentiment.intensity === 'high') {
        priorityScore += 30;
      }

      // Check intent
      const intent = await recognizeIntent(message, chatId);
      if (intent.urgency === 'high') {
        priorityScore += 25;
      }
      if (intent.intent === 'complaint' || intent.intent === 'request') {
        priorityScore += 15;
      }

      // Check if mentioned
      if (message.toLowerCase().includes(`@${CU?.username || 'you'}`)) {
        priorityScore += 20;
      }

      // Check sender importance
      const senderPreference = state.userPreferences.get(senderId);
      if (senderPreference?.importance === 'high') {
        priorityScore += 15;
      }

      // Normalize to priority levels
      let priority;
      if (priorityScore >= 80) {
        priority = 'urgent';
      } else if (priorityScore >= 60) {
        priority = 'high';
      } else if (priorityScore >= 40) {
        priority = 'normal';
      } else {
        priority = 'low';
      }

      return {
        priority: priority,
        score: priorityScore,
        factors: {
          sentiment: sentiment.sentiment,
          intent: intent.intent,
          urgency: intent.urgency,
          mentioned: message.toLowerCase().includes(`@${CU?.username || 'you'}`)
        }
      };
    } catch (error) {
      console.error('[AIMessaging] Message prioritization failed:', error);
      return { priority: 'normal', score: 50 };
    }
  }

  // ============================================
  // AUTO-RESPONSE GENERATION
  // ============================================

  async function generateAutoResponse(message, senderId, chatId) {
    try {
      if (!CONFIG.enableAutoResponse) {
        return null;
      }

      // Check if user has auto-response enabled for this sender
      const userPrefs = state.userPreferences.get(CU?.id);
      if (!userPrefs?.autoResponseEnabled) {
        return null;
      }

      // Recognize intent
      const intent = await recognizeIntent(message, chatId);

      // Only auto-respond to certain intents
      const autoRespondIntents = ['greeting', 'question', 'information_sharing'];
      if (!autoRespondIntents.includes(intent.intent)) {
        return null;
      }

      // Get conversation context
      const history = getChatHistory(chatId);
      const recentMessages = history.slice(-10);

      const prompt = `
Generate a polite and helpful auto-response for the following message.
Keep it concise (max 50 words) and friendly.

Message: "${message}"
Intent: ${intent.intent}
Recent conversation:
${recentMessages.map(m => `${m.from === CU?.id ? 'You' : 'Other'}: ${m.text || m.message || '[Media]'}`).join('\n')}

Return as JSON:
{
  "response": "Your auto-response text",
  "shouldSend": true
}
`;

      const response = await callAI(prompt);
      const result = parseJSONResponse(response);

      if (result.shouldSend && result.response) {
        return {
          text: result.response,
          isAutoResponse: true,
          generatedAt: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error('[AIMessaging] Auto-response generation failed:', error);
      return null;
    }
  }

  // ============================================
  // CONVERSATION MEMORY (Enhanced)
  // ============================================

  function updateConversationMemory(chatId, message, metadata = {}) {
    try {
      if (!CONFIG.enableConversationMemory) {
        return;
      }

      if (!state.conversationMemory.has(chatId)) {
        state.conversationMemory.set(chatId, {
          topics: new Map(),
          entities: new Map(),
          preferences: new Map(),
          lastActive: Date.now()
        });
      }

      const memory = state.conversationMemory.get(chatId);
      memory.lastActive = Date.now();

      // Extract topics (simplified - would use NLP in production)
      const words = message.toLowerCase().split(/\s+/);
      const commonWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
        'as', 'into', 'through', 'during', 'before', 'after', 'above',
        'below', 'between', 'under', 'again', 'further', 'then', 'once'];

      const potentialTopics = words.filter(word => word.length > 3 && !commonWords.includes(word));
      potentialTopics.forEach(topic => {
        memory.topics.set(topic, (memory.topics.get(topic) || 0) + 1);
      });

      // Store preferences if mentioned
      if (metadata.preferences) {
        Object.entries(metadata.preferences).forEach(([key, value]) => {
          memory.preferences.set(key, value);
        });
      }

      console.log('[AIMessaging] Conversation memory updated:', chatId);
    } catch (error) {
      console.error('[AIMessaging] Update conversation memory failed:', error);
    }
  }

  function getConversationMemory(chatId) {
    return state.conversationMemory.get(chatId) || null;
  }

  function getConversationTopics(chatId, limit = 10) {
    const memory = state.conversationMemory.get(chatId);
    if (!memory) return [];

    return Array.from(memory.topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([topic, count]) => ({ topic, count }));
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  function getChatHistory(chatId) {
    return state.chatHistory.get(chatId) || [];
  }

  function setChatHistory(chatId, messages) {
    state.chatHistory.set(chatId, messages);
  }

  async function callAI(prompt) {
    try {
      if (state.provider === 'openai') {
        return await callOpenAI(prompt);
      } else if (state.provider === 'anthropic') {
        return await callAnthropic(prompt);
      }
    } catch (error) {
      console.error('[AIMessaging] AI call failed:', error);
      throw error;
    }
  }

  async function callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
      },
      body: JSON.stringify({
        model: state.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.choices[0].message.content;
  }

  async function callAnthropic(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.content[0].text;
  }

  function parseJSONResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      console.error('[AIMessaging] JSON parse failed:', error);
      return {};
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function initialize(config = {}) {
    if (config.apiKey) {
      state.apiKey = config.apiKey;
    }
    if (config.provider) {
      state.provider = config.provider;
    }
    if (config.model) {
      state.model = config.model;
    }

    console.log('[AIMessaging] Initialized with provider:', state.provider);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    initialize,
    getSmartReplies,
    summarizeConversation,
    analyzeSentiment,
    translateText,
    detectLanguage,
    detectConflict,
    transcribeVoice,
    detectSpam,
    recognizeIntent,
    prioritizeMessage,
    generateAutoResponse,
    updateConversationMemory,
    getConversationMemory,
    getConversationTopics,
    setChatHistory,
    getChatHistory,
    setUserPreference: (userId, pref) => state.userPreferences.set(userId, pref),
    getUserPreference: (userId) => state.userPreferences.get(userId),
    getState: () => ({ ...state, apiKey: '***' })
  };
})();

// Auto-initialize if API key is available
if (typeof CU !== 'undefined' && CU?.aiApiKey) {
  AIMessaging.initialize({
    apiKey: CU.aiApiKey,
    provider: 'openai',
    model: 'gpt-4-turbo-preview'
  });
}

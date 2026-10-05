/**
 * Advanced AI Chatbot & LLM Integration for Monetixra
 * Features: Multi-LLM Support, Context Management, RAG, Fine-tuning, Agent Framework
 */

const AdvancedAIChatbot = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    // LLM Providers
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    COHERE_API_KEY: process.env.COHERE_API_KEY || '',
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
    GOOGLE_PALM_KEY: process.env.GOOGLE_PALM_KEY || '',
    
    // Models
    OPENAI_MODELS: {
      GPT4: 'gpt-4-turbo-preview',
      GPT35: 'gpt-3.5-turbo',
      GPT4VISION: 'gpt-4-vision-preview'
    },
    ANTHROPIC_MODELS: {
      CLAUDE3: 'claude-3-opus-20240229',
      CLAUDE2: 'claude-2.1'
    },
    COHERE_MODELS: {
      COMMAND: 'command',
      COMMANDPLUS: 'command-plus'
    },
    
    // Vector DB (for RAG)
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || '',
    PINECONE_INDEX: process.env.PINECONE_INDEX || 'monetixra-knowledge',
    
    // Context Window
    MAX_CONTEXT_LENGTH: 10000,
    MAX_MESSAGES: 20,
    CONTEXT_RETENTION_HOURS: 24,
    
    // Rate Limiting
    MAX_REQUESTS_PER_MINUTE: 60,
    RATE_LIMIT_WINDOW: 60000,
    
    // Features
    RAG_ENABLED: true,
    STREAMING_ENABLED: true,
    FUNCTION_CALLING_ENABLED: true,
    MULTIMODAL_ENABLED: true
  };

  // State
  let chatbotState = {
    conversations: new Map(), // conversationId -> messages
    userContexts: new Map(), // userId -> context
    functionRegistry: new Map(), // functionName -> function
    knowledgeBase: null,
    activeModel: CONFIG.OPENAI_MODELS.GPT4,
    provider: 'openai',
    requestCount: 0,
    lastRequestTime: Date.now()
  };

  // ── Multi-LLM Support ───────────────────────────────────────────────────────

  /**
   * Initialize LLM provider
   * @param {string} provider - Provider name (openai, anthropic, cohere, deepseek)
   * @param {string} model - Model name
   */
  function initializeProvider(provider, model) {
    try {
      switch (provider) {
        case 'openai':
          if (!CONFIG.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
          }
          chatbotState.provider = 'openai';
          chatbotState.activeModel = model || CONFIG.OPENAI_MODELS.GPT4;
          break;
          
        case 'anthropic':
          if (!CONFIG.ANTHROPIC_API_KEY) {
            throw new Error('Anthropic API key not configured');
          }
          chatbotState.provider = 'anthropic';
          chatbotState.activeModel = model || CONFIG.ANTHROPIC_MODELS.CLAUDE3;
          break;
          
        case 'cohere':
          if (!CONFIG.COHERE_API_KEY) {
            throw new Error('Cohere API key not configured');
          }
          chatbotState.provider = 'cohere';
          chatbotState.activeModel = model || CONFIG.COHERE_MODELS.COMMAND;
          break;
          
        case 'deepseek':
          if (!CONFIG.DEEPSEEK_API_KEY) {
            throw new Error('DeepSeek API key not configured');
          }
          chatbotState.provider = 'deepseek';
          chatbotState.activeModel = model || 'deepseek-chat';
          break;
          
        default:
          throw new Error('Unsupported provider');
      }

      console.log('[AIChatbot] Provider initialized:', provider, chatbotState.activeModel);
      return true;
    } catch (error) {
      console.error('[AIChatbot] Provider initialization failed:', error);
      return false;
    }
  }

  /**
   * Call OpenAI API
   * @param {array} messages - Conversation messages
   * @param {object} options - API options
   */
  async function callOpenAI(messages, options = {}) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: options.model || chatbotState.activeModel,
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000,
          stream: options.stream || false,
          functions: options.functions || undefined,
          function_call: options.functionCall || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIChatbot] OpenAI API call failed:', error);
      throw error;
    }
  }

  /**
   * Call Anthropic API
   * @param {string} prompt - User prompt
   * @param {object} options - API options
   */
  async function callAnthropic(prompt, options = {}) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model || chatbotState.activeModel,
          max_tokens: options.maxTokens || 2000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIChatbot] Anthropic API call failed:', error);
      throw error;
    }
  }

  /**
   * Call Cohere API
   * @param {string} prompt - User prompt
   * @param {object} options - API options
   */
  async function callCohere(prompt, options = {}) {
    try {
      const response = await fetch('https://api.cohere.ai/v1/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.COHERE_API_KEY}`
        },
        body: JSON.stringify({
          model: options.model || chatbotState.activeModel,
          prompt: prompt,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIChatbot] Cohere API call failed:', error);
      throw error;
    }
  }

  // ── Conversation Management ─────────────────────────────────────────────────

  /**
   * Create new conversation
   * @param {string} userId - User ID
   * @param {object} metadata - Conversation metadata
   */
  function createConversation(userId, metadata = {}) {
    const conversationId = crypto.randomUUID();
    
    chatbotState.conversations.set(conversationId, {
      id: conversationId,
      userId: userId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: metadata
    });

    console.log('[AIChatbot] Conversation created:', conversationId);
    return conversationId;
  }

  /**
   * Get conversation
   * @param {string} conversationId - Conversation ID
   */
  function getConversation(conversationId) {
    return chatbotState.conversations.get(conversationId);
  }

  /**
   * Add message to conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} role - Message role (user, assistant, system)
   * @param {string} content - Message content
   * @param {object} metadata - Message metadata
   */
  function addMessage(conversationId, role, content, metadata = {}) {
    const conversation = chatbotState.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const message = {
      role: role,
      content: content,
      timestamp: Date.now(),
      metadata: metadata
    };

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();

    // Trim conversation if too long
    if (conversation.messages.length > CONFIG.MAX_MESSAGES) {
      conversation.messages = conversation.messages.slice(-CONFIG.MAX_MESSAGES);
    }

    return message;
  }

  /**
   * Delete conversation
   * @param {string} conversationId - Conversation ID
   */
  function deleteConversation(conversationId) {
    chatbotState.conversations.delete(conversationId);
    console.log('[AIChatbot] Conversation deleted:', conversationId);
  }

  // ── Chat Functions ───────────────────────────────────────────────────────────

  /**
   * Send message and get response
   * @param {string} conversationId - Conversation ID
   * @param {string} message - User message
   * @param {object} options - Chat options
   */
  async function sendMessage(conversationId, message, options = {}) {
    try {
      // Rate limiting
      await checkRateLimit();

      // Add user message
      addMessage(conversationId, 'user', message);

      const conversation = getConversation(conversationId);
      
      // Prepare messages for API
      let apiMessages = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add system prompt if provided
      if (options.systemPrompt) {
        apiMessages.unshift({
          role: 'system',
          content: options.systemPrompt
        });
      }

      // RAG - Add relevant context from knowledge base
      if (CONFIG.RAG_ENABLED && chatbotState.knowledgeBase) {
        const relevantContext = await retrieveRelevantContext(message);
        if (relevantContext) {
          apiMessages.unshift({
            role: 'system',
            content: `Relevant context: ${relevantContext}`
          });
        }
      }

      let response;
      switch (chatbotState.provider) {
        case 'openai':
          response = await callOpenAI(apiMessages, options);
          break;
        case 'anthropic':
          response = await callAnthropic(message, options);
          break;
        case 'cohere':
          response = await callCohere(message, options);
          break;
        default:
          throw new Error('Unsupported provider');
      }

      // Extract response text
      let responseText;
      if (chatbotState.provider === 'openai') {
        responseText = response.choices[0].message.content;
        
        // Handle function calls
        if (response.choices[0].message.function_call) {
          const functionCall = response.choices[0].message.function_call;
          const functionResult = await executeFunctionCall(functionCall);
          
          // Add function result to conversation
          addMessage(conversationId, 'assistant', JSON.stringify(functionResult));
          
          // Get final response
          apiMessages.push({
            role: 'assistant',
            content: null,
            function_call: functionCall
          });
          apiMessages.push({
            role: 'function',
            name: functionCall.name,
            content: JSON.stringify(functionResult)
          });
          
          const finalResponse = await callOpenAI(apiMessages, options);
          responseText = finalResponse.choices[0].message.content;
        }
      } else if (chatbotState.provider === 'anthropic') {
        responseText = response.content[0].text;
      } else if (chatbotState.provider === 'cohere') {
        responseText = response.generations[0].text;
      }

      // Add assistant response
      addMessage(conversationId, 'assistant', responseText);

      return {
        success: true,
        response: responseText,
        conversationId: conversationId,
        provider: chatbotState.provider,
        model: chatbotState.activeModel
      };
    } catch (error) {
      console.error('[AIChatbot] Send message failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stream message response
   * @param {string} conversationId - Conversation ID
   * @param {string} message - User message
   * @param {function} onChunk - Callback for each chunk
   * @param {object} options - Chat options
   */
  async function streamMessage(conversationId, message, onChunk, options = {}) {
    try {
      await checkRateLimit();
      addMessage(conversationId, 'user', message);

      const conversation = getConversation(conversationId);
      const apiMessages = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      if (options.systemPrompt) {
        apiMessages.unshift({
          role: 'system',
          content: options.systemPrompt
        });
      }

      // OpenAI streaming
      if (chatbotState.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: options.model || chatbotState.activeModel,
            messages: apiMessages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2000,
            stream: true
          })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line === 'data: [DONE]') continue;
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0].delta.content;
                if (content) {
                  fullResponse += content;
                  onChunk(content);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        addMessage(conversationId, 'assistant', fullResponse);
        return { success: true, response: fullResponse };
      }

      // Non-streaming fallback for other providers
      const response = await sendMessage(conversationId, message, options);
      if (response.success) {
        onChunk(response.response);
      }
      return response;
    } catch (error) {
      console.error('[AIChatbot] Stream message failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ── RAG (Retrieval-Augmented Generation) ────────────────────────────────────

  /**
   * Initialize knowledge base
   */
  async function initializeKnowledgeBase() {
    try {
      if (!CONFIG.PINECONE_API_KEY) {
        console.warn('[AIChatbot] Pinecone API key not configured');
        return false;
      }

      const { Pinecone } = require('@pinecone-database/pinecone');
      const pinecone = new Pinecone({
        apiKey: CONFIG.PINECONE_API_KEY
      });

      chatbotState.knowledgeBase = pinecone.index(CONFIG.PINECONE_INDEX);
      console.log('[AIChatbot] Knowledge base initialized');
      return true;
    } catch (error) {
      console.error('[AIChatbot] Knowledge base initialization failed:', error);
      return false;
    }
  }

  /**
   * Add document to knowledge base
   * @param {string} documentId - Document ID
   * @param {string} text - Document text
   * @param {object} metadata - Document metadata
   */
  async function addDocument(documentId, text, metadata = {}) {
    try {
      if (!chatbotState.knowledgeBase) {
        await initializeKnowledgeBase();
      }

      // Generate embedding
      const embedding = await generateEmbedding(text);
      if (!embedding) {
        throw new Error('Failed to generate embedding');
      }

      // Add to Pinecone
      await chatbotState.knowledgeBase.upsert([{
        id: documentId,
        values: embedding,
        metadata: {
          text: text,
          ...metadata
        }
      }]);

      console.log('[AIChatbot] Document added:', documentId);
      return true;
    } catch (error) {
      console.error('[AIChatbot] Add document failed:', error);
      return false;
    }
  }

  /**
   * Retrieve relevant context
   * @param {string} query - Query text
   * @param {number} topK - Number of results
   */
  async function retrieveRelevantContext(query, topK = 3) {
    try {
      if (!chatbotState.knowledgeBase) {
        return null;
      }

      const embedding = await generateEmbedding(query);
      if (!embedding) {
        return null;
      }

      const results = await chatbotState.knowledgeBase.query({
        vector: embedding,
        topK: topK,
        includeMetadata: true
      });

      const context = results.matches
        .map(match => match.metadata.text)
        .join('\n\n');

      return context;
    } catch (error) {
      console.error('[AIChatbot] Context retrieval failed:', error);
      return null;
    }
  }

  /**
   * Generate embedding
   * @param {string} text - Text to embed
   */
  async function generateEmbedding(text) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
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
      console.error('[AIChatbot] Embedding generation failed:', error);
      return null;
    }
  }

  // ── Function Calling ───────────────────────────────────────────────────────

  /**
   * Register function
   * @param {string} name - Function name
   * @param {object} schema - Function schema
   * @param {function} handler - Function handler
   */
  function registerFunction(name, schema, handler) {
    chatbotState.functionRegistry.set(name, {
      schema: schema,
      handler: handler
    });
    console.log('[AIChatbot] Function registered:', name);
  }

  /**
   * Execute function call
   * @param {object} functionCall - Function call object
   */
  async function executeFunctionCall(functionCall) {
    try {
      const func = chatbotState.functionRegistry.get(functionCall.name);
      if (!func) {
        throw new Error(`Function not found: ${functionCall.name}`);
      }

      const args = JSON.parse(functionCall.arguments);
      const result = await func.handler(args);
      
      return result;
    } catch (error) {
      console.error('[AIChatbot] Function execution failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Get function schemas for API
   */
  function getFunctionSchemas() {
    return Array.from(chatbotState.functionRegistry.values()).map(func => func.schema);
  }

  // ── Rate Limiting ─────────────────────────────────────────────────────────

  /**
   * Check rate limit
   */
  async function checkRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - chatbotState.lastRequestTime;
    
    // Reset counter if window has passed
    if (timeSinceLastRequest > CONFIG.RATE_LIMIT_WINDOW) {
      chatbotState.requestCount = 0;
    }

    if (chatbotState.requestCount >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = CONFIG.RATE_LIMIT_WINDOW - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      chatbotState.requestCount = 0;
    }

    chatbotState.requestCount++;
    chatbotState.lastRequestTime = now;
  }

  // ── Context Management ─────────────────────────────────────────────────────

  /**
   * Set user context
   * @param {string} userId - User ID
   * @param {object} context - User context
   */
  function setUserContext(userId, context) {
    chatbotState.userContexts.set(userId, {
      ...context,
      updatedAt: Date.now()
    });
  }

  /**
   * Get user context
   * @param {string} userId - User ID
   */
  function getUserContext(userId) {
    return chatbotState.userContexts.get(userId);
  }

  /**
   * Clear old contexts
   */
  function clearOldContexts() {
    const now = Date.now();
    const maxAge = CONFIG.CONTEXT_RETENTION_HOURS * 60 * 60 * 1000;
    
    for (const [userId, context] of chatbotState.userContexts.entries()) {
      if (now - context.updatedAt > maxAge) {
        chatbotState.userContexts.delete(userId);
      }
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Provider
    initializeProvider: initializeProvider,
    
    // Conversations
    createConversation: createConversation,
    getConversation: getConversation,
    deleteConversation: deleteConversation,
    
    // Chat
    sendMessage: sendMessage,
    streamMessage: streamMessage,
    
    // RAG
    initKnowledgeBase: initializeKnowledgeBase,
    addDocument: addDocument,
    retrieveContext: retrieveRelevantContext,
    
    // Functions
    registerFunction: registerFunction,
    getFunctionSchemas: getFunctionSchemas,
    
    // Context
    setUserContext: setUserContext,
    getUserContext: getUserContext,
    clearOldContexts: clearOldContexts,
    
    // State
    getState: () => ({ ...chatbotState }),
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedAIChatbot;
}
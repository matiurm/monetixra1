/**
 * Advanced Modules Integration for Monetixra
 * This file integrates all advanced features into the main application
 */

const AdvancedModulesIntegration = (function () {
  'use strict';

  // Module states
  const moduleStates = {
    defi: { loaded: false, initialized: false },
    aiChatbot: { loaded: false, initialized: false },
    biometricAuth: { loaded: false, initialized: false },
    nftMarketplace: { loaded: false, initialized: false },
    collaboration: { loaded: false, initialized: false },
    performance: { loaded: false, initialized: false },
    security: { loaded: false, initialized: false },
    analytics: { loaded: false, initialized: false },
    aiMessaging: { loaded: false, initialized: false },
    videoEffects: { loaded: false, initialized: false },
    secureCalling: { loaded: false, initialized: false },
    multilingualSupport: { loaded: false, initialized: false },
    callAnalytics: { loaded: false, initialized: false },
    collaborationTools: { loaded: false, initialized: false },
    gamification: { loaded: false, initialized: false },
    crossDeviceSync: { loaded: false, initialized: false },
    smartNotifications: { loaded: false, initialized: false }
  };

  // ── Module Loading ───────────────────────────────────────────────────────

  /**
   * Load advanced modules dynamically
   */
  async function loadModules() {
    console.log('[Integration] Loading advanced modules...');

    const modules = [
      { name: 'defi', path: '/js/advanced-defi-integration.js' },
      { name: 'aiChatbot', path: '/js/advanced-ai-chatbot.js' },
      { name: 'biometricAuth', path: '/js/advanced-biometric-auth.js' },
      { name: 'nftMarketplace', path: '/js/advanced-nft-marketplace.js' },
      { name: 'collaboration', path: '/js/advanced-collaboration.js' },
      { name: 'performance', path: '/js/performance-enhancements.js' },
      { name: 'security', path: '/js/security-enhancements.js' },
      { name: 'analytics', path: '/js/analytics-monitoring.js' },
      { name: 'aiMessaging', path: '/js/ai-messaging.js' },
      { name: 'videoEffects', path: '/js/video-effects.js' },
      { name: 'secureCalling', path: '/js/secure-calling.js' },
      { name: 'multilingualSupport', path: '/js/multilingual-support.js' },
      { name: 'callAnalytics', path: '/js/call-analytics.js' },
      { name: 'collaborationTools', path: '/js/collaboration-tools.js' },
      { name: 'gamification', path: '/js/gamification.js' },
      { name: 'crossDeviceSync', path: '/js/cross-device-sync.js' },
      { name: 'smartNotifications', path: '/js/smart-notifications.js' }
    ];

    for (const module of modules) {
      try {
        await loadModule(module.name, module.path);
      } catch (error) {
        console.error(`[Integration] Failed to load ${module.name}:`, error);
      }
    }

    console.log('[Integration] Module loading complete');
    return moduleStates;
  }

  /**
   * Load individual module
   */
  async function loadModule(name, path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = path;
      script.async = true;

      script.onload = () => {
        moduleStates[name].loaded = true;
        console.log(`[Integration] ${name} loaded`);
        resolve();
      };

      script.onerror = () => {
        reject(new Error(`Failed to load ${name}`));
      };

      document.head.appendChild(script);
    });
  }

  // ── Module Initialization ─────────────────────────────────────────────────

  /**
   * Initialize all loaded modules
   */
  async function initializeModules(config = {}) {
    console.log('[Integration] Initializing advanced modules...');

    // Initialize DeFi
    if (moduleStates.defi.loaded && config.defi) {
      try {
        if (typeof AdvancedDeFi !== 'undefined') {
          // Initialize with wallet connection if available
          if (config.walletAddress) {
            moduleStates.defi.initialized = true;
            console.log('[Integration] DeFi initialized');
          }
        }
      } catch (error) {
        console.error('[Integration] DeFi initialization failed:', error);
      }
    }

    // Initialize AI Chatbot
    if (moduleStates.aiChatbot.loaded && config.aiChatbot) {
      try {
        if (typeof AdvancedAIChatbot !== 'undefined') {
          AdvancedAIChatbot.initializeProvider(
            config.aiChatbot.provider || 'openai',
            config.aiChatbot.model || 'gpt-4-turbo-preview'
          );

          if (config.aiChatbot.knowledgeBase) {
            await AdvancedAIChatbot.initKnowledgeBase();
          }

          moduleStates.aiChatbot.initialized = true;
          console.log('[Integration] AI Chatbot initialized');
        }
      } catch (error) {
        console.error('[Integration] AI Chatbot initialization failed:', error);
      }
    }

    // Initialize Biometric Auth
    if (moduleStates.biometricAuth.loaded && config.biometricAuth) {
      try {
        if (typeof AdvancedBiometricAuth !== 'undefined') {
          // Initialize face recognition if available
          if (config.biometricAuth.faceRecognition) {
            await AdvancedBiometricAuth.initFaceRecognition();
          }

          moduleStates.biometricAuth.initialized = true;
          console.log('[Integration] Biometric Auth initialized');
        }
      } catch (error) {
        console.error('[Integration] Biometric Auth initialization failed:', error);
      }
    }

    // Initialize NFT Marketplace
    if (moduleStates.nftMarketplace.loaded && config.nftMarketplace) {
      try {
        if (typeof AdvancedNFTMarketplace !== 'undefined') {
          // Initialize with wallet connection if available
          if (config.walletAddress) {
            moduleStates.nftMarketplace.initialized = true;
            console.log('[Integration] NFT Marketplace initialized');
          }
        }
      } catch (error) {
        console.error('[Integration] NFT Marketplace initialization failed:', error);
      }
    }

    // Initialize Collaboration
    if (moduleStates.collaboration.loaded && config.collaboration) {
      try {
        if (typeof AdvancedCollaboration !== 'undefined') {
          if (config.collaboration.autoConnect && config.collaboration.participantData) {
            AdvancedCollaboration.connect(config.collaboration.participantData);
          }

          moduleStates.collaboration.initialized = true;
          console.log('[Integration] Collaboration initialized');
        }
      } catch (error) {
        console.error('[Integration] Collaboration initialization failed:', error);
      }
    }

    // Initialize Performance
    if (moduleStates.performance.loaded) {
      try {
        if (typeof PerformanceEnhancements !== 'undefined') {
          PerformanceEnhancements.initLazyLoading();
          PerformanceEnhancements.setupObserver();

          moduleStates.performance.initialized = true;
          console.log('[Integration] Performance initialized');
        }
      } catch (error) {
        console.error('[Integration] Performance initialization failed:', error);
      }
    }

    // Initialize Security
    if (moduleStates.security.loaded) {
      try {
        if (typeof SecurityEnhancements !== 'undefined') {
          SecurityEnhancements.initErrorTracking();
          SecurityEnhancements.cleanExpiredSessions();

          moduleStates.security.initialized = true;
          console.log('[Integration] Security initialized');
        }
      } catch (error) {
        console.error('[Integration] Security initialization failed:', error);
      }
    }

    // Initialize Analytics
    if (moduleStates.analytics.loaded) {
      try {
        if (typeof AnalyticsMonitoring !== 'undefined') {
          AnalyticsMonitoring.initSession(config.userId);
          AnalyticsMonitoring.initBehaviorTracking();
          AnalyticsMonitoring.initPerformanceMonitoring();
          AnalyticsMonitoring.initErrorTracking();

          moduleStates.analytics.initialized = true;
          console.log('[Integration] Analytics initialized');
        }
      } catch (error) {
        console.error('[Integration] Analytics initialization failed:', error);
      }
    }

    // Initialize AI Messaging
    if (moduleStates.aiMessaging.loaded && config.aiMessaging) {
      try {
        if (typeof AIMessaging !== 'undefined') {
          AIMessaging.initialize(config.aiMessaging);
          moduleStates.aiMessaging.initialized = true;
          console.log('[Integration] AI Messaging initialized');
        }
      } catch (error) {
        console.error('[Integration] AI Messaging initialization failed:', error);
      }
    }

    // Initialize Video Effects
    if (moduleStates.videoEffects.loaded) {
      try {
        if (typeof VideoEffects !== 'undefined') {
          const videoElement = document.querySelector('#local-video video');
          if (videoElement) {
            VideoEffects.initialize(videoElement);
          }
          moduleStates.videoEffects.initialized = true;
          console.log('[Integration] Video Effects initialized');
        }
      } catch (error) {
        console.error('[Integration] Video Effects initialization failed:', error);
      }
    }

    // Initialize Secure Calling
    if (moduleStates.secureCalling.loaded && config.secureCalling) {
      try {
        if (typeof SecureCalling !== 'undefined') {
          SecureCalling.initialize(config.secureCalling);
          moduleStates.secureCalling.initialized = true;
          console.log('[Integration] Secure Calling initialized');
        }
      } catch (error) {
        console.error('[Integration] Secure Calling initialization failed:', error);
      }
    }

    // Initialize Multilingual Support
    if (moduleStates.multilingualSupport.loaded && config.multilingualSupport) {
      try {
        if (typeof MultilingualSupport !== 'undefined') {
          MultilingualSupport.initialize(config.multilingualSupport);
          moduleStates.multilingualSupport.initialized = true;
          console.log('[Integration] Multilingual Support initialized');
        }
      } catch (error) {
        console.error('[Integration] Multilingual Support initialization failed:', error);
      }
    }

    // Initialize Call Analytics
    if (moduleStates.callAnalytics.loaded) {
      try {
        if (typeof CallAnalytics !== 'undefined') {
          CallAnalytics.initialize(config.callAnalytics);
          moduleStates.callAnalytics.initialized = true;
          console.log('[Integration] Call Analytics initialized');
        }
      } catch (error) {
        console.error('[Integration] Call Analytics initialization failed:', error);
      }
    }

    // Initialize Collaboration Tools
    if (moduleStates.collaborationTools.loaded && config.collaborationTools) {
      try {
        if (typeof CollaborationTools !== 'undefined') {
          CollaborationTools.initialize(config.collaborationTools);
          moduleStates.collaborationTools.initialized = true;
          console.log('[Integration] Collaboration Tools initialized');
        }
      } catch (error) {
        console.error('[Integration] Collaboration Tools initialization failed:', error);
      }
    }

    // Initialize Gamification
    if (moduleStates.gamification.loaded && config.gamification) {
      try {
        if (typeof Gamification !== 'undefined') {
          Gamification.initialize(config.gamification);
          moduleStates.gamification.initialized = true;
          console.log('[Integration] Gamification initialized');
        }
      } catch (error) {
        console.error('[Integration] Gamification initialization failed:', error);
      }
    }

    // Initialize Cross-Device Sync
    if (moduleStates.crossDeviceSync.loaded && config.crossDeviceSync) {
      try {
        if (typeof CrossDeviceSync !== 'undefined') {
          CrossDeviceSync.initialize(config.crossDeviceSync);
          moduleStates.crossDeviceSync.initialized = true;
          console.log('[Integration] Cross-Device Sync initialized');
        }
      } catch (error) {
        console.error('[Integration] Cross-Device Sync initialization failed:', error);
      }
    }

    // Initialize Smart Notifications
    if (moduleStates.smartNotifications.loaded && config.smartNotifications) {
      try {
        if (typeof SmartNotifications !== 'undefined') {
          SmartNotifications.initialize(config.smartNotifications);
          moduleStates.smartNotifications.initialized = true;
          console.log('[Integration] Smart Notifications initialized');
        }
      } catch (error) {
        console.error('[Integration] Smart Notifications initialization failed:', error);
      }
    }

    // Initialize Enhanced AI Messaging
    if (moduleStates.aiMessaging.loaded && config.aiMessaging) {
      try {
        if (typeof AIMessaging !== 'undefined') {
          AIMessaging.initialize(config.aiMessaging);
          moduleStates.aiMessaging.initialized = true;
          console.log('[Integration] Enhanced AI Messaging initialized');
        }
      } catch (error) {
        console.error('[Integration] Enhanced AI Messaging initialization failed:', error);
      }
    }

    // Initialize Enhanced Video Effects
    if (moduleStates.videoEffects.loaded && config.videoEffects) {
      try {
        if (typeof VideoEffects !== 'undefined') {
          const videoElement = document.querySelector('#local-video video');
          if (videoElement) {
            VideoEffects.initialize(videoElement);
          }
          moduleStates.videoEffects.initialized = true;
          console.log('[Integration] Enhanced Video Effects initialized');
        }
      } catch (error) {
        console.error('[Integration] Enhanced Video Effects initialization failed:', error);
      }
    }

    // Initialize Enhanced Secure Calling
    if (moduleStates.secureCalling.loaded && config.secureCalling) {
      try {
        if (typeof SecureCalling !== 'undefined') {
          SecureCalling.initialize(config.secureCalling);
          moduleStates.secureCalling.initialized = true;
          console.log('[Integration] Enhanced Secure Calling initialized');
        }
      } catch (error) {
        console.error('[Integration] Enhanced Secure Calling initialization failed:', error);
      }
    }

    // Initialize Enhanced Multilingual Support
    if (moduleStates.multilingualSupport.loaded && config.multilingualSupport) {
      try {
        if (typeof MultilingualSupport !== 'undefined') {
          MultilingualSupport.initialize(config.multilingualSupport);
          moduleStates.multilingualSupport.initialized = true;
          console.log('[Integration] Enhanced Multilingual Support initialized');
        }
      } catch (error) {
        console.error('[Integration] Enhanced Multilingual Support initialization failed:', error);
      }
    }

    // Initialize Enhanced Call Analytics
    if (moduleStates.callAnalytics.loaded && config.callAnalytics) {
      try {
        if (typeof CallAnalytics !== 'undefined') {
          CallAnalytics.initialize(config.callAnalytics);
          moduleStates.callAnalytics.initialized = true;
          console.log('[Integration] Enhanced Call Analytics initialized');
        }
      } catch (error) {
        console.error('[Integration] Enhanced Call Analytics initialization failed:', error);
      }
    }

    // Initialize Enhanced Collaboration Tools
    if (moduleStates.collaborationTools.loaded && config.collaborationTools) {
      try {
        if (typeof CollaborationTools !== 'undefined') {
          CollaborationTools.initialize(config.collaborationTools);
          moduleStates.collaborationTools.initialized = true;
          console.log('[Integration] Enhanced Collaboration Tools initialized');
        }
      } catch (error) {
        console.error('[Integration] Enhanced Collaboration Tools initialization failed:', error);
      }
    }

    // Initialize Enhanced Gamification
    if (moduleStates.gamification.loaded && config.gamification) {
      try {
        if (typeof Gamification !== 'undefined') {
          Gamification.initialize(config.gamification);
          moduleStates.gamification.initialized = true;
          console.log('[Integration] Enhanced Gamification initialized');
        }
      } catch (error) {
        console.error('[Integration] Enhanced Gamification initialization failed:', error);
      }
    }

    // Initialize Enhanced Cross-Device Sync
    if (moduleStates.crossDeviceSync.loaded && config.crossDeviceSync) {
      try {
        if (typeof CrossDeviceSync !== 'undefined') {
          CrossDeviceSync.initialize(config.crossDeviceSync);
          moduleStates.crossDeviceSync.initialized = true;
          console.log('[Integration] Enhanced Cross-Device Sync initialized');
        }
      } catch (error) {
        console.error('[Integration] Enhanced Cross-Device Sync initialization failed:', error);
      }
    }

    console.log('[Integration] Module initialization complete');
    return moduleStates;
  }

  // ── UI Integration ────────────────────────────────────────────────────────

  /**
   * Add advanced features to UI
   */
  function integrateUI() {
    console.log('[Integration] Integrating advanced features into UI...');

    // Add DeFi UI elements
    addDeFiUI();

    // Add AI Chatbot UI elements
    addAIChatbotUI();

    // Add Biometric Auth UI elements
    addBiometricAuthUI();

    // Add NFT Marketplace UI elements
    addNFTMarketplaceUI();

    // Add Collaboration UI elements
    addCollaborationUI();

    console.log('[Integration] UI integration complete');
  }

  /**
   * Add DeFi UI elements
   */
  function addDeFiUI() {
    if (!moduleStates.defi.loaded) return;

    // Add DeFi button to navigation
    const defiButton = document.createElement('button');
    defiButton.className = 'nav-item';
    defiButton.innerHTML = `
      <span>💰</span>
      <span>DeFi</span>
    `;
    defiButton.onclick = () => showDeFiPanel();

    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
      bottomNav.appendChild(defiButton);
    }
  }

  /**
   * Add AI Chatbot UI elements
   */
  function addAIChatbotUI() {
    if (!moduleStates.aiChatbot.loaded) return;

    // Add AI chat button
    const chatButton = document.createElement('button');
    chatButton.className = 'fab';
    chatButton.style.bottom = '150px';
    chatButton.innerHTML = '🤖';
    chatButton.onclick = () => showAIChatbot();

    document.body.appendChild(chatButton);
  }

  /**
   * Add Biometric Auth UI elements
   */
  function addBiometricAuthUI() {
    if (!moduleStates.biometricAuth.loaded) return;

    // Add biometric auth options to login
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
      const biometricSection = document.createElement('div');
      biometricSection.className = 'biometric-options';
      biometricSection.innerHTML = `
        <h3>Biometric Authentication</h3>
        <button onclick="authenticateWithFace()">👤 Face ID</button>
        <button onclick="authenticateWithFingerprint()">🖐️ Fingerprint</button>
        <button onclick="authenticateWithVoice()">🎤 Voice</button>
      `;
      loginForm.appendChild(biometricSection);
    }
  }

  /**
   * Add NFT Marketplace UI elements
   */
  function addNFTMarketplaceUI() {
    if (!moduleStates.nftMarketplace.loaded) return;

    // Add NFT marketplace button to navigation
    const nftButton = document.createElement('button');
    nftButton.className = 'nav-item';
    nftButton.innerHTML = `
      <span>🖼️</span>
      <span>NFT</span>
    `;
    nftButton.onclick = () => showNFTMarketplace();

    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
      bottomNav.appendChild(nftButton);
    }
  }

  /**
   * Add Collaboration UI elements
   */
  function addCollaborationUI() {
    if (!moduleStates.collaboration.loaded) return;

    // Add collaboration button
    const collabButton = document.createElement('button');
    collabButton.className = 'fab';
    collabButton.style.bottom = '220px';
    collabButton.innerHTML = '👥';
    collabButton.onclick = () => showCollaborationPanel();

    document.body.appendChild(collabButton);
  }

  // ── Panel Functions ────────────────────────────────────────────────────────

  /**
   * Show DeFi panel
   */
  function showDeFiPanel() {
    if (!moduleStates.defi.initialized) {
      toast('e', '❌ DeFi not initialized');
      return;
    }

    // Create DeFi panel
    const panel = document.createElement('div');
    panel.id = 'defi-panel';
    panel.className = 'panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h2>💰 DeFi Dashboard</h2>
        <button onclick="closePanel('defi-panel')">✕</button>
      </div>
      <div class="panel-content">
        <div class="defi-section">
          <h3>DEX Aggregation</h3>
          <button onclick="showSwapInterface()">Swap Tokens</button>
          <button onclick="showLiquidityInterface()">Manage Liquidity</button>
        </div>
        <div class="defi-section">
          <h3>Yield Farming</h3>
          <button onclick="showStakingInterface()">Stake Tokens</button>
          <button onclick="showYieldInterface()">Yield Farming</button>
        </div>
        <div class="defi-section">
          <h3>Lending</h3>
          <button onclick="showLendingInterface()">Supply Assets</button>
          <button onclick="showBorrowingInterface()">Borrow Assets</button>
        </div>
        <div class="defi-section">
          <h3>Cross-Chain</h3>
          <button onclick="showBridgeInterface()">Bridge Assets</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
  }

  /**
   * Show AI Chatbot
   */
  function showAIChatbot() {
    if (!moduleStates.aiChatbot.initialized) {
      toast('e', '❌ AI Chatbot not initialized');
      return;
    }

    // Create chat interface
    const chatPanel = document.createElement('div');
    chatPanel.id = 'ai-chat-panel';
    chatPanel.className = 'chat-panel';
    chatPanel.innerHTML = `
      <div class="chat-header">
        <h2>🤖 AI Assistant</h2>
        <button onclick="closePanel('ai-chat-panel')">✕</button>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input">
        <input type="text" id="chat-input" placeholder="Ask me anything...">
        <button onclick="sendChatMessage()">Send</button>
      </div>
    `;

    document.body.appendChild(chatPanel);

    // Create conversation
    if (typeof CU !== 'undefined' && CU.id) {
      const conversationId = AdvancedAIChatbot.createConversation(CU.id);
      chatPanel.dataset.conversationId = conversationId;
    }
  }

  /**
   * Show NFT Marketplace
   */
  function showNFTMarketplace() {
    if (!moduleStates.nftMarketplace.initialized) {
      toast('e', '❌ NFT Marketplace not initialized');
      return;
    }

    // Create NFT marketplace panel
    const panel = document.createElement('div');
    panel.id = 'nft-panel';
    panel.className = 'panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h2>🖼️ NFT Marketplace</h2>
        <button onclick="closePanel('nft-panel')">✕</button>
      </div>
      <div class="panel-content">
        <div class="nft-section">
          <h3>My NFTs</h3>
          <button onclick="loadMyNFTs()">Load My NFTs</button>
          <div id="my-nfts"></div>
        </div>
        <div class="nft-section">
          <h3>Marketplace</h3>
          <button onclick="browseMarketplace()">Browse Marketplace</button>
          <div id="marketplace-listings"></div>
        </div>
        <div class="nft-section">
          <h3>Create Listing</h3>
          <button onclick="showCreateListing()">Create Listing</button>
        </div>
        <div class="nft-section">
          <h3>NFT Lending</h3>
          <button onclick="showLendingInterface()">Get Loan</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
  }

  /**
   * Show Collaboration Panel
   */
  function showCollaborationPanel() {
    if (!moduleStates.collaboration.initialized) {
      toast('e', '❌ Collaboration not initialized');
      return;
    }

    // Create collaboration panel
    const panel = document.createElement('div');
    panel.id = 'collab-panel';
    panel.className = 'panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h2>👥 Collaboration</h2>
        <button onclick="closePanel('collab-panel')">✕</button>
      </div>
      <div class="panel-content">
        <div class="collab-section">
          <h3>Sessions</h3>
          <button onclick="createSession()">Create Session</button>
          <button onclick="joinSession()">Join Session</button>
        </div>
        <div class="collab-section">
          <h3>Documents</h3>
          <button onclick="createDocument()">Create Document</button>
        </div>
        <div class="collab-section">
          <h3>Whiteboard</h3>
          <button onclick="createWhiteboard()">Create Whiteboard</button>
        </div>
        <div class="collab-section">
          <h3>Video Chat</h3>
          <button onclick="startVideoChat()">Start Video Chat</button>
          <button onclick="stopChat()">Stop Chat</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
  }

  /**
   * Close panel
   */
  function closePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.remove();
    }
  }

  // ── Global Functions ───────────────────────────────────────────────────────

  /**
   * Send chat message
   */
  async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    const chatPanel = document.getElementById('ai-chat-panel');
    const conversationId = chatPanel?.dataset.conversationId;

    if (!conversationId) {
      toast('e', '❌ No active conversation');
      return;
    }

    // Add user message to UI
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML += `<div class="user-message">${message}</div>`;

    // Get AI response
    const response = await AdvancedAIChatbot.sendMessage(conversationId, message);

    if (response.success) {
      messagesContainer.innerHTML += `<div class="ai-message">${response.response}</div>`;
    } else {
      messagesContainer.innerHTML += `<div class="error-message">Error: ${response.error}</div>`;
    }

    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // ── Auto-Initialization ───────────────────────────────────────────────────

  /**
   * Auto-initialize on page load
   */
  function autoInitialize() {
    // Check if we should auto-initialize
    const autoInit = localStorage.getItem('advanced-modules-auto-init') === 'true';

    if (autoInit) {
      const config = {
        userId: typeof CU !== 'undefined' ? CU.id : null,
        defi: { walletAddress: typeof CU !== 'undefined' ? CU.walletAddress : null },
        aiChatbot: {
          provider: 'openai',
          model: 'gpt-4-turbo-preview',
          knowledgeBase: true
        },
        biometricAuth: { faceRecognition: true },
        collaboration: { autoConnect: false },
        aiMessaging: { apiKey: typeof CU !== 'undefined' ? CU.aiApiKey : null, provider: 'openai' },
        secureCalling: { e2eeEnabled: true, biometricEnabled: true },
        multilingualSupport: { useAIMode: true, defaultLanguage: 'en' },
        collaborationTools: { enableCodeSharing: true, enableDocCollaboration: true },
        gamification: { enableBadges: true, enableLeaderboard: true, enableGames: true },
        crossDeviceSync: { enableCloudBackup: true, enableOfflineMode: true },
        smartNotifications: { enablePriority: true, enableDND: true, enableSmartSummary: true }
      };

      loadModules().then(() => {
        initializeModules(config);
        integrateUI();
      });
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Module Management
    loadModules: loadModules,
    initializeModules: initializeModules,
    integrateUI: integrateUI,

    // Module States
    getModuleStates: () => ({ ...moduleStates }),

    // UI Functions
    showDeFiPanel: showDeFiPanel,
    showAIChatbot: showAIChatbot,
    showNFTMarketplace: showNFTMarketplace,
    showCollaborationPanel: showCollaborationPanel,
    closePanel: closePanel,

    // Auto-Initialization
    autoInitialize: autoInitialize,

    // Module Access
    getDeFi: () => typeof AdvancedDeFi !== 'undefined' ? AdvancedDeFi : null,
    getAIChatbot: () => typeof AdvancedAIChatbot !== 'undefined' ? AdvancedAIChatbot : null,
    getBiometricAuth: () => typeof AdvancedBiometricAuth !== 'undefined' ? AdvancedBiometricAuth : null,
    getNFTMarketplace: () => typeof AdvancedNFTMarketplace !== 'undefined' ? AdvancedNFTMarketplace : null,
    getCollaboration: () => typeof AdvancedCollaboration !== 'undefined' ? AdvancedCollaboration : null,
    getPerformance: () => typeof PerformanceEnhancements !== 'undefined' ? PerformanceEnhancements : null,
    getSecurity: () => typeof SecurityEnhancements !== 'undefined' ? SecurityEnhancements : null,
    getAnalytics: () => typeof AnalyticsMonitoring !== 'undefined' ? AnalyticsMonitoring : null,
    getAIMessaging: () => typeof AIMessaging !== 'undefined' ? AIMessaging : null,
    getVideoEffects: () => typeof VideoEffects !== 'undefined' ? VideoEffects : null,
    getSecureCalling: () => typeof SecureCalling !== 'undefined' ? SecureCalling : null,
    getMultilingualSupport: () => typeof MultilingualSupport !== 'undefined' ? MultilingualSupport : null,
    getCallAnalytics: () => typeof CallAnalytics !== 'undefined' ? CallAnalytics : null,
    getCollaborationTools: () => typeof CollaborationTools !== 'undefined' ? CollaborationTools : null,
    getGamification: () => typeof Gamification !== 'undefined' ? Gamification : null,
    getCrossDeviceSync: () => typeof CrossDeviceSync !== 'undefined' ? CrossDeviceSync : null,
    getSmartNotifications: () => typeof SmartNotifications !== 'undefined' ? SmartNotifications : null
  };

})();

// Auto-initialize if enabled
document.addEventListener('DOMContentLoaded', () => {
  AdvancedModulesIntegration.autoInitialize();
});

// Make available globally
window.AdvancedModulesIntegration = AdvancedModulesIntegration;
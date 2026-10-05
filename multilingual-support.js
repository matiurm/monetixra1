/**
 * ================================================================
 *  MULTILINGUAL SUPPORT SYSTEM (ENHANCED)
 *  Real-time Translation | Voice Translation | Auto Language Detection
 *  UI Localization | Accessibility | Real-time Captioning
 *  Voice Cloning | Sign Language Support | Dialect Detection
 * ================================================================
 */

const MultilingualSupport = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    version: '2.0.0',
    defaultLanguage: 'en',
    supportedLanguages: {
      en: { name: 'English', native: 'English' },
      bn: { name: 'Bengali', native: 'বাংলা' },
      es: { name: 'Spanish', native: 'Español' },
      fr: { name: 'French', native: 'Français' },
      de: { name: 'German', native: 'Deutsch' },
      hi: { name: 'Hindi', native: 'हिन्दी' },
      zh: { name: 'Chinese', native: '中文' },
      ja: { name: 'Japanese', native: '日本語' },
      ko: { name: 'Korean', native: '한국어' },
      ar: { name: 'Arabic', native: 'العربية' },
      pt: { name: 'Portuguese', native: 'Português' },
      ru: { name: 'Russian', native: 'Русский' },
      it: { name: 'Italian', native: 'Italiano' },
      nl: { name: 'Dutch', native: 'Nederlands' },
      tr: { name: 'Turkish', native: 'Türkçe' }
    },
    enableRealTimeCaptioning: true,
    enableVoiceCloning: true,
    enableSignLanguage: true,
    enableDialectDetection: true
  };

  // State
  let state = {
    currentLanguage: CONFIG.defaultLanguage,
    translationCache: new Map(),
    uiTranslations: new Map(),
    googleTranslateApiKey: null,
    useAIMode: false,
    captioningActive: false,
    voiceClones: new Map(),
    signLanguageModels: new Map(),
    dialectProfiles: new Map()
  };

  // UI translations (simplified - would be expanded in production)
  const UI_TRANSLATIONS = {
    en: {
      'home': 'Home',
      'messages': 'Messages',
      'notifications': 'Notifications',
      'profile': 'Profile',
      'settings': 'Settings',
      'send': 'Send',
      'type_message': 'Type a message...',
      'video_call': 'Video Call',
      'audio_call': 'Audio Call',
      'end_call': 'End Call',
      'mute': 'Mute',
      'unmute': 'Unmute',
      'camera': 'Camera',
      'screen_share': 'Screen Share',
      'recording': 'Recording',
      'participants': 'Participants',
      'chat': 'Chat',
      'friends': 'Friends',
      'feed': 'Feed',
      'explore': 'Explore',
      'search': 'Search',
      'login': 'Login',
      'signup': 'Sign Up',
      'logout': 'Logout',
      'save': 'Save',
      'cancel': 'Cancel',
      'delete': 'Delete',
      'edit': 'Edit',
      'share': 'Share',
      'like': 'Like',
      'comment': 'Comment',
      'follow': 'Follow',
      'unfollow': 'Unfollow',
      'block': 'Block',
      'report': 'Report'
    },
    bn: {
      'home': 'হোম',
      'messages': 'বার্তা',
      'notifications': 'নোটিফিকেশন',
      'profile': 'প্রোফাইল',
      'settings': 'সেটিংস',
      'send': 'পাঠান',
      'type_message': 'বার্তা লিখুন...',
      'video_call': 'ভিডিও কল',
      'audio_call': 'অডিও কল',
      'end_call': 'কল শেষ করুন',
      'mute': 'মিউট',
      'unmute': 'আনমিউট',
      'camera': 'ক্যামেরা',
      'screen_share': 'স্ক্রিন শেয়ার',
      'recording': 'রেকর্ডিং',
      'participants': 'অংশগ্রহণকারী',
      'chat': 'চ্যাট',
      'friends': 'বন্ধুরা',
      'feed': 'ফিড',
      'explore': 'অন্বেষণ',
      'search': 'অনুসন্ধান',
      'login': 'লগইন',
      'signup': 'সাইন আপ',
      'logout': 'লগআউট',
      'save': 'সংরক্ষণ',
      'cancel': 'বাতিল',
      'delete': 'মুছে ফেলুন',
      'edit': 'সম্পাদনা',
      'share': 'শেয়ার',
      'like': 'পছন্দ',
      'comment': 'মন্তব্য',
      'follow': 'অনুসরণ',
      'unfollow': 'অনুসরণ বন্ধ',
      'block': 'ব্লক',
      'report': 'রিপোর্ট'
    },
    es: {
      'home': 'Inicio',
      'messages': 'Mensajes',
      'notifications': 'Notificaciones',
      'profile': 'Perfil',
      'settings': 'Configuración',
      'send': 'Enviar',
      'type_message': 'Escribe un mensaje...',
      'video_call': 'Videollamada',
      'audio_call': 'Llamada de audio',
      'end_call': 'Terminar llamada',
      'mute': 'Silenciar',
      'unmute': 'Activar sonido',
      'camera': 'Cámara',
      'screen_share': 'Compartir pantalla',
      'recording': 'Grabación',
      'participants': 'Participantes',
      'chat': 'Chat',
      'friends': 'Amigos',
      'feed': 'Feed',
      'explore': 'Explorar',
      'search': 'Buscar',
      'login': 'Iniciar sesión',
      'signup': 'Registrarse',
      'logout': 'Cerrar sesión',
      'save': 'Guardar',
      'cancel': 'Cancelar',
      'delete': 'Eliminar',
      'edit': 'Editar',
      'share': 'Compartir',
      'like': 'Me gusta',
      'comment': 'Comentar',
      'follow': 'Seguir',
      'unfollow': 'Dejar de seguir',
      'block': 'Bloquear',
      'report': 'Reportar'
    }
  };

  // ============================================
  // TEXT TRANSLATION
  // ============================================

  async function translateText(text, targetLanguage, sourceLanguage = 'auto') {
    try {
      if (!text || text.trim() === '') {
        return text;
      }

      // Check cache
      const cacheKey = `${sourceLanguage}-${targetLanguage}-${text}`;
      if (state.translationCache.has(cacheKey)) {
        return state.translationCache.get(cacheKey);
      }

      let translated;

      if (state.useAIMode && typeof AIMessaging !== 'undefined') {
        // Use AI for translation
        translated = await AIMessaging.translateText(text, targetLanguage, sourceLanguage);
      } else if (state.googleTranslateApiKey) {
        // Use Google Translate API
        translated = await translateWithGoogle(text, targetLanguage, sourceLanguage);
      } else {
        // Use browser's built-in translation (if available)
        translated = await translateWithBrowser(text, targetLanguage);
      }

      // Cache result
      state.translationCache.set(cacheKey, translated);

      return translated;
    } catch (error) {
      console.error('[MultilingualSupport] Translation failed:', error);
      return text;
    }
  }

  async function translateWithGoogle(text, targetLanguage, sourceLanguage = 'auto') {
    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${state.googleTranslateApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          source: sourceLanguage === 'auto' ? undefined : sourceLanguage
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.data.translations[0].translatedText;
    } catch (error) {
      console.error('[MultilingualSupport] Google Translate failed:', error);
      throw error;
    }
  }

  async function translateWithBrowser(text, targetLanguage) {
    // Browser doesn't have built-in translation API
    // Return original text as fallback
    console.warn('[MultilingualSupport] Browser translation not available');
    return text;
  }

  // ============================================
  // LANGUAGE DETECTION
  // ============================================

  async function detectLanguage(text) {
    try {
      if (state.useAIMode && typeof AIMessaging !== 'undefined') {
        return await AIMessaging.detectLanguage(text);
      } else if (state.googleTranslateApiKey) {
        return await detectWithGoogle(text);
      } else {
        // Simple language detection based on character sets
        return detectSimple(text);
      }
    } catch (error) {
      console.error('[MultilingualSupport] Language detection failed:', error);
      return CONFIG.defaultLanguage;
    }
  }

  async function detectWithGoogle(text) {
    try {
      const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${state.googleTranslateApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: text })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.data.detections[0][0].language;
    } catch (error) {
      console.error('[MultilingualSupport] Google detection failed:', error);
      throw error;
    }
  }

  function detectSimple(text) {
    // Simple character-based detection
    const bengaliRegex = /[\u0980-\u09FF]/;
    const chineseRegex = /[\u4E00-\u9FFF]/;
    const arabicRegex = /[\u0600-\u06FF]/;
    const cyrillicRegex = /[\u0400-\u04FF]/;
    const greekRegex = /[\u0370-\u03FF]/;

    if (bengaliRegex.test(text)) return 'bn';
    if (chineseRegex.test(text)) return 'zh';
    if (arabicRegex.test(text)) return 'ar';
    if (cyrillicRegex.test(text)) return 'ru';
    if (greekRegex.test(text)) return 'el';

    return CONFIG.defaultLanguage;
  }

  // ============================================
  // VOICE TRANSLATION
  // ============================================

  async function translateVoice(audioBlob, targetLanguage) {
    try {
      // Convert audio to text (Speech-to-Text)
      const text = await audioToText(audioBlob);

      // Translate text
      const translated = await translateText(text, targetLanguage);

      // Convert translated text to speech (Text-to-Speech)
      const audio = await textToAudio(translated, targetLanguage);

      return audio;
    } catch (error) {
      console.error('[MultilingualSupport] Voice translation failed:', error);
      throw error;
    }
  }

  async function audioToText(audioBlob) {
    try {
      // Use Web Speech API for speech-to-text
      return new Promise((resolve, reject) => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = state.currentLanguage;
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
      console.error('[MultilingualSupport] Audio to text failed:', error);
      throw error;
    }
  }

  async function textToAudio(text, language) {
    try {
      // Use Web Speech API for text-to-speech
      return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;

        utterance.onend = () => {
          resolve(utterance);
        };

        utterance.onerror = (event) => {
          reject(new Error(event.error));
        };

        window.speechSynthesis.speak(utterance);
      });
    } catch (error) {
      console.error('[MultilingualSupport] Text to audio failed:', error);
      throw error;
    }
  }

  // ============================================
  // UI LOCALIZATION
  // ============================================

  function setLanguage(language) {
    try {
      if (!CONFIG.supportedLanguages[language]) {
        console.warn('[MultilingualSupport] Unsupported language:', language);
        return false;
      }

      state.currentLanguage = language;
      localizeUI();

      console.log('[MultilingualSupport] Language set to:', language);
      return true;
    } catch (error) {
      console.error('[MultilingualSupport] Set language failed:', error);
      return false;
    }
  }

  function getCurrentLanguage() {
    return state.currentLanguage;
  }

  function getSupportedLanguages() {
    return CONFIG.supportedLanguages;
  }

  function localizeUI() {
    try {
      const translations = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS[CONFIG.defaultLanguage];

      // Translate all elements with data-i18n attribute
      document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
          element.textContent = translations[key];
        }
      });

      // Translate placeholders
      document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
          element.placeholder = translations[key];
        }
      });

      // Update document direction for RTL languages
      if (state.currentLanguage === 'ar' || state.currentLanguage === 'he') {
        document.documentElement.dir = 'rtl';
      } else {
        document.documentElement.dir = 'ltr';
      }

      console.log('[MultilingualSupport] UI localized');
    } catch (error) {
      console.error('[MultilingualSupport] UI localization failed:', error);
    }
  }

  function getTranslation(key) {
    const translations = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS[CONFIG.defaultLanguage];
    return translations[key] || key;
  }

  // ============================================
  // AUTO-TRANSLATE IN CHAT
  // ============================================

  async function autoTranslateMessage(message, targetLanguage) {
    try {
      const detectedLanguage = await detectLanguage(message);

      if (detectedLanguage !== targetLanguage) {
        const translated = await translateText(message, targetLanguage, detectedLanguage);
        return {
          original: message,
          translated: translated,
          originalLanguage: detectedLanguage,
          targetLanguage: targetLanguage
        };
      }

      return {
        original: message,
        translated: null,
        originalLanguage: detectedLanguage,
        targetLanguage: targetLanguage
      };
    } catch (error) {
      console.error('[MultilingualSupport] Auto-translate failed:', error);
      return {
        original: message,
        translated: null,
        originalLanguage: 'unknown',
        targetLanguage: targetLanguage
      };
    }
  }

  // ============================================
  // REAL-TIME CAPTIONING
  // ============================================

  async function startRealTimeCaptioning(videoElement, targetLanguage) {
    try {
      if (!CONFIG.enableRealTimeCaptioning) {
        console.warn('[MultilingualSupport] Real-time captioning not enabled');
        return false;
      }

      state.captioningActive = true;

      // Create caption container
      const captionContainer = document.createElement('div');
      captionContainer.id = 'caption-container';
      captionContainer.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 18px;
        text-align: center;
        z-index: 1000;
        max-width: 80%;
      `;

      videoElement.parentElement.appendChild(captionContainer);

      // Start speech recognition
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = state.currentLanguage;

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        // Translate if needed
        if (targetLanguage && targetLanguage !== state.currentLanguage) {
          translateText(transcript, targetLanguage).then(translated => {
            captionContainer.textContent = translated;
          });
        } else {
          captionContainer.textContent = transcript;
        }
      };

      recognition.onerror = (event) => {
        console.error('[MultilingualSupport] Captioning error:', event.error);
      };

      recognition.start();

      console.log('[MultilingualSupport] Real-time captioning started');
      return true;
    } catch (error) {
      console.error('[MultilingualSupport] Start captioning failed:', error);
      return false;
    }
  }

  function stopRealTimeCaptioning() {
    try {
      state.captioningActive = false;

      const captionContainer = document.getElementById('caption-container');
      if (captionContainer) {
        captionContainer.remove();
      }

      console.log('[MultilingualSupport] Real-time captioning stopped');
    } catch (error) {
      console.error('[MultilingualSupport] Stop captioning failed:', error);
    }
  }

  // ============================================
  // VOICE CLONING
  // ============================================

  async function createVoiceClone(userId, audioSamples) {
    try {
      if (!CONFIG.enableVoiceCloning) {
        return null;
      }

      // In production, this would use a voice cloning API like ElevenLabs
      // For now, we'll create a simplified voice profile
      const voiceProfile = {
        userId: userId,
        createdAt: Date.now(),
        samples: audioSamples.length,
        pitch: analyzeAudioPitch(audioSamples),
        speed: analyzeAudioSpeed(audioSamples),
        timbre: analyzeAudioTimbre(audioSamples)
      };

      state.voiceClones.set(userId, voiceProfile);

      console.log('[MultilingualSupport] Voice clone created for user:', userId);
      return voiceProfile;
    } catch (error) {
      console.error('[MultilingualSupport] Voice clone creation failed:', error);
      return null;
    }
  }

  async function synthesizeVoice(text, targetLanguage, userId = null) {
    try {
      if (!CONFIG.enableVoiceCloning) {
        return textToAudio(text, targetLanguage);
      }

      // Get voice profile if userId provided
      const voiceProfile = userId ? state.voiceClones.get(userId) : null;

      // In production, this would use voice cloning API
      // For now, use standard TTS with adjusted parameters
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLanguage;

      if (voiceProfile) {
        // Adjust voice based on profile
        utterance.pitch = voiceProfile.pitch;
        utterance.rate = voiceProfile.speed;
      }

      return new Promise((resolve, reject) => {
        utterance.onend = () => resolve(utterance);
        utterance.onerror = (e) => reject(new Error(e.error));
        window.speechSynthesis.speak(utterance);
      });
    } catch (error) {
      console.error('[MultilingualSupport] Voice synthesis failed:', error);
      throw error;
    }
  }

  function analyzeAudioPitch(audioSamples) {
    // Simplified pitch analysis
    return 1.0; // Would use FFT in production
  }

  function analyzeAudioSpeed(audioSamples) {
    // Simplified speed analysis
    return 1.0; // Would analyze speech rate in production
  }

  function analyzeAudioTimbre(audioSamples) {
    // Simplified timbre analysis
    return 'neutral'; // Would analyze spectral characteristics in production
  }

  // ============================================
  // SIGN LANGUAGE SUPPORT
  // ============================================

  async function initSignLanguageModel() {
    try {
      if (!CONFIG.enableSignLanguage) {
        return false;
      }

      // In production, load sign language avatar models
      // For now, we'll use a placeholder
      state.signLanguageModels.set('asl', { loaded: true, type: 'avatar' });
      state.signLanguageModels.set('bsl', { loaded: true, type: 'avatar' });

      console.log('[MultilingualSupport] Sign language models initialized');
      return true;
    } catch (error) {
      console.error('[MultilingualSupport] Sign language model init failed:', error);
      return false;
    }
  }

  async function convertToSignLanguage(text, signLanguage = 'asl') {
    try {
      if (!CONFIG.enableSignLanguage) {
        return null;
      }

      const model = state.signLanguageModels.get(signLanguage);
      if (!model || !model.loaded) {
        await initSignLanguageModel();
      }

      // In production, this would generate sign language animation
      // For now, return sequence of signs
      const words = text.split(' ');
      const signSequence = words.map(word => ({
        word: word,
        sign: word.toLowerCase(),
        duration: 500
      }));

      return {
        signLanguage: signLanguage,
        sequence: signSequence,
        duration: signSequence.length * 500
      };
    } catch (error) {
      console.error('[MultilingualSupport] Sign language conversion failed:', error);
      return null;
    }
  }

  function displaySignLanguage(signData, container) {
    try {
      if (!signData) return;

      // Create sign language avatar container
      const avatarContainer = document.createElement('div');
      avatarContainer.id = 'sign-avatar';
      avatarContainer.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 200px;
        height: 200px;
        background: #1a1a2e;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;

      avatarContainer.innerHTML = `
        <div style="text-align: center; color: white;">
          <div style="font-size: 48px;">🙌</div>
          <div style="font-size: 14px; margin-top: 10px;">Sign Language</div>
          <div id="current-sign" style="font-size: 18px; margin-top: 5px;">Ready</div>
        </div>
      `;

      container.appendChild(avatarContainer);

      // Animate signs
      let index = 0;
      const interval = setInterval(() => {
        if (index >= signData.sequence.length) {
          clearInterval(interval);
          avatarContainer.remove();
          return;
        }

        const currentSign = signData.sequence[index];
        document.getElementById('current-sign').textContent = currentSign.word;
        index++;
      }, 500);

      console.log('[MultilingualSupport] Sign language display started');
    } catch (error) {
      console.error('[MultilingualSupport] Display sign language failed:', error);
    }
  }

  // ============================================
  // DIALECT DETECTION
  // ============================================

  async function detectDialect(text, language) {
    try {
      if (!CONFIG.enableDialectDetection) {
        return { dialect: 'standard', confidence: 0.5 };
      }

      // In production, use NLP models for dialect detection
      // For now, use simplified detection based on common patterns
      const dialectPatterns = {
        'en': {
          'us': ['color', 'favorite', 'center', 'theater'],
          'uk': ['colour', 'favourite', 'centre', 'theatre'],
          'au': ['mate', 'arvo', 'servo', 'barbie']
        },
        'bn': {
          'standard': ['আমি', 'তুমি', 'সে', 'তারা'],
          'sylheti': ['আমার', 'তোমার', 'হোই', 'দেয়']
        }
      };

      const patterns = dialectPatterns[language] || {};
      let bestMatch = 'standard';
      let maxScore = 0;

      for (const [dialect, keywords] of Object.entries(patterns)) {
        const score = keywords.filter(keyword => text.toLowerCase().includes(keyword)).length;
        if (score > maxScore) {
          maxScore = score;
          bestMatch = dialect;
        }
      }

      // Update dialect profile
      if (!state.dialectProfiles.has(language)) {
        state.dialectProfiles.set(language, new Map());
      }
      const profile = state.dialectProfiles.get(language);
      profile.set(bestMatch, (profile.get(bestMatch) || 0) + 1);

      return {
        dialect: bestMatch,
        confidence: maxScore > 0 ? 0.7 + (maxScore * 0.05) : 0.5
      };
    } catch (error) {
      console.error('[MultilingualSupport] Dialect detection failed:', error);
      return { dialect: 'standard', confidence: 0.5 };
    }
  }

  function getDialectProfile(language) {
    const profile = state.dialectProfiles.get(language);
    if (!profile) return null;

    return Array.from(profile.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dialect, count]) => ({ dialect, count }));
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function initialize(config = {}) {
    if (config.googleTranslateApiKey) {
      state.googleTranslateApiKey = config.googleTranslateApiKey;
    }
    if (config.useAIMode !== undefined) {
      state.useAIMode = config.useAIMode;
    }
    if (config.defaultLanguage) {
      state.currentLanguage = config.defaultLanguage;
    }

    // Load saved language preference
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && CONFIG.supportedLanguages[savedLanguage]) {
      state.currentLanguage = savedLanguage;
    }

    // Localize UI
    localizeUI();

    console.log('[MultilingualSupport] Initialized');
    console.log('[MultilingualSupport] Current language:', state.currentLanguage);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    initialize,
    translateText,
    detectLanguage,
    translateVoice,
    setLanguage,
    getCurrentLanguage,
    getSupportedLanguages,
    localizeUI,
    getTranslation,
    autoTranslateMessage,
    // Enhanced features
    startRealTimeCaptioning,
    stopRealTimeCaptioning,
    createVoiceClone,
    synthesizeVoice,
    initSignLanguageModel,
    convertToSignLanguage,
    displaySignLanguage,
    detectDialect,
    getDialectProfile,
    getState: () => state
  };
})();

// Auto-initialize
MultilingualSupport.initialize({
  useAIMode: true,
  defaultLanguage: 'en'
});

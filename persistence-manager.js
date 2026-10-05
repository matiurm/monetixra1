// ============================================================
//  Monetixra - Ultimate Persistence Manager
//  Ensures ALL data persists across:
//  - Website updates/upgrades
//  - Page refreshes
//  - Logout/Login cycles
//  - Browser restarts
//  - Resets
// ============================================================

const PERSISTENCE_KEY = 'mxt_persistence_';
const PERSISTENCE_VERSION = 'v1.0';

// Storage layers (in order of priority)
const STORAGE_LAYERS = {
  localStorage: 'localStorage',
  indexedDB: 'indexedDB',
  sessionStorage: 'sessionStorage'
};

class PersistenceManager {
  constructor() {
    this.initialized = false;
    this.autoSaveEnabled = true;
    this.saveQueue = [];
    this.isSaving = false;
  }

  // Initialize all storage layers
  async init() {
    if (this.initialized) return;
    
    console.log('[PersistenceManager] Initializing...');
    
    // Initialize IndexedDB
    await this.initIndexedDB();
    
    // Load all persisted data
    await this.loadAllData();
    
    // Setup auto-save interval
    this.setupAutoSave();
    
    // Setup event listeners for page lifecycle
    this.setupEventListeners();
    
    this.initialized = true;
    console.log('[PersistenceManager] ✅ Initialized successfully');
  }

  // Initialize IndexedDB for large data
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MonetixraPersistenceDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[PersistenceManager] IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create stores for different data types
        if (!db.objectStoreNames.contains('points')) {
          db.createObjectStore('points', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('posts')) {
          db.createObjectStore('posts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session', { keyPath: 'key' });
        }
      };
    });
  }

  // Save user points (persists across everything)
  async savePoints(userId, points) {
    if (!userId) return;
    
    // Save to localStorage (fast access)
    try {
      localStorage.setItem(PERSISTENCE_KEY + 'points_' + userId, points);
    } catch (e) {
      console.warn('[PersistenceManager] localStorage save failed:', e);
    }
    
    // Save to IndexedDB (reliable storage)
    try {
      await this.saveToIndexedDB('points', { userId, points, timestamp: Date.now() });
    } catch (e) {
      console.warn('[PersistenceManager] IndexedDB save failed:', e);
    }
    
    console.log('[PersistenceManager] Points saved:', userId, points);
  }

  // Load user points
  async loadPoints(userId) {
    if (!userId) return 0;
    
    // Try localStorage first (fast)
    try {
      const localPoints = localStorage.getItem(PERSISTENCE_KEY + 'points_' + userId);
      if (localPoints !== null) {
        return parseInt(localPoints) || 0;
      }
    } catch (e) {
      console.warn('[PersistenceManager] localStorage load failed:', e);
    }
    
    // Try IndexedDB (reliable)
    try {
      const data = await this.getFromIndexedDB('points', userId);
      if (data) {
        return data.points || 0;
      }
    } catch (e) {
      console.warn('[PersistenceManager] IndexedDB load failed:', e);
    }
    
    return 0;
  }

  // Save user session (persists login state)
  async saveSession(userId, sessionData) {
    if (!userId) return;
    
    const session = {
      userId,
      ...sessionData,
      timestamp: Date.now(),
      version: PERSISTENCE_VERSION
    };
    
    // Save to localStorage
    try {
      localStorage.setItem(PERSISTENCE_KEY + 'session', JSON.stringify(session));
    } catch (e) {
      console.warn('[PersistenceManager] Session localStorage save failed:', e);
    }
    
    // Save to IndexedDB
    try {
      await this.saveToIndexedDB('session', { key: 'current', ...session });
    } catch (e) {
      console.warn('[PersistenceManager] Session IndexedDB save failed:', e);
    }
    
    console.log('[PersistenceManager] Session saved for user:', userId);
  }

  // Load user session
  async loadSession() {
    // Try localStorage first
    try {
      const localSession = localStorage.getItem(PERSISTENCE_KEY + 'session');
      if (localSession) {
        return JSON.parse(localSession);
      }
    } catch (e) {
      console.warn('[PersistenceManager] Session localStorage load failed:', e);
    }
    
    // Try IndexedDB
    try {
      const session = await this.getFromIndexedDB('session', 'current');
      if (session) {
        return session;
      }
    } catch (e) {
      console.warn('[PersistenceManager] Session IndexedDB load failed:', e);
    }
    
    return null;
  }

  // Clear session (logout)
  async clearSession() {
    try {
      localStorage.removeItem(PERSISTENCE_KEY + 'session');
    } catch (e) {}
    
    try {
      await this.deleteFromIndexedDB('session', 'current');
    } catch (e) {}
    
    console.log('[PersistenceManager] Session cleared');
  }

  // Save media file (video, audio, photo)
  async saveMedia(mediaId, data, metadata = {}) {
    const media = {
      id: mediaId,
      data: data,
      metadata: metadata,
      timestamp: Date.now()
    };
    
    // Save to IndexedDB (for large files)
    try {
      await this.saveToIndexedDB('media', media);
      console.log('[PersistenceManager] Media saved:', mediaId);
      return true;
    } catch (e) {
      console.warn('[PersistenceManager] Media save failed:', e);
      return false;
    }
  }

  // Load media file
  async loadMedia(mediaId) {
    try {
      const media = await this.getFromIndexedDB('media', mediaId);
      if (media) {
        return media;
      }
    } catch (e) {
      console.warn('[PersistenceManager] Media load failed:', e);
    }
    return null;
  }

  // Save post with all content
  async savePost(post) {
    try {
      await this.saveToIndexedDB('posts', post);
      console.log('[PersistenceManager] Post saved:', post.id);
    } catch (e) {
      console.warn('[PersistenceManager] Post save failed:', e);
    }
  }

  // Load post
  async loadPost(postId) {
    try {
      return await this.getFromIndexedDB('posts', postId);
    } catch (e) {
      console.warn('[PersistenceManager] Post load failed:', e);
      return null;
    }
  }

  // Save chat message
  async saveChat(message) {
    try {
      await this.saveToIndexedDB('chats', message);
    } catch (e) {
      console.warn('[PersistenceManager] Chat save failed:', e);
    }
  }

  // Save user settings
  async saveSettings(key, value) {
    const settings = { key, value, timestamp: Date.now() };
    
    try {
      localStorage.setItem(PERSISTENCE_KEY + 'setting_' + key, JSON.stringify(value));
    } catch (e) {}
    
    try {
      await this.saveToIndexedDB('settings', settings);
    } catch (e) {}
  }

  // Load user settings
  async loadSettings(key, defaultValue = null) {
    // Try localStorage first
    try {
      const localValue = localStorage.getItem(PERSISTENCE_KEY + 'setting_' + key);
      if (localValue !== null) {
        return JSON.parse(localValue);
      }
    } catch (e) {}
    
    // Try IndexedDB
    try {
      const settings = await this.getFromIndexedDB('settings', key);
      if (settings) {
        return settings.value;
      }
    } catch (e) {}
    
    return defaultValue;
  }

  // IndexedDB helper: save
  async saveToIndexedDB(storeName, data) {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // IndexedDB helper: get
  async getFromIndexedDB(storeName, key) {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // IndexedDB helper: delete
  async deleteFromIndexedDB(storeName, key) {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Load all persisted data on startup
  async loadAllData() {
    console.log('[PersistenceManager] Loading all persisted data...');
    
    // Load session
    const session = await this.loadSession();
    if (session) {
      console.log('[PersistenceManager] Session restored:', session.userId);
    }
    
    // Load settings
    const settings = await this.loadSettings('theme', 'dark');
    console.log('[PersistenceManager] Theme loaded:', settings);
    
    return { session, settings };
  }

  // Setup auto-save interval
  setupAutoSave() {
    // Auto-save every 30 seconds
    setInterval(() => {
      if (this.autoSaveEnabled && typeof CU !== 'undefined' && CU) {
        this.savePoints(CU.id, CU.points || 0);
      }
    }, 30000);
  }

  // Setup event listeners
  setupEventListeners() {
    // Save before page unload
    window.addEventListener('beforeunload', () => {
      if (typeof CU !== 'undefined' && CU) {
        this.savePoints(CU.id, CU.points || 0);
        if (typeof D !== 'undefined' && D) {
          this.saveSession(CU.id, { cur: D.cur });
        }
      }
    });

    // Save on page visibility change (user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && typeof CU !== 'undefined' && CU) {
        this.savePoints(CU.id, CU.points || 0);
      }
    });

    // Handle online/offline
    window.addEventListener('online', () => {
      console.log('[PersistenceManager] Back online');
    });

    window.addEventListener('offline', () => {
      console.log('[PersistenceManager] Gone offline - data is safe in storage');
    });
  }

  // Export all data (for backup)
  async exportAllData() {
    const data = {
      version: PERSISTENCE_VERSION,
      timestamp: Date.now(),
      session: await this.loadSession(),
      settings: {},
      points: {}
    };
    
    // Export all settings
    const allSettings = await this.getAllFromIndexedDB('settings');
    allSettings.forEach(s => {
      data.settings[s.key] = s.value;
    });
    
    // Export all points
    const allPoints = await this.getAllFromIndexedDB('points');
    allPoints.forEach(p => {
      data.points[p.userId] = p.points;
    });
    
    return data;
  }

  // Import all data (for restore)
  async importAllData(data) {
    if (!data || data.version !== PERSISTENCE_VERSION) {
      console.warn('[PersistenceManager] Invalid data version');
      return false;
    }
    
    // Restore session
    if (data.session) {
      await this.saveSession(data.session.userId, data.session);
    }
    
    // Restore settings
    for (const [key, value] of Object.entries(data.settings || {})) {
      await this.saveSettings(key, value);
    }
    
    // Restore points
    for (const [userId, points] of Object.entries(data.points || {})) {
      await this.savePoints(userId, points);
    }
    
    console.log('[PersistenceManager] Data imported successfully');
    return true;
  }

  // IndexedDB helper: get all
  async getAllFromIndexedDB(storeName) {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data (factory reset)
  async clearAllData() {
    console.log('[PersistenceManager] Clearing all data...');
    
    // Clear localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(PERSISTENCE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
    
    // Clear IndexedDB
    try {
      const stores = ['points', 'media', 'posts', 'chats', 'settings', 'session'];
      for (const store of stores) {
        await this.clearStore(store);
      }
    } catch (e) {}
    
    console.log('[PersistenceManager] All data cleared');
  }

  // Clear specific store
  async clearStore(storeName) {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get storage info
  async getStorageInfo() {
    const info = {
      localStorage: {},
      indexedDB: {}
    };
    
    // localStorage usage
    try {
      let total = 0;
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(PERSISTENCE_KEY)) {
          total += localStorage.getItem(key).length;
        }
      });
      info.localStorage.used = (total / 1024).toFixed(2) + ' KB';
      info.localStorage.items = keys.filter(k => k.startsWith(PERSISTENCE_KEY)).length;
    } catch (e) {}
    
    // IndexedDB usage
    try {
      if (this.db) {
        const stores = ['points', 'media', 'posts', 'chats', 'settings', 'session'];
        for (const store of stores) {
          const items = await this.getAllFromIndexedDB(store);
          info.indexedDB[store] = items.length;
        }
      }
    } catch (e) {}
    
    return info;
  }
}

// Create global instance
const persistenceManager = new PersistenceManager();

// Auto-initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    persistenceManager.init().catch(err => {
      console.error('[PersistenceManager] Init failed:', err);
    });
  });
}

// Export for use
window.PersistenceManager = persistenceManager;

console.log('[PersistenceManager] Module loaded ✅');
console.log('[PersistenceManager] Features: Points, Session, Media, Posts, Chats, Settings');

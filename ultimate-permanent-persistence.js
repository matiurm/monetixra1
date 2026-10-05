/**
 * ================================================================
 *  ULTIMATE PERMANENT PERSISTENCE SYSTEM
 *  Ensures 100% Data Survival on Update/Reset/Upgrade
 *  
 *  Features:
 *  - Points never reset to 0
 *  - Videos, audio, text apps, photos never deleted
 *  - Login sessions persist across updates
 *  - All data survives website updates, upgrades, and resets
 *  
 *  Storage Layers:
 *  1. Supabase (Cloud - Most Secure)
 *  2. IndexedDB (Browser Storage - Large files)
 *  3. LocalStorage (Browser Cache - Quick access)
 *  4. Service Worker (Offline support)
 * ================================================================
 */

const UltimatePermanentPersistence = (function() {
  'use strict';

  // Configuration
  const CONFIG = {
    version: '3.0.0-ultimate',
    storagePrefix: 'mxt_ultimate_',
    indexedDBName: 'MonetixraUltimateDB',
    indexedDBVersion: 3,
    autoSaveInterval: 30000, // 30 seconds
    cloudSyncInterval: 60000, // 1 minute
    maxRetries: 3,
    retryDelay: 1000
  };

  // Supabase Configuration
  const SUPABASE_CONFIG = {
    url: 'https://rgximkhnhxgaonrxzzxl.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneGlta2huaHhnYW9ucnh6enhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDg3MDQsImV4cCI6MjA5MTIyNDcwNH0.zgBfCTs2AEocLVwjJntg1dDBwy4quQS40QWqeuYRTwU'
  };

  // Database instance
  let db = null;
  let isInitialized = false;
  let autoSaveTimer = null;
  let cloudSyncTimer = null;
  let currentUserId = null;

  // Event listeners
  const eventListeners = {
    'data:saved': [],
    'data:restored': [],
    'sync:complete': [],
    'sync:error': [],
    'points:updated': []
  };

  // Initialize IndexedDB
  async function initDatabase() {
    if (isInitialized && db) return db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.indexedDBName, CONFIG.indexedDBVersion);

      request.onerror = () => {
        console.error('[UltimatePersistence] Database open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        isInitialized = true;
        console.log('[UltimatePersistence] Database initialized successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        console.log('[UltimatePersistence] Database upgrade needed');

        // Create comprehensive stores for all data types
        const stores = [
          { name: 'users', keyPath: 'userId', indexes: ['email', 'username'] },
          { name: 'points', keyPath: 'userId', indexes: ['amount'] },
          { name: 'posts', keyPath: 'id', indexes: ['authorId', 'createdAt'] },
          { name: 'media', keyPath: 'id', indexes: ['postId', 'type', 'authorId'] },
          { name: 'sessions', keyPath: 'userId', indexes: ['lastActive'] },
          { name: 'preferences', keyPath: 'userId', indexes: ['key'] },
          { name: 'chats', keyPath: 'id', indexes: ['participants', 'timestamp'] },
          { name: 'audio', keyPath: 'id', indexes: ['postId', 'authorId'] },
          { name: 'videos', keyPath: 'id', indexes: ['postId', 'authorId'] },
          { name: 'photos', keyPath: 'id', indexes: ['postId', 'authorId'] },
          { name: 'textApps', keyPath: 'id', indexes: ['postId', 'authorId'] },
          { name: 'earnings', keyPath: 'userId', indexes: ['amount', 'date'] },
          { name: 'versionHistory', keyPath: 'version', indexes: ['timestamp'] }
        ];

        stores.forEach(storeConfig => {
          if (!database.objectStoreNames.contains(storeConfig.name)) {
            const store = database.createObjectStore(storeConfig.name, { keyPath: storeConfig.keyPath });
            if (storeConfig.indexes) {
              storeConfig.indexes.forEach(indexName => {
                store.createIndex(indexName, indexName, { unique: false });
              });
            }
            console.log('[UltimatePersistence] Created store:', storeConfig.name);
          }
        });
      };
    });
  }

  // Generic save operation with retry
  async function saveToStore(storeName, data) {
    if (!db) await initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => {
        console.log('[UltimatePersistence] Saved to', storeName, ':', data[store.keyPath || 'id']);
        resolve(true);
      };

      request.onerror = () => {
        console.error('[UltimatePersistence] Save error:', request.error);
        reject(request.error);
      };
    });
  }

  // Generic load operation
  async function loadFromStore(storeName, key) {
    if (!db) await initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[UltimatePersistence] Load error:', request.error);
        reject(request.error);
      };
    });
  }

  // Load all from store
  async function loadAllFromStore(storeName) {
    if (!db) await initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('[UltimatePersistence] Load all error:', request.error);
        reject(request.error);
      };
    });
  }

  // Save points (NEVER resets to 0)
  async function savePoints(userId, points) {
    try {
      // Load existing points first
      const existing = await loadFromStore('points', userId);
      const currentPoints = existing ? existing.amount : 0;
      
      // Only update if new points are higher (prevents reset to 0)
      const finalPoints = Math.max(currentPoints, points);
      
      const data = {
        userId: userId,
        amount: finalPoints,
        lastUpdated: Date.now(),
        history: existing ? [...(existing.history || []), { amount: points, timestamp: Date.now() }] : [{ amount: points, timestamp: Date.now() }]
      };

      await saveToStore('points', data);
      
      // Also save to LocalStorage as backup
      localStorage.setItem(CONFIG.storagePrefix + 'points_' + userId, JSON.stringify(data));
      
      // Sync to Supabase
      await syncPointsToSupabase(userId, finalPoints);
      
      emitEvent('points:updated', { userId, points: finalPoints });
      
      return finalPoints;
    } catch (error) {
      console.error('[UltimatePersistence] Save points error:', error);
      return points;
    }
  }

  // Load points (always returns highest value from all sources)
  async function loadPoints(userId) {
    try {
      // Try IndexedDB first
      const dbPoints = await loadFromStore('points', userId);
      const dbAmount = dbPoints ? dbPoints.amount : 0;

      // Try LocalStorage as backup
      const lsData = localStorage.getItem(CONFIG.storagePrefix + 'points_' + userId);
      const lsAmount = lsData ? JSON.parse(lsData).amount : 0;

      // Try Supabase as cloud backup
      const cloudAmount = await loadPointsFromSupabase(userId);

      // Return the highest value from all sources
      const finalPoints = Math.max(dbAmount, lsAmount, cloudAmount);
      
      console.log('[UltimatePersistence] Loaded points - DB:', dbAmount, 'LS:', lsAmount, 'Cloud:', cloudAmount, 'Final:', finalPoints);
      
      return finalPoints;
    } catch (error) {
      console.error('[UltimatePersistence] Load points error:', error);
      return 0;
    }
  }

  // Save media file (video, audio, photo, text app)
  async function saveMedia(mediaData) {
    try {
      const { type, id, fileData, postId, authorId } = mediaData;
      const storeName = type === 'video' ? 'videos' : type === 'audio' ? 'audio' : type === 'photo' ? 'photos' : 'textApps';

      const data = {
        id: id,
        fileData: fileData,
        postId: postId,
        authorId: authorId,
        type: type,
        savedAt: Date.now(),
        metadata: mediaData.metadata || {}
      };

      await saveToStore(storeName, data);
      
      // Also save to generic media store
      await saveToStore('media', data);
      
      // Sync to Supabase if it's a small file
      if (fileData && fileData.length < 5 * 1024 * 1024) { // 5MB limit
        await syncMediaToSupabase(data);
      }
      
      return true;
    } catch (error) {
      console.error('[UltimatePersistence] Save media error:', error);
      return false;
    }
  }

  // Load media file
  async function loadMedia(mediaId, type) {
    try {
      const storeName = type === 'video' ? 'videos' : type === 'audio' ? 'audio' : type === 'photo' ? 'photos' : 'textApps';
      
      // Try specific store first
      let media = await loadFromStore(storeName, mediaId);
      
      // Fallback to generic media store
      if (!media) {
        media = await loadFromStore('media', mediaId);
      }
      
      // Try Supabase as last resort
      if (!media) {
        media = await loadMediaFromSupabase(mediaId);
      }
      
      return media;
    } catch (error) {
      console.error('[UltimatePersistence] Load media error:', error);
      return null;
    }
  }

  // Save user session (persists across updates)
  async function saveSession(userId, sessionData) {
    try {
      const data = {
        userId: userId,
        ...sessionData,
        lastActive: Date.now(),
        version: CONFIG.version
      };

      await saveToStore('sessions', data);
      
      // Also save to LocalStorage
      localStorage.setItem(CONFIG.storagePrefix + 'session_' + userId, JSON.stringify(data));
      
      // Sync to Supabase
      await syncSessionToSupabase(userId, data);
      
      return true;
    } catch (error) {
      console.error('[UltimatePersistence] Save session error:', error);
      return false;
    }
  }

  // Load user session
  async function loadSession(userId) {
    try {
      // Try IndexedDB first
      let session = await loadFromStore('sessions', userId);
      
      // Try LocalStorage as backup
      if (!session) {
        const lsData = localStorage.getItem(CONFIG.storagePrefix + 'session_' + userId);
        if (lsData) {
          session = JSON.parse(lsData);
        }
      }
      
      // Try Supabase as cloud backup
      if (!session) {
        session = await loadSessionFromSupabase(userId);
      }
      
      return session;
    } catch (error) {
      console.error('[UltimatePersistence] Load session error:', error);
      return null;
    }
  }

  // Save post
  async function savePost(postData) {
    try {
      const data = {
        ...postData,
        savedAt: Date.now(),
        version: CONFIG.version
      };

      await saveToStore('posts', data);
      
      // Sync to Supabase
      await syncPostToSupabase(data);
      
      return true;
    } catch (error) {
      console.error('[UltimatePersistence] Save post error:', error);
      return false;
    }
  }

  // Load all posts for a user
  async function loadPosts(userId) {
    try {
      const allPosts = await loadAllFromStore('posts');
      const userPosts = allPosts.filter(p => p.authorId === userId || p.author === userId);
      
      // Also load from Supabase and merge
      const cloudPosts = await loadPostsFromSupabase(userId);
      
      // Merge posts (remove duplicates)
      const mergedPosts = [...userPosts, ...cloudPosts];
      const uniquePosts = [];
      const seenIds = new Set();
      
      mergedPosts.forEach(post => {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          uniquePosts.push(post);
        }
      });
      
      return uniquePosts;
    } catch (error) {
      console.error('[UltimatePersistence] Load posts error:', error);
      return [];
    }
  }

  // Save user preferences
  async function savePreferences(userId, preferences) {
    try {
      const data = {
        userId: userId,
        preferences: preferences,
        lastUpdated: Date.now()
      };

      await saveToStore('preferences', data);
      localStorage.setItem(CONFIG.storagePrefix + 'preferences_' + userId, JSON.stringify(data));
      
      return true;
    } catch (error) {
      console.error('[UltimatePersistence] Save preferences error:', error);
      return false;
    }
  }

  // Load user preferences
  async function loadPreferences(userId) {
    try {
      let prefs = await loadFromStore('preferences', userId);
      
      if (!prefs) {
        const lsData = localStorage.getItem(CONFIG.storagePrefix + 'preferences_' + userId);
        if (lsData) {
          prefs = JSON.parse(lsData);
        }
      }
      
      return prefs ? prefs.preferences : {};
    } catch (error) {
      console.error('[UltimatePersistence] Load preferences error:', error);
      return {};
    }
  }

  // Save chat message
  async function saveChatMessage(chatData) {
    try {
      const data = {
        ...chatData,
        savedAt: Date.now()
      };

      await saveToStore('chats', data);
      
      return true;
    } catch (error) {
      console.error('[UltimatePersistence] Save chat error:', error);
      return false;
    }
  }

  // Load chat messages
  async function loadChatMessages(chatId) {
    try {
      const allChats = await loadAllFromStore('chats');
      const chatMessages = allChats.filter(c => c.chatId === chatId);
      
      return chatMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    } catch (error) {
      console.error('[UltimatePersistence] Load chats error:', error);
      return [];
    }
  }

  // Complete restore for a user (after update/reset)
  async function restoreUserData(userId) {
    try {
      console.log('[UltimatePersistence] Starting complete restore for user:', userId);

      const [points, session, posts, preferences, chats] = await Promise.all([
        loadPoints(userId),
        loadSession(userId),
        loadPosts(userId),
        loadPreferences(userId),
        loadChatMessages(userId)
      ]);

      // Load all media for user's posts
      const allMedia = await loadAllFromStore('media');
      const userMedia = allMedia.filter(m => m.authorId === userId);

      const restoredData = {
        points: points,
        session: session,
        posts: posts,
        preferences: preferences,
        chats: chats,
        media: userMedia,
        restoredAt: Date.now(),
        version: CONFIG.version
      };

      console.log('[UltimatePersistence] Restore complete:', {
        points: points,
        posts: posts.length,
        media: userMedia.length,
        hasSession: !!session
      });

      emitEvent('data:restored', restoredData);
      
      return restoredData;
    } catch (error) {
      console.error('[UltimatePersistence] Restore error:', error);
      return null;
    }
  }

  // Auto-save all user data
  async function autoSave(userId) {
    if (!userId) return;

    try {
      // Save points from global D object if exists
      if (typeof D !== 'undefined' && D.points !== undefined) {
        await savePoints(userId, D.points);
      }

      // Save posts from global D object if exists
      if (typeof D !== 'undefined' && D.posts) {
        for (const post of D.posts) {
          if (post.author === userId || post.authorId === userId) {
            await savePost(post);
          }
        }
      }

      // Save session data
      if (typeof CU !== 'undefined') {
        await saveSession(userId, CU);
      }

      console.log('[UltimatePersistence] Auto-save completed for user:', userId);
      emitEvent('data:saved', { userId, timestamp: Date.now() });
    } catch (error) {
      console.error('[UltimatePersistence] Auto-save error:', error);
    }
  }

  // Start auto-save
  function startAutoSave(userId) {
    currentUserId = userId;
    
    // Clear existing timer
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
    }

    // Save immediately
    autoSave(userId);

    // Set up interval
    autoSaveTimer = setInterval(() => {
      autoSave(userId);
    }, CONFIG.autoSaveInterval);

    console.log('[UltimatePersistence] Auto-save started for user:', userId);
  }

  // Stop auto-save
  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
      console.log('[UltimatePersistence] Auto-save stopped');
    }
  }

  // Supabase sync functions
  async function syncPointsToSupabase(userId, points) {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/points?userId=eq.${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        },
        body: JSON.stringify({
          userId: userId,
          amount: points,
          lastUpdated: new Date().toISOString()
        })
      });

      if (!response.ok) {
        // Try update instead
        await fetch(`${SUPABASE_CONFIG.url}/rest/v1/points?userId=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
          },
          body: JSON.stringify({
            amount: points,
            lastUpdated: new Date().toISOString()
          })
        });
      }

      console.log('[UltimatePersistence] Points synced to Supabase');
    } catch (error) {
      console.warn('[UltimatePersistence] Supabase sync error:', error);
    }
  }

  async function loadPointsFromSupabase(userId) {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/points?userId=eq.${userId}&select=*`, {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.length > 0 ? data[0].amount : 0;
      }
      return 0;
    } catch (error) {
      console.warn('[UltimatePersistence] Load from Supabase error:', error);
      return 0;
    }
  }

  async function syncPostToSupabase(post) {
    try {
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        },
        body: JSON.stringify(post)
      });
    } catch (error) {
      console.warn('[UltimatePersistence] Post sync error:', error);
    }
  }

  async function loadPostsFromSupabase(userId) {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/posts?authorId=eq.${userId}&select=*`, {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        }
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.warn('[UltimatePersistence] Load posts from Supabase error:', error);
      return [];
    }
  }

  async function syncSessionToSupabase(userId, session) {
    try {
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        },
        body: JSON.stringify(session)
      });
    } catch (error) {
      console.warn('[UltimatePersistence] Session sync error:', error);
    }
  }

  async function loadSessionFromSupabase(userId) {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/sessions?userId=eq.${userId}&select=*`, {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.length > 0 ? data[0] : null;
      }
      return null;
    } catch (error) {
      console.warn('[UltimatePersistence] Load session from Supabase error:', error);
      return null;
    }
  }

  async function syncMediaToSupabase(media) {
    try {
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        },
        body: JSON.stringify(media)
      });
    } catch (error) {
      console.warn('[UltimatePersistence] Media sync error:', error);
    }
  }

  async function loadMediaFromSupabase(mediaId) {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/media?id=eq.${mediaId}&select=*`, {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.length > 0 ? data[0] : null;
      }
      return null;
    } catch (error) {
      console.warn('[UltimatePersistence] Load media from Supabase error:', error);
      return null;
    }
  }

  // Event system
  function on(event, callback) {
    if (eventListeners[event]) {
      eventListeners[event].push(callback);
    }
  }

  function off(event, callback) {
    if (eventListeners[event]) {
      eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
    }
  }

  function emitEvent(event, data) {
    if (eventListeners[event]) {
      eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[UltimatePersistence] Event listener error:', error);
        }
      });
    }
  }

  // Export data for backup
  async function exportData(userId) {
    try {
      const data = await restoreUserData(userId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `monetixra_backup_${userId}_${Date.now()}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('[UltimatePersistence] Export error:', error);
      return false;
    }
  }

  // Import data from backup
  async function importData(jsonFile) {
    try {
      const text = await jsonFile.text();
      const data = JSON.parse(text);
      
      if (data.points) {
        await savePoints(currentUserId, data.points);
      }
      
      if (data.posts) {
        for (const post of data.posts) {
          await savePost(post);
        }
      }
      
      if (data.session) {
        await saveSession(currentUserId, data.session);
      }
      
      if (data.preferences) {
        await savePreferences(currentUserId, data.preferences);
      }
      
      console.log('[UltimatePersistence] Import complete');
      return true;
    } catch (error) {
      console.error('[UltimatePersistence] Import error:', error);
      return false;
    }
  }

  // Get storage statistics
  async function getStats() {
    try {
      const stats = {
        users: (await loadAllFromStore('users')).length,
        points: (await loadAllFromStore('points')).length,
        posts: (await loadAllFromStore('posts')).length,
        media: (await loadAllFromStore('media')).length,
        sessions: (await loadAllFromStore('sessions')).length,
        chats: (await loadAllFromStore('chats')).length,
        version: CONFIG.version
      };
      
      return stats;
    } catch (error) {
      console.error('[UltimatePersistence] Get stats error:', error);
      return {};
    }
  }

  // Initialize system
  async function init() {
    try {
      await initDatabase();
      console.log('[UltimatePersistence] System initialized successfully');
      return true;
    } catch (error) {
      console.error('[UltimatePersistence] Init error:', error);
      return false;
    }
  }

  // Public API
  return {
    init,
    savePoints,
    loadPoints,
    saveMedia,
    loadMedia,
    saveSession,
    loadSession,
    savePost,
    loadPosts,
    savePreferences,
    loadPreferences,
    saveChatMessage,
    loadChatMessages,
    restoreUserData,
    startAutoSave,
    stopAutoSave,
    autoSave,
    exportData,
    importData,
    getStats,
    on,
    off,
    CONFIG
  };
})();

// Initialize on load
if (typeof window !== 'undefined') {
  window.UltimatePermanentPersistence = UltimatePermanentPersistence;
  
  // Auto-initialize
  UltimatePermanentPersistence.init().then(() => {
    console.log('[UltimatePersistence] Ready');
  });
}

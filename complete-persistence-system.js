/**
 * Complete Persistence System for Monetixra
 * Ensures ALL data survives refresh/logout/login permanently
 * Includes: Login, Points, Video, Audio, App Text, Video Call, Audio Call, Messages
 */

const CompletePersistence = (function () {
  'use strict';

  const STORAGE_KEY = 'monetixra_complete_';
  const DB_NAME = 'MonetixraCompleteDB';
  const DB_VERSION = 3; // Updated for complete persistence
  let db = null;
  let isInitialized = false;

  // Supabase Configuration
  const SUPABASE_URL = 'https://rgximkhnhxgaonrxzzxl.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneGlta2huaHhnYW9ucnh6enhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDg3MDQsImV4cCI6MjA5MTIyNDcwNH0.zgBfCTs2AEocLVwjJntg1dDBwy4quQS40QWqeuYRTwU';

  // Auto-save interval
  const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

  // Initialize IndexedDB with complete schema
  async function initDB() {
    if (isInitialized) return db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        isInitialized = true;
        console.log('[CompletePersistence] Database initialized successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // User authentication & sessions
        if (!database.objectStoreNames.contains('userSessions')) {
          const sessionStore = database.createObjectStore('userSessions', { keyPath: 'userId' });
          sessionStore.createIndex('lastActive', 'lastActive', { unique: false });
        }

        // User profiles & settings
        if (!database.objectStoreNames.contains('userProfiles')) {
          const profileStore = database.createObjectStore('userProfiles', { keyPath: 'userId' });
          profileStore.createIndex('username', 'username', { unique: false });
        }

        // Points & rewards
        if (!database.objectStoreNames.contains('userPoints')) {
          database.createObjectStore('userPoints', { keyPath: 'userId' });
        }

        // Posts & content
        if (!database.objectStoreNames.contains('posts')) {
          const postsStore = database.createObjectStore('posts', { keyPath: 'id' });
          postsStore.createIndex('authorId', 'authorId', { unique: false });
          postsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Media files (video, audio, images)
        if (!database.objectStoreNames.contains('mediaFiles')) {
          const mediaStore = database.createObjectStore('mediaFiles', { keyPath: 'id' });
          mediaStore.createIndex('postId', 'postId', { unique: false });
          mediaStore.createIndex('type', 'type', { unique: false });
          mediaStore.createIndex('authorId', 'authorId', { unique: false });
        }

        // Messages & chats
        if (!database.objectStoreNames.contains('messages')) {
          const messagesStore = database.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('chatId', 'chatId', { unique: false });
          messagesStore.createIndex('senderId', 'senderId', { unique: false });
          messagesStore.createIndex('receiverId', 'receiverId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Video calls
        if (!database.objectStoreNames.contains('videoCalls')) {
          const videoCallsStore = database.createObjectStore('videoCalls', { keyPath: 'callId' });
          videoCallsStore.createIndex('participants', 'participants', { unique: false, multiEntry: true });
          videoCallsStore.createIndex('status', 'status', { unique: false });
          videoCallsStore.createIndex('startTime', 'startTime', { unique: false });
        }

        // Audio calls
        if (!database.objectStoreNames.contains('audioCalls')) {
          const audioCallsStore = database.createObjectStore('audioCalls', { keyPath: 'callId' });
          audioCallsStore.createIndex('participants', 'participants', { unique: false, multiEntry: true });
          audioCallsStore.createIndex('status', 'status', { unique: false });
        }

        // App settings & preferences
        if (!database.objectStoreNames.contains('appSettings')) {
          database.createObjectStore('appSettings', { keyPath: 'userId' });
        }

        // App text & content
        if (!database.objectStoreNames.contains('appText')) {
          const appTextStore = database.createObjectStore('appText', { keyPath: 'key' });
          appTextStore.createIndex('language', 'language', { unique: false });
        }

        // Call recordings
        if (!database.objectStoreNames.contains('callRecordings')) {
          const recordingsStore = database.createObjectStore('callRecordings', { keyPath: 'id' });
          recordingsStore.createIndex('callId', 'callId', { unique: false });
          recordingsStore.createIndex('type', 'type', { unique: false });
        }

        // Notifications
        if (!database.objectStoreNames.contains('notifications')) {
          const notificationsStore = database.createObjectStore('notifications', { keyPath: 'id' });
          notificationsStore.createIndex('userId', 'userId', { unique: false });
          notificationsStore.createIndex('read', 'read', { unique: false });
        }

        console.log('[CompletePersistence] Database schema upgraded to v3');
      };
    });
  }

  // ── User Authentication & Sessions ─────────────────────────────────

  async function saveUserSession(userId, sessionData) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['userSessions'], 'readwrite');
      const store = transaction.objectStore('userSessions');

      const record = {
        userId: userId,
        ...sessionData,
        lastActive: Date.now(),
        deviceInfo: getDeviceInfo()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] User session saved:', userId);
        syncToSupabase('user_sessions', record);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadUserSession(userId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['userSessions'], 'readonly');
      const store = transaction.objectStore('userSessions');
      const request = store.get(userId);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── User Profiles & Settings ─────────────────────────────────────

  async function saveUserProfile(userId, profileData) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['userProfiles'], 'readwrite');
      const store = transaction.objectStore('userProfiles');

      const record = {
        userId: userId,
        ...profileData,
        lastUpdated: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] User profile saved:', userId);
        syncToSupabase('user_profiles', record);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadUserProfile(userId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['userProfiles'], 'readonly');
      const store = transaction.objectStore('userProfiles');
      const request = store.get(userId);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function saveAppSettings(userId, settings) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['appSettings'], 'readwrite');
      const store = transaction.objectStore('appSettings');

      const record = {
        userId: userId,
        settings: settings,
        lastUpdated: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] App settings saved:', userId);
        syncToSupabase('app_settings', record);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadAppSettings(userId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['appSettings'], 'readonly');
      const store = transaction.objectStore('appSettings');
      const request = store.get(userId);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.settings : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Points & Rewards ───────────────────────────────────────────────

  async function saveUserPoints(userId, points) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['userPoints'], 'readwrite');
      const store = transaction.objectStore('userPoints');

      const record = {
        userId: userId,
        points: points,
        history: [], // Can store point history
        lastUpdated: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] User points saved:', userId, points);
        syncToSupabase('user_points', { user_id: userId, points: points });
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadUserPoints(userId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['userPoints'], 'readonly');
      const store = transaction.objectStore('userPoints');
      const request = store.get(userId);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.points : 0);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Posts & Content ───────────────────────────────────────────────

  async function savePost(post) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['posts'], 'readwrite');
      const store = transaction.objectStore('posts');

      const record = {
        id: post.id,
        ...post,
        savedAt: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] Post saved:', post.id);
        syncToSupabase('posts', record);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadPosts(userId = null) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['posts'], 'readonly');
      const store = transaction.objectStore('posts');
      const request = store.getAll();

      request.onsuccess = () => {
        let posts = request.result || [];
        if (userId) {
          posts = posts.filter(p => p.author === userId);
        }
        resolve(posts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Media Files (Video, Audio, Images) ───────────────────────────

  async function saveMediaFile(mediaId, fileData, metadata) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['mediaFiles'], 'readwrite');
      const store = transaction.objectStore('mediaFiles');

      const record = {
        id: mediaId,
        fileData: fileData,
        metadata: {
          ...metadata,
          savedAt: Date.now()
        }
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] Media file saved:', mediaId, metadata.type);
        // Large files might not sync to Supabase, but local storage is guaranteed
        if (fileData.length < 5 * 1024 * 1024) { // Only sync files < 5MB
          syncToSupabase('media_files', {
            id: mediaId,
            metadata: record.metadata
          });
        }
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadMediaFile(mediaId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['mediaFiles'], 'readonly');
      const store = transaction.objectStore('mediaFiles');
      const request = store.get(mediaId);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadMediaFilesByType(type, userId = null) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['mediaFiles'], 'readonly');
      const store = transaction.objectStore('mediaFiles');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => {
        let files = request.result || [];
        if (userId) {
          files = files.filter(f => f.metadata.authorId === userId);
        }
        resolve(files);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Messages & Chats ───────────────────────────────────────────────

  async function saveMessage(message) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');

      const record = {
        id: message.id || crypto.randomUUID(),
        ...message,
        savedAt: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] Message saved:', record.id);
        syncToSupabase('messages', record);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadMessages(chatId = null, userId = null) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');

      let request;
      if (chatId) {
        const index = store.index('chatId');
        request = index.getAll(chatId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let messages = request.result || [];
        if (userId) {
          messages = messages.filter(m => 
            m.senderId === userId || m.receiverId === userId
          );
        }
        // Sort by timestamp
        messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Video Calls ─────────────────────────────────────────────────────

  async function saveVideoCall(callData) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['videoCalls'], 'readwrite');
      const store = transaction.objectStore('videoCalls');

      const record = {
        callId: callData.callId || crypto.randomUUID(),
        ...callData,
        startTime: callData.startTime || Date.now(),
        status: callData.status || 'active',
        savedAt: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] Video call saved:', record.callId);
        syncToSupabase('video_calls', record);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadVideoCall(callId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['videoCalls'], 'readonly');
      const store = transaction.objectStore('videoCalls');
      const request = store.get(callId);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadVideoCallsByUser(userId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['videoCalls'], 'readonly');
      const store = transaction.objectStore('videoCalls');
      const index = store.index('participants');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const calls = request.result || [];
        resolve(calls);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Audio Calls ─────────────────────────────────────────────────────

  async function saveAudioCall(callData) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['audioCalls'], 'readwrite');
      const store = transaction.objectStore('audioCalls');

      const record = {
        callId: callData.callId || crypto.randomUUID(),
        ...callData,
        startTime: callData.startTime || Date.now(),
        status: callData.status || 'active',
        savedAt: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] Audio call saved:', record.callId);
        syncToSupabase('audio_calls', record);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadAudioCall(callId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['audioCalls'], 'readonly');
      const store = transaction.objectStore('audioCalls');
      const request = store.get(callId);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadAudioCallsByUser(userId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['audioCalls'], 'readonly');
      const store = transaction.objectStore('audioCalls');
      const index = store.index('participants');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const calls = request.result || [];
        resolve(calls);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Call Recordings ───────────────────────────────────────────────────

  async function saveCallRecording(recordingData) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['callRecordings'], 'readwrite');
      const store = transaction.objectStore('callRecordings');

      const record = {
        id: recordingData.id || crypto.randomUUID(),
        ...recordingData,
        savedAt: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] Call recording saved:', record.id);
        // Recordings are typically large, so only sync metadata
        syncToSupabase('call_recordings', {
          id: record.id,
          callId: record.callId,
          type: record.type,
          duration: record.duration,
          metadata: record.metadata
        });
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadCallRecording(recordingId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['callRecordings'], 'readonly');
      const store = transaction.objectStore('callRecordings');
      const request = store.get(recordingId);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── App Text & Content ─────────────────────────────────────────────

  async function saveAppText(key, text, language = 'en') {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['appText'], 'readwrite');
      const store = transaction.objectStore('appText');

      const record = {
        key: key,
        text: text,
        language: language,
        lastUpdated: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] App text saved:', key);
        syncToSupabase('app_text', record);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadAppText(key, language = 'en') {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['appText'], 'readonly');
      const store = transaction.objectStore('appText');
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.text : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadAllAppText(language = 'en') {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['appText'], 'readonly');
      const store = transaction.objectStore('appText');
      const index = store.index('language');
      const request = index.getAll(language);

      request.onsuccess = () => {
        const texts = request.result || [];
        const textMap = {};
        texts.forEach(t => {
          textMap[t.key] = t.text;
        });
        resolve(textMap);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Notifications ───────────────────────────────────────────────────

  async function saveNotification(notification) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');

      const record = {
        id: notification.id || crypto.randomUUID(),
        ...notification,
        read: false,
        createdAt: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log('[CompletePersistence] Notification saved:', record.id);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function loadNotifications(userId, unreadOnly = false) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['notifications'], 'readonly');
      const store = transaction.objectStore('notifications');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        let notifications = request.result || [];
        if (unreadOnly) {
          notifications = notifications.filter(n => !n.read);
        }
        notifications.sort((a, b) => b.createdAt - a.createdAt);
        resolve(notifications);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Complete Data Restoration ───────────────────────────────────────

  async function restoreAllUserData(userId) {
    if (!db) await initDB();

    try {
      console.log('[CompletePersistence] Starting complete data restoration for user:', userId);

      // Load all data in parallel
      const [
        session,
        profile,
        points,
        posts,
        settings,
        messages,
        videoCalls,
        audioCalls,
        appText
      ] = await Promise.all([
        loadUserSession(userId),
        loadUserProfile(userId),
        loadUserPoints(userId),
        loadPosts(userId),
        loadAppSettings(userId),
        loadMessages(null, userId),
        loadVideoCallsByUser(userId),
        loadAudioCallsByUser(userId),
        loadAllAppText()
      ]);

      // Also load from Supabase for cloud backup
      const cloudData = await loadFromSupabase(userId);

      // Merge data (cloud takes precedence)
      const finalPoints = Math.max(points, cloudData.points || 0);
      const allPosts = [...(cloudData.posts || []), ...posts];
      const uniquePosts = removeDuplicates(allPosts, 'id');

      // Restore to global objects if they exist
      if (typeof CU !== 'undefined' && profile) {
        Object.assign(CU, profile);
      }

      if (typeof D !== 'undefined') {
        D.points = finalPoints;
        D.posts = uniquePosts;
      }

      console.log('[CompletePersistence] Complete restoration successful:', {
        userId: userId,
        points: finalPoints,
        postsCount: uniquePosts.length,
        messagesCount: messages.length,
        videoCallsCount: videoCalls.length,
        audioCallsCount: audioCalls.length,
        hasSession: !!session,
        hasProfile: !!profile,
        hasSettings: !!settings
      });

      return {
        session,
        profile,
        points: finalPoints,
        posts: uniquePosts,
        settings,
        messages,
        videoCalls,
        audioCalls,
        appText
      };
    } catch (error) {
      console.error('[CompletePersistence] Restoration failed:', error);
      return null;
    }
  }

  // ── Auto-Save All Data ───────────────────────────────────────────────

  async function autoSaveAll(userId) {
    if (!userId) return;

    try {
      // Save current user data
      if (typeof CU !== 'undefined') {
        await saveUserProfile(userId, CU);
      }

      // Save points
      if (typeof D !== 'undefined' && D.points !== undefined) {
        await saveUserPoints(userId, D.points);
      }

      // Save posts
      if (typeof D !== 'undefined' && D.posts) {
        for (const post of D.posts) {
          if (post.author === userId) {
            await savePost(post);
          }
        }
      }

      // Save settings
      if (typeof CU !== 'undefined' && CU.settings) {
        await saveAppSettings(userId, CU.settings);
      }

      console.log('[CompletePersistence] Auto-save completed for user:', userId);
    } catch (error) {
      console.error('[CompletePersistence] Auto-save failed:', error);
    }
  }

  // ── Supabase Sync ───────────────────────────────────────────────────

  async function syncToSupabase(table, data) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        console.log('[CompletePersistence] Synced to Supabase:', table);
      }
    } catch (error) {
      console.warn('[CompletePersistence] Supabase sync failed:', error);
    }
  }

  async function loadFromSupabase(userId) {
    try {
      const [pointsResponse, postsResponse] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/user_points?user_id=eq.${userId}&select=*`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }),
        fetch(`${SUPABASE_URL}/rest/v1/posts?author=eq.${userId}&select=*`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        })
      ]);

      const points = pointsResponse.ok ? await pointsResponse.json() : [];
      const posts = postsResponse.ok ? await postsResponse.json() : [];

      return {
        points: points.length > 0 ? points[0].points : 0,
        posts: posts || []
      };
    } catch (error) {
      console.warn('[CompletePersistence] Supabase load failed:', error);
      return { points: 0, posts: [] };
    }
  }

  // ── Helper Functions ───────────────────────────────────────────────────

  function getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: {
        width: screen.width,
        height: screen.height
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  function removeDuplicates(array, key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  // ── Auto-Save Management ─────────────────────────────────────────────

  let autoSaveInterval = null;

  function startAutoSave(userId) {
    if (!userId) return;

    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }

    // Save immediately
    autoSaveAll(userId);

    // Set up interval
    autoSaveInterval = setInterval(() => {
      autoSaveAll(userId);
    }, AUTO_SAVE_INTERVAL);

    console.log('[CompletePersistence] Auto-save started for user:', userId);
  }

  function stopAutoSave() {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
      console.log('[CompletePersistence] Auto-save stopped');
    }
  }

  // ── Login/Logout Integration ─────────────────────────────────────────

  async function handleLogin(userId) {
    try {
      // Restore all data
      const restoredData = await restoreAllUserData(userId);
      
      // Start auto-save
      startAutoSave(userId);
      
      // Save session
      await saveUserSession(userId, {
        loggedInAt: Date.now(),
        status: 'active'
      });

      console.log('[CompletePersistence] Login handled successfully');
      return restoredData;
    } catch (error) {
      console.error('[CompletePersistence] Login failed:', error);
      return null;
    }
  }

  async function handleLogout(userId) {
    try {
      // Save all data before logout
      await autoSaveAll(userId);
      
      // Update session status
      await saveUserSession(userId, {
        loggedOutAt: Date.now(),
        status: 'inactive'
      });
      
      // Stop auto-save
      stopAutoSave();

      console.log('[CompletePersistence] Logout handled successfully');
      return true;
    } catch (error) {
      console.error('[CompletePersistence] Logout failed:', error);
      return false;
    }
  }

  // ── Storage Statistics ───────────────────────────────────────────────

  async function getStorageStats() {
    if (!db) await initDB();

    return new Promise((resolve) => {
      const stats = {
        userSessions: 0,
        userProfiles: 0,
        userPoints: 0,
        posts: 0,
        mediaFiles: 0,
        messages: 0,
        videoCalls: 0,
        audioCalls: 0,
        callRecordings: 0,
        appText: 0,
        notifications: 0,
        totalSize: 0
      };

      const stores = [
        'userSessions', 'userProfiles', 'userPoints', 'posts', 
        'mediaFiles', 'messages', 'videoCalls', 'audioCalls',
        'callRecordings', 'appText', 'notifications'
      ];

      Promise.all(stores.map(storeName => {
        return new Promise((resolve) => {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();
          
          request.onsuccess = () => {
            const items = request.result || [];
            stats[storeName] = items.length;
            stats.totalSize += JSON.stringify(items).length;
            resolve();
          };
          request.onerror = () => resolve();
        });
      })).then(() => resolve(stats));
    });
  }

  // ── Public API ───────────────────────────────────────────────────────

  return {
    // Initialization
    init: () => initDB(),
    
    // User Data
    saveSession: saveUserSession,
    loadSession: loadUserSession,
    saveProfile: saveUserProfile,
    loadProfile: loadUserProfile,
    saveSettings: saveAppSettings,
    loadSettings: loadAppSettings,
    
    // Points
    savePoints: saveUserPoints,
    loadPoints: loadUserPoints,
    
    // Posts
    savePost: savePost,
    loadPosts: loadPosts,
    
    // Media
    saveMedia: saveMediaFile,
    loadMedia: loadMediaFile,
    loadMediaByType: loadMediaFilesByType,
    
    // Messages
    saveMessage: saveMessage,
    loadMessages: loadMessages,
    
    // Video Calls
    saveVideoCall: saveVideoCall,
    loadVideoCall: loadVideoCall,
    loadVideoCallsByUser: loadVideoCallsByUser,
    
    // Audio Calls
    saveAudioCall: saveAudioCall,
    loadAudioCall: loadAudioCall,
    loadAudioCallsByUser: loadAudioCallsByUser,
    
    // Call Recordings
    saveRecording: saveCallRecording,
    loadRecording: loadCallRecording,
    
    // App Text
    saveAppText: saveAppText,
    loadAppText: loadAppText,
    loadAllAppText: loadAllAppText,
    
    // Notifications
    saveNotification: saveNotification,
    loadNotifications: loadNotifications,
    
    // Complete Operations
    restoreAll: restoreAllUserData,
    autoSaveAll: autoSaveAll,
    
    // Login/Logout
    handleLogin: handleLogin,
    handleLogout: handleLogout,
    
    // Auto-Save
    startAutoSave: startAutoSave,
    stopAutoSave: stopAutoSave,
    
    // Statistics
    getStats: getStorageStats
  };

})();

// Make it globally available
window.CompletePersistence = CompletePersistence;

console.log('[CompletePersistence] System loaded');
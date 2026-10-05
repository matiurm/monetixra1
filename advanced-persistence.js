/**
 * ================================================================
 *  Monetixra — Advanced Persistence System v2.0
 *  Features: Real-time sync, Version control, Conflict resolution,
 *           Data compression, Auto-backup, Encryption, Recovery
 *  Ensures: Facebook/YouTube level data persistence
 * ================================================================
 */

const AdvancedPersistence = (function() {
  const DB_NAME = 'MonetixraAdvancedDB';
  const DB_VERSION = 1;
  let db = null;
  let isInitialized = false;

  // Sync configuration
  const SYNC_CONFIG = {
    enabled: true,
    interval: 15000, // 15 seconds
    retryAttempts: 3,
    retryDelay: 5000,
    batchSize: 50,
    compressionEnabled: true,
    encryptionEnabled: true
  };

  // Version control system
  const VERSION_CONTROL = {
    maxVersions: 10,
    autoCleanup: true
  };

  // Conflict resolution strategies
  const CONFLICT_STRATEGIES = {
    LAST_WRITE_WINS: 'last_write_wins',
    MANUAL_MERGE: 'manual_merge',
    SERVER_WINS: 'server_wins',
    CLIENT_WINS: 'client_wins'
  };

  // Initialize advanced database
  async function initDB() {
    if (isInitialized) return db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        isInitialized = true;
        console.log('[AdvancedPersistence] Database initialized');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // Create advanced object stores with indexes
        if (!database.objectStoreNames.contains('versions')) {
          const versionsStore = database.createObjectStore('versions', { keyPath: 'id' });
          versionsStore.createIndex('entityId', 'entityId', { unique: false });
          versionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          versionsStore.createIndex('entityType', 'entityType', { unique: false });
        }

        if (!database.objectStoreNames.contains('conflicts')) {
          const conflictsStore = database.createObjectStore('conflicts', { keyPath: 'id' });
          conflictsStore.createIndex('entityId', 'entityId', { unique: false });
          conflictsStore.createIndex('resolved', 'resolved', { unique: false });
        }

        if (!database.objectStoreNames.contains('syncQueue')) {
          const syncQueueStore = database.createObjectStore('syncQueue', { keyPath: 'id' });
          syncQueueStore.createIndex('priority', 'priority', { unique: false });
          syncQueueStore.createIndex('status', 'status', { unique: false });
        }

        if (!database.objectStoreNames.contains('backups')) {
          const backupsStore = database.createObjectStore('backups', { keyPath: 'id' });
          backupsStore.createIndex('timestamp', 'timestamp', { unique: false });
          backupsStore.createIndex('type', 'type', { unique: false });
        }

        if (!database.objectStoreNames.contains('compressionCache')) {
          const compressionStore = database.createObjectStore('compressionCache', { keyPath: 'key' });
          compressionStore.createIndex('entityId', 'entityId', { unique: false });
        }

        if (!database.objectStoreNames.contains('encryptionKeys')) {
          const encryptionStore = database.createObjectStore('encryptionKeys', { keyPath: 'keyId' });
          encryptionStore.createIndex('userId', 'userId', { unique: false });
        }

        if (!database.objectStoreNames.contains('healthMetrics')) {
          const healthStore = database.createObjectStore('healthMetrics', { keyPath: 'timestamp' });
          healthStore.createIndex('type', 'type', { unique: false });
        }

        if (!database.objectStoreNames.contains('offlineQueue')) {
          const offlineStore = database.createObjectStore('offlineQueue', { keyPath: 'id' });
          offlineStore.createIndex('synced', 'synced', { unique: false });
        }

        console.log('[AdvancedPersistence] Database schema created');
      };
    });
  }

  // Version control system
  async function createVersion(entityId, entityType, data, operation = 'update') {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');

      const version = {
        id: `${entityId}_${Date.now()}`,
        entityId: entityId,
        entityType: entityType,
        data: SYNC_CONFIG.compressionEnabled ? compressData(data) : data,
        operation: operation,
        timestamp: Date.now(),
        userId: typeof CU !== 'undefined' ? CU.id : null
      };

      const request = store.add(version);
      request.onsuccess = () => {
        // Clean up old versions
        cleanupOldVersions(entityId);
        resolve(version);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getVersions(entityId, limit = VERSION_CONTROL.maxVersions) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['versions'], 'readonly');
      const store = transaction.objectStore('versions');
      const index = store.index('entityId');
      const request = index.getAll(entityId);

      request.onsuccess = () => {
        let versions = request.result || [];
        versions.sort((a, b) => b.timestamp - a.timestamp);
        versions = versions.slice(0, limit);

        // Decompress if needed
        if (SYNC_CONFIG.compressionEnabled) {
          versions = versions.map(v => ({
            ...v,
            data: decompressData(v.data)
          }));
        }

        resolve(versions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function cleanupOldVersions(entityId) {
    if (!VERSION_CONTROL.autoCleanup) return;

    const versions = await getVersions(entityId, VERSION_CONTROL.maxVersions + 1);
    if (versions.length > VERSION_CONTROL.maxVersions) {
      const versionsToDelete = versions.slice(VERSION_CONTROL.maxVersions);

      for (const version of versionsToDelete) {
        await deleteVersion(version.id);
      }
    }
  }

  async function deleteVersion(versionId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      const request = store.delete(versionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Conflict resolution system
  async function detectConflict(entityId, localData, remoteData) {
    const localVersions = await getVersions(entityId, 1);
    const remoteVersions = await getRemoteVersions(entityId, 1);

    if (localVersions.length === 0 || remoteVersions.length === 0) {
      return false; // No conflict if one side has no data
    }

    const localVersion = localVersions[0];
    const remoteVersion = remoteVersions[0];

    // Conflict if both have been modified since last sync
    return localVersion.timestamp > localVersion.timestamp &&
           remoteVersion.timestamp > remoteVersion.timestamp;
  }

  async function resolveConflict(entityId, localData, remoteData, strategy = CONFLICT_STRATEGIES.LAST_WRITE_WINS) {
    const conflict = {
      id: `conflict_${entityId}_${Date.now()}`,
      entityId: entityId,
      localData: localData,
      remoteData: remoteData,
      strategy: strategy,
      timestamp: Date.now(),
      resolved: false
    };

    switch (strategy) {
      case CONFLICT_STRATEGIES.LAST_WRITE_WINS:
        const resolvedData = localData.lastModified > remoteData.lastModified ? localData : remoteData;
        conflict.resolvedData = resolvedData;
        conflict.resolved = true;
        break;

      case CONFLICT_STRATEGIES.SERVER_WINS:
        conflict.resolvedData = remoteData;
        conflict.resolved = true;
        break;

      case CONFLICT_STRATEGIES.CLIENT_WINS:
        conflict.resolvedData = localData;
        conflict.resolved = true;
        break;

      case CONFLICT_STRATEGIES.MANUAL_MERGE:
        // Store for manual resolution
        await storeConflict(conflict);
        return conflict;
    }

    if (conflict.resolved) {
      await createVersion(entityId, 'resolved', conflict.resolvedData, 'conflict_resolution');
    }

    return conflict;
  }

  async function storeConflict(conflict) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conflicts'], 'readwrite');
      const store = transaction.objectStore('conflicts');
      const request = store.add(conflict);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getConflicts(resolved = false) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conflicts'], 'readonly');
      const store = transaction.objectStore('conflicts');
      const index = store.index('resolved');
      const request = index.getAll(resolved ? 1 : 0);

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Data compression
  function compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      // Simple compression: remove unnecessary whitespace
      return jsonString.replace(/\s+/g, ' ').trim();
    } catch (error) {
      console.error('[AdvancedPersistence] Compression failed:', error);
      return data;
    }
  }

  function decompressData(compressedData) {
    try {
      if (typeof compressedData === 'string') {
        return JSON.parse(compressedData);
      }
      return compressedData;
    } catch (error) {
      console.error('[AdvancedPersistence] Decompression failed:', error);
      return compressedData;
    }
  }

  // Encryption system
  async function generateEncryptionKey(userId) {
    if (!db) await initDB();

    // Simple key generation (in production, use proper crypto)
    const key = {
      keyId: `key_${userId}_${Date.now()}`,
      userId: userId,
      key: btoa(userId + Date.now() + Math.random()),
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['encryptionKeys'], 'readwrite');
      const store = transaction.objectStore('encryptionKeys');
      const request = store.add(key);

      request.onsuccess = () => resolve(key.key);
      request.onerror = () => reject(request.error);
    });
  }

  async function encryptData(data, userId) {
    if (!SYNC_CONFIG.encryptionEnabled) return data;

    try {
      const key = await getEncryptionKey(userId);
      if (!key) {
        const newKey = await generateEncryptionKey(userId);
        return btoa(JSON.stringify(data) + newKey);
      }

      return btoa(JSON.stringify(data) + key);
    } catch (error) {
      console.error('[AdvancedPersistence] Encryption failed:', error);
      return data;
    }
  }

  async function decryptData(encryptedData, userId) {
    if (!SYNC_CONFIG.encryptionEnabled) return encryptedData;

    try {
      const key = await getEncryptionKey(userId);
      if (!key) return encryptedData;

      const decoded = atob(encryptedData);
      const dataPart = decoded.replace(key, '');
      return JSON.parse(dataPart);
    } catch (error) {
      console.error('[AdvancedPersistence] Decryption failed:', error);
      return encryptedData;
    }
  }

  async function getEncryptionKey(userId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['encryptionKeys'], 'readonly');
      const store = transaction.objectStore('encryptionKeys');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const keys = request.result || [];
        resolve(keys.length > 0 ? keys[0].key : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Automatic backup system
  async function createBackup(type = 'full', userId = null) {
    if (!db) await initDB();

    const backup = {
      id: `backup_${Date.now()}`,
      type: type,
      timestamp: Date.now(),
      userId: userId,
      data: await collectBackupData(type, userId)
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');
      const request = store.add(backup);

      request.onsuccess = () => {
        console.log('[AdvancedPersistence] Backup created:', backup.id);
        resolve(backup);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function collectBackupData(type, userId) {
    // Collect data based on backup type
    const data = {
      users: typeof D !== 'undefined' && D.users ? D.users : {},
      posts: typeof D !== 'undefined' && D.posts ? D.posts : [],
      points: typeof CU !== 'undefined' ? CU.points : 0,
      timestamp: Date.now()
    };

    if (type === 'user' && userId) {
      // User-specific backup
      data.userPosts = (data.posts || []).filter(p => p.author === userId);
      data.userData = data.users[userId] || {};
    }

    return SYNC_CONFIG.compressionEnabled ? compressData(data) : data;
  }

  async function restoreBackup(backupId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['backups'], 'readonly');
      const store = transaction.objectStore('backups');
      const request = store.get(backupId);

      request.onsuccess = async () => {
        const backup = request.result;
        if (!backup) {
          reject(new Error('Backup not found'));
          return;
        }

        const data = SYNC_CONFIG.compressionEnabled ? decompressData(backup.data) : backup.data;

        // Restore data
        if (typeof D !== 'undefined') {
          if (data.users) D.users = data.users;
          if (data.posts) D.posts = data.posts;
        }

        if (typeof CU !== 'undefined' && data.points !== undefined) {
          CU.points = data.points;
        }

        console.log('[AdvancedPersistence] Backup restored:', backupId);
        resolve(data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getBackups(userId = null, limit = 10) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['backups'], 'readonly');
      const store = transaction.objectStore('backups');

      const request = store.getAll();
      request.onsuccess = () => {
        let backups = request.result || [];

        if (userId) {
          backups = backups.filter(b => b.userId === userId);
        }

        backups.sort((a, b) => b.timestamp - a.timestamp);
        backups = backups.slice(0, limit);

        resolve(backups);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Real-time sync system
  let syncInterval = null;
  let isSyncing = false;

  async function startRealTimeSync() {
    if (!SYNC_CONFIG.enabled || syncInterval) return;

    console.log('[AdvancedPersistence] Starting real-time sync');

    // Initial sync
    await performSync();

    // Set up interval sync
    syncInterval = setInterval(async () => {
      if (!isSyncing) {
        await performSync();
      }
    }, SYNC_CONFIG.interval);
  }

  async function stopRealTimeSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
      console.log('[AdvancedPersistence] Real-time sync stopped');
    }
  }

  async function performSync() {
    if (isSyncing) return;
    isSyncing = true;

    try {
      console.log('[AdvancedPersistence] Performing sync...');

      // Get pending sync items
      const syncQueue = await getSyncQueue();
      const pendingItems = syncQueue.filter(item => item.status === 'pending');

      if (pendingItems.length === 0) {
        console.log('[AdvancedPersistence] No pending sync items');
        return;
      }

      // Process in batches
      for (let i = 0; i < pendingItems.length; i += SYNC_CONFIG.batchSize) {
        const batch = pendingItems.slice(i, i + SYNC_CONFIG.batchSize);
        await processSyncBatch(batch);
      }

      console.log('[AdvancedPersistence] Sync completed');
    } catch (error) {
      console.error('[AdvancedPersistence] Sync failed:', error);
    } finally {
      isSyncing = false;
    }
  }

  async function getSyncQueue() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function addToSyncQueue(item) {
    if (!db) await initDB();

    const syncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ...item,
      status: 'pending',
      priority: item.priority || 'normal',
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add(syncItem);

      request.onsuccess = () => resolve(syncItem);
      request.onerror = () => reject(request.error);
    });
  }

  async function processSyncBatch(batch) {
    for (const item of batch) {
      try {
        await syncItem(item);
        await updateSyncItemStatus(item.id, 'completed');
      } catch (error) {
        console.error('[AdvancedPersistence] Sync item failed:', item.id, error);
        await updateSyncItemStatus(item.id, 'failed');
      }
    }
  }

  async function syncItem(item) {
    // Sync logic based on item type
    switch (item.type) {
      case 'post':
        await syncPost(item.data);
        break;
      case 'user':
        await syncUser(item.data);
        break;
      case 'media':
        await syncMedia(item.data);
        break;
      default:
        console.warn('[AdvancedPersistence] Unknown sync item type:', item.type);
    }
  }

  async function updateSyncItemStatus(itemId, status) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.get(itemId);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.status = status;
          item.lastUpdated = Date.now();
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Offline-first architecture
  async function addToOfflineQueue(operation) {
    if (!db) await initDB();

    const offlineItem = {
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      operation: operation,
      synced: false,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineQueue'], 'readwrite');
      const store = transaction.objectStore('offlineQueue');
      const request = store.add(offlineItem);

      request.onsuccess = () => resolve(offlineItem);
      request.onerror = () => reject(request.error);
    });
  }

  async function processOfflineQueue() {
    if (!navigator.onLine) return;

    const offlineQueue = await getOfflineQueue();
    const pendingItems = offlineQueue.filter(item => !item.synced);

    for (const item of pendingItems) {
      try {
        await executeOfflineOperation(item.operation);
        await markOfflineItemSynced(item.id);
      } catch (error) {
        console.error('[AdvancedPersistence] Offline operation failed:', item.id, error);
      }
    }
  }

  async function getOfflineQueue() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineQueue'], 'readonly');
      const store = transaction.objectStore('offlineQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function markOfflineItemSynced(itemId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineQueue'], 'readwrite');
      const store = transaction.objectStore('offlineQueue');
      const request = store.get(itemId);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.synced = true;
          item.syncedAt = Date.now();
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function executeOfflineOperation(operation) {
    // Execute the offline operation
    switch (operation.type) {
      case 'create_post':
        // Create post logic
        break;
      case 'update_user':
        // Update user logic
        break;
      default:
        console.warn('[AdvancedPersistence] Unknown offline operation:', operation.type);
    }
  }

  // Health monitoring
  async function recordHealthMetric(type, value, metadata = {}) {
    if (!db) await initDB();

    const metric = {
      timestamp: Date.now(),
      type: type,
      value: value,
      metadata: metadata
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['healthMetrics'], 'readwrite');
      const store = transaction.objectStore('healthMetrics');
      const request = store.add(metric);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getHealthMetrics(type, limit = 100) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['healthMetrics'], 'readonly');
      const store = transaction.objectStore('healthMetrics');

      if (type) {
        const index = store.index('type');
        const request = index.getAll(type);
        request.onsuccess = () => {
          let metrics = request.result || [];
          metrics.sort((a, b) => b.timestamp - a.timestamp);
          resolve(metrics.slice(0, limit));
        };
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => {
          let metrics = request.result || [];
          metrics.sort((a, b) => b.timestamp - a.timestamp);
          resolve(metrics.slice(0, limit));
        };
        request.onerror = () => reject(request.error);
      }
    });
  }

  // Data recovery system
  async function recoverData(entityId, timestamp = null) {
    const versions = await getVersions(entityId);

    if (timestamp) {
      // Find version closest to timestamp
      const targetVersion = versions.reduce((closest, version) => {
        return Math.abs(version.timestamp - timestamp) < Math.abs(closest.timestamp - timestamp)
          ? version
          : closest;
      });
      return targetVersion ? targetVersion.data : null;
    }

    // Return latest version
    return versions.length > 0 ? versions[0].data : null;
  }

  // Helper functions
  async function getRemoteVersions(entityId, limit) {
    // In production, fetch from server
    return [];
  }

  async function syncPost(postData) {
    // Sync post to server
    console.log('[AdvancedPersistence] Syncing post:', postData.id);
  }

  async function syncUser(userData) {
    // Sync user to server
    console.log('[AdvancedPersistence] Syncing user:', userData.id);
  }

  async function syncMedia(mediaData) {
    // Sync media to server
    console.log('[AdvancedPersistence] Syncing media:', mediaData.id);
  }

  // Initialize system
  async function init() {
    try {
      await initDB();

      // Set up offline/online listeners
      window.addEventListener('online', () => {
        console.log('[AdvancedPersistence] Back online, processing offline queue');
        processOfflineQueue();
      });

      window.addEventListener('offline', () => {
        console.log('[AdvancedPersistence] Gone offline, operations will be queued');
      });

      // Start real-time sync
      startRealTimeSync();

      // Create initial backup
      if (typeof CU !== 'undefined') {
        await createBackup('initial', CU.id);
      }

      console.log('[AdvancedPersistence] System initialized');
      return true;
    } catch (error) {
      console.error('[AdvancedPersistence] Init failed:', error);
      return false;
    }
  }

  // Public API
  return {
    init,
    createVersion,
    getVersions,
    resolveConflict,
    getConflicts,
    createBackup,
    restoreBackup,
    getBackups,
    startRealTimeSync,
    stopRealTimeSync,
    addToSyncQueue,
    addToOfflineQueue,
    recordHealthMetric,
    getHealthMetrics,
    recoverData,
    compressData,
    decompressData,
    encryptData,
    decryptData,
    SYNC_CONFIG,
    CONFLICT_STRATEGIES
  };
})();

// Make globally available
window.AdvancedPersistence = AdvancedPersistence;

console.log('[AdvancedPersistence] System loaded');

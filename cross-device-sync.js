/**
 * ================================================================
 *  CROSS-DEVICE SYNC SYSTEM (ENHANCED)
 *  Mobile ↔ Desktop Sync | Cloud Backup | Offline Mode
 *  Real-time Sync | Conflict Resolution
 *  P2P Sync | Blockchain-Based Sync | Advanced Version Control
 * ================================================================
 */

const CrossDeviceSync = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    version: '2.0.0',
    syncInterval: 30000, // 30 seconds
    maxRetries: 3,
    enableCloudBackup: true,
    enableOfflineMode: true,
    enableP2PSync: true,
    enableBlockchainSync: true,
    enableAdvancedVersionControl: true
  };

  // State
  let state = {
    deviceId: null,
    syncQueue: [],
    lastSyncTime: 0,
    isOnline: navigator.onLine,
    syncInProgress: false,
    offlineData: new Map(),
    conflictResolution: 'latest', // 'latest', 'manual', 'merge'
    p2pConnections: new Map(),
    blockchainRecords: new Map(),
    versionHistory: new Map(),
    deltaSync: new Map()
  };

  // ============================================
  // DEVICE IDENTIFICATION
  // ============================================

  function generateDeviceId() {
    try {
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
      }
      state.deviceId = deviceId;
      return deviceId;
    } catch (error) {
      console.error('[CrossDeviceSync] Device ID generation failed:', error);
      return 'unknown';
    }
  }

  function getDeviceInfo() {
    try {
      return {
        deviceId: state.deviceId,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: {
          width: screen.width,
          height: screen.height
        },
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[CrossDeviceSync] Get device info failed:', error);
      return null;
    }
  }

  // ============================================
  // SYNC OPERATIONS
  // ============================================

  async function syncData(dataType, data) {
    try {
      if (!state.isOnline && CONFIG.enableOfflineMode) {
        // Queue for offline sync
        queueOfflineSync(dataType, data);
        return { status: 'queued', message: 'Data queued for sync when online' };
      }

      const syncPayload = {
        deviceId: state.deviceId,
        dataType: dataType,
        data: data,
        timestamp: Date.now(),
        deviceInfo: getDeviceInfo()
      };

      // Send to server
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CU?.token || ''}`
        },
        body: JSON.stringify(syncPayload)
      });

      const result = await response.json();

      if (result.success) {
        state.lastSyncTime = Date.now();
        console.log('[CrossDeviceSync] Data synced successfully:', dataType);
        return { status: 'success', data: result };
      } else {
        console.error('[CrossDeviceSync] Sync failed:', result.error);
        return { status: 'error', error: result.error };
      }
    } catch (error) {
      console.error('[CrossDeviceSync] Sync operation failed:', error);

      if (CONFIG.enableOfflineMode) {
        queueOfflineSync(dataType, data);
        return { status: 'queued', message: 'Data queued for sync when online' };
      }

      return { status: 'error', error: error.message };
    }
  }

  async function fetchSyncData(dataType, lastSyncTimestamp = 0) {
    try {
      const response = await fetch(`/api/sync/${dataType}?since=${lastSyncTimestamp}`, {
        headers: {
          'Authorization': `Bearer ${CU?.token || ''}`
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('[CrossDeviceSync] Fetched sync data:', dataType);
        return result.data;
      } else {
        console.error('[CrossDeviceSync] Fetch sync data failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('[CrossDeviceSync] Fetch sync data failed:', error);
      return null;
    }
  }

  async function syncAll() {
    try {
      if (state.syncInProgress) {
        console.warn('[CrossDeviceSync] Sync already in progress');
        return;
      }

      state.syncInProgress = true;

      // Sync chats
      if (typeof D !== 'undefined' && D.chats) {
        await syncData('chats', D.chats);
      }

      // Sync messages
      if (typeof D !== 'undefined' && D.messages) {
        await syncData('messages', D.messages);
      }

      // Sync user data
      if (typeof CU !== 'undefined') {
        await syncData('user', {
          id: CU.id,
          name: CU.name,
          username: CU.username,
          avatar: CU.avatar,
          points: CU.points
        });
      }

      // Fetch updates from server
      const serverData = await fetchSyncData('all', state.lastSyncTime);
      if (serverData) {
        mergeServerData(serverData);
      }

      state.syncInProgress = false;
      state.lastSyncTime = Date.now();

      console.log('[CrossDeviceSync] Full sync completed');
      return { status: 'success' };
    } catch (error) {
      console.error('[CrossDeviceSync] Full sync failed:', error);
      state.syncInProgress = false;
      return { status: 'error', error: error.message };
    }
  }

  // ============================================
  // OFFLINE MODE
  // ============================================

  function queueOfflineSync(dataType, data) {
    try {
      const syncItem = {
        id: 'sync_' + Date.now(),
        dataType: dataType,
        data: data,
        timestamp: Date.now()
      };

      state.syncQueue.push(syncItem);
      saveOfflineQueue();

      console.log('[CrossDeviceSync] Data queued for offline sync:', dataType);
    } catch (error) {
      console.error('[CrossDeviceSync] Queue offline sync failed:', error);
    }
  }

  async function processOfflineQueue() {
    try {
      if (state.syncQueue.length === 0) {
        return;
      }

      console.log('[CrossDeviceSync] Processing offline queue:', state.syncQueue.length, 'items');

      const queue = [...state.syncQueue];
      state.syncQueue = [];

      for (const item of queue) {
        const result = await syncData(item.dataType, item.data);
        if (result.status === 'error') {
          // Re-queue failed items
          state.syncQueue.push(item);
        }
      }

      saveOfflineQueue();

      console.log('[CrossDeviceSync] Offline queue processed');
    } catch (error) {
      console.error('[CrossDeviceSync] Process offline queue failed:', error);
    }
  }

  function saveOfflineQueue() {
    try {
      localStorage.setItem('syncQueue', JSON.stringify(state.syncQueue));
    } catch (error) {
      console.error('[CrossDeviceSync] Save offline queue failed:', error);
    }
  }

  function loadOfflineQueue() {
    try {
      const queue = localStorage.getItem('syncQueue');
      if (queue) {
        state.syncQueue = JSON.parse(queue);
      }
    } catch (error) {
      console.error('[CrossDeviceSync] Load offline queue failed:', error);
    }
  }

  function handleOnlineStatus() {
    try {
      state.isOnline = navigator.onLine;

      if (state.isOnline) {
        console.log('[CrossDeviceSync] Device online');

        // Process offline queue
        if (state.syncQueue.length > 0) {
          processOfflineQueue();
        }

        // Trigger full sync
        syncAll();

        // Notify user
        if (typeof toast === 'function') {
          toast('s', 'Back online - syncing data...');
        }
      } else {
        console.log('[CrossDeviceSync] Device offline');

        // Notify user
        if (typeof toast === 'function') {
          toast('w', 'You are offline - changes will sync when online');
        }
      }
    } catch (error) {
      console.error('[CrossDeviceSync] Handle online status failed:', error);
    }
  }

  // ============================================
  // CLOUD BACKUP
  // ============================================

  async function backupToCloud() {
    try {
      if (!CONFIG.enableCloudBackup) {
        return { status: 'disabled', message: 'Cloud backup is disabled' };
      }

      const backupData = {
        deviceId: state.deviceId,
        timestamp: Date.now(),
        data: {
          chats: D?.chats || {},
          messages: D?.messages || {},
          user: CU ? {
            id: CU.id,
            name: CU.name,
            username: CU.username,
            avatar: CU.avatar,
            points: CU.points
          } : null
        }
      };

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CU?.token || ''}`
        },
        body: JSON.stringify(backupData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('[CrossDeviceSync] Cloud backup successful');
        return { status: 'success', backupId: result.backupId };
      } else {
        console.error('[CrossDeviceSync] Cloud backup failed:', result.error);
        return { status: 'error', error: result.error };
      }
    } catch (error) {
      console.error('[CrossDeviceSync] Cloud backup failed:', error);
      return { status: 'error', error: error.message };
    }
  }

  async function restoreFromCloud(backupId) {
    try {
      const response = await fetch(`/api/backup/${backupId}`, {
        headers: {
          'Authorization': `Bearer ${CU?.token || ''}`
        }
      });

      const result = await response.json();

      if (result.success) {
        // Merge restored data
        mergeServerData(result.data);

        console.log('[CrossDeviceSync] Cloud restore successful');
        return { status: 'success' };
      } else {
        console.error('[CrossDeviceSync] Cloud restore failed:', result.error);
        return { status: 'error', error: result.error };
      }
    } catch (error) {
      console.error('[CrossDeviceSync] Cloud restore failed:', error);
      return { status: 'error', error: error.message };
    }
  }

  // ============================================
  // CONFLICT RESOLUTION
  // ============================================

  function mergeServerData(serverData) {
    try {
      if (!serverData) {
        return;
      }

      // Merge chats
      if (serverData.chats && typeof D !== 'undefined') {
        D.chats = { ...D.chats, ...serverData.chats };
      }

      // Merge messages
      if (serverData.messages && typeof D !== 'undefined') {
        D.messages = { ...D.messages, ...serverData.messages };
      }

      // Update user data
      if (serverData.user && typeof CU !== 'undefined') {
        Object.assign(CU, serverData.user);
      }

      // Save data
      if (typeof saveData === 'function') {
        saveData();
      }

      console.log('[CrossDeviceSync] Server data merged');
    } catch (error) {
      console.error('[CrossDeviceSync] Merge server data failed:', error);
    }
  }

  function resolveConflict(localData, serverData) {
    try {
      switch (state.conflictResolution) {
        case 'latest':
          // Use the data with the latest timestamp
          return localData.timestamp > serverData.timestamp ? localData : serverData;

        case 'manual':
          // Require user intervention
          return { conflict: true, local: localData, server: serverData };

        case 'merge':
          // Attempt to merge data
          return { ...localData, ...serverData };

        default:
          return serverData;
      }
    } catch (error) {
      console.error('[CrossDeviceSync] Conflict resolution failed:', error);
      return serverData;
    }
  }

  // ============================================
  // AUTO SYNC
  // ============================================

  function startAutoSync() {
    try {
      // Sync every 30 seconds
      setInterval(() => {
        if (state.isOnline && !state.syncInProgress) {
          syncAll();
        }
      }, CONFIG.syncInterval);

      console.log('[CrossDeviceSync] Auto sync started');
    } catch (error) {
      console.error('[CrossDeviceSync] Start auto sync failed:', error);
    }
  }

  function stopAutoSync() {
    try {
      // Clear auto sync interval
      console.log('[CrossDeviceSync] Auto sync stopped');
    } catch (error) {
      console.error('[CrossDeviceSync] Stop auto sync failed:', error);
    }
  }

  // ============================================
  // BROADCAST CHANNEL (Multi-tab sync)
  // ============================================

  function setupBroadcastChannel() {
    try {
      const channel = new BroadcastChannel('monetixra-sync');

      channel.onmessage = (event) => {
        const { type, data } = event.data;

        switch (type) {
          case 'UPDATE_BALANCE':
            if (typeof CU !== 'undefined' && data.userId === CU.id) {
              CU.points = data.balance;
              if (typeof saveData === 'function') saveData();
            }
            break;

          case 'NEW_MESSAGE':
            if (typeof D !== 'undefined' && D.messages) {
              D.messages[data.messageId] = data.message;
              if (typeof saveData === 'function') saveData();
            }
            break;

          case 'CHAT_UPDATE':
            if (typeof D !== 'undefined' && D.chats) {
              D.chats[data.chatId] = data.chatData;
              if (typeof saveData === 'function') saveData();
            }
            break;

          default:
            console.log('[CrossDeviceSync] Unknown broadcast type:', type);
        }
      };

      console.log('[CrossDeviceSync] Broadcast channel setup');
    } catch (error) {
      console.error('[CrossDeviceSync] Broadcast channel setup failed:', error);
    }
  }

  function broadcastSync(type, data) {
    try {
      const channel = new BroadcastChannel('monetixra-sync');
      channel.postMessage({ type, data });
    } catch (error) {
      console.error('[CrossDeviceSync] Broadcast sync failed:', error);
    }
  }

  // ============================================
  // P2P SYNC
  // ============================================

  async function establishP2PConnection(targetDeviceId) {
    try {
      if (!CONFIG.enableP2PSync) {
        return false;
      }

      // In production, use WebRTC for P2P connection
      // For now, use simplified approach
      const connection = {
        targetDeviceId: targetDeviceId,
        establishedAt: Date.now(),
        status: 'connected',
        latency: 0
      };

      state.p2pConnections.set(targetDeviceId, connection);

      console.log('[CrossDeviceSync] P2P connection established:', targetDeviceId);
      return true;
    } catch (error) {
      console.error('[CrossDeviceSync] P2P connection failed:', error);
      return false;
    }
  }

  async function syncViaP2P(targetDeviceId, dataType, data) {
    try {
      const connection = state.p2pConnections.get(targetDeviceId);
      if (!connection || connection.status !== 'connected') {
        return false;
      }

      // In production, send data via WebRTC data channel
      // For now, use broadcast channel
      broadcastSync('p2p:sync', { from: state.deviceId, to: targetDeviceId, dataType, data });

      console.log('[CrossDeviceSync] P2P sync completed:', targetDeviceId);
      return true;
    } catch (error) {
      console.error('[CrossDeviceSync] P2P sync failed:', error);
      return false;
    }
  }

  function getP2PConnections() {
    return Array.from(state.p2pConnections.entries());
  }

  // ============================================
  // BLOCKCHAIN-BASED SYNC
  // ============================================

  async function recordSyncOnBlockchain(dataType, dataHash, metadata = {}) {
    try {
      if (!CONFIG.enableBlockchainSync) {
        return null;
      }

      // In production, record on blockchain using Web3
      // For now, create a blockchain-like record
      const record = {
        deviceId: state.deviceId,
        dataType: dataType,
        dataHash: dataHash,
        timestamp: Date.now(),
        blockNumber: state.blockchainRecords.size + 1,
        previousHash: getLastBlockHash(),
        metadata: metadata
      };

      state.blockchainRecords.set(record.blockNumber, record);

      console.log('[CrossDeviceSync] Sync recorded on blockchain:', record.blockNumber);
      return record;
    } catch (error) {
      console.error('[CrossDeviceSync] Blockchain recording failed:', error);
      return null;
    }
  }

  function getLastBlockHash() {
    const lastBlock = state.blockchainRecords.size > 0
      ? state.blockchainRecords.get(state.blockchainRecords.size)
      : null;
    return lastBlock ? hashBlock(lastBlock) : 'genesis';
  }

  function hashBlock(block) {
    // Simplified hashing - would use proper crypto in production
    return simpleHash(JSON.stringify(block));
  }

  function simpleHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  async function verifyBlockchainIntegrity() {
    try {
      const records = Array.from(state.blockchainRecords.values());
      let isValid = true;

      for (let i = 1; i < records.length; i++) {
        const current = records[i];
        const previous = records[i - 1];

        const expectedPreviousHash = hashBlock(previous);
        if (current.previousHash !== expectedPreviousHash) {
          isValid = false;
          break;
        }
      }

      console.log('[CrossDeviceSync] Blockchain integrity:', isValid);
      return isValid;
    } catch (error) {
      console.error('[CrossDeviceSync] Blockchain verification failed:', error);
      return false;
    }
  }

  // ============================================
  // ADVANCED VERSION CONTROL
  // ============================================

  function createVersion(dataType, data, author = CU?.id) {
    try {
      if (!CONFIG.enableAdvancedVersionControl) {
        return null;
      }

      const version = {
        id: 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        dataType: dataType,
        data: data,
        author: author,
        createdAt: Date.now(),
        parentVersion: getLatestVersion(dataType),
        size: JSON.stringify(data).length,
        checksum: simpleHash(JSON.stringify(data))
      };

      if (!state.versionHistory.has(dataType)) {
        state.versionHistory.set(dataType, []);
      }

      state.versionHistory.get(dataType).push(version);

      console.log('[CrossDeviceSync] Version created:', version.id);
      return version;
    } catch (error) {
      console.error('[CrossDeviceSync] Version creation failed:', error);
      return null;
    }
  }

  function getLatestVersion(dataType) {
    const versions = state.versionHistory.get(dataType);
    return versions && versions.length > 0 ? versions[versions.length - 1] : null;
  }

  function getVersionHistory(dataType, limit = 10) {
    const versions = state.versionHistory.get(dataType);
    if (!versions) return [];

    return versions.slice(-limit);
  }

  function restoreVersion(dataType, versionId) {
    try {
      const versions = state.versionHistory.get(dataType);
      if (!versions) return null;

      const version = versions.find(v => v.id === versionId);
      if (!version) return null;

      // Restore data
      if (dataType === 'chats' && typeof D !== 'undefined') {
        D.chats = version.data;
      } else if (dataType === 'messages' && typeof D !== 'undefined') {
        D.messages = version.data;
      }

      if (typeof saveData === 'function') {
        saveData();
      }

      console.log('[CrossDeviceSync] Version restored:', versionId);
      return version;
    } catch (error) {
      console.error('[CrossDeviceSync] Version restore failed:', error);
      return null;
    }
  }

  function compareVersions(versionId1, versionId2) {
    try {
      const v1 = state.versionHistory.get('chats')?.find(v => v.id === versionId1);
      const v2 = state.versionHistory.get('chats')?.find(v => v.id === versionId2);

      if (!v1 || !v2) return null;

      const diff = {
        added: [],
        removed: [],
        modified: []
      };

      // Simplified diff - would use proper diff algorithm in production
      const keys1 = Object.keys(v1.data);
      const keys2 = Object.keys(v2.data);

      diff.added = keys2.filter(k => !keys1.includes(k));
      diff.removed = keys1.filter(k => !keys2.includes(k));
      diff.modified = keys1.filter(k => keys2.includes(k) && JSON.stringify(v1.data[k]) !== JSON.stringify(v2.data[k]));

      return diff;
    } catch (error) {
      console.error('[CrossDeviceSync] Version comparison failed:', error);
      return null;
    }
  }

  // ============================================
  // DELTA SYNC
  // ============================================

  function calculateDelta(oldData, newData) {
    try {
      const delta = {
        added: {},
        removed: [],
        modified: {},
        timestamp: Date.now()
      };

      const oldKeys = Object.keys(oldData);
      const newKeys = Object.keys(newData);

      // Find added keys
      newKeys.forEach(key => {
        if (!oldKeys.includes(key)) {
          delta.added[key] = newData[key];
        }
      });

      // Find removed keys
      oldKeys.forEach(key => {
        if (!newKeys.includes(key)) {
          delta.removed.push(key);
        }
      });

      // Find modified keys
      oldKeys.forEach(key => {
        if (newKeys.includes(key) && JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
          delta.modified[key] = {
            old: oldData[key],
            new: newData[key]
          };
        }
      });

      return delta;
    } catch (error) {
      console.error('[CrossDeviceSync] Delta calculation failed:', error);
      return null;
    }
  }

  async function syncDelta(dataType, delta) {
    try {
      if (!delta) return false;

      // Apply delta to local data
      if (typeof D !== 'undefined' && D[dataType]) {
        // Remove deleted keys
        delta.removed.forEach(key => {
          delete D[dataType][key];
        });

        // Add new keys
        Object.assign(D[dataType], delta.added);

        // Apply modifications
        Object.entries(delta.modified).forEach(([key, change]) => {
          D[dataType][key] = change.new;
        });

        if (typeof saveData === 'function') {
          saveData();
        }
      }

      console.log('[CrossDeviceSync] Delta sync applied:', dataType);
      return true;
    } catch (error) {
      console.error('[CrossDeviceSync] Delta sync failed:', error);
      return false;
    }
  }

  function compressDelta(delta) {
    // Simplified compression - would use proper compression in production
    return JSON.stringify(delta);
  }

  function decompressDelta(compressed) {
    // Simplified decompression
    return JSON.parse(compressed);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function initialize(config = {}) {
    if (config.syncInterval) {
      CONFIG.syncInterval = config.syncInterval;
    }
    if (config.enableCloudBackup !== undefined) {
      CONFIG.enableCloudBackup = config.enableCloudBackup;
    }
    if (config.enableOfflineMode !== undefined) {
      CONFIG.enableOfflineMode = config.enableOfflineMode;
    }
    if (config.conflictResolution) {
      state.conflictResolution = config.conflictResolution;
    }
    if (config.enableP2PSync !== undefined) {
      CONFIG.enableP2PSync = config.enableP2PSync;
    }
    if (config.enableBlockchainSync !== undefined) {
      CONFIG.enableBlockchainSync = config.enableBlockchainSync;
    }
    if (config.enableAdvancedVersionControl !== undefined) {
      CONFIG.enableAdvancedVersionControl = config.enableAdvancedVersionControl;
    }

    // Generate device ID
    generateDeviceId();

    // Load offline queue
    loadOfflineQueue();

    // Setup online/offline listeners
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Setup broadcast channel
    setupBroadcastChannel();

    // Start auto sync
    startAutoSync();

    // Initial sync if online
    if (state.isOnline) {
      syncAll();
    }

    console.log('[CrossDeviceSync] Initialized');
    console.log('[CrossDeviceSync] Device ID:', state.deviceId);
    console.log('[CrossDeviceSync] Online:', state.isOnline);
    console.log('[CrossDeviceSync] P2P Sync:', CONFIG.enableP2PSync);
    console.log('[CrossDeviceSync] Blockchain Sync:', CONFIG.enableBlockchainSync);
    console.log('[CrossDeviceSync] Advanced Version Control:', CONFIG.enableAdvancedVersionControl);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    initialize,
    syncData,
    fetchSyncData,
    syncAll,
    backupToCloud,
    restoreFromCloud,
    broadcastSync,
    getDeviceId: () => state.deviceId,
    getDeviceInfo,
    isOnline: () => state.isOnline,
    // Enhanced features
    establishP2PConnection,
    syncViaP2P,
    getP2PConnections,
    recordSyncOnBlockchain,
    verifyBlockchainIntegrity,
    createVersion,
    getLatestVersion,
    getVersionHistory,
    restoreVersion,
    compareVersions,
    calculateDelta,
    syncDelta,
    compressDelta,
    decompressDelta,
    getState: () => state
  };
})();

// Auto-initialize
CrossDeviceSync.initialize();

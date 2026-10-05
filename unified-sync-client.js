/**
 * ================================================================
 *  Monetixra — Unified Sync Client
 *  Ensures: Cross-device data consistency, Global post distribution
 *  Features: Auto-sync, Conflict resolution, Real-time updates
 * ================================================================
 */

const MonetixraUnifiedSync = (function() {
  // Configuration
  const CONFIG = {
    syncInterval: 30000, // 30 seconds
    retryInterval: 5000, // 5 seconds
    maxRetries: 3,
    apiBaseUrl: '/api/sync'
  };

  // State
  let syncInterval = null;
  let lastSyncTimestamp = 0;
  let syncInProgress = false;
  let retryCount = 0;
  let currentUserId = null;

  // Initialize sync system
  function init(userId) {
    currentUserId = userId;
    console.log('[UnifiedSync] Initializing for user:', userId);
    
    // Load last sync timestamp from localStorage
    const savedTimestamp = localStorage.getItem('monetixra_last_sync');
    if (savedTimestamp) {
      lastSyncTimestamp = parseInt(savedTimestamp);
    }
    
    // Perform initial sync
    performSync();
    
    // Start periodic sync
    startPeriodicSync();
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for storage events (cross-tab sync)
    window.addEventListener('storage', handleStorageChange);
    
    console.log('[UnifiedSync] Initialized successfully');
  }

  // Perform sync with server
  async function performSync() {
    if (syncInProgress) {
      console.log('[UnifiedSync] Sync already in progress, skipping');
      return;
    }

    syncInProgress = true;
    
    try {
      console.log('[UnifiedSync] Starting sync since:', lastSyncTimestamp);
      
      // Get sync data from server
      const response = await fetch(`${CONFIG.apiBaseUrl}/full?since=${lastSyncTimestamp}&userId=${currentUserId}`);
      const data = await response.json();
      
      if (data.success) {
        // Apply sync data to local storage
        await applySyncData(data);
        
        // Update last sync timestamp
        lastSyncTimestamp = data.timestamp || Date.now();
        localStorage.setItem('monetixra_last_sync', lastSyncTimestamp);
        
        // Reset retry count on success
        retryCount = 0;
        
        console.log('[UnifiedSync] Sync completed successfully');
        console.log('[UnifiedSync] Total posts:', data.posts?.length || 0);
        console.log('[UnifiedSync] User points:', data.points?.points || 0);
        
        // Trigger UI refresh
        triggerUIRefresh();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('[UnifiedSync] Sync error:', error);
      
      // Retry logic
      if (retryCount < CONFIG.maxRetries) {
        retryCount++;
        console.log(`[UnifiedSync] Retrying (${retryCount}/${CONFIG.maxRetries})...`);
        setTimeout(performSync, CONFIG.retryInterval);
      } else {
        console.error('[UnifiedSync] Max retries reached, giving up');
        retryCount = 0;
      }
    } finally {
      syncInProgress = false;
    }
  }

  // Apply sync data to local storage
  async function applySyncData(syncData) {
    // Update user data
    if (syncData.user) {
      localStorage.setItem('monetixra_user', JSON.stringify(syncData.user));
      updateUserUI(syncData.user);
    }
    
    // Update points
    if (syncData.points) {
      localStorage.setItem('monetixra_points', JSON.stringify(syncData.points));
      updatePointsUI(syncData.points);
    }
    
    // Update posts (merge with existing)
    if (syncData.posts && Array.isArray(syncData.posts)) {
      const existingPosts = JSON.parse(localStorage.getItem('monetixra_posts') || '[]');
      const postsMap = new Map();
      
      // Add existing posts
      existingPosts.forEach(post => {
        postsMap.set(post.id, post);
      });
      
      // Add/update new posts from sync
      syncData.posts.forEach(post => {
        postsMap.set(post.id, post);
      });
      
      // Convert back to array and save
      const mergedPosts = Array.from(postsMap.values());
      localStorage.setItem('monetixra_posts', JSON.stringify(mergedPosts));
      
      console.log('[UnifiedSync] Posts merged:', mergedPosts.length);
    }
  }

  // Push local changes to server
  async function pushLocalChanges() {
    try {
      // Get local data
      const localUser = JSON.parse(localStorage.getItem('monetixra_user') || 'null');
      const localPosts = JSON.parse(localStorage.getItem('monetixra_posts') || '[]');
      const localPoints = JSON.parse(localStorage.getItem('monetixra_points') || 'null');
      
      if (!localUser && localPosts.length === 0) {
        console.log('[UnifiedSync] No local changes to push');
        return;
      }
      
      // Prepare sync data
      const syncData = {
        users: localUser ? { [localUser.id]: localUser } : {},
        posts: {},
        points: localPoints ? { [localUser?.id]: localPoints } : {},
        timestamp: Date.now()
      };
      
      // Add posts
      localPosts.forEach(post => {
        syncData.posts[post.id] = post;
      });
      
      // Push to server
      const response = await fetch(`${CONFIG.apiBaseUrl}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ syncData })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[UnifiedSync] Local changes pushed successfully:', data.updates);
      } else {
        throw new Error(data.error || 'Push failed');
      }
    } catch (error) {
      console.error('[UnifiedSync] Push error:', error);
    }
  }

  // Start periodic sync
  function startPeriodicSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
    }
    
    syncInterval = setInterval(() => {
      if (!syncInProgress && navigator.onLine) {
        performSync();
      }
    }, CONFIG.syncInterval);
    
    console.log('[UnifiedSync] Periodic sync started (every', CONFIG.syncInterval / 1000, 'seconds)');
  }

  // Stop periodic sync
  function stopPeriodicSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
      console.log('[UnifiedSync] Periodic sync stopped');
    }
  }

  // Handle online event
  function handleOnline() {
    console.log('[UnifiedSync] Connection restored, syncing...');
    performSync();
  }

  // Handle offline event
  function handleOffline() {
    console.log('[UnifiedSync] Connection lost, sync paused');
  }

  // Handle storage change (cross-tab sync)
  function handleStorageChange(event) {
    if (event.key === 'monetixra_last_sync') {
      console.log('[UnifiedSync] Storage changed by another tab, syncing...');
      lastSyncTimestamp = parseInt(event.newValue);
      performSync();
    }
  }

  // Update user UI
  function updateUserUI(user) {
    // Update user display elements
    const userNameElements = document.querySelectorAll('.user-name, .profile-name');
    userNameElements.forEach(el => {
      el.textContent = user.name || user.username || 'User';
    });
    
    // Update avatar
    const userAvatarElements = document.querySelectorAll('.user-avatar, .profile-avatar');
    userAvatarElements.forEach(el => {
      el.src = user.avatar || user.profilePic || '/icon-192.png';
    });
    
    // Update points display
    if (user.points !== undefined) {
      updatePointsUI({ points: user.points });
    }
  }

  // Update points UI
  function updatePointsUI(pointsData) {
    const points = pointsData?.points || 0;
    const pointsElements = document.querySelectorAll('.user-points, .points-display, .balance-amount');
    pointsElements.forEach(el => {
      el.textContent = points.toLocaleString();
    });
  }

  // Trigger UI refresh
  function triggerUIRefresh() {
    // Dispatch custom event for other components to listen
    const event = new CustomEvent('monetixra:sync_complete', {
      detail: { timestamp: lastSyncTimestamp }
    });
    window.dispatchEvent(event);
    
    // Refresh feed if feed container exists
    const feedContainer = document.getElementById('feed-container');
    if (feedContainer && typeof MonetixraGlobalFeed !== 'undefined') {
      MonetixraGlobalFeed.loadInitialPosts();
    }
  }

  // Manual sync trigger
  function manualSync() {
    console.log('[UnifiedSync] Manual sync triggered');
    performSync();
  }

  // Get sync status
  function getSyncStatus() {
    return {
      lastSync: lastSyncTimestamp,
      inProgress: syncInProgress,
      userId: currentUserId,
      online: navigator.onLine
    };
  }

  // Cleanup
  function cleanup() {
    stopPeriodicSync();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('storage', handleStorageChange);
    console.log('[UnifiedSync] Cleaned up');
  }

  // Public API
  return {
    init,
    manualSync,
    getSyncStatus,
    pushLocalChanges,
    cleanup,
    CONFIG
  };
})();

// Auto-initialize if user is logged in
document.addEventListener('DOMContentLoaded', () => {
  const userData = JSON.parse(localStorage.getItem('monetixra_user') || 'null');
  if (userData && userData.id) {
    MonetixraUnifiedSync.init(userData.id);
  }
});

// Make globally available
window.MonetixraUnifiedSync = MonetixraUnifiedSync;

console.log('[UnifiedSync] Client loaded');
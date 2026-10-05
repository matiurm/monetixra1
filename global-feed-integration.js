/**
 * ================================================================
 *  Monetixra — Global Feed Integration
 *  Integrates global feed with existing post/user functions
 *  Ensures: Same data across all devices and platforms
 * ================================================================
 */

// Initialize global feed integration on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[GlobalFeedIntegration] Initializing...');

  try {
    // Initialize global feed system
    if (window.GlobalFeedSystem) {
      await window.GlobalFeedSystem.init();
      console.log('[GlobalFeedIntegration] Global feed initialized');
    }

    // Set up integration hooks
    setupGlobalFeedHooks();

    console.log('[GlobalFeedIntegration] System ready');
  } catch (error) {
    console.error('[GlobalFeedIntegration] Initialization failed:', error);
  }
});

// Set up global feed integration hooks
function setupGlobalFeedHooks() {
  // Hook into login process
  const originalDoLogin = window.doLogin;
  if (originalDoLogin) {
    window.doLogin = async function(...args) {
      const result = await originalDoLogin.apply(this, args);

      if (result && typeof CU !== 'undefined' && CU.id) {
        console.log('[GlobalFeedIntegration] User logged in, starting global feed');

        // Initialize global feed for this user
        if (window.GlobalFeedSystem) {
          // Request global feed from server
          setTimeout(() => {
            window.GlobalFeedSystem.requestGlobalFeed();
          }, 1000);
        }
      }

      return result;
    };
  }

  // Hook into logout process
  const originalLogout = window.logout;
  if (originalLogout) {
    window.logout = async function(...args) {
      const userId = typeof CU !== 'undefined' ? CU.id : null;

      if (userId && window.GlobalFeedSystem) {
        console.log('[GlobalFeedIntegration] User logging out, disconnecting global feed');
        window.GlobalFeedSystem.disconnect();
      }

      const result = await originalLogout.apply(this, args);
      return result;
    };
  }

  // Hook into post creation
  const originalCreatePost = window.createPost;
  if (originalCreatePost) {
    window.createPost = async function(...args) {
      const result = await originalCreatePost.apply(this, args);

      if (result && typeof CU !== 'undefined' && CU.id) {
        console.log('[GlobalFeedIntegration] Post created, broadcasting to all devices');

        // Broadcast new post to all devices
        if (window.GlobalFeedSystem) {
          window.GlobalFeedSystem.broadcastNewPost(result);
        }

        // Sync to server for global distribution
        syncPostToServer(result);
      }

      return result;
    };
  }

  // Hook into post update
  const originalUpdatePost = window.updatePost;
  if (originalUpdatePost) {
    window.updatePost = async function(...args) {
      const result = await originalUpdatePost.apply(this, args);

      if (result && typeof CU !== 'undefined' && CU.id) {
        console.log('[GlobalFeedIntegration] Post updated, broadcasting to all devices');

        // Broadcast post update to all devices
        if (window.GlobalFeedSystem) {
          window.GlobalFeedSystem.broadcastPostUpdate(result);
        }

        // Sync to server for global distribution
        syncPostToServer(result);
      }

      return result;
    };
  }

  // Hook into post deletion
  const originalDeletePost = window.deletePost;
  if (originalDeletePost) {
    window.deletePost = async function(...args) {
      const postId = args[0]; // First argument is post ID

      // Broadcast deletion before actual deletion
      if (postId && typeof CU !== 'undefined' && CU.id && window.GlobalFeedSystem) {
        window.GlobalFeedSystem.broadcastPostDelete(postId);
      }

      const result = await originalDeletePost.apply(this, args);

      // Sync deletion to server
      if (result && postId) {
        syncPostDeletionToServer(postId);
      }

      return result;
    };
  }

  // Hook into points changes
  const originalUpdateBalanceUI = window.updateBalanceUI;
  if (originalUpdateBalanceUI) {
    window.updateBalanceUI = async function(...args) {
      const result = await originalUpdateBalanceUI.apply(this, args);

      if (typeof CU !== 'undefined' && CU.id && CU.points !== undefined) {
        console.log('[GlobalFeedIntegration] Points changed, broadcasting to all devices');

        // Broadcast points update to all devices
        if (window.GlobalFeedSystem) {
          window.GlobalFeedSystem.broadcastPointsUpdate(CU.points);
        }

        // Sync points to server
        syncPointsToServer(CU.id, CU.points);
      }

      return result;
    };
  }

  // Hook into user data changes
  const originalSaveData = window.saveData;
  if (originalSaveData) {
    window.saveData = async function(...args) {
      const result = await originalSaveData.apply(this, args);

      if (typeof CU !== 'undefined' && CU.id) {
        // Sync user data to server periodically
        debouncedSyncUserData();
      }

      return result;
    };
  }

  console.log('[GlobalFeedIntegration] Integration hooks set up successfully');
}

// Sync post to server for global distribution
async function syncPostToServer(post) {
  try {
    const serverUrl = window.location.origin || 'http://localhost:3000';
    const response = await fetch(`${serverUrl}/api/posts/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': typeof CU !== 'undefined' ? CU.id : ''
      },
      body: JSON.stringify({
        post: post,
        userId: typeof CU !== 'undefined' ? CU.id : null,
        timestamp: Date.now()
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[GlobalFeedIntegration] Post synced to server:', data.success);
    } else {
      console.warn('[GlobalFeedIntegration] Server sync failed:', response.status);
    }
  } catch (error) {
    console.error('[GlobalFeedIntegration] Post sync error:', error);
  }
}

// Sync post deletion to server
async function syncPostDeletionToServer(postId) {
  try {
    const serverUrl = window.location.origin || 'http://localhost:3000';
    const response = await fetch(`${serverUrl}/api/posts/delete-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': typeof CU !== 'undefined' ? CU.id : ''
      },
      body: JSON.stringify({
        postId: postId,
        userId: typeof CU !== 'undefined' ? CU.id : null,
        timestamp: Date.now()
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[GlobalFeedIntegration] Post deletion synced to server:', data.success);
    } else {
      console.warn('[GlobalFeedIntegration] Server sync failed:', response.status);
    }
  } catch (error) {
    console.error('[GlobalFeedIntegration] Post deletion sync error:', error);
  }
}

// Sync points to server
async function syncPointsToServer(userId, points) {
  try {
    const serverUrl = window.location.origin || 'http://localhost:3000';
    const response = await fetch(`${serverUrl}/api/users/points-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        userId: userId,
        points: points,
        timestamp: Date.now()
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[GlobalFeedIntegration] Points synced to server:', data.success);
    } else {
      console.warn('[GlobalFeedIntegration] Server sync failed:', response.status);
    }
  } catch (error) {
    console.error('[GlobalFeedIntegration] Points sync error:', error);
  }
}

// Debounced user data sync
let syncTimeout = null;
function debouncedSyncUserData() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    if (typeof CU !== 'undefined' && CU.id) {
      try {
        const serverUrl = window.location.origin || 'http://localhost:3000';
        const response = await fetch(`${serverUrl}/api/users/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': CU.id
          },
          body: JSON.stringify({
            user: CU,
            timestamp: Date.now()
          })
        });

        if (response.ok) {
          console.log('[GlobalFeedIntegration] User data synced to server');
        }
      } catch (error) {
        console.error('[GlobalFeedIntegration] User data sync error:', error);
      }
    }
  }, 2000); // 2 seconds debounce
}

// Manual sync function
async function manualSync() {
  if (typeof CU !== 'undefined' && CU.id && window.GlobalFeedSystem) {
    try {
      await window.GlobalFeedSystem.syncAllData();
      alert('✅ Manual sync completed');
      return true;
    } catch (error) {
      console.error('[GlobalFeedIntegration] Manual sync failed:', error);
      alert('❌ Sync failed: ' + error.message);
      return false;
    }
  } else {
    alert('⚠️ No user logged in or global feed not available');
    return false;
  }
}

// Force global feed refresh
async function forceFeedRefresh() {
  if (window.GlobalFeedSystem) {
    try {
      await window.GlobalFeedSystem.requestGlobalFeed();
      alert('✅ Feed refresh requested');
      return true;
    } catch (error) {
      console.error('[GlobalFeedIntegration] Feed refresh failed:', error);
      alert('❌ Feed refresh failed: ' + error.message);
      return false;
    }
  } else {
    alert('⚠️ Global feed not available');
    return false;
  }
}

// Show connection status
function showConnectionStatus() {
  if (window.GlobalFeedSystem) {
    const status = window.GlobalFeedSystem.getConnectionStatus();
    const message = `
📊 Global Feed Connection Status

Connected: ${status.connected ? '✅ Yes' : '❌ No'}
Reconnect Attempts: ${status.reconnectAttempts}

${status.connected ? 'Your data is syncing in real-time across all devices!' : 'Trying to reconnect...'}
    `;
    alert(message);
  } else {
    alert('⚠️ Global feed not available');
  }
}

// Make functions globally available
window.globalFeedIntegration = {
  manualSync,
  forceFeedRefresh,
  showConnectionStatus
};

console.log('[GlobalFeedIntegration] Integration system loaded');

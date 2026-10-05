/**
 * ================================================================
 *  Monetixra — Global Feed System
 *  Ensures: Same account shows same data across all devices
 *  Features: Real-time sync, Global feed, Cross-device consistency
 * ================================================================
 */

const GlobalFeedSystem = (function() {
  let socket = null;
  let isConnected = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  // Initialize Socket.io connection
  function initSocket() {
    if (socket && isConnected) return;

    try {
      const serverUrl = window.location.origin || 'http://localhost:3000';
      socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: RECONNECT_DELAY,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS
      });

      setupSocketListeners();
      console.log('[GlobalFeed] Socket initialized');
    } catch (error) {
      console.error('[GlobalFeed] Socket initialization failed:', error);
    }
  }

  // Setup Socket.io event listeners
  function setupSocketListeners() {
    if (!socket) return;

    // Connection events
    socket.on('connect', () => {
      isConnected = true;
      reconnectAttempts = 0;
      console.log('[GlobalFeed] Connected to server');

      // Authenticate with user ID
      if (typeof CU !== 'undefined' && CU.id) {
        socket.emit('authenticate', { userId: CU.id });
      }
    });

    socket.on('disconnect', () => {
      isConnected = false;
      console.log('[GlobalFeed] Disconnected from server');
    });

    socket.on('reconnect', () => {
      isConnected = true;
      console.log('[GlobalFeed] Reconnected to server');

      // Re-authenticate and sync data
      if (typeof CU !== 'undefined' && CU.id) {
        socket.emit('authenticate', { userId: CU.id });
        syncAllData();
      }
    });

    socket.on('reconnect_failed', () => {
      console.error('[GlobalFeed] Reconnection failed');
    });

    // Post events
    socket.on('new_post', (post) => {
      console.log('[GlobalFeed] New post received:', post.id);
      handleNewPost(post);
    });

    socket.on('post_updated', (post) => {
      console.log('[GlobalFeed] Post updated:', post.id);
      handlePostUpdate(post);
    });

    socket.on('post_deleted', (postId) => {
      console.log('[GlobalFeed] Post deleted:', postId);
      handlePostDelete(postId);
    });

    // User events
    socket.on('user_updated', (userData) => {
      console.log('[GlobalFeed] User updated:', userData.id);
      handleUserUpdate(userData);
    });

    socket.on('points_updated', (data) => {
      console.log('[GlobalFeed] Points updated:', data.userId, data.points);
      handlePointsUpdate(data);
    });

    // Feed events
    socket.on('feed_update', (feedData) => {
      console.log('[GlobalFeed] Feed update received');
      handleFeedUpdate(feedData);
    });

    // Global events
    socket.on('global_broadcast', (data) => {
      console.log('[GlobalFeed] Global broadcast received:', data.type);
      handleGlobalBroadcast(data);
    });
  }

  // Handle new post from server
  function handleNewPost(post) {
    if (!D) D = { posts: [] };
    if (!D.posts) D.posts = [];

    // Check if post already exists
    const existingIndex = D.posts.findIndex(p => p.id === post.id);
    if (existingIndex !== -1) {
      console.log('[GlobalFeed] Post already exists, skipping');
      return;
    }

    // Add new post to feed
    D.posts.unshift(post);

    // Save to local storage
    if (typeof saveData === 'function') {
      saveData();
    }

    // Refresh feed
    if (typeof rFeed === 'function') {
      rFeed(false);
    }

    // Show notification for posts from other users
    if (post.author !== (typeof CU !== 'undefined' ? CU.id : null)) {
      const author = D.users ? D.users[post.author] : null;
      if (typeof addNotif === 'function') {
        addNotif(
          typeof CU !== 'undefined' ? CU.id : null,
          'post',
          '📝',
          `${author?.name || 'Someone'} posted: ${(post.text || '').slice(0, 50)}`
        );
      }
    }

    console.log('[GlobalFeed] New post added to feed');
  }

  // Handle post update from server
  function handlePostUpdate(post) {
    if (!D || !D.posts) return;

    const index = D.posts.findIndex(p => p.id === post.id);
    if (index === -1) {
      console.log('[GlobalFeed] Post not found for update');
      return;
    }

    // Update post data
    D.posts[index] = {
      ...D.posts[index],
      ...post
    };

    // Save to local storage
    if (typeof saveData === 'function') {
      saveData();
    }

    // Refresh feed
    if (typeof rFeed === 'function') {
      rFeed(false);
    }

    console.log('[GlobalFeed] Post updated in feed');
  }

  // Handle post deletion from server
  function handlePostDelete(postId) {
    if (!D || !D.posts) return;

    D.posts = D.posts.filter(p => p.id !== postId);

    // Save to local storage
    if (typeof saveData === 'function') {
      saveData();
    }

    // Refresh feed
    if (typeof rFeed === 'function') {
      rFeed(false);
    }

    console.log('[GlobalFeed] Post deleted from feed');
  }

  // Handle user update from server
  function handleUserUpdate(userData) {
    if (!D || !D.users) return;

    D.users[userData.id] = {
      ...D.users[userData.id],
      ...userData
    };

    // Update current user if it's the same
    if (typeof CU !== 'undefined' && CU.id === userData.id) {
      Object.assign(CU, userData);
    }

    // Save to local storage
    if (typeof saveData === 'function') {
      saveData();
    }

    console.log('[GlobalFeed] User data updated');
  }

  // Handle points update from server
  function handlePointsUpdate(data) {
    if (!data || !data.userId || data.points === undefined) return;

    if (!D || !D.users) return;

    // Update user points
    if (D.users[data.userId]) {
      D.users[data.userId].points = data.points;
    }

    // Update current user if it's the same
    if (typeof CU !== 'undefined' && CU.id === data.userId) {
      CU.points = data.points;
    }

    // Save to local storage
    if (typeof saveData === 'function') {
      saveData();
    }

    // Update UI
    if (typeof updateBalanceUI === 'function') {
      updateBalanceUI();
    }

    console.log('[GlobalFeed] Points updated:', data.userId, data.points);
  }

  // Handle feed update from server
  function handleFeedUpdate(feedData) {
    if (!feedData || !feedData.posts) return;

    if (!D) D = { posts: [] };
    if (!D.posts) D.posts = [];

    // Merge posts with existing posts
    const existingPostIds = new Set(D.posts.map(p => p.id));
    let newPostsCount = 0;

    feedData.posts.forEach(post => {
      if (!existingPostIds.has(post.id)) {
        D.posts.push(post);
        newPostsCount++;
      }
    });

    // Sort by creation time
    D.posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Save to local storage
    if (typeof saveData === 'function') {
      saveData();
    }

    // Refresh feed
    if (typeof rFeed === 'function') {
      rFeed(false);
    }

    console.log('[GlobalFeed] Feed updated, added', newPostsCount, 'new posts');
  }

  // Handle global broadcast
  function handleGlobalBroadcast(data) {
    switch (data.type) {
      case 'system_message':
        if (typeof toast === 'function') {
          toast('i', data.message);
        }
        break;

      case 'maintenance':
        if (typeof toast === 'function') {
          toast('w', '⚠️ ' + data.message);
        }
        break;

      case 'announcement':
        if (typeof toast === 'function') {
          toast('s', '📢 ' + data.message);
        }
        break;

      default:
        console.log('[GlobalFeed] Unknown broadcast type:', data.type);
    }
  }

  // Sync all data with server
  async function syncAllData() {
    if (!isConnected || !socket) {
      console.warn('[GlobalFeed] Not connected, skipping sync');
      return;
    }

    try {
      console.log('[GlobalFeed] Syncing all data with server');

      // Request full sync from server
      socket.emit('request_full_sync', {
        userId: typeof CU !== 'undefined' ? CU.id : null,
        lastSync: localStorage.getItem('monetixra_last_sync') || 0
      });

    } catch (error) {
      console.error('[GlobalFeed] Sync failed:', error);
    }
  }

  // Broadcast new post to all devices
  function broadcastNewPost(post) {
    if (!isConnected || !socket) {
      console.warn('[GlobalFeed] Not connected, skipping broadcast');
      return;
    }

    try {
      socket.emit('new_post', {
        post: post,
        userId: typeof CU !== 'undefined' ? CU.id : null,
        timestamp: Date.now()
      });

      console.log('[GlobalFeed] New post broadcasted');
    } catch (error) {
      console.error('[GlobalFeed] Broadcast failed:', error);
    }
  }

  // Broadcast post update to all devices
  function broadcastPostUpdate(post) {
    if (!isConnected || !socket) {
      console.warn('[GlobalFeed] Not connected, skipping broadcast');
      return;
    }

    try {
      socket.emit('post_updated', {
        post: post,
        userId: typeof CU !== 'undefined' ? CU.id : null,
        timestamp: Date.now()
      });

      console.log('[GlobalFeed] Post update broadcasted');
    } catch (error) {
      console.error('[GlobalFeed] Broadcast failed:', error);
    }
  }

  // Broadcast post deletion to all devices
  function broadcastPostDelete(postId) {
    if (!isConnected || !socket) {
      console.warn('[GlobalFeed] Not connected, skipping broadcast');
      return;
    }

    try {
      socket.emit('post_deleted', {
        postId: postId,
        userId: typeof CU !== 'undefined' ? CU.id : null,
        timestamp: Date.now()
      });

      console.log('[GlobalFeed] Post deletion broadcasted');
    } catch (error) {
      console.error('[GlobalFeed] Broadcast failed:', error);
    }
  }

  // Broadcast points update to all devices
  function broadcastPointsUpdate(points) {
    if (!isConnected || !socket) {
      console.warn('[GlobalFeed] Not connected, skipping broadcast');
      return;
    }

    try {
      socket.emit('points_updated', {
        userId: typeof CU !== 'undefined' ? CU.id : null,
        points: points,
        timestamp: Date.now()
      });

      console.log('[GlobalFeed] Points update broadcasted');
    } catch (error) {
      console.error('[GlobalFeed] Broadcast failed:', error);
    }
  }

  // Request global feed from server
  function requestGlobalFeed() {
    if (!isConnected || !socket) {
      console.warn('[GlobalFeed] Not connected, skipping feed request');
      return;
    }

    try {
      socket.emit('request_global_feed', {
        userId: typeof CU !== 'undefined' ? CU.id : null,
        timestamp: Date.now()
      });

      console.log('[GlobalFeed] Global feed requested');
    } catch (error) {
      console.error('[GlobalFeed] Feed request failed:', error);
    }
  }

  // Disconnect from server
  function disconnect() {
    if (socket) {
      socket.disconnect();
      isConnected = false;
      console.log('[GlobalFeed] Disconnected');
    }
  }

  // Get connection status
  function getConnectionStatus() {
    return {
      connected: isConnected,
      reconnectAttempts: reconnectAttempts
    };
  }

  // Initialize system
  function init() {
    initSocket();
    console.log('[GlobalFeed] System initialized');
  }

  // Public API
  return {
    init,
    disconnect,
    syncAllData,
    broadcastNewPost,
    broadcastPostUpdate,
    broadcastPostDelete,
    broadcastPointsUpdate,
    requestGlobalFeed,
    getConnectionStatus
  };
})();

// Make globally available
window.GlobalFeedSystem = GlobalFeedSystem;

console.log('[GlobalFeed] System loaded');

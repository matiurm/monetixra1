// ============================================================
//  Monetixra - Supabase Real-time Subscriptions
//  Real-time: Chat, Notifications, Post updates, User presence
//  Combined with IndexedDB offline storage = Best of both worlds
// ============================================================

// Supabase Client (use existing one from index.html)
let supabaseRealtime = null;
let realtimeChannels = new Map();

// ==========================================
// REALTIME INITIALIZATION
// ==========================================

function initSupabaseRealtime(supabaseClient) {
  supabaseRealtime = supabaseClient;
  console.log('[SupabaseRealtime] Initialized ✅');
  return supabaseRealtime;
}

// ==========================================
// POST SUBSCRIPTIONS
// ==========================================

/**
 * Subscribe to new posts (real-time feed)
 */
function subscribeToPosts(onNewPost, onUpdate, onDelete) {
  const channel = supabaseRealtime
    .channel('public:posts')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'posts' },
      async (payload) => {
        console.log('[Realtime] New post:', payload.new);
        
        // Save to IndexedDB for offline access
        await IndexedDBStorage.savePostOffline(payload.new);
        
        // Call callback
        if (onNewPost) onNewPost(payload.new);
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'posts' },
      async (payload) => {
        console.log('[Realtime] Post updated:', payload.new);
        await IndexedDBStorage.savePostOffline(payload.new);
        if (onUpdate) onUpdate(payload.new);
      }
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'posts' },
      async (payload) => {
        console.log('[Realtime] Post deleted:', payload.old);
        await IndexedDBStorage.deletePostOffline(payload.old.id);
        if (onDelete) onDelete(payload.old);
      }
    )
    .subscribe();
  
  realtimeChannels.set('posts', channel);
  return channel;
}

/**
 * Subscribe to specific user's posts
 */
function subscribeToUserPosts(userId, callback) {
  const channel = supabaseRealtime
    .channel(`user-posts:${userId}`)
    .on('postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'posts',
        filter: `author_id=eq.${userId}`
      },
      async (payload) => {
        await IndexedDBStorage.savePostOffline(payload.new);
        if (callback) callback(payload);
      }
    )
    .subscribe();
  
  realtimeChannels.set(`user-posts:${userId}`, channel);
  return channel;
}

// ==========================================
// CHAT SUBSCRIPTIONS
// ==========================================

/**
 * Subscribe to chat messages in a room
 */
function subscribeToChat(roomId, onMessage, onTyping) {
  const channel = supabaseRealtime
    .channel(`chat:${roomId}`)
    .on('postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        console.log('[Realtime] New chat:', payload.new);
        
        // Save to IndexedDB
        await IndexedDBStorage.saveChatMessage({
          id: payload.new.id,
          room: roomId,
          sender: payload.new.sender_id,
          text: payload.new.content,
          timestamp: payload.new.created_at,
          read: false
        });
        
        if (onMessage) onMessage(payload.new);
      }
    )
    .subscribe();
  
  // Track presence (typing indicator)
  channel
    .on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const typingUsers = Object.values(presenceState)
        .flat()
        .filter(p => p.typing)
        .map(p => p.user);
      
      if (onTyping) onTyping(typingUsers);
    })
    .subscribe();
  
  realtimeChannels.set(`chat:${roomId}`, channel);
  return channel;
}

/**
 * Send typing indicator
 */
async function sendTypingIndicator(roomId, user, isTyping) {
  const channel = realtimeChannels.get(`chat:${roomId}`);
  if (!channel) return;
  
  await channel.track({
    user: user.name,
    typing: isTyping,
    timestamp: Date.now()
  });
}

// ==========================================
// NOTIFICATION SUBSCRIPTIONS
// ==========================================

/**
 * Subscribe to user notifications
 */
function subscribeToNotifications(userId, onNotification) {
  const channel = supabaseRealtime
    .channel(`notifications:${userId}`)
    .on('postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      async (payload) => {
        console.log('[Realtime] New notification:', payload.new);
        
        // Save to IndexedDB
        await IndexedDBStorage.saveNotification({
          id: payload.new.id,
          type: payload.new.type,
          title: payload.new.title,
          message: payload.new.message,
          read: payload.new.read,
          timestamp: payload.new.created_at,
          data: payload.new.data
        });
        
        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification(payload.new.title, {
            body: payload.new.message,
            icon: '/icon-192.png'
          });
        }
        
        if (onNotification) onNotification(payload.new);
      }
    )
    .subscribe();
  
  realtimeChannels.set(`notifications:${userId}`, channel);
  return channel;
}

// ==========================================
// USER PRESENCE / ONLINE STATUS
// ==========================================

/**
 * Track user online status
 */
function subscribeToUserPresence(userId, onPresenceChange) {
  const channel = supabaseRealtime
    .channel(`presence:${userId}`)
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.keys(state);
      
      if (onPresenceChange) {
        onPresenceChange({
          online: users,
          count: users.length
        });
      }
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[Realtime] User joined:', key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[Realtime] User left:', key, leftPresences);
    })
    .subscribe();
  
  // Broadcast own presence
  channel.track({
    user_id: userId,
    online_at: new Date().toISOString()
  });
  
  realtimeChannels.set(`presence:${userId}`, channel);
  return channel;
}

// ==========================================
// ANALYTICS / VIEWS / LIKES (REAL-TIME)
// ==========================================

/**
 * Subscribe to post engagement (views, likes, comments)
 */
function subscribeToPostEngagement(postId, onEngagement) {
  const channel = supabaseRealtime
    .channel(`engagement:${postId}`)
    .on('postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'post_engagement',
        filter: `post_id=eq.${postId}`
      },
      (payload) => {
        console.log('[Realtime] Engagement:', payload);
        if (onEngagement) onEngagement(payload.new);
      }
    )
    .subscribe();
  
  realtimeChannels.set(`engagement:${postId}`, channel);
  return channel;
}

/**
 * Increment view count (debounced)
 */
let viewDebounceTimer = {};
function trackPostView(postId, userId) {
  // Debounce: only count view once per minute per user
  const key = `${postId}_${userId}`;
  
  if (viewDebounceTimer[key]) {
    clearTimeout(viewDebounceTimer[key]);
  }
  
  viewDebounceTimer[key] = setTimeout(async () => {
    await supabaseRealtime.rpc('increment_post_views', {
      post_id: postId
    });
  }, 5000); // 5 second debounce
}

// ==========================================
// SYNC OFFLINE DATA WHEN BACK ONLINE
// ==========================================

/**
 * Sync all pending offline operations
 */
async function syncOfflineOperations() {
  if (!navigator.onLine) {
    console.log('[Sync] Offline - skipping sync');
    return;
  }
  
  console.log('[Sync] Starting offline sync...');
  
  // Sync posts
  const posts = await IndexedDBStorage.getSyncQueue();
  for (const item of posts) {
    try {
      switch (item.type) {
        case 'post':
          await supabaseRealtime.from('posts').insert(item.data);
          break;
        case 'like':
          await supabaseRealtime.rpc('toggle_like', {
            post_id: item.data.postId,
            user_id: item.data.userId
          });
          break;
        case 'comment':
          await supabaseRealtime.from('comments').insert(item.data);
          break;
        case 'chat':
          await supabaseRealtime.from('chat_messages').insert({
            room_id: item.data.room,
            sender_id: item.data.sender,
            content: item.data.text
          });
          break;
      }
      
      // Remove from queue after successful sync
      await IndexedDBStorage.removeFromSyncQueue(item.id);
      console.log('[Sync] Synced:', item.type);
      
    } catch (err) {
      console.error('[Sync] Failed:', item.type, err);
    }
  }
  
  console.log('[Sync] Complete!');
}

// ==========================================
// BROADCAST (CROSS-TAB COMMUNICATION)
// ==========================================

/**
 * Broadcast message to all open tabs
 */
function broadcastToAllTabs(message) {
  if (supabaseRealtime) {
    supabaseRealtime.channel('broadcast').send({
      type: 'broadcast',
      event: message.event,
      payload: message.payload
    });
  }
}

/**
 * Listen to broadcast messages
 */
function onBroadcast(event, callback) {
  const channel = supabaseRealtime
    .channel('broadcast')
    .on('broadcast', { event }, (payload) => {
      if (callback) callback(payload);
    })
    .subscribe();
  
  return channel;
}

// ==========================================
// CLEANUP
// ==========================================

function unsubscribeAll() {
  realtimeChannels.forEach((channel, key) => {
    channel.unsubscribe();
    console.log('[Realtime] Unsubscribed:', key);
  });
  realtimeChannels.clear();
}

function unsubscribe(channelName) {
  const channel = realtimeChannels.get(channelName);
  if (channel) {
    channel.unsubscribe();
    realtimeChannels.delete(channelName);
  }
}

// ==========================================
// ONLINE/OFFLINE HANDLING
// ==========================================

window.addEventListener('online', () => {
  console.log('[SupabaseRealtime] Back online');
  toast('s', '🌐 Back online - syncing data...');
  syncOfflineOperations();
});

window.addEventListener('offline', () => {
  console.log('[SupabaseRealtime] Gone offline');
  toast('w', '⚠️ Offline mode - using cached data');
});

// ==========================================
// EXPORT
// ==========================================

window.SupabaseRealtime = {
  init: initSupabaseRealtime,
  
  // Subscriptions
  subscribeToPosts,
  subscribeToUserPosts,
  subscribeToChat,
  subscribeToNotifications,
  subscribeToUserPresence,
  subscribeToPostEngagement,
  
  // Actions
  sendTypingIndicator,
  trackPostView,
  syncOfflineOperations,
  broadcastToAllTabs,
  onBroadcast,
  
  // Cleanup
  unsubscribe,
  unsubscribeAll,
  
  // State
  get channels() { return realtimeChannels; },
  get isInitialized() { return !!supabaseRealtime; }
};

console.log('[SupabaseRealtime] Module loaded ✅');
console.log('[SupabaseRealtime] Features: Posts, Chat, Notifications, Presence');

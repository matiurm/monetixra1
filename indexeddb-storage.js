// ============================================================
//  Monetixra - IndexedDB Offline Storage System
//  Stores: Posts, Chat, Notifications, User Data for Offline Use
//  21.5 GB+ total storage (Supabase 1GB + MEGA 20GB + IndexedDB 500MB+)
// ============================================================

const DB_NAME = 'MonetixraDB';
const DB_VERSION = 1;

const STORES = {
  posts: 'posts',           // Post metadata + text
  media: 'media',           // Small images/thumbnails (base64)
  chat: 'chat',             // Chat messages
  notifications: 'notifications', // User notifications
  user: 'user',             // Current user data
  cache: 'cache',           // General cache
  syncQueue: 'syncQueue'    // Pending sync operations
};

let db = null;

// Initialize IndexedDB
async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log('[IndexedDB] Initialized ✅');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Posts store
      if (!database.objectStoreNames.contains(STORES.posts)) {
        const postStore = database.createObjectStore(STORES.posts, { keyPath: 'id' });
        postStore.createIndex('author', 'author', { unique: false });
        postStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Media store (small files only < 5MB)
      if (!database.objectStoreNames.contains(STORES.media)) {
        const mediaStore = database.createObjectStore(STORES.media, { keyPath: 'id' });
        mediaStore.createIndex('type', 'type', { unique: false });
        mediaStore.createIndex('size', 'size', { unique: false });
      }
      
      // Chat store
      if (!database.objectStoreNames.contains(STORES.chat)) {
        const chatStore = database.createObjectStore(STORES.chat, { keyPath: 'id' });
        chatStore.createIndex('room', 'room', { unique: false });
        chatStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Notifications store
      if (!database.objectStoreNames.contains(STORES.notifications)) {
        const notifStore = database.createObjectStore(STORES.notifications, { keyPath: 'id' });
        notifStore.createIndex('read', 'read', { unique: false });
        notifStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // User store
      if (!database.objectStoreNames.contains(STORES.user)) {
        database.createObjectStore(STORES.user, { keyPath: 'key' });
      }
      
      // Cache store
      if (!database.objectStoreNames.contains(STORES.cache)) {
        const cacheStore = database.createObjectStore(STORES.cache, { keyPath: 'key' });
        cacheStore.createIndex('expires', 'expires', { unique: false });
      }
      
      // Sync queue
      if (!database.objectStoreNames.contains(STORES.syncQueue)) {
        const syncStore = database.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Generic CRUD operations
async function dbPut(store, data) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    const request = st.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGet(store, key) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const st = tx.objectStore(store);
    const request = st.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGetAll(store, indexName, query) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const st = tx.objectStore(store);
    const source = indexName ? st.index(indexName) : st;
    const request = query ? source.getAll(query) : source.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbDelete(store, key) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    const request = st.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbClear(store) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    const request = st.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ==========================================
// POSTS - Offline Storage
// ==========================================
async function savePostOffline(post) {
  // Only store metadata + text, not large files
  const offlinePost = {
    id: post.id,
    author: post.author,
    authorName: post.authorName,
    text: post.text,
    hashtags: post.hashtags,
    isPremium: post.isPremium,
    isNft: post.isNft,
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    views: post.views,
    timestamp: post.timestamp || Date.now(),
    // Small thumbnail only (< 100KB)
    thumbnail: post.thumbnail || null,
    // Large file URLs (stored in Supabase/MEGA)
    fileUrl: post.fileUrl || null,
    fileType: post.fileType || null,
    storageType: post.storageType || 'supabase' // 'supabase', 'mega', 'indexeddb'
  };
  
  await dbPut(STORES.posts, offlinePost);
  console.log('[IndexedDB] Post saved:', post.id);
}

async function getPostOffline(postId) {
  return await dbGet(STORES.posts, postId);
}

async function getAllPostsOffline(limit = 50) {
  const posts = await dbGetAll(STORES.posts, 'timestamp');
  return posts.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

async function deletePostOffline(postId) {
  await dbDelete(STORES.posts, postId);
}

// ==========================================
// MEDIA - Small Files (< 5MB)
// ==========================================
async function saveMediaOffline(mediaId, blob, metadata = {}) {
  // Check size limit (5MB for IndexedDB)
  if (blob.size > 5 * 1024 * 1024) {
    console.warn('[IndexedDB] File too large, skipping:', mediaId);
    return false;
  }
  
  // Convert to base64
  const base64 = await blobToBase64(blob);
  
  const mediaData = {
    id: mediaId,
    data: base64,
    type: metadata.type || blob.type,
    size: blob.size,
    timestamp: Date.now(),
    postId: metadata.postId || null
  };
  
  await dbPut(STORES.media, mediaData);
  console.log('[IndexedDB] Media saved:', mediaId, formatBytes(blob.size));
  return true;
}

async function getMediaOffline(mediaId) {
  const media = await dbGet(STORES.media, mediaId);
  if (!media) return null;
  
  // Convert base64 back to blob
  return base64ToBlob(media.data, media.type);
}

// ==========================================
// CHAT - Offline Messages
// ==========================================
async function saveChatMessage(message) {
  const msg = {
    id: message.id || `${message.room}_${Date.now()}`,
    room: message.room,
    sender: message.sender,
    text: message.text,
    timestamp: message.timestamp || Date.now(),
    read: message.read || false,
    synced: message.synced || false
  };
  
  await dbPut(STORES.chat, msg);
}

async function getChatMessages(room, limit = 100) {
  const all = await dbGetAll(STORES.chat, 'room', room);
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

async function getUnsyncedChatMessages() {
  const all = await dbGetAll(STORES.chat);
  return all.filter(m => !m.synced);
}

// ==========================================
// NOTIFICATIONS - Offline Queue
// ==========================================
async function saveNotification(notif) {
  const notification = {
    id: notif.id || `notif_${Date.now()}`,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    read: notif.read || false,
    timestamp: notif.timestamp || Date.now(),
    data: notif.data || {}
  };
  
  await dbPut(STORES.notifications, notification);
}

async function getNotifications(limit = 50) {
  const all = await dbGetAll(STORES.notifications, 'timestamp');
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

async function getUnreadNotifications() {
  const all = await dbGetAll(STORES.notifications, 'read', false);
  return all;
}

// ==========================================
// USER DATA - Current Session
// ==========================================
async function saveUserData(key, data) {
  await dbPut(STORES.user, { key, data, timestamp: Date.now() });
}

async function getUserData(key) {
  const result = await dbGet(STORES.user, key);
  return result ? result.data : null;
}

async function clearUserData() {
  await dbClear(STORES.user);
}

// ==========================================
// SYNC QUEUE - Offline Actions
// ==========================================
async function addToSyncQueue(action) {
  const syncItem = {
    type: action.type, // 'post', 'like', 'comment', 'chat'
    data: action.data,
    timestamp: Date.now(),
    retries: 0
  };
  
  await dbPut(STORES.syncQueue, syncItem);
  console.log('[IndexedDB] Added to sync queue:', action.type);
}

async function getSyncQueue() {
  return await dbGetAll(STORES.syncQueue, 'timestamp');
}

async function removeFromSyncQueue(id) {
  await dbDelete(STORES.syncQueue, id);
}

async function clearSyncQueue() {
  await dbClear(STORES.syncQueue);
}

// ==========================================
// OFFLINE DETECTION & SYNC
// ==========================================
let isOnline = navigator.onLine;

window.addEventListener('online', () => {
  isOnline = true;
  console.log('[IndexedDB] Back online - starting sync...');
  syncOfflineData();
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('[IndexedDB] Gone offline - using cached data');
  showOfflineBanner();
});

function showOfflineBanner() {
  // Show offline mode indicator
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.className = 'offline-banner';
  banner.innerHTML = '⚠️ Offline Mode - Using Cached Data';
  document.body.appendChild(banner);
  
  setTimeout(() => banner.remove(), 5000);
}

async function syncOfflineData() {
  if (!isOnline) return;
  
  const queue = await getSyncQueue();
  if (queue.length === 0) return;
  
  console.log('[IndexedDB] Syncing', queue.length, 'items...');
  
  for (const item of queue) {
    try {
      switch (item.type) {
        case 'post':
          await syncPost(item.data);
          break;
        case 'like':
          await syncLike(item.data);
          break;
        case 'comment':
          await syncComment(item.data);
          break;
        case 'chat':
          await syncChatMessage(item.data);
          break;
      }
      await removeFromSyncQueue(item.id);
    } catch (err) {
      console.error('[IndexedDB] Sync failed for', item.type, err);
      item.retries++;
      if (item.retries > 3) {
        await removeFromSyncQueue(item.id); // Give up after 3 retries
      }
    }
  }
}

// Placeholder sync functions (implement with Supabase)
async function syncPost(data) {
  // TODO: Send to Supabase
  console.log('Syncing post:', data);
}

async function syncLike(data) {
  // TODO: Send to Supabase
  console.log('Syncing like:', data);
}

async function syncComment(data) {
  // TODO: Send to Supabase
  console.log('Syncing comment:', data);
}

async function syncChatMessage(data) {
  // TODO: Send via Socket.io
  console.log('Syncing chat:', data);
}

// ==========================================
// UTILITIES
// ==========================================
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, type) {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type });
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ==========================================
// STORAGE INFO
// ==========================================
async function getStorageInfo() {
  let totalSize = 0;
  
  // Calculate posts size
  const posts = await dbGetAll(STORES.posts);
  posts.forEach(p => totalSize += JSON.stringify(p).length);
  
  // Calculate media size
  const media = await dbGetAll(STORES.media);
  media.forEach(m => totalSize += m.size || 0);
  
  // Calculate chat size
  const chats = await dbGetAll(STORES.chat);
  chats.forEach(c => totalSize += JSON.stringify(c).length);
  
  return {
    posts: posts.length,
    media: media.length,
    chat: chats.length,
    totalSize: formatBytes(totalSize),
    rawBytes: totalSize
  };
}

// ==========================================
// INITIALIZATION
// ==========================================
async function initOfflineStorage() {
  await initIndexedDB();
  
  // Load user data if exists
  const user = await getUserData('currentUser');
  if (user) {
    console.log('[IndexedDB] Loaded cached user:', user.name);
  }
  
  // Show storage info
  const info = await getStorageInfo();
  console.log('[IndexedDB] Storage info:', info);
  
  return info;
}

// Auto-init on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', initOfflineStorage);
}

// Export for use
window.IndexedDBStorage = {
  init: initIndexedDB,
  initOfflineStorage,
  
  // Posts
  savePostOffline,
  getPostOffline,
  getAllPostsOffline,
  deletePostOffline,
  
  // Media
  saveMediaOffline,
  getMediaOffline,
  
  // Chat
  saveChatMessage,
  getChatMessages,
  getUnsyncedChatMessages,
  
  // Notifications
  saveNotification,
  getNotifications,
  getUnreadNotifications,
  
  // User
  saveUserData,
  getUserData,
  clearUserData,
  
  // Sync
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  clearSyncQueue,
  syncOfflineData,
  
  // Info
  getStorageInfo,
  formatBytes,
  
  // Status
  get isOnline() { return isOnline; }
};

console.log('[IndexedDB] Module loaded ✅');

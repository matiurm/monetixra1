/* Durable local media vault for posts and messages. */
(function () {
  'use strict';
  const DB = 'monetixra-media-vault';
  const STORE = 'media';

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('ownerId', 'ownerId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const req = action(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function save(file, metadata = {}) {
    if (!(file instanceof Blob)) throw new TypeError('A Blob or File is required');
    const id = metadata.id || 'media_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const item = {
      id, blob: file, name: metadata.name || file.name || 'media',
      type: metadata.type || file.type || 'application/octet-stream', size: file.size,
      ownerId: metadata.ownerId || null, postId: metadata.postId || null,
      messageId: metadata.messageId || null, createdAt: metadata.createdAt || Date.now()
    };
    await transaction('readwrite', store => store.put(item));
    return { ...item, blob: undefined, localUrl: 'indexeddb://media/' + id };
  }

  async function get(id) { return transaction('readonly', store => store.get(id)); }
  async function remove(id) { return transaction('readwrite', store => store.delete(id)); }
  async function getObjectUrl(id) {
    const item = await get(id);
    return item?.blob ? URL.createObjectURL(item.blob) : null;
  }
  async function usage() {
    const items = await transaction('readonly', store => store.getAll());
    return { count: items.length, bytes: items.reduce((total, item) => total + (item.size || 0), 0) };
  }
  async function clearOwner(ownerId) {
    const items = await transaction('readonly', store => store.index('ownerId').getAll(ownerId));
    await Promise.all(items.map(item => remove(item.id)));
  }

  window.MediaStorageManager = { save, get, remove, getObjectUrl, usage, clearOwner };
})();

/* Monetixra durable offline outbox.
 * Queues user actions locally and retries them after network recovery.
 */
(function () {
  'use strict';

  const DB_NAME = 'monetixra-offline-outbox';
  const STORE = 'operations';
  const MAX_ATTEMPTS = 8;
  let draining = false;

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function allOperations() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function remove(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function put(operation) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(operation);
      request.onsuccess = () => resolve(operation);
      request.onerror = () => reject(request.error);
    });
  }

  async function dispatch(operation) {
    const data = operation.data || {};
    if (operation.type === 'chat' && window.socketReady && window.socket && data.message) {
      const message = data.message;
      window.socket.emit('chat:message', {
        to: message.to, from: message.from, text: message.text || '', media: message.media,
        msgId: message.id, timestamp: message.at || Date.now()
      });
      return true;
    }
    if (operation.type === 'post' && data.post) {
      const response = await fetch('/api/posts/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post: data.post })
      });
      return response.ok;
    }
    return false;
  }

  async function drainQueue() {
    if (draining || !navigator.onLine) return;
    draining = true;
    try {
      const operations = (await allOperations()).sort((a, b) => a.createdAt - b.createdAt);
      for (const operation of operations) {
        try {
          if (await dispatch(operation)) await remove(operation.id);
          else if ((operation.attempts || 0) >= MAX_ATTEMPTS) await remove(operation.id);
          else await put({ ...operation, attempts: (operation.attempts || 0) + 1, lastAttemptAt: Date.now() });
        } catch (_) {
          await put({ ...operation, attempts: (operation.attempts || 0) + 1, lastAttemptAt: Date.now() });
        }
      }
    } finally { draining = false; }
  }

  window.addToSyncQueue = async function (entry) {
    const operation = { id: 'outbox_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), createdAt: Date.now(), attempts: 0, ...entry };
    await put(operation);
    drainQueue();
    return operation.id;
  };
  window.MonetixraOfflineSync = { drainQueue, pending: allOperations };
  window.addEventListener('online', drainQueue);
  window.addEventListener('load', () => setTimeout(drainQueue, 1000));
})();

/* Permanent, additive client backup. It never clears application data. */
(function () {
  'use strict';
  const KEY = 'mxt_permanent_snapshot_v1';
  const SESSION = 'mxt_permanent_session_v1';
  const DB = 'monetixra-permanent-backups';
  const STORE = 'snapshots';
  const protectedKeys = ['users', 'posts', 'txs', 'notifs', 'chats', 'stories', 'groups', 'marketplace', 'nfts', 'apps', 'withdrawals'];
  let saving = false;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function openDb() {
    return new Promise(resolve => {
      if (!window.indexedDB) return resolve(null);
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }
  async function dbPut(value) {
    const db = await openDb(); if (!db) return;
    await new Promise(resolve => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(value, 'latest'); tx.oncomplete = tx.onerror = () => resolve(); });
  }
  async function dbGet() {
    const db = await openDb(); if (!db) return null;
    return new Promise(resolve => { const tx = db.transaction(STORE, 'readonly'); const req = tx.objectStore(STORE).get('latest'); req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null); });
  }
  function snapshot() {
    if (!window.D || typeof window.D !== 'object') return null;
    const data = clone(window.D);
    return { version: 1, savedAt: Date.now(), session: data.cur || window.CU?.id || '', data };
  }
  async function save(reason) {
    if (saving) return;
    const value = snapshot(); if (!value) return;
    saving = true;
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
      localStorage.setItem(SESSION, value.session || '');
      await dbPut(value);
      // Existing server persistence is used as an additional copy when available.
      if (value.session && navigator.onLine) {
        fetch('/api/users/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: value.data.users?.[value.session] || window.CU }) }).catch(() => {});
        fetch('/api/sync/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ syncData: { users: value.data.users || {}, posts: Object.fromEntries((value.data.posts || []).filter(p => p?.id).map(p => [p.id, p])), points: value.session ? { [value.session]: { points: Number(value.data.users?.[value.session]?.points || 0), updatedAt: Date.now() } } : {} } }) }).catch(() => {});
      }
    } catch (e) { console.warn('[PermanentData] backup failed', e); }
    finally { saving = false; }
  }
  function merge(current, backup) {
    const output = current || {};
    protectedKeys.forEach(key => {
      if (backup?.[key] == null) return;
      if (key === 'users' || key === 'chats' || key === 'groups') output[key] = { ...(backup[key] || {}), ...(output[key] || {}) };
      else if (Array.isArray(backup[key])) {
        const existing = Array.isArray(output[key]) ? output[key] : [];
        const map = new Map();
        backup[key].concat(existing).forEach(item => { if (item) map.set(item.id || item.at || JSON.stringify(item), item); });
        output[key] = [...map.values()];
      }
    });
    const uid = output.cur || backup?.cur || localStorage.getItem(SESSION);
    if (uid && output.users?.[uid]) { output.cur = uid; window.CU = output.users[uid]; }
    return output;
  }
  async function restoreIfNeeded() {
    if (!window.D || Object.keys(window.D.users || {}).length) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!saved) saved = await dbGet();
    if (saved?.data) { window.D = merge(window.D, saved.data); if (typeof window.saveData === 'function') window.saveData(); }
  }
  window.MonetixraPermanentData = { save, restore: restoreIfNeeded, snapshot };
  document.addEventListener('DOMContentLoaded', () => {
    restoreIfNeeded().finally(() => save('startup'));
    window.addEventListener('pagehide', () => save('pagehide'));
    window.addEventListener('online', () => save('online'));
    setInterval(() => save('interval'), 120000);
    const oldReset = window.resetToDefaults;
    if (typeof oldReset === 'function') window.resetToDefaults = function () { save('before-settings-reset'); return oldReset.apply(this, arguments); };
  }, { once: true });
})();

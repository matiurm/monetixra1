// ============================================================
//  Monetixra - Account Management System
//  Handles: Clear Notifications, Deactivate, Delete, Sign Out
// ============================================================

const MonetixraAccountManagement = {
  resolveCurrentUser: function() {
    try {
      if (CU && CU.id) {
        if (typeof D !== 'undefined' && D && D.users && D.users[CU.id]) {
          return D.users[CU.id];
        }
        return CU;
      }

      const uid = (typeof D !== 'undefined' && D && D.cur) || localStorage.getItem(STORAGE_KEY + 'session') || '';
      if (uid && typeof D !== 'undefined' && D && D.users && D.users[uid]) {
        CU = D.users[uid];
        return CU;
      }

      return null;
    } catch (error) {
      console.warn('[AccountManagement] resolveCurrentUser failed:', error);
      return CU || null;
    }
  },

  clearSessionState: function() {
    try {
      if (typeof D !== 'undefined' && D) {
        D.cur = null;
      }
      CU = null;

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY + 'session', '');
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('mxt_session_id');
      }

      if (typeof PersistenceManager !== 'undefined' && PersistenceManager) {
        if (typeof PersistenceManager.clearSession === 'function') {
          PersistenceManager.clearSession().catch(err => {
            console.warn('[PersistenceManager] Session clear failed:', err);
          });
        }
      }
    } catch (error) {
      console.warn('[AccountManagement] clearSessionState failed:', error);
    }
  },

  // Clear all notifications for current user
  clearAllNotifications: function() {
    const currentUser = this.resolveCurrentUser();
    if (!currentUser) {
      if (typeof toast === 'function') {
        toast('e', 'Please sign in first');
      }
      return false;
    }

    try {
      const uid = currentUser.id;
      const before = (typeof D !== 'undefined' && D.notifs) ? D.notifs.filter(n => n && String(n.to) === String(uid)).length : 0;

      if (typeof D !== 'undefined' && D.notifs) {
        D.notifs = D.notifs.filter(n => !(n && String(n.to) === String(uid)));
      }

      if (typeof saveData === 'function') {
        saveData();
      }
      if (typeof persistAuthState === 'function') {
        persistAuthState();
      }
      if (typeof syncUI === 'function') {
        syncUI();
      }
      if (typeof rNotif === 'function') {
        rNotif();
      }

      if (typeof toast === 'function') {
        toast('s', before > 0 ? `🔕 Cleared ${before} notifications` : 'No notifications to clear');
      }

      return true;
    } catch (error) {
      console.error('[AccountManagement] Clear notifications error:', error);
      if (typeof toast === 'function') {
        toast('e', 'Failed to clear notifications');
      }
      return false;
    }
  },

  // Deactivate account (temporary)
  deactivateAccount: function() {
    const currentUser = this.resolveCurrentUser();
    if (!currentUser) {
      if (typeof toast === 'function') {
        toast('e', 'Please sign in first');
      }
      return false;
    }

    if (!confirm('Deactivate your account? You can reactivate by logging in again.')) {
      return false;
    }

    try {
      const uid = currentUser.id;
      const user = (typeof D !== 'undefined' && D.users && D.users[uid]) ? D.users[uid] : currentUser;
      if (user) {
        user.deactivated = true;
        user.disabled = false;
      }

      this.clearSessionState();

      if (typeof saveData === 'function') {
        saveData();
      }
      if (typeof persistAuthState === 'function') {
        persistAuthState();
      }

      if (typeof isSupabaseReady === 'function' && isSupabaseReady()) {
        if (typeof supabaseSignOut === 'function') {
          supabaseSignOut().catch(err => {
            console.warn('[Supabase signout]', err.message || err);
          });
        }
      }

      if (typeof toast === 'function') {
        toast('i', 'Account deactivated');
      }

      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      }, 700);

      return true;
    } catch (error) {
      console.error('[AccountManagement] Deactivate error:', error);
      if (typeof toast === 'function') {
        toast('e', 'Failed to deactivate account');
      }
      return false;
    }
  },

  // Sign out (logout)
  signOut: function(skipConfirm = false) {
    if (!skipConfirm && !confirm('Sign out of Monetixra?')) {
      return false;
    }

    try {
      this.clearSessionState();

      if (typeof saveData === 'function') {
        saveData();
      }
      if (typeof persistAuthState === 'function') {
        persistAuthState();
      }

      if (typeof isSupabaseReady === 'function' && isSupabaseReady()) {
        if (typeof supabaseSignOut === 'function') {
          supabaseSignOut().catch(err => {
            console.warn('[Supabase signout]', err.message || err);
          });
        }
      }

      if (typeof toast === 'function') {
        toast('s', 'Signed out successfully');
      }

      try {
        if (typeof document !== 'undefined') {
          const authWrap = document.getElementById('authWrap');
          const appWrap = document.getElementById('appWrap');
          const fab = document.getElementById('fab');
          if (authWrap) authWrap.style.display = 'flex';
          if (appWrap) appWrap.style.display = 'none';
          if (fab) fab.style.display = 'none';
          if (typeof authTab === 'function') {
            authTab('login');
          }
        }
      } catch (e) {
        console.warn('[AccountManagement] UI reset failed:', e);
      }

      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      }, 600);

      return true;
    } catch (error) {
      console.error('[AccountManagement] Sign out error:', error);
      if (typeof toast === 'function') {
        toast('e', 'Failed to sign out');
      }
      return false;
    }
  },

  // Delete account permanently
  deleteAccount: function() {
    const currentUser = this.resolveCurrentUser();
    if (!currentUser) {
      if (typeof toast === 'function') {
        toast('e', 'Please sign in first');
      }
      return false;
    }

    if (!confirm('Permanently delete your account? This cannot be undone.')) {
      return false;
    }

    const confirmText = prompt('Type DELETE to permanently delete your account:');
    if (confirmText !== 'DELETE') {
      if (typeof toast === 'function') {
        toast('e', 'Cancelled — type DELETE to confirm');
      }
      return false;
    }

    try {
      const uid = currentUser.id;

      if (typeof D !== 'undefined') {
        if (D.users) {
          delete D.users[uid];
        }
        if (D.posts) {
          D.posts = D.posts.filter(p => p.author !== uid);
        }
        if (D.notifs) {
          D.notifs = D.notifs.filter(n => !(n && String(n.to) === String(uid)));
        }
        if (D.txs) {
          D.txs = D.txs.filter(t => String(t.user) !== String(uid));
        }

        if (D.users) {
          Object.values(D.users).forEach(u => {
            if (u.followers) {
              u.followers = u.followers.filter(f => f !== uid);
            }
            if (u.following) {
              u.following = u.following.filter(f => f !== uid);
            }
            if (u.autoFriends) {
              u.autoFriends = u.autoFriends.filter(f => f !== uid);
            }
          });
        }

        D.cur = null;
      }

      CU = null;
      this.clearSessionState();

      if (typeof persistAuthState === 'function') {
        persistAuthState();
      }
      if (typeof saveData === 'function') {
        saveData();
      }

      if (typeof isSupabaseReady === 'function' && isSupabaseReady()) {
        if (typeof supabaseSignOut === 'function') {
          supabaseSignOut().catch(err => {
            console.warn('[Supabase signout]', err.message || err);
          });
        }
      }

      if (typeof PersistenceManager !== 'undefined' && PersistenceManager && typeof PersistenceManager.clearUserData === 'function') {
        PersistenceManager.clearUserData(uid).catch(err => {
          console.warn('[PersistenceManager] User data clear failed:', err);
        });
      }

      if (typeof toast === 'function') {
        toast('s', 'Account deleted permanently');
      }

      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      }, 700);

      return true;
    } catch (error) {
      console.error('[AccountManagement] Delete account error:', error);
      if (typeof toast === 'function') {
        toast('e', 'Failed to delete account');
      }
      return false;
    }
  }
};

// Export to global scope
window.MonetixraAccountManagement = MonetixraAccountManagement;

// Also create direct function references for backward compatibility
window.clearAllNotifs = function() {
  return MonetixraAccountManagement.clearAllNotifications();
};

window.deactivateAccount = function() {
  return MonetixraAccountManagement.deactivateAccount();
};

window.logout = function(skipConfirm = false) {
  return MonetixraAccountManagement.signOut(skipConfirm);
};

window.deleteAccount = function() {
  return MonetixraAccountManagement.deleteAccount();
};

console.log('[AccountManagement] System loaded ✅');

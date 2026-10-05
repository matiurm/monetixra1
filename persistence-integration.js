/**
 * ================================================================
 *  Monetixra — Persistence Integration System
 *  Ensures data survives refresh/logout/login like Facebook/YouTube
 *  Auto-saves: Posts, Media, Points, User Profile, Sessions
 * ================================================================
 */

// Initialize persistence system on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[PersistenceIntegration] Initializing...');

  try {
    // Initialize enhanced persistence
    if (window.enhancedPersistence) {
      await window.enhancedPersistence.init();
      console.log('[PersistenceIntegration] Enhanced persistence initialized');
    }

    // Check for existing session and restore data
    const savedUserId = localStorage.getItem('monetixra_user_id');
    if (savedUserId) {
      console.log('[PersistenceIntegration] Found saved user ID:', savedUserId);
      await restoreUserData(savedUserId);
    }

    // Set up auto-save on user login
    setupPersistenceHooks();

    console.log('[PersistenceIntegration] System ready');
  } catch (error) {
    console.error('[PersistenceIntegration] Initialization failed:', error);
  }
});

// Restore user data on page load
async function restoreUserData(userId) {
  try {
    if (!window.enhancedPersistence) return;

    console.log('[PersistenceIntegration] Restoring data for user:', userId);

    const restoredData = await window.enhancedPersistence.restore(userId);

    if (restoredData.posts && restoredData.posts.length > 0) {
      console.log('[PersistenceIntegration] Restored', restoredData.posts.length, 'posts');
    }

    if (restoredData.points > 0) {
      console.log('[PersistenceIntegration] Restored points:', restoredData.points);
    }

    if (restoredData.profile) {
      console.log('[PersistenceIntegration] Restored user profile');
    }

    if (restoredData.session) {
      console.log('[PersistenceIntegration] Restored session data');
    }

    // Start auto-save for this user
    window.enhancedPersistence.startAutoSave(userId);

    return restoredData;
  } catch (error) {
    console.error('[PersistenceIntegration] Restore failed:', error);
    return null;
  }
}

// Set up persistence hooks for login/logout
function setupPersistenceHooks() {
  // Hook into login process
  const originalDoLogin = window.doLogin;
  if (originalDoLogin) {
    window.doLogin = async function(...args) {
      const result = await originalDoLogin.apply(this, args);

      if (result && result.userId) {
        console.log('[PersistenceIntegration] User logged in, starting persistence');
        localStorage.setItem('monetixra_user_id', result.userId);

        // Restore user data
        await window.enhancedPersistence.loginWithRestoration(result.userId);
      }

      return result;
    };
  }

  // Hook into logout process
  const originalDoLogout = window.doLogout;
  if (originalDoLogout) {
    window.doLogout = async function(...args) {
      const userId = localStorage.getItem('monetixra_user_id');

      if (userId) {
        console.log('[PersistenceIntegration] User logging out, preserving data');
        await window.enhancedPersistence.logoutWithPreservation(userId);
      }

      const result = await originalDoLogout.apply(this, args);

      // Don't remove user ID from localStorage to allow restoration on re-login
      // localStorage.removeItem('monetixra_user_id');

      return result;
    };
  }

  // Hook into post creation
  const originalCreatePost = window.createPost;
  if (originalCreatePost) {
    window.createPost = async function(...args) {
      const result = await originalCreatePost.apply(this, args);

      if (result && typeof CU !== 'undefined' && CU.id) {
        // Auto-save after post creation
        await window.enhancedPersistence.savePost(result);
        console.log('[PersistenceIntegration] Post auto-saved');
      }

      return result;
    };
  }

  // Hook into media upload
  const originalUploadMedia = window.uploadMedia;
  if (originalUploadMedia) {
    window.uploadMedia = async function(...args) {
      const result = await originalUploadMedia.apply(this, args);

      if (result && typeof CU !== 'undefined' && CU.id) {
        // Auto-save after media upload
        await window.enhancedPersistence.saveMedia(result.id, result.data, {
          type: result.type,
          authorId: CU.id,
          postId: result.postId
        });
        console.log('[PersistenceIntegration] Media auto-saved');
      }

      return result;
    };
  }

  // Set up beforeunload handler for final save
  window.addEventListener('beforeunload', async (event) => {
    const userId = localStorage.getItem('monetixra_user_id');
    if (userId && window.enhancedPersistence) {
      // Final save before page unload
      await window.enhancedPersistence.autoSaveUserData(userId);
      console.log('[PersistenceIntegration] Final save before unload');
    }
  });

  // Set up visibility change handler for tab switching
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      const userId = localStorage.getItem('monetixra_user_id');
      if (userId && window.enhancedPersistence) {
        await window.enhancedPersistence.autoSaveUserData(userId);
        console.log('[PersistenceIntegration] Auto-save on tab hide');
      }
    }
  });

  console.log('[PersistenceIntegration] Hooks set up successfully');
}

// Manual save function for user-triggered saves
async function manualSave() {
  const userId = localStorage.getItem('monetixra_user_id');
  if (userId && window.enhancedPersistence) {
    try {
      await window.enhancedPersistence.autoSaveUserData(userId);
      alert('✅ Data saved successfully!');
      return true;
    } catch (error) {
      console.error('[PersistenceIntegration] Manual save failed:', error);
      alert('❌ Save failed: ' + error.message);
      return false;
    }
  } else {
    alert('⚠️ No user logged in or persistence system not available');
    return false;
  }
}

// Manual restore function for user-triggered restores
async function manualRestore() {
  const userId = localStorage.getItem('monetixra_user_id');
  if (userId && window.enhancedPersistence) {
    try {
      const restoredData = await window.enhancedPersistence.restore(userId);
      alert(`✅ Data restored successfully!\n\nPosts: ${restoredData.posts.length}\nPoints: ${restoredData.points}`);
      return restoredData;
    } catch (error) {
      console.error('[PersistenceIntegration] Manual restore failed:', error);
      alert('❌ Restore failed: ' + error.message);
      return null;
    }
  } else {
    alert('⚠️ No user logged in or persistence system not available');
    return null;
  }
}

// Show persistence status
function showPersistenceStatus() {
  if (window.enhancedPersistence) {
    window.enhancedPersistence.showPersistenceStatus();
  } else {
    alert('⚠️ Persistence system not available');
  }
}

// Clear all persisted data (dangerous!)
async function clearAllData() {
  const userId = localStorage.getItem('monetixra_user_id');
  if (userId && window.enhancedPersistence) {
    const confirmed = confirm('⚠️ DANGER: This will delete ALL your saved data including posts, media, and points. This action cannot be undone!\n\nAre you sure you want to continue?');

    if (confirmed) {
      try {
        await window.enhancedPersistence.clearUserData(userId);
        localStorage.removeItem('monetixra_user_id');
        alert('✅ All data cleared successfully');
        return true;
      } catch (error) {
        console.error('[PersistenceIntegration] Clear data failed:', error);
        alert('❌ Clear failed: ' + error.message);
        return false;
      }
    }
  } else {
    alert('⚠️ No user logged in or persistence system not available');
    return false;
  }
}

// Make functions globally available
window.persistenceIntegration = {
  manualSave,
  manualRestore,
  showPersistenceStatus,
  clearAllData,
  restoreUserData
};

console.log('[PersistenceIntegration] Integration system loaded');

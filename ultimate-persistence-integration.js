/**
 * ================================================================
 *  ULTIMATE PERSISTENCE INTEGRATION
 *  Integrates UltimatePermanentPersistence with existing Monetixra code
 *  
 *  This file:
 *  - Hooks into login/logout events
 *  - Automatically restores data on login
 *  - Automatically saves data on logout
 *  - Ensures data survives website updates, upgrades, and resets
 * ================================================================
 */

(function() {
  'use strict';

  console.log('[UltimateIntegration] Initializing...');

  // Wait for persistence system to be ready
  function waitForPersistence() {
    return new Promise((resolve) => {
      if (window.UltimatePermanentPersistence) {
        resolve(window.UltimatePermanentPersistence);
      } else {
        const checkInterval = setInterval(() => {
          if (window.UltimatePermanentPersistence) {
            clearInterval(checkInterval);
            resolve(window.UltimatePermanentPersistence);
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          console.warn('[UltimateIntegration] Persistence system not found after timeout');
          resolve(null);
        }, 5000);
      }
    });
  }

  // Get current user ID from various sources
  function getCurrentUserId() {
    // Try CU object first
    if (typeof CU !== 'undefined' && CU.id) {
      return CU.id;
    }
    
    // Try localStorage
    const lsUserId = localStorage.getItem('mxt_current_user_id');
    if (lsUserId) {
      return lsUserId;
    }
    
    // Try session storage
    const ssUserId = sessionStorage.getItem('mxt_current_user_id');
    if (ssUserId) {
      return ssUserId;
    }
    
    return null;
  }

  // Save current user ID
  function saveCurrentUserId(userId) {
    if (userId) {
      localStorage.setItem('mxt_current_user_id', userId);
      sessionStorage.setItem('mxt_current_user_id', userId);
    }
  }

  // Restore user data on page load
  async function restoreOnLoad() {
    const persistence = await waitForPersistence();
    if (!persistence) {
      console.warn('[UltimateIntegration] Cannot restore - persistence not available');
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      console.log('[UltimateIntegration] No user ID found, skipping restore');
      return;
    }

    console.log('[UltimateIntegration] Restoring data for user:', userId);

    try {
      // Restore all user data
      const restoredData = await persistence.restoreUserData(userId);
      
      if (restoredData) {
        // Restore points to D object if it exists
        if (typeof D !== 'undefined') {
          D.points = restoredData.points || 0;
          console.log('[UltimateIntegration] Points restored:', D.points);
          
          // Update UI if points display exists
          updatePointsDisplay(D.points);
        }

        // Restore posts to D object if it exists
        if (typeof D !== 'undefined' && restoredData.posts) {
          if (!D.posts) D.posts = [];
          
          // Merge posts without duplicates
          const existingIds = new Set(D.posts.map(p => p.id));
          restoredData.posts.forEach(post => {
            if (!existingIds.has(post.id)) {
              D.posts.push(post);
            }
          });
          
          console.log('[UltimateIntegration] Posts restored:', D.posts.length);
        }

        // Restore session data to CU object if it exists
        if (typeof CU !== 'undefined' && restoredData.session) {
          Object.assign(CU, restoredData.session);
          console.log('[UltimateIntegration] Session restored');
        }

        // Restore preferences
        if (restoredData.preferences) {
          applyPreferences(restoredData.preferences);
        }

        // Start auto-save
        persistence.startAutoSave(userId);
        
        console.log('[UltimateIntegration] Data restore complete ✓');
      }
    } catch (error) {
      console.error('[UltimateIntegration] Restore error:', error);
    }
  }

  // Handle login event
  async function handleLogin(userId, userData) {
    console.log('[UltimateIntegration] Handling login for user:', userId);
    
    const persistence = await waitForPersistence();
    if (!persistence) {
      console.warn('[UltimateIntegration] Cannot handle login - persistence not available');
      return;
    }

    // Save user ID
    saveCurrentUserId(userId);

    // Save session data
    if (userData) {
      await persistence.saveSession(userId, userData);
    }

    // Restore all user data
    const restoredData = await persistence.restoreUserData(userId);
    
    if (restoredData) {
      // Apply restored data to global objects
      if (typeof D !== 'undefined') {
        D.points = restoredData.points || 0;
        if (!D.posts) D.posts = [];
        
        const existingIds = new Set(D.posts.map(p => p.id));
        restoredData.posts.forEach(post => {
          if (!existingIds.has(post.id)) {
            D.posts.push(post);
          }
        });
        
        updatePointsDisplay(D.points);
      }

      if (typeof CU !== 'undefined' && restoredData.session) {
        Object.assign(CU, restoredData.session);
      }

      if (restoredData.preferences) {
        applyPreferences(restoredData.preferences);
      }
    }

    // Start auto-save
    persistence.startAutoSave(userId);
    
    console.log('[UltimateIntegration] Login handling complete ✓');
  }

  // Handle logout event
  async function handleLogout() {
    console.log('[UltimateIntegration] Handling logout');
    
    const persistence = await waitForPersistence();
    if (!persistence) {
      console.warn('[UltimateIntegration] Cannot handle logout - persistence not available');
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      console.log('[UltimateIntegration] No user ID found, skipping logout save');
      return;
    }

    // Save all data before logout
    await persistence.autoSave(userId);
    
    // Stop auto-save
    persistence.stopAutoSave();
    
    // Clear current user ID from session storage (keep in localStorage for restore)
    sessionStorage.removeItem('mxt_current_user_id');
    
    console.log('[UltimateIntegration] Logout handling complete ✓');
  }

  // Update points display in UI
  function updatePointsDisplay(points) {
    // Try to find and update points display elements
    const pointsElements = document.querySelectorAll('[data-points-display], .points-display, #points, .points');
    
    pointsElements.forEach(el => {
      el.textContent = points;
      el.dataset.points = points;
    });
    
    // Dispatch custom event for other scripts to listen
    window.dispatchEvent(new CustomEvent('points:updated', { detail: { points } }));
  }

  // Apply user preferences
  function applyPreferences(preferences) {
    if (preferences.theme) {
      document.documentElement.setAttribute('data-theme', preferences.theme);
    }
    
    if (preferences.language) {
      document.documentElement.setAttribute('lang', preferences.language);
    }
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('preferences:applied', { detail: preferences }));
  }

  // Hook into existing login function
  function hookIntoLogin() {
    // If doLogin function exists, wrap it
    if (typeof doLogin === 'function') {
      const originalDoLogin = window.doLogin;
      
      window.doLogin = async function(...args) {
        const result = await originalDoLogin.apply(this, args);
        
        // After successful login, restore data
        if (result && typeof CU !== 'undefined' && CU.id) {
          await handleLogin(CU.id, CU);
        }
        
        return result;
      };
      
      console.log('[UltimateIntegration] Hooked into doLogin function');
    }

    // Listen for custom login events
    window.addEventListener('user:login', async (e) => {
      const { userId, userData } = e.detail;
      await handleLogin(userId, userData);
    });

    // Listen for custom logout events
    window.addEventListener('user:logout', async () => {
      await handleLogout();
    });
  }

  // Hook into points updates
  function hookIntoPointsUpdates() {
    // Listen for points changes
    window.addEventListener('points:changed', async (e) => {
      const persistence = await waitForPersistence();
      if (!persistence) return;
      
      const userId = getCurrentUserId();
      if (userId && typeof D !== 'undefined' && D.points !== undefined) {
        await persistence.savePoints(userId, D.points);
      }
    });

    // Hook into D.points setter if possible
    if (typeof D !== 'undefined') {
      let currentPoints = D.points || 0;
      
      Object.defineProperty(D, 'points', {
        get: () => currentPoints,
        set: async (value) => {
          currentPoints = value;
          
          const persistence = await waitForPersistence();
          if (persistence) {
            const userId = getCurrentUserId();
            if (userId) {
              await persistence.savePoints(userId, value);
            }
          }
          
          updatePointsDisplay(value);
        },
        configurable: true
      });
      
      console.log('[UltimateIntegration] Hooked into D.points');
    }
  }

  // Hook into post creation
  function hookIntoPostCreation() {
    window.addEventListener('post:created', async (e) => {
      const persistence = await waitForPersistence();
      if (!persistence) return;
      
      const userId = getCurrentUserId();
      if (userId && e.detail.post) {
        await persistence.savePost(e.detail.post);
      }
    });
  }

  // Hook into media uploads
  function hookIntoMediaUploads() {
    window.addEventListener('media:uploaded', async (e) => {
      const persistence = await waitForPersistence();
      if (!persistence) return;
      
      const { mediaData } = e.detail;
      if (mediaData) {
        await persistence.saveMedia(mediaData);
      }
    });
  }

  // Detect website update/version change
  function detectUpdate() {
    const currentVersion = '3.0.0-ultimate';
    const lastVersion = localStorage.getItem('mxt_last_version');
    
    if (lastVersion && lastVersion !== currentVersion) {
      console.log('[UltimateIntegration] Website update detected:', lastVersion, '→', currentVersion);
      
      // Restore data after update
      restoreOnLoad();
    }
    
    localStorage.setItem('mxt_last_version', currentVersion);
  }

  // Initialize integration
  async function init() {
    console.log('[UltimateIntegration] Starting integration...');
    
    // Detect if this is an update
    detectUpdate();
    
    // Restore data on page load
    await restoreOnLoad();
    
    // Hook into existing functions
    hookIntoLogin();
    hookIntoPointsUpdates();
    hookIntoPostCreation();
    hookIntoMediaUploads();
    
    // Listen for page visibility changes (for background sync)
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        const persistence = await waitForPersistence();
        if (persistence) {
          const userId = getCurrentUserId();
          if (userId) {
            await persistence.autoSave(userId);
          }
        }
      }
    });
    
    // Listen for beforeunload (save before closing)
    window.addEventListener('beforeunload', async () => {
      const persistence = await waitForPersistence();
      if (persistence) {
        const userId = getCurrentUserId();
        if (userId) {
          await persistence.autoSave(userId);
        }
      }
    });
    
    console.log('[UltimateIntegration] Integration complete ✓');
  }

  // Start integration when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export integration functions for manual use
  window.UltimatePersistenceIntegration = {
    handleLogin,
    handleLogout,
    restoreOnLoad,
    getCurrentUserId,
    saveCurrentUserId
  };

})();

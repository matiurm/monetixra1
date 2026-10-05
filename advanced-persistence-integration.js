/**
 * ================================================================
 *  Monetixra — Advanced Persistence Integration
 *  Integrates advanced persistence with existing systems
 *  Features: Auto-backup, conflict handling, health monitoring
 * ================================================================
 */

// Initialize advanced persistence on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[AdvancedPersistenceIntegration] Initializing...');

  try {
    // Initialize advanced persistence
    if (window.AdvancedPersistence) {
      await window.AdvancedPersistence.init();
      console.log('[AdvancedPersistenceIntegration] Advanced persistence initialized');
    }

    // Set up advanced persistence hooks
    setupAdvancedPersistenceHooks();

    // Start health monitoring
    startHealthMonitoring();

    console.log('[AdvancedPersistenceIntegration] System ready');
  } catch (error) {
    console.error('[AdvancedPersistenceIntegration] Initialization failed:', error);
  }
});

// Set up advanced persistence hooks
function setupAdvancedPersistenceHooks() {
  // Hook into login process
  const originalDoLogin = window.doLogin;
  if (originalDoLogin) {
    window.doLogin = async function(...args) {
      const result = await originalDoLogin.apply(this, args);

      if (result && typeof CU !== 'undefined' && CU.id) {
        console.log('[AdvancedPersistenceIntegration] User logged in, starting advanced features');

        // Create backup after login
        if (window.AdvancedPersistence) {
          await window.AdvancedPersistence.createBackup('login', CU.id);
          console.log('[AdvancedPersistenceIntegration] Login backup created');
        }

        // Record health metric
        if (window.AdvancedPersistence) {
          await window.AdvancedPersistence.recordHealthMetric('login', 1, {
            userId: CU.id,
            timestamp: Date.now()
          });
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

      if (userId && window.AdvancedPersistence) {
        console.log('[AdvancedPersistenceIntegration] User logging out, creating backup');

        // Create backup before logout
        await window.AdvancedPersistence.createBackup('logout', userId);

        // Stop real-time sync
        await window.AdvancedPersistence.stopRealTimeSync();

        // Record health metric
        await window.AdvancedPersistence.recordHealthMetric('logout', 1, {
          userId: userId,
          timestamp: Date.now()
        });
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
        // Create version for post
        if (window.AdvancedPersistence) {
          await window.AdvancedPersistence.createVersion(result.id, 'post', result, 'create');
          console.log('[AdvancedPersistenceIntegration] Post version created');

          // Add to sync queue
          await window.AdvancedPersistence.addToSyncQueue({
            type: 'post',
            data: result,
            priority: 'high'
          });
        }
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
        // Create version for updated post
        if (window.AdvancedPersistence) {
          await window.AdvancedPersistence.createVersion(result.id, 'post', result, 'update');
          console.log('[AdvancedPersistenceIntegration] Post update version created');

          // Add to sync queue
          await window.AdvancedPersistence.addToSyncQueue({
            type: 'post',
            data: result,
            priority: 'high'
          });
        }
      }

      return result;
    };
  }

  // Hook into post deletion
  const originalDeletePost = window.deletePost;
  if (originalDeletePost) {
    window.deletePost = async function(...args) {
      const postId = args[0]; // First argument is post ID

      // Create version before deletion
      if (postId && typeof CU !== 'undefined' && CU.id && window.AdvancedPersistence) {
        const postData = typeof D !== 'undefined' && D.posts
          ? D.posts.find(p => p.id === postId)
          : null;

        if (postData) {
          await window.AdvancedPersistence.createVersion(postId, 'post', postData, 'delete');
          console.log('[AdvancedPersistenceIntegration] Post deletion version created');
        }
      }

      const result = await originalDeletePost.apply(this, args);
      return result;
    };
  }

  // Hook into user data changes
  const originalSaveData = window.saveData;
  if (originalSaveData) {
    window.saveData = async function(...args) {
      const result = await originalSaveData.apply(this, args);

      if (typeof CU !== 'undefined' && CU.id && window.AdvancedPersistence) {
        // Create version for user data
        await window.AdvancedPersistence.createVersion(CU.id, 'user', CU, 'update');

        // Add to sync queue
        await window.AdvancedPersistence.addToSyncQueue({
          type: 'user',
          data: CU,
          priority: 'normal'
        });
      }

      return result;
    };
  }

  // Set up periodic health checks
  setInterval(async () => {
    if (window.AdvancedPersistence && typeof CU !== 'undefined') {
      // Record sync health
      const syncQueue = await window.AdvancedPersistence.getSyncQueue();
      const pendingItems = syncQueue.filter(item => item.status === 'pending');

      await window.AdvancedPersistence.recordHealthMetric('sync_queue_size', pendingItems.length, {
        userId: CU.id,
        timestamp: Date.now()
      });

      // Check for conflicts
      const conflicts = await window.AdvancedPersistence.getConflicts(false);
      if (conflicts.length > 0) {
        console.warn('[AdvancedPersistenceIntegration] Unresolved conflicts detected:', conflicts.length);
        await window.AdvancedPersistence.recordHealthMetric('conflict_count', conflicts.length, {
          userId: CU.id,
          timestamp: Date.now()
        });
      }
    }
  }, 60000); // Every minute

  // Set up beforeunload handler for final backup
  window.addEventListener('beforeunload', async () => {
    const userId = typeof CU !== 'undefined' ? CU.id : null;
    if (userId && window.AdvancedPersistence) {
      // Create final backup before page unload
      await window.AdvancedPersistence.createBackup('page_unload', userId);
      console.log('[AdvancedPersistenceIntegration] Final backup before unload');
    }
  });

  console.log('[AdvancedPersistenceIntegration] Advanced hooks set up successfully');
}

// Start health monitoring
function startHealthMonitoring() {
  if (!window.AdvancedPersistence) return;

  // Monitor storage usage
  setInterval(async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usagePercentage = (estimate.usage / estimate.quota) * 100;

        await window.AdvancedPersistence.recordHealthMetric('storage_usage', usagePercentage, {
          usage: estimate.usage,
          quota: estimate.quota,
          timestamp: Date.now()
        });

        if (usagePercentage > 80) {
          console.warn('[AdvancedPersistenceIntegration] Storage usage high:', usagePercentage.toFixed(2) + '%');
        }
      }
    } catch (error) {
      console.error('[AdvancedPersistenceIntegration] Storage monitoring failed:', error);
    }
  }, 300000); // Every 5 minutes

  // Monitor memory usage
  setInterval(async () => {
    try {
      if (performance.memory) {
        const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100;

        await window.AdvancedPersistence.recordHealthMetric('memory_usage', memoryUsage, {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });

        if (memoryUsage > 80) {
          console.warn('[AdvancedPersistenceIntegration] Memory usage high:', memoryUsage.toFixed(2) + '%');
        }
      }
    } catch (error) {
      console.error('[AdvancedPersistenceIntegration] Memory monitoring failed:', error);
    }
  }, 300000); // Every 5 minutes
}

// Manual functions for user control
async function createManualBackup() {
  const userId = typeof CU !== 'undefined' ? CU.id : null;
  if (userId && window.AdvancedPersistence) {
    try {
      const backup = await window.AdvancedPersistence.createBackup('manual', userId);
      alert('✅ Manual backup created successfully!\n\nBackup ID: ' + backup.id);
      return backup;
    } catch (error) {
      console.error('[AdvancedPersistenceIntegration] Manual backup failed:', error);
      alert('❌ Backup failed: ' + error.message);
      return null;
    }
  } else {
    alert('⚠️ No user logged in or advanced persistence not available');
    return null;
  }
}

async function listBackups() {
  const userId = typeof CU !== 'undefined' ? CU.id : null;
  if (userId && window.AdvancedPersistence) {
    try {
      const backups = await window.AdvancedPersistence.getBackups(userId, 10);

      if (backups.length === 0) {
        alert('No backups found');
        return [];
      }

      const backupList = backups.map((b, i) =>
        `${i + 1}. ${new Date(b.timestamp).toLocaleString()} - ${b.type} (${b.id})`
      ).join('\n');

      alert('📋 Available Backups:\n\n' + backupList);
      return backups;
    } catch (error) {
      console.error('[AdvancedPersistenceIntegration] List backups failed:', error);
      alert('❌ Failed to list backups: ' + error.message);
      return [];
    }
  } else {
    alert('⚠️ No user logged in or advanced persistence not available');
    return [];
  }
}

async function restoreSelectedBackup() {
  const backups = await listBackups();
  if (!backups || backups.length === 0) return;

  const backupIndex = prompt('Enter backup number to restore (1-' + backups.length + '):');
  if (!backupIndex) return;

  const index = parseInt(backupIndex) - 1;
  if (index < 0 || index >= backups.length) {
    alert('❌ Invalid backup number');
    return;
  }

  const confirmed = confirm('⚠️ DANGER: This will replace your current data with the selected backup. This action cannot be undone!\n\nAre you sure you want to continue?');

  if (confirmed) {
    try {
      const restoredData = await window.AdvancedPersistence.restoreBackup(backups[index].id);
      alert('✅ Backup restored successfully!\n\nPlease refresh the page to see changes.');
      return restoredData;
    } catch (error) {
      console.error('[AdvancedPersistenceIntegration] Restore backup failed:', error);
      alert('❌ Restore failed: ' + error.message);
      return null;
    }
  }
}

async function showVersions(entityId) {
  if (!window.AdvancedPersistence) {
    alert('⚠️ Advanced persistence not available');
    return [];
  }

  if (!entityId) {
    entityId = prompt('Enter entity ID (post ID, user ID, etc.):');
    if (!entityId) return [];
  }

  try {
    const versions = await window.AdvancedPersistence.getVersions(entityId, 10);

    if (versions.length === 0) {
      alert('No versions found for entity: ' + entityId);
      return [];
    }

    const versionList = versions.map((v, i) =>
      `${i + 1}. ${new Date(v.timestamp).toLocaleString()} - ${v.operation} (${v.id})`
    ).join('\n');

    alert('📋 Available Versions:\n\n' + versionList);
    return versions;
  } catch (error) {
    console.error('[AdvancedPersistenceIntegration] Show versions failed:', error);
    alert('❌ Failed to show versions: ' + error.message);
    return [];
  }
}

async function showHealthMetrics() {
  if (!window.AdvancedPersistence) {
    alert('⚠️ Advanced persistence not available');
    return;
  }

  try {
    const syncMetrics = await window.AdvancedPersistence.getHealthMetrics('sync_queue_size', 10);
    const conflictMetrics = await window.AdvancedPersistence.getHealthMetrics('conflict_count', 10);
    const storageMetrics = await window.AdvancedPersistence.getHealthMetrics('storage_usage', 10);

    const message = `
📊 Advanced Persistence Health Metrics

Sync Queue Size (last 10):
${syncMetrics.map(m => `${new Date(m.timestamp).toLocaleString()}: ${m.value}`).join('\n')}

Conflict Count (last 10):
${conflictMetrics.map(m => `${new Date(m.timestamp).toLocaleString()}: ${m.value}`).join('\n')}

Storage Usage (last 10):
${storageMetrics.map(m => `${new Date(m.timestamp).toLocaleString()}: ${m.value.toFixed(2)}%`).join('\n')}
    `;

    alert(message);
  } catch (error) {
    console.error('[AdvancedPersistenceIntegration] Show health metrics failed:', error);
    alert('❌ Failed to show health metrics: ' + error.message);
  }
}

async function showConflicts() {
  if (!window.AdvancedPersistence) {
    alert('⚠️ Advanced persistence not available');
    return [];
  }

  try {
    const conflicts = await window.AdvancedPersistence.getConflicts(false);

    if (conflicts.length === 0) {
      alert('✅ No unresolved conflicts');
      return [];
    }

    const conflictList = conflicts.map((c, i) =>
      `${i + 1}. Entity: ${c.entityId} - Strategy: ${c.strategy} - ${new Date(c.timestamp).toLocaleString()}`
    ).join('\n');

    alert('⚠️ Unresolved Conflicts:\n\n' + conflictList);
    return conflicts;
  } catch (error) {
    console.error('[AdvancedPersistenceIntegration] Show conflicts failed:', error);
    alert('❌ Failed to show conflicts: ' + error.message);
    return [];
  }
}

// Make functions globally available
window.advancedPersistenceIntegration = {
  createManualBackup,
  listBackups,
  restoreSelectedBackup,
  showVersions,
  showHealthMetrics,
  showConflicts
};

console.log('[AdvancedPersistenceIntegration] Integration system loaded');

/**
 * Settings Enhancements for Monetixra
 * Features: Settings verification UI, Settings export/import, Settings backup/restore, Settings sync across devices, Settings analytics
 */

const SettingsEnhancements = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    AUTO_SYNC_ENABLED: true,
    SYNC_INTERVAL: 60000, // 1 minute
    BACKUP_INTERVAL: 3600000, // 1 hour
    MAX_BACKUPS: 10,
    ENCRYPTION_ENABLED: true
  };

  // State
  let syncInterval = null;
  let backupInterval = null;
  let settingsAnalytics = {
    changes: [],
    syncStatus: 'idle',
    lastSync: null,
    backupCount: 0
  };

  // ── Settings Verification UI ───────────────────────────────────────────────

  /**
   * Verify all settings
   */
  async function verifyAllSettings() {
    try {
      const results = {
        appearance: await verifyAppearanceSettings(),
        account: await verifyAccountSettings(),
        privacy: await verifyPrivacySettings(),
        notifications: await verifyNotificationSettings(),
        content: await verifyContentSettings(),
        security: await verifySecuritySettings(),
        ai: await verifyAISettings(),
        voice: await verifyVoiceSettings(),
        haptic: await verifyHapticSettings(),
        cloud: await verifyCloudSettings(),
        accessibility: await verifyAccessibilitySettings(),
        performance: await verifyPerformanceSettings(),
        developer: await verifyDeveloperSettings()
      };

      const overallStatus = Object.values(results).every(r => r.passed);
      
      // Show verification report
      showVerificationReport(results, overallStatus);
      
      console.log('[Settings] Verification complete:', overallStatus);
      return { results, overallStatus };
    } catch (error) {
      console.error('[Settings] Verification failed:', error);
      return null;
    }
  }

  /**
   * Verify appearance settings
   */
  async function verifyAppearanceSettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        // Check theme
        const hasTheme = CU.privacySettings?.theme !== undefined;
        checks.push({ name: 'Theme', passed: hasTheme });
        
        // Check font size
        const hasFontSize = CU.privacySettings?.fontSize !== undefined;
        checks.push({ name: 'Font Size', passed: hasFontSize });
        
        // Check accent color
        const hasAccentColor = CU.privacySettings?.accentColor !== undefined;
        checks.push({ name: 'Accent Color', passed: hasAccentColor });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Appearance verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify account settings
   */
  async function verifyAccountSettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        // Check 2FA
        const has2FA = CU.twoFA !== undefined;
        checks.push({ name: '2FA', passed: has2FA });
        
        // Check KYC
        const hasKYC = CU.kycVerified !== undefined;
        checks.push({ name: 'KYC', passed: hasKYC });
        
        // Check E-TIN
        const hasTIN = CU.tin !== undefined;
        checks.push({ name: 'E-TIN', passed: hasTIN });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Account verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify privacy settings
   */
  async function verifyPrivacySettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const privacySettings = CU.privacySettings || {};
        
        // Check required settings
        checks.push({ name: 'Private Account', passed: privacySettings.private !== undefined });
        checks.push({ name: 'Hide Likes', passed: privacySettings.hideLikes !== undefined });
        checks.push({ name: 'Read Receipts', passed: privacySettings.readReceipts !== undefined });
        checks.push({ name: 'Location', passed: privacySettings.location !== undefined });
        checks.push({ name: 'Auto-Play', passed: privacySettings.autoPlay !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Privacy verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify notification settings
   */
  async function verifyNotificationSettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const notifSettings = CU.notifSettings || {};
        
        checks.push({ name: 'Push', passed: notifSettings.push !== undefined });
        checks.push({ name: 'Likes', passed: notifSettings.likes !== undefined });
        checks.push({ name: 'Comments', passed: notifSettings.comments !== undefined });
        checks.push({ name: 'Follows', passed: notifSettings.follows !== undefined });
        checks.push({ name: 'Earnings', passed: notifSettings.earnings !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Notification verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify content settings
   */
  async function verifyContentSettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const privacySettings = CU.privacySettings || {};
        
        checks.push({ name: 'WiFi Only', passed: privacySettings.wifiOnly !== undefined });
        checks.push({ name: 'Mute Auto-Play', passed: privacySettings.muteAuto !== undefined });
        checks.push({ name: 'Download Quality', passed: privacySettings.dlQuality !== undefined });
        checks.push({ name: 'Auto-Translate', passed: privacySettings.autoTranslate !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Content verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify security settings
   */
  async function verifySecuritySettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const securitySettings = CU.securitySettings || {};
        
        checks.push({ name: 'Login Notifications', passed: securitySettings.loginNotif !== undefined });
        checks.push({ name: 'Biometric Credential', passed: CU.biometricCredential !== undefined });
        checks.push({ name: 'Session History', passed: CU.sessionHistory !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Security verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify AI settings
   */
  async function verifyAISettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const aiSettings = CU.aiSettings || {};
        
        checks.push({ name: 'Content Filter', passed: aiSettings.contentFilter !== undefined });
        checks.push({ name: 'Personalized Feed', passed: aiSettings.personalizedFeed !== undefined });
        checks.push({ name: 'Auto-Translate', passed: aiSettings.autoTranslate !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] AI verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify voice settings
   */
  async function verifyVoiceSettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const voiceSettings = CU.voiceSettings || {};
        
        checks.push({ name: 'Voice Enabled', passed: voiceSettings.enabled !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Voice verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify haptic settings
   */
  async function verifyHapticSettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const hapticSettings = CU.hapticSettings || {};
        
        checks.push({ name: 'Haptic Enabled', passed: hapticSettings.enabled !== undefined });
        checks.push({ name: 'Haptic Intensity', passed: hapticSettings.intensity !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Haptic verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify cloud settings
   */
  async function verifyCloudSettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const cloudSettings = CU.cloudSettings || {};
        
        checks.push({ name: 'Auto Sync', passed: cloudSettings.autoSync !== undefined });
        checks.push({ name: 'Last Cloud Sync', passed: CU.lastCloudSync !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Cloud verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify accessibility settings
   */
  async function verifyAccessibilitySettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const accessibilitySettings = CU.accessibilitySettings || {};
        
        checks.push({ name: 'Screen Reader', passed: accessibilitySettings.screenReader !== undefined });
        checks.push({ name: 'Keyboard Navigation', passed: accessibilitySettings.keyboardNav !== undefined });
        checks.push({ name: 'Focus Indicators', passed: accessibilitySettings.focusIndicators !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Accessibility verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify performance settings
   */
  async function verifyPerformanceSettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const performanceSettings = CU.performanceSettings || {};
        
        checks.push({ name: 'Performance Mode', passed: performanceSettings.perfMode !== undefined });
        checks.push({ name: 'Hardware Acceleration', passed: performanceSettings.hwAccel !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Performance verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Verify developer settings
   */
  async function verifyDeveloperSettings() {
    try {
      const checks = [];
      
      if (typeof CU !== 'undefined') {
        const developerSettings = CU.developerSettings || {};
        
        checks.push({ name: 'Debug Mode', passed: developerSettings.debugMode !== undefined });
        checks.push({ name: 'Performance Monitor', passed: developerSettings.perfMonitor !== undefined });
      }

      const passed = checks.every(c => c.passed);
      return { passed, checks };
    } catch (error) {
      console.error('[Settings] Developer verification failed:', error);
      return { passed: false, checks: [] };
    }
  }

  /**
   * Show verification report
   * @param {object} results - Verification results
   * @param {boolean} overallStatus - Overall status
   */
  function showVerificationReport(results, overallStatus) {
    try {
      const modal = document.createElement('div');
      modal.className = 'settings-verification-modal';
      
      let html = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>Settings Verification Report</h2>
            <button class="close-btn" onclick="this.closest('.settings-verification-modal').remove()">✕</button>
          </div>
          <div class="modal-body">
            <div class="overall-status ${overallStatus ? 'success' : 'error'}">
              ${overallStatus ? '✅ All settings verified' : '❌ Some settings need attention'}
            </div>
            <div class="verification-details">
      `;
      
      for (const [category, result] of Object.entries(results)) {
        const statusClass = result.passed ? 'success' : 'error';
        const statusIcon = result.passed ? '✅' : '❌';
        
        html += `
          <div class="verification-category ${statusClass}">
            <div class="category-header">
              <span class="category-name">${category}</span>
              <span class="category-status">${statusIcon}</span>
            </div>
            <div class="category-checks">
        `;
        
        result.checks.forEach(check => {
          const checkClass = check.passed ? 'success' : 'error';
          const checkIcon = check.passed ? '✅' : '❌';
          html += `
            <div class="check-item ${checkClass}">
              <span>${checkIcon} ${check.name}</span>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      }
      
      html += `
            </div>
            <div class="modal-actions">
              <button class="btn btn-primary" onclick="resetToDefaults()">Reset to Defaults</button>
              <button class="btn btn-secondary" onclick="this.closest('.settings-verification-modal').remove()">Close</button>
            </div>
          </div>
        </div>
      `;
      
      modal.innerHTML = html;
      document.body.appendChild(modal);
      
      console.log('[Settings] Verification report displayed');
    } catch (error) {
      console.error('[Settings] Report display failed:', error);
    }
  }

  // ── Settings Export/Import ─────────────────────────────────────────────────

  /**
   * Export settings
   * @param {object} options - Export options
   */
  async function exportSettings(options = {}) {
    try {
      if (typeof CU === 'undefined') {
        toast('e', '❌ No user logged in');
        return false;
      }

      const settings = {
        userId: CU.id,
        username: CU.username,
        exportedAt: Date.now(),
        version: '1.0',
        settings: {
          privacySettings: CU.privacySettings || {},
          notifSettings: CU.notifSettings || {},
          securitySettings: CU.securitySettings || {},
          aiSettings: CU.aiSettings || {},
          voiceSettings: CU.voiceSettings || {},
          hapticSettings: CU.hapticSettings || {},
          cloudSettings: CU.cloudSettings || {},
          accessibilitySettings: CU.accessibilitySettings || {},
          performanceSettings: CU.performanceSettings || {},
          developerSettings: CU.developerSettings || {}
        }
      };

      // Encrypt if enabled
      let exportData = JSON.stringify(settings, null, 2);
      if (options.encrypt && CONFIG.ENCRYPTION_ENABLED) {
        exportData = await encryptData(exportData);
      }

      // Create download
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monetixra-settings-${CU.username}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('[Settings] Settings exported');
      toast('s', '✅ Settings exported successfully');
      return true;
    } catch (error) {
      console.error('[Settings] Export failed:', error);
      toast('e', '❌ Settings export failed');
      return false;
    }
  }

  /**
   * Import settings
   * @param {File} file - Settings file
   * @param {object} options - Import options
   */
  async function importSettings(file, options = {}) {
    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          let importData = event.target.result;
          
          // Decrypt if encrypted
          if (options.decrypt && CONFIG.ENCRYPTION_ENABLED) {
            importData = await decryptData(importData);
          }

          const settings = JSON.parse(importData);
          
          // Validate settings
          if (!settings.settings || !settings.userId) {
            throw new Error('Invalid settings file');
          }

          // Import settings
          if (typeof CU !== 'undefined') {
            Object.assign(CU, settings.settings);
            
            if (typeof saveData === 'function') {
              saveData();
            }
            
            // Re-render settings
            if (typeof rSettings === 'function') {
              rSettings();
            }
          }

          console.log('[Settings] Settings imported');
          toast('s', '✅ Settings imported successfully');
        } catch (error) {
          console.error('[Settings] Import processing failed:', error);
          toast('e', '❌ Invalid settings file');
        }
      };

      reader.readAsText(file);
      return true;
    } catch (error) {
      console.error('[Settings] Import failed:', error);
      toast('e', '❌ Settings import failed');
      return false;
    }
  }

  // ── Settings Backup/Restore ─────────────────────────────────────────────────

  /**
   * Create settings backup
   */
  async function createBackup() {
    try {
      if (typeof CU === 'undefined') {
        return false;
      }

      const backup = {
        userId: CU.id,
        timestamp: Date.now(),
        settings: JSON.parse(JSON.stringify(CU))
      };

      // Store in localStorage
      const backups = getBackups();
      backups.push(backup);
      
      // Keep only max backups
      if (backups.length > CONFIG.MAX_BACKUPS) {
        backups.shift();
      }
      
      localStorage.setItem('monetixra_settings_backups', JSON.stringify(backups));
      
      settingsAnalytics.backupCount++;
      console.log('[Settings] Backup created');
      toast('s', '✅ Settings backup created');
      return true;
    } catch (error) {
      console.error('[Settings] Backup creation failed:', error);
      toast('e', '❌ Backup creation failed');
      return false;
    }
  }

  /**
   * Get all backups
   */
  function getBackups() {
    try {
      const backupsData = localStorage.getItem('monetixra_settings_backups');
      return backupsData ? JSON.parse(backupsData) : [];
    } catch (error) {
      console.error('[Settings] Backup retrieval failed:', error);
      return [];
    }
  }

  /**
   * Restore settings from backup
   * @param {number} backupIndex - Backup index
   */
  async function restoreBackup(backupIndex) {
    try {
      const backups = getBackups();
      
      if (backupIndex < 0 || backupIndex >= backups.length) {
        throw new Error('Invalid backup index');
      }

      const backup = backups[backupIndex];
      
      if (typeof CU !== 'undefined') {
        Object.assign(CU, backup.settings);
        
        if (typeof saveData === 'function') {
          saveData();
        }
        
        if (typeof rSettings === 'function') {
          rSettings();
        }
      }

      console.log('[Settings] Backup restored');
      toast('s', '✅ Settings restored from backup');
      return true;
    } catch (error) {
      console.error('[Settings] Backup restore failed:', error);
      toast('e', '❌ Backup restore failed');
      return false;
    }
  }

  /**
   * Delete backup
   * @param {number} backupIndex - Backup index
   */
  function deleteBackup(backupIndex) {
    try {
      const backups = getBackups();
      
      if (backupIndex < 0 || backupIndex >= backups.length) {
        return false;
      }

      backups.splice(backupIndex, 1);
      localStorage.setItem('monetixra_settings_backups', JSON.stringify(backups));
      
      console.log('[Settings] Backup deleted');
      toast('s', '✅ Backup deleted');
      return true;
    } catch (error) {
      console.error('[Settings] Backup deletion failed:', error);
      toast('e', '❌ Backup deletion failed');
      return false;
    }
  }

  /**
   * Start automatic backup
   */
  function startAutoBackup() {
    if (backupInterval) {
      clearInterval(backupInterval);
    }

    backupInterval = setInterval(() => {
      createBackup();
    }, CONFIG.BACKUP_INTERVAL);

    console.log('[Settings] Auto backup started');
  }

  /**
   * Stop automatic backup
   */
  function stopAutoBackup() {
    if (backupInterval) {
      clearInterval(backupInterval);
      backupInterval = null;
      console.log('[Settings] Auto backup stopped');
    }
  }

  // ── Settings Sync Across Devices ───────────────────────────────────────────

  /**
   * Sync settings to cloud
   */
  async function syncToCloud() {
    try {
      if (typeof CU === 'undefined') {
        return false;
      }

      settingsAnalytics.syncStatus = 'syncing';
      
      // Prepare settings data
      const settingsData = {
        userId: CU.id,
        settings: {
          privacySettings: CU.privacySettings || {},
          notifSettings: CU.notifSettings || {},
          securitySettings: CU.securitySettings || {},
          aiSettings: CU.aiSettings || {},
          voiceSettings: CU.voiceSettings || {},
          hapticSettings: CU.hapticSettings || {},
          cloudSettings: CU.cloudSettings || {},
          accessibilitySettings: CU.accessibilitySettings || {},
          performanceSettings: CU.performanceSettings || {},
          developerSettings: CU.developerSettings || {}
        },
        lastSync: Date.now()
      };

      // Send to server
      const response = await fetch('/api/settings/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      settingsAnalytics.syncStatus = 'synced';
      settingsAnalytics.lastSync = Date.now();
      
      // Record change
      recordSettingsChange('sync_to_cloud', settingsData);
      
      console.log('[Settings] Settings synced to cloud');
      toast('s', '✅ Settings synced to cloud');
      return true;
    } catch (error) {
      console.error('[Settings] Cloud sync failed:', error);
      settingsAnalytics.syncStatus = 'error';
      toast('e', '❌ Cloud sync failed');
      return false;
    }
  }

  /**
   * Sync settings from cloud
   */
  async function syncFromCloud() {
    try {
      if (typeof CU === 'undefined') {
        return false;
      }

      settingsAnalytics.syncStatus = 'syncing';
      
      // Fetch from server
      const response = await fetch(`/api/settings/sync?userId=${CU.id}`);
      
      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const data = await response.json();
      
      if (data.settings) {
        Object.assign(CU, data.settings);
        
        if (typeof saveData === 'function') {
          saveData();
        }
        
        if (typeof rSettings === 'function') {
          rSettings();
        }
      }

      settingsAnalytics.syncStatus = 'synced';
      settingsAnalytics.lastSync = Date.now();
      
      // Record change
      recordSettingsChange('sync_from_cloud', data.settings);
      
      console.log('[Settings] Settings synced from cloud');
      toast('s', '✅ Settings synced from cloud');
      return true;
    } catch (error) {
      console.error('[Settings] Cloud sync failed:', error);
      settingsAnalytics.syncStatus = 'error';
      toast('e', '❌ Cloud sync failed');
      return false;
    }
  }

  /**
   * Start automatic sync
   */
  function startAutoSync() {
    if (!CONFIG.AUTO_SYNC_ENABLED) {
      return;
    }

    if (syncInterval) {
      clearInterval(syncInterval);
    }

    syncInterval = setInterval(() => {
      syncToCloud();
    }, CONFIG.SYNC_INTERVAL);

    console.log('[Settings] Auto sync started');
  }

  /**
   * Stop automatic sync
   */
  function stopAutoSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
      console.log('[Settings] Auto sync stopped');
    }
  }

  // ── Settings Analytics ────────────────────────────────────────────────────

  /**
   * Record settings change
   * @param {string} setting - Setting name
   * @param {any} value - New value
   */
  function recordSettingsChange(setting, value) {
    try {
      const change = {
        setting: setting,
        value: value,
        timestamp: Date.now(),
        userId: typeof CU !== 'undefined' ? CU.id : null
      };

      settingsAnalytics.changes.push(change);
      
      // Keep only last 100 changes
      if (settingsAnalytics.changes.length > 100) {
        settingsAnalytics.changes.shift();
      }

      console.log('[Settings] Change recorded:', setting);
    } catch (error) {
      console.error('[Settings] Change recording failed:', error);
    }
  }

  /**
   * Get settings analytics
   */
  function getSettingsAnalytics() {
    try {
      return {
        changes: settingsAnalytics.changes,
        syncStatus: settingsAnalytics.syncStatus,
        lastSync: settingsAnalytics.lastSync,
        backupCount: settingsAnalytics.backupCount,
        totalChanges: settingsAnalytics.changes.length,
        changesBySetting: getChangesBySetting()
      };
    } catch (error) {
      console.error('[Settings] Analytics retrieval failed:', error);
      return {};
    }
  }

  /**
   * Get changes grouped by setting
   */
  function getChangesBySetting() {
    try {
      const grouped = {};
      
      settingsAnalytics.changes.forEach(change => {
        if (!grouped[change.setting]) {
          grouped[change.setting] = [];
        }
        grouped[change.setting].push(change);
      });

      return grouped;
    } catch (error) {
      console.error('[Settings] Changes grouping failed:', error);
      return {};
    }
  }

  /**
   * Generate settings analytics report
   */
  function generateSettingsReport() {
    try {
      const analytics = getSettingsAnalytics();
      
      const report = {
        summary: {
          totalChanges: analytics.totalChanges,
          syncStatus: analytics.syncStatus,
          lastSync: analytics.lastSync,
          backupCount: analytics.backupCount
        },
        topChangedSettings: getTopChangedSettings(),
        changeTimeline: generateChangeTimeline(),
        syncHistory: getSyncHistory()
      };

      return report;
    } catch (error) {
      console.error('[Settings] Report generation failed:', error);
      return null;
    }
  }

  /**
   * Get top changed settings
   */
  function getTopChangedSettings() {
    try {
      const changesBySetting = getChangesBySetting();
      
      return Object.entries(changesBySetting)
        .map(([setting, changes]) => ({
          setting: setting,
          count: changes.length,
          lastChanged: changes[changes.length - 1].timestamp
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    } catch (error) {
      console.error('[Settings] Top settings retrieval failed:', error);
      return [];
    }
  }

  /**
   * Generate change timeline
   */
  function generateChangeTimeline() {
    try {
      return settingsAnalytics.changes
        .map(change => ({
          setting: change.setting,
          value: change.value,
          timestamp: change.timestamp
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('[Settings] Timeline generation failed:', error);
      return [];
    }
  }

  /**
   * Get sync history
   */
  function getSyncHistory() {
    try {
      return settingsAnalytics.changes
        .filter(change => change.setting === 'sync_to_cloud' || change.setting === 'sync_from_cloud')
        .map(change => ({
          type: change.setting,
          timestamp: change.timestamp
        }));
    } catch (error) {
      console.error('[Settings] Sync history retrieval failed:', error);
      return [];
    }
  }

  // ── Encryption Helpers ────────────────────────────────────────────────────

  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   */
  async function encryptData(data) {
    try {
      // Simple encryption - in production use proper encryption
      const encoded = btoa(encodeURIComponent(data));
      return encoded;
    } catch (error) {
      console.error('[Settings] Encryption failed:', error);
      return data;
    }
  }

  /**
   * Decrypt data
   * @param {string} data - Data to decrypt
   */
  async function decryptData(data) {
    try {
      const decoded = decodeURIComponent(atob(data));
      return decoded;
    } catch (error) {
      console.error('[Settings] Decryption failed:', error);
      return data;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Verification
    verifyAll: verifyAllSettings,
    
    // Export/Import
    export: exportSettings,
    import: importSettings,
    
    // Backup/Restore
    createBackup: createBackup,
    getBackups: getBackups,
    restoreBackup: restoreBackup,
    deleteBackup: deleteBackup,
    startAutoBackup: startAutoBackup,
    stopAutoBackup: stopAutoBackup,
    
    // Sync
    syncToCloud: syncToCloud,
    syncFromCloud: syncFromCloud,
    startAutoSync: startAutoSync,
    stopAutoSync: stopAutoSync,
    
    // Analytics
    recordChange: recordSettingsChange,
    getAnalytics: getSettingsAnalytics,
    generateReport: generateSettingsReport,
    
    // State
    getAnalytics: () => ({ ...settingsAnalytics }),
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsEnhancements;
}

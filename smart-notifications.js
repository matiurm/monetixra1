/**
 * ================================================================
 *  SMART NOTIFICATIONS SYSTEM
 *  Priority-based Notifications | Do Not Disturb | Smart Summary
 *  Actionable Notifications | Notification Analytics
 * ================================================================
 */

const SmartNotifications = (function() {
  'use strict';

  // Configuration
  const CONFIG = {
    version: '1.0.0',
    enablePriority: true,
    enableDND: true,
    enableSmartSummary: true,
    maxNotifications: 50,
    defaultPriority: 'normal'
  };

  // State
  let state = {
    notifications: [],
    dndEnabled: false,
    dndSchedule: null,
    userPreferences: new Map(),
    notificationMetrics: new Map()
  };

  // Priority levels
  const PRIORITIES = {
    urgent: { level: 5, sound: true, vibration: true, badge: true },
    high: { level: 4, sound: true, vibration: true, badge: true },
    normal: { level: 3, sound: true, vibration: false, badge: true },
    low: { level: 2, sound: false, vibration: false, badge: true },
    silent: { level: 1, sound: false, vibration: false, badge: false }
  };

  // ============================================
  // NOTIFICATION CREATION
  // ============================================

  function createNotification(options) {
    try {
      const notification = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: options.type || 'general',
        title: options.title || 'Notification',
        message: options.message || '',
        priority: options.priority || CONFIG.defaultPriority,
        data: options.data || {},
        createdAt: Date.now(),
        read: false,
        actioned: false,
        actions: options.actions || []
      };

      // Check DND
      if (state.dndEnabled && notification.priority !== 'urgent') {
        console.log('[SmartNotifications] Notification suppressed due to DND:', notification.id);
        notification.suppressed = true;
      }

      // Add to notifications
      state.notifications.unshift(notification);

      // Keep only max notifications
      if (state.notifications.length > CONFIG.maxNotifications) {
        state.notifications.pop();
      }

      // Show notification if not suppressed
      if (!notification.suppressed) {
        showNotification(notification);
      }

      // Track metrics
      trackNotificationMetric(notification.id, 'created');

      console.log('[SmartNotifications] Notification created:', notification.id);
      return notification;
    } catch (error) {
      console.error('[SmartNotifications] Create notification failed:', error);
      return null;
    }
  }

  // ============================================
  // NOTIFICATION DISPLAY
  // ============================================

  function showNotification(notification) {
    try {
      const priority = PRIORITIES[notification.priority] || PRIORITIES.normal;

      // Browser notification
      if (Notification.permission === 'granted') {
        const browserNotif = new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192.png',
          badge: '/icon-96.png',
          tag: notification.id,
          requireInteraction: notification.priority === 'urgent',
          silent: !priority.sound
        });

        browserNotif.onclick = () => {
          handleNotificationClick(notification);
          browserNotif.close();
        };
      }

      // In-app notification
      showInAppNotification(notification);

      // Sound
      if (priority.sound) {
        playNotificationSound(notification.priority);
      }

      // Vibration
      if (priority.vibration && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // Badge
      if (priority.badge) {
        updateBadgeCount();
      }
    } catch (error) {
      console.error('[SmartNotifications] Show notification failed:', error);
    }
  }

  function showInAppNotification(notification) {
    try {
      // Check if notification container exists
      let container = document.getElementById('notification-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 400px;
        `;
        document.body.appendChild(container);
      }

      // Create notification element
      const notifEl = document.createElement('div');
      notifEl.id = notification.id;
      notifEl.className = 'smart-notification';
      notifEl.style.cssText = `
        background: ${getNotificationColor(notification.priority)};
        color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
        cursor: pointer;
      `;

      notifEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <div style="font-weight: bold; margin-bottom: 5px;">${notification.title}</div>
            <div style="font-size: 14px; opacity: 0.9;">${notification.message}</div>
          </div>
          <button onclick="SmartNotifications.dismissNotification('${notification.id}')" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">✕</button>
        </div>
        ${notification.actions.length > 0 ? `
          <div style="margin-top: 10px; display: flex; gap: 8px;">
            ${notification.actions.map(action => `
              <button onclick="event.stopPropagation(); SmartNotifications.handleAction('${notification.id}', '${action.id}')" style="padding: 5px 10px; border: none; background: rgba(255,255,255,0.2); color: white; border-radius: 4px; cursor: pointer; font-size: 12px;">${action.label}</button>
            `).join('')}
          </div>
        ` : ''}
      `;

      notifEl.onclick = () => handleNotificationClick(notification);

      container.appendChild(notifEl);

      // Auto-dismiss after 5 seconds (except urgent)
      if (notification.priority !== 'urgent') {
        setTimeout(() => dismissNotification(notification.id), 5000);
      }

      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    } catch (error) {
      console.error('[SmartNotifications] Show in-app notification failed:', error);
    }
  }

  function getNotificationColor(priority) {
    const colors = {
      urgent: '#ff6b6b',
      high: '#ffa502',
      normal: '#4a9eff',
      low: '#a8a8a8',
      silent: '#a8a8a8'
    };
    return colors[priority] || colors.normal;
  }

  function playNotificationSound(priority) {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = priority === 'urgent' ? 1.0 : 0.5;
      audio.play().catch(e => console.log('[SmartNotifications] Sound play failed:', e));
    } catch (error) {
      console.error('[SmartNotifications] Play sound failed:', error);
    }
  }

  // ============================================
  // NOTIFICATION ACTIONS
  // ============================================

  function handleNotificationClick(notification) {
    try {
      notification.read = true;
      notification.actioned = true;

      trackNotificationMetric(notification.id, 'clicked');

      // Execute custom handler if provided
      if (notification.data.onClick) {
        notification.data.onClick(notification);
      }

      console.log('[SmartNotifications] Notification clicked:', notification.id);
    } catch (error) {
      console.error('[SmartNotifications] Handle notification click failed:', error);
    }
  }

  function handleAction(notificationId, actionId) {
    try {
      const notification = state.notifications.find(n => n.id === notificationId);
      if (!notification) return;

      const action = notification.actions.find(a => a.id === actionId);
      if (!action) return;

      notification.actioned = true;

      // Execute action handler
      if (action.handler) {
        action.handler(notification);
      }

      trackNotificationMetric(notificationId, 'actioned');

      dismissNotification(notificationId);

      console.log('[SmartNotifications] Action handled:', actionId);
    } catch (error) {
      console.error('[SmartNotifications] Handle action failed:', error);
    }
  }

  function dismissNotification(notificationId) {
    try {
      const notifEl = document.getElementById(notificationId);
      if (notifEl) {
        notifEl.remove();
      }

      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        trackNotificationMetric(notificationId, 'dismissed');
      }

      updateBadgeCount();
    } catch (error) {
      console.error('[SmartNotifications] Dismiss notification failed:', error);
    }
  }

  // ============================================
  // DO NOT DISTURB
  // ============================================

  function setDND(enabled, schedule = null) {
    try {
      state.dndEnabled = enabled;
      state.dndSchedule = schedule;

      if (schedule) {
        setupDNDSchedule(schedule);
      }

      console.log('[SmartNotifications] DND set to:', enabled);
      return true;
    } catch (error) {
      console.error('[SmartNotifications] Set DND failed:', error);
      return false;
    }
  }

  function setupDNDSchedule(schedule) {
    try {
      const { start, end } = schedule;
      const now = new Date();
      const currentHour = now.getHours();

      if (currentHour >= start && currentHour < end) {
        state.dndEnabled = true;
      } else {
        state.dndEnabled = false;
      }

      // Check every minute
      setInterval(() => {
        const now = new Date();
        const currentHour = now.getHours();
        const shouldBeDND = currentHour >= start && currentHour < end;

        if (shouldBeDND !== state.dndEnabled) {
          state.dndEnabled = shouldBeDND;
          console.log('[SmartNotifications] DND schedule updated:', state.dndEnabled);
        }
      }, 60000);
    } catch (error) {
      console.error('[SmartNotifications] Setup DND schedule failed:', error);
    }
  }

  // ============================================
  // SMART SUMMARY
  // ============================================

  function generateSmartSummary() {
    try {
      if (!CONFIG.enableSmartSummary) {
        return null;
      }

      const unread = state.notifications.filter(n => !n.read);
      const urgent = state.notifications.filter(n => n.priority === 'urgent' && !n.read);
      const high = state.notifications.filter(n => n.priority === 'high' && !n.read);

      const summary = {
        total: unread.length,
        urgent: urgent.length,
        high: high.length,
        byType: {},
        recent: unread.slice(0, 5)
      };

      // Group by type
      unread.forEach(n => {
        summary.byType[n.type] = (summary.byType[n.type] || 0) + 1;
      });

      return summary;
    } catch (error) {
      console.error('[SmartNotifications] Generate smart summary failed:', error);
      return null;
    }
  }

  // ============================================
  // NOTIFICATION PREFERENCES
  // ============================================

  function setPreferences(userId, preferences) {
    try {
      state.userPreferences.set(userId, preferences);
      localStorage.setItem(`notificationPrefs_${userId}`, JSON.stringify(preferences));
      console.log('[SmartNotifications] Preferences set for user:', userId);
      return true;
    } catch (error) {
      console.error('[SmartNotifications] Set preferences failed:', error);
      return false;
    }
  }

  function getPreferences(userId) {
    try {
      let prefs = state.userPreferences.get(userId);
      if (!prefs) {
        const stored = localStorage.getItem(`notificationPrefs_${userId}`);
        if (stored) {
          prefs = JSON.parse(stored);
          state.userPreferences.set(userId, prefs);
        }
      }
      return prefs || {};
    } catch (error) {
      console.error('[SmartNotifications] Get preferences failed:', error);
      return {};
    }
  }

  // ============================================
  // NOTIFICATION ANALYTICS
  // ============================================

  function trackNotificationMetric(notificationId, metricType) {
    try {
      if (!state.notificationMetrics.has(notificationId)) {
        state.notificationMetrics.set(notificationId, {
          created: Date.now(),
          clicked: null,
          dismissed: null,
          actioned: null
        });
      }

      const metrics = state.notificationMetrics.get(notificationId);
      metrics[metricType] = Date.now();
    } catch (error) {
      console.error('[SmartNotifications] Track metric failed:', error);
    }
  }

  function getNotificationMetrics(notificationId) {
    return state.notificationMetrics.get(notificationId) || null;
  }

  function getOverallMetrics() {
    try {
      const total = state.notifications.length;
      const read = state.notifications.filter(n => n.read).length;
      const clicked = state.notifications.filter(n => n.actioned).length;

      return {
        total: total,
        unread: total - read,
        read: read,
        clicked: clicked,
        clickRate: total > 0 ? (clicked / total) * 100 : 0
      };
    } catch (error) {
      console.error('[SmartNotifications] Get overall metrics failed:', error);
      return null;
    }
  }

  // ============================================
  // BADGE COUNT
  // ============================================

  function updateBadgeCount() {
    try {
      const unread = state.notifications.filter(n => !n.read && !n.suppressed).length;

      // Update browser badge
      if (navigator.setAppBadge) {
        navigator.setAppBadge(unread);
      }

      // Update favicon badge (if supported)
      updateFaviconBadge(unread);

      return unread;
    } catch (error) {
      console.error('[SmartNotifications] Update badge count failed:', error);
      return 0;
    }
  }

  function updateFaviconBadge(count) {
    try {
      if (count === 0) {
        document.querySelector('link[rel="icon"]').href = '/icon-192.png';
        return;
      }

      // Create badge canvas
      const canvas = document.createElement('canvas');
      canvas.width = 192;
      canvas.height = 192;
      const ctx = canvas.getContext('2d');

      // Draw original icon
      const img = new Image();
      img.src = '/icon-192.png';
      img.onload = () => {
        ctx.drawImage(img, 0, 0);

        // Draw badge
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(150, 150, 40, 0, Math.PI * 2);
        ctx.fill();

        // Draw count
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count > 99 ? '99+' : count.toString(), 150, 150);

        // Update favicon
        document.querySelector('link[rel="icon"]').href = canvas.toDataURL();
      };
    } catch (error) {
      console.error('[SmartNotifications] Update favicon badge failed:', error);
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function initialize(config = {}) {
    if (config.enablePriority !== undefined) {
      CONFIG.enablePriority = config.enablePriority;
    }
    if (config.enableDND !== undefined) {
      CONFIG.enableDND = config.enableDND;
    }
    if (config.enableSmartSummary !== undefined) {
      CONFIG.enableSmartSummary = config.enableSmartSummary;
    }

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Load user preferences
    if (typeof CU !== 'undefined' && CU.id) {
      const prefs = getPreferences(CU.id);
      if (prefs.dndEnabled !== undefined) {
        setDND(prefs.dndEnabled, prefs.dndSchedule);
      }
    }

    console.log('[SmartNotifications] Initialized');
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    initialize,
    createNotification,
    dismissNotification,
    handleAction,
    setDND,
    setPreferences,
    getPreferences,
    generateSmartSummary,
    getNotificationMetrics,
    getOverallMetrics,
    getNotifications: () => state.notifications,
    getState: () => state
  };
})();

// Auto-initialize
SmartNotifications.initialize();

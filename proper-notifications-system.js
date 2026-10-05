/**
 * Proper Notifications System for Monetixra
 * Comprehensive notification management similar to Facebook/Instagram
 */

const ProperNotificationsSystem = (function() {
  'use strict';

  // Storage
  let notifications = new Map();
  let userNotifications = new Map();
  let notificationSettings = new Map();
  let notificationQueue = new Map();
  let unreadCounts = new Map();

  // Notification types
  const NOTIFICATION_TYPES = {
    LIKE: 'like',
    COMMENT: 'comment',
    SHARE: 'share',
    FOLLOW: 'follow',
    MENTION: 'mention',
    MESSAGE: 'message',
    POST: 'post',
    LIVE: 'live',
    EVENT: 'event',
    GROUP: 'group',
    PAGE: 'page',
    SYSTEM: 'system',
    AD: 'ad'
  };

  // Priority levels
  const PRIORITY = {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    URGENT: 4
  };

  /**
   * Create notification
   * @param {Object} notificationData - Notification data
   * @returns {Object} Created notification
   */
  function createNotification(notificationData) {
    const notificationId = generateId();

    const notification = {
      id: notificationId,
      type: notificationData.type || NOTIFICATION_TYPES.SYSTEM,
      recipientId: notificationData.recipientId,
      senderId: notificationData.senderId || null,
      senderName: notificationData.senderName || '',
      senderAvatar: notificationData.senderAvatar || '',
      title: notificationData.title || '',
      message: notificationData.message || '',
      data: notificationData.data || {},
      priority: notificationData.priority || PRIORITY.NORMAL,
      isRead: false,
      isSeen: false,
      createdAt: Date.now(),
      expiresAt: notificationData.expiresAt || null,
      actionUrl: notificationData.actionUrl || '',
      actionText: notificationData.actionText || ''
    };

    notifications.set(notificationId, notification);

    // Add to user's notifications
    const userNotifs = userNotifications.get(notificationData.recipientId) || [];
    userNotifs.unshift(notificationId);
    userNotifications.set(notificationData.recipientId, userNotifs);

    // Update unread count
    const unreadCount = unreadCounts.get(notificationData.recipientId) || 0;
    unreadCounts.set(notificationData.recipientId, unreadCount + 1);

    // Send push notification if enabled
    sendPushNotification(notification);

    return notification;
  }

  /**
   * Get notifications for user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Notifications
   */
  function getNotifications(userId, options = {}) {
    const notificationIds = userNotifications.get(userId) || [];
    const {
      limit = 20,
      offset = 0,
      unreadOnly = false,
      type = null
    } = options;

    let notificationsList = notificationIds
      .map(id => notifications.get(id))
      .filter(Boolean);

    // Filter by type
    if (type) {
      notificationsList = notificationsList.filter(n => n.type === type);
    }

    // Filter by unread status
    if (unreadOnly) {
      notificationsList = notificationsList.filter(n => !n.isRead);
    }

    // Sort by date (newest first)
    notificationsList.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    return notificationsList.slice(offset, offset + limit);
  }

  /**
   * Get unread count for user
   * @param {string} userId - User ID
   * @returns {number} Unread count
   */
  function getUnreadCount(userId) {
    return unreadCounts.get(userId) || 0;
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  function markAsRead(notificationId, userId) {
    const notification = notifications.get(notificationId);
    if (notification && notification.recipientId === userId) {
      notification.isRead = true;
      notifications.set(notificationId, notification);

      // Update unread count
      const unreadCount = unreadCounts.get(userId) || 0;
      unreadCounts.set(userId, Math.max(0, unreadCount - 1));
    }
  }

  /**
   * Mark all notifications as read for user
   * @param {string} userId - User ID
   */
  function markAllAsRead(userId) {
    const notificationIds = userNotifications.get(userId) || [];
    notificationIds.forEach(id => {
      const notification = notifications.get(id);
      if (notification) {
        notification.isRead = true;
        notifications.set(id, notification);
      }
    });

    unreadCounts.set(userId, 0);
  }

  /**
   * Mark notification as seen
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  function markAsSeen(notificationId, userId) {
    const notification = notifications.get(notificationId);
    if (notification && notification.recipientId === userId) {
      notification.isSeen = true;
      notifications.set(notificationId, notification);
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  function deleteNotification(notificationId, userId) {
    const notification = notifications.get(notificationId);
    if (notification && notification.recipientId === userId) {
      notifications.delete(notificationId);

      const userNotifs = userNotifications.get(userId) || [];
      const index = userNotifs.indexOf(notificationId);
      if (index > -1) {
        userNotifs.splice(index, 1);
        userNotifications.set(userId, userNotifs);
      }

      if (!notification.isRead) {
        const unreadCount = unreadCounts.get(userId) || 0;
        unreadCounts.set(userId, Math.max(0, unreadCount - 1));
      }
    }
  }

  /**
   * Clear all notifications for user
   * @param {string} userId - User ID
   */
  function clearAllNotifications(userId) {
    const notificationIds = userNotifications.get(userId) || [];
    notificationIds.forEach(id => notifications.delete(id));
    userNotifications.set(userId, []);
    unreadCounts.set(userId, 0);
  }

  /**
   * Send like notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} senderName - Sender name
   * @param {string} senderAvatar - Sender avatar
   * @param {string} postId - Post ID
   */
  function sendLikeNotification(recipientId, senderId, senderName, senderAvatar, postId) {
    createNotification({
      type: NOTIFICATION_TYPES.LIKE,
      recipientId,
      senderId,
      senderName,
      senderAvatar,
      title: 'New Like',
      message: `${senderName} liked your post`,
      data: { postId },
      priority: PRIORITY.NORMAL,
      actionUrl: `/post/${postId}`,
      actionText: 'View Post'
    });
  }

  /**
   * Send comment notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} senderName - Sender name
   * @param {string} senderAvatar - Sender avatar
   * @param {string} postId - Post ID
   * @param {string} comment - Comment text
   */
  function sendCommentNotification(recipientId, senderId, senderName, senderAvatar, postId, comment) {
    createNotification({
      type: NOTIFICATION_TYPES.COMMENT,
      recipientId,
      senderId,
      senderName,
      senderAvatar,
      title: 'New Comment',
      message: `${senderName} commented: ${comment.substring(0, 50)}...`,
      data: { postId, comment },
      priority: PRIORITY.NORMAL,
      actionUrl: `/post/${postId}`,
      actionText: 'View Comment'
    });
  }

  /**
   * Send follow notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} senderName - Sender name
   * @param {string} senderAvatar - Sender avatar
   */
  function sendFollowNotification(recipientId, senderId, senderName, senderAvatar) {
    createNotification({
      type: NOTIFICATION_TYPES.FOLLOW,
      recipientId,
      senderId,
      senderName,
      senderAvatar,
      title: 'New Follower',
      message: `${senderName} started following you`,
      data: {},
      priority: PRIORITY.NORMAL,
      actionUrl: `/profile/${senderId}`,
      actionText: 'View Profile'
    });
  }

  /**
   * Send mention notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} senderName - Sender name
   * @param {string} senderAvatar - Sender avatar
   * @param {string} postId - Post ID
   */
  function sendMentionNotification(recipientId, senderId, senderName, senderAvatar, postId) {
    createNotification({
      type: NOTIFICATION_TYPES.MENTION,
      recipientId,
      senderId,
      senderName,
      senderAvatar,
      title: 'You were mentioned',
      message: `${senderName} mentioned you in a post`,
      data: { postId },
      priority: PRIORITY.HIGH,
      actionUrl: `/post/${postId}`,
      actionText: 'View Post'
    });
  }

  /**
   * Send message notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} senderName - Sender name
   * @param {string} senderAvatar - Sender avatar
   * @param {string} messageId - Message ID
   * @param {string} message - Message text
   */
  function sendMessageNotification(recipientId, senderId, senderName, senderAvatar, messageId, message) {
    createNotification({
      type: NOTIFICATION_TYPES.MESSAGE,
      recipientId,
      senderId,
      senderName,
      senderAvatar,
      title: 'New Message',
      message: `${senderName}: ${message.substring(0, 50)}...`,
      data: { messageId, message },
      priority: PRIORITY.HIGH,
      actionUrl: `/chat/${senderId}`,
      actionText: 'Reply'
    });
  }

  /**
   * Send live stream notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} senderName - Sender name
   * @param {string} streamId - Stream ID
   */
  function sendLiveNotification(recipientId, senderId, senderName, streamId) {
    createNotification({
      type: NOTIFICATION_TYPES.LIVE,
      recipientId,
      senderId,
      senderName,
      title: 'Live Now',
      message: `${senderName} is live streaming`,
      data: { streamId },
      priority: PRIORITY.URGENT,
      actionUrl: `/live/${streamId}`,
      actionText: 'Watch Now'
    });
  }

  /**
   * Send event notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} eventId - Event ID
   * @param {string} eventName - Event name
   * @param {string} message - Notification message
   */
  function sendEventNotification(recipientId, eventId, eventName, message) {
    createNotification({
      type: NOTIFICATION_TYPES.EVENT,
      recipientId,
      title: 'Event Update',
      message: `${eventName}: ${message}`,
      data: { eventId },
      priority: PRIORITY.NORMAL,
      actionUrl: `/event/${eventId}`,
      actionText: 'View Event'
    });
  }

  /**
   * Set notification settings for user
   * @param {string} userId - User ID
   * @param {Object} settings - Notification settings
   */
  function setNotificationSettings(userId, settings) {
    const currentSettings = notificationSettings.get(userId) || {};
    const updatedSettings = { ...currentSettings, ...settings };
    notificationSettings.set(userId, updatedSettings);
  }

  /**
   * Get notification settings for user
   * @param {string} userId - User ID
   * @returns {Object} Notification settings
   */
  function getNotificationSettings(userId) {
    return notificationSettings.get(userId) || {
      pushEnabled: true,
      emailEnabled: false,
      inAppEnabled: true,
      likeNotifications: true,
      commentNotifications: true,
      followNotifications: true,
      mentionNotifications: true,
      messageNotifications: true,
      liveNotifications: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }

  /**
   * Check if notifications should be sent (respect quiet hours)
   * @param {string} userId - User ID
   * @returns {boolean} Should send
   */
  function shouldSendNotification(userId) {
    const settings = getNotificationSettings(userId);

    if (!settings.inAppEnabled) return false;

    if (settings.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
      const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (currentTime >= startTime || currentTime < endTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send push notification
   * @param {Object} notification - Notification object
   */
  function sendPushNotification(notification) {
    // Implementation depends on push notification service
    // This would integrate with web-push or FCM
    console.log('[ProperNotificationsSystem] Push notification:', notification.title);
  }

  /**
   * Get notification statistics
   * @param {string} userId - User ID
   * @returns {Object} Statistics
   */
  function getNotificationStats(userId) {
    const notificationIds = userNotifications.get(userId) || [];
    const notificationsList = notificationIds
      .map(id => notifications.get(id))
      .filter(Boolean);

    const byType = {};
    notificationsList.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    return {
      total: notificationsList.length,
      unread: unreadCounts.get(userId) || 0,
      byType,
      last24h: notificationsList.filter(n => Date.now() - n.createdAt < 86400000).length,
      last7d: notificationsList.filter(n => Date.now() - n.createdAt < 604800000).length
    };
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize
  function initialize() {
    console.log('[ProperNotificationsSystem] Module initialized');
  }

  initialize();

  return {
    NOTIFICATION_TYPES,
    PRIORITY,
    createNotification,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    markAsSeen,
    deleteNotification,
    clearAllNotifications,
    sendLikeNotification,
    sendCommentNotification,
    sendFollowNotification,
    sendMentionNotification,
    sendMessageNotification,
    sendLiveNotification,
    sendEventNotification,
    setNotificationSettings,
    getNotificationSettings,
    shouldSendNotification,
    getNotificationStats
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProperNotificationsSystem;
}

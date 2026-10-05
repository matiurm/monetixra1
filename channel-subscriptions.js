/**
 * Channel Subscriptions System for Monetixra
 * YouTube-style channel subscription management
 */

const ChannelSubscriptions = (function() {
  'use strict';

  // Storage
  let channels = new Map();
  let subscriptions = new Map();
  let userSubscriptions = new Map();
  let subscriptionSettings = new Map();

  /**
   * Create a new channel
   * @param {Object} channelData - Channel data
   * @returns {Object} Created channel
   */
  function createChannel(channelData) {
    const channelId = generateId();

    const channel = {
      id: channelId,
      name: channelData.name || 'New Channel',
      username: channelData.username || '',
      description: channelData.description || '',
      avatar: channelData.avatar || '',
      coverImage: channelData.coverImage || '',
      category: channelData.category || 'general',
      userId: channelData.userId,
      subscriberCount: 0,
      videoCount: 0,
      totalViews: 0,
      isVerified: false,
      isMonetized: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: {
        allowComments: true,
        allowRatings: true,
        showSubscriberCount: true
      }
    };

    channels.set(channelId, channel);

    return channel;
  }

  /**
   * Get channel by ID
   * @param {string} channelId - Channel ID
   * @returns {Object} Channel
   */
  function getChannel(channelId) {
    return channels.get(channelId);
  }

  /**
   * Get channel by user ID
   * @param {string} userId - User ID
   * @returns {Object} Channel
   */
  function getChannelByUserId(userId) {
    const allChannels = Array.from(channels.values());
    return allChannels.find(ch => ch.userId === userId) || null;
  }

  /**
   * Subscribe to channel
   * @param {string} channelId - Channel ID
   * @param {string} userId - User ID
   * @returns {Object} Result
   */
  function subscribeToChannel(channelId, userId) {
    const channel = channels.get(channelId);
    if (!channel) {
      return { success: false, message: 'Channel not found' };
    }

    const channelSubs = subscriptions.get(channelId) || [];
    const existingSub = channelSubs.find(s => s.userId === userId);

    if (existingSub) {
      return { success: false, message: 'Already subscribed' };
    }

    channelSubs.push({
      userId,
      subscribedAt: Date.now(),
      notificationEnabled: true
    });

    subscriptions.set(channelId, channelSubs);

    // Update channel subscriber count
    channel.subscriberCount = channelSubs.length;
    channel.updatedAt = Date.now();
    channels.set(channelId, channel);

    // Add to user's subscriptions
    const userSubs = userSubscriptions.get(userId) || [];
    userSubs.push(channelId);
    userSubscriptions.set(userId, userSubs);

    return { success: true, message: 'Subscribed successfully' };
  }

  /**
   * Unsubscribe from channel
   * @param {string} channelId - Channel ID
   * @param {string} userId - User ID
   * @returns {Object} Result
   */
  function unsubscribeFromChannel(channelId, userId) {
    const channel = channels.get(channelId);
    if (!channel) {
      return { success: false, message: 'Channel not found' };
    }

    const channelSubs = subscriptions.get(channelId) || [];
    const index = channelSubs.findIndex(s => s.userId === userId);

    if (index > -1) {
      channelSubs.splice(index, 1);
      subscriptions.set(channelId, channelSubs);

      // Update channel subscriber count
      channel.subscriberCount = channelSubs.length;
      channel.updatedAt = Date.now();
      channels.set(channelId, channel);

      // Remove from user's subscriptions
      const userSubs = userSubscriptions.get(userId) || [];
      const subIndex = userSubs.indexOf(channelId);
      if (subIndex > -1) {
        userSubs.splice(subIndex, 1);
        userSubscriptions.set(userId, userSubs);
      }

      return { success: true, message: 'Unsubscribed successfully' };
    }

    return { success: false, message: 'Not subscribed' };
  }

  /**
   * Check if user is subscribed
   * @param {string} channelId - Channel ID
   * @param {string} userId - User ID
   * @returns {boolean} Is subscribed
   */
  function isSubscribed(channelId, userId) {
    const channelSubs = subscriptions.get(channelId) || [];
    return channelSubs.some(s => s.userId === userId);
  }

  /**
   * Get channel subscribers
   * @param {string} channelId - Channel ID
   * @returns {Array} Subscribers
   */
  function getChannelSubscribers(channelId) {
    return subscriptions.get(channelId) || [];
  }

  /**
   * Get user's subscriptions
   * @param {string} userId - User ID
   * @returns {Array} Subscribed channels
   */
  function getUserSubscriptions(userId) {
    const subscriptionIds = userSubscriptions.get(userId) || [];
    return subscriptionIds.map(id => channels.get(id)).filter(Boolean);
  }

  /**
   * Get subscription feed (videos from subscribed channels)
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Feed videos
   */
  function getSubscriptionFeed(userId, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const subscriptionIds = userSubscriptions.get(userId) || [];

    // This would integrate with video system to get videos from subscribed channels
    // For now, return channel list
    return subscriptionIds.map(id => channels.get(id)).filter(Boolean);
  }

  /**
   * Update channel
   * @param {string} channelId - Channel ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated channel
   */
  function updateChannel(channelId, updates) {
    const channel = channels.get(channelId);
    if (!channel) return null;

    const updatedChannel = {
      ...channel,
      ...updates,
      updatedAt: Date.now()
    };

    channels.set(channelId, updatedChannel);
    return updatedChannel;
  }

  /**
   * Delete channel
   * @param {string} channelId - Channel ID
   * @returns {Object} Result
   */
  function deleteChannel(channelId) {
    const channel = channels.get(channelId);
    if (!channel) {
      return { success: false, message: 'Channel not found' };
    }

    channels.delete(channelId);
    subscriptions.delete(channelId);

    // Remove from all users' subscriptions
    userSubscriptions.forEach((subIds, userId) => {
      const index = subIds.indexOf(channelId);
      if (index > -1) {
        subIds.splice(index, 1);
        userSubscriptions.set(userId, subIds);
      }
    });

    return { success: true, message: 'Channel deleted successfully' };
  }

  /**
   * Search channels
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Array} Matching channels
   */
  function searchChannels(query, filters = {}) {
    const allChannels = Array.from(channels.values());

    return allChannels.filter(channel => {
      // Name match
      if (query && !channel.name.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      // Category filter
      if (filters.category && channel.category !== filters.category) {
        return false;
      }

      // Verified only filter
      if (filters.verifiedOnly && !channel.isVerified) {
        return false;
      }

      return true;
    });
  }

  /**
   * Set notification settings for subscription
   * @param {string} channelId - Channel ID
   * @param {string} userId - User ID
   * @param {boolean} enabled - Notification enabled
   * @returns {Object} Result
   */
  function setNotificationSettings(channelId, userId, enabled) {
    const channelSubs = subscriptions.get(channelId) || [];
    const sub = channelSubs.find(s => s.userId === userId);

    if (sub) {
      sub.notificationEnabled = enabled;
      subscriptions.set(channelId, channelSubs);
      return { success: true, message: 'Notification settings updated' };
    }

    return { success: false, message: 'Subscription not found' };
  }

  /**
   * Get trending channels
   * @param {number} limit - Number of channels to return
   * @returns {Array} Trending channels
   */
  function getTrendingChannels(limit = 10) {
    const allChannels = Array.from(channels.values());

    return allChannels
      .sort((a, b) => {
        const aScore = a.subscriberCount + (a.totalViews * 0.001);
        const bScore = b.subscriberCount + (b.totalViews * 0.001);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Get channel statistics
   * @param {string} channelId - Channel ID
   * @returns {Object} Statistics
   */
  function getChannelStats(channelId) {
    const channel = channels.get(channelId);
    const channelSubs = subscriptions.get(channelId) || [];

    if (!channel) return null;

    return {
      subscriberCount: channel.subscriberCount,
      videoCount: channel.videoCount,
      totalViews: channel.totalViews,
      isVerified: channel.isVerified,
      isMonetized: channel.isMonetized,
      createdAt: channel.createdAt,
      recentSubscribers: channelSubs.filter(s => Date.now() - s.subscribedAt < 604800000).length // Last 7 days
    };
  }

  /**
   * Verify channel
   * @param {string} channelId - Channel ID
   * @returns {Object} Result
   */
  function verifyChannel(channelId) {
    const channel = channels.get(channelId);
    if (!channel) {
      return { success: false, message: 'Channel not found' };
    }

    channel.isVerified = true;
    channel.updatedAt = Date.now();
    channels.set(channelId, channel);

    return { success: true, message: 'Channel verified' };
  }

  /**
   * Enable monetization for channel
   * @param {string} channelId - Channel ID
   * @returns {Object} Result
   */
  function enableMonetization(channelId) {
    const channel = channels.get(channelId);
    if (!channel) {
      return { success: false, message: 'Channel not found' };
    }

    if (!channel.isVerified) {
      return { success: false, message: 'Channel must be verified first' };
    }

    channel.isMonetized = true;
    channel.updatedAt = Date.now();
    channels.set(channelId, channel);

    return { success: true, message: 'Monetization enabled' };
  }

  /**
   * Increment channel video count
   * @param {string} channelId - Channel ID
   */
  function incrementVideoCount(channelId) {
    const channel = channels.get(channelId);
    if (channel) {
      channel.videoCount++;
      channel.updatedAt = Date.now();
      channels.set(channelId, channel);
    }
  }

  /**
   * Increment channel view count
   * @param {string} channelId - Channel ID
   * @param {number} views - Number of views to add
   */
  function incrementViewCount(channelId, views = 1) {
    const channel = channels.get(channelId);
    if (channel) {
      channel.totalViews += views;
      channel.updatedAt = Date.now();
      channels.set(channelId, channel);
    }
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
    console.log('[ChannelSubscriptions] Module initialized');
  }

  initialize();

  return {
    createChannel,
    getChannel,
    getChannelByUserId,
    subscribeToChannel,
    unsubscribeFromChannel,
    isSubscribed,
    getChannelSubscribers,
    getUserSubscriptions,
    getSubscriptionFeed,
    updateChannel,
    deleteChannel,
    searchChannels,
    setNotificationSettings,
    getTrendingChannels,
    getChannelStats,
    verifyChannel,
    enableMonetization,
    incrementVideoCount,
    incrementViewCount
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChannelSubscriptions;
}

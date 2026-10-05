/**
 * News Feed Algorithm for Monetixra
 * Implements intelligent post ranking based on multiple factors
 * Similar to Facebook/Instagram feed algorithms
 */

const NewsFeedAlgorithm = (function() {
  'use strict';

  // Configuration
  const CONFIG = {
    WEIGHTS: {
      recency: 0.3,           // How recent the post is
      engagement: 0.25,       // Likes, comments, shares
      relationship: 0.2,      // How close the user is to the poster
      content_type: 0.1,      // Video, image, text preference
      previous_interaction: 0.15 // User's past interactions
    },
    DECAY_FACTORS: {
      hourly: 0.95,
      daily: 0.7,
      weekly: 0.4
    },
    BOOST_FACTORS: {
      live: 3.0,              // Live streams get boost
      video: 1.5,             // Videos get boost
      image: 1.2,             // Images get small boost
      friend_post: 1.3,      // Friends' posts get boost
      trending: 2.0           // Trending posts get boost
    }
  };

  // User preferences storage
  let userPreferences = new Map();
  let userInteractions = new Map();
  let trendingPosts = new Set();

  /**
   * Calculate engagement score for a post
   * @param {Object} post - Post object
   * @returns {number} Engagement score (0-100)
   */
  function calculateEngagementScore(post) {
    const likes = post.likes || 0;
    const comments = post.comments || 0;
    const shares = post.shares || 0;
    const views = post.views || 0;

    // Weighted engagement calculation
    const score = (likes * 1) + (comments * 3) + (shares * 5) + (views * 0.1);

    // Normalize to 0-100
    return Math.min(score / 10, 100);
  }

  /**
   * Calculate recency score based on post age
   * @param {Object} post - Post object
   * @returns {number} Recency score (0-100)
   */
  function calculateRecencyScore(post) {
    const now = Date.now();
    const postTime = post.createdAt || post.timestamp || now;
    const ageHours = (now - postTime) / (1000 * 60 * 60);

    if (ageHours < 1) return 100;
    if (ageHours < 24) return 100 * Math.pow(CONFIG.DECAY_FACTORS.hourly, ageHours);
    if (ageHours < 168) return 100 * Math.pow(CONFIG.DECAY_FACTORS.daily, ageHours / 24);
    return 100 * Math.pow(CONFIG.DECAY_FACTORS.weekly, ageHours / 168);
  }

  /**
   * Calculate relationship score between users
   * @param {string} currentUserId - Current user ID
   * @param {string} postAuthorId - Post author ID
   * @returns {number} Relationship score (0-100)
   */
  function calculateRelationshipScore(currentUserId, postAuthorId) {
    if (currentUserId === postAuthorId) return 100;

    // Check if friends
    const userFriends = userInteractions.get(`${currentUserId}_friends`) || [];
    if (userFriends.includes(postAuthorId)) return 80;

    // Check interaction history
    const interactionKey = `${currentUserId}_${postAuthorId}`;
    const interactions = userInteractions.get(interactionKey) || 0;

    // Score based on interaction count
    return Math.min(interactions * 10, 70);
  }

  /**
   * Calculate content type score based on user preferences
   * @param {Object} post - Post object
   * @param {string} userId - User ID
   * @returns {number} Content type score (0-100)
   */
  function calculateContentTypeScore(post, userId) {
    const preferences = userPreferences.get(userId) || {
      video: 0.5,
      image: 0.3,
      text: 0.2
    };

    const type = post.type || 'text';
    let baseScore = 50;

    switch (type) {
      case 'video':
        baseScore = 50 + (preferences.video * 50);
        break;
      case 'image':
        baseScore = 50 + (preferences.image * 50);
        break;
      case 'text':
        baseScore = 50 + (preferences.text * 50);
        break;
    }

    return baseScore;
  }

  /**
   * Calculate previous interaction score
   * @param {Object} post - Post object
   * @param {string} userId - User ID
   * @returns {number} Previous interaction score (0-100)
   */
  function calculatePreviousInteractionScore(post, userId) {
    const authorId = post.authorId || post.userId;
    const interactionKey = `${userId}_${authorId}`;
    const interactions = userInteractions.get(interactionKey) || 0;

    return Math.min(interactions * 5, 100);
  }

  /**
   * Calculate overall feed score for a post
   * @param {Object} post - Post object
   * @param {string} userId - User ID
   * @returns {number} Overall score (0-100)
   */
  function calculateFeedScore(post, userId) {
    const engagementScore = calculateEngagementScore(post);
    const recencyScore = calculateRecencyScore(post);
    const relationshipScore = calculateRelationshipScore(userId, post.authorId || post.userId);
    const contentTypeScore = calculateContentTypeScore(post, userId);
    const previousInteractionScore = calculatePreviousInteractionScore(post, userId);

    // Weighted sum
    let score =
      (engagementScore * CONFIG.WEIGHTS.engagement) +
      (recencyScore * CONFIG.WEIGHTS.recency) +
      (relationshipScore * CONFIG.WEIGHTS.relationship) +
      (contentTypeScore * CONFIG.WEIGHTS.content_type) +
      (previousInteractionScore * CONFIG.WEIGHTS.previous_interaction);

    // Apply boost factors
    if (post.isLive) score *= CONFIG.BOOST_FACTORS.live;
    if (post.type === 'video') score *= CONFIG.BOOST_FACTORS.video;
    if (post.type === 'image') score *= CONFIG.BOOST_FACTORS.image;
    if (trendingPosts.has(post.id)) score *= CONFIG.BOOST_FACTORS.trending;

    // Normalize to 0-100
    return Math.min(score, 100);
  }

  /**
   * Sort posts by feed score
   * @param {Array} posts - Array of posts
   * @param {string} userId - User ID
   * @returns {Array} Sorted posts
   */
  function sortPostsByScore(posts, userId) {
    return posts
      .map(post => ({
        ...post,
        feedScore: calculateFeedScore(post, userId)
      }))
      .sort((a, b) => b.feedScore - a.feedScore);
  }

  /**
   * Record user interaction
   * @param {string} userId - User ID
   * @param {string} targetId - Target user ID or post ID
   * @param {string} type - Interaction type (like, comment, share, view)
   */
  function recordInteraction(userId, targetId, type) {
    const key = `${userId}_${targetId}`;
    const current = userInteractions.get(key) || 0;
    userInteractions.set(key, current + 1);

    // Update content type preferences
    if (type === 'view') {
      const preferences = userPreferences.get(userId) || {
        video: 0.5,
        image: 0.3,
        text: 0.2
      };

      // Increment preference for viewed content type
      // (would need to know content type from targetId)
      userPreferences.set(userId, preferences);
    }
  }

  /**
   * Mark post as trending
   * @param {string} postId - Post ID
   */
  function markAsTrending(postId) {
    trendingPosts.add(postId);
  }

  /**
   * Remove post from trending
   * @param {string} postId - Post ID
   */
  function removeFromTrending(postId) {
    trendingPosts.delete(postId);
  }

  /**
   * Get personalized feed for user
   * @param {Array} allPosts - All available posts
   * @param {string} userId - User ID
   * @param {Object} options - Feed options
   * @returns {Array} Personalized feed
   */
  function getPersonalizedFeed(allPosts, userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      contentType = null,
      timeRange = null
    } = options;

    let filteredPosts = allPosts;

    // Filter by content type if specified
    if (contentType) {
      filteredPosts = filteredPosts.filter(post => post.type === contentType);
    }

    // Filter by time range if specified
    if (timeRange) {
      const now = Date.now();
      const timeRangeMs = timeRange * 1000 * 60 * 60; // Convert hours to ms
      filteredPosts = filteredPosts.filter(post => {
        const postTime = post.createdAt || post.timestamp || now;
        return (now - postTime) < timeRangeMs;
      });
    }

    // Sort by feed score
    const sortedPosts = sortPostsByScore(filteredPosts, userId);

    // Apply pagination
    return sortedPosts.slice(offset, offset + limit);
  }

  /**
   * Get trending posts
   * @param {Array} posts - All posts
   * @param {number} limit - Number of posts to return
   * @returns {Array} Trending posts
   */
  function getTrendingPosts(posts, limit = 10) {
    return posts
      .filter(post => trendingPosts.has(post.id))
      .sort((a, b) => {
        const aScore = calculateEngagementScore(a);
        const bScore = calculateEngagementScore(b);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Calculate trending posts automatically
   * @param {Array} posts - All posts
   * @param {number} threshold - Engagement threshold
   */
  function calculateTrendingPosts(posts, threshold = 50) {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    posts.forEach(post => {
      const postTime = post.createdAt || post.timestamp || now;
      const engagementScore = calculateEngagementScore(post);

      // If post is recent and has high engagement, mark as trending
      if (postTime > oneDayAgo && engagementScore > threshold) {
        markAsTrending(post.id);
      } else {
        removeFromTrending(post.id);
      }
    });
  }

  /**
   * Update user preferences based on interactions
   * @param {string} userId - User ID
   * @param {string} contentType - Content type interacted with
   */
  function updateUserPreferences(userId, contentType) {
    const preferences = userPreferences.get(userId) || {
      video: 0.5,
      image: 0.3,
      text: 0.2
    };

    // Boost preference for interacted content type
    preferences[contentType] = Math.min(preferences[contentType] + 0.05, 1.0);

    // Normalize other preferences
    const total = preferences.video + preferences.image + preferences.text;
    preferences.video /= total;
    preferences.image /= total;
    preferences.text /= total;

    userPreferences.set(userId, preferences);
  }

  /**
   * Get user's feed history
   * @param {string} userId - User ID
   * @returns {Array} Feed history
   */
  function getFeedHistory(userId) {
    // Would need to implement feed history storage
    return [];
  }

  /**
   * Reset user preferences
   * @param {string} userId - User ID
   */
  function resetUserPreferences(userId) {
    userPreferences.delete(userId);
    userInteractions.delete(userId);
  }

  // Initialize with some sample data
  function initialize() {
    console.log('[NewsFeedAlgorithm] Initialized');
  }

  initialize();

  return {
    calculateFeedScore,
    sortPostsByScore,
    getPersonalizedFeed,
    getTrendingPosts,
    calculateTrendingPosts,
    recordInteraction,
    markAsTrending,
    removeFromTrending,
    updateUserPreferences,
    getFeedHistory,
    resetUserPreferences,
    CONFIG
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NewsFeedAlgorithm;
}

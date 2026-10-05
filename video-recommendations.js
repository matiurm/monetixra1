/**
 * Video Recommendations Algorithm for Monetixra
 * Content-based and collaborative filtering recommendations
 */

const VideoRecommendations = (function() {
  'use strict';

  // Storage
  let userPreferences = new Map();
  let watchHistory = new Map();
  let videoSimilarity = new Map();
  let trendingVideos = new Set();

  // Configuration
  const CONFIG = {
    WEIGHTS: {
      watchHistory: 0.4,
      contentSimilarity: 0.3,
      trending: 0.2,
      newVideos: 0.1
    },
    SIMILARITY_THRESHOLD: 0.5,
    MAX_RECOMMENDATIONS: 20
  };

  /**
   * Calculate content similarity between videos
   * @param {Object} video1 - First video
   * @param {Object} video2 - Second video
   * @returns {number} Similarity score (0-1)
   */
  function calculateContentSimilarity(video1, video2) {
    let score = 0;
    let factors = 0;

    // Category match
    if (video1.category === video2.category) {
      score += 0.3;
      factors++;
    }

    // Hashtag overlap
    const tags1 = video1.hashtags || [];
    const tags2 = video2.hashtags || [];
    const commonTags = tags1.filter(tag => tags2.includes(tag));
    if (commonTags.length > 0) {
      score += Math.min(commonTags.length * 0.1, 0.3);
      factors++;
    }

    // Creator similarity
    if (video1.userId === video2.userId) {
      score += 0.2;
      factors++;
    }

    // Duration similarity
    const durationDiff = Math.abs((video1.duration || 0) - (video2.duration || 0));
    if (durationDiff < 60) {
      score += 0.1;
      factors++;
    }

    // Type match
    if (video1.type === video2.type) {
      score += 0.1;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Get personalized recommendations for user
   * @param {string} userId - User ID
   * @param {Array} allVideos - All available videos
   * @param {Object} options - Query options
   * @returns {Array} Recommended videos
   */
  function getRecommendations(userId, allVideos, options = {}) {
    const { limit = 20, excludeWatched = true } = options;

    // Get user's watch history
    const userHistory = watchHistory.get(userId) || [];
    const watchedVideoIds = new Set(userHistory.map(h => h.videoId));

    // Calculate recommendation scores
    const scoredVideos = allVideos.map(video => {
      let score = 0;

      // Weight 1: Watch history based
      const historyMatches = userHistory.filter(h => {
        const watchedVideo = allVideos.find(v => v.id === h.videoId);
        if (!watchedVideo) return false;
        return calculateContentSimilarity(video, watchedVideo) > CONFIG.SIMILARITY_THRESHOLD;
      });
      score += historyMatches.length * CONFIG.WEIGHTS.watchHistory;

      // Weight 2: Content similarity with watched videos
      if (historyMatches.length > 0) {
        const avgSimilarity = historyMatches.reduce((sum, h) => {
          const watchedVideo = allVideos.find(v => v.id === h.videoId);
          return sum + (watchedVideo ? calculateContentSimilarity(video, watchedVideo) : 0);
        }, 0) / historyMatches.length;
        score += avgSimilarity * CONFIG.WEIGHTS.contentSimilarity * 10;
      }

      // Weight 3: Trending boost
      if (trendingVideos.has(video.id)) {
        score += CONFIG.WEIGHTS.trending * 10;
      }

      // Weight 4: New videos boost
      const videoAge = Date.now() - (video.createdAt || Date.now());
      if (videoAge < 86400000) { // Less than 1 day old
        score += CONFIG.WEIGHTS.newVideos * 10;
      }

      // Weight 5: Engagement
      const engagementScore = (video.likes || 0) + (video.comments || 0) * 2 + (video.shares || 0) * 3;
      score += engagementScore * 0.01;

      return { ...video, recommendationScore: score };
    });

    // Filter out watched videos if requested
    let filteredVideos = scoredVideos;
    if (excludeWatched) {
      filteredVideos = scoredVideos.filter(v => !watchedVideoIds.has(v.id));
    }

    // Sort by score and return top results
    return filteredVideos
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  /**
   * Get similar videos
   * @param {string} videoId - Video ID
   * @param {Array} allVideos - All available videos
   * @param {number} limit - Number of similar videos
   * @returns {Array} Similar videos
   */
  function getSimilarVideos(videoId, allVideos, limit = 10) {
    const targetVideo = allVideos.find(v => v.id === videoId);
    if (!targetVideo) return [];

    const scoredVideos = allVideos
      .filter(v => v.id !== videoId)
      .map(video => ({
        ...video,
        similarity: calculateContentSimilarity(targetVideo, video)
      }))
      .filter(v => v.similarity > CONFIG.SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scoredVideos;
  }

  /**
   * Record watch history
   * @param {string} userId - User ID
   * @param {string} videoId - Video ID
   * @param {number} watchTime - Watch time in seconds
   * @param {number} rating - User rating (1-5, optional)
   */
  function recordWatchHistory(userId, videoId, watchTime, rating = null) {
    const userHistory = watchHistory.get(userId) || [];
    const existingEntry = userHistory.find(h => h.videoId === videoId);

    if (existingEntry) {
      existingEntry.totalWatchTime += watchTime;
      existingEntry.watchCount += 1;
      existingEntry.lastWatchedAt = Date.now();
      if (rating !== null) {
        existingEntry.rating = rating;
      }
    } else {
      userHistory.push({
        videoId,
        totalWatchTime: watchTime,
        watchCount: 1,
        firstWatchedAt: Date.now(),
        lastWatchedAt: Date.now(),
        rating: rating
      });
    }

    watchHistory.set(userId, userHistory);

    // Update user preferences based on watch history
    updateUserPreferences(userId, videoId);
  }

  /**
   * Update user preferences based on watch history
   * @param {string} userId - User ID
   * @param {string} videoId - Video ID
   */
  function updateUserPreferences(userId, videoId) {
    const preferences = userPreferences.get(userId) || {
      categories: {},
      creators: {},
      types: {}
    };

    // This would integrate with video data to update preferences
    // For now, just increment a counter
    preferences.watchCount = (preferences.watchCount || 0) + 1;

    userPreferences.set(userId, preferences);
  }

  /**
   * Get user preferences
   * @param {string} userId - User ID
   * @returns {Object} User preferences
   */
  function getUserPreferences(userId) {
    return userPreferences.get(userId) || {
      categories: {},
      creators: {},
      types: {},
      watchCount: 0
    };
  }

  /**
   * Mark video as trending
   * @param {string} videoId - Video ID
   */
  function markAsTrending(videoId) {
    trendingVideos.add(videoId);
  }

  /**
   * Remove video from trending
   * @param {string} videoId - Video ID
   */
  function removeFromTrending(videoId) {
    trendingVideos.delete(videoId);
  }

  /**
   * Get trending videos
   * @param {Array} allVideos - All available videos
   * @param {number} limit - Number of videos
   * @returns {Array} Trending videos
   */
  function getTrendingVideos(allVideos, limit = 10) {
    return allVideos
      .filter(video => trendingVideos.has(video.id))
      .sort((a, b) => {
        const aScore = (a.likes || 0) + (a.views || 0) * 0.1;
        const bScore = (b.likes || 0) + (b.views || 0) * 0.1;
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Calculate trending videos automatically
   * @param {Array} allVideos - All available videos
   * @param {number} threshold - Engagement threshold
   */
  function calculateTrendingVideos(allVideos, threshold = 100) {
    const now = Date.now();
    const oneDayAgo = now - 86400000;

    allVideos.forEach(video => {
      const videoTime = video.createdAt || Date.now();
      const engagementScore = (video.likes || 0) + (video.comments || 0) * 2 + (video.views || 0) * 0.1;

      // If video is recent and has high engagement, mark as trending
      if (videoTime > oneDayAgo && engagementScore > threshold) {
        markAsTrending(video.id);
      } else {
        removeFromTrending(video.id);
      }
    });
  }

  /**
   * Get recommended videos based on category
   * @param {string} userId - User ID
   * @param {string} category - Category
   * @param {Array} allVideos - All available videos
   * @param {number} limit - Number of videos
   * @returns {Array} Recommended videos
   */
  function getRecommendationsByCategory(userId, category, allVideos, limit = 10) {
    const categoryVideos = allVideos.filter(v => v.category === category);
    return getRecommendations(userId, categoryVideos, { limit });
  }

  /**
   * Get recommended videos from specific creator
   * @param {string} userId - User ID
   * @param {string} creatorId - Creator ID
   * @param {Array} allVideos - All available videos
   * @param {number} limit - Number of videos
   * @returns {Array} Recommended videos
   */
  function getRecommendationsByCreator(userId, creatorId, allVideos, limit = 10) {
    const creatorVideos = allVideos.filter(v => v.userId === creatorId);
    return getRecommendations(userId, creatorVideos, { limit });
  }

  /**
   * Clear user watch history
   * @param {string} userId - User ID
   */
  function clearWatchHistory(userId) {
    watchHistory.delete(userId);
  }

  /**
   * Get watch history
   * @param {string} userId - User ID
   * @returns {Array} Watch history
   */
  function getWatchHistory(userId) {
    return watchHistory.get(userId) || [];
  }

  /**
   * Get recommendation statistics
   * @param {string} userId - User ID
   * @returns {Object} Statistics
   */
  function getRecommendationStats(userId) {
    const history = watchHistory.get(userId) || [];
    const preferences = userPreferences.get(userId) || {};

    return {
      totalVideosWatched: history.length,
      totalWatchTime: history.reduce((sum, h) => sum + h.totalWatchTime, 0),
      favoriteCategories: Object.entries(preferences.categories || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      favoriteCreators: Object.entries(preferences.creators || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }

  // Initialize
  function initialize() {
    console.log('[VideoRecommendations] Module initialized');
  }

  initialize();

  return {
    CONFIG,
    getRecommendations,
    getSimilarVideos,
    recordWatchHistory,
    getUserPreferences,
    markAsTrending,
    removeFromTrending,
    getTrendingVideos,
    calculateTrendingVideos,
    getRecommendationsByCategory,
    getRecommendationsByCreator,
    clearWatchHistory,
    getWatchHistory,
    getRecommendationStats
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoRecommendations;
}

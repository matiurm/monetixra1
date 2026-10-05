/**
 * Duet and Stitch Features for Monetixra
 * TikTok-style duet and stitch functionality
 */

const DuetStitchFeatures = (function() {
  'use strict';

  // Storage
  let duets = new Map();
  let stitches = new Map();
  let videoParts = new Map();

  /**
   * Create duet
   * @param {Object} duetData - Duet data
   * @returns {Object} Created duet
   */
  function createDuet(duetData) {
    const duetId = generateId();

    const duet = {
      id: duetId,
      originalVideoId: duetData.originalVideoId,
      userId: duetData.userId,
      userName: duetData.userName || '',
      userAvatar: duetData.userAvatar || '',
      side: duetData.side || 'right', // left or right
      layout: duetData.layout || 'split', // split, vertical, picture-in-picture
      createdAt: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0
    };

    duets.set(duetId, duet);
    return duet;
  }

  /**
   * Get duet by ID
   * @param {string} duetId - Duet ID
   * @returns {Object} Duet
   */
  function getDuet(duetId) {
    return duets.get(duetId);
  }

  /**
   * Get duets for video
   * @param {string} videoId - Original video ID
   * @returns {Array} Duets
   */
  function getDuetsForVideo(videoId) {
    const allDuets = Array.from(duets.values());
    return allDuets.filter(d => d.originalVideoId === videoId);
  }

  /**
   * Get user's duets
   * @param {string} userId - User ID
   * @returns {Array} Duets
   */
  function getUserDuets(userId) {
    const allDuets = Array.from(duets.values());
    return allDuets.filter(d => d.userId === userId);
  }

  /**
   * Create stitch
   * @param {Object} stitchData - Stitch data
   * @returns {Object} Created stitch
   */
  function createStitch(stitchData) {
    const stitchId = generateId();

    const stitch = {
      id: stitchId,
      originalVideoId: stitchData.originalVideoId,
      userId: stitchData.userId,
      userName: stitchData.userName || '',
      userAvatar: stitchData.userAvatar || '',
      position: stitchData.position || 'end', // start, end, middle
      trimStart: stitchData.trimStart || 0,
      trimEnd: stitchData.trimEnd || null,
      createdAt: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0
    };

    stitches.set(stitchId, stitch);
    return stitch;
  }

  /**
   * Get stitch by ID
   * @param {string} stitchId - Stitch ID
   * @returns {Object} Stitch
   */
  function getStitch(stitchId) {
    return stitches.get(stitchId);
  }

  /**
   * Get stitches for video
   * @param {string} videoId - Original video ID
   * @returns {Array} Stitches
   */
  function getStitchesForVideo(videoId) {
    const allStitches = Array.from(stitches.values());
    return allStitches.filter(s => s.originalVideoId === videoId);
  }

  /**
   * Get user's stitches
   * @param {string} userId - User ID
   * @returns {Array} Stitches
   */
  function getUserStitches(userId) {
    const allStitches = Array.from(stitches.values());
    return allStitches.filter(s => s.userId === userId);
  }

  /**
   * Create reaction video
   * @param {Object} reactionData - Reaction data
   * @returns {Object} Created reaction
   */
  function createReaction(reactionData) {
    const reactionId = generateId();

    const reaction = {
      id: reactionId,
      originalVideoId: reactionData.originalVideoId,
      userId: reactionData.userId,
      userName: reactionData.userName || '',
      userAvatar: reactionData.userAvatar || '',
      type: reactionData.type || 'reaction', // reaction, comment
      position: reactionData.position || 'floating',
      createdAt: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0
    };

    videoParts.set(reactionId, reaction);
    return reaction;
  }

  /**
   * Get reaction by ID
   * @param {string} reactionId - Reaction ID
   * @returns {Object} Reaction
   */
  function getReaction(reactionId) {
    return videoParts.get(reactionId);
  }

  /**
   * Get reactions for video
   * @param {string} videoId - Original video ID
   * @returns {Array} Reactions
   */
  function getReactionsForVideo(videoId) {
    const allReactions = Array.from(videoParts.values());
    return allReactions.filter(r => r.originalVideoId === videoId && r.type === 'reaction');
  }

  /**
   * Delete duet
   * @param {string} duetId - Duet ID
   * @returns {Object} Result
   */
  function deleteDuet(duetId) {
    duets.delete(duetId);
    return { success: true, message: 'Duet deleted' };
  }

  /**
   * Delete stitch
   * @param {string} stitchId - Stitch ID
   * @returns {Object} Result
   */
  function deleteStitch(stitchId) {
    stitches.delete(stitchId);
    return { success: true, message: 'Stitch deleted' };
  }

  /**
   * Delete reaction
   * @param {string} reactionId - Reaction ID
   * @returns {Object} Result
   */
  function deleteReaction(reactionId) {
    videoParts.delete(reactionId);
    return { success: true, message: 'Reaction deleted' };
  }

  /**
   * Get duet statistics
   * @param {string} videoId - Video ID
   * @returns {Object} Statistics
   */
  function getDuetStats(videoId) {
    const videoDuets = getDuetsForVideo(videoId);

    return {
      totalDuets: videoDuets.length,
      totalLikes: videoDuets.reduce((sum, d) => sum + d.likes, 0),
      totalViews: videoDuets.reduce((sum, d) => sum + d.views, 0),
      topDuets: videoDuets.sort((a, b) => b.likes - a.likes).slice(0, 5)
    };
  }

  /**
   * Get stitch statistics
   * @param {string} videoId - Video ID
   * @returns {Object} Statistics
   */
  function getStitchStats(videoId) {
    const videoStitches = getStitchesForVideo(videoId);

    return {
      totalStitches: videoStitches.length,
      totalLikes: videoStitches.reduce((sum, s) => sum + s.likes, 0),
      totalViews: videoStitches.reduce((sum, s) => sum + s.views, 0),
      topStitches: videoStitches.sort((a, b) => b.likes - a.likes).slice(0, 5)
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
    console.log('[DuetStitchFeatures] Module initialized');
  }

  initialize();

  return {
    createDuet,
    getDuet,
    getDuetsForVideo,
    getUserDuets,
    createStitch,
    getStitch,
    getStitchesForVideo,
    getUserStitches,
    createReaction,
    getReaction,
    getReactionsForVideo,
    deleteDuet,
    deleteStitch,
    deleteReaction,
    getDuetStats,
    getStitchStats
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DuetStitchFeatures;
}

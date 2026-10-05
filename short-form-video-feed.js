/**
 * Short-Form Video Feed for Monetixra
 * TikTok-style vertical video feed with smooth scrolling
 */

const ShortFormVideoFeed = (function() {
  'use strict';

  // Storage
  let videos = new Map();
  let feedQueue = new Map();
  let userInteractions = new Map();
  let trendingSounds = new Map();
  let videoSounds = new Map();

  // Feed state
  let currentFeed = [];
  let currentIndex = 0;
  let isPlaying = false;
  let currentVideo = null;

  // Configuration
  const CONFIG = {
    PRELOAD_COUNT: 3,
    SWIPE_THRESHOLD: 50,
    AUTO_PLAY_DELAY: 100,
    LOOP_ENABLED: true,
    VOLUME_ON_SWIPE: true
  };

  /**
   * Create short-form video
   * @param {Object} videoData - Video data
   * @returns {Object} Created video
   */
  function createVideo(videoData) {
    const videoId = generateId();

    const video = {
      id: videoId,
      url: videoData.url,
      thumbnail: videoData.thumbnail || '',
      soundId: videoData.soundId || null,
      caption: videoData.caption || '',
      hashtags: videoData.hashtags || [],
      userId: videoData.userId,
      userName: videoData.userName || '',
      userAvatar: videoData.userAvatar || '',
      createdAt: Date.now(),
      duration: videoData.duration || 0,
      aspectRatio: videoData.aspectRatio || '9:16',
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      isPinned: false,
      isFeatured: false,
      location: videoData.location || null,
      mentions: videoData.mentions || []
    };

    videos.set(videoId, video);
    return video;
  }

  /**
   * Initialize feed
   * @param {Array} videoIds - Video IDs to include in feed
   */
  function initializeFeed(videoIds) {
    currentFeed = videoIds.map(id => videos.get(id)).filter(Boolean);
    currentIndex = 0;
    console.log('[ShortFormVideoFeed] Feed initialized with', currentFeed.length, 'videos');
  }

  /**
   * Get current video
   * @returns {Object} Current video
   */
  function getCurrentVideo() {
    return currentFeed[currentIndex] || null;
  }

  /**
   * Get next video
   * @returns {Object} Next video
   */
  function getNextVideo() {
    if (currentIndex < currentFeed.length - 1) {
      currentIndex++;
      return getCurrentVideo();
    }
    return null;
  }

  /**
   * Get previous video
   * @returns {Object} Previous video
   */
  function getPreviousVideo() {
    if (currentIndex > 0) {
      currentIndex--;
      return getCurrentVideo();
    }
    return null;
  }

  /**
   * Swipe to next video
   */
  function swipeNext() {
    const nextVideo = getNextVideo();
    if (nextVideo) {
      playVideo(nextVideo);
    }
  }

  /**
   * Swipe to previous video
   */
  function swipePrevious() {
    const prevVideo = getPreviousVideo();
    if (prevVideo) {
      playVideo(prevVideo);
    }
  }

  /**
   * Play video
   * @param {Object} video - Video to play
   */
  function playVideo(video) {
    if (!video) return;

    currentVideo = video;
    isPlaying = true;

    // Record view
    recordView(video.id);

    // Auto-play sound if enabled
    if (CONFIG.VOLUME_ON_SWIPE && video.soundId) {
      playSound(video.soundId);
    }

    console.log('[ShortFormVideoFeed] Playing video:', video.id);
  }

  /**
   * Pause current video
   */
  function pauseVideo() {
    isPlaying = false;
    if (currentVideo) {
      console.log('[ShortFormVideoFeed] Paused video:', currentVideo.id);
    }
  }

  /**
   * Toggle play/pause
   */
  function togglePlayPause() {
    if (isPlaying) {
      pauseVideo();
    } else if (currentVideo) {
      playVideo(currentVideo);
    }
  }

  /**
   * Record view for video
   * @param {string} videoId - Video ID
   */
  function recordView(videoId) {
    const video = videos.get(videoId);
    if (video) {
      video.views++;
      videos.set(videoId, video);
    }
  }

  /**
   * Like video
   * @param {string} videoId - Video ID
   * @param {string} userId - User ID
   */
  function likeVideo(videoId, userId) {
    const video = videos.get(videoId);
    if (video) {
      const interactions = userInteractions.get(userId) || {};
      const videoInteractions = interactions[videoId] || {};

      if (!videoInteractions.liked) {
        video.likes++;
        videoInteractions.liked = true;
        interactions[videoId] = videoInteractions;
        userInteractions.set(userId, interactions);
        videos.set(videoId, video);
      }
    }
  }

  /**
   * Unlike video
   * @param {string} videoId - Video ID
   * @param {string} userId - User ID
   */
  function unlikeVideo(videoId, userId) {
    const video = videos.get(videoId);
    if (video) {
      const interactions = userInteractions.get(userId) || {};
      const videoInteractions = interactions[videoId] || {};

      if (videoInteractions.liked) {
        video.likes--;
        videoInteractions.liked = false;
        interactions[videoId] = videoInteractions;
        userInteractions.set(userId, interactions);
        videos.set(videoId, video);
      }
    }
  }

  /**
   * Comment on video
   * @param {string} videoId - Video ID
   * @param {string} userId - User ID
   * @param {string} comment - Comment text
   */
  function commentVideo(videoId, userId, comment) {
    const video = videos.get(videoId);
    if (video) {
      video.comments++;
      videos.set(videoId, video);
    }
  }

  /**
   * Share video
   * @param {string} videoId - Video ID
   * @param {string} userId - User ID
   * @param {string} platform - Share platform
   */
  function shareVideo(videoId, userId, platform) {
    const video = videos.get(videoId);
    if (video) {
      video.shares++;
      videos.set(videoId, video);
    }
  }

  /**
   * Save video
   * @param {string} videoId - Video ID
   * @param {string} userId - User ID
   */
  function saveVideo(videoId, userId) {
    const interactions = userInteractions.get(userId) || {};
    const videoInteractions = interactions[videoId] || {};

    if (!videoInteractions.saved) {
      videoInteractions.saved = true;
      interactions[videoId] = videoInteractions;
      userInteractions.set(userId, interactions);
    }
  }

  /**
   * Unsave video
   * @param {string} videoId - Video ID
   * @param {string} userId - User ID
   */
  function unsaveVideo(videoId, userId) {
    const interactions = userInteractions.get(userId) || {};
    const videoInteractions = interactions[videoId] || {};

    if (videoInteractions.saved) {
      videoInteractions.saved = false;
      interactions[videoId] = videoInteractions;
      userInteractions.set(userId, interactions);
    }
  }

  /**
   * Create sound
   * @param {Object} soundData - Sound data
   * @returns {Object} Created sound
   */
  function createSound(soundData) {
    const soundId = generateId();

    const sound = {
      id: soundId,
      url: soundData.url,
      title: soundData.title || '',
      artist: soundData.artist || '',
      duration: soundData.duration || 0,
      coverImage: soundData.coverImage || '',
      createdAt: Date.now(),
      useCount: 0,
      isTrending: false
    };

    trendingSounds.set(soundId, sound);
    return sound;
  }

  /**
   * Play sound
   * @param {string} soundId - Sound ID
   */
  function playSound(soundId) {
    const sound = trendingSounds.get(soundId);
    if (sound) {
      sound.useCount++;
      trendingSounds.set(soundId, sound);
      console.log('[ShortFormVideoFeed] Playing sound:', sound.title);
    }
  }

  /**
   * Get trending sounds
   * @param {number} limit - Number of sounds to return
   * @returns {Array} Trending sounds
   */
  function getTrendingSounds(limit = 10) {
    const allSounds = Array.from(trendingSounds.values());

    return allSounds
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit);
  }

  /**
   * Get videos by sound
   * @param {string} soundId - Sound ID
   * @returns {Array} Videos using the sound
   */
  function getVideosBySound(soundId) {
    const allVideos = Array.from(videos.values());
    return allVideos.filter(video => video.soundId === soundId);
  }

  /**
   * Get for-you feed (personalized)
   * @param {string} userId - User ID
   * @param {number} limit - Number of videos to return
   * @returns {Array} Personalized feed
   */
  function getForYouFeed(userId, limit = 20) {
    const allVideos = Array.from(videos.values());
    const interactions = userInteractions.get(userId) || {};

    // Calculate engagement score for each video
    const scoredVideos = allVideos.map(video => {
      const videoInteractions = interactions[video.id] || {};
      let score = 0;

      // Boost based on user's interactions
      if (videoInteractions.liked) score += 10;
      if (videoInteractions.saved) score += 5;
      if (videoInteractions.shared) score += 5;

      // Boost based on sound preference
      if (video.soundId) {
        const sound = trendingSounds.get(video.soundId);
        if (sound && sound.useCount > 100) score += 3;
      }

      // Boost based on hashtag preferences
      if (video.hashtags && video.hashtags.length > 0) {
        score += video.hashtags.length * 0.5;
      }

      // Boost trending videos
      if (video.isFeatured) score += 5;

      return { ...video, score };
    });

    // Sort by score and return top videos
    return scoredVideos
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get following feed (videos from followed users)
   * @param {string} userId - User ID
   * @param {Array} followingIds - IDs of followed users
   * @param {number} limit - Number of videos to return
   * @returns {Array} Following feed
   */
  function getFollowingFeed(userId, followingIds, limit = 20) {
    const allVideos = Array.from(videos.values());

    return allVideos
      .filter(video => followingIds.includes(video.userId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Search videos
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Array} Matching videos
   */
  function searchVideos(query, filters = {}) {
    const allVideos = Array.from(videos.values());

    return allVideos.filter(video => {
      // Caption match
      if (query && !video.caption.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      // Hashtag filter
      if (filters.hashtag && !video.hashtags.includes(filters.hashtag)) {
        return false;
      }

      // Sound filter
      if (filters.soundId && video.soundId !== filters.soundId) {
        return false;
      }

      // User filter
      if (filters.userId && video.userId !== filters.userId) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get saved videos
   * @param {string} userId - User ID
   * @returns {Array} Saved videos
   */
  function getSavedVideos(userId) {
    const interactions = userInteractions.get(userId) || {};
    const savedVideoIds = Object.keys(interactions).filter(
      id => interactions[id].saved
    );

    return savedVideoIds.map(id => videos.get(id)).filter(Boolean);
  }

  /**
   * Pin video
   * @param {string} videoId - Video ID
   */
  function pinVideo(videoId) {
    const video = videos.get(videoId);
    if (video) {
      video.isPinned = true;
      videos.set(videoId, video);
    }
  }

  /**
   * Unpin video
   * @param {string} videoId - Video ID
   */
  function unpinVideo(videoId) {
    const video = videos.get(videoId);
    if (video) {
      video.isPinned = false;
      videos.set(videoId, video);
    }
  }

  /**
   * Feature video
   * @param {string} videoId - Video ID
   */
  function featureVideo(videoId) {
    const video = videos.get(videoId);
    if (video) {
      video.isFeatured = true;
      videos.set(videoId, video);
    }
  }

  /**
   * Unfeature video
   * @param {string} videoId - Video ID
   */
  function unfeatureVideo(videoId) {
    const video = videos.get(videoId);
    if (video) {
      video.isFeatured = false;
      videos.set(videoId, video);
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
    console.log('[ShortFormVideoFeed] Module initialized');
  }

  initialize();

  return {
    CONFIG,
    createVideo,
    initializeFeed,
    getCurrentVideo,
    getNextVideo,
    getPreviousVideo,
    swipeNext,
    swipePrevious,
    playVideo,
    pauseVideo,
    togglePlayPause,
    likeVideo,
    unlikeVideo,
    commentVideo,
    shareVideo,
    saveVideo,
    unsaveVideo,
    createSound,
    playSound,
    getTrendingSounds,
    getVideosBySound,
    getForYouFeed,
    getFollowingFeed,
    searchVideos,
    getSavedVideos,
    pinVideo,
    unpinVideo,
    featureVideo,
    unfeatureVideo
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShortFormVideoFeed;
}

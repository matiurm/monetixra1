/**
 * Playlist System for Monetixra
 * YouTube-style playlist management
 */

const PlaylistSystem = (function() {
  'use strict';

  // Storage
  let playlists = new Map();
  let playlistVideos = new Map();
  let userPlaylists = new Map();
  let watchHistory = new Map();

  /**
   * Create a new playlist
   * @param {Object} playlistData - Playlist data
   * @returns {Object} Created playlist
   */
  function createPlaylist(playlistData) {
    const playlistId = generateId();

    const playlist = {
      id: playlistId,
      name: playlistData.name || 'New Playlist',
      description: playlistData.description || '',
      coverImage: playlistData.coverImage || '',
      isPublic: playlistData.isPublic !== false,
      userId: playlistData.userId,
      videoCount: 0,
      totalDuration: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: {
        shuffle: false,
        repeat: 'none', // none, one, all
        autoPlay: true
      }
    };

    playlists.set(playlistId, playlist);

    // Add to user's playlists
    const userPlaylistList = userPlaylists.get(playlistData.userId) || [];
    userPlaylistList.push(playlistId);
    userPlaylists.set(playlistData.userId, userPlaylistList);

    return playlist;
  }

  /**
   * Get playlist by ID
   * @param {string} playlistId - Playlist ID
   * @returns {Object} Playlist
   */
  function getPlaylist(playlistId) {
    return playlists.get(playlistId);
  }

  /**
   * Add video to playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} videoId - Video ID
   * @param {number} position - Position in playlist (optional)
   * @returns {Object} Result
   */
  function addVideoToPlaylist(playlistId, videoId, position = null) {
    const playlist = playlists.get(playlistId);
    if (!playlist) {
      return { success: false, message: 'Playlist not found' };
    }

    const videos = playlistVideos.get(playlistId) || [];

    // Check if video already exists
    if (videos.some(v => v.videoId === videoId)) {
      return { success: false, message: 'Video already in playlist' };
    }

    const videoEntry = {
      videoId,
      addedAt: Date.now(),
      position: position !== null ? position : videos.length
    };

    if (position !== null && position < videos.length) {
      videos.splice(position, 0, videoEntry);
      // Update positions
      videos.forEach((v, index) => v.position = index);
    } else {
      videos.push(videoEntry);
    }

    playlistVideos.set(playlistId, videos);

    // Update playlist
    playlist.videoCount = videos.length;
    playlist.updatedAt = Date.now();
    playlists.set(playlistId, playlist);

    return { success: true, message: 'Video added to playlist' };
  }

  /**
   * Remove video from playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} videoId - Video ID
   * @returns {Object} Result
   */
  function removeVideoFromPlaylist(playlistId, videoId) {
    const playlist = playlists.get(playlistId);
    if (!playlist) {
      return { success: false, message: 'Playlist not found' };
    }

    const videos = playlistVideos.get(playlistId) || [];
    const index = videos.findIndex(v => v.videoId === videoId);

    if (index > -1) {
      videos.splice(index, 1);
      playlistVideos.set(playlistId, videos);

      // Update positions
      videos.forEach((v, i) => v.position = i);

      // Update playlist
      playlist.videoCount = videos.length;
      playlist.updatedAt = Date.now();
      playlists.set(playlistId, playlist);

      return { success: true, message: 'Video removed from playlist' };
    }

    return { success: false, message: 'Video not found in playlist' };
  }

  /**
   * Get videos in playlist
   * @param {string} playlistId - Playlist ID
   * @returns {Array} Videos
   */
  function getPlaylistVideos(playlistId) {
    return playlistVideos.get(playlistId) || [];
  }

  /**
   * Move video in playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} videoId - Video ID
   * @param {number} newPosition - New position
   * @returns {Object} Result
   */
  function moveVideoInPlaylist(playlistId, videoId, newPosition) {
    const videos = playlistVideos.get(playlistId) || [];
    const currentIndex = videos.findIndex(v => v.videoId === videoId);

    if (currentIndex === -1) {
      return { success: false, message: 'Video not found in playlist' };
    }

    if (newPosition < 0 || newPosition >= videos.length) {
      return { success: false, message: 'Invalid position' };
    }

    // Remove from current position
    const [video] = videos.splice(currentIndex, 1);

    // Insert at new position
    videos.splice(newPosition, 0, video);

    // Update all positions
    videos.forEach((v, index) => v.position = index);

    playlistVideos.set(playlistId, videos);

    // Update playlist
    const playlist = playlists.get(playlistId);
    if (playlist) {
      playlist.updatedAt = Date.now();
      playlists.set(playlistId, playlist);
    }

    return { success: true, message: 'Video moved successfully' };
  }

  /**
   * Get user's playlists
   * @param {string} userId - User ID
   * @returns {Array} Playlists
   */
  function getUserPlaylists(userId) {
    const playlistIds = userPlaylists.get(userId) || [];
    return playlistIds.map(id => playlists.get(id)).filter(Boolean);
  }

  /**
   * Update playlist
   * @param {string} playlistId - Playlist ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated playlist
   */
  function updatePlaylist(playlistId, updates) {
    const playlist = playlists.get(playlistId);
    if (!playlist) return null;

    const updatedPlaylist = {
      ...playlist,
      ...updates,
      updatedAt: Date.now()
    };

    playlists.set(playlistId, updatedPlaylist);
    return updatedPlaylist;
  }

  /**
   * Delete playlist
   * @param {string} playlistId - Playlist ID
   * @returns {Object} Result
   */
  function deletePlaylist(playlistId) {
    const playlist = playlists.get(playlistId);
    if (!playlist) {
      return { success: false, message: 'Playlist not found' };
    }

    playlists.delete(playlistId);
    playlistVideos.delete(playlistId);

    // Remove from user's playlists
    const userPlaylistList = userPlaylists.get(playlist.userId) || [];
    const index = userPlaylistList.indexOf(playlistId);
    if (index > -1) {
      userPlaylistList.splice(index, 1);
      userPlaylists.set(playlist.userId, userPlaylistList);
    }

    return { success: true, message: 'Playlist deleted successfully' };
  }

  /**
   * Duplicate playlist
   * @param {string} playlistId - Playlist ID to duplicate
   * @param {string} userId - User ID creating the duplicate
   * @returns {Object} New playlist
   */
  function duplicatePlaylist(playlistId, userId) {
    const originalPlaylist = playlists.get(playlistId);
    if (!originalPlaylist) return null;

    const newPlaylist = createPlaylist({
      name: `${originalPlaylist.name} (Copy)`,
      description: originalPlaylist.description,
      coverImage: originalPlaylist.coverImage,
      isPublic: originalPlaylist.isPublic,
      userId
    });

    // Copy videos
    const originalVideos = playlistVideos.get(playlistId) || [];
    originalVideos.forEach(video => {
      addVideoToPlaylist(newPlaylist.id, video.videoId);
    });

    return newPlaylist;
  }

  /**
   * Share playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} shareWith - User ID to share with
   * @returns {Object} Result
   */
  function sharePlaylist(playlistId, shareWith) {
    const playlist = playlists.get(playlistId);
    if (!playlist) {
      return { success: false, message: 'Playlist not found' };
    }

    if (!playlist.isPublic) {
      return { success: false, message: 'Cannot share private playlist' };
    }

    // Implement sharing logic
    const sharedWith = playlist.sharedWith || [];
    if (!sharedWith.includes(shareWith)) {
      sharedWith.push(shareWith);
      playlist.sharedWith = sharedWith;
      playlists.set(playlistId, playlist);
    }

    return { success: true, message: 'Playlist shared successfully' };
  }

  /**
   * Get next video in playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} currentVideoId - Current video ID
   * @returns {Object} Next video
   */
  function getNextVideo(playlistId, currentVideoId) {
    const videos = playlistVideos.get(playlistId) || [];
    const playlist = playlists.get(playlistId);

    if (!playlist || videos.length === 0) return null;

    const currentIndex = videos.findIndex(v => v.videoId === currentVideoId);

    if (currentIndex === -1) {
      return videos[0]; // Return first video if current not found
    }

    const settings = playlist.settings || {};

    if (settings.repeat === 'one') {
      return videos[currentIndex]; // Repeat current video
    }

    if (currentIndex < videos.length - 1) {
      return videos[currentIndex + 1];
    } else if (settings.repeat === 'all') {
      return videos[0]; // Loop back to first video
    }

    return null; // End of playlist
  }

  /**
   * Get previous video in playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} currentVideoId - Current video ID
   * @returns {Object} Previous video
   */
  function getPreviousVideo(playlistId, currentVideoId) {
    const videos = playlistVideos.get(playlistId) || [];

    if (videos.length === 0) return null;

    const currentIndex = videos.findIndex(v => v.videoId === currentVideoId);

    if (currentIndex === -1) {
      return videos[videos.length - 1]; // Return last video if current not found
    }

    if (currentIndex > 0) {
      return videos[currentIndex - 1];
    }

    return null; // First video
  }

  /**
   * Shuffle playlist
   * @param {string} playlistId - Playlist ID
   * @returns {Object} Result
   */
  function shufflePlaylist(playlistId) {
    const videos = playlistVideos.get(playlistId) || [];
    const playlist = playlists.get(playlistId);

    if (!playlist) {
      return { success: false, message: 'Playlist not found' };
    }

    // Fisher-Yates shuffle
    for (let i = videos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [videos[i], videos[j]] = [videos[j], videos[i]];
    }

    // Update positions
    videos.forEach((v, index) => v.position = index);

    playlistVideos.set(playlistId, videos);

    // Update playlist settings
    playlist.settings.shuffle = true;
    playlist.updatedAt = Date.now();
    playlists.set(playlistId, playlist);

    return { success: true, message: 'Playlist shuffled' };
  }

  /**
   * Set repeat mode
   * @param {string} playlistId - Playlist ID
   * @param {string} mode - Repeat mode (none, one, all)
   * @returns {Object} Result
   */
  function setRepeatMode(playlistId, mode) {
    const playlist = playlists.get(playlistId);
    if (!playlist) {
      return { success: false, message: 'Playlist not found' };
    }

    if (!['none', 'one', 'all'].includes(mode)) {
      return { success: false, message: 'Invalid repeat mode' };
    }

    playlist.settings.repeat = mode;
    playlist.updatedAt = Date.now();
    playlists.set(playlistId, playlist);

    return { success: true, message: `Repeat mode set to ${mode}` };
  }

  /**
   * Get playlist statistics
   * @param {string} playlistId - Playlist ID
   * @returns {Object} Statistics
   */
  function getPlaylistStats(playlistId) {
    const playlist = playlists.get(playlistId);
    const videos = playlistVideos.get(playlistId) || [];

    if (!playlist) return null;

    return {
      videoCount: videos.length,
      totalDuration: videos.reduce((sum, v) => sum + (v.duration || 0), 0),
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      isPublic: playlist.isPublic,
      settings: playlist.settings
    };
  }

  /**
   * Search playlists
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Array} Matching playlists
   */
  function searchPlaylists(query, filters = {}) {
    const allPlaylists = Array.from(playlists.values());

    return allPlaylists.filter(playlist => {
      // Name match
      if (query && !playlist.name.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      // Public only filter
      if (filters.publicOnly && !playlist.isPublic) {
        return false;
      }

      // User filter
      if (filters.userId && playlist.userId !== filters.userId) {
        return false;
      }

      return true;
    });
  }

  /**
   * Record watch in playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} videoId - Video ID
   * @param {number} watchTime - Watch time in seconds
   */
  function recordWatchInPlaylist(playlistId, videoId, watchTime) {
    const key = `${playlistId}_${videoId}`;
    const history = watchHistory.get(key) || {
      totalWatchTime: 0,
      watchCount: 0,
      lastWatchedAt: null
    };

    history.totalWatchTime += watchTime;
    history.watchCount += 1;
    history.lastWatchedAt = Date.now();

    watchHistory.set(key, history);
  }

  /**
   * Get watch progress in playlist
   * @param {string} playlistId - Playlist ID
   * @returns {Object} Watch progress
   */
  function getWatchProgress(playlistId) {
    const videos = playlistVideos.get(playlistId) || [];
    let watchedCount = 0;
    let totalWatchTime = 0;

    videos.forEach(video => {
      const key = `${playlistId}_${video.videoId}`;
      const history = watchHistory.get(key);
      if (history && history.totalWatchTime > 0) {
        watchedCount++;
        totalWatchTime += history.totalWatchTime;
      }
    });

    return {
      totalVideos: videos.length,
      watchedVideos: watchedCount,
      progress: videos.length > 0 ? (watchedCount / videos.length) * 100 : 0,
      totalWatchTime
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
    console.log('[PlaylistSystem] Module initialized');
  }

  initialize();

  return {
    createPlaylist,
    getPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistVideos,
    moveVideoInPlaylist,
    getUserPlaylists,
    updatePlaylist,
    deletePlaylist,
    duplicatePlaylist,
    sharePlaylist,
    getNextVideo,
    getPreviousVideo,
    shufflePlaylist,
    setRepeatMode,
    getPlaylistStats,
    searchPlaylists,
    recordWatchInPlaylist,
    getWatchProgress
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlaylistSystem;
}

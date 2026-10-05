/**
 * Enhanced Video Player for Monetixra
 * YouTube-style video player with advanced controls
 */

const EnhancedVideoPlayer = (function() {
  'use strict';

  // Player state
  let currentPlayer = null;
  let playerState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackSpeed: 1,
    isMuted: false,
    isFullscreen: false,
    isPip: false,
    quality: 'auto',
    aspectRatio: '16:9'
  };

  // Storage for video data
  let videoData = new Map();
  let watchHistory = new Map();
  let bookmarks = new Map();

  /**
   * Initialize video player
   * @param {HTMLElement} videoElement - Video element
   * @param {Object} options - Player options
   * @returns {Object} Player instance
   */
  function initializePlayer(videoElement, options = {}) {
    if (!videoElement) {
      console.error('[EnhancedVideoPlayer] Video element required');
      return null;
    }

    currentPlayer = videoElement;

    // Apply options
    const config = {
      autoplay: options.autoplay || false,
      controls: options.controls !== false,
      loop: options.loop || false,
      muted: options.muted || false,
      preload: options.preload || 'metadata',
      poster: options.poster || '',
      quality: options.quality || 'auto',
      ...options
    };

    // Set video attributes
    videoElement.autoplay = config.autoplay;
    videoElement.controls = config.controls;
    videoElement.loop = config.loop;
    videoElement.muted = config.muted;
    videoElement.preload = config.preload;
    if (config.poster) videoElement.poster = config.poster;

    // Add event listeners
    addVideoEventListeners(videoElement);

    // Create custom controls if needed
    if (config.customControls) {
      createCustomControls(videoElement);
    }

    console.log('[EnhancedVideoPlayer] Player initialized');
    return {
      videoElement,
      play,
      pause,
      seek,
      setVolume,
      setPlaybackSpeed,
      toggleFullscreen,
      togglePictureInPicture,
      setQuality,
      getWatchHistory,
      addBookmark,
      removeBookmark,
      getBookmarks
    };
  }

  /**
   * Add video event listeners
   * @param {HTMLElement} videoElement - Video element
   */
  function addVideoEventListeners(videoElement) {
    videoElement.addEventListener('play', () => {
      playerState.isPlaying = true;
      console.log('[EnhancedVideoPlayer] Video playing');
    });

    videoElement.addEventListener('pause', () => {
      playerState.isPlaying = false;
      console.log('[EnhancedVideoPlayer] Video paused');
    });

    videoElement.addEventListener('timeupdate', () => {
      playerState.currentTime = videoElement.currentTime;
      playerState.duration = videoElement.duration;
    });

    videoElement.addEventListener('volumechange', () => {
      playerState.volume = videoElement.volume;
      playerState.isMuted = videoElement.muted;
    });

    videoElement.addEventListener('ratechange', () => {
      playerState.playbackSpeed = videoElement.playbackRate;
    });

    videoElement.addEventListener('loadedmetadata', () => {
      playerState.duration = videoElement.duration;
      console.log('[EnhancedVideoPlayer] Metadata loaded:', videoElement.duration);
    });

    videoElement.addEventListener('ended', () => {
      playerState.isPlaying = false;
      console.log('[EnhancedVideoPlayer] Video ended');
    });

    videoElement.addEventListener('error', (e) => {
      console.error('[EnhancedVideoPlayer] Video error:', e);
    });
  }

  /**
   * Play video
   */
  function play() {
    if (currentPlayer) {
      currentPlayer.play();
    }
  }

  /**
   * Pause video
   */
  function pause() {
    if (currentPlayer) {
      currentPlayer.pause();
    }
  }

  /**
   * Seek to specific time
   * @param {number} time - Time in seconds
   */
  function seek(time) {
    if (currentPlayer) {
      currentPlayer.currentTime = time;
    }
  }

  /**
   * Set volume
   * @param {number} volume - Volume (0-1)
   */
  function setVolume(volume) {
    if (currentPlayer) {
      currentPlayer.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Toggle mute
   */
  function toggleMute() {
    if (currentPlayer) {
      currentPlayer.muted = !currentPlayer.muted;
    }
  }

  /**
   * Set playback speed
   * @param {number} speed - Playback speed (0.25-2.0)
   */
  function setPlaybackSpeed(speed) {
    if (currentPlayer) {
      const validSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
      const closestSpeed = validSpeeds.reduce((prev, curr) =>
        Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev
      );
      currentPlayer.playbackRate = closestSpeed;
    }
  }

  /**
   * Toggle fullscreen
   */
  function toggleFullscreen() {
    if (!currentPlayer) return;

    if (!document.fullscreenElement) {
      currentPlayer.requestFullscreen().catch(err => {
        console.error('[EnhancedVideoPlayer] Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Toggle picture-in-picture mode
   */
  function togglePictureInPicture() {
    if (!currentPlayer) return;

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      currentPlayer.requestPictureInPicture().catch(err => {
        console.error('[EnhancedVideoPlayer] PiP error:', err);
      });
    }
  }

  /**
   * Set video quality
   * @param {string} quality - Quality level (auto, 1080p, 720p, 480p, 360p)
   */
  function setQuality(quality) {
    playerState.quality = quality;
    // Implementation depends on video source and streaming technology
    console.log('[EnhancedVideoPlayer] Quality set to:', quality);
  }

  /**
   * Create custom video controls
   * @param {HTMLElement} videoElement - Video element
   */
  function createCustomControls(videoElement) {
    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'video-controls custom-controls';

    // Play/Pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'control-btn play-pause';
    playPauseBtn.innerHTML = '▶';
    playPauseBtn.addEventListener('click', () => {
      if (videoElement.paused) {
        videoElement.play();
        playPauseBtn.innerHTML = '⏸';
      } else {
        videoElement.pause();
        playPauseBtn.innerHTML = '▶';
      }
    });

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressBar.appendChild(progressFill);

    // Time display
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'time-display';
    timeDisplay.textContent = '0:00 / 0:00';

    // Volume control
    const volumeBtn = document.createElement('button');
    volumeBtn.className = 'control-btn volume';
    volumeBtn.innerHTML = '🔊';
    volumeBtn.addEventListener('click', toggleMute);

    // Speed control
    const speedBtn = document.createElement('button');
    speedBtn.className = 'control-btn speed';
    speedBtn.textContent = '1x';
    speedBtn.addEventListener('click', () => {
      const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
      const currentIndex = speeds.indexOf(playerState.playbackSpeed);
      const nextIndex = (currentIndex + 1) % speeds.length;
      setPlaybackSpeed(speeds[nextIndex]);
      speedBtn.textContent = speeds[nextIndex] + 'x';
    });

    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'control-btn fullscreen';
    fullscreenBtn.innerHTML = '⛶';
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // PiP button
    const pipBtn = document.createElement('button');
    pipBtn.className = 'control-btn pip';
    pipBtn.innerHTML = '📺';
    pipBtn.addEventListener('click', togglePictureInPicture);

    // Assemble controls
    controlsContainer.appendChild(playPauseBtn);
    controlsContainer.appendChild(progressBar);
    controlsContainer.appendChild(timeDisplay);
    controlsContainer.appendChild(volumeBtn);
    controlsContainer.appendChild(speedBtn);
    controlsContainer.appendChild(pipBtn);
    controlsContainer.appendChild(fullscreenBtn);

    // Add to video container
    videoElement.parentNode.appendChild(controlsContainer);

    // Update progress bar
    videoElement.addEventListener('timeupdate', () => {
      const progress = (videoElement.currentTime / videoElement.duration) * 100;
      progressFill.style.width = progress + '%';
      timeDisplay.textContent = formatTime(videoElement.currentTime) + ' / ' + formatTime(videoElement.duration);
    });

    // Seek on progress bar click
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoElement.currentTime = percent * videoElement.duration;
    });
  }

  /**
   * Format time as MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Record watch history
   * @param {string} userId - User ID
   * @param {string} videoId - Video ID
   * @param {number} watchTime - Watch time in seconds
   */
  function recordWatchHistory(userId, videoId, watchTime) {
    const history = watchHistory.get(userId) || [];
    const existingEntry = history.find(h => h.videoId === videoId);

    if (existingEntry) {
      existingEntry.lastWatched = Date.now();
      existingEntry.totalWatchTime += watchTime;
      existingEntry.watchCount += 1;
    } else {
      history.push({
        videoId,
        firstWatched: Date.now(),
        lastWatched: Date.now(),
        totalWatchTime: watchTime,
        watchCount: 1
      });
    }

    watchHistory.set(userId, history);
  }

  /**
   * Get watch history for user
   * @param {string} userId - User ID
   * @returns {Array} Watch history
   */
  function getWatchHistory(userId) {
    return watchHistory.get(userId) || [];
  }

  /**
   * Add bookmark
   * @param {string} userId - User ID
   * @param {string} videoId - Video ID
   * @param {number} timestamp - Timestamp in seconds
   * @param {string} note - Optional note
   */
  function addBookmark(userId, videoId, timestamp, note = '') {
    const userBookmarks = bookmarks.get(userId) || [];
    const videoBookmarks = userBookmarks.filter(b => b.videoId === videoId);

    videoBookmarks.push({
      videoId,
      timestamp,
      note,
      createdAt: Date.now()
    });

    bookmarks.set(userId, [...userBookmarks.filter(b => b.videoId !== videoId), ...videoBookmarks]);
  }

  /**
   * Remove bookmark
   * @param {string} userId - User ID
   * @param {string} videoId - Video ID
   * @param {number} timestamp - Timestamp
   */
  function removeBookmark(userId, videoId, timestamp) {
    const userBookmarks = bookmarks.get(userId) || [];
    const filtered = userBookmarks.filter(b =>
      !(b.videoId === videoId && b.timestamp === timestamp)
    );
    bookmarks.set(userId, filtered);
  }

  /**
   * Get bookmarks for video
   * @param {string} userId - User ID
   * @param {string} videoId - Video ID
   * @returns {Array} Bookmarks
   */
  function getBookmarks(userId, videoId) {
    const userBookmarks = bookmarks.get(userId) || [];
    return userBookmarks.filter(b => b.videoId === videoId);
  }

  /**
   * Get player state
   * @returns {Object} Player state
   */
  function getPlayerState() {
    return { ...playerState };
  }

  /**
   * Reset player
   */
  function resetPlayer() {
    if (currentPlayer) {
      currentPlayer.pause();
      currentPlayer.currentTime = 0;
      playerState.isPlaying = false;
      playerState.currentTime = 0;
    }
  }

  /**
   * Destroy player
   */
  function destroyPlayer() {
    if (currentPlayer) {
      resetPlayer();
      currentPlayer = null;
    }
  }

  // Initialize
  function initialize() {
    console.log('[EnhancedVideoPlayer] Module initialized');
  }

  initialize();

  return {
    initializePlayer,
    play,
    pause,
    seek,
    setVolume,
    toggleMute,
    setPlaybackSpeed,
    toggleFullscreen,
    togglePictureInPicture,
    setQuality,
    recordWatchHistory,
    getWatchHistory,
    addBookmark,
    removeBookmark,
    getBookmarks,
    getPlayerState,
    resetPlayer,
    destroyPlayer
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedVideoPlayer;
}

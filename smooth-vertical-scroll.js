/**
 * Smooth Vertical Scroll for Monetixra
 * TikTok-style smooth scrolling with momentum
 */

const SmoothVerticalScroll = (function() {
  'use strict';

  // Scroll state
  let scrollState = {
    isScrolling: false,
    currentVideoIndex: 0,
    scrollVelocity: 0,
    scrollPosition: 0,
    targetPosition: 0,
    lastTouchY: 0,
    lastTouchTime: 0,
    isDragging: false
  };

  // Configuration
  const CONFIG = {
    SCROLL_THRESHOLD: 50,
    VELOCITY_THRESHOLD: 0.5,
    FRICTION: 0.95,
    SNAP_THRESHOLD: 100,
    SNAP_DURATION: 300,
    MIN_VELOCITY: 0.1
  };

  // Video container
  let videoContainer = null;
  let videoElements = [];

  /**
   * Initialize smooth scroll
   * @param {HTMLElement} container - Video container
   */
  function initialize(container) {
    if (!container) {
      console.error('[SmoothVerticalScroll] Container required');
      return;
    }

    videoContainer = container;
    videoElements = Array.from(container.querySelectorAll('.video-item'));

    // Setup touch events
    setupTouchEvents();

    // Setup keyboard events
    setupKeyboardEvents();

    // Setup wheel events
    setupWheelEvents();

    console.log('[SmoothVerticalScroll] Initialized with', videoElements.length, 'videos');
  }

  /**
   * Setup touch events
   */
  function setupTouchEvents() {
    if (!videoContainer) return;

    let touchStartY = 0;
    let touchStartTime = 0;

    videoContainer.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      scrollState.isDragging = true;
      scrollState.scrollVelocity = 0;
    }, { passive: true });

    videoContainer.addEventListener('touchmove', (e) => {
      if (!scrollState.isDragging) return;

      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY;
      const deltaTime = Date.now() - touchStartTime;

      // Calculate velocity
      if (deltaTime > 0) {
        scrollState.scrollVelocity = deltaY / deltaTime;
      }

      // Apply friction
      scrollState.scrollPosition -= deltaY;
      scrollState.lastTouchY = touchY;
      scrollState.lastTouchTime = Date.now();

      updateScrollPosition();
    }, { passive: true });

    videoContainer.addEventListener('touchend', () => {
      scrollState.isDragging = false;

      // Start momentum scroll
      if (Math.abs(scrollState.scrollVelocity) > CONFIG.MIN_VELOCITY) {
        startMomentumScroll();
      } else {
        snapToNearestVideo();
      }
    }, { passive: true });
  }

  /**
   * Setup keyboard events
   */
  function setupKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToNextVideo();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToPreviousVideo();
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToVideo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToVideo(videoElements.length - 1);
      }
    });
  }

  /**
   * Setup wheel events
   */
  function setupWheelEvents() {
    if (!videoContainer) return;

    let wheelTimeout;
    let wheelDelta = 0;

    videoContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      wheelDelta += e.deltaY;

      clearTimeout(wheelTimeout);

      wheelTimeout = setTimeout(() => {
        if (Math.abs(wheelDelta) > CONFIG.ROLL_THRESHOLD) {
          if (wheelDelta > 0) {
            scrollToNextVideo();
          } else {
            scrollToPreviousVideo();
          }
        }
        wheelDelta = 0;
      }, 100);
    }, { passive: false });
  }

  /**
   * Start momentum scroll
   */
  function startMomentumScroll() {
    function animate() {
      if (Math.abs(scrollState.scrollVelocity) < CONFIG.MIN_VELOCITY) {
        snapToNearestVideo();
        return;
      }

      // Apply friction
      scrollState.scrollVelocity *= CONFIG.FRICTION;
      scrollState.scrollPosition -= scrollState.scrollVelocity;

      updateScrollPosition();

      requestAnimationFrame(animate);
    }

    animate();
  }

  /**
   * Update scroll position
   */
  function updateScrollPosition() {
    if (!videoContainer) return;

    const videoHeight = videoElements[0]?.offsetHeight || 0;
    const maxScroll = (videoElements.length - 1) * videoHeight;

    // Clamp scroll position
    scrollState.scrollPosition = Math.max(0, Math.min(scrollState.scrollPosition, maxScroll));

    // Apply transform
    videoContainer.style.transform = `translateY(${-scrollState.scrollPosition}px)`;

    // Update current video index
    scrollState.currentVideoIndex = Math.round(scrollState.scrollPosition / videoHeight);
  }

  /**
   * Snap to nearest video
   */
  function snapToNearestVideo() {
    const videoHeight = videoElements[0]?.offsetHeight || 0;
    const targetIndex = Math.round(scrollState.scrollPosition / videoHeight);
    scrollState.targetPosition = targetIndex * videoHeight;

    animateSnap();
  }

  /**
   * Animate snap to position
   */
  function animateSnap() {
    const distance = scrollState.targetPosition - scrollState.scrollPosition;

    if (Math.abs(distance) < CONFIG.SNAP_THRESHOLD) {
      scrollState.scrollPosition = scrollState.targetPosition;
      updateScrollPosition();
      return;
    }

    scrollState.scrollPosition += distance * 0.2;
    updateScrollPosition();

    requestAnimationFrame(animateSnap);
  }

  /**
   * Scroll to next video
   */
  function scrollToNextVideo() {
    if (scrollState.currentVideoIndex < videoElements.length - 1) {
      scrollToVideo(scrollState.currentVideoIndex + 1);
    }
  }

  /**
   * Scroll to previous video
   */
  function scrollToPreviousVideo() {
    if (scrollState.currentVideoIndex > 0) {
      scrollToVideo(scrollState.currentVideoIndex - 1);
    }
  }

  /**
   * Scroll to specific video
   * @param {number} index - Video index
   */
  function scrollToVideo(index) {
    if (index < 0 || index >= videoElements.length) return;

    const videoHeight = videoElements[0]?.offsetHeight || 0;
    scrollState.targetPosition = index * videoHeight;
    scrollState.currentVideoIndex = index;

    animateSnap();

    // Auto-play current video
    autoPlayVideo(index);
  }

  /**
   * Auto-play video
   * @param {number} index - Video index
   */
  function autoPlayVideo(index) {
    // Pause all videos
    videoElements.forEach((video, i) => {
      if (video.pause) {
        video.pause();
      }
    });

    // Play current video
    const currentVideo = videoElements[index];
    if (currentVideo && currentVideo.play) {
      currentVideo.play().catch(err => {
        console.log('[SmoothVerticalScroll] Auto-play error:', err);
      });
    }
  }

  /**
   * Get current video index
   * @returns {number} Current index
   */
  function getCurrentIndex() {
    return scrollState.currentVideoIndex;
  }

  /**
   * Get scroll state
   * @returns {Object} Scroll state
   */
  function getScrollState() {
    return { ...scrollState };
  }

  /**
   * Destroy smooth scroll
   */
  function destroy() {
    // Remove event listeners
    if (videoContainer) {
      videoContainer.removeEventListener('touchstart', null);
      videoContainer.removeEventListener('touchmove', null);
      videoContainer.removeEventListener('touchend', null);
      videoContainer.removeEventListener('wheel', null);
    }

    document.removeEventListener('keydown', null);

    videoContainer = null;
    videoElements = [];
    scrollState = {
      isScrolling: false,
      currentVideoIndex: 0,
      scrollVelocity: 0,
      scrollPosition: 0,
      targetPosition: 0,
      lastTouchY: 0,
      lastTouchTime: 0,
      isDragging: false
    };
  }

  // Initialize
  function initialize() {
    console.log('[SmoothVerticalScroll] Module initialized');
  }

  initialize();

  return {
    CONFIG,
    initialize,
    scrollToNextVideo,
    scrollToPreviousVideo,
    scrollToVideo,
    getCurrentIndex,
    getScrollState,
    destroy
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmoothVerticalScroll;
}

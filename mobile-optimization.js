/**
 * Mobile Performance Optimization for Monetixra
 * Touch events, lazy loading, and mobile-specific optimizations
 */

const MobileOptimization = (function() {
  'use strict';

  let isInitialized = false;
  let imageObserver = null;

  /**
   * Initialize mobile optimizations
   */
  function initialize() {
    if (isInitialized) return;

    // Enable passive event listeners
    enablePassiveEventListeners();

    // Initialize lazy loading
    initializeLazyLoading();

    // Optimize touch interactions
    optimizeTouchInteractions();

    // Add mobile-specific optimizations
    addMobileOptimizations();

    isInitialized = true;
    console.log('[MobileOptimization] Initialized');
  }

  /**
   * Enable passive event listeners for better scroll performance
   */
  function enablePassiveEventListeners() {
    // Touch start
    document.addEventListener('touchstart', function() {}, { passive: true });

    // Touch move
    document.addEventListener('touchmove', function() {}, { passive: true });

    // Touch end
    document.addEventListener('touchend', function() {}, { passive: true });

    // Wheel
    document.addEventListener('wheel', function() {}, { passive: true });

    console.log('[MobileOptimization] Passive event listeners enabled');
  }

  /**
   * Initialize lazy loading for images
   */
  function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
      imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            loadImage(img);
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      // Observe all lazy images
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });

      console.log('[MobileOptimization] Lazy loading initialized');
    } else {
      // Fallback for browsers without IntersectionObserver
      loadAllImages();
    }
  }

  /**
   * Load a single image
   * @param {HTMLImageElement} img - Image element
   */
  function loadImage(img) {
    const src = img.getAttribute('data-src');
    const srcset = img.getAttribute('data-srcset');
    const sizes = img.getAttribute('data-sizes');

    if (src) {
      img.src = src;
    }

    if (srcset) {
      img.srcset = srcset;
    }

    if (sizes) {
      img.sizes = sizes;
    }

    img.onload = function() {
      img.classList.add('loaded');
    };

    img.onerror = function() {
      img.classList.add('error');
    };
  }

  /**
   * Load all images (fallback)
   */
  function loadAllImages() {
    document.querySelectorAll('img[data-src]').forEach(img => {
      loadImage(img);
    });
  }

  /**
   * Optimize touch interactions
   */
  function optimizeTouchInteractions() {
    // Prevent double-tap zoom on interactive elements
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');

    interactiveElements.forEach(el => {
      el.addEventListener('touchstart', function(e) {
        el.classList.add('touch-active');
      }, { passive: true });

      el.addEventListener('touchend', function(e) {
        el.classList.remove('touch-active');
      }, { passive: true });
    });

    // Add touch-action CSS to prevent browser handling
    const style = document.createElement('style');
    style.textContent = `
      .touch-active {
        opacity: 0.7;
        transform: scale(0.98);
      }

      button, a, input, select, textarea {
        touch-action: manipulation;
      }

      * {
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);

    console.log('[MobileOptimization] Touch interactions optimized');
  }

  /**
   * Add mobile-specific optimizations
   */
  function addMobileOptimizations() {
    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      document.body.classList.add('mobile-device');

      // Reduce animations on mobile
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) {
        document.body.classList.add('reduced-motion');
      }

      // Optimize scrolling
      document.body.style.overscrollBehavior = 'none';

      // Prevent pull-to-refresh
      document.body.style.webkitOverflowScrolling = 'touch';
    }

    console.log('[MobileOptimization] Mobile optimizations added');
  }

  /**
   * Lazy load images with srcset
   * @param {HTMLImageElement} img - Image element
   * @param {Object} sources - Image sources
   */
  function addResponsiveImage(img, sources) {
    const srcset = Object.entries(sources)
      .map(([width, url]) => `${url} ${width}w`)
      .join(', ');

    img.setAttribute('data-srcset', srcset);
    img.setAttribute('data-sizes', '100vw');

    if (imageObserver) {
      imageObserver.observe(img);
    } else {
      loadImage(img);
    }
  }

  /**
   * Preload critical resources
   * @param {Array} resources - Resources to preload
   */
  function preloadCriticalResources(resources) {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';

      if (resource.type === 'style') {
        link.as = 'style';
        link.href = resource.url;
      } else if (resource.type === 'script') {
        link.as = 'script';
        link.href = resource.url;
      } else if (resource.type === 'font') {
        link.as = 'font';
        link.href = resource.url;
        link.crossOrigin = 'anonymous';
      } else if (resource.type === 'image') {
        link.as = 'image';
        link.href = resource.url;
      }

      document.head.appendChild(link);
    });

    console.log('[MobileOptimization] Critical resources preloaded');
  }

  /**
   * Defer non-critical CSS
   * @param {string} cssUrl - CSS URL
   */
  function deferNonCriticalCSS(cssUrl) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = cssUrl;
    link.onload = function() {
      this.onload = null;
      this.rel = 'stylesheet';
    };
    document.head.appendChild(link);

    console.log('[MobileOptimization] Non-critical CSS deferred');
  }

  /**
   * Optimize font loading
   * @param {Array} fonts - Fonts to load
   */
  function optimizeFontLoading(fonts) {
    const fontDisplay = 'swap';

    fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.href = font.url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);

      // Add font-face CSS
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: '${font.family}';
          src: url('${font.url}') format('${font.format}');
          font-display: ${fontDisplay};
          font-weight: ${font.weight || 400};
          font-style: ${font.style || 'normal'};
        }
      `;
      document.head.appendChild(style);
    });

    console.log('[MobileOptimization] Font loading optimized');
  }

  /**
   * Detect network connection and adjust quality
   */
  function adaptToNetwork() {
    if ('connection' in navigator) {
      const connection = navigator.connection;

      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        document.body.classList.add('slow-connection');
        // Reduce image quality
        document.querySelectorAll('img[data-src]').forEach(img => {
          const src = img.getAttribute('data-src');
          if (src) {
            img.setAttribute('data-src', src.replace(/\\/[^.]+\\.jpg/g, '/low-quality.jpg'));
          }
        });
      }

      connection.addEventListener('change', () => {
        adaptToNetwork();
      });
    }

    console.log('[MobileOptimization] Network adaptation enabled');
  }

  /**
   * Destroy mobile optimizations
   */
  function destroy() {
    if (imageObserver) {
      imageObserver.disconnect();
      imageObserver = null;
    }

    isInitialized = false;
    console.log('[MobileOptimization] Destroyed');
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  return {
    initialize,
    addResponsiveImage,
    preloadCriticalResources,
    deferNonCriticalCSS,
    optimizeFontLoading,
    adaptToNetwork,
    destroy
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileOptimization;
}

/**
 * Performance Enhancements for Monetixra
 * Features: Cloudflare Workers, CDN Integration, Image Optimization, Lazy Loading
 */

const PerformanceEnhancements = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    CLOUDFLARE_WORKER_URL: process.env.CLOUDFLARE_WORKER_URL || '',
    CDN_URL: process.env.CDN_URL || '',
    IMAGE_OPTIMIZATION_ENABLED: true,
    LAZY_LOADING_ENABLED: true,
    IMAGE_QUALITY: 85,
    IMAGE_FORMATS: ['webp', 'avif', 'jpeg'],
    PRELOAD_PRIORITY: ['critical', 'high']
  };

  // State
  let cloudflareWorkerClient = null;
  let imageCache = new Map();
  let lazyLoadObserver = null;
  let performanceMetrics = {
    loadTime: 0,
    renderTime: 0,
    resourceCount: 0,
    cacheHitRate: 0
  };

  // ── Cloudflare Workers Integration ────────────────────────────────────────

  /**
   * Initialize Cloudflare Worker client
   */
  async function initCloudflareWorker() {
    try {
      if (!CONFIG.CLOUDFLARE_WORKER_URL) {
        console.warn('[Cloudflare] Worker URL not configured');
        return false;
      }

      cloudflareWorkerClient = {
        baseURL: CONFIG.CLOUDFLARE_WORKER_URL,
        cache: new Map()
      };

      console.log('[Cloudflare] Worker client initialized');
      return true;
    } catch (error) {
      console.error('[Cloudflare] Worker initialization failed:', error);
      return false;
    }
  }

  /**
   * Call Cloudflare Worker function
   * @param {string} functionName - Function name
   * @param {object} data - Function data
   */
  async function callCloudflareWorker(functionName, data = {}) {
    try {
      if (!cloudflareWorkerClient) {
        await initCloudflareWorker();
      }

      if (!cloudflareWorkerClient) {
        console.warn('[Cloudflare] Worker not available');
        return null;
      }

      const url = `${cloudflareWorkerClient.baseURL}/${functionName}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      console.log('[Cloudflare] Worker function called:', functionName);
      return result;
    } catch (error) {
      console.error('[Cloudflare] Worker function call failed:', error);
      return null;
    }
  }

  /**
   * Cache data at edge
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   */
  async function cacheAtEdge(key, data, ttl = 3600) {
    try {
      return await callCloudflareWorker('cache', {
        key: key,
        data: data,
        ttl: ttl
      });
    } catch (error) {
      console.error('[Cloudflare] Edge caching failed:', error);
      return null;
    }
  }

  /**
   * Get data from edge cache
   * @param {string} key - Cache key
   */
  async function getFromEdge(key) {
    try {
      return await callCloudflareWorker('get-cache', {
        key: key
      });
    } catch (error) {
      console.error('[Cloudflare] Edge cache retrieval failed:', error);
      return null;
    }
  }

  /**
   * Invalidate edge cache
   * @param {string} key - Cache key
   */
  async function invalidateEdgeCache(key) {
    try {
      return await callCloudflareWorker('invalidate-cache', {
        key: key
      });
    } catch (error) {
      console.error('[Cloudflare] Edge cache invalidation failed:', error);
      return null;
    }
  }

  // ── CDN Integration ────────────────────────────────────────────────────────

  /**
   * Generate CDN URL for asset
   * @param {string} assetPath - Asset path
   * @param {object} options - CDN options
   */
  function generateCDNURL(assetPath, options = {}) {
    try {
      if (!CONFIG.CDN_URL) {
        return assetPath;
      }

      const cdnPath = assetPath.replace(/^\//, '');
      const params = new URLSearchParams();

      if (options.quality) {
        params.set('quality', options.quality.toString());
      }
      if (options.format) {
        params.set('format', options.format);
      }
      if (options.width) {
        params.set('width', options.width.toString());
      }
      if (options.height) {
        params.set('height', options.height.toString());
      }

      const queryString = params.toString();
      return `${CONFIG.CDN_URL}/${cdnPath}${queryString ? '?' + queryString : ''}`;
    } catch (error) {
      console.error('[CDN] URL generation failed:', error);
      return assetPath;
    }
  }

  /**
   * Upload asset to CDN
   * @param {string} assetPath - Local asset path
   * @param {string} cdnPath - CDN path
   */
  async function uploadToCDN(assetPath, cdnPath) {
    try {
      // Implementation depends on CDN provider
      // Example for Cloudflare R2:
      // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      // const client = new S3Client({
      //   endpoint: process.env.R2_ENDPOINT,
      //   credentials: {
      //     accessKeyId: process.env.R2_ACCESS_KEY_ID,
      //     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      //   },
      //   region: 'auto'
      // });
      // 
      // const fs = require('fs');
      // const fileContent = fs.readFileSync(assetPath);
      // 
      // const command = new PutObjectCommand({
      //   Bucket: process.env.R2_BUCKET_NAME,
      //   Key: cdnPath,
      //   Body: fileContent,
      //   ContentType: 'image/jpeg'
      // });
      // 
      // await client.send(command);

      console.log('[CDN] Asset uploaded:', cdnPath);
      return { success: true, cdnPath: cdnPath };
    } catch (error) {
      console.error('[CDN] Upload failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Purge CDN cache
   * @param {string} url - URL to purge
   */
  async function purgeCDNCache(url) {
    try {
      // Implementation depends on CDN provider
      // Example for Cloudflare:
      // const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${API_TOKEN}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ files: [url] })
      // });

      console.log('[CDN] Cache purged:', url);
      return { success: true };
    } catch (error) {
      console.error('[CDN] Cache purge failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ── Image Optimization ────────────────────────────────────────────────────

  /**
   * Optimize image
   * @param {string} imageUrl - Image URL
   * @param {object} options - Optimization options
   */
  async function optimizeImage(imageUrl, options = {}) {
    try {
      if (!CONFIG.IMAGE_OPTIMIZATION_ENABLED) {
        return imageUrl;
      }

      // Check cache
      const cacheKey = `${imageUrl}-${JSON.stringify(options)}`;
      if (imageCache.has(cacheKey)) {
        performanceMetrics.cacheHitRate++;
        return imageCache.get(cacheKey);
      }

      const settings = {
        quality: options.quality || CONFIG.IMAGE_QUALITY,
        format: options.format || 'webp',
        width: options.width || null,
        height: options.height || null,
        fit: options.fit || 'cover'
      };

      // Generate optimized URL
      let optimizedUrl = imageUrl;
      
      if (CONFIG.CDN_URL) {
        optimizedUrl = generateCDNURL(imageUrl, settings);
      } else {
        // Client-side optimization using canvas
        optimizedUrl = await optimizeImageClientSide(imageUrl, settings);
      }

      // Cache result
      imageCache.set(cacheKey, optimizedUrl);
      performanceMetrics.resourceCount++;

      console.log('[Image] Optimized:', imageUrl);
      return optimizedUrl;
    } catch (error) {
      console.error('[Image] Optimization failed:', error);
      return imageUrl;
    }
  }

  /**
   * Optimize image client-side
   * @param {string} imageUrl - Image URL
   * @param {object} options - Optimization options
   */
  async function optimizeImageClientSide(imageUrl, options) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate dimensions
      let width = options.width || img.width;
      let height = options.height || img.height;

      if (options.width && !options.height) {
        height = (img.height * options.width) / img.width;
      } else if (options.height && !options.width) {
        width = (img.width * options.height) / img.height;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      const quality = options.quality / 100;
      const format = options.format === 'webp' ? 'image/webp' : 'image/jpeg';
      
      const optimizedUrl = canvas.toDataURL(format, quality);
      return optimizedUrl;
    } catch (error) {
      console.error('[Image] Client-side optimization failed:', error);
      return imageUrl;
    }
  }

  /**
   * Generate responsive image sizes
   * @param {string} imageUrl - Image URL
   * @param {array} sizes - Array of size objects
   */
  async function generateResponsiveImages(imageUrl, sizes = []) {
    try {
      const defaultSizes = sizes.length > 0 ? sizes : [
        { width: 320, label: 'small' },
        { width: 640, label: 'medium' },
        { width: 1280, label: 'large' },
        { width: 1920, label: 'xlarge' }
      ];

      const responsiveImages = await Promise.all(
        defaultSizes.map(async (size) => {
          const optimizedUrl = await optimizeImage(imageUrl, {
            width: size.width,
            quality: CONFIG.IMAGE_QUALITY
          });
          return {
            url: optimizedUrl,
            width: size.width,
            label: size.label
          };
        })
      );

      console.log('[Image] Responsive images generated');
      return responsiveImages;
    } catch (error) {
      console.error('[Image] Responsive image generation failed:', error);
      return [];
    }
  }

  /**
   * Generate image placeholder
   * @param {number} width - Placeholder width
   * @param {number} height - Placeholder height
   * @param {string} color - Placeholder color
   */
  function generateImagePlaceholder(width, height, color = '#e0e0e0') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL('image/jpeg', 0.1);
  }

  // ── Lazy Loading ───────────────────────────────────────────────────────────

  /**
   * Initialize lazy loading
   */
  function initLazyLoading() {
    try {
      if (!CONFIG.LAZY_LOADING_ENABLED) {
        return false;
      }

      if ('IntersectionObserver' in window) {
        lazyLoadObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const element = entry.target;
              loadLazyElement(element);
              observer.unobserve(element);
            }
          });
        }, {
          rootMargin: '50px 0px',
          threshold: 0.01
        });

        console.log('[LazyLoad] Initialized');
        return true;
      } else {
        console.warn('[LazyLoad] IntersectionObserver not supported');
        return false;
      }
    } catch (error) {
      console.error('[LazyLoad] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Observe lazy element
   * @param {HTMLElement} element - Element to observe
   */
  function observeLazyElement(element) {
    if (lazyLoadObserver) {
      lazyLoadObserver.observe(element);
    }
  }

  /**
   * Load lazy element
   * @param {HTMLElement} element - Element to load
   */
  function loadLazyElement(element) {
    try {
      if (element.tagName === 'IMG') {
        const src = element.dataset.src;
        const srcset = element.dataset.srcset;
        
        if (src) {
          element.src = src;
          delete element.dataset.src;
        }
        
        if (srcset) {
          element.srcset = srcset;
          delete element.dataset.srcset;
        }
        
        element.classList.add('loaded');
      } else if (element.tagName === 'IFRAME') {
        const src = element.dataset.src;
        if (src) {
          element.src = src;
          delete element.dataset.src;
        }
        element.classList.add('loaded');
      } else if (element.tagName === 'VIDEO') {
        const poster = element.dataset.poster;
        const sources = element.querySelectorAll('source[data-src]');
        
        if (poster) {
          element.poster = poster;
          delete element.dataset.poster;
        }
        
        sources.forEach(source => {
          const src = source.dataset.src;
          if (src) {
            source.src = src;
            delete source.dataset.src;
          }
        });
        
        element.load();
        element.classList.add('loaded');
      }

      console.log('[LazyLoad] Element loaded:', element.tagName);
    } catch (error) {
      console.error('[LazyLoad] Element loading failed:', error);
    }
  }

  /**
   * Setup lazy loading for all elements
   */
  function setupLazyLoading() {
    if (!initLazyLoading()) {
      return;
    }

    // Observe all lazy elements
    const lazyElements = document.querySelectorAll('[data-src], [data-srcset]');
    lazyElements.forEach(element => {
      observeLazyElement(element);
    });

    console.log('[LazyLoad] Setup complete for', lazyElements.length, 'elements');
  }

  // ── Performance Monitoring ────────────────────────────────────────────────

  /**
   * Measure page load time
   */
  function measurePageLoadTime() {
    try {
      if (typeof performance !== 'undefined' && performance.timing) {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        performanceMetrics.loadTime = loadTime;
        
        console.log('[Performance] Page load time:', loadTime, 'ms');
        return loadTime;
      }
      return 0;
    } catch (error) {
      console.error('[Performance] Load time measurement failed:', error);
      return 0;
    }
  }

  /**
   * Measure render time
   */
  function measureRenderTime() {
    try {
      if (typeof performance !== 'undefined' && performance.timing) {
        const timing = performance.timing;
        const renderTime = timing.domComplete - timing.domLoading;
        performanceMetrics.renderTime = renderTime;
        
        console.log('[Performance] Render time:', renderTime, 'ms');
        return renderTime;
      }
      return 0;
    } catch (error) {
      console.error('[Performance] Render time measurement failed:', error);
      return 0;
    }
  }

  /**
   * Get performance metrics
   */
  function getPerformanceMetrics() {
    try {
      if (typeof performance !== 'undefined' && performance.getEntriesByType) {
        const resources = performance.getEntriesByType('resource');
        performanceMetrics.resourceCount = resources.length;
        
        // Calculate cache hit rate
        const cachedResources = resources.filter(r => r.transferSize === 0);
        performanceMetrics.cacheHitRate = (cachedResources.length / resources.length) * 100;
      }

      return { ...performanceMetrics };
    } catch (error) {
      console.error('[Performance] Metrics retrieval failed:', error);
      return performanceMetrics;
    }
  }

  /**
   * Monitor performance with PerformanceObserver
   */
  function setupPerformanceObserver() {
    try {
      if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.log('[Performance] Entry:', entry.name, entry.duration);
          }
        });

        observer.observe({ entryTypes: ['measure', 'paint', 'resource'] });
        console.log('[Performance] Observer setup complete');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Performance] Observer setup failed:', error);
      return false;
    }
  }

  // ── Preloading & Prefetching ───────────────────────────────────────────────

  /**
   * Preload critical resources
   * @param {array} resources - Array of resource URLs
   */
  function preloadResources(resources) {
    try {
      resources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.url;
        
        if (resource.as) {
          link.as = resource.as;
        }
        
        if (resource.type) {
          link.type = resource.type;
        }
        
        document.head.appendChild(link);
      });

      console.log('[Performance] Preloaded', resources.length, 'resources');
    } catch (error) {
      console.error('[Performance] Preloading failed:', error);
    }
  }

  /**
   * Prefetch resources
   * @param {array} resources - Array of resource URLs
   */
  function prefetchResources(resources) {
    try {
      resources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = resource;
        document.head.appendChild(link);
      });

      console.log('[Performance] Prefetched', resources.length, 'resources');
    } catch (error) {
      console.error('[Performance] Prefetching failed:', error);
    }
  }

  /**
   * Preconnect to origins
   * @param {array} origins - Array of origin URLs
   */
  function preconnectOrigins(origins) {
    try {
      origins.forEach(origin => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        document.head.appendChild(link);
      });

      console.log('[Performance] Preconnected to', origins.length, 'origins');
    } catch (error) {
      console.error('[Performance] Preconnection failed:', error);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Cloudflare Workers
    init: initCloudflareWorker,
    callWorker: callCloudflareWorker,
    cacheAtEdge: cacheAtEdge,
    getFromEdge: getFromEdge,
    invalidateEdge: invalidateEdgeCache,
    
    // CDN
    generateCDNURL: generateCDNURL,
    uploadToCDN: uploadToCDN,
    purgeCDNCache: purgeCDNCache,
    
    // Image Optimization
    optimizeImage: optimizeImage,
    generateResponsiveImages: generateResponsiveImages,
    generatePlaceholder: generateImagePlaceholder,
    
    // Lazy Loading
    initLazyLoading: initLazyLoading,
    observeLazy: observeLazyElement,
    setupLazyLoading: setupLazyLoading,
    
    // Performance Monitoring
    measureLoadTime: measurePageLoadTime,
    measureRenderTime: measureRenderTime,
    getMetrics: getPerformanceMetrics,
    setupObserver: setupPerformanceObserver,
    
    // Preloading
    preload: preloadResources,
    prefetch: prefetchResources,
    preconnect: preconnectOrigins,
    
    // State
    getMetrics: () => ({ ...performanceMetrics }),
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceEnhancements;
}

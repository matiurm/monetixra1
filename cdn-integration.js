/**
 * CDN Integration System
 * Cloudflare CDN integration for static assets, images, and videos
 */

const CDNIntegration = (function() {
  'use strict';

  // Configuration
  const config = {
    enabled: true,
    provider: 'cloudflare', // cloudflare, aws, cloudinary
    
    // Cloudflare Configuration
    cloudflare: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      baseUrl: process.env.CLOUDFLARE_BASE_URL || 'https://cdn.monetixra.com'
    },
    
    // Image Optimization
    imageOptimization: {
      enabled: true,
      formats: ['webp', 'avif', 'jpeg', 'png'],
      quality: 85,
      resize: true,
      maxWidth: 1920,
      maxHeight: 1080
    },
    
    // Video Streaming
    videoStreaming: {
      enabled: true,
      adaptiveBitrate: true,
      formats: ['mp4', 'webm', 'hls'],
      thumbnailGeneration: true
    },
    
    // Caching
    caching: {
      enabled: true,
      defaultTTL: 3600, // 1 hour
      staticAssetsTTL: 86400, // 24 hours
      apiResponsesTTL: 300, // 5 minutes
      purgeOnUpdate: true
    },
    
    // Edge Configuration
    edge: {
      enabled: true,
      locations: ['global'],
      ssl: true,
      http2: true,
      http3: true
    }
  };

  // Storage for cache tracking
  const cacheTracker = {
    purgedUrls: new Set(),
    cachedAssets: new Map(),
    cacheStats: {
      hits: 0,
      misses: 0,
      purges: 0
    }
  };

  /**
   * Initialize CDN
   */
  async function initialize() {
    try {
      if (!config.enabled) {
        return { success: false, message: 'CDN is disabled' };
      }
      
      if (config.provider === 'cloudflare') {
        if (!config.cloudflare.apiToken || !config.cloudflare.zoneId) {
          console.log('[CDN] Cloudflare credentials not configured, using local mode');
          config.enabled = false;
          return { success: true, message: 'CDN running in local mode' };
        }
        
        console.log('[CDN] Cloudflare CDN initialized');
        return { success: true, message: 'Cloudflare CDN initialized' };
      }
      
      return { success: true, message: 'CDN initialized' };
    } catch (error) {
      console.error('[CDN] Initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate CDN URL for asset
   */
  function generateCDNUrl(localPath, options = {}) {
    if (!config.enabled) {
      return localPath;
    }
    
    const baseUrl = config.cloudflare.baseUrl;
    const cleanPath = localPath.replace(/^\/+/, '');
    
    // Add optimization parameters for images
    if (options.optimize && config.imageOptimization.enabled) {
      const params = new URLSearchParams();
      
      if (options.format) {
        params.append('format', options.format);
      }
      
      if (options.quality) {
        params.append('quality', options.quality.toString());
      }
      
      if (options.width) {
        params.append('width', options.width.toString());
      }
      
      if (options.height) {
        params.append('height', options.height.toString());
      }
      
      return `${baseUrl}/${cleanPath}?${params.toString()}`;
    }
    
    return `${baseUrl}/${cleanPath}`;
  }

  /**
   * Upload asset to CDN
   */
  async function uploadAsset(localPath, metadata = {}) {
    try {
      if (!config.enabled) {
        return { success: true, url: localPath, cdn: false };
      }
      
      // In production, this would upload to Cloudflare R2 or similar
      // For now, we'll just track the asset
      const cdnUrl = generateCDNUrl(localPath);
      
      cacheTracker.cachedAssets.set(localPath, {
        url: cdnUrl,
        uploadedAt: Date.now(),
        metadata
      });
      
      console.log('[CDN] Asset tracked:', localPath, '->', cdnUrl);
      
      return {
        success: true,
        url: cdnUrl,
        cdn: true,
        localPath
      };
    } catch (error) {
      console.error('[CDN] Upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Purge asset from CDN cache
   */
  async function purgeCache(urls) {
    try {
      if (!config.enabled || !config.caching.purgeOnUpdate) {
        return { success: true, message: 'Cache purge not required' };
      }
      
      const urlArray = Array.isArray(urls) ? urls : [urls];
      
      // In production, this would call Cloudflare API to purge cache
      // For now, we'll just track the purge
      urlArray.forEach(url => {
        cacheTracker.purgedUrls.add(url);
      });
      
      cacheTracker.cacheStats.purges += urlArray.length;
      
      console.log('[CDN] Cache purged for:', urlArray.length, 'URLs');
      
      return {
        success: true,
        purgedCount: urlArray.length,
        urls: urlArray
      };
    } catch (error) {
      console.error('[CDN] Purge error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get optimized image URL
   */
  function getOptimizedImageUrl(imagePath, options = {}) {
    const defaultOptions = {
      format: 'webp',
      quality: config.imageOptimization.quality,
      width: options.width || null,
      height: options.height || null
    };
    
    return generateCDNUrl(imagePath, { ...defaultOptions, ...options, optimize: true });
  }

  /**
   * Get video streaming URL
   */
  function getVideoStreamingUrl(videoPath, options = {}) {
    if (!config.enabled) {
      return videoPath;
    }
    
    const baseUrl = config.cloudflare.baseUrl;
    const cleanPath = videoPath.replace(/^\/+/, '');
    
    // Add streaming parameters
    const params = new URLSearchParams();
    
    if (options.format) {
      params.append('format', options.format);
    }
    
    if (options.quality) {
      params.append('quality', options.quality);
    }
    
    if (options.adaptiveBitrate) {
      params.append('abr', 'true');
    }
    
    return `${baseUrl}/${cleanPath}?${params.toString()}`;
  }

  /**
   * Set cache headers
   */
  function setCacheHeaders(res, type = 'default') {
    if (!config.caching.enabled) {
      return;
    }
    
    let ttl;
    switch (type) {
      case 'static':
        ttl = config.caching.staticAssetsTTL;
        break;
      case 'api':
        ttl = config.caching.apiResponsesTTL;
        break;
      default:
        ttl = config.caching.defaultTTL;
    }
    
    res.setHeader('Cache-Control', `public, max-age=${ttl}`);
    res.setHeader('CDN-Cache-Control', `public, max-age=${ttl}`);
    
    if (config.edge.http2) {
      res.setHeader('X-HTTP2-Enabled', 'true');
    }
    
    if (config.edge.http3) {
      res.setHeader('X-HTTP3-Enabled', 'true');
    }
  }

  /**
   * Get cache statistics
   */
  function getCacheStats() {
    return {
      enabled: config.caching.enabled,
      hits: cacheTracker.cacheStats.hits,
      misses: cacheTracker.cacheStats.misses,
      purges: cacheTracker.cacheStats.purges,
      hitRate: cacheTracker.cacheStats.hits / (cacheTracker.cacheStats.hits + cacheTracker.cacheStats.misses) || 0,
      cachedAssets: cacheTracker.cachedAssets.size,
      recentlyPurged: Array.from(cacheTracker.purgedUrls).slice(-10)
    };
  }

  /**
   * Record cache hit
   */
  function recordCacheHit(url) {
    cacheTracker.cacheStats.hits++;
  }

  /**
   * Record cache miss
   */
  function recordCacheMiss(url) {
    cacheTracker.cacheStats.misses++;
  }

  /**
   * Batch upload multiple assets
   */
  async function batchUploadAssets(paths) {
    const results = [];
    
    for (const path of paths) {
      const result = await uploadAsset(path);
      results.push(result);
    }
    
    return {
      success: true,
      total: paths.length,
      uploaded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Get CDN status
   */
  function getStatus() {
    return {
      enabled: config.enabled,
      provider: config.provider,
      baseUrl: config.cloudflare.baseUrl,
      imageOptimization: config.imageOptimization.enabled,
      videoStreaming: config.videoStreaming.enabled,
      caching: config.caching.enabled,
      edge: config.edge.enabled,
      cacheStats: getCacheStats()
    };
  }

  /**
   * Configure CDN settings
   */
  function configure(settings) {
    Object.assign(config, settings);
    console.log('[CDN] Configuration updated:', settings);
    return { success: true, config };
  }

  return {
    initialize,
    generateCDNUrl,
    uploadAsset,
    purgeCache,
    getOptimizedImageUrl,
    getVideoStreamingUrl,
    setCacheHeaders,
    getCacheStats,
    recordCacheHit,
    recordCacheMiss,
    batchUploadAssets,
    getStatus,
    configure,
    config
  };
})();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CDNIntegration;
} else {
  window.CDNIntegration = CDNIntegration;
}

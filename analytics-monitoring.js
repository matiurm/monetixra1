/**
 * Analytics & Monitoring for Monetixra
 * Features: Real-time Analytics, User Behavior Tracking, Performance Monitoring, Error Tracking
 */

const AnalyticsMonitoring = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    ANALYTICS_ENABLED: true,
    BEHAVIOR_TRACKING_ENABLED: true,
    PERFORMANCE_MONITORING_ENABLED: true,
    ERROR_TRACKING_ENABLED: true,
    SAMPLE_RATE: 1.0, // 100% sampling
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    FLUSH_INTERVAL: 5000, // 5 seconds
    MAX_BATCH_SIZE: 50
  };

  // State
  let sessionData = {
    sessionId: null,
    startTime: null,
    userId: null,
    events: [],
    metrics: {},
    errors: []
  };

  let flushInterval = null;
  let performanceObserver = null;
  let errorListener = null;

  // ── Session Management ─────────────────────────────────────────────────────

  /**
   * Initialize analytics session
   * @param {string} userId - User ID
   */
  function initSession(userId = null) {
    try {
      sessionData.sessionId = crypto.randomUUID();
      sessionData.startTime = Date.now();
      sessionData.userId = userId;
      sessionData.events = [];
      sessionData.metrics = {};
      sessionData.errors = [];

      console.log('[Analytics] Session initialized:', sessionData.sessionId);
      
      // Start periodic flush
      startPeriodicFlush();
      
      // Track session start
      trackEvent('session_start', {
        userId: userId,
        timestamp: Date.now()
      });

      return sessionData.sessionId;
    } catch (error) {
      console.error('[Analytics] Session initialization failed:', error);
      return null;
    }
  }

  /**
   * End analytics session
   */
  function endSession() {
    try {
      // Track session end
      trackEvent('session_end', {
        duration: Date.now() - sessionData.startTime,
        eventCount: sessionData.events.length,
        errorCount: sessionData.errors.length
      });

      // Flush remaining data
      flushAnalytics();

      // Stop periodic flush
      if (flushInterval) {
        clearInterval(flushInterval);
        flushInterval = null;
      }

      console.log('[Analytics] Session ended:', sessionData.sessionId);
      return true;
    } catch (error) {
      console.error('[Analytics] Session end failed:', error);
      return false;
    }
  }

  // ── Event Tracking ─────────────────────────────────────────────────────────

  /**
   * Track custom event
   * @param {string} eventName - Event name
   * @param {object} properties - Event properties
   */
  function trackEvent(eventName, properties = {}) {
    try {
      if (!CONFIG.ANALYTICS_ENABLED) {
        return;
      }

      const event = {
        name: eventName,
        properties: {
          ...properties,
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      };

      sessionData.events.push(event);
      console.log('[Analytics] Event tracked:', eventName);

      // Auto-flush if batch size reached
      if (sessionData.events.length >= CONFIG.MAX_BATCH_SIZE) {
        flushAnalytics();
      }
    } catch (error) {
      console.error('[Analytics] Event tracking failed:', error);
    }
  }

  /**
   * Track page view
   * @param {string} page - Page name
   * @param {object} properties - Additional properties
   */
  function trackPageView(page, properties = {}) {
    trackEvent('page_view', {
      page: page,
      ...properties
    });
  }

  /**
   * Track user action
   * @param {string} action - Action name
   * @param {object} properties - Action properties
   */
  function trackAction(action, properties = {}) {
    trackEvent('user_action', {
      action: action,
      ...properties
    });
  }

  // ── User Behavior Tracking ─────────────────────────────────────────────────

  /**
   * Initialize behavior tracking
   */
  function initBehaviorTracking() {
    try {
      if (!CONFIG.BEHAVIOR_TRACKING_ENABLED) {
        return false;
      }

      // Track clicks
      document.addEventListener('click', (event) => {
        const target = event.target;
        const elementInfo = {
          tagName: target.tagName,
          id: target.id,
          className: target.className,
          text: target.textContent?.substring(0, 50)
        };

        trackEvent('click', {
          element: elementInfo,
          x: event.clientX,
          y: event.clientY
        });
      }, true);

      // Track scroll
      let scrollTimeout;
      document.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const scrollDepth = Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
          );
          
          trackEvent('scroll', {
            depth: scrollDepth,
            scrollY: window.scrollY
          });
        }, 100);
      }, true);

      // Track form submissions
      document.addEventListener('submit', (event) => {
        const form = event.target;
        trackEvent('form_submit', {
          formId: form.id,
          formName: form.name,
          action: form.action
        });
      }, true);

      // Track errors
      window.addEventListener('error', (event) => {
        trackError(event.error || new Error(event.message), {
          source: event.filename,
          line: event.lineno,
          column: event.colno
        });
      });

      // Track unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        trackError(event.reason, {
          type: 'unhandled_promise_rejection'
        });
      });

      console.log('[Analytics] Behavior tracking initialized');
      return true;
    } catch (error) {
      console.error('[Analytics] Behavior tracking initialization failed:', error);
      return false;
    }
  }

  /**
   * Track user engagement
   * @param {string} type - Engagement type
   * @param {object} properties - Engagement properties
   */
  function trackEngagement(type, properties = {}) {
    trackEvent('engagement', {
      type: type,
      ...properties
    });
  }

  /**
   * Track feature usage
   * @param {string} feature - Feature name
   * @param {object} properties - Feature properties
   */
  function trackFeatureUsage(feature, properties = {}) {
    trackEvent('feature_usage', {
      feature: feature,
      ...properties
    });
  }

  // ── Performance Monitoring ────────────────────────────────────────────────

  /**
   * Initialize performance monitoring
   */
  function initPerformanceMonitoring() {
    try {
      if (!CONFIG.PERFORMANCE_MONITORING_ENABLED) {
        return false;
      }

      if (typeof PerformanceObserver !== 'undefined') {
        performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            trackPerformanceMetric(entry.name, entry.duration, entry);
          }
        });

        performanceObserver.observe({ entryTypes: ['measure', 'paint', 'resource', 'navigation'] });
        console.log('[Analytics] Performance monitoring initialized');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Analytics] Performance monitoring initialization failed:', error);
      return false;
    }
  }

  /**
   * Track performance metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {object} metadata - Additional metadata
   */
  function trackPerformanceMetric(name, value, metadata = {}) {
    try {
      sessionData.metrics[name] = {
        value: value,
        timestamp: Date.now(),
        ...metadata
      };

      trackEvent('performance_metric', {
        name: name,
        value: value,
        ...metadata
      });
    } catch (error) {
      console.error('[Analytics] Performance metric tracking failed:', error);
    }
  }

  /**
   * Measure custom performance
   * @param {string} name - Metric name
   * @param {Function} fn - Function to measure
   */
  async function measurePerformance(name, fn) {
    try {
      const startTime = performance.now();
      const result = await fn();
      const duration = performance.now() - startTime;

      trackPerformanceMetric(name, duration);
      return result;
    } catch (error) {
      console.error('[Analytics] Performance measurement failed:', error);
      throw error;
    }
  }

  /**
   * Get Core Web Vitals
   */
  function getCoreWebVitals() {
    try {
      const vitals = {};

      if (performance.getEntriesByType) {
        // LCP (Largest Contentful Paint)
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
          vitals.lcp = lcpEntries[lcpEntries.length - 1].startTime;
        }

        // FID (First Input Delay)
        const fidEntries = performance.getEntriesByType('first-input');
        if (fidEntries.length > 0) {
          vitals.fid = fidEntries[0].processingStart - fidEntries[0].startTime;
        }

        // CLS (Cumulative Layout Shift)
        const clsEntries = performance.getEntriesByType('layout-shift');
        if (clsEntries.length > 0) {
          vitals.cls = clsEntries.reduce((sum, entry) => sum + entry.value, 0);
        }
      }

      return vitals;
    } catch (error) {
      console.error('[Analytics] Core Web Vitals retrieval failed:', error);
      return {};
    }
  }

  // ── Error Tracking ─────────────────────────────────────────────────────────

  /**
   * Initialize error tracking
   */
  function initErrorTracking() {
    try {
      if (!CONFIG.ERROR_TRACKING_ENABLED) {
        return false;
      }

      // Global error handler
      errorListener = (event) => {
        trackError(event.error || new Error(event.message), {
          source: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack
        });
      };

      window.addEventListener('error', errorListener);

      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        trackError(event.reason, {
          type: 'unhandled_promise_rejection',
          promise: event.promise
        });
      });

      console.log('[Analytics] Error tracking initialized');
      return true;
    } catch (error) {
      console.error('[Analytics] Error tracking initialization failed:', error);
      return false;
    }
  }

  /**
   * Track error
   * @param {Error} error - Error object
   * @param {object} context - Error context
   */
  function trackError(error, context = {}) {
    try {
      const errorData = {
        message: error.message || String(error),
        stack: error.stack,
        name: error.name,
        context: {
          ...context,
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      };

      sessionData.errors.push(errorData);
      console.error('[Analytics] Error tracked:', error.message);

      // Auto-flush if error count is high
      if (sessionData.errors.length >= 10) {
        flushAnalytics();
      }
    } catch (error) {
      console.error('[Analytics] Error tracking failed:', error);
    }
  }

  /**
   * Track custom error
   * @param {string} message - Error message
   * @param {object} context - Error context
   */
  function trackCustomError(message, context = {}) {
    const error = new Error(message);
    trackError(error, context);
  }

  // ── Real-time Analytics ─────────────────────────────────────────────────────

  /**
   * Get real-time analytics
   */
  function getRealTimeAnalytics() {
    try {
      const analytics = {
        session: {
          id: sessionData.sessionId,
          duration: Date.now() - sessionData.startTime,
          userId: sessionData.userId
        },
        events: {
          total: sessionData.events.length,
          recent: sessionData.events.slice(-10)
        },
        metrics: { ...sessionData.metrics },
        errors: {
          total: sessionData.errors.length,
          recent: sessionData.errors.slice(-5)
        },
        performance: getCoreWebVitals()
      };

      return analytics;
    } catch (error) {
      console.error('[Analytics] Real-time analytics retrieval failed:', error);
      return null;
    }
  }

  /**
   * Get user behavior summary
   */
  function getUserBehaviorSummary() {
    try {
      const clicks = sessionData.events.filter(e => e.name === 'click');
      const scrolls = sessionData.events.filter(e => e.name === 'scroll');
      const pageViews = sessionData.events.filter(e => e.name === 'page_view');
      const actions = sessionData.events.filter(e => e.name === 'user_action');

      return {
        clicks: clicks.length,
        scrolls: scrolls.length,
        pageViews: pageViews.length,
        actions: actions.length,
        avgScrollDepth: scrolls.length > 0 
          ? scrolls.reduce((sum, s) => sum + (s.properties.depth || 0), 0) / scrolls.length 
          : 0
      };
    } catch (error) {
      console.error('[Analytics] Behavior summary retrieval failed:', error);
      return {};
    }
  }

  // ── Data Flushing ─────────────────────────────────────────────────────────

  /**
   * Start periodic flush
   */
  function startPeriodicFlush() {
    if (flushInterval) {
      clearInterval(flushInterval);
    }

    flushInterval = setInterval(() => {
      flushAnalytics();
    }, CONFIG.FLUSH_INTERVAL);
  }

  /**
   * Flush analytics data
   */
  async function flushAnalytics() {
    try {
      if (sessionData.events.length === 0 && sessionData.errors.length === 0) {
        return;
      }

      const data = {
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        events: sessionData.events,
        metrics: sessionData.metrics,
        errors: sessionData.errors,
        timestamp: Date.now()
      };

      // Send to server
      await sendAnalyticsToServer(data);

      // Clear sent data
      sessionData.events = [];
      sessionData.errors = [];

      console.log('[Analytics] Data flushed');
    } catch (error) {
      console.error('[Analytics] Data flush failed:', error);
    }
  }

  /**
   * Send analytics to server
   * @param {object} data - Analytics data
   */
  async function sendAnalyticsToServer(data) {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to send analytics');
      }

      console.log('[Analytics] Data sent to server');
      return true;
    } catch (error) {
      console.error('[Analytics] Server send failed:', error);
      return false;
    }
  }

  // ── Analytics Dashboard ────────────────────────────────────────────────────

  /**
   * Generate analytics report
   * @param {object} options - Report options
   */
  function generateAnalyticsReport(options = {}) {
    try {
      const report = {
        summary: {
          sessionDuration: Date.now() - sessionData.startTime,
          totalEvents: sessionData.events.length,
          totalErrors: sessionData.errors.length,
          uniquePages: new Set(sessionData.events.filter(e => e.name === 'page_view').map(e => e.properties.page)).size
        },
        behavior: getUserBehaviorSummary(),
        performance: getCoreWebVitals(),
        topEvents: getTopEvents(10),
        errorSummary: getErrorSummary(),
        timeline: generateTimeline()
      };

      return report;
    } catch (error) {
      console.error('[Analytics] Report generation failed:', error);
      return null;
    }
  }

  /**
   * Get top events
   * @param {number} limit - Number of top events
   */
  function getTopEvents(limit = 10) {
    try {
      const eventCounts = {};
      
      sessionData.events.forEach(event => {
        eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;
      });

      return Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
    } catch (error) {
      console.error('[Analytics] Top events retrieval failed:', error);
      return [];
    }
  }

  /**
   * Get error summary
   */
  function getErrorSummary() {
    try {
      const errorCounts = {};
      
      sessionData.errors.forEach(error => {
        const key = error.message;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });

      return Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([message, count]) => ({ message, count }));
    } catch (error) {
      console.error('[Analytics] Error summary retrieval failed:', error);
      return [];
    }
  }

  /**
   * Generate timeline
   */
  function generateTimeline() {
    try {
      return sessionData.events
        .map(event => ({
          time: event.properties.timestamp,
          type: event.name,
          data: event.properties
        }))
        .sort((a, b) => a.time - b.time);
    } catch (error) {
      console.error('[Analytics] Timeline generation failed:', error);
      return [];
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Session
    initSession: initSession,
    endSession: endSession,
    
    // Events
    trackEvent: trackEvent,
    trackPageView: trackPageView,
    trackAction: trackAction,
    
    // Behavior
    initBehaviorTracking: initBehaviorTracking,
    trackEngagement: trackEngagement,
    trackFeatureUsage: trackFeatureUsage,
    
    // Performance
    initPerformanceMonitoring: initPerformanceMonitoring,
    trackMetric: trackPerformanceMetric,
    measurePerformance: measurePerformance,
    getCoreWebVitals: getCoreWebVitals,
    
    // Errors
    initErrorTracking: initErrorTracking,
    trackError: trackError,
    trackCustomError: trackCustomError,
    
    // Real-time
    getRealTimeAnalytics: getRealTimeAnalytics,
    getBehaviorSummary: getUserBehaviorSummary,
    
    // Reports
    generateReport: generateAnalyticsReport,
    
    // State
    getSessionData: () => ({ ...sessionData }),
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsMonitoring;
}

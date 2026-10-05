/**
 * Advanced Analytics Dashboard for Monetixra
 * Real-time analytics, user behavior tracking, and performance metrics
 */

const AdvancedAnalytics = (function() {
  'use strict';

  // Analytics data storage
  const analyticsData = {
    users: {
      total: 0,
      active: 0,
      newToday: 0,
      newThisWeek: 0,
      newThisMonth: 0,
      online: 0,
      premium: 0,
      kycVerified: 0
    },
    posts: {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0
    },
    engagement: {
      avgSessionDuration: 0,
      bounceRate: 0,
      retentionRate: 0,
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0
    },
    revenue: {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      adRevenue: 0,
      subscriptionRevenue: 0,
      nftRevenue: 0
    },
    performance: {
      avgResponseTime: 0,
      errorRate: 0,
      uptime: 0,
      apiCalls: 0,
      cacheHitRate: 0
    },
    content: {
      mostViewed: [],
      mostLiked: [],
      mostCommented: [],
      trending: [],
      viral: []
    }
  };

  /**
   * Track user activity
   */
  function trackUserActivity(userId, action, metadata = {}) {
    const timestamp = Date.now();
    
    // Update daily active users
    const today = new Date().toDateString();
    if (!analyticsData.userActivity) analyticsData.userActivity = {};
    if (!analyticsData.userActivity[today]) analyticsData.userActivity[today] = new Set();
    analyticsData.userActivity[today].add(userId);
    
    analyticsData.engagement.dailyActiveUsers = analyticsData.userActivity[today].size;
    
    // Track action
    if (!analyticsData.actions) analyticsData.actions = {};
    if (!analyticsData.actions[action]) analyticsData.actions[action] = 0;
    analyticsData.actions[action]++;
    
    // Track session duration
    if (action === 'session_start') {
      if (!analyticsData.sessions) analyticsData.sessions = {};
      analyticsData.sessions[userId] = { start: timestamp, end: null };
    } else if (action === 'session_end') {
      if (analyticsData.sessions[userId]) {
        analyticsData.sessions[userId].end = timestamp;
        const duration = timestamp - analyticsData.sessions[userId].start;
        analyticsData.engagement.avgSessionDuration = calculateAverageSessionDuration();
      }
    }
  }

  /**
   * Track post engagement
   */
  function trackPostEngagement(postId, action, userId) {
    if (!analyticsData.postEngagement) analyticsData.postEngagement = {};
    if (!analyticsData.postEngagement[postId]) {
      analyticsData.postEngagement[postId] = {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        users: new Set()
      };
    }
    
    analyticsData.postEngagement[postId][action]++;
    analyticsData.postEngagement[postId].users.add(userId);
    
    // Update totals
    analyticsData.posts[action]++;
    
    // Update trending posts
    updateTrendingPosts();
  }

  /**
   * Track revenue
   */
  function trackRevenue(amount, source, metadata = {}) {
    const timestamp = Date.now();
    
    if (!analyticsData.revenueHistory) analyticsData.revenueHistory = [];
    
    analyticsData.revenueHistory.push({
      timestamp,
      amount,
      source,
      metadata
    });
    
    // Update totals
    analyticsData.revenue.total += amount;
    
    const today = new Date().toDateString();
    if (!analyticsData.dailyRevenue) analyticsData.dailyRevenue = {};
    if (!analyticsData.dailyRevenue[today]) analyticsData.dailyRevenue[today] = 0;
    analyticsData.dailyRevenue[today] += amount;
    analyticsData.revenue.today = analyticsData.dailyRevenue[today];
    
    // Update source-specific revenue
    if (source === 'ad') analyticsData.revenue.adRevenue += amount;
    if (source === 'subscription') analyticsData.revenue.subscriptionRevenue += amount;
    if (source === 'nft') analyticsData.revenue.nftRevenue += amount;
  }

  /**
   * Track API performance
   */
  function trackAPIPerformance(endpoint, responseTime, success) {
    if (!analyticsData.apiPerformance) analyticsData.apiPerformance = {};
    if (!analyticsData.apiPerformance[endpoint]) {
      analyticsData.apiPerformance[endpoint] = {
        calls: 0,
        totalResponseTime: 0,
        errors: 0
      };
    }
    
    analyticsData.apiPerformance[endpoint].calls++;
    analyticsData.apiPerformance[endpoint].totalResponseTime += responseTime;
    analyticsData.performance.apiCalls++;
    
    if (!success) {
      analyticsData.apiPerformance[endpoint].errors++;
      analyticsData.performance.errorRate = calculateErrorRate();
    }
    
    analyticsData.performance.avgResponseTime = calculateAverageResponseTime();
  }

  /**
   * Calculate average session duration
   */
  function calculateAverageSessionDuration() {
    const sessions = Object.values(analyticsData.sessions || {});
    const completedSessions = sessions.filter(s => s.end);
    
    if (completedSessions.length === 0) return 0;
    
    const totalDuration = completedSessions.reduce((sum, s) => sum + (s.end - s.start), 0);
    return totalDuration / completedSessions.length;
  }

  /**
   * Calculate error rate
   */
  function calculateErrorRate() {
    const totalCalls = Object.values(analyticsData.apiPerformance || {})
      .reduce((sum, api) => sum + api.calls, 0);
    const totalErrors = Object.values(analyticsData.apiPerformance || {})
      .reduce((sum, api) => sum + api.errors, 0);
    
    if (totalCalls === 0) return 0;
    return totalErrors / totalCalls;
  }

  /**
   * Calculate average response time
   */
  function calculateAverageResponseTime() {
    const apis = Object.values(analyticsData.apiPerformance || {});
    const totalCalls = apis.reduce((sum, api) => sum + api.calls, 0);
    const totalTime = apis.reduce((sum, api) => sum + api.totalResponseTime, 0);
    
    if (totalCalls === 0) return 0;
    return totalTime / totalCalls;
  }

  /**
   * Update trending posts
   */
  function updateTrendingPosts() {
    const posts = Object.entries(analyticsData.postEngagement || {})
      .map(([postId, data]) => ({
        postId,
        engagementScore: data.views + (data.likes * 3) + (data.comments * 5) + (data.shares * 10),
        ...data
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 20);
    
    analyticsData.content.trending = posts.map(p => p.postId);
    analyticsData.content.mostViewed = posts.sort((a, b) => b.views - a.views).slice(0, 10).map(p => p.postId);
    analyticsData.content.mostLiked = posts.sort((a, b) => b.likes - a.likes).slice(0, 10).map(p => p.postId);
    analyticsData.content.mostCommented = posts.sort((a, b) => b.comments - a.comments).slice(0, 10).map(p => p.postId);
  }

  /**
   * Get analytics report for a specific period
   */
  function getReport(period = 'daily') {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'hourly':
        startDate = new Date(now - 60 * 60 * 1000);
        break;
      case 'daily':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 24 * 60 * 60 * 1000);
    }
    
    // Filter data by period
    const periodRevenue = analyticsData.revenueHistory.filter(
      r => r.timestamp >= startDate.getTime()
    );
    
    const periodRevenueTotal = periodRevenue.reduce((sum, r) => sum + r.amount, 0);
    
    return {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      users: {
        total: analyticsData.users.total,
        active: analyticsData.users.active,
        new: analyticsData.users.newToday
      },
      posts: {
        total: analyticsData.posts.total,
        created: analyticsData.posts.today,
        views: analyticsData.posts.views,
        likes: analyticsData.posts.likes,
        comments: analyticsData.posts.comments,
        shares: analyticsData.posts.shares
      },
      engagement: {
        dailyActiveUsers: analyticsData.engagement.dailyActiveUsers,
        avgSessionDuration: analyticsData.engagement.avgSessionDuration,
        bounceRate: analyticsData.engagement.bounceRate,
        retentionRate: analyticsData.engagement.retentionRate
      },
      revenue: {
        total: periodRevenueTotal,
        adRevenue: periodRevenue.filter(r => r.source === 'ad').reduce((s, r) => s + r.amount, 0),
        subscriptionRevenue: periodRevenue.filter(r => r.source === 'subscription').reduce((s, r) => s + r.amount, 0),
        nftRevenue: periodRevenue.filter(r => r.source === 'nft').reduce((s, r) => s + r.amount, 0)
      },
      performance: {
        avgResponseTime: analyticsData.performance.avgResponseTime,
        errorRate: analyticsData.performance.errorRate,
        uptime: analyticsData.performance.uptime,
        apiCalls: analyticsData.performance.apiCalls,
        cacheHitRate: analyticsData.performance.cacheHitRate
      },
      content: {
        trending: analyticsData.content.trending,
        mostViewed: analyticsData.content.mostViewed,
        mostLiked: analyticsData.content.mostLiked,
        mostCommented: analyticsData.content.mostCommented
      }
    };
  }

  /**
   * Get user-specific analytics
   */
  function getUserAnalytics(userId) {
    if (!analyticsData.userAnalytics) analyticsData.userAnalytics = {};
    if (!analyticsData.userAnalytics[userId]) {
      analyticsData.userAnalytics[userId] = {
        posts: 0,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        followers: 0,
        following: 0,
        points: 0,
        earnings: 0,
        joinDate: null
      };
    }
    
    return analyticsData.userAnalytics[userId];
  }

  /**
   * Update user analytics
   */
  function updateUserAnalytics(userId, data) {
    if (!analyticsData.userAnalytics) analyticsData.userAnalytics = {};
    if (!analyticsData.userAnalytics[userId]) {
      analyticsData.userAnalytics[userId] = {
        posts: 0,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        followers: 0,
        following: 0,
        points: 0,
        earnings: 0,
        joinDate: new Date().toISOString()
      };
    }
    
    Object.assign(analyticsData.userAnalytics[userId], data);
  }

  /**
   * Get real-time dashboard data
   */
  function getDashboardData() {
    return {
      timestamp: new Date().toISOString(),
      users: analyticsData.users,
      posts: analyticsData.posts,
      engagement: analyticsData.engagement,
      revenue: analyticsData.revenue,
      performance: analyticsData.performance,
      content: analyticsData.content,
      trending: analyticsData.content.trending.slice(0, 5)
    };
  }

  /**
   * Export analytics data
   */
  function exportData(format = 'json') {
    const data = {
      exportDate: new Date().toISOString(),
      data: analyticsData
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      return convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Convert analytics data to CSV format
   */
  function convertToCSV(data) {
    // Simple CSV conversion for basic analytics
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', data.data.users.total],
      ['Active Users', data.data.users.active],
      ['Total Posts', data.data.posts.total],
      ['Total Views', data.data.posts.views],
      ['Total Likes', data.data.posts.likes],
      ['Total Comments', data.data.posts.comments],
      ['Total Shares', data.data.posts.shares],
      ['Total Revenue', data.data.revenue.total],
      ['Average Response Time', data.data.performance.avgResponseTime],
      ['Error Rate', data.data.performance.errorRate],
      ['Uptime', data.data.performance.uptime]
    ];
    
    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Reset analytics data (for testing)
   */
  function reset() {
    // Don't reset everything, just clear temporary data
    analyticsData.userActivity = {};
    analyticsData.sessions = {};
  }

  return {
    trackUserActivity,
    trackPostEngagement,
    trackRevenue,
    trackAPIPerformance,
    getReport,
    getUserAnalytics,
    updateUserAnalytics,
    getDashboardData,
    exportData,
    reset
  };
})();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedAnalytics;
} else {
  window.AdvancedAnalytics = AdvancedAnalytics;
}

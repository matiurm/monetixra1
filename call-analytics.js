/**
 * ================================================================
 *  CALL ANALYTICS AND INSIGHTS SYSTEM (ENHANCED)
 *  Call Quality Metrics | Chat Pattern Analysis | User Engagement
 *  Network Diagnostics | Performance Tracking
 *  AI-Powered Insights | Predictive Analytics | Anomaly Detection
 * ================================================================
 */

const CallAnalytics = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    version: '2.0.0',
    maxDataPoints: 1000,
    retentionDays: 30,
    enableRealTimeTracking: true,
    enableAggregation: true,
    enableAIInsights: true,
    enablePredictiveAnalytics: true,
    enableAnomalyDetection: true
  };

  // State
  let state = {
    callMetrics: new Map(),
    chatMetrics: new Map(),
    userMetrics: new Map(),
    networkMetrics: new Map(),
    realTimeData: [],
    aggregationInterval: null,
    aiInsights: new Map(),
    predictions: new Map(),
    anomalies: new Map(),
    baselineMetrics: new Map()
  };

  // ============================================
  // CALL QUALITY METRICS
  // ============================================

  function startCallTracking(callId) {
    try {
      const callData = {
        callId: callId,
        startTime: Date.now(),
        endTime: null,
        duration: 0,
        qualityMetrics: {
          videoBitrate: [],
          audioBitrate: [],
          packetLoss: [],
          jitter: [],
          rtt: [],
          frameRate: [],
          resolution: []
        },
        networkMetrics: {
          iceConnectionState: [],
          iceGatheringState: [],
          signalingState: []
        },
        participantCount: 0,
        issues: []
      };

      state.callMetrics.set(callId, callData);
      console.log('[CallAnalytics] Started tracking call:', callId);
      return true;
    } catch (error) {
      console.error('[CallAnalytics] Start call tracking failed:', error);
      return false;
    }
  }

  function endCallTracking(callId) {
    try {
      const callData = state.callMetrics.get(callId);
      if (!callData) {
        console.warn('[CallAnalytics] Call not found:', callId);
        return false;
      }

      callData.endTime = Date.now();
      callData.duration = callData.endTime - callData.startTime;

      // Calculate average metrics
      callData.averageQuality = calculateAverageQuality(callData.qualityMetrics);
      callData.networkScore = calculateNetworkScore(callData.networkMetrics);

      // Save to local storage
      saveCallToStorage(callData);

      console.log('[CallAnalytics] Ended tracking call:', callId);
      return true;
    } catch (error) {
      console.error('[CallAnalytics] End call tracking failed:', error);
      return false;
    }
  }

  function recordCallMetric(callId, metricType, value) {
    try {
      const callData = state.callMetrics.get(callId);
      if (!callData) {
        return false;
      }

      if (callData.qualityMetrics[metricType]) {
        callData.qualityMetrics[metricType].push({
          timestamp: Date.now(),
          value: value
        });
      }

      return true;
    } catch (error) {
      console.error('[CallAnalytics] Record metric failed:', error);
      return false;
    }
  }

  function recordNetworkEvent(callId, eventType, state) {
    try {
      const callData = state.callMetrics.get(callId);
      if (!callData) {
        return false;
      }

      if (callData.networkMetrics[eventType]) {
        callData.networkMetrics[eventType].push({
          timestamp: Date.now(),
          state: state
        });
      }

      return true;
    } catch (error) {
      console.error('[CallAnalytics] Record network event failed:', error);
      return false;
    }
  }

  function recordCallIssue(callId, issueType, description) {
    try {
      const callData = state.callMetrics.get(callId);
      if (!callData) {
        return false;
      }

      callData.issues.push({
        timestamp: Date.now(),
        type: issueType,
        description: description
      });

      return true;
    } catch (error) {
      console.error('[CallAnalytics] Record issue failed:', error);
      return false;
    }
  }

  // ============================================
  // CHAT PATTERN ANALYSIS
  // ============================================

  function trackChatMessage(chatId, from, to, messageType, length) {
    try {
      if (!state.chatMetrics.has(chatId)) {
        state.chatMetrics.set(chatId, {
          chatId: chatId,
          participants: new Set([from, to]),
          messages: [],
          startTime: Date.now(),
          lastActivity: Date.now()
        });
      }

      const chatData = state.chatMetrics.get(chatId);
      chatData.participants.add(from);
      chatData.participants.add(to);
      chatData.lastActivity = Date.now();

      chatData.messages.push({
        timestamp: Date.now(),
        from: from,
        to: to,
        type: messageType,
        length: length
      });

      return true;
    } catch (error) {
      console.error('[CallAnalytics] Track chat message failed:', error);
      return false;
    }
  }

  function analyzeChatPatterns(chatId) {
    try {
      const chatData = state.chatMetrics.get(chatId);
      if (!chatData || chatData.messages.length === 0) {
        return null;
      }

      const messages = chatData.messages;
      const totalMessages = messages.length;
      const participants = Array.from(chatData.participants);

      // Calculate message frequency per participant
      const messageFrequency = {};
      participants.forEach(p => {
        messageFrequency[p] = messages.filter(m => m.from === p).length;
      });

      // Calculate response times
      const responseTimes = [];
      for (let i = 1; i < messages.length; i++) {
        if (messages[i].from !== messages[i - 1].from) {
          responseTimes.push(messages[i].timestamp - messages[i - 1].timestamp);
        }
      }

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      // Calculate peak activity hours
      const hourlyActivity = new Array(24).fill(0);
      messages.forEach(m => {
        const hour = new Date(m.timestamp).getHours();
        hourlyActivity[hour]++;
      });

      const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));

      // Calculate message type distribution
      const messageTypeDistribution = {};
      messages.forEach(m => {
        messageTypeDistribution[m.type] = (messageTypeDistribution[m.type] || 0) + 1;
      });

      return {
        totalMessages: totalMessages,
        participants: participants.length,
        messageFrequency: messageFrequency,
        averageResponseTime: avgResponseTime,
        peakActivityHour: peakHour,
        hourlyActivity: hourlyActivity,
        messageTypeDistribution: messageTypeDistribution,
        engagementScore: calculateEngagementScore(chatData)
      };
    } catch (error) {
      console.error('[CallAnalytics] Chat pattern analysis failed:', error);
      return null;
    }
  }

  // ============================================
  // USER ENGAGEMENT METRICS
  // ============================================

  function trackUserActivity(userId, activityType, metadata = {}) {
    try {
      if (!state.userMetrics.has(userId)) {
        state.userMetrics.set(userId, {
          userId: userId,
          activities: [],
          totalActivityTime: 0,
          firstSeen: Date.now(),
          lastSeen: Date.now()
        });
      }

      const userData = state.userMetrics.get(userId);
      userData.lastSeen = Date.now();

      userData.activities.push({
        timestamp: Date.now(),
        type: activityType,
        metadata: metadata
      });

      return true;
    } catch (error) {
      console.error('[CallAnalytics] Track user activity failed:', error);
      return false;
    }
  }

  function generateUserInsights(userId) {
    try {
      const userData = state.userMetrics.get(userId);
      if (!userData) {
        return null;
      }

      const activities = userData.activities;
      const totalActivities = activities.length;

      // Calculate activity distribution
      const activityDistribution = {};
      activities.forEach(a => {
        activityDistribution[a.type] = (activityDistribution[a.type] || 0) + 1;
      });

      // Calculate peak activity times
      const hourlyActivity = new Array(24).fill(0);
      const dailyActivity = new Array(7).fill(0);

      activities.forEach(a => {
        const date = new Date(a.timestamp);
        hourlyActivity[date.getHours()]++;
        dailyActivity[date.getDay()]++;
      });

      const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
      const peakDay = dailyActivity.indexOf(Math.max(...dailyActivity));

      // Calculate communication preferences
      const callActivities = activities.filter(a => a.type === 'call' || a.type === 'video_call' || a.type === 'audio_call');
      const chatActivities = activities.filter(a => a.type === 'chat' || a.type === 'message');

      const communicationPreference = callActivities.length > chatActivities.length ? 'calls' : 'chat';

      return {
        totalActivities: totalActivities,
        activityDistribution: activityDistribution,
        peakActivityHour: peakHour,
        peakActivityDay: peakDay,
        communicationPreference: communicationPreference,
        engagementScore: calculateUserEngagementScore(userData),
        retentionRate: calculateRetentionRate(userData)
      };
    } catch (error) {
      console.error('[CallAnalytics] User insights generation failed:', error);
      return null;
    }
  }

  // ============================================
  // NETWORK DIAGNOSTICS
  // ============================================

  function startNetworkDiagnostics(callId) {
    try {
      const networkData = {
        callId: callId,
        startTime: Date.now(),
        connectionType: navigator.connection?.effectiveType || 'unknown',
        rtt: navigator.connection?.rtt || 0,
        downlink: navigator.connection?.downlink || 0,
        samples: []
      };

      state.networkMetrics.set(callId, networkData);

      // Start sampling
      const interval = setInterval(() => {
        const sample = {
          timestamp: Date.now(),
          rtt: navigator.connection?.rtt || 0,
          downlink: navigator.connection?.downlink || 0,
          effectiveType: navigator.connection?.effectiveType || 'unknown'
        };

        networkData.samples.push(sample);

        // Keep only last 100 samples
        if (networkData.samples.length > 100) {
          networkData.samples.shift();
        }
      }, 1000);

      networkData.interval = interval;

      console.log('[CallAnalytics] Started network diagnostics:', callId);
      return true;
    } catch (error) {
      console.error('[CallAnalytics] Start network diagnostics failed:', error);
      return false;
    }
  }

  function stopNetworkDiagnostics(callId) {
    try {
      const networkData = state.networkMetrics.get(callId);
      if (!networkData) {
        return false;
      }

      if (networkData.interval) {
        clearInterval(networkData.interval);
      }

      networkData.endTime = Date.now();

      // Calculate network health score
      networkData.healthScore = calculateNetworkHealth(networkData);

      console.log('[CallAnalytics] Stopped network diagnostics:', callId);
      return true;
    } catch (error) {
      console.error('[CallAnalytics] Stop network diagnostics failed:', error);
      return false;
    }
  }

  // ============================================
  // CALCULATION HELPERS
  // ============================================

  function calculateAverageQuality(metrics) {
    const averages = {};

    for (const [key, values] of Object.entries(metrics)) {
      if (values.length > 0) {
        const sum = values.reduce((acc, v) => acc + (v.value || v), 0);
        averages[key] = sum / values.length;
      } else {
        averages[key] = 0;
      }
    }

    return averages;
  }

  function calculateNetworkScore(metrics) {
    // Simple network score calculation
    const connectionStates = metrics.iceConnectionState || [];
    const stableConnections = connectionStates.filter(s => s.state === 'connected').length;
    const totalConnections = connectionStates.length;

    if (totalConnections === 0) return 0;

    return (stableConnections / totalConnections) * 100;
  }

  function calculateEngagementScore(chatData) {
    const messages = chatData.messages;
    if (messages.length === 0) return 0;

    const participants = chatData.participants.size;
    const duration = chatData.lastActivity - chatData.startTime;
    const messagesPerMinute = (messages.length / (duration / 60000)) || 0;

    // Simple engagement score formula
    const score = (messagesPerMinute * 10) + (participants * 5);
    return Math.min(score, 100);
  }

  function calculateUserEngagementScore(userData) {
    const activities = userData.activities;
    if (activities.length === 0) return 0;

    const daysActive = new Set(
      activities.map(a => new Date(a.timestamp).toDateString())
    ).size;

    const totalDays = (Date.now() - userData.firstSeen) / (1000 * 60 * 60 * 24) || 1;
    const activityRate = activities.length / totalDays;

    return Math.min(activityRate * 5, 100);
  }

  function calculateRetentionRate(userData) {
    const activities = userData.activities;
    if (activities.length === 0) return 0;

    const lastActivity = userData.lastSeen;
    const firstActivity = userData.firstSeen;
    const totalDays = (lastActivity - firstActivity) / (1000 * 60 * 60 * 24) || 1;

    const daysActive = new Set(
      activities.map(a => new Date(a.timestamp).toDateString())
    ).size;

    return (daysActive / totalDays) * 100;
  }

  function calculateNetworkHealth(networkData) {
    const samples = networkData.samples;
    if (samples.length === 0) return 0;

    const avgRtt = samples.reduce((acc, s) => acc + s.rtt, 0) / samples.length;
    const avgDownlink = samples.reduce((acc, s) => acc + s.downlink, 0) / samples.length;

    // Health score based on RTT and downlink
    const rttScore = Math.max(0, 100 - (avgRtt / 10)); // Lower RTT is better
    const downlinkScore = Math.min(avgDownlink * 10, 100); // Higher downlink is better

    return (rttScore + downlinkScore) / 2;
  }

  // ============================================
  // STORAGE
  // ============================================

  function saveCallToStorage(callData) {
    try {
      const storedCalls = JSON.parse(localStorage.getItem('callAnalytics') || '[]');
      storedCalls.push(callData);

      // Keep only last 100 calls
      if (storedCalls.length > 100) {
        storedCalls.shift();
      }

      localStorage.setItem('callAnalytics', JSON.stringify(storedCalls));
    } catch (error) {
      console.error('[CallAnalytics] Save to storage failed:', error);
    }
  }

  function getStoredCalls() {
    try {
      return JSON.parse(localStorage.getItem('callAnalytics') || '[]');
    } catch (error) {
      console.error('[CallAnalytics] Get stored calls failed:', error);
      return [];
    }
  }

  // ============================================
  // AI-POWERED INSIGHTS
  // ============================================

  async function generateAIInsights(userId, dataType = 'all') {
    try {
      if (!CONFIG.enableAIInsights) {
        return null;
      }

      const userData = state.userMetrics.get(userId);
      if (!userData) {
        return null;
      }

      const activities = userData.activities;
      const insights = {
        userId: userId,
        generatedAt: Date.now(),
        communicationStyle: analyzeCommunicationStyle(activities),
        optimalContactTimes: findOptimalContactTimes(activities),
        relationshipStrength: calculateRelationshipStrength(activities),
        activityTrends: detectActivityTrends(activities),
        recommendations: generateRecommendations(activities)
      };

      state.aiInsights.set(userId, insights);

      console.log('[CallAnalytics] AI insights generated for user:', userId);
      return insights;
    } catch (error) {
      console.error('[CallAnalytics] AI insights generation failed:', error);
      return null;
    }
  }

  function analyzeCommunicationStyle(activities) {
    const callActivities = activities.filter(a => a.type === 'call' || a.type === 'video_call');
    const chatActivities = activities.filter(a => a.type === 'chat' || a.type === 'message');

    const total = activities.length;
    const callRatio = callActivities.length / total;
    const chatRatio = chatActivities.length / total;

    let style = 'balanced';
    if (callRatio > 0.7) style = 'voice_oriented';
    else if (chatRatio > 0.7) style = 'text_oriented';

    return {
      style: style,
      preference: callRatio > chatRatio ? 'calls' : 'chat',
      diversity: new Set(activities.map(a => a.type)).size
    };
  }

  function findOptimalContactTimes(activities) {
    const hourlyActivity = new Array(24).fill(0);
    activities.forEach(a => {
      const hour = new Date(a.timestamp).getHours();
      hourlyActivity[hour]++;
    });

    const topHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);

    return topHours;
  }

  function calculateRelationshipStrength(activities) {
    const contacts = new Map();
    activities.forEach(a => {
      const contactId = a.metadata?.contactId || 'unknown';
      contacts.set(contactId, (contacts.get(contactId) || 0) + 1);
    });

    const avgInteractions = Array.from(contacts.values()).reduce((a, b) => a + b, 0) / contacts.size;
    const uniqueContacts = contacts.size;

    return {
      uniqueContacts: uniqueContacts,
      avgInteractions: Math.round(avgInteractions),
      strength: uniqueContacts > 10 ? 'high' : uniqueContacts > 5 ? 'medium' : 'low'
    };
  }

  function detectActivityTrends(activities) {
    const recentActivities = activities.slice(-100);
    const dailyActivity = new Map();

    recentActivities.forEach(a => {
      const day = new Date(a.timestamp).toDateString();
      dailyActivity.set(day, (dailyActivity.get(day) || 0) + 1);
    });

    const trend = dailyActivity.size > 0 ? 'increasing' : 'stable';

    return {
      trend: trend,
      avgDailyActivity: Array.from(dailyActivity.values()).reduce((a, b) => a + b, 0) / dailyActivity.size
    };
  }

  function generateRecommendations(activities) {
    const recommendations = [];

    const callActivities = activities.filter(a => a.type === 'call');
    if (callActivities.length < 5) {
      recommendations.push({
        type: 'engagement',
        message: 'Try making more calls to strengthen relationships'
      });
    }

    const nightActivities = activities.filter(a => {
      const hour = new Date(a.timestamp).getHours();
      return hour >= 22 || hour < 6;
    });

    if (nightActivities.length > activities.length * 0.3) {
      recommendations.push({
        type: 'health',
        message: 'Consider reducing late-night communications for better work-life balance'
      });
    }

    return recommendations;
  }

  // ============================================
  // PREDICTIVE ANALYTICS
  // ============================================

  async function predictCallQuality(userId, targetUserId) {
    try {
      if (!CONFIG.enablePredictiveAnalytics) {
        return null;
      }

      const historicalCalls = getStoredCalls().filter(c =>
        (c.metadata?.userId === userId || c.metadata?.targetUserId === targetUserId)
      );

      if (historicalCalls.length < 5) {
        return { predictedQuality: 'unknown', confidence: 0.3 };
      }

      // Calculate average quality metrics
      const avgBitrate = historicalCalls.reduce((sum, c) => sum + (c.averageQuality?.videoBitrate || 0), 0) / historicalCalls.length;
      const avgPacketLoss = historicalCalls.reduce((sum, c) => sum + (c.averageQuality?.packetLoss || 0), 0) / historicalCalls.length;

      let predictedQuality = 'good';
      if (avgBitrate < 500 || avgPacketLoss > 5) {
        predictedQuality = 'poor';
      } else if (avgBitrate < 1000 || avgPacketLoss > 2) {
        predictedQuality = 'fair';
      }

      const prediction = {
        predictedQuality: predictedQuality,
        confidence: 0.7,
        estimatedBitrate: avgBitrate,
        estimatedPacketLoss: avgPacketLoss,
        recommendations: predictedQuality === 'poor' ? ['Consider using WiFi', 'Close other apps'] : []
      };

      state.predictions.set(`${userId}-${targetUserId}`, prediction);

      return prediction;
    } catch (error) {
      console.error('[CallAnalytics] Call quality prediction failed:', error);
      return null;
    }
  }

  async function predictUserEngagement(userId, daysAhead = 7) {
    try {
      if (!CONFIG.enablePredictiveAnalytics) {
        return null;
      }

      const userData = state.userMetrics.get(userId);
      if (!userData) {
        return null;
      }

      const activities = userData.activities;
      const dailyActivity = new Map();

      activities.forEach(a => {
        const day = new Date(a.timestamp).toDateString();
        dailyActivity.set(day, (dailyActivity.get(day) || 0) + 1);
      });

      const recentActivity = Array.from(dailyActivity.values()).slice(-7);
      const avgActivity = recentActivity.reduce((a, b) => a + b, 0) / recentActivity.length;

      const trend = detectActivityTrend(activities).trend;
      const predictedActivity = trend === 'increasing' ? avgActivity * 1.1 : avgActivity * 0.9;

      const prediction = {
        userId: userId,
        daysAhead: daysAhead,
        predictedActivity: Math.round(predictedActivity),
        trend: trend,
        confidence: 0.65
      };

      state.predictions.set(`engagement-${userId}`, prediction);

      return prediction;
    } catch (error) {
      console.error('[CallAnalytics] Engagement prediction failed:', error);
      return null;
    }
  }

  // ============================================
  // ANOMALY DETECTION
  // ============================================

  async function detectAnomalies(userId, dataType = 'all') {
    try {
      if (!CONFIG.enableAnomalyDetection) {
        return null;
      }

      const anomalies = [];

      // Detect call quality anomalies
      if (dataType === 'all' || dataType === 'calls') {
        const callAnomalies = await detectCallAnomalies(userId);
        anomalies.push(...callAnomalies);
      }

      // Detect activity anomalies
      if (dataType === 'all' || dataType === 'activity') {
        const activityAnomalies = await detectActivityAnomalies(userId);
        anomalies.push(...activityAnomalies);
      }

      // Detect network anomalies
      if (dataType === 'all' || dataType === 'network') {
        const networkAnomalies = await detectNetworkAnomalies(userId);
        anomalies.push(...networkAnomalies);
      }

      state.anomalies.set(userId, anomalies);

      console.log('[CallAnalytics] Anomalies detected for user:', userId, anomalies.length);
      return anomalies;
    } catch (error) {
      console.error('[CallAnalytics] Anomaly detection failed:', error);
      return [];
    }
  }

  async function detectCallAnomalies(userId) {
    const anomalies = [];
    const calls = getStoredCalls().filter(c => c.metadata?.userId === userId);

    if (calls.length < 5) return anomalies;

    // Calculate baseline
    const avgDuration = calls.reduce((sum, c) => sum + c.duration, 0) / calls.length;
    const avgIssues = calls.reduce((sum, c) => sum + c.issues.length, 0) / calls.length;

    // Detect unusually short calls
    const shortCalls = calls.filter(c => c.duration < avgDuration * 0.3);
    if (shortCalls.length > calls.length * 0.2) {
      anomalies.push({
        type: 'call_duration',
        severity: 'medium',
        description: 'Unusually high number of short calls detected',
        count: shortCalls.length
      });
    }

    // Detect high issue rate
    const highIssueCalls = calls.filter(c => c.issues.length > avgIssues * 2);
    if (highIssueCalls.length > calls.length * 0.2) {
      anomalies.push({
        type: 'call_issues',
        severity: 'high',
        description: 'High rate of call issues detected',
        count: highIssueCalls.length
      });
    }

    return anomalies;
  }

  async function detectActivityAnomalies(userId) {
    const anomalies = [];
    const userData = state.userMetrics.get(userId);
    if (!userData) return anomalies;

    const activities = userData.activities;
    if (activities.length < 10) return anomalies;

    // Calculate daily activity
    const dailyActivity = new Map();
    activities.forEach(a => {
      const day = new Date(a.timestamp).toDateString();
      dailyActivity.set(day, (dailyActivity.get(day) || 0) + 1);
    });

    const avgDaily = Array.from(dailyActivity.values()).reduce((a, b) => a + b, 0) / dailyActivity.size;

    // Detect sudden inactivity
    const recentDays = Array.from(dailyActivity.values()).slice(-3);
    const recentAvg = recentDays.reduce((a, b) => a + b, 0) / recentDays.length;

    if (recentAvg < avgDaily * 0.5) {
      anomalies.push({
        type: 'activity_drop',
        severity: 'medium',
        description: 'Sudden drop in activity detected',
        recentActivity: recentAvg,
        averageActivity: avgDaily
      });
    }

    // Detect unusual burst
    if (recentAvg > avgDaily * 2) {
      anomalies.push({
        type: 'activity_surge',
        severity: 'low',
        description: 'Unusual activity surge detected',
        recentActivity: recentAvg,
        averageActivity: avgDaily
      });
    }

    return anomalies;
  }

  async function detectNetworkAnomalies(userId) {
    const anomalies = [];
    const networkData = Array.from(state.networkMetrics.values()).filter(n => n.metadata?.userId === userId);

    if (networkData.length < 5) return anomalies;

    // Calculate baseline
    const avgRTT = networkData.reduce((sum, n) => sum + (n.samples?.reduce((s, x) => s + x.rtt, 0) / n.samples.length || 0), 0) / networkData.length;

    // Detect high latency
    const highLatency = networkData.filter(n => {
      const avgRTT = n.samples?.reduce((s, x) => s + x.rtt, 0) / n.samples.length || 0;
      return avgRTT > avgRTT * 2;
    });

    if (highLatency.length > networkData.length * 0.3) {
      anomalies.push({
        type: 'network_latency',
        severity: 'high',
        description: 'High network latency detected in multiple sessions',
        count: highLatency.length
      });
    }

    return anomalies;
  }

  function setupBaselineMetrics(userId) {
    const userData = state.userMetrics.get(userId);
    if (!userData) return;

    const activities = userData.activities;
    const baseline = {
      avgDailyActivity: activities.length / 30, // Assume 30 days
      avgCallDuration: 300000, // 5 minutes default
      avgResponseTime: 60000, // 1 minute default
      peakHours: [9, 10, 11, 14, 15, 16, 17, 18, 19, 20]
    };

    state.baselineMetrics.set(userId, baseline);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function initialize(config = {}) {
    if (config.enableRealTimeTracking !== undefined) {
      CONFIG.enableRealTimeTracking = config.enableRealTimeTracking;
    }
    if (config.enableAIInsights !== undefined) {
      CONFIG.enableAIInsights = config.enableAIInsights;
    }
    if (config.enablePredictiveAnalytics !== undefined) {
      CONFIG.enablePredictiveAnalytics = config.enablePredictiveAnalytics;
    }
    if (config.enableAnomalyDetection !== undefined) {
      CONFIG.enableAnomalyDetection = config.enableAnomalyDetection;
    }

    // Load stored data
    const storedCalls = getStoredCalls();
    console.log('[CallAnalytics] Loaded', storedCalls.length, 'stored calls');

    console.log('[CallAnalytics] Initialized');
    console.log('[CallAnalytics] AI Insights:', CONFIG.enableAIInsights);
    console.log('[CallAnalytics] Predictive Analytics:', CONFIG.enablePredictiveAnalytics);
    console.log('[CallAnalytics] Anomaly Detection:', CONFIG.enableAnomalyDetection);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    initialize,
    startCallTracking,
    endCallTracking,
    recordCallMetric,
    recordNetworkEvent,
    recordCallIssue,
    trackChatMessage,
    analyzeChatPatterns,
    trackUserActivity,
    generateUserInsights,
    startNetworkDiagnostics,
    stopNetworkDiagnostics,
    getStoredCalls,
    // Enhanced features
    generateAIInsights,
    predictCallQuality,
    predictUserEngagement,
    detectAnomalies,
    setupBaselineMetrics,
    getState: () => state
  };
})();

// Auto-initialize
CallAnalytics.initialize();

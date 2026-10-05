// ============================================================
//  Monetixra - Copyright Enforcement System
//  Handles: Copyright Reports, Notifications, Auto-Delete UI
// ============================================================

const MonetixraCopyright = {
  // Submit a copyright report
  submitReport: async function (reportData) {
    try {
      const response = await fetch('/api/copyright/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });

      const data = await response.json();

      if (data.success) {
        console.log('[Copyright] Report submitted successfully:', data.report);
        return { success: true, report: data.report };
      } else {
        console.error('[Copyright] Report submission failed:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('[Copyright] Submit report error:', error);
      return { success: false, error: 'Network error' };
    }
  },

  // Get copyright reports for current user
  getReports: async function (userId) {
    try {
      const response = await fetch(`/api/copyright/reports/${userId}`);
      const data = await response.json();
      return data.reports || [];
    } catch (error) {
      console.error('[Copyright] Get reports error:', error);
      return [];
    }
  },

  // Get copyright notifications for current user
  getNotifications: async function (userId) {
    try {
      const response = await fetch(`/api/copyright/notifications/${userId}`);
      const data = await response.json();
      return data.notifications || [];
    } catch (error) {
      console.error('[Copyright] Get notifications error:', error);
      return [];
    }
  },

  // Mark notification as read
  markNotificationRead: async function (notificationId) {
    try {
      const response = await fetch(`/api/copyright/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[Copyright] Mark read error:', error);
      return false;
    }
  },

  // Get user copyright status
  getStatus: async function (userId) {
    try {
      const response = await fetch(`/api/copyright/status/${userId}`);
      const data = await response.json();
      return data.status || { isCopyrightFree: true };
    } catch (error) {
      console.error('[Copyright] Get status error:', error);
      return { isCopyrightFree: true };
    }
  },

  // Display copyright notification banner
  showNotificationBanner: function (notification) {
    const existingBanner = document.getElementById('copyright-notification-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'copyright-notification-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
      color: white;
      padding: 16px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    `;

    const message = document.createElement('div');
    message.style.cssText = 'flex: 1; min-width: 200px;';
    message.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">⚠️ ${notification.notification_type === 'deletion_notice' ? 'Content Deletion Notice' : 'Copyright Warning'}</div>
      <div style="font-size: 14px;">${notification.message}</div>
      ${notification.deletion_deadline ? `<div style="font-size: 12px; margin-top: 4px;">Auto-delete: ${new Date(notification.deletion_deadline).toLocaleString()}</div>` : ''}
    `;

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 8px;';

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.style.cssText = `
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.4);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    `;
    dismissBtn.onclick = () => {
      this.markNotificationRead(notification.id);
      banner.remove();
    };

    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'View Details';
    viewBtn.style.cssText = `
      background: white;
      border: none;
      color: #ff6b6b;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    `;
    viewBtn.onclick = () => {
      this.showCopyrightDetails(notification);
    };

    actions.appendChild(dismissBtn);
    actions.appendChild(viewBtn);
    banner.appendChild(message);
    banner.appendChild(actions);

    document.body.appendChild(banner);
  },

  // Show copyright details modal
  showCopyrightDetails: function (notification) {
    const existingModal = document.getElementById('copyright-details-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'copyright-details-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #1a1a2e;
      color: white;
      padding: 24px;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    content.innerHTML = `
      <h2 style="margin: 0 0 16px 0; color: #ff6b6b;">⚠️ Copyright Violation Details</h2>
      <div style="margin-bottom: 16px;">
        <strong>Content Type:</strong> ${notification.content_type || 'N/A'}
      </div>
      <div style="margin-bottom: 16px;">
        <strong>Content ID:</strong> ${notification.content_id || 'N/A'}
      </div>
      <div style="margin-bottom: 16px;">
        <strong>Message:</strong> ${notification.message}
      </div>
      ${notification.deletion_deadline ? `
        <div style="margin-bottom: 16px; color: #ff6b6b;">
          <strong>⏰ Auto-Delete Deadline:</strong> ${new Date(notification.deletion_deadline).toLocaleString()}
        </div>
      ` : ''}
      <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,107,107,0.1); border-radius: 8px; border-left: 4px solid #ff6b6b;">
        <strong>Important:</strong> Your content will be automatically deleted within 12-24 hours due to copyright violation. Please ensure all your content is copyright-free to avoid future violations.
      </div>
      <div style="display: flex; gap: 8px; margin-top: 20px;">
        <button id="close-modal-btn" style="flex: 1; padding: 12px; background: #4a9eff; border: none; color: white; border-radius: 8px; cursor: pointer;">Close</button>
        <button id="acknowledge-btn" style="flex: 1; padding: 12px; background: #6bcf7f; border: none; color: white; border-radius: 8px; cursor: pointer;">Acknowledge</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('close-modal-btn').onclick = () => modal.remove();
    document.getElementById('acknowledge-btn').onclick = () => {
      this.markNotificationRead(notification.id);
      modal.remove();
    };

    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  },

  // Display copyright status indicator
  showStatusIndicator: function (status) {
    const existingIndicator = document.getElementById('copyright-status-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    if (!status || status.isCopyrightFree) {
      return; // Don't show indicator if user is copyright-free
    }

    const indicator = document.createElement('div');
    indicator.id = 'copyright-status-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 20px;
      background: ${status.activeViolations > 0 ? '#ff6b6b' : '#6bcf7f'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      font-size: 12px;
    `;

    indicator.innerHTML = `
      <div style="font-weight: bold;">${status.activeViolations > 0 ? '⚠️ Copyright Issues' : '✅ Copyright Clear'}</div>
      <div>Active Violations: ${status.activeViolations}</div>
      <div>Total Violations: ${status.totalViolations}</div>
    `;

    indicator.onclick = () => this.showCopyrightStatusModal(status);
    document.body.appendChild(indicator);
  },

  // Show copyright status modal
  showCopyrightStatusModal: function (status) {
    const existingModal = document.getElementById('copyright-status-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'copyright-status-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #1a1a2e;
      color: white;
      padding: 24px;
      border-radius: 12px;
      max-width: 400px;
      width: 90%;
    `;

    const statusColor = status.isCopyrightFree ? '#6bcf7f' : '#ff6b6b';
    const statusIcon = status.isCopyrightFree ? '✅' : '⚠️';
    const statusText = status.isCopyrightFree ? 'Copyright-Free' : 'Copyright Violations';

    content.innerHTML = `
      <h2 style="margin: 0 0 16px 0; color: ${statusColor};">${statusIcon} Copyright Status</h2>
      <div style="margin-bottom: 16px; padding: 16px; background: ${status.isCopyrightFree ? 'rgba(107,207,127,0.1)' : 'rgba(255,107,107,0.1)'}; border-radius: 8px; border-left: 4px solid ${statusColor};">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">${statusText}</div>
        <div style="font-size: 14px;">${status.isCopyrightFree ? 'Your account is in good standing. All content is copyright-free.' : 'You have active copyright violations that need attention.'}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <div><strong>Total Violations:</strong> ${status.totalViolations}</div>
        <div><strong>Active Violations:</strong> ${status.activeViolations}</div>
        ${status.lastViolationDate ? `<div><strong>Last Violation:</strong> ${new Date(status.lastViolationDate).toLocaleString()}</div>` : ''}
      </div>
      <button id="close-status-modal" style="width: 100%; padding: 12px; background: #4a9eff; border: none; color: white; border-radius: 8px; cursor: pointer;">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('close-status-modal').onclick = () => modal.remove();
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  },

  // Initialize copyright enforcement system
  initialize: async function () {
    try {
      // Get current user ID
      const userId = (typeof CU !== 'undefined' && CU && CU.id) ||
        (typeof D !== 'undefined' && D && D.cur) ||
        localStorage.getItem('mxt_session');

      if (!userId) {
        console.log('[Copyright] No user logged in, skipping initialization');
        return;
      }

      console.log('[Copyright] Initializing for user:', userId);

      // Get copyright status
      const status = await this.getStatus(userId);
      this.showStatusIndicator(status);

      // Get user reputation
      const reputation = await this.getUserReputation(userId);
      this.showReputationBadge(reputation);

      // Get user warnings
      const warnings = await this.getUserWarnings(userId);
      if (warnings.length > 0) {
        this.showWarningsModal(warnings);
      }

      // Get notifications
      const notifications = await this.getNotifications(userId);
      const unreadNotifications = notifications.filter(n => !n.is_read);

      // Show unread notifications
      if (unreadNotifications.length > 0) {
        unreadNotifications.forEach(notification => {
          this.showNotificationBanner(notification);
        });
      }

      // Listen for socket copyright events
      if (typeof io !== 'undefined') {
        const socket = io();

        socket.on('copyright:violation', (data) => {
          console.log('[Copyright] Received violation notification:', data);
          this.showNotificationBanner({
            id: data.reportId,
            notification_type: 'warning',
            message: data.message,
            content_type: data.contentType,
            content_id: data.contentId,
            deletion_deadline: data.deletionDeadline
          });
        });

        socket.on('copyright:warning', (data) => {
          console.log('[Copyright] Received warning notification:', data);
          this.showWarningsModal([data]);
        });

        socket.on('copyright:reputation', (data) => {
          console.log('[Copyright] Received reputation update:', data);
          this.showReputationBadge(data);
        });
      }

      console.log('[Copyright] Initialization complete with advanced features');
    } catch (error) {
      console.error('[Copyright] Initialization error:', error);
    }
  },

  // Report content for copyright violation (helper function)
  reportContent: function (contentType, contentId, additionalInfo = {}) {
    const userId = (typeof CU !== 'undefined' && CU && CU.id) ||
      (typeof D !== 'undefined' && D && D.cur) ||
      localStorage.getItem('mxt_session');

    if (!userId) {
      alert('Please log in to report copyright violations');
      return;
    }

    const reportData = {
      userId: additionalInfo.targetUserId || contentId, // Target user who posted the content
      reportedBy: userId,
      contentType: contentType,
      contentId: contentId,
      contentUrl: additionalInfo.contentUrl || '',
      originalSource: additionalInfo.originalSource || '',
      reportReason: additionalInfo.reason || 'Copyright violation detected',
      severity: additionalInfo.severity || 'medium'
    };

    this.submitReport(reportData).then(result => {
      if (result.success) {
        alert('Copyright report submitted successfully. The content will be reviewed and may be deleted within 12-24 hours.');
      } else {
        alert('Failed to submit copyright report: ' + result.error);
      }
    });
  },

  // ── ADVANCED FEATURES ──────────────────────────────────────────────────────

  // AI-based Content Detection
  aiDetectContent: async function (contentId, contentType, contentData, contentUrl = '') {
    try {
      const response = await fetch('/api/copyright/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType, contentData, contentUrl })
      });
      const data = await response.json();
      return data.detection || { isFlagged: false, confidenceScore: 0 };
    } catch (error) {
      console.error('[Copyright] AI detection error:', error);
      return { isFlagged: false, confidenceScore: 0 };
    }
  },

  // Content Fingerprinting for Duplicate Detection
  generateFingerprint: async function (contentId, contentType, contentData) {
    try {
      const response = await fetch('/api/copyright/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType, contentData })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Copyright] Fingerprint error:', error);
      return { success: false, isDuplicate: false };
    }
  },

  // Add Content to Scan Queue
  queueContentScan: async function (contentId, contentType, contentUrl = '', scanType = 'all', priority = 5) {
    try {
      const response = await fetch('/api/copyright/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType, contentUrl, scanType, priority })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Copyright] Scan queue error:', error);
      return { success: false };
    }
  },

  // Get User Warnings
  getUserWarnings: async function (userId) {
    try {
      const response = await fetch(`/api/copyright/warnings/${userId}`);
      const data = await response.json();
      return data.warnings || [];
    } catch (error) {
      console.error('[Copyright] Get warnings error:', error);
      return [];
    }
  },

  // Display Warnings Modal
  showWarningsModal: function (warnings) {
    const existingModal = document.getElementById('warnings-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'warnings-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #1a1a2e;
      color: white;
      padding: 24px;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    let warningsHTML = warnings.length > 0 ?
      warnings.map(w => `
        <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,107,107,0.1); border-radius: 8px; border-left: 4px solid #ff6b6b;">
          <div style="font-weight: bold; margin-bottom: 4px;">⚠️ Warning Level ${w.warning_level}</div>
          <div style="font-size: 14px; margin-bottom: 4px;">${w.warning_message}</div>
          <div style="font-size: 12px; color: #888;">Expires: ${new Date(w.expires_at).toLocaleString()}</div>
        </div>
      `).join('') :
      '<div style="text-align: center; padding: 20px; color: #6bcf7f;">✅ No active warnings</div>';

    content.innerHTML = `
      <h2 style="margin: 0 0 16px 0; color: #ff6b6b;">⚠️ Account Warnings</h2>
      <div style="margin-bottom: 16px;">${warningsHTML}</div>
      <button id="close-warnings-modal" style="width: 100%; padding: 12px; background: #4a9eff; border: none; color: white; border-radius: 8px; cursor: pointer;">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('close-warnings-modal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  },

  // Get User Reputation
  getUserReputation: async function (userId) {
    try {
      const response = await fetch(`/api/copyright/reputation/${userId}`);
      const data = await response.json();
      return data.reputation || { reputationScore: 100, trustLevel: 'trusted' };
    } catch (error) {
      console.error('[Copyright] Get reputation error:', error);
      return { reputationScore: 100, trustLevel: 'trusted' };
    }
  },

  // Display Reputation Badge
  showReputationBadge: function (reputation) {
    const existingBadge = document.getElementById('reputation-badge');
    if (existingBadge) existingBadge.remove();

    const badge = document.createElement('div');
    badge.id = 'reputation-badge';

    const colors = {
      trusted: '#6bcf7f',
      warning: '#ffd93d',
      suspicious: '#ff6b6b',
      blocked: '#ff4444'
    };

    const icons = {
      trusted: '✅',
      warning: '⚠️',
      suspicious: '🔶',
      blocked: '🚫'
    };

    badge.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: ${colors[reputation.trustLevel] || colors.trusted};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      font-size: 12px;
    `;

    badge.innerHTML = `
      <div style="font-weight: bold;">${icons[reputation.trustLevel] || icons.trusted} ${reputation.trustLevel.toUpperCase()}</div>
      <div>Reputation: ${reputation.reputationScore}/100</div>
      <div>Accuracy: ${reputation.reportAccuracyRate || 100}%</div>
    `;

    badge.onclick = () => this.showReputationModal(reputation);
    document.body.appendChild(badge);
  },

  // Display Reputation Modal
  showReputationModal: function (reputation) {
    const existingModal = document.getElementById('reputation-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'reputation-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #1a1a2e;
      color: white;
      padding: 24px;
      border-radius: 12px;
      max-width: 400px;
      width: 90%;
    `;

    const scoreColor = reputation.reputationScore >= 80 ? '#6bcf7f' :
      reputation.reputationScore >= 50 ? '#ffd93d' :
        reputation.reputationScore >= 20 ? '#ff6b6b' : '#ff4444';

    content.innerHTML = `
      <h2 style="margin: 0 0 16px 0; color: ${scoreColor};">📊 Your Reputation</h2>
      <div style="margin-bottom: 16px; padding: 16px; background: rgba(${reputation.reputationScore >= 50 ? '107,207,127' : '255,107,107'},0.1); border-radius: 8px; border-left: 4px solid ${scoreColor};">
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">${reputation.reputationScore}/100</div>
        <div style="font-size: 14px;">Trust Level: ${reputation.trustLevel.toUpperCase()}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <div><strong>Reports Submitted:</strong> ${reputation.totalReportsSubmitted || 0}</div>
        <div><strong>Accurate Reports:</strong> ${reputation.accurateReports || 0}</div>
        <div><strong>False Reports:</strong> ${reputation.falseReports || 0}</div>
        <div><strong>Accuracy Rate:</strong> ${reputation.reportAccuracyRate || 100}%</div>
        <div><strong>Total Violations:</strong> ${reputation.totalViolations || 0}</div>
        <div><strong>Clean Days:</strong> ${reputation.consecutiveCleanDays || 0}</div>
      </div>
      <button id="close-reputation-modal" style="width: 100%; padding: 12px; background: #4a9eff; border: none; color: white; border-radius: 8px; cursor: pointer;">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('close-reputation-modal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  },

  // Submit Appeal
  submitAppeal: async function (reportId, appealReason, evidenceUrls = []) {
    try {
      const userId = (typeof CU !== 'undefined' && CU && CU.id) ||
        (typeof D !== 'undefined' && D && D.cur) ||
        localStorage.getItem('mxt_session');

      if (!userId) {
        alert('Please log in to submit an appeal');
        return { success: false };
      }

      const response = await fetch('/api/copyright/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, userId, appealReason, evidenceUrls })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Copyright] Appeal error:', error);
      return { success: false };
    }
  },

  // Show Appeal Modal
  showAppealModal: function (reportId) {
    const existingModal = document.getElementById('appeal-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'appeal-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #1a1a2e;
      color: white;
      padding: 24px;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
    `;

    content.innerHTML = `
      <h2 style="margin: 0 0 16px 0; color: #4a9eff;">📝 Submit Appeal</h2>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px;">Appeal Reason:</label>
        <textarea id="appeal-reason" style="width: 100%; padding: 12px; background: #2a2a4a; border: 1px solid #444; color: white; border-radius: 8px; min-height: 100px;" placeholder="Explain why this content should not be considered a copyright violation..."></textarea>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px;">Evidence URLs (optional, one per line):</label>
        <textarea id="evidence-urls" style="width: 100%; padding: 12px; background: #2a2a4a; border: 1px solid #444; color: white; border-radius: 8px; min-height: 60px;" placeholder="https://example.com/evidence1"></textarea>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="cancel-appeal" style="flex: 1; padding: 12px; background: #ff6b6b; border: none; color: white; border-radius: 8px; cursor: pointer;">Cancel</button>
        <button id="submit-appeal" style="flex: 1; padding: 12px; background: #6bcf7f; border: none; color: white; border-radius: 8px; cursor: pointer;">Submit Appeal</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('cancel-appeal').onclick = () => modal.remove();
    document.getElementById('submit-appeal').onclick = async () => {
      const reason = document.getElementById('appeal-reason').value;
      const urlsText = document.getElementById('evidence-urls').value;
      const evidenceUrls = urlsText.split('\n').filter(url => url.trim());

      if (!reason.trim()) {
        alert('Please provide an appeal reason');
        return;
      }

      const result = await this.submitAppeal(reportId, reason, evidenceUrls);
      if (result.success) {
        alert('Appeal submitted successfully. You will be notified of the decision.');
        modal.remove();
      } else {
        alert('Failed to submit appeal: ' + (result.error || 'Unknown error'));
      }
    };

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  },

  // Check if content is whitelisted
  checkWhitelist: async function (contentId) {
    try {
      const response = await fetch(`/api/copyright/whitelist/check/${contentId}`);
      const data = await response.json();
      return data.isWhitelisted || false;
    } catch (error) {
      console.error('[Copyright] Whitelist check error:', error);
      return false;
    }
  },

  // Check if source is blacklisted
  checkBlacklist: async function (sourceName) {
    try {
      const response = await fetch(`/api/copyright/blacklist/check/${sourceName}`);
      const data = await response.json();
      return data.isBlacklisted || false;
    } catch (error) {
      console.error('[Copyright] Blacklist check error:', error);
      return false;
    }
  },

  // Comprehensive content check before upload
  comprehensiveContentCheck: async function (contentId, contentType, contentData, contentUrl = '', sourceName = '') {
    const results = {
      aiDetection: null,
      fingerprint: null,
      whitelist: false,
      blacklist: false,
      overallSafe: true,
      warnings: []
    };

    // AI Detection
    const aiResult = await this.aiDetectContent(contentId, contentType, contentData, contentUrl);
    results.aiDetection = aiResult;
    if (aiResult.isFlagged && aiResult.confidenceScore > 70) {
      results.overallSafe = false;
      results.warnings.push(`AI detected potential copyright issue (${aiResult.confidenceScore}% confidence)`);
    }

    // Fingerprinting
    const fingerprintResult = await this.generateFingerprint(contentId, contentType, contentData);
    results.fingerprint = fingerprintResult;
    if (fingerprintResult.isDuplicate) {
      results.overallSafe = false;
      results.warnings.push('Content matches blacklisted fingerprint');
    }

    // Whitelist check
    const isWhitelisted = await this.checkWhitelist(contentId);
    results.whitelist = isWhitelisted;
    if (isWhitelisted) {
      results.overallSafe = true;
      results.warnings = []; // Clear warnings if whitelisted
    }

    // Blacklist check
    if (sourceName) {
      const isBlacklisted = await this.checkBlacklist(sourceName);
      results.blacklist = isBlacklisted;
      if (isBlacklisted) {
        results.overallSafe = false;
        results.warnings.push('Source is blacklisted');
      }
    }

    return results;
  },

  // Show content check results
  showContentCheckResults: function (results) {
    const existingModal = document.getElementById('content-check-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'content-check-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #1a1a2e;
      color: white;
      padding: 24px;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
    `;

    const statusColor = results.overallSafe ? '#6bcf7f' : '#ff6b6b';
    const statusIcon = results.overallSafe ? '✅' : '⚠️';
    const statusText = results.overallSafe ? 'Content Safe to Upload' : 'Content Warning Detected';

    let warningsHTML = results.warnings.length > 0 ?
      results.warnings.map(w => `<div style="margin-bottom: 8px; padding: 8px; background: rgba(255,107,107,0.1); border-radius: 4px;">⚠️ ${w}</div>`).join('') :
      '<div style="color: #6bcf7f;">No warnings detected</div>';

    content.innerHTML = `
      <h2 style="margin: 0 0 16px 0; color: ${statusColor};">${statusIcon} Content Check Results</h2>
      <div style="margin-bottom: 16px; padding: 16px; background: ${results.overallSafe ? 'rgba(107,207,127,0.1)' : 'rgba(255,107,107,0.1)'}; border-radius: 8px; border-left: 4px solid ${statusColor};">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">${statusText}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <strong>Warnings:</strong>
        <div style="margin-top: 8px;">${warningsHTML}</div>
      </div>
      <div style="margin-bottom: 16px; font-size: 12px; color: #888;">
        <div>AI Detection: ${results.aiDetection ? (results.aiDetection.isFlagged ? 'Flagged' : 'Clear') : 'Not checked'}</div>
        <div>Fingerprint: ${results.fingerprint ? (results.fingerprint.isDuplicate ? 'Duplicate' : 'Unique') : 'Not checked'}</div>
        <div>Whitelisted: ${results.whitelist ? 'Yes' : 'No'}</div>
        <div>Blacklisted Source: ${results.blacklist ? 'Yes' : 'No'}</div>
      </div>
      <button id="close-check-modal" style="width: 100%; padding: 12px; background: #4a9eff; border: none; color: white; border-radius: 8px; cursor: pointer;">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('close-check-modal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    MonetixraCopyright.initialize();
  });
} else {
  MonetixraCopyright.initialize();
}

// Make available globally
window.MonetixraCopyright = MonetixraCopyright;

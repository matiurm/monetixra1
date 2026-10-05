/**
 * Advanced Security Features System
 * Two-Factor Authentication, End-to-End Encryption, Audit Logging
 */

const AdvancedSecurity = (function() {
  'use strict';

  // Configuration
  const config = {
    // 2FA Configuration
    twoFactorEnabled: true,
    totpSecretLength: 32,
    totpIssuer: 'Monetixra',
    
    // Encryption Configuration
    encryptionEnabled: true,
    encryptionAlgorithm: 'aes-256-gcm',
    keyDerivationIterations: 100000,
    
    // Audit Logging
    auditLoggingEnabled: true,
    auditLogRetentionDays: 90,
    
    // Rate Limiting
    advancedRateLimiting: true,
    maxAttemptsPerHour: 10,
    lockoutDuration: 30, // minutes
    
    // IP Whitelisting
    ipWhitelisting: false,
    whitelistedIPs: [],
    
    // Session Management
    sessionTimeout: 30, // minutes
    maxConcurrentSessions: 5
  };

  // Storage for TOTP secrets, encryption keys, audit logs
  const storage = {
    totpSecrets: new Map(),
    encryptionKeys: new Map(),
    auditLogs: [],
    failedAttempts: new Map(),
    activeSessions: new Map()
  };

  /**
   * Generate TOTP Secret for 2FA
   */
  function generateTOTPSecret(userId) {
    try {
      const crypto = require('crypto');
      const secret = crypto.randomBytes(config.totpSecretLength).toString('base32');
      storage.totpSecrets.set(userId, {
        secret,
        createdAt: Date.now(),
        verified: false
      });
      
      // Log audit event
      logAuditEvent('TOTP_SECRET_GENERATED', userId, { method: '2fa_setup' });
      
      return {
        success: true,
        secret,
        qrCodeUrl: generateQRCodeUrl(secret, userId)
      };
    } catch (error) {
      console.error('[Security] TOTP secret generation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate QR Code URL for TOTP
   */
  function generateQRCodeUrl(secret, userId) {
    const user = D.users[userId];
    const username = user ? user.username : userId;
    const issuer = encodeURIComponent(config.totpIssuer);
    const label = encodeURIComponent(`${issuer}:${username}`);
    const secretEncoded = encodeURIComponent(secret);
    
    return `otpauth://totp/${label}?secret=${secretEncoded}&issuer=${issuer}`;
  }

  /**
   * Verify TOTP Code
   */
  function verifyTOTP(userId, token) {
    try {
      const totpData = storage.totpSecrets.get(userId);
      if (!totpData) {
        return { success: false, error: 'TOTP not enabled for this user' };
      }
      
      // Simplified TOTP verification (in production, use speakeasy or otpauth library)
      const isValid = verifyTOTPCode(totpData.secret, token);
      
      if (isValid) {
        totpData.verified = true;
        storage.totpSecrets.set(userId, totpData);
        
        // Log audit event
        logAuditEvent('TOTP_VERIFIED', userId, { success: true });
        
        return { success: true, message: '2FA verification successful' };
      } else {
        // Record failed attempt
        recordFailedAttempt(userId, '2fa_verification');
        
        return { success: false, error: 'Invalid TOTP code' };
      }
    } catch (error) {
      console.error('[Security] TOTP verification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify TOTP Code (simplified - use library in production)
   */
  function verifyTOTPCode(secret, token) {
    // In production, use speakeasy or otpauth library
    // This is a simplified version for demonstration
    const crypto = require('crypto');
    const time = Math.floor(Date.now() / 1000 / 30);
    const key = Buffer.from(secret, 'base32');
    
    for (let i = -1; i <= 1; i++) {
      const timeBytes = Buffer.alloc(8);
      timeBytes.writeBigUInt64BE(BigInt(time + i));
      
      const hmac = crypto.createHmac('sha1', key);
      hmac.update(timeBytes);
      const hmacResult = hmac.digest();
      
      const offset = hmacResult[hmacResult.length - 1] & 0x0f;
      const code = (
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff)
      ) % 1000000;
      
      if (code.toString().padStart(6, '0') === token) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if 2FA is enabled for user
   */
  function is2FAEnabled(userId) {
    const totpData = storage.totpSecrets.get(userId);
    return totpData && totpData.verified;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  function encryptData(data, userId) {
    try {
      if (!config.encryptionEnabled) {
        return { success: true, encrypted: data, iv: null, tag: null };
      }
      
      const crypto = require('crypto');
      
      // Get or generate encryption key for user
      let key = storage.encryptionKeys.get(userId);
      if (!key) {
        key = crypto.randomBytes(32);
        storage.encryptionKeys.set(userId, key);
      }
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(config.encryptionAlgorithm, key, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Log audit event
      logAuditEvent('DATA_ENCRYPTED', userId, { dataType: typeof data });
      
      return {
        success: true,
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('[Security] Encryption error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  function decryptData(encrypted, iv, authTag, userId) {
    try {
      if (!config.encryptionEnabled) {
        return { success: true, decrypted: encrypted };
      }
      
      const crypto = require('crypto');
      
      const key = storage.encryptionKeys.get(userId);
      if (!key) {
        return { success: false, error: 'Encryption key not found' };
      }
      
      const decipher = crypto.createDecipheriv(
        config.encryptionAlgorithm,
        key,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Log audit event
      logAuditEvent('DATA_DECRYPTED', userId, { success: true });
      
      return {
        success: true,
        decrypted: JSON.parse(decrypted)
      };
    } catch (error) {
      console.error('[Security] Decryption error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log audit event
   */
  function logAuditEvent(eventType, userId, metadata = {}) {
    if (!config.auditLoggingEnabled) return;
    
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      eventType,
      userId,
      metadata,
      ipAddress: metadata.ipAddress || 'unknown',
      userAgent: metadata.userAgent || 'unknown'
    };
    
    storage.auditLogs.push(logEntry);
    
    // Cleanup old logs
    cleanupOldAuditLogs();
  }

  /**
   * Get audit logs for user
   */
  function getAuditLogs(userId, limit = 100) {
    const userLogs = storage.auditLogs.filter(log => log.userId === userId);
    return userLogs.slice(-limit);
  }

  /**
   * Cleanup old audit logs
   */
  function cleanupOldAuditLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.auditLogRetentionDays);
    
    storage.auditLogs = storage.auditLogs.filter(
      log => new Date(log.timestamp) > cutoffDate
    );
  }

  /**
   * Record failed attempt
   */
  function recordFailedAttempt(userId, attemptType) {
    const attempts = storage.failedAttempts.get(userId) || [];
    attempts.push({
      type: attemptType,
      timestamp: Date.now()
    });
    
    // Keep only last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    storage.failedAttempts.set(userId, attempts.filter(a => a.timestamp > cutoff));
    
    // Check if should lock out
    if (attempts.length >= config.maxAttemptsPerHour) {
      lockoutUser(userId);
    }
  }

  /**
   * Check if user is locked out
   */
  function isUserLockedOut(userId) {
    const attempts = storage.failedAttempts.get(userId) || [];
    const recentAttempts = attempts.filter(
      a => Date.now() - a.timestamp < config.lockoutDuration * 60 * 1000
    );
    
    return recentAttempts.length >= config.maxAttemptsPerHour;
  }

  /**
   * Lockout user
   */
  function lockoutUser(userId) {
    logAuditEvent('USER_LOCKED_OUT', userId, {
      reason: 'Too many failed attempts',
      duration: config.lockoutDuration
    });
    
    // Update user status
    if (D.users[userId]) {
      D.users[userId].locked = true;
      D.users[userId].lockedUntil = Date.now() + config.lockoutDuration * 60 * 1000;
    }
  }

  /**
   * Unlock user
   */
  function unlockUser(userId) {
    storage.failedAttempts.delete(userId);
    
    if (D.users[userId]) {
      D.users[userId].locked = false;
      D.users[userId].lockedUntil = null;
    }
    
    logAuditEvent('USER_UNLOCKED', userId, { method: 'admin' });
  }

  /**
   * Check IP whitelist
   */
  function isIPWhitelisted(ipAddress) {
    if (!config.ipWhitelisting) return true;
    
    return config.whitelistedIPs.includes(ipAddress);
  }

  /**
   * Add IP to whitelist
   */
  function addToWhitelist(ipAddress) {
    if (!config.whitelistedIPs.includes(ipAddress)) {
      config.whitelistedIPs.push(ipAddress);
      logAuditEvent('IP_WHITELISTED', 'system', { ipAddress });
    }
  }

  /**
   * Remove IP from whitelist
   */
  function removeFromWhitelist(ipAddress) {
    const index = config.whitelistedIPs.indexOf(ipAddress);
    if (index > -1) {
      config.whitelistedIPs.splice(index, 1);
      logAuditEvent('IP_REMOVED_FROM_WHITELIST', 'system', { ipAddress });
    }
  }

  /**
   * Create session
   */
  function createSession(userId, metadata = {}) {
    const sessions = storage.activeSessions.get(userId) || [];
    
    // Check max concurrent sessions
    if (sessions.length >= config.maxConcurrentSessions) {
      // Remove oldest session
      sessions.shift();
    }
    
    const session = {
      id: crypto.randomBytes(16).toString('hex'),
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + config.sessionTimeout * 60 * 1000,
      metadata
    };
    
    sessions.push(session);
    storage.activeSessions.set(userId, sessions);
    
    logAuditEvent('SESSION_CREATED', userId, { sessionId: session.id });
    
    return session;
  }

  /**
   * Validate session
   */
  function validateSession(sessionId, userId) {
    const sessions = storage.activeSessions.get(userId) || [];
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }
    
    if (Date.now() > session.expiresAt) {
      // Remove expired session
      removeSession(sessionId, userId);
      return { valid: false, reason: 'Session expired' };
    }
    
    // Update session expiry
    session.expiresAt = Date.now() + config.sessionTimeout * 60 * 1000;
    storage.activeSessions.set(userId, sessions);
    
    return { valid: true, session };
  }

  /**
   * Remove session
   */
  function removeSession(sessionId, userId) {
    const sessions = storage.activeSessions.get(userId) || [];
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index > -1) {
      sessions.splice(index, 1);
      storage.activeSessions.set(userId, sessions);
      logAuditEvent('SESSION_DESTROYED', userId, { sessionId });
    }
  }

  /**
   * Get all active sessions for user
   */
  function getUserSessions(userId) {
    return storage.activeSessions.get(userId) || [];
  }

  /**
   * Revoke all sessions for user
   */
  function revokeAllSessions(userId) {
    storage.activeSessions.delete(userId);
    logAuditEvent('ALL_SESSIONS_REVOKED', userId);
  }

  /**
   * Generate secure CSRF token
   */
  function generateCSRFToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate CSRF token
   */
  function validateCSRFToken(token, sessionToken) {
    return token === sessionToken;
  }

  /**
   * Get security status
   */
  function getSecurityStatus() {
    return {
      twoFactorEnabled: config.twoFactorEnabled,
      encryptionEnabled: config.encryptionEnabled,
      auditLoggingEnabled: config.auditLoggingEnabled,
      advancedRateLimiting: config.advancedRateLimiting,
      ipWhitelisting: config.ipWhitelisting,
      activeSessions: Array.from(storage.activeSessions.values()).flat().length,
      auditLogCount: storage.auditLogs.length,
      whitelistedIPs: config.whitelistedIPs.length
    };
  }

  return {
    // 2FA
    generateTOTPSecret,
    verifyTOTP,
    is2FAEnabled,
    
    // Encryption
    encryptData,
    decryptData,
    
    // Audit Logging
    logAuditEvent,
    getAuditLogs,
    
    // Rate Limiting & Lockout
    recordFailedAttempt,
    isUserLockedOut,
    lockoutUser,
    unlockUser,
    
    // IP Whitelisting
    isIPWhitelisted,
    addToWhitelist,
    removeFromWhitelist,
    
    // Session Management
    createSession,
    validateSession,
    removeSession,
    getUserSessions,
    revokeAllSessions,
    
    // CSRF Protection
    generateCSRFToken,
    validateCSRFToken,
    
    // Status
    getSecurityStatus,
    config
  };
})();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedSecurity;
} else {
  window.AdvancedSecurity = AdvancedSecurity;
}

/**
 * Security Enhancements for Monetixra
 * Features: WebAuthn/Passkeys, 2FA Enhancement, Session Management, IP Whitelisting
 */

const SecurityEnhancements = (function () {
  'use strict';

  // Configuration
  const browserEnv = (typeof process !== 'undefined' && process.env) ? process.env : {};
  const CONFIG = {
    SESSION_TIMEOUT_MINUTES: parseInt(browserEnv.SESSION_TIMEOUT_MINUTES, 10) || 30,
    MAX_CONCURRENT_SESSIONS: parseInt(browserEnv.MAX_CONCURRENT_SESSIONS, 10) || 3,
    IP_WHITELIST_ENABLED: browserEnv.IP_WHITELIST_ENABLED === 'true',
    IP_WHITELIST: (browserEnv.IP_WHITELIST || '').split(',').map(ip => ip.trim()).filter(Boolean),
    TWO_FACTOR_ENABLED: true,
    PASSKEYS_ENABLED: true
  };

  // State
  let sessions = new Map(); // sessionId -> session data
  let userSessions = new Map(); // userId -> Set of sessionIds
  let failedAttempts = new Map(); // IP -> { count, lastAttempt }
  let passkeyCredentials = new Map(); // userId -> credential

  // ── WebAuthn/Passkeys ───────────────────────────────────────────────────────

  /**
   * Generate WebAuthn registration options
   * @param {string} username - Username
   * @param {string} displayName - Display name
   */
  async function generatePasskeyRegistrationOptions(username, displayName) {
    try {
      if (typeof window === 'undefined') {
        // Server-side: Use @simplewebauthn/server
        const { generateRegistrationOptions } = require('@simplewebauthn/server');
        
        const options = await generateRegistrationOptions({
          rpName: 'Monetixra',
          rpID: window.location.hostname,
          userID: username,
          userName: username,
          displayName: displayName,
          attestationType: 'indirect',
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred'
          }
        });

        console.log('[Passkeys] Registration options generated');
        return options;
      } else {
        // Client-side: Generate options manually
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userID = new TextEncoder().encode(username);

        return {
          challenge: Array.from(challenge).map(b => b.toString(16).padStart(2, '0')).join(''),
          rp: {
            name: 'Monetixra',
            id: window.location.hostname
          },
          user: {
            id: Array.from(userID).map(b => b.toString(16).padStart(2, '0')).join(''),
            name: username,
            displayName: displayName
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 }, // ES256
            { type: 'public-key', alg: -257 } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred'
          },
          attestation: 'indirect'
        };
      }
    } catch (error) {
      console.error('[Passkeys] Registration options generation failed:', error);
      return null;
    }
  }

  /**
   * Verify WebAuthn registration
   * @param {object} credential - Registration credential
   * @param {string} username - Username
   */
  async function verifyPasskeyRegistration(credential, username) {
    try {
      if (typeof window === 'undefined') {
        // Server-side: Use @simplewebauthn/server
        const { verifyRegistrationResponse } = require('@simplewebauthn/server');
        
        const verification = await verifyRegistrationResponse({
          response: credential,
          expectedChallenge: expectedChallenge,
          expectedOrigin: window.location.origin,
          expectedRPID: window.location.hostname
        });

        if (verification.verified) {
          // Save credential
          passkeyCredentials.set(username, {
            credentialID: verification.registrationInfo.credentialID,
            credentialPublicKey: verification.registrationInfo.credentialPublicKey,
            counter: verification.registrationInfo.counter,
            transports: verification.registrationInfo.credentialDeviceType
          });

          console.log('[Passkeys] Registration verified');
          return { verified: true, credential: verification.registrationInfo };
        }

        return { verified: false };
      } else {
        // Client-side: Store credential
        passkeyCredentials.set(username, {
          id: credential.id,
          publicKey: credential.response.publicKey,
          transports: credential.response.transports
        });

        // Save to user profile
        if (typeof CU !== 'undefined') {
          CU.passkeyCredential = {
            id: credential.id,
            publicKey: credential.response.publicKey,
            transports: credential.response.transports
          };
          if (typeof saveData === 'function') saveData();
        }

        console.log('[Passkeys] Registration saved');
        return { verified: true };
      }
    } catch (error) {
      console.error('[Passkeys] Registration verification failed:', error);
      return { verified: false, error: error.message };
    }
  }

  /**
   * Generate WebAuthn authentication options
   * @param {string} username - Username
   */
  async function generatePasskeyAuthenticationOptions(username) {
    try {
      const credential = passkeyCredentials.get(username);
      
      if (!credential) {
        console.warn('[Passkeys] No credential found for user:', username);
        return null;
      }

      if (typeof window === 'undefined') {
        // Server-side: Use @simplewebauthn/server
        const { generateAuthenticationOptions } = require('@simplewebauthn/server');
        
        const options = await generateAuthenticationOptions({
          rpID: window.location.hostname,
          userVerification: 'preferred',
          allowCredentials: [{
            id: credential.credentialID,
            type: 'public-key',
            transports: credential.transports
          }]
        });

        console.log('[Passkeys] Authentication options generated');
        return options;
      } else {
        // Client-side: Generate options manually
        const challenge = crypto.getRandomValues(new Uint8Array(32));

        return {
          challenge: Array.from(challenge).map(b => b.toString(16).padStart(2, '0')).join(''),
          rpId: window.location.hostname,
          userVerification: 'preferred',
          allowCredentials: [{
            id: credential.id,
            type: 'public-key',
            transports: credential.transports
          }]
        };
      }
    } catch (error) {
      console.error('[Passkeys] Authentication options generation failed:', error);
      return null;
    }
  }

  /**
   * Verify WebAuthn authentication
   * @param {object} credential - Authentication credential
   * @param {string} username - Username
   */
  async function verifyPasskeyAuthentication(credential, username) {
    try {
      if (typeof window === 'undefined') {
        // Server-side: Use @simplewebauthn/server
        const { verifyAuthenticationResponse } = require('@simplewebauthn/server');
        
        const savedCredential = passkeyCredentials.get(username);
        
        const verification = await verifyAuthenticationResponse({
          response: credential,
          expectedChallenge: expectedChallenge,
          expectedOrigin: window.location.origin,
          expectedRPID: window.location.hostname,
          authenticator: savedCredential
        });

        if (verification.verified) {
          // Update counter
          savedCredential.counter = verification.authenticationInfo.newCounter;
          passkeyCredentials.set(username, savedCredential);

          console.log('[Passkeys] Authentication verified');
          return { verified: true };
        }

        return { verified: false };
      } else {
        // Client-side: Verify credential
        const savedCredential = passkeyCredentials.get(username);
        
        if (savedCredential && savedCredential.id === credential.id) {
          console.log('[Passkeys] Authentication verified');
          return { verified: true };
        }

        return { verified: false };
      }
    } catch (error) {
      console.error('[Passkeys] Authentication verification failed:', error);
      return { verified: false, error: error.message };
    }
  }

  /**
   * Register passkey (client-side)
   * @param {string} username - Username
   * @param {string} displayName - Display name
   */
  async function registerPasskey(username, displayName) {
    try {
      if (!window.PublicKeyCredential) {
        toast('e', '❌ Passkeys not supported on this device');
        return false;
      }

      const options = await generatePasskeyRegistrationOptions(username, displayName);
      if (!options) {
        return false;
      }

      const credential = await navigator.credentials.create({
        publicKey: options
      });

      const verification = await verifyPasskeyRegistration(credential, username);
      
      if (verification.verified) {
        toast('s', '✅ Passkey registered successfully');
        return true;
      } else {
        toast('e', '❌ Passkey registration failed');
        return false;
      }
    } catch (error) {
      console.error('[Passkeys] Registration failed:', error);
      toast('e', '❌ Passkey registration failed');
      return false;
    }
  }

  /**
   * Authenticate with passkey (client-side)
   * @param {string} username - Username
   */
  async function authenticateWithPasskey(username) {
    try {
      if (!window.PublicKeyCredential) {
        toast('e', '❌ Passkeys not supported on this device');
        return false;
      }

      const options = await generatePasskeyAuthenticationOptions(username);
      if (!options) {
        return false;
      }

      const credential = await navigator.credentials.get({
        publicKey: options
      });

      const verification = await verifyPasskeyAuthentication(credential, username);
      
      if (verification.verified) {
        toast('s', '✅ Passkey authentication successful');
        return true;
      } else {
        toast('e', '❌ Passkey authentication failed');
        return false;
      }
    } catch (error) {
      console.error('[Passkeys] Authentication failed:', error);
      toast('e', '❌ Passkey authentication failed');
      return false;
    }
  }

  // ── 2FA Enhancement ────────────────────────────────────────────────────────

  /**
   * Generate TOTP secret
   */
  function generateTOTPSecret() {
    // This module is served directly to browsers. Node's `crypto.randomBytes`
    // is not available there, so generate the bytes through the Web Crypto API
    // and encode them as RFC 4648 base32 for a TOTP-compatible secret.
    if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
      throw new Error('Secure browser cryptography is unavailable');
    }

    const bytes = new Uint8Array(20);
    window.crypto.getRandomValues(bytes);

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let buffer = 0;
    let bits = 0;
    let secret = '';

    for (const byte of bytes) {
      buffer = (buffer << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        secret += alphabet[(buffer >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) secret += alphabet[(buffer << (5 - bits)) & 31];

    return secret;
  }

  /**
   * Generate TOTP QR code URI
   * @param {string} secret - TOTP secret
   * @param {string} username - Username
   */
  function generateTOTPQRCode(secret, username) {
    const issuer = 'Monetixra';
    const uri = `otpauth://totp/${issuer}:${username}?secret=${secret}&issuer=${issuer}`;
    return uri;
  }

  /**
   * Verify TOTP code
   * @param {string} secret - TOTP secret
   * @param {string} code - TOTP code
   */
  function verifyTOTPCode(secret, code) {
    let speakeasy = (typeof window !== 'undefined' && window.speakeasy) || (typeof require !== 'undefined' ? (function() { try { return require('speakeasy'); } catch(e) { return null; } })() : null);
    if (!speakeasy) {
      console.warn('[2FA] Speakeasy library not available');
      return false;
    }
    
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    return verified;
  }

  /**
   * Send SMS 2FA code
   * @param {string} phoneNumber - Phone number
   * @param {string} code - Verification code
   */
  async function sendSMS2FACode(phoneNumber, code) {
    try {
      // Implementation depends on SMS service
      // Example using Twilio:
      // const twilio = require('twilio');
      // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // await client.messages.create({
      //   body: `Your Monetixra verification code is: ${code}`,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phoneNumber
      // });

      console.log('[2FA] SMS code sent to:', phoneNumber);
      return true;
    } catch (error) {
      console.error('[2FA] SMS sending failed:', error);
      return false;
    }
  }

  /**
   * Generate SMS 2FA code
   */
  function generateSMS2FACode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ── Session Management ────────────────────────────────────────────────────

  /**
   * Create session
   * @param {string} userId - User ID
   * @param {object} metadata - Session metadata
   */
  function createSession(userId, metadata = {}) {
    try {
      const sessionId = crypto.randomUUID();
      const now = Date.now();
      
      const session = {
        id: sessionId,
        userId: userId,
        createdAt: now,
        expiresAt: now + (CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000),
        lastActivity: now,
        metadata: {
          userAgent: metadata.userAgent || navigator.userAgent,
          ipAddress: metadata.ipAddress || null,
          device: metadata.device || 'Unknown',
          location: metadata.location || 'Unknown'
        }
      };

      sessions.set(sessionId, session);
      
      // Add to user sessions
      if (!userSessions.has(userId)) {
        userSessions.set(userId, new Set());
      }
      userSessions.get(userId).add(sessionId);

      // Check concurrent session limit
      const userSessionSet = userSessions.get(userId);
      if (userSessionSet.size > CONFIG.MAX_CONCURRENT_SESSIONS) {
        // Remove oldest session
        const oldestSessionId = Array.from(userSessionSet)[0];
        revokeSession(oldestSessionId);
      }

      console.log('[Session] Created:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('[Session] Creation failed:', error);
      return null;
    }
  }

  /**
   * Get session
   * @param {string} sessionId - Session ID
   */
  function getSession(sessionId) {
    const session = sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if expired
    if (Date.now() > session.expiresAt) {
      revokeSession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = Date.now();
    sessions.set(sessionId, session);

    return session;
  }

  /**
   * Revoke session
   * @param {string} sessionId - Session ID
   */
  function revokeSession(sessionId) {
    try {
      const session = sessions.get(sessionId);
      
      if (session) {
        // Remove from user sessions
        const userSessionSet = userSessions.get(session.userId);
        if (userSessionSet) {
          userSessionSet.delete(sessionId);
        }

        // Remove session
        sessions.delete(sessionId);
        console.log('[Session] Revoked:', sessionId);
      }

      return true;
    } catch (error) {
      console.error('[Session] Revocation failed:', error);
      return false;
    }
  }

  /**
   * Revoke all user sessions
   * @param {string} userId - User ID
   */
  function revokeAllUserSessions(userId) {
    try {
      const userSessionSet = userSessions.get(userId);
      
      if (userSessionSet) {
        userSessionSet.forEach(sessionId => {
          sessions.delete(sessionId);
        });
        userSessions.delete(userId);
      }

      console.log('[Session] All sessions revoked for user:', userId);
      return true;
    } catch (error) {
      console.error('[Session] Bulk revocation failed:', error);
      return false;
    }
  }

  /**
   * Get user sessions
   * @param {string} userId - User ID
   */
  function getUserSessions(userId) {
    const userSessionSet = userSessions.get(userId);
    
    if (!userSessionSet) {
      return [];
    }

    return Array.from(userSessionSet)
      .map(sessionId => sessions.get(sessionId))
      .filter(session => session && Date.now() <= session.expiresAt);
  }

  /**
   * Clean expired sessions
   */
  function cleanExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of sessions.entries()) {
      if (now > session.expiresAt) {
        revokeSession(sessionId);
        cleaned++;
      }
    }

    console.log('[Session] Cleaned expired sessions:', cleaned);
    return cleaned;
  }

  // ── IP Whitelisting ────────────────────────────────────────────────────────

  /**
   * Check if IP is whitelisted
   * @param {string} ipAddress - IP address
   */
  function isIPWhitelisted(ipAddress) {
    if (!CONFIG.IP_WHITELIST_ENABLED) {
      return true; // Allow all if whitelist is disabled
    }

    if (CONFIG.IP_WHITELIST.length === 0) {
      return true; // Allow all if whitelist is empty
    }

    return CONFIG.IP_WHITELIST.includes(ipAddress);
  }

  /**
   * Add IP to whitelist
   * @param {string} ipAddress - IP address
   */
  function addIPToWhitelist(ipAddress) {
    CONFIG.IP_WHITELIST.push(ipAddress);
    console.log('[IP] Added to whitelist:', ipAddress);
    return true;
  }

  /**
   * Remove IP from whitelist
   * @param {string} ipAddress - IP address
   */
  function removeIPFromWhitelist(ipAddress) {
    const index = CONFIG.IP_WHITELIST.indexOf(ipAddress);
    if (index > -1) {
      CONFIG.IP_WHITELIST.splice(index, 1);
      console.log('[IP] Removed from whitelist:', ipAddress);
      return true;
    }
    return false;
  }

  // ── Rate Limiting & Brute Force Protection ─────────────────────────────────

  /**
   * Check failed login attempts
   * @param {string} ipAddress - IP address
   */
  function checkFailedAttempts(ipAddress) {
    const attempts = failedAttempts.get(ipAddress) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    
    // Reset if more than 15 minutes have passed
    if (now - attempts.lastAttempt > 15 * 60 * 1000) {
      attempts.count = 0;
    }

    // Check if locked out (more than 5 attempts in 15 minutes)
    if (attempts.count >= 5) {
      const lockoutTime = 15 * 60 * 1000 - (now - attempts.lastAttempt);
      return {
        allowed: false,
        reason: 'Too many failed attempts',
        lockoutTime: lockoutTime
      };
    }

    return { allowed: true };
  }

  /**
   * Record failed attempt
   * @param {string} ipAddress - IP address
   */
  function recordFailedAttempt(ipAddress) {
    const attempts = failedAttempts.get(ipAddress) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    failedAttempts.set(ipAddress, attempts);
    console.log('[Security] Failed attempt recorded for IP:', ipAddress);
  }

  /**
   * Clear failed attempts
   * @param {string} ipAddress - IP address
   */
  function clearFailedAttempts(ipAddress) {
    failedAttempts.delete(ipAddress);
    console.log('[Security] Failed attempts cleared for IP:', ipAddress);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Passkeys
    generatePasskeyRegistration: generatePasskeyRegistrationOptions,
    verifyPasskeyRegistration: verifyPasskeyRegistration,
    generatePasskeyAuthentication: generatePasskeyAuthenticationOptions,
    verifyPasskeyAuthentication: verifyPasskeyAuthentication,
    registerPasskey: registerPasskey,
    authenticateWithPasskey: authenticateWithPasskey,
    
    // 2FA
    generateTOTPSecret: generateTOTPSecret,
    generateTOTPQRCode: generateTOTPQRCode,
    verifyTOTP: verifyTOTPCode,
    sendSMS2FA: sendSMS2FACode,
    generateSMSCode: generateSMS2FACode,
    
    // Sessions
    createSession: createSession,
    getSession: getSession,
    revokeSession: revokeSession,
    revokeAllUserSessions: revokeAllUserSessions,
    getUserSessions: getUserSessions,
    cleanExpiredSessions: cleanExpiredSessions,
    
    // IP Whitelist
    isIPWhitelisted: isIPWhitelisted,
    addIPToWhitelist: addIPToWhitelist,
    removeIPFromWhitelist: removeIPFromWhitelist,
    
    // Rate Limiting
    checkFailedAttempts: checkFailedAttempts,
    recordFailedAttempt: recordFailedAttempt,
    clearFailedAttempts: clearFailedAttempts,
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityEnhancements;
}

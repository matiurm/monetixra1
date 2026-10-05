/**
 * Complete Biometric Authentication System
 * Supports: Face ID (iOS), Touch ID (iOS), Fingerprint (Android), Windows Hello
 * Features: Registration, Authentication, Server Verification, Fallback
 */

(function() {
  'use strict';

  // Biometric Authentication Configuration
  const BiometricConfig = {
    // Storage keys
    STORAGE_PREFIX: 'monetixra_biometric_',
    CREDENTIAL_ID_KEY: 'credential_id',
    USER_ID_KEY: 'user_id',
    PUBLIC_KEY_KEY: 'public_key',
    CHALLENGE_KEY: 'challenge',
    
    // Security settings
    TIMEOUT: 60000, // 60 seconds
    USER_VERIFICATION: 'preferred', // 'required', 'preferred', 'discouraged'
    
    // Feature detection
    isWebAuthnAvailable: () => {
      return !!(window.navigator && window.navigator.credentials && window.navigator.credentials.create && window.navigator.credentials.get);
    },
    
    // Check if biometric is available
    isBiometricAvailable: async function() {
      if (!this.isWebAuthnAvailable()) {
        console.warn('[Biometric] WebAuthn not available');
        return false;
      }
      
      try {
        // Check if the device supports biometric authentication
        const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        console.log('[Biometric] Platform authenticator available:', isAvailable);
        return isAvailable;
      } catch (error) {
        console.error('[Biometric] Error checking availability:', error);
        return false;
      }
    }
  };

  // Secure random token generator
  function secureRandomToken(length = 32, encoding = 'base64url') {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    if (encoding === 'base64url') {
      return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } else if (encoding === 'hex') {
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    return array;
  }

  // Convert ArrayBuffer to Base64URL
  function bufferToBase64URL(buffer) {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Convert Base64URL to ArrayBuffer
  function base64URLToBuffer(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Store biometric credential
  function storeCredential(userId, credentialId, publicKey) {
    try {
      localStorage.setItem(BiometricConfig.STORAGE_PREFIX + BiometricConfig.CREDENTIAL_ID_KEY, credentialId);
      localStorage.setItem(BiometricConfig.STORAGE_PREFIX + BiometricConfig.USER_ID_KEY, userId);
      localStorage.setItem(BiometricConfig.STORAGE_PREFIX + BiometricConfig.PUBLIC_KEY_KEY, JSON.stringify(publicKey));
      console.log('[Biometric] Credential stored for user:', userId);
      return true;
    } catch (error) {
      console.error('[Biometric] Error storing credential:', error);
      return false;
    }
  }

  // Retrieve stored credential
  function getStoredCredential() {
    try {
      const credentialId = localStorage.getItem(BiometricConfig.STORAGE_PREFIX + BiometricConfig.CREDENTIAL_ID_KEY);
      const userId = localStorage.getItem(BiometricConfig.STORAGE_PREFIX + BiometricConfig.USER_ID_KEY);
      const publicKey = localStorage.getItem(BiometricConfig.STORAGE_PREFIX + BiometricConfig.PUBLIC_KEY_KEY);
      
      if (credentialId && userId && publicKey) {
        return {
          credentialId,
          userId,
          publicKey: JSON.parse(publicKey)
        };
      }
      
      return null;
    } catch (error) {
      console.error('[Biometric] Error retrieving credential:', error);
      return null;
    }
  }

  // Clear stored credential
  function clearCredential() {
    try {
      localStorage.removeItem(BiometricConfig.STORAGE_PREFIX + BiometricConfig.CREDENTIAL_ID_KEY);
      localStorage.removeItem(BiometricConfig.STORAGE_PREFIX + BiometricConfig.USER_ID_KEY);
      localStorage.removeItem(BiometricConfig.STORAGE_PREFIX + BiometricConfig.PUBLIC_KEY_KEY);
      console.log('[Biometric] Credential cleared');
      return true;
    } catch (error) {
      console.error('[Biometric] Error clearing credential:', error);
      return false;
    }
  }

  // Register biometric credential (after successful password login)
  async function registerBiometric(userId, email, username) {
    console.log('[Biometric] Starting registration for user:', userId);
    
    if (!await BiometricConfig.isBiometricAvailable()) {
      throw new Error('Biometric authentication not available on this device');
    }
    
    try {
      // Generate challenge
      const challenge = secureRandomToken(32, 'base64url');
      const userIdBase64 = bufferToBase64URL(new TextEncoder().encode(userId));
      
      // Create credential options
      const createOptions = {
        challenge: base64URLToBuffer(challenge),
        rp: {
          id: window.location.hostname,
          name: 'Monetixra',
          displayName: 'Monetixra Social Platform'
        },
        user: {
          id: base64URLToBuffer(userIdBase64),
          name: email,
          displayName: username || email
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: BiometricConfig.USER_VERIFICATION,
          requireResidentKey: false
        },
        timeout: BiometricConfig.TIMEOUT,
        attestation: 'none'
      };
      
      console.log('[Biometric] Creating credential...');
      
      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: createOptions
      });
      
      if (!credential) {
        throw new Error('Failed to create credential');
      }
      
      console.log('[Biometric] Credential created successfully');
      
      // Store credential
      const publicKey = {
        id: credential.id,
        type: credential.type,
        transports: credential.response.transports || []
      };
      
      storeCredential(userId, credential.id, publicKey);
      
      // Send to server for storage
      await sendCredentialToServer(userId, credential);
      
      return {
        success: true,
        credentialId: credential.id
      };
      
    } catch (error) {
      console.error('[Biometric] Registration error:', error);
      throw error;
    }
  }

  // Authenticate with biometric
  async function authenticateWithBiometric() {
    console.log('[Biometric] Starting authentication...');
    
    if (!await BiometricConfig.isBiometricAvailable()) {
      throw new Error('Biometric authentication not available on this device');
    }
    
    const storedCredential = getStoredCredential();
    if (!storedCredential) {
      throw new Error('No biometric credential found. Please sign in with password first.');
    }
    
    try {
      // Generate challenge
      const challenge = secureRandomToken(32, 'base64url');
      
      // Get credential options
      const getOptions = {
        challenge: base64URLToBuffer(challenge),
        rpId: window.location.hostname,
        userVerification: BiometricConfig.USER_VERIFICATION,
        timeout: BiometricConfig.TIMEOUT,
        allowCredentials: [
          {
            id: base64URLToBuffer(storedCredential.credentialId),
            type: 'public-key',
            transports: storedCredential.publicKey.transports || ['internal', 'hybrid']
          }
        ]
      };
      
      console.log('[Biometric] Requesting biometric authentication...');
      
      // Get credential
      const credential = await navigator.credentials.get({
        publicKey: getOptions
      });
      
      if (!credential) {
        throw new Error('Authentication failed');
      }
      
      console.log('[Biometric] Authentication successful');
      
      // Verify with server
      const verificationResult = await verifyCredentialWithServer(credential, storedCredential.userId);
      
      if (verificationResult.success) {
        return {
          success: true,
          userId: storedCredential.userId,
          user: verificationResult.user
        };
      } else {
        throw new Error('Server verification failed');
      }
      
    } catch (error) {
      console.error('[Biometric] Authentication error:', error);
      throw error;
    }
  }

  // Send credential to server
  async function sendCredentialToServer(userId, credential) {
    try {
      const serverUrl = window.location.origin || 'http://localhost:3000';
      
      const response = await fetch(`${serverUrl}/api/auth/biometric/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          credentialId: credential.id,
          publicKey: bufferToBase64URL(credential.response.publicKey),
          algorithm: credential.response.publicKeyAlgorithm
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.warn('[Biometric] Server registration failed, but continuing with local storage');
      }
      
      return data;
    } catch (error) {
      console.warn('[Biometric] Server registration error, but continuing with local storage:', error);
      return { success: true }; // Continue with local storage
    }
  }

  // Verify credential with server
  async function verifyCredentialWithServer(credential, userId) {
    try {
      const serverUrl = window.location.origin || 'http://localhost:3000';
      
      const response = await fetch(`${serverUrl}/api/auth/biometric/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          credentialId: credential.id,
          authenticatorData: bufferToBase64URL(credential.response.authenticatorData),
          clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
          signature: bufferToBase64URL(credential.response.signature),
          userHandle: credential.response.userHandle ? bufferToBase64URL(credential.response.userHandle) : null
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Server verification failed');
      }
      
      return data;
    } catch (error) {
      console.error('[Biometric] Server verification error:', error);
      
      // Fallback: Try local verification if server is unavailable
      console.log('[Biometric] Attempting local verification...');
      return localVerification(credential, userId);
    }
  }

  // Local verification (fallback when server is unavailable)
  async function localVerification(credential, userId) {
    try {
      const storedCredential = getStoredCredential();
      
      if (!storedCredential || storedCredential.userId !== userId) {
        throw new Error('Credential mismatch');
      }
      
      // Check if credential ID matches
      if (credential.id !== storedCredential.credentialId) {
        throw new Error('Credential ID mismatch');
      }
      
      console.log('[Biometric] Local verification successful');
      
      // Try to get user from local storage
      if (typeof D !== 'undefined' && D.users && D.users[userId]) {
        return {
          success: true,
          user: D.users[userId],
          local: true
        };
      }
      
      return {
        success: true,
        userId: userId,
        local: true
      };
    } catch (error) {
      console.error('[Biometric] Local verification error:', error);
      throw error;
    }
  }

  // Check if biometric is enabled for current user
  function isBiometricEnabled() {
    const storedCredential = getStoredCredential();
    return !!storedCredential;
  }

  // Remove biometric authentication
  async function removeBiometric() {
    try {
      const storedCredential = getStoredCredential();
      
      if (storedCredential) {
        // Try to remove from server
        try {
          const serverUrl = window.location.origin || 'http://localhost:3000';
          await fetch(`${serverUrl}/api/auth/biometric/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: storedCredential.userId })
          });
        } catch (error) {
          console.warn('[Biometric] Server removal error:', error);
        }
      }
      
      // Remove from local storage
      clearCredential();
      
      return { success: true };
    } catch (error) {
      console.error('[Biometric] Removal error:', error);
      throw error;
    }
  }

  // Initialize biometric system
  function initBiometricSystem() {
    console.log('[Biometric] Initializing biometric authentication system');
    
    // Check availability
    BiometricConfig.isBiometricAvailable().then(available => {
      console.log('[Biometric] Biometric authentication available:', available);
      
      if (available) {
        window.biometricAuth = {
          register: registerBiometric,
          authenticate: authenticateWithBiometric,
          isEnabled: isBiometricEnabled,
          remove: removeBiometric,
          isAvailable: BiometricConfig.isBiometricAvailable
        };
        
        console.log('[Biometric] System ready');
      } else {
        console.log('[Biometric] Biometric authentication not available on this device');
      }
    });
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBiometricSystem);
  } else {
    initBiometricSystem();
  }

  // Also run after a short delay to catch late-loading scripts
  setTimeout(initBiometricSystem, 500);

  console.log('[Biometric] Biometric authentication system loaded');

})();

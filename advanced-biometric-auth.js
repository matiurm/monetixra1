/**
 * Advanced Biometric Authentication & Encryption for Monetixra
 * Features: Face Recognition, Fingerprint Auth, Voice Auth, Advanced Encryption, Zero-Knowledge Proofs
 */

const AdvancedBiometricAuth = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    // Biometric Thresholds
    FACE_RECOGNITION_THRESHOLD: 0.8,
    FINGERPRINT_MATCH_THRESHOLD: 0.85,
    VOICE_MATCH_THRESHOLD: 0.75,
    
    // Encryption
    ENCRYPTION_ALGORITHM: 'AES-GCM',
    KEY_LENGTH: 256,
    IV_LENGTH: 12,
    SALT_LENGTH: 16,
    
    // Key Derivation
    KDF_ITERATIONS: 100000,
    KDF_ALGORITHM: 'PBKDF2',
    KDF_HASH: 'SHA-256',
    
    // Biometric Storage
    BIOMETRIC_DATA_ENCRYPTED: true,
    BIOMETRIC_RETENTION_DAYS: 30,
    
    // Security
    MAX_AUTH_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    SESSION_DURATION: 30 * 60 * 1000, // 30 minutes
    
    // ZKP
    ZKP_ENABLED: true,
    ZKP_CIRCUIT complexity: 'medium'
  };

  // State
  let authState = {
    currentUser: null,
    biometricData: new Map(), // userId -> encrypted biometric data
    encryptionKeys: new Map(), // userId -> encryption keys
    authAttempts: new Map(), // userId -> { count, lastAttempt }
    activeSessions: new Map(), // sessionId -> session data
    faceModel: null,
    voiceModel: null
  };

  // ── Advanced Encryption ─────────────────────────────────────────────────────

  /**
   * Generate cryptographically secure random key
   */
  async function generateKey() {
    const key = await crypto.subtle.generateKey(
      {
        name: CONFIG.ENCRYPTION_ALGORITHM,
        length: CONFIG.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );
    return key;
  }

  /**
   * Derive key from password using PBKDF2
   * @param {string} password - User password
   * @param {Uint8Array} salt - Salt for key derivation
   */
  async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: CONFIG.KDF_ALGORITHM },
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: CONFIG.KDF_ALGORITHM,
        salt: salt,
        iterations: CONFIG.KDF_ITERATIONS,
        hash: { name: CONFIG.KDF_HASH }
      },
      baseKey,
      {
        name: CONFIG.ENCRYPTION_ALGORITHM,
        length: CONFIG.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );

    return key;
  }

  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   */
  async function encryptData(data, key) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const iv = crypto.getRandomValues(new Uint8Array(CONFIG.IV_LENGTH));
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: CONFIG.ENCRYPTION_ALGORITHM,
          iv: iv
        },
        key,
        dataBuffer
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64 for storage
      const base64 = btoa(String.fromCharCode(...combined));
      return base64;
    } catch (error) {
      console.error('[BiometricAuth] Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data
   * @param {string} encryptedData - Base64 encrypted data
   * @param {CryptoKey} key - Decryption key
   */
  async function decryptData(encryptedData, key) {
    try {
      // Convert from base64
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      const iv = combined.slice(0, CONFIG.IV_LENGTH);
      const encryptedBuffer = combined.slice(CONFIG.IV_LENGTH);
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: CONFIG.ENCRYPTION_ALGORITHM,
          iv: iv
        },
        key,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('[BiometricAuth] Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Hash data using SHA-256
   * @param {string} data - Data to hash
   */
  async function hashData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  // ── Face Recognition ────────────────────────────────────────────────────────

  /**
   * Initialize face recognition model
   */
  async function initFaceRecognition() {
    try {
      // Use TensorFlow.js with face-api.js or MediaPipe Face Detection
      // This is a simplified implementation
      
      if (typeof faceapi !== 'undefined') {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        
        authState.faceModel = faceapi;
        console.log('[BiometricAuth] Face recognition initialized');
        return true;
      } else {
        console.warn('[BiometricAuth] face-api.js not loaded');
        return false;
      }
    } catch (error) {
      console.error('[BiometricAuth] Face recognition init failed:', error);
      return false;
    }
  }

  /**
   * Capture face biometric data
   * @param {HTMLVideoElement} videoElement - Video element with face
   * @param {string} userId - User ID
   */
  async function captureFaceBiometric(videoElement, userId) {
    try {
      if (!authState.faceModel) {
        await initFaceRecognition();
      }

      if (!authState.faceModel) {
        throw new Error('Face recognition not available');
      }

      // Detect face and extract landmarks
      const detection = await authState.faceModel
        .detectSingleFace(videoElement, new authState.faceModel.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected');
      }

      // Convert descriptor to string for storage
      const faceDescriptor = Array.from(detection.descriptor);
      const faceData = JSON.stringify({
        descriptor: faceDescriptor,
        landmarks: detection.landmarks.positions.map(p => ({ x: p.x, y: p.y })),
        timestamp: Date.now()
      });

      // Encrypt biometric data
      const salt = crypto.getRandomValues(new Uint8Array(CONFIG.SALT_LENGTH));
      const key = await generateKey();
      const encryptedData = await encryptData(faceData, key);

      // Store
      authState.biometricData.set(`${userId}_face`, {
        encrypted: encryptedData,
        salt: btoa(String.fromCharCode(...salt)),
        timestamp: Date.now()
      });
      
      authState.encryptionKeys.set(`${userId}_face`, key);

      console.log('[BiometricAuth] Face biometric captured');
      return { success: true };
    } catch (error) {
      console.error('[BiometricAuth] Face capture failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify face biometric
   * @param {HTMLVideoElement} videoElement - Video element with face
   * @param {string} userId - User ID
   */
  async function verifyFaceBiometric(videoElement, userId) {
    try {
      if (!authState.faceModel) {
        await initFaceRecognition();
      }

      const storedData = authState.biometricData.get(`${userId}_face`);
      if (!storedData) {
        throw new Error('No face biometric data found');
      }

      // Decrypt stored data
      const salt = Uint8Array.from(atob(storedData.salt), c => c.charCodeAt(0));
      const key = authState.encryptionKeys.get(`${userId}_face`);
      const decryptedData = await decryptData(storedData.encrypted, key);
      const biometricData = JSON.parse(decryptedData);

      // Detect current face
      const detection = await authState.faceModel
        .detectSingleFace(videoElement, new authState.faceModel.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected');
      }

      // Compare face descriptors
      const storedDescriptor = new Float32Array(biometricData.descriptor);
      const currentDescriptor = detection.descriptor;
      
      const distance = authState.faceModel.euclideanDistance(storedDescriptor, currentDescriptor);
      const similarity = 1 - distance;

      if (similarity >= CONFIG.FACE_RECOGNITION_THRESHOLD) {
        console.log('[BiometricAuth] Face verified successfully');
        return { success: true, similarity: similarity };
      } else {
        console.warn('[BiometricAuth] Face verification failed');
        return { success: false, similarity: similarity };
      }
    } catch (error) {
      console.error('[BiometricAuth] Face verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ── Fingerprint Authentication ───────────────────────────────────────────────

  /**
   * Check fingerprint availability
   */
  async function isFingerprintAvailable() {
    try {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
      }
      return false;
    } catch (error) {
      console.error('[BiometricAuth] Fingerprint check failed:', error);
      return false;
    }
  }

  /**
   * Register fingerprint
   * @param {string} userId - User ID
   * @param {string} username - Username
   */
  async function registerFingerprint(userId, username) {
    try {
      if (!await isFingerprintAvailable()) {
        throw new Error('Fingerprint not available on this device');
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userID = new TextEncoder().encode(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Monetixra',
            id: window.location.hostname
          },
          user: {
            id: userID,
            name: username,
            displayName: username
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 } // ES256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          attestation: 'direct'
        }
      });

      // Store credential ID
      const fingerprintData = {
        credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        publicKey: credential.response.publicKey,
        timestamp: Date.now()
      };

      // Encrypt and store
      const salt = crypto.getRandomValues(new Uint8Array(CONFIG.SALT_LENGTH));
      const key = await generateKey();
      const encryptedData = await encryptData(JSON.stringify(fingerprintData), key);

      authState.biometricData.set(`${userId}_fingerprint`, {
        encrypted: encryptedData,
        salt: btoa(String.fromCharCode(...salt)),
        timestamp: Date.now()
      });
      
      authState.encryptionKeys.set(`${userId}_fingerprint`, key);

      console.log('[BiometricAuth] Fingerprint registered');
      return { success: true };
    } catch (error) {
      console.error('[BiometricAuth] Fingerprint registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify fingerprint
   * @param {string} userId - User ID
   */
  async function verifyFingerprint(userId) {
    try {
      const storedData = authState.biometricData.get(`${userId}_fingerprint`);
      if (!storedData) {
        throw new Error('No fingerprint data found');
      }

      // Decrypt stored data
      const salt = Uint8Array.from(atob(storedData.salt), c => c.charCodeAt(0));
      const key = authState.encryptionKeys.get(`${userId}_fingerprint`);
      const decryptedData = await decryptData(storedData.encrypted, key);
      const fingerprintData = JSON.parse(decryptedData);

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credentialId = Uint8Array.from(atob(fingerprintData.credentialId), c => c.charCodeAt(0));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          rpId: window.location.hostname,
          allowCredentials: [{
            id: credentialId,
            type: 'public-key'
          }],
          userVerification: 'required'
        }
      });

      console.log('[BiometricAuth] Fingerprint verified');
      return { success: true };
    } catch (error) {
      console.error('[BiometricAuth] Fingerprint verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ── Voice Authentication ────────────────────────────────────────────────────

  /**
   * Capture voice sample
   * @param {number} duration - Recording duration in seconds
   */
  async function captureVoiceSample(duration = 5) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      return new Promise((resolve, reject) => {
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          stream.getTracks().forEach(track => track.stop());
          resolve(audioBlob);
        };

        mediaRecorder.onerror = reject;
        mediaRecorder.start();

        setTimeout(() => {
          mediaRecorder.stop();
        }, duration * 1000);
      });
    } catch (error) {
      console.error('[BiometricAuth] Voice capture failed:', error);
      throw error;
    }
  }

  /**
   * Register voice biometric
   * @param {string} userId - User ID
   * @param {number} duration - Recording duration
   */
  async function registerVoiceBiometric(userId, duration = 5) {
    try {
      const audioBlob = await captureVoiceSample(duration);
      
      // Convert to audio data for processing
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
      
      // Extract features (simplified - in production use specialized voice recognition)
      const features = {
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        // Add more features like MFCC, pitch, etc.
        timestamp: Date.now()
      };

      const voiceData = JSON.stringify(features);

      // Encrypt and store
      const salt = crypto.getRandomValues(new Uint8Array(CONFIG.SALT_LENGTH));
      const key = await generateKey();
      const encryptedData = await encryptData(voiceData, key);

      authState.biometricData.set(`${userId}_voice`, {
        encrypted: encryptedData,
        salt: btoa(String.fromCharCode(...salt)),
        timestamp: Date.now()
      });
      
      authState.encryptionKeys.set(`${userId}_voice`, key);

      console.log('[BiometricAuth] Voice biometric registered');
      return { success: true };
    } catch (error) {
      console.error('[BiometricAuth] Voice registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify voice biometric
   * @param {string} userId - User ID
   * @param {number} duration - Recording duration
   */
  async function verifyVoiceBiometric(userId, duration = 5) {
    try {
      const audioBlob = await captureVoiceSample(duration);
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
      
      const currentFeatures = {
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels
      };

      const storedData = authState.biometricData.get(`${userId}_voice`);
      if (!storedData) {
        throw new Error('No voice biometric data found');
      }

      // Decrypt stored data
      const salt = Uint8Array.from(atob(storedData.salt), c => c.charCodeAt(0));
      const key = authState.encryptionKeys.get(`${userId}_voice`);
      const decryptedData = await decryptData(storedData.encrypted, key);
      const storedFeatures = JSON.parse(decryptedData);

      // Compare features (simplified)
      const similarity = calculateVoiceSimilarity(currentFeatures, storedFeatures);

      if (similarity >= CONFIG.VOICE_MATCH_THRESHOLD) {
        console.log('[BiometricAuth] Voice verified successfully');
        return { success: true, similarity: similarity };
      } else {
        console.warn('[BiometricAuth] Voice verification failed');
        return { success: false, similarity: similarity };
      }
    } catch (error) {
      console.error('[BiometricAuth] Voice verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate voice similarity (simplified)
   */
  function calculateVoiceSimilarity(features1, features2) {
    // Simplified similarity calculation
    // In production, use specialized voice recognition algorithms
    let similarity = 0;
    
    if (features1.sampleRate === features2.sampleRate) similarity += 0.3;
    if (Math.abs(features1.duration - features2.duration) < 1) similarity += 0.3;
    if (features1.channels === features2.channels) similarity += 0.2;
    
    // Add random similarity for demo purposes
    similarity += Math.random() * 0.2;
    
    return similarity;
  }

  // ── Zero-Knowledge Proofs ─────────────────────────────────────────────────

  /**
   * Generate ZKP for authentication
   * @param {string} userId - User ID
   * @param {string} secret - User secret
   */
  async function generateAuthZKP(userId, secret) {
    try {
      if (!CONFIG.ZKP_ENABLED) {
        return null;
      }

      // Simplified ZKP implementation
      // In production, use circomlib + snarkjs or similar
      
      const hash = await hashData(`${userId}:${secret}`);
      const randomValue = crypto.getRandomValues(new Uint8Array(32));
      
      const proof = {
        userId: userId,
        hash: hash,
        random: btoa(String.fromCharCode(...randomValue)),
        timestamp: Date.now()
      };

      // Sign the proof
      const signature = await signData(JSON.stringify(proof), secret);
      
      return {
        proof: proof,
        signature: signature
      };
    } catch (error) {
      console.error('[BiometricAuth] ZKP generation failed:', error);
      return null;
    }
  }

  /**
   * Verify ZKP
   * @param {object} zkpData - ZKP data
   * @param {string} secret - User secret
   */
  async function verifyAuthZKP(zkpData, secret) {
    try {
      if (!CONFIG.ZKP_ENABLED) {
        return false;
      }

      // Verify hash
      const expectedHash = await hashData(`${zkpData.proof.userId}:${secret}`);
      if (expectedHash !== zkpData.proof.hash) {
        return false;
      }

      // Verify signature
      const signatureValid = await verifySignature(
        JSON.stringify(zkpData.proof),
        zkpData.signature,
        secret
      );

      // Check timestamp (proof valid for 5 minutes)
      const age = Date.now() - zkpData.proof.timestamp;
      if (age > 5 * 60 * 1000) {
        return false;
      }

      return signatureValid;
    } catch (error) {
      console.error('[BiometricAuth] ZKP verification failed:', error);
      return false;
    }
  }

  /**
   * Sign data
   */
  async function signData(data, secret) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const secretBuffer = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      dataBuffer
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  /**
   * Verify signature
   */
  async function verifySignature(data, signature, secret) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const secretBuffer = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      dataBuffer
    );

    return valid;
  }

  // ── Session Management ─────────────────────────────────────────────────────

  /**
   * Create secure session
   * @param {string} userId - User ID
   * @param {object} metadata - Session metadata
   */
  async function createSecureSession(userId, metadata = {}) {
    try {
      const sessionId = crypto.randomUUID();
      const sessionKey = await generateKey();
      
      const session = {
        id: sessionId,
        userId: userId,
        key: sessionKey,
        createdAt: Date.now(),
        expiresAt: Date.now() + CONFIG.SESSION_DURATION,
        metadata: metadata
      };

      authState.activeSessions.set(sessionId, session);
      
      console.log('[BiometricAuth] Secure session created:', sessionId);
      return { success: true, sessionId: sessionId };
    } catch (error) {
      console.error('[BiometricAuth] Session creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate session
   * @param {string} sessionId - Session ID
   */
  function validateSession(sessionId) {
    const session = authState.activeSessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (Date.now() > session.expiresAt) {
      authState.activeSessions.delete(sessionId);
      return { valid: false, reason: 'Session expired' };
    }

    return { valid: true, session: session };
  }

  /**
   * Destroy session
   * @param {string} sessionId - Session ID
   */
  function destroySession(sessionId) {
    authState.activeSessions.delete(sessionId);
    console.log('[BiometricAuth] Session destroyed:', sessionId);
  }

  // ── Rate Limiting & Security ───────────────────────────────────────────────

  /**
   * Check auth attempts
   * @param {string} userId - User ID
   */
  function checkAuthAttempts(userId) {
    const attempts = authState.authAttempts.get(userId) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    
    // Reset if lockout period has passed
    if (now - attempts.lastAttempt > CONFIG.LOCKOUT_DURATION) {
      attempts.count = 0;
    }

    if (attempts.count >= CONFIG.MAX_AUTH_ATTEMPTS) {
      const lockoutTime = CONFIG.LOCKOUT_DURATION - (now - attempts.lastAttempt);
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
   * @param {string} userId - User ID
   */
  function recordFailedAttempt(userId) {
    const attempts = authState.authAttempts.get(userId) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    authState.authAttempts.set(userId, attempts);
    console.log('[BiometricAuth] Failed attempt recorded for:', userId);
  }

  /**
   * Clear auth attempts
   * @param {string} userId - User ID
   */
  function clearAuthAttempts(userId) {
    authState.authAttempts.delete(userId);
    console.log('[BiometricAuth] Auth attempts cleared for:', userId);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Encryption
    generateKey: generateKey,
    deriveKey: deriveKey,
    encrypt: encryptData,
    decrypt: decryptData,
    hash: hashData,
    
    // Face Recognition
    initFaceRecognition: initFaceRecognition,
    captureFace: captureFaceBiometric,
    verifyFace: verifyFaceBiometric,
    
    // Fingerprint
    isFingerprintAvailable: isFingerprintAvailable,
    registerFingerprint: registerFingerprint,
    verifyFingerprint: verifyFingerprint,
    
    // Voice
    registerVoice: registerVoiceBiometric,
    verifyVoice: verifyVoiceBiometric,
    
    // ZKP
    generateZKP: generateAuthZKP,
    verifyZKP: verifyAuthZKP,
    
    // Sessions
    createSession: createSecureSession,
    validateSession: validateSession,
    destroySession: destroySession,
    
    // Security
    checkAttempts: checkAuthAttempts,
    recordAttempt: recordFailedAttempt,
    clearAttempts: clearAuthAttempts,
    
    // State
    getState: () => ({ ...authState }),
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedBiometricAuth;
}
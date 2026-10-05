/**
 * ================================================================
 *  ADVANCED CALLING SYSTEM - Ultimate Features
 *  HD/4K Video | Screen Share | Recording | Virtual Background
 *  Noise Cancellation | Group Calls | AI Features | File Sharing
 *  Whiteboard | Read Receipts | Typing Indicators
 * ================================================================
 */

const AdvancedCallingSystem = (function() {
  'use strict';

  // Configuration
  const CONFIG = {
    version: '4.0.0-advanced',
    maxVideoQuality: '4K', // 'HD', 'Full HD', '4K'
    defaultVideoQuality: 'HD',
    maxParticipants: 10, // For group calls
    recordingFormats: ['webm', 'mp4'],
    aiEnabled: true,
    noiseCancellation: true,
    virtualBackground: true
  };

  // Video quality presets
  const VIDEO_QUALITIES = {
    'SD': { width: 640, height: 480, bitrate: 500000 },
    'HD': { width: 1280, height: 720, bitrate: 1500000 },
    'Full HD': { width: 1920, height: 1080, bitrate: 3000000 },
    '4K': { width: 3840, height: 2160, bitrate: 8000000 }
  };

  // State
  let state = {
    localStream: null,
    remoteStreams: new Map(),
    screenStream: null,
    recordingStream: null,
    mediaRecorder: null,
    recordedChunks: [],
    currentQuality: 'HD',
    isScreenSharing: false,
    isRecording: false,
    isNoiseCancellationEnabled: false,
    virtualBackgroundEnabled: false,
    participants: new Map(),
    whiteboardActive: false,
    transcriptionEnabled: false,
    transcriptionInterval: null
  };

  // Audio context for noise cancellation
  let audioContext = null;
  let noiseProcessor = null;

  // ============================================
  // HD/4K VIDEO QUALITY SUPPORT
  // ============================================

  async function setVideoQuality(quality) {
    try {
      if (!VIDEO_QUALITIES[quality]) {
        console.warn('[AdvancedCalling] Invalid quality:', quality);
        return false;
      }

      const settings = VIDEO_QUALITIES[quality];
      
      // If stream exists, restart with new quality
      if (state.localStream) {
        // Stop current tracks
        state.localStream.getTracks().forEach(track => track.stop());
        
        // Get new stream with new quality
        state.localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: settings.width },
            height: { ideal: settings.height },
            frameRate: { ideal: 30 }
          },
          audio: true
        });

        // Update all peer connections
        state.participants.forEach((participant, userId) => {
          if (participant.pc) {
            const videoTrack = state.localStream.getVideoTracks()[0];
            const sender = participant.pc.getSenders().find(s => s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          }
        });
      }

      state.currentQuality = quality;
      console.log('[AdvancedCalling] Video quality set to:', quality);
      return true;
    } catch (error) {
      console.error('[AdvancedCalling] Failed to set video quality:', error);
      return false;
    }
  }

  function getCurrentVideoQuality() {
    return state.currentQuality;
  }

  function getSupportedQualities() {
    return Object.keys(VIDEO_QUALITIES);
  }

  // ============================================
  // SCREEN SHARING
  // ============================================

  async function startScreenShare() {
    try {
      state.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      state.isScreenSharing = true;

      // Add screen share track to all peer connections
      state.participants.forEach((participant, userId) => {
        if (participant.pc) {
          const screenTrack = state.screenStream.getVideoTracks()[0];
          participant.pc.addTrack(screenTrack, state.screenStream);
        }
      });

      // Handle user stopping screen share
      state.screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      console.log('[AdvancedCalling] Screen sharing started');
      return true;
    } catch (error) {
      console.error('[AdvancedCalling] Screen share failed:', error);
      return false;
    }
  }

  function stopScreenShare() {
    if (state.screenStream) {
      state.screenStream.getTracks().forEach(track => track.stop());
      state.screenStream = null;
    }
    state.isScreenSharing = false;
    console.log('[AdvancedCalling] Screen sharing stopped');
  }

  function isScreenSharing() {
    return state.isScreenSharing;
  }

  // ============================================
  // CALL RECORDING
  // ============================================

  async function startRecording(format = 'webm') {
    try {
      if (state.isRecording) {
        console.warn('[AdvancedCalling] Already recording');
        return false;
      }

      // Combine local and remote streams
      const tracks = [];
      
      if (state.localStream) {
        tracks.push(...state.localStream.getTracks());
      }
      
      state.remoteStreams.forEach((stream, userId) => {
        tracks.push(...stream.getTracks());
      });

      if (tracks.length === 0) {
        console.warn('[AdvancedCalling] No streams to record');
        return false;
      }

      const combinedStream = new MediaStream(tracks);
      
      // Use appropriate MIME type
      let mimeType = 'video/webm';
      if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      state.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: VIDEO_QUALITIES[state.currentQuality].bitrate
      });

      state.recordedChunks = [];

      state.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          state.recordedChunks.push(event.data);
        }
      };

      state.mediaRecorder.onstop = () => {
        saveRecording();
      };

      state.mediaRecorder.start(1000); // Collect data every second
      state.isRecording = true;

      console.log('[AdvancedCalling] Recording started');
      return true;
    } catch (error) {
      console.error('[AdvancedCalling] Recording failed:', error);
      return false;
    }
  }

  function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
      state.mediaRecorder.stop();
      state.isRecording = false;
      console.log('[AdvancedCalling] Recording stopped');
    }
  }

  function saveRecording() {
    const blob = new Blob(state.recordedChunks, {
      type: state.mediaRecorder.mimeType
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call_recording_${Date.now()}.${state.mediaRecorder.mimeType.split('/')[1]}`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('[AdvancedCalling] Recording saved');
  }

  function isRecording() {
    return state.isRecording;
  }

  // ============================================
  // VIRTUAL BACKGROUND
  // ============================================

  async function enableVirtualBackground(imageUrl = null) {
    try {
      if (!state.localStream) {
        console.warn('[AdvancedCalling] No local stream for virtual background');
        return false;
      }

      // For now, we'll use CSS filter effects
      // In production, you'd use TensorFlow.js for AI background removal
      const videoElement = document.querySelector('#local-video video');
      if (videoElement) {
        if (imageUrl) {
          videoElement.style.background = `url(${imageUrl}) center/cover no-repeat`;
          videoElement.style.objectFit = 'contain';
        } else {
          // Blur effect
          videoElement.style.filter = 'blur(10px)';
        }
      }

      state.virtualBackgroundEnabled = true;
      console.log('[AdvancedCalling] Virtual background enabled');
      return true;
    } catch (error) {
      console.error('[AdvancedCalling] Virtual background failed:', error);
      return false;
    }
  }

  function disableVirtualBackground() {
    const videoElement = document.querySelector('#local-video video');
    if (videoElement) {
      videoElement.style.background = '';
      videoElement.style.filter = '';
      videoElement.style.objectFit = 'cover';
    }
    state.virtualBackgroundEnabled = false;
    console.log('[AdvancedCalling] Virtual background disabled');
  }

  // ============================================
  // NOISE CANCELLATION
  // ============================================

  async function enableNoiseCancellation() {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (!state.localStream) {
        console.warn('[AdvancedCalling] No local stream for noise cancellation');
        return false;
      }

      // Create audio processing chain
      const source = audioContext.createMediaStreamSource(state.localStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);
        
        // Simple noise gate (basic implementation)
        for (let i = 0; i < input.length; i++) {
          const abs = Math.abs(input[i]);
          if (abs < 0.01) {
            output[i] = 0; // Silence low-level noise
          } else {
            output[i] = input[i];
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      noiseProcessor = processor;
      state.isNoiseCancellationEnabled = true;

      console.log('[AdvancedCalling] Noise cancellation enabled');
      return true;
    } catch (error) {
      console.error('[AdvancedCalling] Noise cancellation failed:', error);
      return false;
    }
  }

  function disableNoiseCancellation() {
    if (noiseProcessor) {
      noiseProcessor.disconnect();
      noiseProcessor = null;
    }
    state.isNoiseCancellationEnabled = false;
    console.log('[AdvancedCalling] Noise cancellation disabled');
  }

  // ============================================
  // GROUP VIDEO CALLS
  // ============================================

  async function joinGroupCall(roomId) {
    try {
      console.log('[AdvancedCalling] Joining group call:', roomId);
      
      // Emit to server
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('group:join', { roomId });
      }

      return true;
    } catch (error) {
      console.error('[AdvancedCalling] Group call join failed:', error);
      return false;
    }
  }

  async function leaveGroupCall() {
    try {
      // Remove all participants
      state.participants.forEach((participant, userId) => {
        if (participant.pc) {
          participant.pc.close();
        }
      });
      state.participants.clear();

      // Emit to server
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('group:leave');
      }

      console.log('[AdvancedCalling] Left group call');
      return true;
    } catch (error) {
      console.error('[AdvancedCalling] Group call leave failed:', error);
      return false;
    }
  }

  function addParticipant(userId, stream) {
    state.participants.set(userId, {
      stream: stream,
      pc: null,
      metadata: {}
    });
    console.log('[AdvancedCalling] Participant added:', userId);
  }

  function removeParticipant(userId) {
    const participant = state.participants.get(userId);
    if (participant) {
      if (participant.pc) {
        participant.pc.close();
      }
      state.participants.delete(userId);
      console.log('[AdvancedCalling] Participant removed:', userId);
    }
  }

  function getParticipants() {
    return Array.from(state.participants.keys());
  }

  function getParticipantCount() {
    return state.participants.size;
  }

  // ============================================
  // AI-POWERED FEATURES
  // ============================================

  async function enableTranscription() {
    try {
      if (!CONFIG.aiEnabled) {
        console.warn('[AdvancedCalling] AI features not enabled');
        return false;
      }

      state.transcriptionEnabled = true;
      
      // Start transcription loop
      state.transcriptionInterval = setInterval(() => {
        transcribeAudio();
      }, 1000);

      console.log('[AdvancedCalling] Transcription enabled');
      return true;
    } catch (error) {
      console.error('[AdvancedCalling] Transcription failed:', error);
      return false;
    }
  }

  function disableTranscription() {
    if (state.transcriptionInterval) {
      clearInterval(state.transcriptionInterval);
      state.transcriptionInterval = null;
    }
    state.transcriptionEnabled = false;
    console.log('[AdvancedCalling] Transcription disabled');
  }

  async function transcribeAudio() {
    // This would integrate with OpenAI Whisper or similar
    // For now, it's a placeholder
    if (state.localStream) {
      // In production: Send audio to AI service for transcription
      console.log('[AdvancedCalling] Transcribing audio...');
    }
  }

  async function translateText(text, targetLanguage) {
    try {
      // This would integrate with Google Translate or DeepL
      // For now, return original text
      console.log('[AdvancedCalling] Translating to:', targetLanguage);
      return text;
    } catch (error) {
      console.error('[AdvancedCalling] Translation failed:', error);
      return text;
    }
  }

  // ============================================
  // ADVANCED CHAT FEATURES
  // ============================================

  function sendTypingIndicator(chatId, isTyping) {
    if (typeof socket !== 'undefined' && socket) {
      socket.emit('chat:typing', { chatId, isTyping });
    }
  }

  function sendReadReceipt(messageId) {
    if (typeof socket !== 'undefined' && socket) {
      socket.emit('chat:read', { messageId });
    }
  }

  function sendDeliveryReceipt(messageId) {
    if (typeof socket !== 'undefined' && socket) {
      socket.emit('chat:delivered', { messageId });
    }
  }

  // ============================================
  // FILE SHARING DURING CALLS
  // ============================================

  async function shareFile(file) {
    try {
      if (!file) {
        console.warn('[AdvancedCalling] No file to share');
        return false;
      }

      // Convert file to base64 or upload to server
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target.result;
        
        if (typeof socket !== 'undefined' && socket) {
          socket.emit('call:file-share', {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: fileData
          });
        }
      };
      
      reader.readAsDataURL(file);
      
      console.log('[AdvancedCalling] File sharing:', file.name);
      return true;
    } catch (error) {
      console.error('[AdvancedCalling] File share failed:', error);
      return false;
    }
  }

  // ============================================
  // WHITEBOARD / COLLABORATION
  // ============================================

  function enableWhiteboard() {
    if (state.whiteboardActive) {
      console.warn('[AdvancedCalling] Whiteboard already active');
      return;
    }

    // Create whiteboard UI
    const whiteboard = document.createElement('div');
    whiteboard.id = 'whiteboard-container';
    whiteboard.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      height: 80%;
      background: white;
      border-radius: 8px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
    `;

    whiteboard.innerHTML = `
      <div style="padding: 10px; background: #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold;">Whiteboard</span>
        <button onclick="AdvancedCallingSystem.disableWhiteboard()" style="padding: 5px 10px;">Close</button>
      </div>
      <canvas id="whiteboard-canvas" style="flex: 1; cursor: crosshair;"></canvas>
      <div style="padding: 10px; background: #f0f0f0; display: flex; gap: 10px;">
        <button onclick="AdvancedCallingSystem.setWhiteboardColor('#000000')" style="background: black; color: white;">Black</button>
        <button onclick="AdvancedCallingSystem.setWhiteboardColor('#ff0000')" style="background: red; color: white;">Red</button>
        <button onclick="AdvancedCallingSystem.setWhiteboardColor('#00ff00')" style="background: green; color: white;">Green</button>
        <button onclick="AdvancedCallingSystem.setWhiteboardColor('#0000ff')" style="background: blue; color: white;">Blue</button>
        <button onclick="AdvancedCallingSystem.clearWhiteboard()" style="padding: 5px 10px;">Clear</button>
      </div>
    `;

    document.body.appendChild(whiteboard);

    // Initialize canvas
    const canvas = document.getElementById('whiteboard-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = whiteboard.offsetWidth - 20;
    canvas.height = whiteboard.offsetHeight - 80;

    // Enable drawing
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentColor = '#000000';

    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      [lastX, lastY] = [e.offsetX, e.offsetY];
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      [lastX, lastY] = [e.offsetX, e.offsetY];
      
      // Sync drawing to other participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('whiteboard:draw', {
          x1: lastX,
          y1: lastY,
          x2: e.offsetX,
          y2: e.offsetY,
          color: currentColor
        });
      }
    });

    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);

    state.whiteboardActive = true;
    console.log('[AdvancedCalling] Whiteboard enabled');
  }

  function disableWhiteboard() {
    const whiteboard = document.getElementById('whiteboard-container');
    if (whiteboard) {
      whiteboard.remove();
    }
    state.whiteboardActive = false;
    console.log('[AdvancedCalling] Whiteboard disabled');
  }

  function setWhiteboardColor(color) {
    // This would update the current drawing color
    console.log('[AdvancedCalling] Whiteboard color set to:', color);
  }

  function clearWhiteboard() {
    const canvas = document.getElementById('whiteboard-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Sync clear to other participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('whiteboard:clear');
      }
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function getState() {
    return {
      currentQuality: state.currentQuality,
      isScreenSharing: state.isScreenSharing,
      isRecording: state.isRecording,
      isNoiseCancellationEnabled: state.isNoiseCancellationEnabled,
      virtualBackgroundEnabled: state.virtualBackgroundEnabled,
      participantCount: state.participants.size,
      whiteboardActive: state.whiteboardActive,
      transcriptionEnabled: state.transcriptionEnabled
    };
  }

  function getStats() {
    return {
      version: CONFIG.version,
      maxVideoQuality: CONFIG.maxVideoQuality,
      maxParticipants: CONFIG.maxParticipants,
      aiEnabled: CONFIG.aiEnabled,
      supportedQualities: getSupportedQualities()
    };
  }

  // Public API
  return {
    // Video Quality
    setVideoQuality,
    getCurrentVideoQuality,
    getSupportedQualities,
    
    // Screen Sharing
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
    
    // Recording
    startRecording,
    stopRecording,
    isRecording,
    
    // Virtual Background
    enableVirtualBackground,
    disableVirtualBackground,
    
    // Noise Cancellation
    enableNoiseCancellation,
    disableNoiseCancellation,
    
    // Group Calls
    joinGroupCall,
    leaveGroupCall,
    addParticipant,
    removeParticipant,
    getParticipants,
    getParticipantCount,
    
    // AI Features
    enableTranscription,
    disableTranscription,
    translateText,
    
    // Chat Features
    sendTypingIndicator,
    sendReadReceipt,
    sendDeliveryReceipt,
    
    // File Sharing
    shareFile,
    
    // Whiteboard
    enableWhiteboard,
    disableWhiteboard,
    setWhiteboardColor,
    clearWhiteboard,
    
    // Utilities
    getState,
    getStats,
    CONFIG
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.AdvancedCallingSystem = AdvancedCallingSystem;
}

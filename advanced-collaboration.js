/**
 * Advanced Real-Time Collaboration for Monetixra
 * Features: Real-time Document Editing, Live Cursors, Presence Awareness, Conflict Resolution, Collaborative Whiteboard
 */

const AdvancedCollaboration = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    // WebSocket
    WS_URL: process.env.WS_URL || 'ws://localhost:3000',
    RECONNECT_INTERVAL: 5000,
    MAX_RECONNECT_ATTEMPTS: 10,
    
    // Collaboration
    MAX_PARTICIPANTS: 50,
    CURSOR_UPDATE_INTERVAL: 50, // ms
    PRESENCE_UPDATE_INTERVAL: 5000, // ms
    
    // Document Sync
    SYNC_DEBOUNCE: 100, // ms
    MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    
    // Conflict Resolution
    CONFLICT_RESOLUTION: 'last-write-wins', // or 'operational-transform'
    VERSION_VECTOR_SIZE: 100,
    
    // Whiteboard
    WHITEBOARD_WIDTH: 1920,
    WHITEBOARD_HEIGHT: 1080,
    MAX_SHAPES: 1000,
    
    // Features
    REAL_TIME_EDITING: true,
    LIVE_CURSORS: true,
    PRESENCE_AWARENESS: true,
    COLLABORATIVE_WHITEBOARD: true,
    VOICE_CHAT: true,
    VIDEO_CHAT: true
  };

  // State
  let collaborationState = {
    connected: false,
    socket: null,
    reconnectAttempts: 0,
    reconnectTimer: null,
    
    // Sessions
    currentSession: null,
    sessions: new Map(), // sessionId -> session data
    
    // Participants
    participants: new Map(), // userId -> participant data
    localParticipant: null,
    
    // Documents
    documents: new Map(), // documentId -> document data
    activeDocument: null,
    
    // Cursors
    cursors: new Map(), // userId -> cursor data
    localCursor: null,
    
    // Whiteboard
    whiteboards: new Map(), // whiteboardId -> whiteboard data
    activeWhiteboard: null,
    
    // Voice/Video
    voiceChat: null,
    videoChat: null,
    localStream: null,
    remoteStreams: new Map()
  };

  // ── WebSocket Connection ───────────────────────────────────────────────────

  /**
   * Connect to collaboration server
   * @param {object} participantData - Local participant data
   */
  function connect(participantData) {
    try {
      if (collaborationState.socket) {
        console.warn('[Collaboration] Already connected');
        return;
      }

      const socket = new WebSocket(CONFIG.WS_URL);
      
      socket.onopen = () => {
        console.log('[Collaboration] Connected to server');
        collaborationState.connected = true;
        collaborationState.reconnectAttempts = 0;
        
        // Send participant data
        socket.send(JSON.stringify({
          type: 'participant-join',
          data: participantData
        }));
        
        // Set local participant
        collaborationState.localParticipant = participantData;
      };

      socket.onmessage = (event) => {
        handleMessage(JSON.parse(event.data));
      };

      socket.onclose = () => {
        console.log('[Collaboration] Disconnected from server');
        collaborationState.connected = false;
        
        // Attempt reconnection
        if (collaborationState.reconnectAttempts < CONFIG.MAX_RECONNECT_ATTEMPTS) {
          collaborationState.reconnectAttempts++;
          collaborationState.reconnectTimer = setTimeout(() => {
            console.log('[Collaboration] Reconnecting...');
            connect(participantData);
          }, CONFIG.RECONNECT_INTERVAL);
        }
      };

      socket.onerror = (error) => {
        console.error('[Collaboration] WebSocket error:', error);
      };

      collaborationState.socket = socket;
    } catch (error) {
      console.error('[Collaboration] Connection failed:', error);
    }
  }

  /**
   * Disconnect from server
   */
  function disconnect() {
    if (collaborationState.socket) {
      collaborationState.socket.close();
      collaborationState.socket = null;
      collaborationState.connected = false;
    }
    
    if (collaborationState.reconnectTimer) {
      clearTimeout(collaborationState.reconnectTimer);
      collaborationState.reconnectTimer = null;
    }
    
    console.log('[Collaboration] Disconnected');
  }

  /**
   * Send message to server
   * @param {object} message - Message object
   */
  function sendMessage(message) {
    if (!collaborationState.socket || !collaborationState.connected) {
      console.warn('[Collaboration] Not connected');
      return;
    }
    
    collaborationState.socket.send(JSON.stringify(message));
  }

  /**
   * Handle incoming message
   * @param {object} message - Message object
   */
  function handleMessage(message) {
    switch (message.type) {
      case 'participant-join':
        handleParticipantJoin(message.data);
        break;
      case 'participant-leave':
        handleParticipantLeave(message.data);
        break;
      case 'participant-update':
        handleParticipantUpdate(message.data);
        break;
      case 'document-sync':
        handleDocumentSync(message.data);
        break;
      case 'cursor-update':
        handleCursorUpdate(message.data);
        break;
      case 'whiteboard-update':
        handleWhiteboardUpdate(message.data);
        break;
      case 'session-create':
        handleSessionCreate(message.data);
        break;
      case 'session-join':
        handleSessionJoin(message.data);
        break;
      default:
        console.warn('[Collaboration] Unknown message type:', message.type);
    }
  }

  // ── Session Management ─────────────────────────────────────────────────────

  /**
   * Create collaboration session
   * @param {object} sessionData - Session data
   */
  function createSession(sessionData) {
    const sessionId = crypto.randomUUID();
    
    const session = {
      id: sessionId,
      name: sessionData.name || 'Untitled Session',
      createdAt: Date.now(),
      createdBy: collaborationState.localParticipant.id,
      participants: new Set([collaborationState.localParticipant.id]),
      metadata: sessionData.metadata || {}
    };
    
    collaborationState.sessions.set(sessionId, session);
    collaborationState.currentSession = session;
    
    // Notify server
    sendMessage({
      type: 'session-create',
      data: session
    });
    
    console.log('[Collaboration] Session created:', sessionId);
    return sessionId;
  }

  /**
   * Join session
   * @param {string} sessionId - Session ID
   */
  function joinSession(sessionId) {
    const session = collaborationState.sessions.get(sessionId);
    if (!session) {
      console.error('[Collaboration] Session not found:', sessionId);
      return;
    }
    
    collaborationState.currentSession = session;
    
    // Notify server
    sendMessage({
      type: 'session-join',
      data: {
        sessionId: sessionId,
        participantId: collaborationState.localParticipant.id
      }
    });
    
    console.log('[Collaboration] Joined session:', sessionId);
  }

  /**
   * Leave session
   */
  function leaveSession() {
    if (!collaborationState.currentSession) {
      return;
    }
    
    const sessionId = collaborationState.currentSession.id;
    
    // Notify server
    sendMessage({
      type: 'session-leave',
      data: {
        sessionId: sessionId,
        participantId: collaborationState.localParticipant.id
      }
    });
    
    collaborationState.currentSession = null;
    console.log('[Collaboration] Left session:', sessionId);
  }

  /**
   * Handle session creation
   */
  function handleSessionCreate(session) {
    collaborationState.sessions.set(session.id, session);
    console.log('[Collaboration] Session created by server:', session.id);
  }

  /**
   * Handle session join
   */
  function handleSessionJoin(data) {
    const session = collaborationState.sessions.get(data.sessionId);
    if (session) {
      session.participants.add(data.participantId);
      console.log('[Collaboration] Participant joined session:', data.participantId);
    }
  }

  // ── Participant Management ─────────────────────────────────────────────────

  /**
   * Handle participant join
   */
  function handleParticipantJoin(participant) {
    collaborationState.participants.set(participant.id, participant);
    console.log('[Collaboration] Participant joined:', participant.id);
    
    // Notify UI
    if (typeof onParticipantJoin === 'function') {
      onParticipantJoin(participant);
    }
  }

  /**
   * Handle participant leave
   */
  function handleParticipantLeave(participantId) {
    collaborationState.participants.delete(participantId);
    collaborationState.cursors.delete(participantId);
    console.log('[Collaboration] Participant left:', participantId);
    
    // Notify UI
    if (typeof onParticipantLeave === 'function') {
      onParticipantLeave(participantId);
    }
  }

  /**
   * Handle participant update
   */
  function handleParticipantUpdate(participant) {
    collaborationState.participants.set(participant.id, participant);
  }

  /**
   * Update local participant
   * @param {object} updates - Participant updates
   */
  function updateLocalParticipant(updates) {
    collaborationState.localParticipant = {
      ...collaborationState.localParticipant,
      ...updates
    };
    
    sendMessage({
      type: 'participant-update',
      data: collaborationState.localParticipant
    });
  }

  // ── Real-Time Document Editing ─────────────────────────────────────────────

  /**
   * Create document
   * @param {object} documentData - Document data
   */
  function createDocument(documentData) {
    const documentId = crypto.randomUUID();
    
    const document = {
      id: documentId,
      name: documentData.name || 'Untitled Document',
      content: documentData.content || '',
      version: 0,
      createdAt: Date.now(),
      createdBy: collaborationState.localParticipant.id,
      lastModifiedBy: collaborationState.localParticipant.id,
      lastModifiedAt: Date.now(),
      collaborators: new Set([collaborationState.localParticipant.id])
    };
    
    collaborationState.documents.set(documentId, document);
    collaborationState.activeDocument = document;
    
    // Notify server
    sendMessage({
      type: 'document-create',
      data: document
    });
    
    console.log('[Collaboration] Document created:', documentId);
    return documentId;
  }

  /**
   * Update document
   * @param {string} documentId - Document ID
   * @param {object} updates - Document updates
   */
  function updateDocument(documentId, updates) {
    const document = collaborationState.documents.get(documentId);
    if (!document) {
      console.error('[Collaboration] Document not found:', documentId);
      return;
    }
    
    // Apply updates
    Object.assign(document, updates);
    document.version++;
    document.lastModifiedBy = collaborationState.localParticipant.id;
    document.lastModifiedAt = Date.now();
    
    // Notify server (debounced)
    debouncedDocumentSync(document);
  }

  /**
   * Debounced document sync
   */
  let documentSyncTimer = null;
  function debouncedDocumentSync(document) {
    if (documentSyncTimer) {
      clearTimeout(documentSyncTimer);
    }
    
    documentSyncTimer = setTimeout(() => {
      sendMessage({
        type: 'document-sync',
        data: document
      });
    }, CONFIG.SYNC_DEBOUNCE);
  }

  /**
   * Handle document sync
   */
  function handleDocumentSync(document) {
    const existingDocument = collaborationState.documents.get(document.id);
    
    if (existingDocument) {
      // Conflict resolution
      if (document.version > existingDocument.version) {
        // Remote version is newer
        collaborationState.documents.set(document.id, document);
        
        // Notify UI
        if (typeof onDocumentUpdate === 'function') {
          onDocumentUpdate(document);
        }
      } else if (document.version === existingDocument.version) {
        // Same version, potential conflict
        resolveConflict(existingDocument, document);
      }
    } else {
      // New document
      collaborationState.documents.set(document.id, document);
    }
  }

  /**
   * Resolve conflict
   */
  function resolveConflict(localDoc, remoteDoc) {
    switch (CONFIG.CONFLICT_RESOLUTION) {
      case 'last-write-wins':
        // Use the most recently modified
        if (remoteDoc.lastModifiedAt > localDoc.lastModifiedAt) {
          collaborationState.documents.set(remoteDoc.id, remoteDoc);
          if (typeof onDocumentUpdate === 'function') {
            onDocumentUpdate(remoteDoc);
          }
        }
        break;
        
      case 'operational-transform':
        // Apply operational transformation (simplified)
        const mergedContent = operationalTransform(localDoc.content, remoteDoc.content);
        localDoc.content = mergedContent;
        localDoc.version++;
        collaborationState.documents.set(localDoc.id, localDoc);
        break;
        
      default:
        console.warn('[Collaboration] Unknown conflict resolution strategy');
    }
  }

  /**
   * Simple operational transform (simplified)
   */
  function operationalTransform(localContent, remoteContent) {
    // In production, use a proper OT library like ShareJS or Yjs
    // This is a simplified version
    return remoteContent;
  }

  // ── Live Cursors ───────────────────────────────────────────────────────────

  /**
   * Update local cursor
   * @param {object} cursorData - Cursor data
   */
  function updateLocalCursor(cursorData) {
    collaborationState.localCursor = {
      ...collaborationState.localCursor,
      ...cursorData,
      participantId: collaborationState.localParticipant.id,
      timestamp: Date.now()
    };
    
    sendMessage({
      type: 'cursor-update',
      data: collaborationState.localCursor
    });
  }

  /**
   * Handle cursor update
   */
  function handleCursorUpdate(cursor) {
    collaborationState.cursors.set(cursor.participantId, cursor);
    
    // Notify UI
    if (typeof onCursorUpdate === 'function') {
      onCursorUpdate(cursor);
    }
  }

  /**
   * Remove cursor
   * @param {string} participantId - Participant ID
   */
  function removeCursor(participantId) {
    collaborationState.cursors.delete(participantId);
    
    // Notify UI
    if (typeof onCursorRemove === 'function') {
      onCursorRemove(participantId);
    }
  }

  // ── Collaborative Whiteboard ───────────────────────────────────────────────

  /**
   * Create whiteboard
   * @param {object} whiteboardData - Whiteboard data
   */
  function createWhiteboard(whiteboardData) {
    const whiteboardId = crypto.randomUUID();
    
    const whiteboard = {
      id: whiteboardId,
      name: whiteboardData.name || 'Untitled Whiteboard',
      width: whiteboardData.width || CONFIG.WHITEBOARD_WIDTH,
      height: whiteboardData.height || CONFIG.WHITEBOARD_HEIGHT,
      shapes: [],
      createdAt: Date.now(),
      createdBy: collaborationState.localParticipant.id,
      collaborators: new Set([collaborationState.localParticipant.id])
    };
    
    collaborationState.whiteboards.set(whiteboardId, whiteboard);
    collaborationState.activeWhiteboard = whiteboard;
    
    // Notify server
    sendMessage({
      type: 'whiteboard-create',
      data: whiteboard
    });
    
    console.log('[Collaboration] Whiteboard created:', whiteboardId);
    return whiteboardId;
  }

  /**
   * Add shape to whiteboard
   * @param {string} whiteboardId - Whiteboard ID
   * @param {object} shape - Shape data
   */
  function addShape(whiteboardId, shape) {
    const whiteboard = collaborationState.whiteboards.get(whiteboardId);
    if (!whiteboard) {
      console.error('[Collaboration] Whiteboard not found:', whiteboardId);
      return;
    }
    
    if (whiteboard.shapes.length >= CONFIG.MAX_SHAPES) {
      console.warn('[Collaboration] Maximum shapes reached');
      return;
    }
    
    const shapeWithId = {
      ...shape,
      id: crypto.randomUUID(),
      createdBy: collaborationState.localParticipant.id,
      createdAt: Date.now()
    };
    
    whiteboard.shapes.push(shapeWithId);
    
    // Notify server
    sendMessage({
      type: 'whiteboard-update',
      data: {
        whiteboardId: whiteboardId,
        action: 'add-shape',
        shape: shapeWithId
      }
    });
    
    return shapeWithId.id;
  }

  /**
   * Update shape
   * @param {string} whiteboardId - Whiteboard ID
   * @param {string} shapeId - Shape ID
   * @param {object} updates - Shape updates
   */
  function updateShape(whiteboardId, shapeId, updates) {
    const whiteboard = collaborationState.whiteboards.get(whiteboardId);
    if (!whiteboard) {
      console.error('[Collaboration] Whiteboard not found:', whiteboardId);
      return;
    }
    
    const shape = whiteboard.shapes.find(s => s.id === shapeId);
    if (!shape) {
      console.error('[Collaboration] Shape not found:', shapeId);
      return;
    }
    
    Object.assign(shape, updates);
    shape.updatedBy = collaborationState.localParticipant.id;
    shape.updatedAt = Date.now();
    
    // Notify server
    sendMessage({
      type: 'whiteboard-update',
      data: {
        whiteboardId: whiteboardId,
        action: 'update-shape',
        shapeId: shapeId,
        updates: updates
      }
    });
  }

  /**
   * Delete shape
   * @param {string} whiteboardId - Whiteboard ID
   * @param {string} shapeId - Shape ID
   */
  function deleteShape(whiteboardId, shapeId) {
    const whiteboard = collaborationState.whiteboards.get(whiteboardId);
    if (!whiteboard) {
      console.error('[Collaboration] Whiteboard not found:', whiteboardId);
      return;
    }
    
    const index = whiteboard.shapes.findIndex(s => s.id === shapeId);
    if (index === -1) {
      console.error('[Collaboration] Shape not found:', shapeId);
      return;
    }
    
    whiteboard.shapes.splice(index, 1);
    
    // Notify server
    sendMessage({
      type: 'whiteboard-update',
      data: {
        whiteboardId: whiteboardId,
        action: 'delete-shape',
        shapeId: shapeId
      }
    });
  }

  /**
   * Handle whiteboard update
   */
  function handleWhiteboardUpdate(data) {
    const whiteboard = collaborationState.whiteboards.get(data.whiteboardId);
    if (!whiteboard) {
      console.error('[Collaboration] Whiteboard not found:', data.whiteboardId);
      return;
    }
    
    switch (data.action) {
      case 'add-shape':
        whiteboard.shapes.push(data.shape);
        break;
      case 'update-shape':
        const shape = whiteboard.shapes.find(s => s.id === data.shapeId);
        if (shape) {
          Object.assign(shape, data.updates);
        }
        break;
      case 'delete-shape':
        const index = whiteboard.shapes.findIndex(s => s.id === data.shapeId);
        if (index !== -1) {
          whiteboard.shapes.splice(index, 1);
        }
        break;
    }
    
    // Notify UI
    if (typeof onWhiteboardUpdate === 'function') {
      onWhiteboardUpdate(whiteboard);
    }
  }

  // ── Voice/Video Chat ───────────────────────────────────────────────────────

  /**
   * Start voice chat
   */
  async function startVoiceChat() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      collaborationState.localStream = stream;
      
      // Setup WebRTC connections with other participants
      for (const [participantId, participant] of collaborationState.participants) {
        if (participantId !== collaborationState.localParticipant.id) {
          await setupPeerConnection(participantId, stream);
        }
      }
      
      console.log('[Collaboration] Voice chat started');
      return { success: true };
    } catch (error) {
      console.error('[Collaboration] Voice chat failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start video chat
   */
  async function startVideoChat() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      collaborationState.localStream = stream;
      
      // Setup WebRTC connections
      for (const [participantId, participant] of collaborationState.participants) {
        if (participantId !== collaborationState.localParticipant.id) {
          await setupPeerConnection(participantId, stream);
        }
      }
      
      console.log('[Collaboration] Video chat started');
      return { success: true };
    } catch (error) {
      console.error('[Collaboration] Video chat failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup peer connection
   */
  async function setupPeerConnection(participantId, stream) {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const peerConnection = new RTCPeerConnection(config);
    
    // Add local stream
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      collaborationState.remoteStreams.set(participantId, event.streams[0]);
      
      // Notify UI
      if (typeof onRemoteStream === 'function') {
        onRemoteStream(participantId, event.streams[0]);
      }
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({
          type: 'ice-candidate',
          data: {
            participantId: participantId,
            candidate: event.candidate
          }
        });
      }
    };
    
    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    // Send offer to server
    sendMessage({
      type: 'offer',
      data: {
        participantId: participantId,
        offer: offer
      }
    });
    
    collaborationState.voiceChat = peerConnection;
  }

  /**
   * Stop voice/video chat
   */
  function stopChat() {
    if (collaborationState.localStream) {
      collaborationState.localStream.getTracks().forEach(track => track.stop());
      collaborationState.localStream = null;
    }
    
    if (collaborationState.voiceChat) {
      collaborationState.voiceChat.close();
      collaborationState.voiceChat = null;
    }
    
    collaborationState.remoteStreams.clear();
    
    console.log('[Collaboration] Chat stopped');
  }

  // ── Event Callbacks ───────────────────────────────────────────────────────

  let onParticipantJoin = null;
  let onParticipantLeave = null;
  let onDocumentUpdate = null;
  let onCursorUpdate = null;
  let onCursorRemove = null;
  let onWhiteboardUpdate = null;
  let onRemoteStream = null;

  /**
   * Set event callback
   */
  function on(event, callback) {
    switch (event) {
      case 'participant-join':
        onParticipantJoin = callback;
        break;
      case 'participant-leave':
        onParticipantLeave = callback;
        break;
      case 'document-update':
        onDocumentUpdate = callback;
        break;
      case 'cursor-update':
        onCursorUpdate = callback;
        break;
      case 'cursor-remove':
        onCursorRemove = callback;
        break;
      case 'whiteboard-update':
        onWhiteboardUpdate = callback;
        break;
      case 'remote-stream':
        onRemoteStream = callback;
        break;
      default:
        console.warn('[Collaboration] Unknown event:', event);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Connection
    connect: connect,
    disconnect: disconnect,
    
    // Sessions
    createSession: createSession,
    joinSession: joinSession,
    leaveSession: leaveSession,
    
    // Participants
    updateParticipant: updateLocalParticipant,
    getParticipants: () => Array.from(collaborationState.participants.values()),
    
    // Documents
    createDocument: createDocument,
    updateDocument: updateDocument,
    getDocument: (id) => collaborationState.documents.get(id),
    
    // Cursors
    updateCursor: updateLocalCursor,
    removeCursor: removeCursor,
    getCursors: () => Array.from(collaborationState.cursors.values()),
    
    // Whiteboard
    createWhiteboard: createWhiteboard,
    addShape: addShape,
    updateShape: updateShape,
    deleteShape: deleteShape,
    getWhiteboard: (id) => collaborationState.whiteboards.get(id),
    
    // Voice/Video
    startVoiceChat: startVoiceChat,
    startVideoChat: startVideoChat,
    stopChat: stopChat,
    
    // Events
    on: on,
    
    // State
    getState: () => ({ ...collaborationState }),
    isConnected: () => collaborationState.connected,
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedCollaboration;
}
/**
 * ================================================================
 *  ADVANCED COLLABORATION TOOLS (ENHANCED)
 *  Multi-user Whiteboard | Document Collaboration | Code Sharing
 *  Real-time Editing | Version Control | Comments
 *  3D Collaboration | VR/AR Spaces | AI Meeting Summaries
 * ================================================================
 */

const CollaborationTools = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    version: '2.0.0',
    maxParticipants: 20,
    maxWhiteboardSize: 10000,
    enableCodeSharing: true,
    enableDocCollaboration: true,
    enable3DCollaboration: true,
    enableVRSpaces: true,
    enableAIMeetingSummaries: true
  };

  // State
  let state = {
    whiteboards: new Map(),
    documents: new Map(),
    codeSessions: new Map(),
    activeSession: null,
    participants: new Map(),
    threeDSpaces: new Map(),
    vrSessions: new Map(),
    meetingSummaries: new Map()
  };

  // ============================================
  // ADVANCED WHITEBOARD
  // ============================================

  function createWhiteboard(roomId, options = {}) {
    try {
      const whiteboard = {
        roomId: roomId,
        id: 'wb_' + Date.now(),
        name: options.name || 'Whiteboard',
        createdBy: options.createdBy || CU?.id,
        createdAt: Date.now(),
        strokes: [],
        shapes: [],
        text: [],
        images: [],
        participants: new Set(),
        backgroundColor: '#ffffff',
        gridSize: 20,
        isLocked: false
      };

      state.whiteboards.set(whiteboard.id, whiteboard);
      console.log('[CollaborationTools] Whiteboard created:', whiteboard.id);
      return whiteboard;
    } catch (error) {
      console.error('[CollaborationTools] Whiteboard creation failed:', error);
      return null;
    }
  }

  function openWhiteboard(whiteboardId) {
    try {
      const whiteboard = state.whiteboards.get(whiteboardId);
      if (!whiteboard) {
        console.warn('[CollaborationTools] Whiteboard not found:', whiteboardId);
        return false;
      }

      state.activeSession = whiteboardId;
      renderWhiteboardUI(whiteboard);

      // Join room via socket
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('whiteboard:join', { whiteboardId });
      }

      console.log('[CollaborationTools] Whiteboard opened:', whiteboardId);
      return true;
    } catch (error) {
      console.error('[CollaborationTools] Open whiteboard failed:', error);
      return false;
    }
  }

  function addStroke(whiteboardId, stroke) {
    try {
      const whiteboard = state.whiteboards.get(whiteboardId);
      if (!whiteboard) {
        return false;
      }

      whiteboard.strokes.push({
        ...stroke,
        id: 'stroke_' + Date.now(),
        createdAt: Date.now(),
        createdBy: CU?.id
      });

      // Broadcast to other participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('whiteboard:stroke', { whiteboardId, stroke });
      }

      return true;
    } catch (error) {
      console.error('[CollaborationTools] Add stroke failed:', error);
      return false;
    }
  }

  function addShape(whiteboardId, shape) {
    try {
      const whiteboard = state.whiteboards.get(whiteboardId);
      if (!whiteboard) {
        return false;
      }

      whiteboard.shapes.push({
        ...shape,
        id: 'shape_' + Date.now(),
        createdAt: Date.now(),
        createdBy: CU?.id
      });

      // Broadcast to other participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('whiteboard:shape', { whiteboardId, shape });
      }

      return true;
    } catch (error) {
      console.error('[CollaborationTools] Add shape failed:', error);
      return false;
    }
  }

  function addText(whiteboardId, text) {
    try {
      const whiteboard = state.whiteboards.get(whiteboardId);
      if (!whiteboard) {
        return false;
      }

      whiteboard.text.push({
        ...text,
        id: 'text_' + Date.now(),
        createdAt: Date.now(),
        createdBy: CU?.id
      });

      // Broadcast to other participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('whiteboard:text', { whiteboardId, text });
      }

      return true;
    } catch (error) {
      console.error('[CollaborationTools] Add text failed:', error);
      return false;
    }
  }

  function clearWhiteboard(whiteboardId) {
    try {
      const whiteboard = state.whiteboards.get(whiteboardId);
      if (!whiteboard) {
        return false;
      }

      whiteboard.strokes = [];
      whiteboard.shapes = [];
      whiteboard.text = [];

      // Broadcast to other participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('whiteboard:clear', { whiteboardId });
      }

      console.log('[CollaborationTools] Whiteboard cleared:', whiteboardId);
      return true;
    } catch (error) {
      console.error('[CollaborationTools] Clear whiteboard failed:', error);
      return false;
    }
  }

  function undoStroke(whiteboardId) {
    try {
      const whiteboard = state.whiteboards.get(whiteboardId);
      if (!whiteboard || whiteboard.strokes.length === 0) {
        return false;
      }

      whiteboard.strokes.pop();

      // Broadcast to other participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('whiteboard:undo', { whiteboardId });
      }

      return true;
    } catch (error) {
      console.error('[CollaborationTools] Undo stroke failed:', error);
      return false;
    }
  }

  function exportWhiteboard(whiteboardId, format = 'png') {
    try {
      const whiteboard = state.whiteboards.get(whiteboardId);
      if (!whiteboard) {
        return null;
      }

      const canvas = document.getElementById('whiteboard-canvas');
      if (!canvas) {
        return null;
      }

      const dataUrl = canvas.toDataURL(`image/${format}`);

      // Download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `whiteboard_${whiteboardId}.${format}`;
      a.click();

      console.log('[CollaborationTools] Whiteboard exported:', whiteboardId);
      return dataUrl;
    } catch (error) {
      console.error('[CollaborationTools] Export whiteboard failed:', error);
      return null;
    }
  }

  function renderWhiteboardUI(whiteboard) {
    try {
      // Check if whiteboard already exists
      if (document.getElementById('whiteboard-container')) {
        return;
      }

      // Create whiteboard container
      const container = document.createElement('div');
      container.id = 'whiteboard-container';
      container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        height: 90%;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        flex-direction: column;
      `;

      container.innerHTML = `
        <div style="padding: 15px; background: #f5f5f5; display: flex; justify-content: space-between; align-items: center; border-radius: 12px 12px 0 0;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: bold; font-size: 18px;">🎨 ${whiteboard.name}</span>
            <span style="font-size: 12px; color: #666;">${whiteboard.participants.size} participants</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="CollaborationTools.undoStroke('${whiteboard.id}')" style="padding: 8px 16px; border: none; background: #e0e0e0; border-radius: 6px; cursor: pointer;">↩ Undo</button>
            <button onclick="CollaborationTools.clearWhiteboard('${whiteboard.id}')" style="padding: 8px 16px; border: none; background: #ff6b6b; color: white; border-radius: 6px; cursor: pointer;">🗑 Clear</button>
            <button onclick="CollaborationTools.exportWhiteboard('${whiteboard.id}')" style="padding: 8px 16px; border: none; background: #4ecdc4; color: white; border-radius: 6px; cursor: pointer;">📥 Export</button>
            <button onclick="CollaborationTools.closeWhiteboard()" style="padding: 8px 16px; border: none; background: #333; color: white; border-radius: 6px; cursor: pointer;">✕ Close</button>
          </div>
        </div>
        <div style="flex: 1; position: relative; overflow: hidden;">
          <canvas id="whiteboard-canvas" style="width: 100%; height: 100%; cursor: crosshair;"></canvas>
        </div>
        <div style="padding: 15px; background: #f5f5f5; display: flex; gap: 10px; align-items: center; border-radius: 0 0 12px 12px;">
          <div style="display: flex; gap: 5px;">
            <button onclick="CollaborationTools.setTool('pen')" style="width: 40px; height: 40px; border: 2px solid #333; background: white; border-radius: 8px; cursor: pointer; font-size: 20px;">✏️</button>
            <button onclick="CollaborationTools.setTool('eraser')" style="width: 40px; height: 40px; border: 2px solid #333; background: white; border-radius: 8px; cursor: pointer; font-size: 20px;">🧹</button>
            <button onclick="CollaborationTools.setTool('line')" style="width: 40px; height: 40px; border: 2px solid #333; background: white; border-radius: 8px; cursor: pointer; font-size: 20px;">📏</button>
            <button onclick="CollaborationTools.setTool('rect')" style="width: 40px; height: 40px; border: 2px solid #333; background: white; border-radius: 8px; cursor: pointer; font-size: 20px;">⬜</button>
            <button onclick="CollaborationTools.setTool('circle')" style="width: 40px; height: 40px; border: 2px solid #333; background: white; border-radius: 8px; cursor: pointer; font-size: 20px;">⭕</button>
          </div>
          <div style="width: 2px; height: 40px; background: #ddd;"></div>
          <div style="display: flex; gap: 5px;">
            <button onclick="CollaborationTools.setColor('#000000')" style="width: 30px; height: 30px; border: 2px solid #333; background: #000000; border-radius: 50%; cursor: pointer;"></button>
            <button onclick="CollaborationTools.setColor('#ff0000')" style="width: 30px; height: 30px; border: 2px solid #333; background: #ff0000; border-radius: 50%; cursor: pointer;"></button>
            <button onclick="CollaborationTools.setColor('#00ff00')" style="width: 30px; height: 30px; border: 2px solid #333; background: #00ff00; border-radius: 50%; cursor: pointer;"></button>
            <button onclick="CollaborationTools.setColor('#0000ff')" style="width: 30px; height: 30px; border: 2px solid #333; background: #0000ff; border-radius: 50%; cursor: pointer;"></button>
            <button onclick="CollaborationTools.setColor('#ffff00')" style="width: 30px; height: 30px; border: 2px solid #333; background: #ffff00; border-radius: 50%; cursor: pointer;"></button>
            <button onclick="CollaborationTools.setColor('#ff00ff')" style="width: 30px; height: 30px; border: 2px solid #333; background: #ff00ff; border-radius: 50%; cursor: pointer;"></button>
          </div>
          <div style="width: 2px; height: 40px; background: #ddd;"></div>
          <div style="display: flex; gap: 5px; align-items: center;">
            <label style="font-size: 14px;">Size:</label>
            <input type="range" id="brush-size" min="1" max="50" value="5" style="width: 100px;">
            <span id="brush-size-value">5</span>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Initialize canvas
      const canvas = document.getElementById('whiteboard-canvas');
      const ctx = canvas.getContext('2d');

      // Set canvas size
      canvas.width = container.offsetWidth - 30;
      canvas.height = container.offsetHeight - 100;

      // Initialize drawing
      initializeCanvasDrawing(canvas, ctx, whiteboard.id);

      // Load existing strokes
      whiteboard.strokes.forEach(stroke => {
        drawStroke(ctx, stroke);
      });

      console.log('[CollaborationTools] Whiteboard UI rendered');
    } catch (error) {
      console.error('[CollaborationTools] Render whiteboard UI failed:', error);
    }
  }

  function initializeCanvasDrawing(canvas, ctx, whiteboardId) {
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'pen';
    let currentColor = '#000000';
    let brushSize = 5;

    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      [lastX, lastY] = [e.offsetX, e.offsetY];
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;

      const stroke = {
        x1: lastX,
        y1: lastY,
        x2: e.offsetX,
        y2: e.offsetY,
        color: currentColor,
        size: brushSize,
        tool: currentTool
      };

      drawStroke(ctx, stroke);
      addStroke(whiteboardId, stroke);

      [lastX, lastY] = [e.offsetX, e.offsetY];
    });

    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);

    // Brush size slider
    const brushSizeSlider = document.getElementById('brush-size');
    if (brushSizeSlider) {
      brushSizeSlider.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        document.getElementById('brush-size-value').textContent = brushSize;
      });
    }

    // Store current settings
    state.currentTool = currentTool;
    state.currentColor = currentColor;
    state.brushSize = brushSize;
  }

  function drawStroke(ctx, stroke) {
    ctx.beginPath();
    ctx.moveTo(stroke.x1, stroke.y1);
    ctx.lineTo(stroke.x2, stroke.y2);
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function setTool(tool) {
    state.currentTool = tool;
    console.log('[CollaborationTools] Tool set to:', tool);
  }

  function setColor(color) {
    state.currentColor = color;
    console.log('[CollaborationTools] Color set to:', color);
  }

  function closeWhiteboard() {
    const container = document.getElementById('whiteboard-container');
    if (container) {
      container.remove();
    }
    state.activeSession = null;

    // Leave room via socket
    if (typeof socket !== 'undefined' && socket) {
      socket.emit('whiteboard:leave', { whiteboardId: state.activeSession });
    }

    console.log('[CollaborationTools] Whiteboard closed');
  }

  // ============================================
  // DOCUMENT COLLABORATION
  // ============================================

  function createDocument(options = {}) {
    try {
      const document = {
        id: 'doc_' + Date.now(),
        name: options.name || 'Untitled Document',
        content: options.content || '',
        createdBy: options.createdBy || CU?.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        collaborators: new Set([CU?.id]),
        comments: [],
        history: []
      };

      state.documents.set(document.id, document);
      console.log('[CollaborationTools] Document created:', document.id);
      return document;
    } catch (error) {
      console.error('[CollaborationTools] Document creation failed:', error);
      return null;
    }
  }

  function updateDocument(documentId, content, userId) {
    try {
      const document = state.documents.get(documentId);
      if (!document) {
        return false;
      }

      // Save to history
      document.history.push({
        version: document.version,
        content: document.content,
        updatedAt: document.updatedAt,
        updatedBy: userId
      });

      // Update document
      document.content = content;
      document.updatedAt = Date.now();
      document.version++;

      // Broadcast to collaborators
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('doc:update', { documentId, content, version: document.version });
      }

      console.log('[CollaborationTools] Document updated:', documentId);
      return true;
    } catch (error) {
      console.error('[CollaborationTools] Document update failed:', error);
      return false;
    }
  }

  function addComment(documentId, comment) {
    try {
      const document = state.documents.get(documentId);
      if (!document) {
        return false;
      }

      document.comments.push({
        ...comment,
        id: 'comment_' + Date.now(),
        createdAt: Date.now(),
        createdBy: CU?.id
      });

      // Broadcast to collaborators
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('doc:comment', { documentId, comment });
      }

      console.log('[CollaborationTools] Comment added:', documentId);
      return true;
    } catch (error) {
      console.error('[CollaborationTools] Add comment failed:', error);
      return false;
    }
  }

  function getDocumentVersion(documentId, version) {
    try {
      const document = state.documents.get(documentId);
      if (!document) {
        return null;
      }

      const historyEntry = document.history.find(h => h.version === version);
      return historyEntry || null;
    } catch (error) {
      console.error('[CollaborationTools] Get document version failed:', error);
      return null;
    }
  }

  // ============================================
  // CODE SHARING
  // ============================================

  function createCodeSession(options = {}) {
    try {
      const session = {
        id: 'code_' + Date.now(),
        language: options.language || 'javascript',
        code: options.code || '',
        createdBy: options.createdBy || CU?.id,
        createdAt: Date.now(),
        participants: new Set(),
        isExecuting: false
      };

      state.codeSessions.set(session.id, session);
      console.log('[CollaborationTools] Code session created:', session.id);
      return session;
    } catch (error) {
      console.error('[CollaborationTools] Code session creation failed:', error);
      return null;
    }
  }

  function updateCode(sessionId, code) {
    try {
      const session = state.codeSessions.get(sessionId);
      if (!session) {
        return false;
      }

      session.code = code;

      // Broadcast to participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('code:update', { sessionId, code });
      }

      console.log('[CollaborationTools] Code updated:', sessionId);
      return true;
    } catch (error) {
      console.error('[CollaborationTools] Code update failed:', error);
      return false;
    }
  }

  function executeCode(sessionId) {
    try {
      const session = state.codeSessions.get(sessionId);
      if (!session) {
        return null;
      }

      session.isExecuting = true;

      // Simple code execution (in production, use sandboxed environment)
      let result;
      try {
        result = eval(session.code);
      } catch (error) {
        result = { error: error.message };
      }

      session.isExecuting = false;

      // Broadcast result
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('code:result', { sessionId, result });
      }

      console.log('[CollaborationTools] Code executed:', sessionId);
      return result;
    } catch (error) {
      console.error('[CollaborationTools] Code execution failed:', error);
      return { error: error.message };
    }
  }

  // ============================================
  // 3D COLLABORATION
  // ============================================

  function create3DSpace(spaceId, options = {}) {
    try {
      if (!CONFIG.enable3DCollaboration) {
        return null;
      }

      const space = {
        id: spaceId || '3d_' + Date.now(),
        name: options.name || '3D Collaboration Space',
        type: options.type || 'whiteboard', // whiteboard, model_viewer, spatial_audio
        createdBy: options.createdBy || CU?.id,
        createdAt: Date.now(),
        objects: [],
        participants: new Set(),
        camera: { position: { x: 0, y: 0, z: 5 }, rotation: { x: 0, y: 0, z: 0 } },
        environment: options.environment || 'default'
      };

      state.threeDSpaces.set(space.id, space);

      console.log('[CollaborationTools] 3D space created:', space.id);
      return space;
    } catch (error) {
      console.error('[CollaborationTools] 3D space creation failed:', error);
      return null;
    }
  }

  function add3DObject(spaceId, object) {
    try {
      const space = state.threeDSpaces.get(spaceId);
      if (!space) return false;

      const object3D = {
        id: 'obj_' + Date.now(),
        type: object.type || 'cube',
        position: object.position || { x: 0, y: 0, z: 0 },
        rotation: object.rotation || { x: 0, y: 0, z: 0 },
        scale: object.scale || { x: 1, y: 1, z: 1 },
        color: object.color || '#4a9eff',
        createdBy: CU?.id,
        createdAt: Date.now()
      };

      space.objects.push(object3D);

      // Broadcast to participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('3d:object-added', { spaceId, object: object3D });
      }

      console.log('[CollaborationTools] 3D object added:', object3D.id);
      return true;
    } catch (error) {
      console.error('[CollaborationTools] Add 3D object failed:', error);
      return false;
    }
  }

  function update3DObject(spaceId, objectId, updates) {
    try {
      const space = state.threeDSpaces.get(spaceId);
      if (!space) return false;

      const object = space.objects.find(o => o.id === objectId);
      if (!object) return false;

      Object.assign(object, updates);

      // Broadcast to participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('3d:object-updated', { spaceId, objectId, updates });
      }

      return true;
    } catch (error) {
      console.error('[CollaborationTools] Update 3D object failed:', error);
      return false;
    }
  }

  // ============================================
  // VR/AR SPACES
  // ============================================

  function createVRSession(sessionId, options = {}) {
    try {
      if (!CONFIG.enableVRSpaces) {
        return null;
      }

      const session = {
        id: sessionId || 'vr_' + Date.now(),
        name: options.name || 'VR Meeting Room',
        type: options.type || 'meeting', // meeting, social, workspace
        environment: options.environment || 'conference_room',
        createdBy: options.createdBy || CU?.id,
        createdAt: Date.now(),
        participants: new Set(),
        avatars: new Map(),
        spatialAudio: true,
        handTracking: options.handTracking || false,
        eyeTracking: options.eyeTracking || false
      };

      state.vrSessions.set(session.id, session);

      console.log('[CollaborationTools] VR session created:', session.id);
      return session;
    } catch (error) {
      console.error('[CollaborationTools] VR session creation failed:', error);
      return null;
    }
  }

  function joinVRSession(sessionId, userId, avatarData = {}) {
    try {
      const session = state.vrSessions.get(sessionId);
      if (!session) return false;

      session.participants.add(userId);

      const avatar = {
        userId: userId,
        position: avatarData.position || { x: 0, y: 0, z: 0 },
        rotation: avatarData.rotation || { x: 0, y: 0, z: 0 },
        appearance: avatarData.appearance || 'default',
        joinedAt: Date.now()
      };

      session.avatars.set(userId, avatar);

      // Broadcast to participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('vr:user-joined', { sessionId, userId, avatar });
      }

      console.log('[CollaborationTools] User joined VR session:', userId);
      return true;
    } catch (error) {
      console.error('[CollaborationTools] Join VR session failed:', error);
      return false;
    }
  }

  function updateVRAvatar(sessionId, userId, updates) {
    try {
      const session = state.vrSessions.get(sessionId);
      if (!session) return false;

      const avatar = session.avatars.get(userId);
      if (!avatar) return false;

      Object.assign(avatar, updates);

      // Broadcast to participants
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('vr:avatar-updated', { sessionId, userId, updates });
      }

      return true;
    } catch (error) {
      console.error('[CollaborationTools] Update VR avatar failed:', error);
      return false;
    }
  }

  // ============================================
  // AI MEETING SUMMARIES
  // ============================================

  async function generateMeetingSummary(sessionId, participants, duration) {
    try {
      if (!CONFIG.enableAIMeetingSummaries) {
        return null;
      }

      // In production, this would use AI to analyze meeting transcripts
      // For now, generate a structured summary
      const summary = {
        sessionId: sessionId,
        generatedAt: Date.now(),
        participants: Array.from(participants),
        duration: duration,
        topics: [],
        actionItems: [],
        decisions: [],
        nextSteps: []
      };

      // Use AI if available
      if (typeof AIMessaging !== 'undefined') {
        const aiSummary = await AIMessaging.summarizeConversation(sessionId);
        if (aiSummary) {
          summary.topics = aiSummary.keyPoints || [];
          summary.actionItems = aiSummary.keyPoints?.filter(p => p.includes('action')) || [];
        }
      }

      state.meetingSummaries.set(sessionId, summary);

      console.log('[CollaborationTools] Meeting summary generated:', sessionId);
      return summary;
    } catch (error) {
      console.error('[CollaborationTools] Meeting summary generation failed:', error);
      return null;
    }
  }

  async function startMeetingRecording(sessionId) {
    try {
      // In production, start recording meeting
      console.log('[CollaborationTools] Meeting recording started:', sessionId);
      return true;
    } catch (error) {
      console.error('[CollaborationTools] Start meeting recording failed:', error);
      return false;
    }
  }

  async function stopMeetingRecording(sessionId) {
    try {
      // In production, stop recording and generate summary
      const recording = {
        sessionId: sessionId,
        stoppedAt: Date.now(),
        duration: Date.now() - (state.meetingSummaries.get(sessionId)?.startTime || Date.now())
      };

      // Generate summary automatically
      await generateMeetingSummary(sessionId, new Set(), recording.duration);

      console.log('[CollaborationTools] Meeting recording stopped:', sessionId);
      return recording;
    } catch (error) {
      console.error('[CollaborationTools] Stop meeting recording failed:', error);
      return null;
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function initialize(config = {}) {
    if (config.enableCodeSharing !== undefined) {
      CONFIG.enableCodeSharing = config.enableCodeSharing;
    }
    if (config.enableDocCollaboration !== undefined) {
      CONFIG.enableDocCollaboration = config.enableDocCollaboration;
    }
    if (config.enable3DCollaboration !== undefined) {
      CONFIG.enable3DCollaboration = config.enable3DCollaboration;
    }
    if (config.enableVRSpaces !== undefined) {
      CONFIG.enableVRSpaces = config.enableVRSpaces;
    }
    if (config.enableAIMeetingSummaries !== undefined) {
      CONFIG.enableAIMeetingSummaries = config.enableAIMeetingSummaries;
    }

    console.log('[CollaborationTools] Initialized');
    console.log('[CollaborationTools] 3D Collaboration:', CONFIG.enable3DCollaboration);
    console.log('[CollaborationTools] VR Spaces:', CONFIG.enableVRSpaces);
    console.log('[CollaborationTools] AI Meeting Summaries:', CONFIG.enableAIMeetingSummaries);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    initialize,
    createWhiteboard,
    openWhiteboard,
    addStroke,
    addShape,
    addText,
    clearWhiteboard,
    undoStroke,
    exportWhiteboard,
    closeWhiteboard,
    setTool,
    setColor,
    createDocument,
    updateDocument,
    addComment,
    getDocumentVersion,
    createCodeSession,
    updateCode,
    executeCode,
    // Enhanced features
    create3DSpace,
    add3DObject,
    update3DObject,
    createVRSession,
    joinVRSession,
    updateVRAvatar,
    generateMeetingSummary,
    startMeetingRecording,
    stopMeetingRecording,
    getState: () => state
  };
})();

// Auto-initialize
CollaborationTools.initialize();

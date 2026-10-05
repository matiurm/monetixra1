/**
 * Advanced Video Processing for Monetixra
 * Features: HLS/DASH Transcoding, LiveKit SFU, Video Compression, Thumbnail Generation
 */

const VideoProcessing = (function () {
  'use strict';

  // Configuration
  const _env = (typeof process !== 'undefined' && process.env) ? process.env : {};
  const CONFIG = {
    LIVEKIT_URL: _env.LIVEKIT_URL || 'wss://monetixra-livekit.livekit.cloud',
    LIVEKIT_API_KEY: _env.LIVEKIT_API_KEY || '',
    LIVEKIT_API_SECRET: _env.LIVEKIT_API_SECRET || '',
    TRANSCODE_QUALITIES: ['240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'],
    DEFAULT_QUALITY: '720p',
    THUMBNAIL_COUNT: 5,
    THUMBNAIL_INTERVAL: 10 // seconds
  };

  // State
  let processingState = {
    isProcessing: false,
    currentJob: null,
    progress: 0,
    liveKitRoom: null,
    liveKitToken: null
  };

  function requireNodeModule(name) {
    if (typeof require !== 'undefined') {
      try { return require(name); } catch(e) { return null; }
    }
    return null;
  }

  // ── HLS/DASH Transcoding ──────────────────────────────────────────────────

  /**
   * Transcode video to HLS format with adaptive bitrate
   * @param {string} inputPath - Input video file path
   * @param {string} outputPath - Output directory path
   * @param {object} options - Transcoding options
   */
  async function transcodeToHLS(inputPath, outputPath, options = {}) {
    try {
      if (typeof window !== 'undefined') {
        throw new Error('Video transcoding is a server-side feature');
      }
      const ffmpeg = requireNodeModule('fluent-ffmpeg');
      const path = requireNodeModule('path');
      const fsModule = requireNodeModule('fs');
      const fs = fsModule ? fsModule.promises : null;
      if (!ffmpeg || !path || !fs) throw new Error('Required server modules not available');

      processingState.isProcessing = true;
      processingState.progress = 0;

      // Create output directory
      await fs.mkdir(outputPath, { recursive: true });

      const qualities = options.qualities || CONFIG.TRANSCODE_QUALITIES;
      const resolutions = {
        '240p': { width: 426, height: 240, bitrate: '400k' },
        '360p': { width: 640, height: 360, bitrate: '800k' },
        '480p': { width: 854, height: 480, bitrate: '1200k' },
        '720p': { width: 1280, height: 720, bitrate: '2500k' },
        '1080p': { width: 1920, height: 1080, bitrate: '5000k' },
        '1440p': { width: 2560, height: 1440, bitrate: '9000k' },
        '2160p': { width: 3840, height: 2160, bitrate: '18000k' }
      };

      // Generate HLS playlist with multiple bitrates
      const command = ffmpeg(inputPath);

      // Add video encodings for each quality
      qualities.forEach((quality, index) => {
        const res = resolutions[quality];
        if (res) {
          command
            .outputOptions([
              `-filter:v:scale_${index}=scale=${res.width}:${res.height}`,
              `-b:v:${index}=${res.bitrate}`,
              `-maxrate:v:${index}=${parseInt(res.bitrate) * 1.2}`,
              `-bufsize:v:${index}=${parseInt(res.bitrate) * 2}`,
              `-map 0:v -c:v:${index} libx264 -profile:v:${index} main -preset medium`
            ]);
        }
      });

      // Add audio encoding
      command
        .outputOptions([
          '-map 0:a -c:a aac -b:a 128k -ac 2',
          '-f hls',
          '-hls_time 6',
          '-hls_list_size 0',
          '-hls_segment_filename path.join(outputPath, 'segment_%03d.ts')',
          '-master_pl_name master.m3u8'
        ])
        .output(path.join(outputPath, 'master.m3u8'));

      // Progress tracking
      command.on('progress', (progress) => {
        processingState.progress = Math.round(progress.percent || 0);
        console.log(`[Transcode] Progress: ${processingState.progress}%`);
      });

      command.on('end', () => {
        console.log('[Transcode] HLS transcoding completed');
        processingState.isProcessing = false;
        processingState.progress = 100;
      });

      command.on('error', (err) => {
        console.error('[Transcode] Error:', err);
        processingState.isProcessing = false;
        throw err;
      });

      await new Promise((resolve, reject) => {
        command.run((err, stdout, stderr) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });

      return {
        success: true,
        outputPath: outputPath,
        masterPlaylist: path.join(outputPath, 'master.m3u8'),
        qualities: qualities
      };
    } catch (error) {
      console.error('[Transcode] HLS transcoding failed:', error);
      processingState.isProcessing = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Transcode video to DASH format
   * @param {string} inputPath - Input video file path
   * @param {string} outputPath - Output directory path
   * @param {object} options - Transcoding options
   */
  async function transcodeToDASH(inputPath, outputPath, options = {}) {
    try {
      if (typeof window !== 'undefined') {
        throw new Error('Video transcoding is a server-side feature');
      }
      const ffmpeg = requireNodeModule('fluent-ffmpeg');
      const path = requireNodeModule('path');
      const fsModule = requireNodeModule('fs');
      const fs = fsModule ? fsModule.promises : null;
      if (!ffmpeg || !path || !fs) throw new Error('Required server modules not available');

      processingState.isProcessing = true;
      processingState.progress = 0;

      await fs.mkdir(outputPath, { recursive: true });

      const qualities = options.qualities || CONFIG.TRANSCODE_QUALITIES;
      const resolutions = {
        '240p': { width: 426, height: 240, bitrate: '400k' },
        '360p': { width: 640, height: 360, bitrate: '800k' },
        '480p': { width: 854, height: 480, bitrate: '1200k' },
        '720p': { width: 1280, height: 720, bitrate: '2500k' },
        '1080p': { width: 1920, height: 1080, bitrate: '5000k' }
      };

      const command = ffmpeg(inputPath);

      // Add video encodings
      qualities.forEach((quality, index) => {
        const res = resolutions[quality];
        if (res) {
          command
            .outputOptions([
              `-filter:v:scale_${index}=scale=${res.width}:${res.height}`,
              `-b:v:${index}=${res.bitrate}`,
              `-map 0:v -c:v:${index} libx264 -profile:v:${index} main`
            ]);
        }
      });

      // DASH specific options
      command
        .outputOptions([
          '-map 0:a -c:a aac -b:a 128k',
          '-f dash',
          '-seg_duration 6',
          '-init_seg_name init-$RepresentationID$.m4s',
          '-media_seg_name segment-$RepresentationID$-$Number$.m4s',
          '-use_template 1',
          '-use_timeline 1'
        ])
        .output(path.join(outputPath, 'stream.mpd'));

      command.on('progress', (progress) => {
        processingState.progress = Math.round(progress.percent || 0);
      });

      command.on('end', () => {
        console.log('[Transcode] DASH transcoding completed');
        processingState.isProcessing = false;
        processingState.progress = 100;
      });

      command.on('error', (err) => {
        console.error('[Transcode] Error:', err);
        processingState.isProcessing = false;
        throw err;
      });

      await new Promise((resolve, reject) => {
        command.run((err, stdout, stderr) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });

      return {
        success: true,
        outputPath: outputPath,
        manifest: path.join(outputPath, 'stream.mpd'),
        qualities: qualities
      };
    } catch (error) {
      console.error('[Transcode] DASH transcoding failed:', error);
      processingState.isProcessing = false;
      return { success: false, error: error.message };
    }
  }

  // ── Video Compression ──────────────────────────────────────────────────────

  /**
   * Compress video with specified settings
   * @param {string} inputPath - Input video file path
   * @param {string} outputPath - Output video file path
   * @param {object} options - Compression options
   */
  async function compressVideo(inputPath, outputPath, options = {}) {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      const path = require('path');

      processingState.isProcessing = true;
      processingState.progress = 0;

      const settings = {
        codec: options.codec || 'libx264',
        crf: options.crf || 23, // Quality (lower = better, 18-28 is good range)
        preset: options.preset || 'medium', // Encoding speed (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)
        bitrate: options.bitrate || '1000k',
        audioBitrate: options.audioBitrate || '128k',
        resolution: options.resolution || null
      };

      const command = ffmpeg(inputPath);

      // Video codec and quality
      command
        .videoCodec(settings.codec)
        .videoBitrate(settings.bitrate)
        .outputOptions([
          `-crf ${settings.crf}`,
          `-preset ${settings.preset}`,
          '-movflags +faststart' // Fast start for web playback
        ]);

      // Resolution scaling if specified
      if (settings.resolution) {
        command.size(settings.resolution);
      }

      // Audio codec
      command
        .audioCodec('aac')
        .audioBitrate(settings.audioBitrate)
        .audioChannels(2);

      // Progress tracking
      command.on('progress', (progress) => {
        processingState.progress = Math.round(progress.percent || 0);
        console.log(`[Compression] Progress: ${processingState.progress}%`);
      });

      command.on('end', () => {
        console.log('[Compression] Video compression completed');
        processingState.isProcessing = false;
        processingState.progress = 100;
      });

      command.on('error', (err) => {
        console.error('[Compression] Error:', err);
        processingState.isProcessing = false;
        throw err;
      });

      await new Promise((resolve, reject) => {
        command.save(outputPath).run((err, stdout, stderr) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });

      // Get file sizes
      const fs = require('fs');
      const inputSize = fs.statSync(inputPath).size;
      const outputSize = fs.statSync(outputPath).size;
      const compressionRatio = ((1 - outputSize / inputSize) * 100).toFixed(2);

      return {
        success: true,
        outputPath: outputPath,
        inputSize: inputSize,
        outputSize: outputSize,
        compressionRatio: compressionRatio + '%'
      };
    } catch (error) {
      console.error('[Compression] Video compression failed:', error);
      processingState.isProcessing = false;
      return { success: false, error: error.message };
    }
  }

  // ── Thumbnail Generation ───────────────────────────────────────────────────

  /**
   * Generate thumbnails from video
   * @param {string} inputPath - Input video file path
   * @param {string} outputDir - Output directory for thumbnails
   * @param {object} options - Thumbnail options
   */
  async function generateThumbnails(inputPath, outputDir, options = {}) {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      const path = require('path');
      const fs = require('fs').promises;

      processingState.isProcessing = true;
      processingState.progress = 0;

      await fs.mkdir(outputDir, { recursive: true });

      const count = options.count || CONFIG.THUMBNAIL_COUNT;
      const interval = options.interval || CONFIG.THUMBNAIL_INTERVAL;
      const width = options.width || 320;
      const height = options.height || 180;

      const command = ffmpeg(inputPath);

      // Generate thumbnails at regular intervals
      for (let i = 0; i < count; i++) {
        const timestamp = i * interval;
        const outputFile = path.join(outputDir, `thumb_${i}.jpg`);
        
        command
          .screenshots({
            count: 1,
            folder: outputDir,
            filename: `thumb_${i}.jpg`,
            size: `${width}x${height}`,
            timemarks: [`${timestamp}%`]
          });
      }

      command.on('end', () => {
        console.log('[Thumbnails] Thumbnail generation completed');
        processingState.isProcessing = false;
        processingState.progress = 100;
      });

      command.on('error', (err) => {
        console.error('[Thumbnails] Error:', err);
        processingState.isProcessing = false;
        throw err;
      });

      await new Promise((resolve, reject) => {
        command.run((err, stdout, stderr) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });

      // Get generated thumbnails
      const files = await fs.readdir(outputDir);
      const thumbnails = files
        .filter(f => f.startsWith('thumb_') && f.endsWith('.jpg'))
        .map(f => path.join(outputDir, f));

      return {
        success: true,
        thumbnails: thumbnails,
        count: thumbnails.length
      };
    } catch (error) {
      console.error('[Thumbnails] Thumbnail generation failed:', error);
      processingState.isProcessing = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate single thumbnail at specific timestamp
   * @param {string} inputPath - Input video file path
   * @param {string} outputPath - Output thumbnail path
   * @param {number} timestamp - Timestamp in seconds
   * @param {object} options - Thumbnail options
   */
  async function generateSingleThumbnail(inputPath, outputPath, timestamp, options = {}) {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      const path = require('path');

      const width = options.width || 1280;
      const height = options.height || 720;
      const quality = options.quality || 2; // 1-31, lower is better

      const command = ffmpeg(inputPath);

      command
        .screenshots({
          count: 1,
          folder: path.dirname(outputPath),
          filename: path.basename(outputPath),
          size: `${width}x${height}`,
          timemarks: [timestamp]
        })
        .outputOptions([`-q:v ${quality}`]);

      await new Promise((resolve, reject) => {
        command.run((err, stdout, stderr) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });

      return {
        success: true,
        outputPath: outputPath
      };
    } catch (error) {
      console.error('[Thumbnails] Single thumbnail generation failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ── LiveKit SFU Integration ────────────────────────────────────────────────

  /**
   * Create LiveKit room
   * @param {string} roomName - Room name
   * @param {object} options - Room options
   */
  async function createLiveKitRoom(roomName, options = {}) {
    try {
      const { RoomServiceClient } = require('livekit-server-sdk');
      
      const client = new RoomServiceClient(
        CONFIG.LIVEKIT_URL.replace('wss://', 'https://'),
        CONFIG.LIVEKIT_API_KEY,
        CONFIG.LIVEKIT_API_SECRET
      );

      const roomOptions = {
        name: roomName,
        emptyTimeout: options.emptyTimeout || 300, // 5 minutes
        maxParticipants: options.maxParticipants || 100,
        metadata: JSON.stringify(options.metadata || {})
      };

      const room = await client.createRoom(roomOptions);
      console.log('[LiveKit] Room created:', room);

      return {
        success: true,
        room: room,
        roomName: roomName
      };
    } catch (error) {
      console.error('[LiveKit] Room creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate LiveKit access token
   * @param {string} roomName - Room name
   * @param {string} participantName - Participant name
   * @param {object} options - Token options
   */
  async function generateLiveKitToken(roomName, participantName, options = {}) {
    try {
      const { AccessToken } = require('livekit-server-sdk');

      const token = new AccessToken(
        CONFIG.LIVEKIT_API_KEY,
        CONFIG.LIVEKIT_API_SECRET,
        {
          identity: participantName,
          name: participantName
        }
      );

      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: options.canPublish !== false,
        canSubscribe: options.canSubscribe !== false,
        canPublishData: options.canPublishData !== false
      });

      const jwt = token.toJwt();
      console.log('[LiveKit] Token generated for:', participantName);

      return {
        success: true,
        token: jwt,
        roomName: roomName,
        participantName: participantName
      };
    } catch (error) {
      console.error('[LiveKit] Token generation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Join LiveKit room (client-side)
   * @param {string} roomName - Room name
   * @param {string} token - Access token
   * @param {object} options - Connection options
   */
  async function joinLiveKitRoom(roomName, token, options = {}) {
    try {
      const { Room } = require('livekit-client');

      const room = new Room({
        adaptiveStream: options.adaptiveStream !== false,
        dynacast: options.dynacast !== false,
        videoCaptureDefaults: {
          resolution: options.resolution || { width: 1280, height: 720 },
          frameRate: options.frameRate || 30
        }
      });

      // Connect to room
      await room.connect(CONFIG.LIVEKIT_URL, token);
      console.log('[LiveKit] Connected to room:', roomName);

      processingState.liveKitRoom = room;
      processingState.liveKitToken = token;

      // Set up event listeners
      room.on('trackSubscribed', (track, publication, participant) => {
        console.log('[LiveKit] Track subscribed:', track.kind);
        if (options.onTrackSubscribed) {
          options.onTrackSubscribed(track, publication, participant);
        }
      });

      room.on('trackUnsubscribed', (track, publication, participant) => {
        console.log('[LiveKit] Track unsubscribed:', track.kind);
        if (options.onTrackUnsubscribed) {
          options.onTrackUnsubscribed(track, publication, participant);
        }
      });

      room.on('participantConnected', (participant) => {
        console.log('[LiveKit] Participant connected:', participant.identity);
        if (options.onParticipantConnected) {
          options.onParticipantConnected(participant);
        }
      });

      room.on('participantDisconnected', (participant) => {
        console.log('[LiveKit] Participant disconnected:', participant.identity);
        if (options.onParticipantDisconnected) {
          options.onParticipantDisconnected(participant);
        }
      });

      return {
        success: true,
        room: room,
        localParticipant: room.localParticipant
      };
    } catch (error) {
      console.error('[LiveKit] Room join failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leave LiveKit room
   */
  async function leaveLiveKitRoom() {
    try {
      if (processingState.liveKitRoom) {
        await processingState.liveKitRoom.disconnect();
        processingState.liveKitRoom = null;
        processingState.liveKitToken = null;
        console.log('[LiveKit] Disconnected from room');
      }

      return { success: true };
    } catch (error) {
      console.error('[LiveKit] Room leave failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start live stream to LiveKit
   * @param {MediaStream} stream - Media stream to publish
   * @param {object} options - Stream options
   */
  async function startLiveStream(stream, options = {}) {
    try {
      if (!processingState.liveKitRoom) {
        throw new Error('Not connected to LiveKit room');
      }

      const room = processingState.liveKitRoom;

      // Publish video track
      if (stream.getVideoTracks().length > 0) {
        const videoTrack = stream.getVideoTracks()[0];
        await room.localParticipant.publishTrack(videoTrack, {
          name: options.videoName || 'video',
          simulcast: options.simulcast !== false
        });
        console.log('[LiveKit] Video track published');
      }

      // Publish audio track
      if (stream.getAudioTracks().length > 0) {
        const audioTrack = stream.getAudioTracks()[0];
        await room.localParticipant.publishTrack(audioTrack, {
          name: options.audioName || 'audio'
        });
        console.log('[LiveKit] Audio track published');
      }

      return {
        success: true,
        streaming: true
      };
    } catch (error) {
      console.error('[LiveKit] Stream start failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ── Video Information ───────────────────────────────────────────────────────

  /**
   * Get video metadata
   * @param {string} inputPath - Input video file path
   */
  async function getVideoInfo(inputPath) {
    try {
      const ffmpeg = require('fluent-ffmpeg');

      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
          if (err) {
            reject(err);
          } else {
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

            resolve({
              success: true,
              duration: metadata.format.duration,
              size: metadata.format.size,
              bitrate: metadata.format.bit_rate,
              video: videoStream ? {
                codec: videoStream.codec_name,
                width: videoStream.width,
                height: videoStream.height,
                fps: eval(videoStream.r_frame_rate),
                pixelFormat: videoStream.pix_fmt
              } : null,
              audio: audioStream ? {
                codec: audioStream.codec_name,
                sampleRate: audioStream.sample_rate,
                channels: audioStream.channels,
                bitrate: audioStream.bit_rate
              } : null
            });
          }
        });
      });
    } catch (error) {
      console.error('[VideoInfo] Get video info failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Transcoding
    transcodeToHLS: transcodeToHLS,
    transcodeToDASH: transcodeToDASH,
    
    // Compression
    compressVideo: compressVideo,
    
    // Thumbnails
    generateThumbnails: generateThumbnails,
    generateSingleThumbnail: generateSingleThumbnail,
    
    // LiveKit
    createLiveKitRoom: createLiveKitRoom,
    generateLiveKitToken: generateLiveKitToken,
    joinLiveKitRoom: joinLiveKitRoom,
    leaveLiveKitRoom: leaveLiveKitRoom,
    startLiveStream: startLiveStream,
    
    // Video Info
    getVideoInfo: getVideoInfo,
    
    // State
    getState: () => ({ ...processingState }),
    isProcessing: () => processingState.isProcessing,
    getProgress: () => processingState.progress,
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoProcessing;
}

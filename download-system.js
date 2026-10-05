// ============================================================
//  Monetixra - Multi-Resolution Video/Audio Download System
//  Supports: 240p, 360p, 480p, 640p, 720p, 1080p, 2K
// ============================================================

const MonetixraDownloadSystem = (function () {
  // Download quality presets
  const QUALITY_PRESETS = {
    '240p': { width: 426, height: 240, bitrate: 300, label: '240p (Low)' },
    '360p': { width: 640, height: 360, bitrate: 500, label: '360p (Mobile)' },
    '480p': { width: 854, height: 480, bitrate: 800, label: '480p (SD)' },
    '640p': { width: 854, height: 480, bitrate: 1000, label: '640p (SD+)' },
    '720p': { width: 1280, height: 720, bitrate: 2500, label: '720p (HD)' },
    '1080p': { width: 1920, height: 1080, bitrate: 5000, label: '1080p (Full HD)' },
    '2k': { width: 2560, height: 1440, bitrate: 8000, label: '2K (QHD)' }
  };

  // Audio quality presets
  const AUDIO_QUALITY_PRESETS = {
    'low': { bitrate: 64, label: '64 kbps (Low)' },
    'medium': { bitrate: 128, label: '128 kbps (Medium)' },
    'high': { bitrate: 192, label: '192 kbps (High)' },
    'ultra': { bitrate: 320, label: '320 kbps (Ultra)' }
  };

  // Current user preferences
  let currentVideoQuality = '720p';
  let currentAudioQuality = 'high';

  // Initialize download system
  function init() {
    loadUserPreferences();
    setupDownloadButtons();
    console.log('[DownloadSystem] Initialized with multi-resolution support');
  }

  // Load user preferences from localStorage
  function loadUserPreferences() {
    try {
      const savedVideoQuality = localStorage.getItem('monetixra_video_quality');
      const savedAudioQuality = localStorage.getItem('monetixra_audio_quality');

      if (savedVideoQuality && QUALITY_PRESETS[savedVideoQuality]) {
        currentVideoQuality = savedVideoQuality;
      }

      if (savedAudioQuality && AUDIO_QUALITY_PRESETS[savedAudioQuality]) {
        currentAudioQuality = savedAudioQuality;
      }

      console.log('[DownloadSystem] Loaded preferences:', {
        video: currentVideoQuality,
        audio: currentAudioQuality
      });
    } catch (error) {
      console.warn('[DownloadSystem] Failed to load preferences:', error);
    }
  }

  // Save user preferences
  function saveUserPreferences() {
    try {
      localStorage.setItem('monetixra_video_quality', currentVideoQuality);
      localStorage.setItem('monetixra_audio_quality', currentAudioQuality);
    } catch (error) {
      console.warn('[DownloadSystem] Failed to save preferences:', error);
    }
  }

  // Setup download buttons on posts
  function setupDownloadButtons() {
    // Add download buttons to existing posts
    document.querySelectorAll('.post-media video, .post-media audio').forEach(media => {
      addDownloadButton(media);
    });

    // Observe for new posts
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const videos = node.querySelectorAll?.('.post-media video') || [];
            const audios = node.querySelectorAll?.('.post-media audio') || [];

            [...videos, ...audios].forEach(media => {
              addDownloadButton(media);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Add download button to media element
  function addDownloadButton(media) {
    if (media.dataset.downloadAdded) return;

    const isVideo = media.tagName === 'VIDEO';
    const quality = isVideo ? currentVideoQuality : currentAudioQuality;
    const presets = isVideo ? QUALITY_PRESETS : AUDIO_QUALITY_PRESETS;

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'media-download-btn';
    downloadBtn.innerHTML = '⬇️ Download';
    downloadBtn.style.cssText = `
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s;
    `;

    downloadBtn.onmouseenter = () => {
      downloadBtn.style.background = 'rgba(0, 255, 170, 0.8)';
    };

    downloadBtn.onmouseleave = () => {
      downloadBtn.style.background = 'rgba(0, 0, 0, 0.7)';
    };

    downloadBtn.onclick = () => {
      showQualitySelector(media, isVideo);
    };

    // Add button to parent container
    const container = media.closest('.post-media') || media.parentElement;
    if (container) {
      container.style.position = 'relative';
      container.appendChild(downloadBtn);
      media.dataset.downloadAdded = 'true';
    }
  }

  // Show quality selector popup
  function showQualitySelector(media, isVideo) {
    const presets = isVideo ? QUALITY_PRESETS : AUDIO_QUALITY_PRESETS;
    const currentQuality = isVideo ? currentVideoQuality : currentAudioQuality;

    // Remove existing selector
    const existingSelector = document.querySelector('.quality-selector-popup');
    if (existingSelector) {
      existingSelector.remove();
    }

    // Create quality selector
    const selector = document.createElement('div');
    selector.className = 'quality-selector-popup';
    selector.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--g2);
      border: 1px solid var(--b1);
      border-radius: 16px;
      padding: 20px;
      z-index: 10000;
      min-width: 300px;
      max-width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    `;

    let extraOptions = '';
    if (isVideo) {
      extraOptions = `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--b1);">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px; color: var(--t2);">
            🎵 Audio Options
          </div>
          <button 
            id="extractAudioBtn"
            style="
              width: 100%;
              padding: 12px 16px;
              border: 1px solid var(--c1);
              border-radius: 8px;
              background: rgba(74, 158, 255, 0.1);
              color: var(--t1);
              cursor: pointer;
              font-size: 13px;
              font-weight: 600;
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 8px;
              transition: all 0.2s;
            "
          >
            <span>🎵 Extract Audio Only</span>
          </button>
        </div>
      `;
    }

    selector.innerHTML = `
      <div style="font-size: 16px; font-weight: 700; margin-bottom: 15px; color: var(--t1);">
        ${isVideo ? '🎬 Video Quality' : '🎵 Audio Quality'}
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${Object.entries(presets).map(([key, preset]) => `
          <button 
            class="quality-option ${key === currentQuality ? 'selected' : ''}"
            data-quality="${key}"
            style="
              padding: 12px 16px;
              border: 1px solid ${key === currentQuality ? 'var(--neon)' : 'var(--b1)'};
              border-radius: 8px;
              background: ${key === currentQuality ? 'rgba(0, 255, 170, 0.1)' : 'var(--g1)'};
              color: var(--t1);
              cursor: pointer;
              font-size: 13px;
              font-weight: 600;
              display: flex;
              justify-content: space-between;
              align-items: center;
              transition: all 0.2s;
            "
          >
            <span>${preset.label}</span>
            ${key === currentQuality ? '<span style="color: var(--neon);">✓</span>' : ''}
          </button>
        `).join('')}
      </div>
      ${extraOptions}
      <div style="margin-top: 15px; display: flex; gap: 10px;">
        <button id="cancelQuality" style="
          flex: 1;
          padding: 10px;
          border: 1px solid var(--b1);
          border-radius: 8px;
          background: var(--g1);
          color: var(--t1);
          cursor: pointer;
          font-weight: 600;
        ">Cancel</button>
        <button id="downloadWithQuality" style="
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          background: var(--neon);
          color: var(--dark);
          cursor: pointer;
          font-weight: 700;
        ">Download</button>
      </div>
    `;

    document.body.appendChild(selector);

    // Handle quality selection
    let selectedQuality = currentQuality;

    selector.querySelectorAll('.quality-option').forEach(option => {
      option.onclick = () => {
        selector.querySelectorAll('.quality-option').forEach(opt => {
          opt.classList.remove('selected');
          opt.style.borderColor = 'var(--b1)';
          opt.style.background = 'var(--g1)';
          opt.querySelector('span:last-child')?.remove();
        });

        option.classList.add('selected');
        option.style.borderColor = 'var(--neon)';
        option.style.background = 'rgba(0, 255, 170, 0.1)';
        option.innerHTML += '<span style="color: var(--neon);">✓</span>';

        selectedQuality = option.dataset.quality;
      };
    });

    // Extract audio button (for videos)
    const extractAudioBtn = document.getElementById('extractAudioBtn');
    if (extractAudioBtn) {
      extractAudioBtn.onclick = () => {
        selector.remove();
        showAudioQualitySelector(media);
      };
    }

    // Cancel button
    document.getElementById('cancelQuality').onclick = () => {
      selector.remove();
    };

    // Download button
    document.getElementById('downloadWithQuality').onclick = () => {
      downloadMedia(media, selectedQuality, isVideo);
      selector.remove();
    };

    // Close on outside click
    selector.onclick = (e) => {
      if (e.target === selector) {
        selector.remove();
      }
    };
  }

  // Show audio quality selector for extraction
  function showAudioQualitySelector(media) {
    const currentQuality = currentAudioQuality;

    // Remove existing selector
    const existingSelector = document.querySelector('.quality-selector-popup');
    if (existingSelector) {
      existingSelector.remove();
    }

    // Create audio quality selector
    const selector = document.createElement('div');
    selector.className = 'quality-selector-popup';
    selector.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--g2);
      border: 1px solid var(--b1);
      border-radius: 16px;
      padding: 20px;
      z-index: 10000;
      min-width: 300px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    `;

    selector.innerHTML = `
      <div style="font-size: 16px; font-weight: 700; margin-bottom: 15px; color: var(--t1);">
        🎵 Extract Audio Quality
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${Object.entries(AUDIO_QUALITY_PRESETS).map(([key, preset]) => `
          <button 
            class="quality-option ${key === currentQuality ? 'selected' : ''}"
            data-quality="${key}"
            style="
              padding: 12px 16px;
              border: 1px solid ${key === currentQuality ? 'var(--neon)' : 'var(--b1)'};
              border-radius: 8px;
              background: ${key === currentQuality ? 'rgba(0, 255, 170, 0.1)' : 'var(--g1)'};
              color: var(--t1);
              cursor: pointer;
              font-size: 13px;
              font-weight: 600;
              display: flex;
              justify-content: space-between;
              align-items: center;
              transition: all 0.2s;
            "
          >
            <span>${preset.label}</span>
            ${key === currentQuality ? '<span style="color: var(--neon);">✓</span>' : ''}
          </button>
        `).join('')}
      </div>
      <div style="margin-top: 15px; display: flex; gap: 10px;">
        <button id="cancelAudioExtract" style="
          flex: 1;
          padding: 10px;
          border: 1px solid var(--b1);
          border-radius: 8px;
          background: var(--g1);
          color: var(--t1);
          cursor: pointer;
          font-weight: 600;
        ">Cancel</button>
        <button id="extractWithQuality" style="
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          background: var(--c1);
          color: var(--dark);
          cursor: pointer;
          font-weight: 700;
        ">Extract</button>
      </div>
    `;

    document.body.appendChild(selector);

    // Handle quality selection
    let selectedQuality = currentQuality;

    selector.querySelectorAll('.quality-option').forEach(option => {
      option.onclick = () => {
        selector.querySelectorAll('.quality-option').forEach(opt => {
          opt.classList.remove('selected');
          opt.style.borderColor = 'var(--b1)';
          opt.style.background = 'var(--g1)';
          opt.querySelector('span:last-child')?.remove();
        });

        option.classList.add('selected');
        option.style.borderColor = 'var(--neon)';
        option.style.background = 'rgba(0, 255, 170, 0.1)';
        option.innerHTML += '<span style="color: var(--neon);">✓</span>';

        selectedQuality = option.dataset.quality;
      };
    });

    // Cancel button
    document.getElementById('cancelAudioExtract').onclick = () => {
      selector.remove();
    };

    // Extract button
    document.getElementById('extractWithQuality').onclick = () => {
      extractAudioFromVideo(media, selectedQuality);
      selector.remove();
    };

    // Close on outside click
    selector.onclick = (e) => {
      if (e.target === selector) {
        selector.remove();
      }
    };
  }

  // Extract audio from video
  async function extractAudioFromVideo(media, quality) {
    try {
      const mediaUrl = media.src || media.currentSrc;
      if (!mediaUrl) {
        alert('No media source found');
        return;
      }

      // Update current audio quality preference
      currentAudioQuality = quality;
      saveUserPreferences();

      // Track download start time
      const downloadStartTime = Date.now();
      const downloadId = 'audio_extract_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

      console.log('[DownloadSystem] Audio extraction started:', {
        id: downloadId,
        quality: quality,
        startTime: new Date(downloadStartTime).toISOString()
      });

      // Show loading indicator with time tracking
      const loadingToast = showLoadingToastWithTime(`Extracting audio in ${AUDIO_QUALITY_PRESETS[quality].label}...`, downloadId);

      // Request audio extraction from server
      const response = await fetch('/api/video/extract-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoUrl: mediaUrl,
          quality: quality
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Audio extraction failed');
      }

      // Download the extracted audio
      const fullDownloadUrl = data.downloadUrl.startsWith('http') ? data.downloadUrl : `${window.location.origin}${data.downloadUrl}`;
      const downloadResponse = await fetch(fullDownloadUrl);
      const blob = await downloadResponse.blob();

      // Track download end time
      const downloadEndTime = Date.now();
      const downloadDuration = downloadEndTime - downloadStartTime;

      console.log('[DownloadSystem] Audio extraction completed:', {
        id: downloadId,
        endTime: new Date(downloadEndTime).toISOString(),
        duration: downloadDuration + 'ms',
        durationSeconds: (downloadDuration / 1000).toFixed(2) + 's'
      });

      // Calculate income from download
      const incomePerDownload = 0.02; // $0.02 for audio extraction

      // Add points and income to user
      if (typeof CU !== 'undefined' && CU) {
        const pointsEarned = 2; // 2 points for audio extraction

        CU.points = (CU.points || 0) + pointsEarned;
        CU.money = (CU.money || 0) + incomePerDownload;
        CU.totalDownloads = (CU.totalDownloads || 0) + 1;
        CU.downloadHistory = CU.downloadHistory || [];

        CU.downloadHistory.push({
          id: downloadId,
          type: 'audio_extraction',
          quality: quality,
          startTime: downloadStartTime,
          endTime: downloadEndTime,
          duration: downloadDuration,
          income: incomePerDownload,
          points: pointsEarned,
          timestamp: new Date().toISOString()
        });

        // Save data
        if (typeof saveData === 'function') {
          saveData();
        }

        // Sync to server
        try {
          fetch('/api/downloads/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: CU.id,
              downloadId: downloadId,
              type: 'audio_extraction',
              quality: quality,
              startTime: downloadStartTime,
              endTime: downloadEndTime,
              duration: downloadDuration,
              income: incomePerDownload,
              points: pointsEarned
            })
          }).catch(err => console.warn('[DownloadSystem] Failed to sync download to server:', err));
        } catch (err) {
          console.warn('[DownloadSystem] Server sync error:', err);
        }

        console.log('[DownloadSystem] Income earned:', {
          userId: CU.id,
          income: incomePerDownload,
          points: pointsEarned,
          totalDownloads: CU.totalDownloads
        });
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `monetixra_audio_${quality}_${timestamp}.mp3`;

      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      // Remove loading toast
      loadingToast.remove();

      // Show success message with income info
      const durationText = (downloadDuration / 1000).toFixed(2) + 's';
      showToast(`✅ Audio extracted in ${AUDIO_QUALITY_PRESETS[quality].label} (${durationText}) | +$${incomePerDownload.toFixed(2)}`);

    } catch (error) {
      console.error('[DownloadSystem] Audio extraction failed:', error);

      // Remove loading toast if exists
      const existingToast = document.querySelector('.loading-toast');
      if (existingToast) existingToast.remove();

      alert(`Audio extraction failed: ${error.message}. Please try again.`);
    }
  }

  // Download media with selected quality
  async function downloadMedia(media, quality, isVideo) {
    try {
      const mediaUrl = media.src || media.currentSrc;
      if (!mediaUrl) {
        alert('No media source found');
        return;
      }

      // Update current quality preference
      if (isVideo) {
        currentVideoQuality = quality;
      } else {
        currentAudioQuality = quality;
      }
      saveUserPreferences();

      // Track download start time
      const downloadStartTime = Date.now();
      const downloadId = 'dl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

      console.log('[DownloadSystem] Download started:', {
        id: downloadId,
        quality: quality,
        type: isVideo ? 'video' : 'audio',
        startTime: new Date(downloadStartTime).toISOString()
      });

      // Show loading indicator with time tracking
      const loadingToast = showLoadingToastWithTime(isVideo ? `Transcoding video to ${quality}...` : `Transcoding audio to ${quality}...`, downloadId);

      let downloadUrl;

      if (isVideo) {
        // Request video transcoding from server
        const response = await fetch('/api/video/transcode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            videoUrl: mediaUrl,
            quality: quality
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Transcoding failed');
        }

        downloadUrl = data.downloadUrl;
      } else {
        // Request audio transcoding from server
        const response = await fetch('/api/audio/transcode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            audioUrl: mediaUrl,
            quality: quality
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Transcoding failed');
        }

        downloadUrl = data.downloadUrl;
      }

      // Download the transcoded file
      const fullDownloadUrl = downloadUrl.startsWith('http') ? downloadUrl : `${window.location.origin}${downloadUrl}`;
      const downloadResponse = await fetch(fullDownloadUrl);
      const blob = await downloadResponse.blob();

      // Track download end time
      const downloadEndTime = Date.now();
      const downloadDuration = downloadEndTime - downloadStartTime;

      console.log('[DownloadSystem] Download completed:', {
        id: downloadId,
        endTime: new Date(downloadEndTime).toISOString(),
        duration: downloadDuration + 'ms',
        durationSeconds: (downloadDuration / 1000).toFixed(2) + 's'
      });

      // Calculate income from download
      const incomePerDownload = isVideo ? 0.05 : 0.02; // $0.05 for video, $0.02 for audio
      const downloadIncome = incomePerDownload;

      // Add points and income to user
      if (typeof CU !== 'undefined' && CU) {
        const pointsEarned = isVideo ? 5 : 2; // 5 points for video, 2 for audio

        CU.points = (CU.points || 0) + pointsEarned;
        CU.money = (CU.money || 0) + downloadIncome;
        CU.totalDownloads = (CU.totalDownloads || 0) + 1;
        CU.downloadHistory = CU.downloadHistory || [];

        CU.downloadHistory.push({
          id: downloadId,
          type: isVideo ? 'video' : 'audio',
          quality: quality,
          startTime: downloadStartTime,
          endTime: downloadEndTime,
          duration: downloadDuration,
          income: downloadIncome,
          points: pointsEarned,
          timestamp: new Date().toISOString()
        });

        // Save data
        if (typeof saveData === 'function') {
          saveData();
        }

        // Sync to server
        try {
          fetch('/api/downloads/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: CU.id,
              downloadId: downloadId,
              type: isVideo ? 'video' : 'audio',
              quality: quality,
              startTime: downloadStartTime,
              endTime: downloadEndTime,
              duration: downloadDuration,
              income: downloadIncome,
              points: pointsEarned
            })
          }).catch(err => console.warn('[DownloadSystem] Failed to sync download to server:', err));
        } catch (err) {
          console.warn('[DownloadSystem] Server sync error:', err);
        }

        console.log('[DownloadSystem] Income earned:', {
          userId: CU.id,
          income: downloadIncome,
          points: pointsEarned,
          totalDownloads: CU.totalDownloads
        });
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const extension = isVideo ? 'mp4' : 'mp3';
      const qualityLabel = isVideo ? quality : quality;
      a.download = `monetixra_${qualityLabel}_${timestamp}.${extension}`;

      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      // Remove loading toast
      loadingToast.remove();

      // Show success message with income info
      const durationText = (downloadDuration / 1000).toFixed(2) + 's';
      showToast(`✅ Downloaded in ${isVideo ? QUALITY_PRESETS[quality].label : AUDIO_QUALITY_PRESETS[quality].label} (${durationText}) | +$${downloadIncome.toFixed(2)}`);

    } catch (error) {
      console.error('[DownloadSystem] Download failed:', error);

      // Remove loading toast if exists
      const existingToast = document.querySelector('.loading-toast');
      if (existingToast) existingToast.remove();

      alert(`Download failed: ${error.message}. Please try again.`);
    }
  }

  // Show loading toast with time tracking
  function showLoadingToastWithTime(message, downloadId) {
    const toast = document.createElement('div');
    toast.className = 'loading-toast';
    toast.dataset.downloadId = downloadId;
    toast.dataset.startTime = Date.now();

    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--g2);
      border: 1px solid var(--neon);
      border-radius: 20px;
      padding: 12px 24px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 600;
      color: var(--t1);
      box-shadow: 0 4px 20px rgba(0, 255, 170, 0.3);
    `;

    toast.innerHTML = `
      <div style="width: 20px; height: 20px; border: 2px solid var(--neon); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span class="loading-message">${message}</span>
      <span class="loading-time" style="color: var(--neon); font-size: 12px;">0.0s</span>
    `;

    document.body.appendChild(toast);

    // Update time every 100ms
    const timeInterval = setInterval(() => {
      const startTime = parseInt(toast.dataset.startTime);
      const elapsed = (Date.now() - startTime) / 1000;
      const timeSpan = toast.querySelector('.loading-time');
      if (timeSpan) {
        timeSpan.textContent = elapsed.toFixed(1) + 's';
      }
    }, 100);

    toast.dataset.timeInterval = timeInterval;

    // Override remove to clear interval
    const originalRemove = toast.remove;
    toast.remove = function () {
      if (toast.dataset.timeInterval) {
        clearInterval(parseInt(toast.dataset.timeInterval));
      }
      originalRemove.call(toast);
    };

    return toast;
  }

  // Show toast message
  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--g2);
      border: 1px solid var(--neon);
      border-radius: 20px;
      padding: 12px 24px;
      z-index: 10000;
      font-size: 14px;
      font-weight: 600;
      color: var(--t1);
      box-shadow: 0 4px 20px rgba(0, 255, 170, 0.3);
      animation: slideUp 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Show loading toast
  function showLoadingToast(message) {
    const toast = document.createElement('div');
    toast.className = 'loading-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--g2);
      border: 1px solid var(--neon);
      border-radius: 20px;
      padding: 12px 20px;
      color: var(--t1);
      font-size: 14px;
      font-weight: 600;
      z-index: 10001;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    toast.innerHTML = `<span class="loading-spinner">⏳</span> ${message}`;
    document.body.appendChild(toast);
    return toast;
  }

  // Show success toast
  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 255, 170, 0.9);
      border-radius: 20px;
      padding: 12px 20px;
      color: var(--dark);
      font-size: 14px;
      font-weight: 700;
      z-index: 10001;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Cycle through download qualities (for settings)
  function cycleDlQuality() {
    const qualities = Object.keys(QUALITY_PRESETS);
    const currentIndex = qualities.indexOf(currentVideoQuality);
    const nextIndex = (currentIndex + 1) % qualities.length;
    currentVideoQuality = qualities[nextIndex];

    saveUserPreferences();

    // Update UI
    const label = document.getElementById('dlQualityLabel');
    if (label) {
      label.textContent = QUALITY_PRESETS[currentVideoQuality].label;
    }

    showToast(`Download quality: ${QUALITY_PRESETS[currentVideoQuality].label}`);
  }

  // Get current video quality
  function getCurrentVideoQuality() {
    return currentVideoQuality;
  }

  // Get current audio quality
  function getCurrentAudioQuality() {
    return currentAudioQuality;
  }

  // Set video quality
  function setVideoQuality(quality) {
    if (QUALITY_PRESETS[quality]) {
      currentVideoQuality = quality;
      saveUserPreferences();
    }
  }

  // Set audio quality
  function setAudioQuality(quality) {
    if (AUDIO_QUALITY_PRESETS[quality]) {
      currentAudioQuality = quality;
      saveUserPreferences();
    }
  }

  // Public API
  return {
    init,
    cycleDlQuality,
    getCurrentVideoQuality,
    getCurrentAudioQuality,
    setVideoQuality,
    setAudioQuality,
    showQualitySelector,
    downloadMedia,
    QUALITY_PRESETS,
    AUDIO_QUALITY_PRESETS
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    MonetixraDownloadSystem.init();
  });
} else {
  MonetixraDownloadSystem.init();
}

// Make globally available
window.MonetixraDownloadSystem = MonetixraDownloadSystem;

console.log('[DownloadSystem] Multi-resolution download system loaded');
/**
 * Video Chapters and Timestamps System for Monetixra
 * YouTube-style video chapters
 */

const VideoChapters = (function() {
  'use strict';

  // Storage
  let videoChapters = new Map();
  let videoTimestamps = new Map();

  /**
   * Add chapter to video
   * @param {string} videoId - Video ID
   * @param {Object} chapterData - Chapter data
   * @returns {Object} Created chapter
   */
  function addChapter(videoId, chapterData) {
    const chapters = videoChapters.get(videoId) || [];
    const chapterId = generateId();

    const chapter = {
      id: chapterId,
      videoId,
      title: chapterData.title || 'Chapter',
      startTime: chapterData.startTime || 0,
      endTime: chapterData.endTime || null,
      thumbnail: chapterData.thumbnail || '',
      description: chapterData.description || '',
      createdAt: Date.now()
    };

    chapters.push(chapter);
    chapters.sort((a, b) => a.startTime - b.startTime);
    videoChapters.set(videoId, chapters);

    return chapter;
  }

  /**
   * Get chapters for video
   * @param {string} videoId - Video ID
   * @returns {Array} Chapters
   */
  function getChapters(videoId) {
    return videoChapters.get(videoId) || [];
  }

  /**
   * Get chapter at timestamp
   * @param {string} videoId - Video ID
   * @param {number} timestamp - Timestamp in seconds
   * @returns {Object} Chapter
   */
  function getChapterAtTimestamp(videoId, timestamp) {
    const chapters = videoChapters.get(videoId) || [];
    return chapters.find(ch => timestamp >= ch.startTime && (!ch.endTime || timestamp <= ch.endTime)) || null;
  }

  /**
   * Update chapter
   * @param {string} videoId - Video ID
   * @param {string} chapterId - Chapter ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated chapter
   */
  function updateChapter(videoId, chapterId, updates) {
    const chapters = videoChapters.get(videoId) || [];
    const chapter = chapters.find(ch => ch.id === chapterId);

    if (chapter) {
      Object.assign(chapter, updates);
      chapters.sort((a, b) => a.startTime - b.startTime);
      videoChapters.set(videoId, chapters);
      return chapter;
    }

    return null;
  }

  /**
   * Delete chapter
   * @param {string} videoId - Video ID
   * @param {string} chapterId - Chapter ID
   * @returns {Object} Result
   */
  function deleteChapter(videoId, chapterId) {
    const chapters = videoChapters.get(videoId) || [];
    const index = chapters.findIndex(ch => ch.id === chapterId);

    if (index > -1) {
      chapters.splice(index, 1);
      videoChapters.set(videoId, chapters);
      return { success: true, message: 'Chapter deleted' };
    }

    return { success: false, message: 'Chapter not found' };
  }

  /**
   * Add timestamp to video
   * @param {string} videoId - Video ID
   * @param {number} timestamp - Timestamp in seconds
   * @param {string} note - Optional note
   * @returns {Object} Created timestamp
   */
  function addTimestamp(videoId, timestamp, note = '') {
    const timestamps = videoTimestamps.get(videoId) || [];
    const timestampId = generateId();

    const ts = {
      id: timestampId,
      videoId,
      timestamp,
      note,
      createdAt: Date.now()
    };

    timestamps.push(ts);
    timestamps.sort((a, b) => a.timestamp - b.timestamp);
    videoTimestamps.set(videoId, timestamps);

    return ts;
  }

  /**
   * Get timestamps for video
   * @param {string} videoId - Video ID
   * @returns {Array} Timestamps
   */
  function getTimestamps(videoId) {
    return videoTimestamps.get(videoId) || [];
  }

  /**
   * Delete timestamp
   * @param {string} videoId - Video ID
   * @param {string} timestampId - Timestamp ID
   * @returns {Object} Result
   */
  function deleteTimestamp(videoId, timestampId) {
    const timestamps = videoTimestamps.get(videoId) || [];
    const index = timestamps.findIndex(ts => ts.id === timestampId);

    if (index > -1) {
      timestamps.splice(index, 1);
      videoTimestamps.set(videoId, timestamps);
      return { success: true, message: 'Timestamp deleted' };
    }

    return { success: false, message: 'Timestamp not found' };
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize
  function initialize() {
    console.log('[VideoChapters] Module initialized');
  }

  initialize();

  return {
    addChapter,
    getChapters,
    getChapterAtTimestamp,
    updateChapter,
    deleteChapter,
    addTimestamp,
    getTimestamps,
    deleteTimestamp
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoChapters;
}

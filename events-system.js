/**
 * Events System for Monetixra
 * Similar to Facebook Events
 */

const EventsSystem = (function() {
  'use strict';

  // Storage
  let events = new Map();
  let eventAttendees = new Map();
  let eventInterests = new Map();
  let userEvents = new Map();
  let eventPosts = new Map();

  // Event types
  const EVENT_TYPES = {
    ONLINE: 'online',
    IN_PERSON: 'in_person',
    HYBRID: 'hybrid'
  };

  // Event categories
  const EVENT_CATEGORIES = {
    MUSIC: 'music',
    SPORTS: 'sports',
    BUSINESS: 'business',
    EDUCATION: 'education',
    ENTERTAINMENT: 'entertainment',
    SOCIAL: 'social',
    TECHNOLOGY: 'technology',
    ARTS: 'arts',
    FOOD: 'food',
    OTHER: 'other'
  };

  // Attendance status
  const ATTENDANCE_STATUS = {
    GOING: 'going',
    INTERESTED: 'interested',
    MAYBE: 'maybe',
    NOT_GOING: 'not_going'
  };

  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @returns {Object} Created event
   */
  function createEvent(eventData) {
    const eventId = generateId();

    const event = {
      id: eventId,
      title: eventData.title,
      description: eventData.description || '',
      type: eventData.type || EVENT_TYPES.IN_PERSON,
      category: eventData.category || EVENT_CATEGORIES.SOCIAL,
      coverImage: eventData.coverImage || '',
      location: eventData.location || null,
      onlineLink: eventData.onlineLink || '',
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      timezone: eventData.timezone || 'UTC',
      isAllDay: eventData.isAllDay || false,
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName || '',
      createdAt: Date.now(),
      attendeeCount: 0,
      interestedCount: 0,
      capacity: eventData.capacity || null,
      isPublic: eventData.isPublic !== false,
      isFree: eventData.isFree !== false,
      price: eventData.price || 0,
      currency: eventData.currency || 'USD',
      tags: eventData.tags || [],
      settings: {
        allowGuests: eventData.allowGuests !== false,
        requireApproval: eventData.requireApproval || false,
        showAttendees: eventData.showAttendees !== false
      }
    };

    events.set(eventId, event);

    // Add organizer as attendee
    addEventAttendee(eventId, eventData.organizerId, ATTENDANCE_STATUS.GOING);

    return event;
  }

  /**
   * Add attendee to event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {string} status - Attendance status
   */
  function addEventAttendee(eventId, userId, status = ATTENDANCE_STATUS.INTERESTED) {
    const attendees = eventAttendees.get(eventId) || [];
    const existingAttendee = attendees.find(a => a.userId === userId);

    if (!existingAttendee) {
      attendees.push({
        userId,
        status,
        joinedAt: Date.now()
      });
      eventAttendees.set(eventId, attendees);

      // Update event counts
      updateEventCounts(eventId);

      // Track user's events
      const userEventList = userEvents.get(userId) || [];
      if (!userEventList.includes(eventId)) {
        userEventList.push(eventId);
        userEvents.set(userId, userEventList);
      }
    } else {
      // Update status if already attendee
      existingAttendee.status = status;
      eventAttendees.set(eventId, attendees);
      updateEventCounts(eventId);
    }
  }

  /**
   * Update event counts based on attendee status
   * @param {string} eventId - Event ID
   */
  function updateEventCounts(eventId) {
    const attendees = eventAttendees.get(eventId) || [];
    const event = events.get(eventId);

    if (event) {
      event.attendeeCount = attendees.filter(a => a.status === ATTENDANCE_STATUS.GOING).length;
      event.interestedCount = attendees.filter(a => a.status === ATTENDANCE_STATUS.INTERESTED).length;
      events.set(eventId, event);
    }
  }

  /**
   * Remove attendee from event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   */
  function removeEventAttendee(eventId, userId) {
    const attendees = eventAttendees.get(eventId) || [];
    const index = attendees.findIndex(a => a.userId === userId);

    if (index > -1) {
      attendees.splice(index, 1);
      eventAttendees.set(eventId, attendees);

      // Update event counts
      updateEventCounts(eventId);

      // Remove from user's events
      const userEventList = userEvents.get(userId) || [];
      const eventIndex = userEventList.indexOf(eventId);
      if (eventIndex > -1) {
        userEventList.splice(eventIndex, 1);
        userEvents.set(userId, userEventList);
      }
    }
  }

  /**
   * Update attendance status
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {string} status - New status
   */
  function updateAttendanceStatus(eventId, userId, status) {
    const attendees = eventAttendees.get(eventId) || [];
    const attendee = attendees.find(a => a.userId === userId);

    if (attendee) {
      attendee.status = status;
      eventAttendees.set(eventId, attendees);
      updateEventCounts(eventId);
    }
  }

  /**
   * Get event by ID
   * @param {string} eventId - Event ID
   * @returns {Object} Event
   */
  function getEvent(eventId) {
    return events.get(eventId);
  }

  /**
   * Get event attendees
   * @param {string} eventId - Event ID
   * @param {string} status - Filter by status (optional)
   * @returns {Array} Attendees
   */
  function getEventAttendees(eventId, status = null) {
    const attendees = eventAttendees.get(eventId) || [];

    if (status) {
      return attendees.filter(a => a.status === status);
    }

    return attendees;
  }

  /**
   * Get user's events
   * @param {string} userId - User ID
   * @param {string} status - Filter by status (optional)
   * @returns {Array} Events
   */
  function getUserEvents(userId, status = null) {
    const eventIds = userEvents.get(userId) || [];
    const userEventsList = eventIds.map(id => events.get(id)).filter(Boolean);

    if (status) {
      return userEventsList.filter(event => {
        const attendees = eventAttendees.get(event.id) || [];
        const attendee = attendees.find(a => a.userId === userId);
        return attendee && attendee.status === status;
      });
    }

    return userEventsList;
  }

  /**
   * Search events
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Array} Events
   */
  function searchEvents(query, filters = {}) {
    const allEvents = Array.from(events.values());

    return allEvents.filter(event => {
      // Title match
      if (query && !event.title.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filters.type && event.type !== filters.type) {
        return false;
      }

      // Category filter
      if (filters.category && event.category !== filters.category) {
        return false;
      }

      // Date range filter
      if (filters.startDate && new Date(event.startDate) < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate && new Date(event.endDate) > new Date(filters.endDate)) {
        return false;
      }

      // Location filter
      if (filters.location && event.location !== filters.location) {
        return false;
      }

      // Free only filter
      if (filters.freeOnly && !event.isFree) {
        return false;
      }

      // Public only filter
      if (filters.publicOnly && !event.isPublic) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get upcoming events
   * @param {number} limit - Number of events to return
   * @returns {Array} Upcoming events
   */
  function getUpcomingEvents(limit = 10) {
    const now = Date.now();
    const allEvents = Array.from(events.values());

    return allEvents
      .filter(event => new Date(event.startDate) > now)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, limit);
  }

  /**
   * Get past events
   * @param {number} limit - Number of events to return
   * @returns {Array} Past events
   */
  function getPastEvents(limit = 10) {
    const now = Date.now();
    const allEvents = Array.from(events.values());

    return allEvents
      .filter(event => new Date(event.endDate) < now)
      .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
      .slice(0, limit);
  }

  /**
   * Get trending events
   * @param {number} limit - Number of events to return
   * @returns {Array} Trending events
   */
  function getTrendingEvents(limit = 10) {
    const allEvents = Array.from(events.values());

    return allEvents
      .sort((a, b) => {
        const aScore = a.attendeeCount + (a.interestedCount * 0.5);
        const bScore = b.attendeeCount + (b.interestedCount * 0.5);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Update event
   * @param {string} eventId - Event ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated event
   */
  function updateEvent(eventId, updates) {
    const event = events.get(eventId);
    if (!event) return null;

    const updatedEvent = { ...event, ...updates };
    events.set(eventId, updatedEvent);
    return updatedEvent;
  }

  /**
   * Delete event
   * @param {string} eventId - Event ID
   */
  function deleteEvent(eventId) {
    events.delete(eventId);
    eventAttendees.delete(eventId);
    eventInterests.delete(eventId);
    eventPosts.delete(eventId);
  }

  /**
   * Create post in event
   * @param {string} eventId - Event ID
   * @param {Object} postData - Post data
   * @returns {Object} Created post
   */
  function createEventPost(eventId, postData) {
    const postId = generateId();
    const post = {
      id: postId,
      eventId,
      ...postData,
      createdAt: Date.now()
    };

    const posts = eventPosts.get(eventId) || [];
    posts.push(post);
    eventPosts.set(eventId, posts);

    return post;
  }

  /**
   * Get event posts
   * @param {string} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Array} Posts
   */
  function getEventPosts(eventId, options = {}) {
    const posts = eventPosts.get(eventId) || [];
    const { limit = 20, offset = 0 } = options;

    return posts
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);
  }

  /**
   * Check if event is full
   * @param {string} eventId - Event ID
   * @returns {boolean} Is full
   */
  function isEventFull(eventId) {
    const event = events.get(eventId);
    if (!event || !event.capacity) return false;

    return event.attendeeCount >= event.capacity;
  }

  /**
   * Get event calendar (monthly view)
   * @param {number} year - Year
   * @param {number} month - Month (0-11)
   * @returns {Array} Events in month
   */
  function getEventCalendar(year, month) {
    const allEvents = Array.from(events.values());

    return allEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
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
    console.log('[EventsSystem] Initialized');
  }

  initialize();

  return {
    EVENT_TYPES,
    EVENT_CATEGORIES,
    ATTENDANCE_STATUS,
    createEvent,
    addEventAttendee,
    removeEventAttendee,
    updateAttendanceStatus,
    getEvent,
    getEventAttendees,
    getUserEvents,
    searchEvents,
    getUpcomingEvents,
    getPastEvents,
    getTrendingEvents,
    updateEvent,
    deleteEvent,
    createEventPost,
    getEventPosts,
    isEventFull,
    getEventCalendar
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventsSystem;
}

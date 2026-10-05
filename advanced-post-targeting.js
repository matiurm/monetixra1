/**
 * Advanced Post Targeting System for Monetixra
 * Implements granular post visibility controls
 * Similar to Facebook/Instagram privacy settings
 */

const AdvancedPostTargeting = (function() {
  'use strict';

  // Targeting types
  const TARGETING_TYPES = {
    PUBLIC: 'public',
    FRIENDS: 'friends',
    FRIENDS_EXCEPT: 'friends_except',
    SPECIFIC_FRIENDS: 'specific_friends',
    GROUP: 'group',
    LOCATION: 'location',
    AGE_RANGE: 'age_range',
    GENDER: 'gender',
    INTERESTS: 'interests',
    CUSTOM: 'custom'
  };

  // Storage for targeting rules
  let postTargetingRules = new Map();
  let userPrivacySettings = new Map();
  let groupMembers = new Map();
  let userLocation = new Map();
  let userInterests = new Map();

  /**
   * Create post targeting rule
   * @param {string} postId - Post ID
   * @param {Object} targeting - Targeting configuration
   * @returns {Object} Created targeting rule
   */
  function createTargetingRule(postId, targeting) {
    const rule = {
      postId,
      type: targeting.type || TARGETING_TYPES.PUBLIC,
      audience: targeting.audience || [],
      except: targeting.except || [],
      location: targeting.location || null,
      ageRange: targeting.ageRange || null,
      gender: targeting.gender || null,
      interests: targeting.interests || [],
      groups: targeting.groups || [],
      createdAt: Date.now()
    };

    postTargetingRules.set(postId, rule);
    return rule;
  }

  /**
   * Check if user can view post
   * @param {string} userId - User ID
   * @param {string} postId - Post ID
   * @param {Object} user - User object
   * @returns {boolean} Can view post
   */
  function canViewPost(userId, postId, user = {}) {
    const rule = postTargetingRules.get(postId);

    // If no rule, post is public
    if (!rule) return true;

    // Public posts are visible to everyone
    if (rule.type === TARGETING_TYPES.PUBLIC) return true;

    // Check each targeting type
    switch (rule.type) {
      case TARGETING_TYPES.FRIENDS:
        return checkFriends(userId, rule.audience);

      case TARGETING_TYPES.FRIENDS_EXCEPT:
        return checkFriendsExcept(userId, rule.audience, rule.except);

      case TARGETING_TYPES.SPECIFIC_FRIENDS:
        return checkSpecificFriends(userId, rule.audience);

      case TARGETING_TYPES.GROUP:
        return checkGroupMembership(userId, rule.groups);

      case TARGETING_TYPES.LOCATION:
        return checkLocation(userId, rule.location);

      case TARGETING_TYPES.AGE_RANGE:
        return checkAgeRange(user, rule.ageRange);

      case TARGETING_TYPES.GENDER:
        return checkGender(user, rule.gender);

      case TARGETING_TYPES.INTERESTS:
        return checkInterests(userId, rule.interests);

      case TARGETING_TYPES.CUSTOM:
        return checkCustomTargeting(userId, user, rule);

      default:
        return true;
    }
  }

  /**
   * Check if user is in friends list
   * @param {string} userId - User ID
   * @param {Array} audience - Audience list
   * @returns {boolean} Is friend
   */
  function checkFriends(userId, audience) {
    return audience.includes(userId);
  }

  /**
   * Check if user is in friends list but not in except list
   * @param {string} userId - User ID
   * @param {Array} audience - Audience list
   * @param {Array} except - Except list
   * @returns {boolean} Can view
   */
  function checkFriendsExcept(userId, audience, except) {
    return audience.includes(userId) && !except.includes(userId);
  }

  /**
   * Check if user is in specific friends list
   * @param {string} userId - User ID
   * @param {Array} audience - Specific friends list
   * @returns {boolean} Is in list
   */
  function checkSpecificFriends(userId, audience) {
    return audience.includes(userId);
  }

  /**
   * Check if user is member of group
   * @param {string} userId - User ID
   * @param {Array} groups - Group IDs
   * @returns {boolean} Is group member
   */
  function checkGroupMembership(userId, groups) {
    for (const groupId of groups) {
      const members = groupMembers.get(groupId) || [];
      if (members.includes(userId)) return true;
    }
    return false;
  }

  /**
   * Check if user matches location targeting
   * @param {string} userId - User ID
   * @param {Object} location - Location criteria
   * @returns {boolean} Matches location
   */
  function checkLocation(userId, location) {
    const userLoc = userLocation.get(userId);

    if (!userLoc || !location) return false;

    // Check country
    if (location.country && userLoc.country !== location.country) {
      return false;
    }

    // Check city
    if (location.city && userLoc.city !== location.city) {
      return false;
    }

    // Check radius (if coordinates provided)
    if (location.lat && location.lng && userLoc.lat && userLoc.lng) {
      const distance = calculateDistance(
        location.lat, location.lng,
        userLoc.lat, userLoc.lng
      );
      return distance <= (location.radius || 10); // Default 10km
    }

    return true;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param {number} lat1 - Latitude 1
   * @param {number} lng1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lng2 - Longitude 2
   * @returns {number} Distance in km
   */
  function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Check if user matches age range
   * @param {Object} user - User object
   * @param {Object} ageRange - Age range {min, max}
   * @returns {boolean} Matches age range
   */
  function checkAgeRange(user, ageRange) {
    if (!user.age || !ageRange) return true;

    const age = user.age;
    const min = ageRange.min || 0;
    const max = ageRange.max || 120;

    return age >= min && age <= max;
  }

  /**
   * Check if user matches gender targeting
   * @param {Object} user - User object
   * @param {string} gender - Target gender
   * @returns {boolean} Matches gender
   */
  function checkGender(user, gender) {
    if (!user.gender || !gender) return true;
    return user.gender === gender;
  }

  /**
   * Check if user has required interests
   * @param {string} userId - User ID
   * @param {Array} interests - Required interests
   * @returns {boolean} Has interests
   */
  function checkInterests(userId, interests) {
    if (!interests || interests.length === 0) return true;

    const userInterestsList = userInterests.get(userId) || [];
    const hasInterest = interests.some(interest =>
      userInterestsList.includes(interest)
    );

    return hasInterest;
  }

  /**
   * Check custom targeting criteria
   * @param {string} userId - User ID
   * @param {Object} user - User object
   * @param {Object} rule - Targeting rule
   * @returns {boolean} Matches custom criteria
   */
  function checkCustomTargeting(userId, user, rule) {
    // Implement custom logic based on specific requirements
    // This could include custom fields, business logic, etc.
    return true;
  }

  /**
   * Set user location
   * @param {string} userId - User ID
   * @param {Object} location - Location data
   */
  function setUserLocation(userId, location) {
    userLocation.set(userId, location);
  }

  /**
   * Set user interests
   * @param {string} userId - User ID
   * @param {Array} interests - User interests
   */
  function setUserInterests(userId, interests) {
    userInterests.set(userId, interests);
  }

  /**
   * Add user to group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   */
  function addUserToGroup(groupId, userId) {
    const members = groupMembers.get(groupId) || [];
    if (!members.includes(userId)) {
      members.push(userId);
      groupMembers.set(groupId, members);
    }
  }

  /**
   * Remove user from group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   */
  function removeUserFromGroup(groupId, userId) {
    const members = groupMembers.get(groupId) || [];
    const index = members.indexOf(userId);
    if (index > -1) {
      members.splice(index, 1);
      groupMembers.set(groupId, members);
    }
  }

  /**
   * Get targeting rule for post
   * @param {string} postId - Post ID
   * @returns {Object} Targeting rule
   */
  function getTargetingRule(postId) {
    return postTargetingRules.get(postId);
  }

  /**
   * Update targeting rule
   * @param {string} postId - Post ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated rule
   */
  function updateTargetingRule(postId, updates) {
    const rule = postTargetingRules.get(postId);
    if (!rule) return null;

    const updatedRule = { ...rule, ...updates };
    postTargetingRules.set(postId, updatedRule);
    return updatedRule;
  }

  /**
   * Delete targeting rule
   * @param {string} postId - Post ID
   */
  function deleteTargetingRule(postId) {
    postTargetingRules.delete(postId);
  }

  /**
   * Get all posts visible to user
   * @param {string} userId - User ID
   * @param {Array} postIds - All post IDs
   * @param {Object} user - User object
   * @returns {Array} Visible post IDs
   */
  function getVisiblePosts(userId, postIds, user = {}) {
    return postIds.filter(postId =>
      canViewPost(userId, postId, user)
    );
  }

  /**
   * Set user privacy settings
   * @param {string} userId - User ID
   * @param {Object} settings - Privacy settings
   */
  function setUserPrivacySettings(userId, settings) {
    userPrivacySettings.set(userId, settings);
  }

  /**
   * Get user privacy settings
   * @param {string} userId - User ID
   * @returns {Object} Privacy settings
   */
  function getUserPrivacySettings(userId) {
    return userPrivacySettings.get(userId) || {
      defaultPostVisibility: TARGETING_TYPES.PUBLIC,
      whoCanMessage: 'everyone',
      whoCanSeeFriends: 'everyone',
      whoCanSeeLocation: 'friends'
    };
  }

  /**
   * Get audience preview
   * @param {string} postId - Post ID
   * @param {Array} allUsers - All users
   * @returns {Array} Users who can view post
   */
  function getAudiencePreview(postId, allUsers) {
    const rule = postTargetingRules.get(postId);
    if (!rule) return allUsers;

    return allUsers.filter(user =>
      canViewPost(user.id, postId, user)
    );
  }

  /**
   * Get targeting statistics
   * @param {string} postId - Post ID
   * @param {Array} allUsers - All users
   * @returns {Object} Targeting stats
   */
  function getTargetingStats(postId, allUsers) {
    const audience = getAudiencePreview(postId, allUsers);
    const rule = postTargetingRules.get(postId);

    return {
      totalUsers: allUsers.length,
      reachableUsers: audience.length,
      reachPercentage: (audience.length / allUsers.length) * 100,
      targetingType: rule ? rule.type : TARGETING_TYPES.PUBLIC,
      criteria: rule || {}
    };
  }

  // Initialize
  function initialize() {
    console.log('[AdvancedPostTargeting] Initialized');
  }

  initialize();

  return {
    TARGETING_TYPES,
    createTargetingRule,
    canViewPost,
    setUserLocation,
    setUserInterests,
    addUserToGroup,
    removeUserFromGroup,
    getTargetingRule,
    updateTargetingRule,
    deleteTargetingRule,
    getVisiblePosts,
    setUserPrivacySettings,
    getUserPrivacySettings,
    getAudiencePreview,
    getTargetingStats
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedPostTargeting;
}

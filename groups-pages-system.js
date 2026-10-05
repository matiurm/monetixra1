/**
 * Groups and Pages System for Monetixra
 * Similar to Facebook Groups and Pages
 */

const GroupsPagesSystem = (function() {
  'use strict';

  // Storage
  let groups = new Map();
  let pages = new Map();
  let groupMembers = new Map();
  let pageFollowers = new Map();
  let groupPosts = new Map();
  let pagePosts = new Map();
  let groupInvites = new Map();
  let userGroups = new Map();
  let userPages = new Map();

  // Group types
  const GROUP_TYPES = {
    PUBLIC: 'public',
    PRIVATE: 'private',
    SECRET: 'secret'
  };

  // Page types
  const PAGE_TYPES = {
    BUSINESS: 'business',
    BRAND: 'brand',
    COMMUNITY: 'community',
    ENTERTAINMENT: 'entertainment',
    CREATOR: 'creator'
  };

  // Roles
  const ROLES = {
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    MEMBER: 'member'
  };

  /**
   * Create a new group
   * @param {Object} groupData - Group data
   * @returns {Object} Created group
   */
  function createGroup(groupData) {
    const groupId = generateId();

    const group = {
      id: groupId,
      name: groupData.name,
      description: groupData.description || '',
      type: groupData.type || GROUP_TYPES.PUBLIC,
      coverImage: groupData.coverImage || '',
      profileImage: groupData.profileImage || '',
      category: groupData.category || 'general',
      location: groupData.location || null,
      createdBy: groupData.createdBy,
      createdAt: Date.now(),
      memberCount: 1,
      postCount: 0,
      rules: groupData.rules || [],
      tags: groupData.tags || [],
      settings: {
        allowGuestPosts: groupData.allowGuestPosts || false,
        requireApproval: groupData.requireApproval || false,
        moderatePosts: groupData.moderatePosts || true
      }
    };

    groups.set(groupId, group);

    // Add creator as admin
    addGroupMember(groupId, groupData.createdBy, ROLES.ADMIN);

    // Track user's groups
    const userGroupList = userGroups.get(groupData.createdBy) || [];
    userGroupList.push(groupId);
    userGroups.set(groupData.createdBy, userGroupList);

    return group;
  }

  /**
   * Create a new page
   * @param {Object} pageData - Page data
   * @returns {Object} Created page
   */
  function createPage(pageData) {
    const pageId = generateId();

    const page = {
      id: pageId,
      name: pageData.name,
      username: pageData.username || '',
      description: pageData.description || '',
      type: pageData.type || PAGE_TYPES.BUSINESS,
      coverImage: pageData.coverImage || '',
      profileImage: pageData.profileImage || '',
      category: pageData.category || 'business',
      location: pageData.location || null,
      website: pageData.website || '',
      phone: pageData.phone || '',
      email: pageData.email || '',
      createdBy: pageData.createdBy,
      createdAt: Date.now(),
      followerCount: 1,
      postCount: 0,
      verified: false,
      tags: pageData.tags || [],
      settings: {
        allowMessages: pageData.allowMessages || true,
        showReviews: pageData.showReviews || true,
        allowPosts: pageData.allowPosts || false
      }
    };

    pages.set(pageId, page);

    // Add creator as admin/follower
    addPageFollower(pageId, pageData.createdBy, ROLES.ADMIN);

    // Track user's pages
    const userPageList = userPages.get(pageData.createdBy) || [];
    userPageList.push(pageId);
    userPages.set(pageData.createdBy, userPageList);

    return page;
  }

  /**
   * Add member to group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @param {string} role - User role
   */
  function addGroupMember(groupId, userId, role = ROLES.MEMBER) {
    const members = groupMembers.get(groupId) || [];
    const existingMember = members.find(m => m.userId === userId);

    if (!existingMember) {
      members.push({
        userId,
        role,
        joinedAt: Date.now()
      });
      groupMembers.set(groupId, members);

      // Update group member count
      const group = groups.get(groupId);
      if (group) {
        group.memberCount = members.length;
        groups.set(groupId, group);
      }

      // Track user's groups
      const userGroupList = userGroups.get(userId) || [];
      if (!userGroupList.includes(groupId)) {
        userGroupList.push(groupId);
        userGroups.set(userId, userGroupList);
      }
    }
  }

  /**
   * Add follower to page
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   * @param {string} role - User role
   */
  function addPageFollower(pageId, userId, role = ROLES.MEMBER) {
    const followers = pageFollowers.get(pageId) || [];
    const existingFollower = followers.find(f => f.userId === userId);

    if (!existingFollower) {
      followers.push({
        userId,
        role,
        followedAt: Date.now()
      });
      pageFollowers.set(pageId, followers);

      // Update page follower count
      const page = pages.get(pageId);
      if (page) {
        page.followerCount = followers.length;
        pages.set(pageId, page);
      }

      // Track user's pages
      const userPageList = userPages.get(userId) || [];
      if (!userPageList.includes(pageId)) {
        userPageList.push(pageId);
        userPages.set(userId, userPageList);
      }
    }
  }

  /**
   * Remove member from group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   */
  function removeGroupMember(groupId, userId) {
    const members = groupMembers.get(groupId) || [];
    const index = members.findIndex(m => m.userId === userId);

    if (index > -1) {
      members.splice(index, 1);
      groupMembers.set(groupId, members);

      // Update group member count
      const group = groups.get(groupId);
      if (group) {
        group.memberCount = members.length;
        groups.set(groupId, group);
      }

      // Remove from user's groups
      const userGroupList = userGroups.get(userId) || [];
      const groupIndex = userGroupList.indexOf(groupId);
      if (groupIndex > -1) {
        userGroupList.splice(groupIndex, 1);
        userGroups.set(userId, userGroupList);
      }
    }
  }

  /**
   * Remove follower from page
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   */
  function removePageFollower(pageId, userId) {
    const followers = pageFollowers.get(pageId) || [];
    const index = followers.findIndex(f => f.userId === userId);

    if (index > -1) {
      followers.splice(index, 1);
      pageFollowers.set(pageId, followers);

      // Update page follower count
      const page = pages.get(pageId);
      if (page) {
        page.followerCount = followers.length;
        pages.set(pageId, page);
      }

      // Remove from user's pages
      const userPageList = userPages.get(userId) || [];
      const pageIndex = userPageList.indexOf(pageId);
      if (pageIndex > -1) {
        userPageList.splice(pageIndex, 1);
        userPages.set(userId, userPageList);
      }
    }
  }

  /**
   * Invite user to group
   * @param {string} groupId - Group ID
   * @param {string} inviterId - Inviter user ID
   * @param {string} inviteeId - Invitee user ID
   */
  function inviteToGroup(groupId, inviterId, inviteeId) {
    const invites = groupInvites.get(groupId) || [];
    const existingInvite = invites.find(i => i.inviteeId === inviteeId);

    if (!existingInvite) {
      invites.push({
        inviterId,
        inviteeId,
        status: 'pending',
        createdAt: Date.now()
      });
      groupInvites.set(groupId, invites);
    }
  }

  /**
   * Accept group invite
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   */
  function acceptGroupInvite(groupId, userId) {
    const invites = groupInvites.get(groupId) || [];
    const invite = invites.find(i => i.inviteeId === userId);

    if (invite && invite.status === 'pending') {
      invite.status = 'accepted';
      groupInvites.set(groupId, invites);
      addGroupMember(groupId, userId);
    }
  }

  /**
   * Decline group invite
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   */
  function declineGroupInvite(groupId, userId) {
    const invites = groupInvites.get(groupId) || [];
    const invite = invites.find(i => i.inviteeId === userId);

    if (invite) {
      invite.status = 'declined';
      groupInvites.set(groupId, invites);
    }
  }

  /**
   * Create post in group
   * @param {string} groupId - Group ID
   * @param {Object} postData - Post data
   * @returns {Object} Created post
   */
  function createGroupPost(groupId, postData) {
    const postId = generateId();
    const post = {
      id: postId,
      groupId,
      ...postData,
      createdAt: Date.now()
    };

    const posts = groupPosts.get(groupId) || [];
    posts.push(post);
    groupPosts.set(groupId, posts);

    // Update group post count
    const group = groups.get(groupId);
    if (group) {
      group.postCount = posts.length;
      groups.set(groupId, group);
    }

    return post;
  }

  /**
   * Create post on page
   * @param {string} pageId - Page ID
   * @param {Object} postData - Post data
   * @returns {Object} Created post
   */
  function createPagePost(pageId, postData) {
    const postId = generateId();
    const post = {
      id: postId,
      pageId,
      ...postData,
      createdAt: Date.now()
    };

    const posts = pagePosts.get(pageId) || [];
    posts.push(post);
    pagePosts.set(pageId, posts);

    // Update page post count
    const page = pages.get(pageId);
    if (page) {
      page.postCount = posts.length;
      pages.set(pageId, page);
    }

    return post;
  }

  /**
   * Get group by ID
   * @param {string} groupId - Group ID
   * @returns {Object} Group
   */
  function getGroup(groupId) {
    return groups.get(groupId);
  }

  /**
   * Get page by ID
   * @param {string} pageId - Page ID
   * @returns {Object} Page
   */
  function getPage(pageId) {
    return pages.get(pageId);
  }

  /**
   * Get group members
   * @param {string} groupId - Group ID
   * @returns {Array} Members
   */
  function getGroupMembers(groupId) {
    return groupMembers.get(groupId) || [];
  }

  /**
   * Get page followers
   * @param {string} pageId - Page ID
   * @returns {Array} Followers
   */
  function getPageFollowers(pageId) {
    return pageFollowers.get(pageId) || [];
  }

  /**
   * Get group posts
   * @param {string} groupId - Group ID
   * @param {Object} options - Query options
   * @returns {Array} Posts
   */
  function getGroupPosts(groupId, options = {}) {
    const posts = groupPosts.get(groupId) || [];
    const { limit = 20, offset = 0 } = options;

    return posts
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);
  }

  /**
   * Get page posts
   * @param {string} pageId - Page ID
   * @param {Object} options - Query options
   * @returns {Array} Posts
   */
  function getPagePosts(pageId, options = {}) {
    const posts = pagePosts.get(pageId) || [];
    const { limit = 20, offset = 0 } = options;

    return posts
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);
  }

  /**
   * Get user's groups
   * @param {string} userId - User ID
   * @returns {Array} Groups
   */
  function getUserGroups(userId) {
    const groupIds = userGroups.get(userId) || [];
    return groupIds.map(id => groups.get(id)).filter(Boolean);
  }

  /**
   * Get user's pages
   * @param {string} userId - User ID
   * @returns {Array} Pages
   */
  function getUserPages(userId) {
    const pageIds = userPages.get(userId) || [];
    return pageIds.map(id => pages.get(id)).filter(Boolean);
  }

  /**
   * Search groups
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Array} Groups
   */
  function searchGroups(query, filters = {}) {
    const allGroups = Array.from(groups.values());

    return allGroups.filter(group => {
      // Name match
      if (query && !group.name.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filters.type && group.type !== filters.type) {
        return false;
      }

      // Category filter
      if (filters.category && group.category !== filters.category) {
        return false;
      }

      return true;
    });
  }

  /**
   * Search pages
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Array} Pages
   */
  function searchPages(query, filters = {}) {
    const allPages = Array.from(pages.values());

    return allPages.filter(page => {
      // Name match
      if (query && !page.name.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filters.type && page.type !== filters.type) {
        return false;
      }

      // Category filter
      if (filters.category && page.category !== filters.category) {
        return false;
      }

      return true;
    });
  }

  /**
   * Update group
   * @param {string} groupId - Group ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated group
   */
  function updateGroup(groupId, updates) {
    const group = groups.get(groupId);
    if (!group) return null;

    const updatedGroup = { ...group, ...updates };
    groups.set(groupId, updatedGroup);
    return updatedGroup;
  }

  /**
   * Update page
   * @param {string} pageId - Page ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated page
   */
  function updatePage(pageId, updates) {
    const page = pages.get(pageId);
    if (!page) return null;

    const updatedPage = { ...page, ...updates };
    pages.set(pageId, updatedPage);
    return updatedPage;
  }

  /**
   * Delete group
   * @param {string} groupId - Group ID
   */
  function deleteGroup(groupId) {
    groups.delete(groupId);
    groupMembers.delete(groupId);
    groupPosts.delete(groupId);
    groupInvites.delete(groupId);
  }

  /**
   * Delete page
   * @param {string} pageId - Page ID
   */
  function deletePage(pageId) {
    pages.delete(pageId);
    pageFollowers.delete(pageId);
    pagePosts.delete(pageId);
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
    console.log('[GroupsPagesSystem] Initialized');
  }

  initialize();

  return {
    GROUP_TYPES,
    PAGE_TYPES,
    ROLES,
    createGroup,
    createPage,
    addGroupMember,
    addPageFollower,
    removeGroupMember,
    removePageFollower,
    inviteToGroup,
    acceptGroupInvite,
    declineGroupInvite,
    createGroupPost,
    createPagePost,
    getGroup,
    getPage,
    getGroupMembers,
    getPageFollowers,
    getGroupPosts,
    getPagePosts,
    getUserGroups,
    getUserPages,
    searchGroups,
    searchPages,
    updateGroup,
    updatePage,
    deleteGroup,
    deletePage
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GroupsPagesSystem;
}

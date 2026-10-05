/**
 * Saved Posts Collection for Monetixra
 * Similar to Facebook/Instagram saved posts feature
 */

const SavedPostsCollection = (function() {
  'use strict';

  // Storage
  let savedPosts = new Map();
  let collections = new Map();
  let userCollections = new Map();

  /**
   * Save post
   * @param {string} userId - User ID
   * @param {string} postId - Post ID
   * @param {string} collectionId - Collection ID (optional)
   * @returns {Object} Save result
   */
  function savePost(userId, postId, collectionId = null) {
    const userSavedPosts = savedPosts.get(userId) || [];

    // Check if already saved
    if (userSavedPosts.includes(postId)) {
      return { success: false, message: 'Post already saved' };
    }

    userSavedPosts.push(postId);
    savedPosts.set(userId, userSavedPosts);

    // Add to collection if specified
    if (collectionId) {
      addToCollection(userId, collectionId, postId);
    }

    return { success: true, message: 'Post saved successfully' };
  }

  /**
   * Unsave post
   * @param {string} userId - User ID
   * @param {string} postId - Post ID
   * @returns {Object} Unsave result
   */
  function unsavePost(userId, postId) {
    const userSavedPosts = savedPosts.get(userId) || [];
    const index = userSavedPosts.indexOf(postId);

    if (index > -1) {
      userSavedPosts.splice(index, 1);
      savedPosts.set(userId, userSavedPosts);

      // Remove from all collections
      const userCols = userCollections.get(userId) || [];
      userCols.forEach(colId => {
        removeFromCollection(userId, colId, postId);
      });

      return { success: true, message: 'Post unsaved successfully' };
    }

    return { success: false, message: 'Post not found in saved posts' };
  }

  /**
   * Check if post is saved
   * @param {string} userId - User ID
   * @param {string} postId - Post ID
   * @returns {boolean} Is saved
   */
  function isPostSaved(userId, postId) {
    const userSavedPosts = savedPosts.get(userId) || [];
    return userSavedPosts.includes(postId);
  }

  /**
   * Get saved posts for user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Saved post IDs
   */
  function getSavedPosts(userId, options = {}) {
    const savedPostIds = savedPosts.get(userId) || [];
    const { limit = 20, offset = 0 } = options;

    return savedPostIds.slice(offset, offset + limit);
  }

  /**
   * Get saved posts count
   * @param {string} userId - User ID
   * @returns {number} Saved posts count
   */
  function getSavedPostsCount(userId) {
    const userSavedPosts = savedPosts.get(userId) || [];
    return userSavedPosts.length;
  }

  /**
   * Create collection
   * @param {string} userId - User ID
   * @param {Object} collectionData - Collection data
   * @returns {Object} Created collection
   */
  function createCollection(userId, collectionData) {
    const collectionId = generateId();

    const collection = {
      id: collectionId,
      userId,
      name: collectionData.name || 'New Collection',
      description: collectionData.description || '',
      coverImage: collectionData.coverImage || '',
      isPrivate: collectionData.isPrivate !== false,
      postCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    collections.set(collectionId, collection);

    // Add to user's collections
    const userCols = userCollections.get(userId) || [];
    userCols.push(collectionId);
    userCollections.set(userId, userCols);

    return collection;
  }

  /**
   * Add post to collection
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {string} postId - Post ID
   * @returns {Object} Result
   */
  function addToCollection(userId, collectionId, postId) {
    const collection = collections.get(collectionId);

    if (!collection) {
      return { success: false, message: 'Collection not found' };
    }

    if (collection.userId !== userId) {
      return { success: false, message: 'Not authorized' };
    }

    const collectionPosts = collection.posts || [];

    if (collectionPosts.includes(postId)) {
      return { success: false, message: 'Post already in collection' };
    }

    collectionPosts.push(postId);
    collection.postCount = collectionPosts.length;
    collection.updatedAt = Date.now();
    collections.set(collectionId, collection);

    return { success: true, message: 'Post added to collection' };
  }

  /**
   * Remove post from collection
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {string} postId - Post ID
   * @returns {Object} Result
   */
  function removeFromCollection(userId, collectionId, postId) {
    const collection = collections.get(collectionId);

    if (!collection) {
      return { success: false, message: 'Collection not found' };
    }

    if (collection.userId !== userId) {
      return { success: false, message: 'Not authorized' };
    }

    const collectionPosts = collection.posts || [];
    const index = collectionPosts.indexOf(postId);

    if (index > -1) {
      collectionPosts.splice(index, 1);
      collection.postCount = collectionPosts.length;
      collection.updatedAt = Date.now();
      collections.set(collectionId, collection);

      return { success: true, message: 'Post removed from collection' };
    }

    return { success: false, message: 'Post not found in collection' };
  }

  /**
   * Get collection
   * @param {string} collectionId - Collection ID
   * @returns {Object} Collection
   */
  function getCollection(collectionId) {
    return collections.get(collectionId);
  }

  /**
   * Get collections for user
   * @param {string} userId - User ID
   * @returns {Array} Collections
   */
  function getUserCollections(userId) {
    const collectionIds = userCollections.get(userId) || [];
    return collectionIds.map(id => collections.get(id)).filter(Boolean);
  }

  /**
   * Update collection
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated collection
   */
  function updateCollection(userId, collectionId, updates) {
    const collection = collections.get(collectionId);

    if (!collection || collection.userId !== userId) {
      return null;
    }

    const updatedCollection = {
      ...collection,
      ...updates,
      updatedAt: Date.now()
    };

    collections.set(collectionId, updatedCollection);
    return updatedCollection;
  }

  /**
   * Delete collection
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @returns {Object} Result
   */
  function deleteCollection(userId, collectionId) {
    const collection = collections.get(collectionId);

    if (!collection || collection.userId !== userId) {
      return { success: false, message: 'Collection not found or not authorized' };
    }

    collections.delete(collectionId);

    // Remove from user's collections
    const userCols = userCollections.get(userId) || [];
    const index = userCols.indexOf(collectionId);
    if (index > -1) {
      userCols.splice(index, 1);
      userCollections.set(userId, userCols);
    }

    return { success: true, message: 'Collection deleted successfully' };
  }

  /**
   * Move post between collections
   * @param {string} userId - User ID
   * @param {string} postId - Post ID
   * @param {string} fromCollectionId - Source collection ID
   * @param {string} toCollectionId - Target collection ID
   * @returns {Object} Result
   */
  function movePostBetweenCollections(userId, postId, fromCollectionId, toCollectionId) {
    // Remove from source
    const removeResult = removeFromCollection(userId, fromCollectionId, postId);
    if (!removeResult.success) {
      return removeResult;
    }

    // Add to target
    const addResult = addToCollection(userId, toCollectionId, postId);
    if (!addResult.success) {
      // Rollback if add fails
      addToCollection(userId, fromCollectionId, postId);
      return addResult;
    }

    return { success: true, message: 'Post moved successfully' };
  }

  /**
   * Get posts in collection
   * @param {string} collectionId - Collection ID
   * @param {Object} options - Query options
   * @returns {Array} Post IDs
   */
  function getCollectionPosts(collectionId, options = {}) {
    const collection = collections.get(collectionId);
    if (!collection) return [];

    const posts = collection.posts || [];
    const { limit = 20, offset = 0 } = options;

    return posts.slice(offset, offset + limit);
  }

  /**
   * Search saved posts
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @returns {Array} Matching post IDs
   */
  function searchSavedPosts(userId, query) {
    const savedPostIds = savedPosts.get(userId) || [];
    // This would need to be implemented with actual post data
    // For now, return all saved posts
    return savedPostIds;
  }

  /**
   * Get collection statistics
   * @param {string} userId - User ID
   * @returns {Object} Statistics
   */
  function getCollectionStats(userId) {
    const userCols = getUserCollections(userId);
    const savedPostIds = savedPosts.get(userId) || [];

    return {
      totalCollections: userCols.length,
      totalSavedPosts: savedPostIds.length,
      postsInCollections: userCols.reduce((sum, col) => sum + (col.postCount || 0), 0),
      recentCollections: userCols
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5)
    };
  }

  /**
   * Share collection
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {string} shareWith - User ID to share with
   * @returns {Object} Result
   */
  function shareCollection(userId, collectionId, shareWith) {
    const collection = collections.get(collectionId);

    if (!collection || collection.userId !== userId) {
      return { success: false, message: 'Collection not found or not authorized' };
    }

    if (collection.isPrivate) {
      return { success: false, message: 'Cannot share private collection' };
    }

    // Implement sharing logic
    const sharedWith = collection.sharedWith || [];
    if (!sharedWith.includes(shareWith)) {
      sharedWith.push(shareWith);
      collection.sharedWith = sharedWith;
      collections.set(collectionId, collection);
    }

    return { success: true, message: 'Collection shared successfully' };
  }

  /**
   * Duplicate collection
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID to duplicate
   * @returns {Object} New collection
   */
  function duplicateCollection(userId, collectionId) {
    const originalCollection = collections.get(collectionId);

    if (!originalCollection) {
      return null;
    }

    const newCollection = createCollection(userId, {
      name: `${originalCollection.name} (Copy)`,
      description: originalCollection.description,
      coverImage: originalCollection.coverImage,
      isPrivate: originalCollection.isPrivate
    });

    // Copy posts
    if (originalCollection.posts) {
      originalCollection.posts.forEach(postId => {
        addToCollection(userId, newCollection.id, postId);
      });
    }

    return newCollection;
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
    console.log('[SavedPostsCollection] Module initialized');
  }

  initialize();

  return {
    savePost,
    unsavePost,
    isPostSaved,
    getSavedPosts,
    getSavedPostsCount,
    createCollection,
    addToCollection,
    removeFromCollection,
    getCollection,
    getUserCollections,
    updateCollection,
    deleteCollection,
    movePostBetweenCollections,
    getCollectionPosts,
    searchSavedPosts,
    getCollectionStats,
    shareCollection,
    duplicateCollection
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SavedPostsCollection;
}

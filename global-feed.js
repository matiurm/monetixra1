// ============================================================
//  Monetixra - Global Feed System (Facebook Style)
//  Handles: Timeline, Real-time Updates, Pagination, Filtering
// ============================================================

const MonetixraGlobalFeed = {
  // Configuration
  config: {
    apiBaseUrl: '/api',
    postsPerPage: 20,
    autoRefreshInterval: 30000, // 30 seconds
    enableRealTime: true,
    enableInfiniteScroll: true
  },

  // State
  state: {
    currentPage: 0,
    hasMore: true,
    isLoading: false,
    posts: [],
    lastUpdateTimestamp: Date.now(),
    currentFilter: 'all',
    currentSort: 'recent',
    socketConnected: false
  },

  // Initialize the global feed
  initialize: function(containerId = 'feed-container') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('[GlobalFeed] Container not found:', containerId);
      return;
    }

    console.log('[GlobalFeed] Initializing Facebook-style global feed...');
    
    // Load initial posts
    this.loadInitialPosts();
    
    // Setup real-time updates
    if (this.config.enableRealTime) {
      this.setupRealTimeUpdates();
    }
    
    // Setup infinite scroll
    if (this.config.enableInfiniteScroll) {
      this.setupInfiniteScroll();
    }
    
    // Setup filter controls
    this.setupFilterControls();
    
    // Start auto-refresh
    this.startAutoRefresh();
    
    console.log('[GlobalFeed] Initialization complete');
  },

  // Load initial posts
  loadInitialPosts: async function() {
    try {
      this.state.isLoading = true;
      this.showLoading();

      const response = await fetch(`${this.config.apiBaseUrl}/feed/global?page=0&limit=${this.config.postsPerPage}`);
      const data = await response.json();

      if (data.success) {
        this.state.posts = data.feed;
        this.state.hasMore = data.pagination.hasMore;
        this.state.currentPage = 0;
        this.renderPosts();
      } else {
        console.error('[GlobalFeed] Failed to load posts:', data.error);
        this.showError('Failed to load posts');
      }
    } catch (error) {
      console.error('[GlobalFeed] Load error:', error);
      this.showError('Network error loading posts');
    } finally {
      this.state.isLoading = false;
      this.hideLoading();
    }
  },

  // Load more posts (pagination)
  loadMorePosts: async function() {
    if (this.state.isLoading || !this.state.hasMore) return;

    try {
      this.state.isLoading = true;
      this.showLoadingMore();

      const nextPage = this.state.currentPage + 1;
      const response = await fetch(
        `${this.config.apiBaseUrl}/feed/global?page=${nextPage}&limit=${this.config.postsPerPage}&type=${this.state.currentFilter}&sortBy=${this.state.currentSort}`
      );
      const data = await response.json();

      if (data.success) {
        this.state.posts = [...this.state.posts, ...data.feed];
        this.state.hasMore = data.pagination.hasMore;
        this.state.currentPage = nextPage;
        this.appendPosts(data.feed);
      }
    } catch (error) {
      console.error('[GlobalFeed] Load more error:', error);
    } finally {
      this.state.isLoading = false;
      this.hideLoadingMore();
    }
  },

  // Render posts to container
  renderPosts: function() {
    if (!this.container) return;

    this.container.innerHTML = '';

    if (this.state.posts.length === 0) {
      this.container.innerHTML = `
        <div class="feed-empty">
          <div class="empty-icon">📭</div>
          <div class="empty-message">No posts yet. Be the first to share!</div>
        </div>
      `;
      return;
    }

    this.state.posts.forEach(post => {
      const postElement = this.createPostElement(post);
      this.container.appendChild(postElement);
    });
  },

  // Append new posts to container
  appendPosts: function(newPosts) {
    if (!this.container) return;

    newPosts.forEach(post => {
      const postElement = this.createPostElement(post);
      this.container.appendChild(postElement);
    });
  },

  // Create individual post element
  createPostElement: function(post) {
    const article = document.createElement('article');
    article.className = 'feed-post';
    article.dataset.postId = post.id;

    const author = post.authorInfo || {};
    const engagement = post.engagement || {};
    const timeAgo = post.timeAgo || this.getTimeAgo(post.createdAt);

    // Determine content type and display accordingly
    let contentHTML = '';
    
    if (post.type === 'video' || post.category === 'video') {
      contentHTML = `
        <div class="post-media video-container">
          <video controls playsinline poster="${post.thumbnail || ''}">
            <source src="${post.file || post.mediaUrl || ''}" type="video/mp4">
            Your browser does not support video playback.
          </video>
        </div>
      `;
    } else if (post.type === 'audio' || post.category === 'audio') {
      contentHTML = `
        <div class="post-media audio-container">
          <audio controls>
            <source src="${post.file || post.mediaUrl || ''}" type="audio/mpeg">
            Your browser does not support audio playback.
          </audio>
        </div>
      `;
    } else if (post.type === 'photo' || post.category === 'photo' || post.file) {
      contentHTML = `
        <div class="post-media image-container">
          <img src="${post.file || post.mediaUrl || ''}" alt="Post image" loading="lazy">
        </div>
      `;
    }

    // Text content
    const textContent = post.text ? `<div class="post-text">${this.formatText(post.text)}</div>` : '';

    // Hashtags
    const hashtags = post.hashtags && post.hashtags.length > 0 
      ? `<div class="post-hashtags">${post.hashtags.map(tag => `#${tag}`).join(' ')}</div>` 
      : '';

    article.innerHTML = `
      <div class="post-header">
        <div class="post-author">
          <img src="${author.avatar || '/icon-192.png'}" alt="${author.name}" class="author-avatar">
          <div class="author-info">
            <div class="author-name">
              ${author.name || 'Anonymous'}
              ${author.verified ? '<span class="verified-badge">✓</span>' : ''}
              ${author.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
            </div>
            <div class="author-username">@${author.username || 'unknown'}</div>
          </div>
        </div>
        <div class="post-time">${timeAgo}</div>
      </div>
      
      <div class="post-content">
        ${textContent}
        ${contentHTML}
        ${hashtags}
      </div>
      
      <div class="post-footer">
        <div class="engagement-stats">
          <span class="stat-item">❤️ ${engagement.likes || 0}</span>
          <span class="stat-item">💬 ${engagement.comments || 0}</span>
          <span class="stat-item">🔄 ${engagement.shares || 0}</span>
          <span class="stat-item">👁️ ${engagement.views || 0}</span>
        </div>
        
        <div class="engagement-actions">
          <button class="action-btn like-btn" data-post-id="${post.id}">
            <span class="btn-icon">❤️</span>
            <span class="btn-text">Like</span>
          </button>
          <button class="action-btn comment-btn" data-post-id="${post.id}">
            <span class="btn-icon">💬</span>
            <span class="btn-text">Comment</span>
          </button>
          <button class="action-btn share-btn" data-post-id="${post.id}">
            <span class="btn-icon">🔄</span>
            <span class="btn-text">Share</span>
          </button>
          <button class="action-btn bookmark-btn" data-post-id="${post.id}">
            <span class="btn-icon">🔖</span>
            <span class="btn-text">Save</span>
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    this.attachPostEventListeners(article, post);

    return article;
  },

  // Attach event listeners to post
  attachPostEventListeners: function(element, post) {
    // Like button
    const likeBtn = element.querySelector('.like-btn');
    if (likeBtn) {
      likeBtn.addEventListener('click', () => this.handleLike(post.id));
    }

    // Comment button
    const commentBtn = element.querySelector('.comment-btn');
    if (commentBtn) {
      commentBtn.addEventListener('click', () => this.handleComment(post.id));
    }

    // Share button
    const shareBtn = element.querySelector('.share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.handleShare(post.id));
    }

    // Bookmark button
    const bookmarkBtn = element.querySelector('.bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => this.handleBookmark(post.id));
    }
  },

  // Handle like action
  handleLike: async function(postId) {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/posts/${postId}/like`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        // Update UI
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
          const likeBtn = postElement.querySelector('.like-btn');
          const statItem = postElement.querySelector('.stat-item');
          
          likeBtn.classList.toggle('liked');
          if (statItem) {
            const currentLikes = parseInt(statItem.textContent.replace('❤️ ', '')) || 0;
            statItem.textContent = `❤️ ${currentLikes + 1}`;
          }
        }
      }
    } catch (error) {
      console.error('[GlobalFeed] Like error:', error);
    }
  },

  // Handle comment action
  handleComment: function(postId) {
    // Show comment input
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (postElement) {
      let commentSection = postElement.querySelector('.comment-section');
      if (!commentSection) {
        commentSection = document.createElement('div');
        commentSection.className = 'comment-section';
        commentSection.innerHTML = `
          <div class="comment-input-wrapper">
            <textarea class="comment-input" placeholder="Write a comment..." rows="2"></textarea>
            <button class="comment-submit-btn">Post Comment</button>
          </div>
          <div class="comments-list"></div>
        `;
        postElement.appendChild(commentSection);
        
        // Add submit handler
        const submitBtn = commentSection.querySelector('.comment-submit-btn');
        const commentInput = commentSection.querySelector('.comment-input');
        
        submitBtn.addEventListener('click', () => this.submitComment(postId, commentInput.value));
      }
      
      commentSection.scrollIntoView({ behavior: 'smooth' });
      commentSection.querySelector('.comment-input').focus();
    }
  },

  // Submit comment
  submitComment: async function(postId, comment) {
    if (!comment.trim()) return;

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment })
      });
      const data = await response.json();
      
      if (data.success) {
        // Clear input and show success
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        const commentInput = postElement.querySelector('.comment-input');
        commentInput.value = '';
        
        // Update comment count
        const statItem = postElement.querySelector('.stat-item:nth-child(2)');
        if (statItem) {
          const currentComments = parseInt(statItem.textContent.replace('💬 ', '')) || 0;
          statItem.textContent = `💬 ${currentComments + 1}`;
        }
      }
    } catch (error) {
      console.error('[GlobalFeed] Comment error:', error);
    }
  },

  // Handle share action
  handleShare: function(postId) {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post on Monetixra',
        url: `${window.location.origin}/post/${postId}`
      });
    } else {
      // Fallback: copy to clipboard
      const url = `${window.location.origin}/post/${postId}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  },

  // Handle bookmark action
  handleBookmark: async function(postId) {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/posts/${postId}/bookmark`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        const bookmarkBtn = document.querySelector(`[data-post-id="${postId}"] .bookmark-btn`);
        if (bookmarkBtn) {
          bookmarkBtn.classList.toggle('bookmarked');
        }
      }
    } catch (error) {
      console.error('[GlobalFeed] Bookmark error:', error);
    }
  },

  // Setup real-time updates via socket
  setupRealTimeUpdates: function() {
    if (typeof io !== 'undefined') {
      const socket = io();
      
      socket.on('connect', () => {
        console.log('[GlobalFeed] Socket connected');
        this.state.socketConnected = true;
      });
      
      socket.on('post:new', (data) => {
        console.log('[GlobalFeed] New post received:', data);
        if (data.post) {
          this.handleNewPost(data.post);
        }
      });
      
      socket.on('post:updated', (data) => {
        console.log('[GlobalFeed] Post updated:', data);
        if (data.post) {
          this.handlePostUpdate(data.post);
        }
      });
      
      socket.on('disconnect', () => {
        console.log('[GlobalFeed] Socket disconnected');
        this.state.socketConnected = false;
      });
    } else {
      console.warn('[GlobalFeed] Socket.io not available, using polling');
      this.setupPollingUpdates();
    }
  },

  // Handle new post from socket
  handleNewPost: function(post) {
    // Check if post already exists
    const exists = this.state.posts.some(p => p.id === post.id);
    if (exists) return;

    // Add to beginning of posts
    const enrichedPost = this.enrichPost(post);
    this.state.posts.unshift(enrichedPost);

    // Prepend to DOM
    if (this.container) {
      const postElement = this.createPostElement(enrichedPost);
      postElement.classList.add('new-post-animation');
      this.container.insertBefore(postElement, this.container.firstChild);
      
      // Show notification
      this.showNewPostNotification(enrichedPost);
    }
  },

  // Handle post update from socket
  handlePostUpdate: function(post) {
    // Update existing post in state
    const index = this.state.posts.findIndex(p => p.id === post.id);
    if (index !== -1) {
      this.state.posts[index] = this.enrichPost(post);
      
      // Update DOM
      const postElement = document.querySelector(`[data-post-id="${post.id}"]`);
      if (postElement) {
        const newElement = this.createPostElement(this.enrichPost(post));
        postElement.replaceWith(newElement);
      }
    }
  },

  // Setup polling updates (fallback)
  setupPollingUpdates: function() {
    setInterval(async () => {
      try {
        const response = await fetch(`${this.config.apiBaseUrl}/feed/updates?since=${this.state.lastUpdateTimestamp}`);
        const data = await response.json();
        
        if (data.success && data.updates.length > 0) {
          this.state.lastUpdateTimestamp = data.timestamp;
          data.updates.forEach(post => this.handleNewPost(post));
        }
      } catch (error) {
        console.error('[GlobalFeed] Polling error:', error);
      }
    }, this.config.autoRefreshInterval);
  },

  // Setup infinite scroll
  setupInfiniteScroll: function() {
    const options = {
      root: null,
      rootMargin: '200px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && this.state.hasMore && !this.state.isLoading) {
          this.loadMorePosts();
        }
      });
    }, options);

    // Observe the last post
    const observeLastPost = () => {
      const posts = this.container.querySelectorAll('.feed-post');
      if (posts.length > 0) {
        observer.observe(posts[posts.length - 1]);
      }
    };

    // Initial observation
    observeLastPost();

    // Re-observe after new posts are added
    const originalAppend = this.appendPosts;
    this.appendPosts = function(newPosts) {
      originalAppend.call(this, newPosts);
      observeLastPost();
    };
  },

  // Setup filter controls
  setupFilterControls: function() {
    // Content type filter
    const typeFilter = document.getElementById('feed-type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.state.currentFilter = e.target.value;
        this.state.currentPage = 0;
        this.state.hasMore = true;
        this.loadInitialPosts();
      });
    }

    // Sort filter
    const sortFilter = document.getElementById('feed-sort-filter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        this.state.currentSort = e.target.value;
        this.state.currentPage = 0;
        this.state.hasMore = true;
        this.loadInitialPosts();
      });
    }
  },

  // Start auto-refresh
  startAutoRefresh: function() {
    setInterval(() => {
      if (!this.state.isLoading) {
        this.refreshFeed();
      }
    }, this.config.autoRefreshInterval);
  },

  // Refresh feed
  refreshFeed: async function() {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/feed/global?page=0&limit=${this.config.postsPerPage}&type=${this.state.currentFilter}&sortBy=${this.state.currentSort}`);
      const data = await response.json();

      if (data.success) {
        const newPosts = data.feed.filter(newPost => 
          !this.state.posts.some(existingPost => existingPost.id === newPost.id)
        );

        if (newPosts.length > 0) {
          this.state.posts = [...newPosts, ...this.state.posts];
          this.renderPosts();
          this.showNewPostsCount(newPosts.length);
        }
      }
    } catch (error) {
      console.error('[GlobalFeed] Refresh error:', error);
    }
  },

  // Enrich post with additional data
  enrichPost: function(post) {
    const author = post.authorInfo || syncStore?.users?.get(String(post.author || '')) || {};
    return {
      ...post,
      authorInfo: {
        id: author.id,
        name: author.name || 'Anonymous',
        username: author.username || 'unknown',
        avatar: author.avatar || author.profilePic || '/icon-192.png',
        verified: author.verified || false,
        isAdmin: author.isAdmin || author.is_admin || false
      },
      engagement: {
        likes: post.likedBy ? post.likedBy.length : 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        views: post.views || 0
      },
      timeAgo: this.getTimeAgo(post.createdAt)
    };
  },

  // Format text (links, mentions, hashtags)
  formatText: function(text) {
    if (!text) return '';
    
    // Escape HTML
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Links
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Mentions
    formatted = formatted.replace(
      /@(\w+)/g,
      '<a href="/user/$1" class="mention">@$1</a>'
    );

    // Hashtags
    formatted = formatted.replace(
      /#(\w+)/g,
      '<a href="/hashtag/$1" class="hashtag">#$1</a>'
    );

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  },

  // Get time ago string
  getTimeAgo: function(timestamp) {
    if (!timestamp) return 'Just now';
    
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
    return `${Math.floor(seconds / 31536000)}y ago`;
  },

  // UI Helpers
  showLoading: function() {
    if (this.container) {
      this.container.innerHTML = `
        <div class="feed-loading">
          <div class="loader"></div>
          <div class="loading-text">Loading posts...</div>
        </div>
      `;
    }
  },

  hideLoading: function() {
    // Loading is hidden when posts are rendered
  },

  showLoadingMore: function() {
    const loadingMore = document.createElement('div');
    loadingMore.className = 'feed-loading-more';
    loadingMore.innerHTML = '<div class="loader"></div>';
    this.container.appendChild(loadingMore);
  },

  hideLoadingMore: function() {
    const loadingMore = this.container.querySelector('.feed-loading-more');
    if (loadingMore) loadingMore.remove();
  },

  showError: function(message) {
    if (this.container) {
      this.container.innerHTML = `
        <div class="feed-error">
          <div class="error-icon">⚠️</div>
          <div class="error-message">${message}</div>
          <button class="retry-btn" onclick="MonetixraGlobalFeed.loadInitialPosts()">Retry</button>
        </div>
      `;
    }
  },

  showNewPostNotification: function(post) {
    const notification = document.createElement('div');
    notification.className = 'new-post-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <img src="${post.authorInfo?.avatar || '/icon-192.png'}" class="notification-avatar">
        <div class="notification-text">
          <strong>${post.authorInfo?.name || 'Someone'}</strong> posted something new
        </div>
      </div>
      <button class="notification-close">×</button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => notification.remove(), 5000);

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
  },

  showNewPostsCount: function(count) {
    const indicator = document.createElement('div');
    indicator.className = 'new-posts-indicator';
    indicator.textContent = `${count} new posts`;
    indicator.onclick = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      indicator.remove();
    };

    document.body.appendChild(indicator);

    setTimeout(() => indicator.remove(), 10000);
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    MonetixraGlobalFeed.initialize();
  });
} else {
  MonetixraGlobalFeed.initialize();
}

// Make available globally
window.MonetixraGlobalFeed = MonetixraGlobalFeed;

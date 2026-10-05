/**
 * Advanced OAuth Authentication System
 * Supports: Google, Facebook, Apple, Twitter/X, Line, Kakao
 * Features: Secure token handling, user profile data, error handling, fallback
 */

(function () {
  'use strict';

  // OAuth Configuration
  const OAuthConfig = {
    // Google OAuth 2.0
    google: {
      clientId: window.__MONETIXRA_CONFIG__?.oauth?.google?.clientId || '',
      redirectUri: window.location.origin + '/auth/google/callback',
      scope: 'email profile',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
    },

    // Facebook OAuth 2.0
    facebook: {
      appId: window.__MONETIXRA_CONFIG__?.oauth?.facebook?.appId || '',
      redirectUri: window.location.origin + '/auth/facebook/callback',
      scope: 'email,public_profile',
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      userInfoUrl: 'https://graph.facebook.com/v18.0/me?fields=id,name,email,picture'
    },

    // Apple Sign In
    apple: {
      clientId: window.__MONETIXRA_CONFIG__?.oauth?.apple?.clientId || '',
      redirectUri: window.location.origin + '/auth/apple/callback',
      scope: 'name email',
      authUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token'
    },

    // Twitter/X OAuth 2.0
    twitter: {
      clientId: window.__MONETIXRA_CONFIG__?.oauth?.twitter?.clientId || '',
      redirectUri: window.location.origin + '/auth/twitter/callback',
      scope: 'tweet.read users.read',
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      userInfoUrl: 'https://api.twitter.com/2/users/me'
    },

    // Line Login
    line: {
      channelId: window.__MONETIXRA_CONFIG__?.oauth?.line?.channelId || '',
      redirectUri: window.location.origin + '/auth/line/callback',
      scope: 'profile email openid',
      authUrl: 'https://access.line.me/oauth2/v2.1/authorize',
      tokenUrl: 'https://api.line.me/oauth2/v2.1/token',
      userInfoUrl: 'https://api.line.me/v2/profile'
    },

    // Kakao Login
    kakao: {
      clientId: window.__MONETIXRA_CONFIG__?.oauth?.kakao?.clientId || '',
      redirectUri: window.location.origin + '/auth/kakao/callback',
      scope: 'profile_nickname account_email',
      authUrl: 'https://kauth.kakao.com/oauth/authorize',
      tokenUrl: 'https://kauth.kakao.com/oauth/token',
      userInfoUrl: 'https://kapi.kakao.com/v2/user/me'
    }
  };

  // Generate random state for CSRF protection
  function generateState() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Generate PKCE code verifier and challenge
  function generatePKCE() {
    const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // SHA-256 hash for code challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    return crypto.subtle.digest('SHA-256', data).then(hash => {
      const challenge = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return { verifier, challenge };
    });
  }

  // Store OAuth state in sessionStorage
  function storeOAuthState(provider, state, verifier) {
    const sessionData = {
      provider,
      state,
      verifier,
      timestamp: Date.now()
    };
    sessionStorage.setItem('oauth_state_' + state, JSON.stringify(sessionData));
  }

  // Retrieve and validate OAuth state
  function getOAuthState(state) {
    const data = sessionStorage.getItem('oauth_state_' + state);
    if (!data) return null;

    const parsed = JSON.parse(data);
    // Validate state is not too old (5 minutes)
    if (Date.now() - parsed.timestamp > 300000) {
      sessionStorage.removeItem('oauth_state_' + state);
      return null;
    }

    sessionStorage.removeItem('oauth_state_' + state);
    return parsed;
  }

  // Helper function to build authorization URL
  function buildAuthUrl(provider, config, state, challenge) {
    let authUrl = config.authUrl + '?';
    const params = new URLSearchParams();

    if (provider === 'google') {
      params.append('client_id', config.clientId);
      params.append('redirect_uri', config.redirectUri);
      params.append('response_type', 'code');
      params.append('scope', config.scope);
      params.append('state', state);
      params.append('code_challenge', challenge);
      params.append('code_challenge_method', 'S256');
      params.append('prompt', 'select_account');
    }
    else if (provider === 'facebook') {
      params.append('client_id', config.appId);
      params.append('redirect_uri', config.redirectUri);
      params.append('response_type', 'code');
      params.append('scope', config.scope);
      params.append('state', state);
    }
    else if (provider === 'apple') {
      params.append('client_id', config.clientId);
      params.append('redirect_uri', config.redirectUri);
      params.append('response_type', 'code');
      params.append('scope', config.scope);
      params.append('state', state);
      params.append('response_mode', 'form_post');
    }
    else if (provider === 'twitter') {
      params.append('client_id', config.clientId);
      params.append('redirect_uri', config.redirectUri);
      params.append('response_type', 'code');
      params.append('scope', config.scope);
      params.append('state', state);
      params.append('code_challenge', challenge);
      params.append('code_challenge_method', 'S256');
    }
    else if (provider === 'line') {
      params.append('client_id', config.channelId);
      params.append('redirect_uri', config.redirectUri);
      params.append('response_type', 'code');
      params.append('scope', config.scope);
      params.append('state', state);
      params.append('code_challenge', challenge);
      params.append('code_challenge_method', 'S256');
    }
    else if (provider === 'kakao') {
      params.append('client_id', config.clientId);
      params.append('redirect_uri', config.redirectUri);
      params.append('response_type', 'code');
      params.append('scope', config.scope);
      params.append('state', state);
    }

    return authUrl + params.toString();
  }

  // Main OAuth Login Function (Popup - Desktop friendly)
  async function oauthLogin(provider) {
    try {
      console.log('[OAuth] Starting login for:', provider);

      const config = OAuthConfig[provider];
      if (!config) {
        console.error('[OAuth] Invalid provider:', provider);
        toast('e', 'Invalid OAuth provider');
        return;
      }

      // Check if client ID is configured
      const clientId = config.clientId || config.channelId || config.appId;
      if (!clientId || clientId === '' || clientId.includes('YOUR_')) {
        console.warn('[OAuth]', provider, 'not configured');
        toast('w', `${provider.charAt(0).toUpperCase() + provider.slice(1)} login not configured. Please contact admin.`);
        return;
      }

      // Generate state and PKCE
      const state = generateState();
      const { verifier, challenge } = await generatePKCE();
      storeOAuthState(provider, state, verifier);

      // Build authorization URL
      const authUrl = buildAuthUrl(provider, config, state, challenge);

      console.log('[OAuth] Redirecting to:', authUrl);

      // Show loading state
      if (typeof toast === 'function') {
        toast('i', `Connecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`);
      }

      // Open popup window for OAuth
      const popup = window.open(
        authUrl,
        `oauth_${provider}`,
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        console.error('[OAuth] Popup blocked');
        toast('e', 'Popup blocked. Please allow popups for this site.');
        return;
      }

      // Monitor popup for close
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          console.log('[OAuth] Popup closed by user');
        }
      }, 500);

    } catch (error) {
      console.error('[OAuth] Login error:', error);
      if (typeof toast === 'function') {
        toast('e', 'OAuth login failed: ' + error.message);
      }
    }
  }

  // OAuth Login with Direct Redirect (Mobile friendly)
  async function oauthLoginRedirect(provider) {
    try {
      console.log('[OAuth] Starting redirect login for:', provider);

      const config = OAuthConfig[provider];
      if (!config) {
        console.error('[OAuth] Invalid provider:', provider);
        toast('e', 'Invalid OAuth provider');
        return;
      }

      // Check if client ID is configured
      const clientId = config.clientId || config.channelId || config.appId;
      if (!clientId || clientId === '' || clientId.includes('YOUR_')) {
        console.warn('[OAuth]', provider, 'not configured');
        toast('w', `${provider.charAt(0).toUpperCase() + provider.slice(1)} login not configured. Please contact admin.`);
        return;
      }

      // Generate state and PKCE
      const state = generateState();
      const { verifier, challenge } = await generatePKCE();
      storeOAuthState(provider, state, verifier);

      // Build authorization URL
      const authUrl = buildAuthUrl(provider, config, state, challenge);

      console.log('[OAuth] Redirecting to:', authUrl);

      // Show loading state
      if (typeof toast === 'function') {
        toast('i', `Redirecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`);
      }

      // Direct redirect (mobile friendly)
      window.location.href = authUrl;

    } catch (error) {
      console.error('[OAuth] Redirect login error:', error);
      if (typeof toast === 'function') {
        toast('e', 'OAuth login failed: ' + error.message);
      }
    }
  }

  // Smart OAuth Login - Auto-detects mobile vs desktop
  async function oauthLoginSmart(provider) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768;

    console.log('[OAuth] Device type:', isMobile ? 'Mobile' : 'Desktop');

    if (isMobile) {
      await oauthLoginRedirect(provider);
    } else {
      await oauthLogin(provider);
    }
  }

  // Handle OAuth callback
  async function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      console.error('[OAuth] Error from provider:', error);
      toast('e', 'OAuth error: ' + error);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (!code || !state) {
      return; // Not an OAuth callback
    }

    try {
      console.log('[OAuth] Handling callback with state:', state);

      const sessionData = getOAuthState(state);
      if (!sessionData) {
        console.error('[OAuth] Invalid or expired state');
        toast('e', 'Invalid OAuth state. Please try again.');
        return;
      }

      const provider = sessionData.provider;
      const config = OAuthConfig[provider];

      if (typeof toast === 'function') {
        toast('i', 'Completing login...');
      }

      // Exchange code for access token (via backend)
      const response = await fetch('/api/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          code,
          redirectUri: config.redirectUri,
          verifier: sessionData.verifier
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'OAuth callback failed');
      }

      console.log('[OAuth] Login successful:', data);

      // Create or update user account
      await createOrUpdateOAuthUser(provider, data);

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

    } catch (error) {
      console.error('[OAuth] Callback error:', error);
      if (typeof toast === 'function') {
        toast('e', 'Login failed: ' + error.message);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // Create or update user from OAuth data
  async function createOrUpdateOAuthUser(provider, oauthData) {
    try {
      console.log('[OAuth] Creating/updating user for:', provider);

      const userInfo = oauthData.userInfo || {};
      const email = userInfo.email || `${provider}_${userInfo.id}@oauth.monetixra.com`;
      const name = userInfo.name || userInfo.displayName || 'OAuth User';
      const avatar = userInfo.picture || userInfo.avatar || null;
      const oauthId = `${provider}_${userInfo.id}`;

      // Check if user exists with this OAuth ID
      let user = null;
      if (typeof D !== 'undefined' && D.users) {
        user = Object.values(D.users).find(u =>
          u.oauthId === oauthId ||
          (u.email && u.email === email)
        );
      }

      if (user) {
        // Update existing user
        user.name = name;
        user.avatar = avatar || user.avatar;
        user.oauthId = oauthId;
        user.oauthProvider = provider;
        user.lastLogin = Date.now();
        user.isLoggedIn = true;

        console.log('[OAuth] Updated existing user:', user.id);
      } else {
        // Create new user
        const newId = 'u' + Date.now() + Math.random().toString(36).slice(2, 6);
        user = {
          id: newId,
          name: name,
          username: (name.split(' ')[0] + Date.now()).toLowerCase().replace(/[^a-z0-9]/g, ''),
          email: email,
          avatar: avatar,
          oauthId: oauthId,
          oauthProvider: provider,
          points: 50, // Signup bonus
          money: 0,
          adViews: 0,
          adPts: 0,
          engPts: 0,
          refPts: 0,
          mlmPts: 0,
          nftPts: 0,
          stakePts: 0,
          createdAt: Date.now(),
          lastLogin: Date.now(),
          isLoggedIn: true,
          isOnline: true,
          verified: true, // OAuth users are pre-verified
          followers: [],
          following: [],
          posts: [],
          notifSettings: {},
          privacySettings: {}
        };

        if (typeof D !== 'undefined' && D.users) {
          D.users[newId] = user;
        }

        console.log('[OAuth] Created new user:', newId);
      }

      // Login the user
      if (typeof D !== 'undefined') {
        D.cur = user.id;
        if (typeof CU !== 'undefined') {
          Object.assign(CU, user);
        }

        // Save data
        if (typeof saveData === 'function') {
          saveData();
        }

        // Update UI
        if (typeof mount === 'function') {
          mount();
        }

        // Show success message
        if (typeof toast === 'function') {
          toast('s', `🎉 Welcome ${name}! Logged in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);
        }

        if (typeof confetti === 'function') {
          confetti();
        }
      }

    } catch (error) {
      console.error('[OAuth] User creation error:', error);
      throw error;
    }
  }

  // Initialize OAuth on page load
  function initOAuth() {
    console.log('[OAuth] Initializing OAuth system');

    // Check for OAuth callback
    if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
      handleOAuthCallback();
    }

    // Expose oauthLogin functions globally
    window.oauthLogin = oauthLogin;
    window.oauthLoginRedirect = oauthLoginRedirect;
    window.oauthLoginSmart = oauthLoginSmart;

    console.log('[OAuth] System ready');
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOAuth);
  } else {
    initOAuth();
  }

  // Also run after a short delay to catch late-loading scripts
  setTimeout(initOAuth, 500);

  console.log('[OAuth] Advanced OAuth Authentication loaded');

})();

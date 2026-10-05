/**
 * Mobile Deep Linking System for OAuth
 * Redirects to native apps (Google, Facebook, Apple, Twitter, Line, Kakao)
 * on mobile devices for seamless authentication
 */

(function() {
  'use strict';

  // Deep Link URLs for each provider
  const DEEP_LINKS = {
    google: {
      android: 'intent://Intent?action=android.intent.action.VIEW#Intent;scheme=https;package=com.google.android.gms;end',
      ios: 'https://apps.apple.com/app/google/id284815942',
      web: 'https://accounts.google.com/o/oauth2/v2/auth'
    },
    facebook: {
      android: 'fb://profile',
      ios: 'fb://profile',
      web: 'https://www.facebook.com/v18.0/dialog/oauth'
    },
    apple: {
      android: null, // Apple Sign In not available on Android
      ios: 'https://apps.apple.com/app/apple-developer/id640199928',
      web: 'https://appleid.apple.com/auth/authorize'
    },
    twitter: {
      android: 'twitter://user',
      ios: 'twitter://user',
      web: 'https://twitter.com/i/oauth2/authorize'
    },
    line: {
      android: 'line://ti/p',
      ios: 'line://ti/p',
      web: 'https://access.line.me/oauth2/v2.1/authorize'
    },
    kakao: {
      android: 'kakaotalk://',
      ios: 'kakaotalk://',
      web: 'https://kauth.kakao.com/oauth/authorize'
    }
  };

  // Detect device type
  function getDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return 'ios';
    }
    if (/android/i.test(userAgent)) {
      return 'android';
    }
    return 'desktop';
  }

  // Check if app is installed (for mobile)
  function isAppInstalled(provider) {
    return new Promise((resolve) => {
      const deepLink = DEEP_LINKS[provider][getDeviceType()];
      if (!deepLink) {
        resolve(false);
        return;
      }

      const start = Date.now();
      const timeout = 2000; // 2 seconds timeout

      // Try to open deep link
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      // If app is installed, it will open immediately
      // If not, nothing happens
      setTimeout(() => {
        document.body.removeChild(iframe);
        resolve(false); // We can't reliably detect, so default to web
      }, timeout);
    });
  }

  // Open OAuth with deep linking
  function openOAuthWithDeepLink(provider, webUrl) {
    const deviceType = getDeviceType();
    const deepLink = DEEP_LINKS[provider][deviceType];

    console.log('[DeepLink] Opening OAuth for:', provider, 'on', deviceType);

    if (deviceType === 'desktop') {
      // Desktop: use web OAuth
      console.log('[DeepLink] Desktop - using web OAuth');
      window.open(webUrl, 'oauth_popup', 'width=500,height=600,scrollbars=yes');
      return;
    }

    if (!deepLink) {
      // No deep link available, use web
      console.log('[DeepLink] No deep link available, using web OAuth');
      window.open(webUrl, 'oauth_popup', 'width=500,height=600,scrollbars=yes');
      return;
    }

    // Mobile: Try deep link first
    console.log('[DeepLink] Mobile - trying deep link:', deepLink);

    // Method 1: Use custom URL scheme directly
    try {
      const start = Date.now();
      
      // Try to open deep link
      window.location.href = deepLink;

      // Fallback to web if app doesn't open (timeout)
      setTimeout(() => {
        if (Date.now() - start < 2500) {
          // App didn't open, use web OAuth
          console.log('[DeepLink] App not detected, using web OAuth');
          window.open(webUrl, 'oauth_popup', 'width=500,height=600,scrollbars=yes');
        }
      }, 2500);

    } catch (error) {
      console.error('[DeepLink] Deep link failed:', error);
      // Fallback to web OAuth
      window.open(webUrl, 'oauth_popup', 'width=500,height=600,scrollbars=yes');
    }
  }

  // Enhanced OAuth login with deep linking
  function oauthLoginWithDeepLink(provider) {
    try {
      console.log('[DeepLink] Starting OAuth with deep link for:', provider);

      const config = window.__MONETIXRA_CONFIG__?.oauth?.[provider];
      if (!config) {
        console.error('[DeepLink] Invalid provider:', provider);
        if (typeof toast === 'function') {
          toast('e', 'Invalid OAuth provider');
        }
        return;
      }

      // Get client ID
      const clientId = config.clientId || config.channelId || config.appId;
      if (!clientId || clientId.includes('YOUR_')) {
        console.warn('[DeepLink]', provider, 'not configured');
        if (typeof toast === 'function') {
          toast('w', `${provider.charAt(0).toUpperCase() + provider.slice(1)} login not configured`);
        }
        return;
      }

      // Build web OAuth URL
      let webUrl = '';
      const redirectUri = window.location.origin + '/auth/' + provider + '/callback';
      const state = generateState();

      switch (provider) {
        case 'google':
          webUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&state=${state}`;
          break;
        case 'facebook':
          webUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%2Cpublic_profile&state=${state}`;
          break;
        case 'apple':
          webUrl = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=name%20email&state=${state}&response_mode=form_post`;
          break;
        case 'twitter':
          webUrl = `https://twitter.com/i/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=tweet.read%20users.read&state=${state}`;
          break;
        case 'line':
          webUrl = `https://access.line.me/oauth2/v2.1/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile%20email%20openid&state=${state}`;
          break;
        case 'kakao':
          webUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile_nickname%20account_email&state=${state}`;
          break;
      }

      // Store state
      sessionStorage.setItem('oauth_state_' + state, JSON.stringify({
        provider,
        state,
        timestamp: Date.now()
      }));

      // Show loading
      if (typeof toast === 'function') {
        toast('i', `Opening ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`);
      }

      // Open with deep linking
      openOAuthWithDeepLink(provider, webUrl);

    } catch (error) {
      console.error('[DeepLink] OAuth error:', error);
      if (typeof toast === 'function') {
        toast('e', 'OAuth login failed: ' + error.message);
      }
    }
  }

  // Generate random state
  function generateState() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Detect if running in mobile browser
  function isMobileBrowser() {
    return getDeviceType() !== 'desktop';
  }

  // Show mobile app suggestion
  function showMobileAppSuggestion(provider) {
    const deviceType = getDeviceType();
    if (deviceType === 'desktop') return;

    const appNames = {
      google: 'Google App',
      facebook: 'Facebook App',
      apple: 'Apple Settings',
      twitter: 'X (Twitter) App',
      line: 'LINE App',
      kakao: 'KakaoTalk App'
    };

    const appName = appNames[provider];
    if (!appName) return;

    const suggestion = confirm(
      `For better experience, open ${appName} to sign in.\n\n` +
      `Would you like to open the app?`
    );

    if (suggestion) {
      const deepLink = DEEP_LINKS[provider][deviceType];
      if (deepLink) {
        window.location.href = deepLink;
      }
    }
  }

  // Initialize deep linking system
  function initDeepLinking() {
    console.log('[DeepLink] Mobile deep linking system initialized');
    console.log('[DeepLink] Device type:', getDeviceType());

    // Override existing oauthLogin if it exists
    if (typeof window.oauthLogin === 'function') {
      const originalOAuthLogin = window.oauthLogin;
      window.oauthLogin = function(provider) {
        // Try deep linking first
        if (isMobileBrowser()) {
          oauthLoginWithDeepLink(provider);
        } else {
          // Desktop: use original
          originalOAuthLogin(provider);
        }
      };
    } else {
      // No existing oauthLogin, use our implementation
      window.oauthLogin = oauthLoginWithDeepLink;
    }

    // Expose helper functions
    window.DeepLinkSystem = {
      getDeviceType,
      isMobileBrowser,
      openOAuthWithDeepLink,
      showMobileAppSuggestion
    };
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeepLinking);
  } else {
    initDeepLinking();
  }

  console.log('[DeepLink] Mobile deep linking loaded');

})();

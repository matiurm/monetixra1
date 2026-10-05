/* Makes every offer explicitly dismissible and remembers a user's choice. */
(function () {
  'use strict';
  const KEY = 'mxt_dismissed_income_ads_v1';
  const TTL = 24 * 60 * 60 * 1000;
  const selectors = ['#stickyAdBanner', '#autoAd', '#rwAd', '#intsAd', '#interstitialOverlay', '.mxt-floating-pts', '.ad-container', '.ad-native', '.feed-ad', '.mxt-rotating-ad', '.mxt-live-ad', '.mxt-bottom-shelf-card', '.rewarded-ad-container', '.mxt-reward-gate'];
  function dismissed() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function remember(id) { const all = dismissed(); all[id] = Date.now() + TTL; localStorage.setItem(KEY, JSON.stringify(all)); }
  function isDismissed(id) { const until = dismissed()[id] || 0; return until > Date.now(); }
  function close(el) {
    if (!el) return; const id = el.id || el.dataset.adId || ('income-ad-' + Math.random().toString(36).slice(2));
    el.dataset.adId = id; remember(id); el.classList.remove('show'); el.style.display = 'none';
    // Remove after the visual transition so an already-claimed offer can never remain on screen.
    window.setTimeout(() => el.remove?.(), 180);
  }
  function attach(el) {
    if (!el || el.dataset.dismissReady === '1') return;
    const id = el.id || el.dataset.adId || ('income-ad-' + Math.random().toString(36).slice(2));
    el.dataset.adId = id; el.dataset.dismissReady = '1';
    if (isDismissed(id)) { el.classList.remove('show'); el.style.display = 'none'; return; }
    let button = el.querySelector(':scope > .mxt-income-close');
    if (!button) {
      button = document.createElement('button'); button.type = 'button'; button.className = 'mxt-income-close'; button.setAttribute('aria-label', 'Close income offer'); button.title = 'Close'; button.textContent = '\u00d7';
      el.appendChild(button);
    }
    button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); close(el); }, { once: true });
  }
  function scan(root) { selectors.forEach(s => (root.matches?.(s) ? [root] : [...root.querySelectorAll?.(s) || []]).forEach(attach)); }
  function removeClaimedOffer(button) {
    const offer = button.closest('.mxt-floating-pts,.ad-container,.ad-native,.feed-ad,.mxt-rotating-ad,.mxt-live-ad,.mxt-bottom-shelf-card,.rewarded-ad-container,.mxt-reward-gate,#autoAd,#rwAd,#intsAd,#interstitialOverlay');
    // Let the original reward handler complete before removing its offer card.
    if (offer) setTimeout(() => close(offer), 250);
  }
  document.addEventListener('DOMContentLoaded', () => { scan(document); new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => n.nodeType === 1 && scan(n)))).observe(document.body, { childList: true, subtree: true }); }, { once: true });
  document.addEventListener('click', event => {
    const btn = event.target.closest('button'); if (!btn) return;
    const text = btn.textContent || '';
    const onclick = btn.getAttribute('onclick') || '';
    if (/claimed|claim\s*\+|watch now|tap.*\+|claim reward|spin now/i.test(text) || /addPts\(|claim/i.test(onclick)) removeClaimedOffer(btn);
  }, true);
  // Some offer scripts change a button to “Claimed” after their own click handler.
  // Check again afterwards, then close the exact parent offer.
  document.addEventListener('click', event => {
    const btn = event.target.closest('button'); if (!btn) return;
    const candidate = /claim|watch|spin|quiz|poll|reward|\+\d+\s*pt/i.test((btn.textContent || '') + ' ' + (btn.getAttribute('onclick') || ''));
    if (!candidate) return;
    [80, 500].forEach(delay => window.setTimeout(() => {
      if (/claimed|\+\d+\s*(points?|pts?)\s*(earned|added)?/i.test(btn.textContent || '') || btn.dataset.claimed === '1' || /addPts\(/.test(btn.getAttribute('onclick') || '')) removeClaimedOffer(btn);
    }, delay));
  });
  window.MonetixraAdDismissal = { close, scan, isDismissed };
})();

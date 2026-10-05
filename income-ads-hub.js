/* Contextual, user-controlled income offer inventory. Configure real campaign URLs in window.MONETIXRA_AD_CAMPAIGNS. */
(function () {
  'use strict';
  const fallback = [
    { id: 'creator-tools', type: 'native', title: 'Creator tools', text: 'Discover tools that help creators publish and earn.', media: 'text' },
    { id: 'learning', type: 'video', title: 'Learn & earn', text: 'Short learning and earning opportunities, when available.', media: 'video' },
    { id: 'photo-market', type: 'photo', title: 'Photo marketplace', text: 'Explore photography and creative marketplace offers.', media: 'photo' }
  ];
  function campaigns() { const list = window.MONETIXRA_AD_CAMPAIGNS; return Array.isArray(list) && list.length ? list : fallback; }
  function next(placement) { const list = campaigns().filter(a => !a.placement || a.placement === placement); return (list.length ? list : campaigns())[Math.floor(Math.random() * (list.length || 1))]; }
  function render(el, placement) {
    if (!el || el.dataset.incomeRendered === '1') return;
    const ad = next(placement); if (!ad) return;
    el.dataset.incomeRendered = '1'; el.dataset.adId = 'income-' + ad.id;
    el.innerHTML = `<div class="mxt-income-label">Income ad · ${ad.type || 'native'}</div><strong>${ad.title}</strong><span>${ad.text || ''}</span>${ad.url ? '<a class="mxt-income-action" target="_blank" rel="noopener sponsored">View offer</a>' : ''}`;
    const action = el.querySelector('a'); if (action) action.href = ad.url;
  }
  function rotate(el, options) { render(el, options?.type); const interval = Math.max(30000, Number(options?.interval) || 90000); setInterval(() => { if (el.offsetParent !== null) { el.dataset.incomeRendered = ''; render(el, options?.type); } }, interval); }
  window.IncomeAdsHub = { next, render, rotate };
})();

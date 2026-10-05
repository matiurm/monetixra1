(function () {
  function incomeText(value) { return String(value || '').replace(/\bSponsored\b/gi, 'Income ad'); }
  function replaceLabels(root) { const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT); const nodes = []; while (walker.nextNode()) if (/\bSponsored\b/i.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode); nodes.forEach(n => n.nodeValue = incomeText(n.nodeValue)); }
  function setupRotation(el, config) { window.IncomeAdsHub?.rotate(el, config); }
  window.DynamicSponsoredAds = { replaceLabels, setupRotation };
})();

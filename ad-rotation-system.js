// ============================================================
//  Monetixra - Ad Rotation System
//  Rotates through different ad networks on each click
//  Shows different types of ads for maximum engagement
// ============================================================

const AD_NETWORKS = [
  {
    name: 'Google AdSense',
    url: 'https://google.com/adsense',
    type: 'display',
    points: 5,
    description: 'Premium display ads'
  },
  {
    name: 'AdMob',
    url: 'https://admob.google.com',
    type: 'mobile',
    points: 5,
    description: 'Mobile app ads'
  },
  {
    name: 'Adsterra',
    url: 'https://adsterra.com',
    type: 'popunder',
    points: 6,
    description: 'High-CPM popunder ads'
  },
  {
    name: 'PropellerAds',
    url: 'https://propellerads.com',
    type: 'push',
    points: 5,
    description: 'Push notification ads'
  },
  {
    name: 'MGID',
    url: 'https://mgid.com',
    type: 'native',
    points: 4,
    description: 'Native advertising'
  },
  {
    name: 'RevContent',
    url: 'https://revcontent.com',
    type: 'native',
    points: 4,
    description: 'Content recommendation'
  },
  {
    name: 'Taboola',
    url: 'https://taboola.com',
    type: 'native',
    points: 5,
    description: 'Content discovery'
  },
  {
    name: 'Outbrain',
    url: 'https://outbrain.com',
    type: 'native',
    points: 5,
    description: 'Content marketing'
  },
  {
    name: 'Media.net',
    url: 'https://media.net',
    type: 'display',
    points: 4,
    description: 'Contextual ads'
  },
  {
    name: 'Amazon Associates',
    url: 'https://affiliate-program.amazon.com',
    type: 'affiliate',
    points: 7,
    description: 'Affiliate marketing'
  },
  {
    name: 'ClickBank',
    url: 'https://clickbank.com',
    type: 'affiliate',
    points: 7,
    description: 'Digital products'
  },
  {
    name: 'ShareASale',
    url: 'https://shareasale.com',
    type: 'affiliate',
    points: 6,
    description: 'Affiliate network'
  },
  {
    name: 'CJ Affiliate',
    url: 'https://cj.com',
    type: 'affiliate',
    points: 6,
    description: 'Commission Junction'
  },
  {
    name: 'Rakuten Advertising',
    url: 'https://rakutenadvertising.com',
    type: 'affiliate',
    points: 6,
    description: 'Global affiliate'
  },
  {
    name: 'Awin',
    url: 'https://awin.com',
    type: 'affiliate',
    points: 6,
    description: 'Affiliate network'
  }
];

let currentAdIndex = 0;
let adClickHistory = [];

class AdRotationSystem {
  constructor() {
    this.currentNetwork = 0;
    this.clickCount = 0;
    this.rotationEnabled = true;
  }

  // Get next ad network in rotation
  getNextAdNetwork() {
    if (!this.rotationEnabled) {
      return AD_NETWORKS[Math.floor(Math.random() * AD_NETWORKS.length)];
    }

    const network = AD_NETWORKS[this.currentNetwork];
    this.currentNetwork = (this.currentNetwork + 1) % AD_NETWORKS.length;
    this.clickCount++;

    return network;
  }

  // Get random ad network
  getRandomAdNetwork() {
    return AD_NETWORKS[Math.floor(Math.random() * AD_NETWORKS.length)];
  }

  // Get ad network by type
  getAdNetworkByType(type) {
    const filtered = AD_NETWORKS.filter(n => n.type === type);
    if (filtered.length === 0) {
      return this.getRandomAdNetwork();
    }
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  // Open ad in new window
  openAd(network) {
    // Track click
    adClickHistory.push({
      network: network.name,
      url: network.url,
      timestamp: Date.now(),
      points: network.points
    });

    // Open in new window
    window.open(network.url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');

    // Return points for this ad
    return network.points;
  }

  // Show ad with rotation
  showRotatedAd() {
    const network = this.getNextAdNetwork();
    const points = this.openAd(network);

    // Show notification
    if (typeof toast === 'function') {
      toast('i', `📺 Watching ${network.name} ad (+${points} pts)`);
    }

    return points;
  }

  // Get click statistics
  getClickStats() {
    const stats = {};
    adClickHistory.forEach(click => {
      stats[click.network] = (stats[click.network] || 0) + 1;
    });
    return {
      total: this.clickCount,
      byNetwork: stats,
      history: adClickHistory.slice(-10) // Last 10 clicks
    };
  }

  // Reset rotation
  resetRotation() {
    this.currentNetwork = 0;
    this.clickCount = 0;
    adClickHistory = [];
  }

  // Enable/disable rotation
  setRotation(enabled) {
    this.rotationEnabled = enabled;
  }
}

// Create global instance
const adRotationSystem = new AdRotationSystem();

// Enhanced watchAd function with ad rotation
function watchAdWithRotation() {
  if (typeof CU === 'undefined' || !CU) {
    if (typeof toast === 'function') {
      toast('e', 'Please sign in first');
    }
    return;
  }

  let u = typeof D !== 'undefined' && D.users ? D.users[CU.id] : CU;
  
  // Quick cooldown
  let lastAd = u.lastAdTime || 0;
  let cooldown = 3000;
  if (Date.now() - lastAd < cooldown) {
    let wait = Math.ceil((cooldown - (Date.now() - lastAd)) / 1000);
    if (typeof toast === 'function') {
      toast('w', `⏱ Wait ${wait}s before next ad`);
    }
    return;
  }

  // Get next ad network
  const network = adRotationSystem.getNextAdNetwork();
  
  // Open ad
  window.open(network.url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  
  // Update user data
  u.lastAdTime = Date.now();
  let today = new Date().toDateString();
  if (!u.todayAds || u.todayAds.date !== today) {
    u.todayAds = { date: today, count: 0 };
  }
  u.todayAds.count++;
  CU.adViews = (CU.adViews || 0) + 1;
  
  // Add points
  if (typeof addPts === 'function') {
    addPts(network.points, `Watched ${network.name} Ad`);
  } else {
    u.points = (u.points || 0) + network.points;
  }
  
  // Save data
  if (typeof saveData === 'function') {
    saveData();
  }
  
  // Show notification
  if (typeof toast === 'function') {
    toast('s', `📺 +${network.points} pts from ${network.name}!`);
  }
}

// Show ad statistics
function showAdStats() {
  const stats = adRotationSystem.getClickStats();
  console.log('[AdRotation] Statistics:', stats);
  
  if (typeof toast === 'function') {
    toast('i', `📊 Total ads watched: ${stats.total}`);
  }
  
  return stats;
}

// Export for use
window.AdRotationSystem = adRotationSystem;
window.watchAdWithRotation = watchAdWithRotation;
window.showAdStats = showAdStats;

console.log('[AdRotation] System loaded ✅');
console.log('[AdRotation] Available networks:', AD_NETWORKS.length);

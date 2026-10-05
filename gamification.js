/**
 * ================================================================
 *  GAMIFICATION SYSTEM (ENHANCED)
 *  In-call Games | Achievement Badges | Leaderboard
 *  Call Streak | Chat Milestones | Social Score
 *  NFT Rewards | Social Trading | Tournament System
 * ================================================================
 */

const Gamification = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    version: '2.0.0',
    enableBadges: true,
    enableLeaderboard: true,
    enableGames: true,
    maxLeaderboardEntries: 100,
    enableNFTRewards: true,
    enableSocialTrading: true,
    enableTournamentSystem: true
  };

  // State
  let state = {
    userBadges: new Map(),
    userPoints: new Map(),
    userStreaks: new Map(),
    leaderboard: [],
    activeGames: new Map(),
    achievements: [],
    nftRewards: new Map(),
    marketplace: new Map(),
    tournaments: new Map(),
    tournamentParticipants: new Map()
  };

  // Achievement definitions
  const ACHIEVEMENTS = {
    first_call: {
      id: 'first_call',
      name: 'First Call',
      description: 'Make your first call',
      icon: '📞',
      points: 10,
      category: 'calls'
    },
    call_streak_7: {
      id: 'call_streak_7',
      name: 'Weekly Caller',
      description: 'Make calls for 7 consecutive days',
      icon: '🔥',
      points: 50,
      category: 'streaks'
    },
    call_streak_30: {
      id: 'call_streak_30',
      name: 'Monthly Caller',
      description: 'Make calls for 30 consecutive days',
      icon: '💎',
      points: 200,
      category: 'streaks'
    },
    hundred_calls: {
      id: 'hundred_calls',
      name: 'Centurion',
      description: 'Complete 100 calls',
      icon: '🏆',
      points: 100,
      category: 'calls'
    },
    thousand_calls: {
      id: 'thousand_calls',
      name: 'Call Master',
      description: 'Complete 1000 calls',
      icon: '👑',
      points: 500,
      category: 'calls'
    },
    social_butterfly: {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Chat with 50 different people',
      icon: '🦋',
      points: 75,
      category: 'social'
    },
    night_owl: {
      id: 'night_owl',
      name: 'Night Owl',
      description: 'Make a call after midnight',
      icon: '🦉',
      points: 25,
      category: 'special'
    },
    early_bird: {
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Make a call before 6 AM',
      icon: '🐦',
      points: 25,
      category: 'special'
    },
    long_call: {
      id: 'long_call',
      name: 'Marathon Caller',
      description: 'Complete a call longer than 1 hour',
      icon: '⏱️',
      points: 100,
      category: 'calls'
    },
    group_call_master: {
      id: 'group_call_master',
      name: 'Party Host',
      description: 'Host a group call with 5+ participants',
      icon: '🎉',
      points: 150,
      category: 'social'
    },
    screen_sharer: {
      id: 'screen_sharer',
      name: 'Screen Sharer',
      description: 'Share your screen 10 times',
      icon: '🖥️',
      points: 50,
      category: 'features'
    },
    video_pro: {
      id: 'video_pro',
      name: 'Video Pro',
      description: 'Use video effects 50 times',
      icon: '🎬',
      points: 75,
      category: 'features'
    },
    translator: {
      id: 'translator',
      name: 'Polyglot',
      description: 'Use translation feature 20 times',
      icon: '🌍',
      points: 50,
      category: 'features'
    },
    collaborator: {
      id: 'collaborator',
      name: 'Team Player',
      description: 'Use whiteboard 10 times',
      icon: '🎨',
      points: 50,
      category: 'features'
    },
    top_chatter: {
      id: 'top_chatter',
      name: 'Chatterbox',
      description: 'Send 1000 messages',
      icon: '💬',
      points: 100,
      category: 'chat'
    },
    helpful_friend: {
      id: 'helpful_friend',
      name: 'Helpful Friend',
      description: 'Respond to messages within 1 minute 100 times',
      icon: '❤️',
      points: 75,
      category: 'social'
    }
  };

  // Game definitions
  const GAMES = {
    trivia: {
      id: 'trivia',
      name: 'Trivia Quiz',
      description: 'Answer trivia questions together',
      icon: '❓',
      minPlayers: 2,
      maxPlayers: 10
    },
    rock_paper_scissors: {
      id: 'rock_paper_scissors',
      name: 'Rock Paper Scissors',
      description: 'Classic hand game',
      icon: '✊',
      minPlayers: 2,
      maxPlayers: 2
    },
    emoji_guess: {
      id: 'emoji_guess',
      name: 'Emoji Guess',
      description: 'Guess the word from emojis',
      icon: '😀',
      minPlayers: 2,
      maxPlayers: 10
    },
    drawing: {
      id: 'drawing',
      name: 'Pictionary',
      description: 'Draw and guess',
      icon: '🎨',
      minPlayers: 2,
      maxPlayers: 10
    },
    word_chain: {
      id: 'word_chain',
      name: 'Word Chain',
      description: 'Build a word chain',
      icon: '🔗',
      minPlayers: 2,
      maxPlayers: 10
    }
  };

  // ============================================
  // ACHIEVEMENT SYSTEM
  // ============================================

  function unlockBadge(userId, achievementId) {
    try {
      if (!CONFIG.enableBadges) {
        return false;
      }

      const achievement = ACHIEVEMENTS[achievementId];
      if (!achievement) {
        console.warn('[Gamification] Invalid achievement:', achievementId);
        return false;
      }

      // Get user badges
      const userBadges = state.userBadges.get(userId) || new Set();

      // Check if already unlocked
      if (userBadges.has(achievementId)) {
        return false;
      }

      // Unlock badge
      userBadges.add(achievementId);
      state.userBadges.set(userId, userBadges);

      // Award points
      awardPoints(userId, achievement.points);

      // Save to storage
      saveUserBadges(userId);

      // Notify user
      if (userId === CU?.id && typeof toast === 'function') {
        toast('s', `🎉 Achievement Unlocked: ${achievement.name} (+${achievement.points} points)`);
      }

      // Broadcast
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('gamification:badge-unlocked', {
          userId,
          achievementId,
          achievement
        });
      }

      console.log('[Gamification] Badge unlocked:', achievementId, 'for user:', userId);
      return true;
    } catch (error) {
      console.error('[Gamification] Unlock badge failed:', error);
      return false;
    }
  }

  function hasBadge(userId, achievementId) {
    const userBadges = state.userBadges.get(userId) || new Set();
    return userBadges.has(achievementId);
  }

  function getUserBadges(userId) {
    const userBadges = state.userBadges.get(userId) || new Set();
    return Array.from(userBadges).map(id => ACHIEVEMENTS[id]).filter(Boolean);
  }

  function checkAchievements(userId, activityType, metadata = {}) {
    try {
      const achievements = [];

      switch (activityType) {
        case 'call_completed':
          achievements.push('first_call');
          if (metadata.duration > 3600000) { // 1 hour
            achievements.push('long_call');
          }
          if (metadata.hour >= 0 && metadata.hour < 6) {
            achievements.push('night_owl');
          }
          if (metadata.hour >= 6 && metadata.hour < 9) {
            achievements.push('early_bird');
          }
          break;

        case 'group_call':
          if (metadata.participantCount >= 5) {
            achievements.push('group_call_master');
          }
          break;

        case 'screen_share':
          achievements.push('screen_sharer');
          break;

        case 'video_effect':
          achievements.push('video_pro');
          break;

        case 'translation':
          achievements.push('translator');
          break;

        case 'whiteboard':
          achievements.push('collaborator');
          break;

        case 'message_sent':
          achievements.push('top_chatter');
          break;

        case 'quick_response':
          achievements.push('helpful_friend');
          break;
      }

      // Check and unlock achievements
      achievements.forEach(achievementId => {
        unlockBadge(userId, achievementId);
      });

      // Check streak achievements
      checkStreakAchievements(userId);
    } catch (error) {
      console.error('[Gamification] Check achievements failed:', error);
    }
  }

  // ============================================
  // STREAK SYSTEM
  // ============================================

  function updateStreak(userId, activityType) {
    try {
      const today = new Date().toDateString();
      const userStreaks = state.userStreaks.get(userId) || {};

      if (!userStreaks[activityType]) {
        userStreaks[activityType] = {
          current: 0,
          longest: 0,
          lastDate: null
        };
      }

      const streak = userStreaks[activityType];

      if (streak.lastDate === today) {
        // Already updated today
        return streak.current;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (streak.lastDate === yesterday.toDateString()) {
        // Consecutive day
        streak.current++;
      } else if (streak.lastDate !== today) {
        // Streak broken
        streak.current = 1;
      }

      streak.lastDate = today;
      streak.longest = Math.max(streak.longest, streak.current);

      state.userStreaks.set(userId, userStreaks);
      saveUserStreaks(userId);

      console.log('[Gamification] Streak updated:', activityType, 'for user:', userId, 'streak:', streak.current);
      return streak.current;
    } catch (error) {
      console.error('[Gamification] Update streak failed:', error);
      return 0;
    }
  }

  function checkStreakAchievements(userId) {
    const userStreaks = state.userStreaks.get(userId) || {};
    const callStreak = userStreaks['call']?.current || 0;

    if (callStreak >= 7) {
      unlockBadge(userId, 'call_streak_7');
    }
    if (callStreak >= 30) {
      unlockBadge(userId, 'call_streak_30');
    }
  }

  function getStreak(userId, activityType) {
    const userStreaks = state.userStreaks.get(userId) || {};
    return userStreaks[activityType]?.current || 0;
  }

  // ============================================
  // POINTS SYSTEM
  // ============================================

  function awardPoints(userId, points) {
    try {
      const currentPoints = state.userPoints.get(userId) || 0;
      const newPoints = currentPoints + points;
      state.userPoints.set(userId, newPoints);

      // Update CU if it's the current user
      if (userId === CU?.id) {
        CU.points = newPoints;
        if (typeof saveData === 'function') {
          saveData();
        }
      }

      // Save to storage
      saveUserPoints(userId);

      // Update leaderboard
      updateLeaderboard(userId, newPoints);

      console.log('[Gamification] Points awarded:', points, 'to user:', userId, 'total:', newPoints);
      return newPoints;
    } catch (error) {
      console.error('[Gamification] Award points failed:', error);
      return 0;
    }
  }

  function getUserPoints(userId) {
    return state.userPoints.get(userId) || 0;
  }

  // ============================================
  // LEADERBOARD
  // ============================================

  function updateLeaderboard(userId, points) {
    try {
      if (!CONFIG.enableLeaderboard) {
        return;
      }

      // Remove existing entry
      state.leaderboard = state.leaderboard.filter(entry => entry.userId !== userId);

      // Add new entry
      state.leaderboard.push({
        userId: userId,
        points: points,
        username: D?.users?.[userId]?.username || 'Unknown',
        avatar: D?.users?.[userId]?.avatar || null,
        updatedAt: Date.now()
      });

      // Sort by points
      state.leaderboard.sort((a, b) => b.points - a.points);

      // Keep only top entries
      if (state.leaderboard.length > CONFIG.maxLeaderboardEntries) {
        state.leaderboard = state.leaderboard.slice(0, CONFIG.maxLeaderboardEntries);
      }

      // Save leaderboard
      saveLeaderboard();

      console.log('[Gamification] Leaderboard updated');
    } catch (error) {
      console.error('[Gamification] Update leaderboard failed:', error);
    }
  }

  function getLeaderboard(limit = 10) {
    return state.leaderboard.slice(0, limit);
  }

  function getLeaderboardPosition(userId) {
    const position = state.leaderboard.findIndex(entry => entry.userId === userId);
    return position >= 0 ? position + 1 : null;
  }

  // ============================================
  // IN-CALL GAMES
  // ============================================

  function startGame(gameId, roomId, options = {}) {
    try {
      if (!CONFIG.enableGames) {
        return null;
      }

      const game = GAMES[gameId];
      if (!game) {
        console.warn('[Gamification] Invalid game:', gameId);
        return null;
      }

      const gameSession = {
        id: 'game_' + Date.now(),
        gameId: gameId,
        roomId: roomId,
        name: game.name,
        participants: new Set(),
        state: 'waiting',
        data: {},
        createdAt: Date.now()
      };

      state.activeGames.set(gameSession.id, gameSession);

      // Notify via socket
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('game:start', {
          gameId,
          roomId,
          gameSession
        });
      }

      console.log('[Gamification] Game started:', gameId);
      return gameSession;
    } catch (error) {
      console.error('[Gamification] Start game failed:', error);
      return null;
    }
  }

  function joinGame(gameSessionId, userId) {
    try {
      const gameSession = state.activeGames.get(gameSessionId);
      if (!gameSession) {
        return false;
      }

      gameSession.participants.add(userId);

      // Notify via socket
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('game:join', {
          gameSessionId,
          userId
        });
      }

      console.log('[Gamification] User joined game:', userId);
      return true;
    } catch (error) {
      console.error('[Gamification] Join game failed:', error);
      return false;
    }
  }

  function endGame(gameSessionId, winnerId = null) {
    try {
      const gameSession = state.activeGames.get(gameSessionId);
      if (!gameSession) {
        return false;
      }

      gameSession.state = 'ended';
      gameSession.endedAt = Date.now();
      gameSession.winner = winnerId;

      // Award points to winner
      if (winnerId) {
        awardPoints(winnerId, 25);
      }

      // Award participation points
      gameSession.participants.forEach(userId => {
        if (userId !== winnerId) {
          awardPoints(userId, 10);
        }
      });

      // Notify via socket
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('game:end', {
          gameSessionId,
          winnerId
        });
      }

      console.log('[Gamification] Game ended:', gameSessionId);
      return true;
    } catch (error) {
      console.error('[Gamification] End game failed:', error);
      return false;
    }
  }

  function getAvailableGames() {
    return Object.keys(GAMES).map(id => GAMES[id]);
  }

  // ============================================
  // STORAGE
  // ============================================

  function saveUserBadges(userId) {
    try {
      const badges = state.userBadges.get(userId) || new Set();
      localStorage.setItem(`userBadges_${userId}`, JSON.stringify(Array.from(badges)));
    } catch (error) {
      console.error('[Gamification] Save user badges failed:', error);
    }
  }

  function loadUserBadges(userId) {
    try {
      const badges = localStorage.getItem(`userBadges_${userId}`);
      if (badges) {
        state.userBadges.set(userId, new Set(JSON.parse(badges)));
      }
    } catch (error) {
      console.error('[Gamification] Load user badges failed:', error);
    }
  }

  function saveUserStreaks(userId) {
    try {
      const streaks = state.userStreaks.get(userId) || {};
      localStorage.setItem(`userStreaks_${userId}`, JSON.stringify(streaks));
    } catch (error) {
      console.error('[Gamification] Save user streaks failed:', error);
    }
  }

  function loadUserStreaks(userId) {
    try {
      const streaks = localStorage.getItem(`userStreaks_${userId}`);
      if (streaks) {
        state.userStreaks.set(userId, JSON.parse(streaks));
      }
    } catch (error) {
      console.error('[Gamification] Load user streaks failed:', error);
    }
  }

  function saveUserPoints(userId) {
    try {
      const points = state.userPoints.get(userId) || 0;
      localStorage.setItem(`userPoints_${userId}`, points.toString());
    } catch (error) {
      console.error('[Gamification] Save user points failed:', error);
    }
  }

  function loadUserPoints(userId) {
    try {
      const points = localStorage.getItem(`userPoints_${userId}`);
      if (points) {
        state.userPoints.set(userId, parseInt(points));
      }
    } catch (error) {
      console.error('[Gamification] Load user points failed:', error);
    }
  }

  function saveLeaderboard() {
    try {
      localStorage.setItem('leaderboard', JSON.stringify(state.leaderboard));
    } catch (error) {
      console.error('[Gamification] Save leaderboard failed:', error);
    }
  }

  function loadLeaderboard() {
    try {
      const leaderboard = localStorage.getItem('leaderboard');
      if (leaderboard) {
        state.leaderboard = JSON.parse(leaderboard);
      }
    } catch (error) {
      console.error('[Gamification] Load leaderboard failed:', error);
    }
  }

  // ============================================
  // NFT REWARDS
  // ============================================

  function mintNFTBadge(userId, badgeId, metadata = {}) {
    try {
      if (!CONFIG.enableNFTRewards) {
        return null;
      }

      const achievement = ACHIEVEMENTS[badgeId];
      if (!achievement) return null;

      const nft = {
        id: 'nft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        badgeId: badgeId,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        owner: userId,
        mintedAt: Date.now(),
        blockchain: 'ethereum', // In production, use actual blockchain
        tokenId: Math.floor(Math.random() * 1000000),
        metadata: {
          category: achievement.category,
          points: achievement.points,
          rarity: calculateNFT rarity(achievement.points),
          ...metadata
        }
      };

      state.nftRewards.set(nft.id, nft);

      // Save to storage
      saveNFTs(userId);

      console.log('[Gamification] NFT badge minted:', nft.id);
      return nft;
    } catch (error) {
      console.error('[Gamification] NFT minting failed:', error);
      return null;
    }
  }

  function calculateNFT rarity(points) {
    if (points >= 500) return 'legendary';
    if (points >= 200) return 'epic';
    if (points >= 100) return 'rare';
    if (points >= 50) return 'uncommon';
    return 'common';
  }

  function getUserNFTs(userId) {
    try {
      const nfts = Array.from(state.nftRewards.values()).filter(nft => nft.owner === userId);
      return nfts;
    } catch (error) {
      console.error('[Gamification] Get user NFTs failed:', error);
      return [];
    }
  }

  function saveNFTs(userId) {
    try {
      const nfts = getUserNFTs(userId);
      localStorage.setItem(`userNFTs_${userId}`, JSON.stringify(nfts));
    } catch (error) {
      console.error('[Gamification] Save NFTs failed:', error);
    }
  }

  function loadNFTs(userId) {
    try {
      const nfts = localStorage.getItem(`userNFTs_${userId}`);
      if (nfts) {
        const parsed = JSON.parse(nfts);
        parsed.forEach(nft => state.nftRewards.set(nft.id, nft));
      }
    } catch (error) {
      console.error('[Gamification] Load NFTs failed:', error);
    }
  }

  // ============================================
  // SOCIAL TRADING
  // ============================================

  function listNFTForSale(nftId, price, sellerId) {
    try {
      if (!CONFIG.enableSocialTrading) {
        return false;
      }

      const nft = state.nftRewards.get(nftId);
      if (!nft || nft.owner !== sellerId) {
        return false;
      }

      const listing = {
        id: 'listing_' + Date.now(),
        nftId: nftId,
        sellerId: sellerId,
        price: price,
        listedAt: Date.now(),
        status: 'active'
      };

      state.marketplace.set(listing.id, listing);

      console.log('[Gamification] NFT listed for sale:', listing.id);
      return listing;
    } catch (error) {
      console.error('[Gamification] List NFT failed:', error);
      return false;
    }
  }

  function buyNFT(listingId, buyerId) {
    try {
      const listing = state.marketplace.get(listingId);
      if (!listing || listing.status !== 'active') {
        return false;
      }

      const nft = state.nftRewards.get(listing.nftId);
      if (!nft) return false;

      // Check if buyer has enough points
      const buyerPoints = state.userPoints.get(buyerId) || 0;
      if (buyerPoints < listing.price) {
        return false;
      }

      // Transfer NFT
      nft.owner = buyerId;
      nft.transferredAt = Date.now();
      nft.previousOwner = listing.sellerId;

      // Transfer points
      awardPoints(listing.sellerId, listing.price);
      awardPoints(buyerId, -listing.price);

      // Update listing
      listing.status = 'sold';
      listing.buyerId = buyerId;
      listing.soldAt = Date.now();

      // Save
      saveNFTs(buyerId);
      saveNFTs(listing.sellerId);
      saveUserPoints(buyerId);
      saveUserPoints(listing.sellerId);

      console.log('[Gamification] NFT sold:', listingId);
      return true;
    } catch (error) {
      console.error('[Gamification] Buy NFT failed:', error);
      return false;
    }
  }

  function getMarketplaceListings() {
    try {
      const listings = Array.from(state.marketplace.values())
        .filter(l => l.status === 'active');

      return listings.map(listing => ({
        ...listing,
        nft: state.nftRewards.get(listing.nftId)
      }));
    } catch (error) {
      console.error('[Gamification] Get marketplace listings failed:', error);
      return [];
    }
  }

  // ============================================
  // TOURNAMENT SYSTEM
  // ============================================

  function createTournament(options = {}) {
    try {
      if (!CONFIG.enableTournamentSystem) {
        return null;
      }

      const tournament = {
        id: 'tournament_' + Date.now(),
        name: options.name || 'Weekly Championship',
        type: options.type || 'points', // points, games, badges
        startTime: options.startTime || Date.now() + 86400000, // 1 day from now
        duration: options.duration || 604800000, // 7 days
        prizePool: options.prizePool || 10000,
        entryFee: options.entryFee || 0,
        maxParticipants: options.maxParticipants || 100,
        participants: new Set(),
        status: 'open',
        leaderboard: [],
        createdBy: options.createdBy || CU?.id,
        createdAt: Date.now()
      };

      state.tournaments.set(tournament.id, tournament);

      console.log('[Gamification] Tournament created:', tournament.id);
      return tournament;
    } catch (error) {
      console.error('[Gamification] Tournament creation failed:', error);
      return null;
    }
  }

  function joinTournament(tournamentId, userId) {
    try {
      const tournament = state.tournaments.get(tournamentId);
      if (!tournament || tournament.status !== 'open') {
        return false;
      }

      if (tournament.participants.size >= tournament.maxParticipants) {
        return false;
      }

      // Check entry fee
      if (tournament.entryFee > 0) {
        const userPoints = state.userPoints.get(userId) || 0;
        if (userPoints < tournament.entryFee) {
          return false;
        }
        awardPoints(userId, -tournament.entryFee);
      }

      tournament.participants.add(userId);
      tournament.leaderboard.push({
        userId: userId,
        score: 0,
        joinedAt: Date.now()
      });

      console.log('[Gamification] User joined tournament:', userId);
      return true;
    } catch (error) {
      console.error('[Gamification] Join tournament failed:', error);
      return false;
    }
  }

  function updateTournamentScore(tournamentId, userId, score) {
    try {
      const tournament = state.tournaments.get(tournamentId);
      if (!tournament) return false;

      const participant = tournament.leaderboard.find(p => p.userId === userId);
      if (!participant) return false;

      participant.score += score;

      // Sort leaderboard
      tournament.leaderboard.sort((a, b) => b.score - a.score);

      console.log('[Gamification] Tournament score updated:', userId);
      return true;
    } catch (error) {
      console.error('[Gamification] Update tournament score failed:', error);
      return false;
    }
  }

  function endTournament(tournamentId) {
    try {
      const tournament = state.tournaments.get(tournamentId);
      if (!tournament) return false;

      tournament.status = 'completed';
      tournament.endedAt = Date.now();

      // Award prizes
      const prizes = calculatePrizes(tournament);
      tournament.leaderboard.slice(0, prizes.length).forEach((participant, index) => {
        const prize = prizes[index];
        awardPoints(participant.userId, prize.points);
        participant.prize = prize;
      });

      saveTournament(tournamentId);

      console.log('[Gamification] Tournament ended:', tournamentId);
      return tournament;
    } catch (error) {
      console.error('[Gamification] End tournament failed:', error);
      return false;
    }
  }

  function calculatePrizes(tournament) {
    const totalPrize = tournament.prizePool;
    const prizes = [
      { rank: 1, points: Math.floor(totalPrize * 0.5), name: '1st Place' },
      { rank: 2, points: Math.floor(totalPrize * 0.3), name: '2nd Place' },
      { rank: 3, points: Math.floor(totalPrize * 0.15), name: '3rd Place' },
      { rank: 4, points: Math.floor(totalPrize * 0.05), name: '4th Place' }
    ];

    return prizes;
  }

  function getTournamentLeaderboard(tournamentId) {
    const tournament = state.tournaments.get(tournamentId);
    return tournament ? tournament.leaderboard : [];
  }

  function getActiveTournaments() {
    return Array.from(state.tournaments.values())
      .filter(t => t.status === 'open');
  }

  function saveTournament(tournamentId) {
    try {
      const tournament = state.tournaments.get(tournamentId);
      if (tournament) {
        localStorage.setItem(`tournament_${tournamentId}`, JSON.stringify(tournament));
      }
    } catch (error) {
      console.error('[Gamification] Save tournament failed:', error);
    }
  }

  function loadTournament(tournamentId) {
    try {
      const tournamentData = localStorage.getItem(`tournament_${tournamentId}`);
      if (tournamentData) {
        const tournament = JSON.parse(tournamentData);
        state.tournaments.set(tournamentId, tournament);
      }
    } catch (error) {
      console.error('[Gamification] Load tournament failed:', error);
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function initialize(config = {}) {
    if (config.enableBadges !== undefined) {
      CONFIG.enableBadges = config.enableBadges;
    }
    if (config.enableLeaderboard !== undefined) {
      CONFIG.enableLeaderboard = config.enableLeaderboard;
    }
    if (config.enableGames !== undefined) {
      CONFIG.enableGames = config.enableGames;
    }
    if (config.enableNFTRewards !== undefined) {
      CONFIG.enableNFTRewards = config.enableNFTRewards;
    }
    if (config.enableSocialTrading !== undefined) {
      CONFIG.enableSocialTrading = config.enableSocialTrading;
    }
    if (config.enableTournamentSystem !== undefined) {
      CONFIG.enableTournamentSystem = config.enableTournamentSystem;
    }

    // Load current user data
    if (typeof CU !== 'undefined' && CU.id) {
      loadUserBadges(CU.id);
      loadUserStreaks(CU.id);
      loadUserPoints(CU.id);
      loadNFTs(CU.id);
    }

    // Load leaderboard
    loadLeaderboard();

    console.log('[Gamification] Initialized');
    console.log('[Gamification] NFT Rewards:', CONFIG.enableNFTRewards);
    console.log('[Gamification] Social Trading:', CONFIG.enableSocialTrading);
    console.log('[Gamification] Tournament System:', CONFIG.enableTournamentSystem);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    initialize,
    unlockBadge,
    hasBadge,
    getUserBadges,
    checkAchievements,
    updateStreak,
    getStreak,
    awardPoints,
    getUserPoints,
    updateLeaderboard,
    getLeaderboard,
    getLeaderboardPosition,
    startGame,
    joinGame,
    endGame,
    getAvailableGames,
    getAchievements: () => ACHIEVEMENTS,
    // Enhanced features
    mintNFTBadge,
    getUserNFTs,
    listNFTForSale,
    buyNFT,
    getMarketplaceListings,
    createTournament,
    joinTournament,
    updateTournamentScore,
    endTournament,
    getTournamentLeaderboard,
    getActiveTournaments,
    getState: () => state
  };
})();

// Auto-initialize
Gamification.initialize();

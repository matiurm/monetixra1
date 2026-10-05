/**
 * Blockchain Integration for NFT Rewards System
 * Allows users to earn and mint NFTs as rewards
 */

const BlockchainNFT = (function() {
  'use strict';

  // Configuration
  const config = {
    // Ethereum/POlygon network configuration
    network: process.env.BLOCKCHAIN_NETWORK || 'polygon',
    chainId: process.env.CHAIN_ID || '137', // Polygon Mainnet
    rpcUrl: process.env.RPC_URL || 'https://polygon-rpc.com',
    
    // Contract addresses (to be deployed)
    nftContractAddress: process.env.NFT_CONTRACT_ADDRESS || '',
    rewardTokenAddress: process.env.REWARD_TOKEN_ADDRESS || '',
    
    // Wallet configuration
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
    walletAddress: process.env.WALLET_ADDRESS || '',
    
    // NFT configuration
    nftMetadataURI: process.env.NFT_METADATA_URI || 'https://monetixra.com/nft/metadata/',
    nftBasePrice: process.env.NFT_BASE_PRICE || '0.01', // in ETH
    
    // Gas configuration
    gasPrice: process.env.GAS_PRICE || '30000000000', // 30 gwei
    gasLimit: process.env.GAS_LIMIT || '100000'
  };

  // Web3 provider and wallet
  let web3 = null;
  let wallet = null;
  let nftContract = null;
  let rewardTokenContract = null;

  /**
   * Initialize blockchain connection
   */
  async function initialize() {
    try {
      const { ethers } = require('ethers');
      
      // Connect to RPC
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      web3 = provider;
      
      // Create wallet from private key
      if (config.walletPrivateKey) {
        wallet = new ethers.Wallet(config.walletPrivateKey, provider);
        console.log('[Blockchain] Wallet initialized:', wallet.address);
      }
      
      // Initialize contracts if addresses are provided
      if (config.nftContractAddress) {
        // Load NFT contract ABI (simplified)
        const nftABI = [
          'function mint(address to, string memory tokenURI) public',
          'function balanceOf(address owner) public view returns (uint256)',
          'function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)',
          'function tokenURI(uint256 tokenId) public view returns (string)',
          'event Minted(address indexed to, uint256 indexed tokenId)'
        ];
        
        nftContract = new ethers.Contract(config.nftContractAddress, nftABI, wallet || provider);
        console.log('[Blockchain] NFT Contract initialized');
      }
      
      if (config.rewardTokenAddress) {
        // Load Reward Token contract ABI (simplified)
        const tokenABI = [
          'function transfer(address to, uint256 amount) public',
          'function balanceOf(address owner) public view returns (uint256)',
          'function approve(address spender, uint256 amount) public',
          'function mint(address to, uint256 amount) public'
        ];
        
        rewardTokenContract = new ethers.Contract(config.rewardTokenAddress, tokenABI, wallet || provider);
        console.log('[Blockchain] Reward Token Contract initialized');
      }
      
      return { success: true, message: 'Blockchain initialized successfully' };
    } catch (error) {
      console.error('[Blockchain] Initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mint NFT for user reward
   */
  async function mintNFT(userAddress, metadata) {
    try {
      if (!wallet) {
        throw new Error('Wallet not initialized');
      }
      
      if (!nftContract) {
        throw new Error('NFT Contract not initialized');
      }
      
      // Generate token URI from metadata
      const tokenId = Date.now();
      const tokenURI = `${config.nftMetadataURI}${tokenId}.json`;
      
      // Mint NFT
      const tx = await nftContract.mint(userAddress, tokenURI, {
        gasPrice: config.gasPrice,
        gasLimit: config.gasLimit
      });
      
      console.log('[Blockchain] NFT Mint transaction:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[Blockchain] NFT Mint confirmed:', receipt);
      
      return {
        success: true,
        transactionHash: tx.hash,
        tokenId,
        tokenURI,
        blockNumber: receipt.blockNumber,
        userAddress
      };
    } catch (error) {
      console.error('[Blockchain] Mint NFT error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transfer reward tokens to user
   */
  async function transferRewardTokens(userAddress, amount) {
    try {
      if (!wallet) {
        throw new Error('Wallet not initialized');
      }
      
      if (!rewardTokenContract) {
        throw new Error('Reward Token Contract not initialized');
      }
      
      // Convert amount to wei
      const { ethers } = require('ethers');
      const amountWei = ethers.parseEther(amount.toString());
      
      // Transfer tokens
      const tx = await rewardTokenContract.transfer(userAddress, amountWei, {
        gasPrice: config.gasPrice,
        gasLimit: config.gasLimit
      });
      
      console.log('[Blockchain] Token Transfer transaction:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[Blockchain] Token Transfer confirmed:', receipt);
      
      return {
        success: true,
        transactionHash: tx.hash,
        amount,
        blockNumber: receipt.blockNumber,
        userAddress
      };
    } catch (error) {
      console.error('[Blockchain] Transfer tokens error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's NFT balance
   */
  async function getUserNFTBalance(userAddress) {
    try {
      if (!nftContract) {
        throw new Error('NFT Contract not initialized');
      }
      
      const balance = await nftContract.balanceOf(userAddress);
      
      // Get all token IDs owned by user
      const tokens = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(userAddress, i);
        const tokenURI = await nftContract.tokenURI(tokenId);
        tokens.push({ tokenId: tokenId.toString(), tokenURI });
      }
      
      return {
        success: true,
        balance: balance.toString(),
        tokens
      };
    } catch (error) {
      console.error('[Blockchain] Get NFT balance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's reward token balance
   */
  async function getUserTokenBalance(userAddress) {
    try {
      if (!rewardTokenContract) {
        throw new Error('Reward Token Contract not initialized');
      }
      
      const balance = await rewardTokenContract.balanceOf(userAddress);
      
      // Convert from wei to ether
      const { ethers } = require('ethers');
      const balanceEther = ethers.formatEther(balance);
      
      return {
        success: true,
        balance: balanceEther,
        balanceWei: balance.toString()
      };
    } catch (error) {
      console.error('[Blockchain] Get token balance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create NFT metadata
   */
  function createNFTMetadata(metadata) {
    return {
      name: metadata.name || 'Monetixra Reward NFT',
      description: metadata.description || 'Exclusive NFT reward from Monetixra',
      image: metadata.image || 'https://monetixra.com/nft/default.png',
      attributes: [
        {
          trait_type: 'Type',
          value: metadata.type || 'Reward'
        },
        {
          trait_type: 'Rarity',
          value: metadata.rarity || 'Common'
        },
        {
          trait_type: 'Points Earned',
          value: metadata.points || 0
        },
        {
          trait_type: 'Date Earned',
          value: new Date().toISOString()
        },
        ...(metadata.attributes || [])
      ],
      external_url: 'https://monetixra.com',
      animation_url: metadata.animationUrl || null
    };
  }

  /**
   * Reward user with NFT based on achievement
   */
  async function rewardUserWithNFT(userId, userAddress, achievement) {
    try {
      // Get user data
      const user = D.users[userId];
      if (!user) {
        throw new Error('User not found');
      }
      
      // Create NFT metadata based on achievement
      const metadata = createNFTMetadata({
        name: `${achievement.name} Achievement`,
        description: achievement.description,
        image: achievement.imageUrl,
        type: 'Achievement',
        rarity: achievement.rarity || 'Common',
        points: achievement.points || 0,
        attributes: [
          {
            trait_type: 'Achievement',
            value: achievement.name
          },
          {
            trait_type: 'User',
            value: user.username
          }
        ]
      });
      
      // Mint NFT
      const result = await mintNFT(userAddress, metadata);
      
      if (result.success) {
        // Update user's NFT records
        if (!user.nfts) user.nfts = [];
        user.nfts.push({
          tokenId: result.tokenId,
          tokenURI: result.tokenURI,
          transactionHash: result.transactionHash,
          mintedAt: new Date().toISOString(),
          achievement: achievement.name
        });
        
        console.log('[Blockchain] User rewarded with NFT:', userId, result.tokenId);
      }
      
      return result;
    } catch (error) {
      console.error('[Blockchain] Reward user with NFT error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert points to reward tokens
   */
  async function convertPointsToTokens(userId, userAddress, points) {
    try {
      const user = D.users[userId];
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.pts < points) {
        throw new Error('Insufficient points');
      }
      
      // Conversion rate: 1000 points = 1 token
      const tokenAmount = points / 1000;
      
      // Deduct points
      user.pts -= points;
      
      // Transfer tokens
      const result = await transferRewardTokens(userAddress, tokenAmount);
      
      if (result.success) {
        // Record transaction
        if (!D.txs) D.txs = [];
        D.txs.push({
          id: Date.now(),
          uid: userId,
          typ: 'token_exchange',
          pts: -points,
          desc: `Converted ${points} points to ${tokenAmount} tokens`,
          at: Date.now(),
          txHash: result.transactionHash
        });
        
        console.log('[Blockchain] Points converted to tokens:', userId, points, tokenAmount);
      }
      
      return result;
    } catch (error) {
      console.error('[Blockchain] Convert points to tokens error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get blockchain status
   */
  async function getStatus() {
    try {
      const { ethers } = require('ethers');
      
      const blockNumber = await web3.getBlockNumber();
      const gasPrice = await web3.getFeeData();
      
      return {
        success: true,
        network: config.network,
        chainId: config.chainId,
        blockNumber: blockNumber.toString(),
        gasPrice: gasPrice.gasPrice?.toString() || '0',
        walletConnected: !!wallet,
        walletAddress: wallet?.address || null,
        nftContractConnected: !!nftContract,
        rewardTokenConnected: !!rewardTokenContract
      };
    } catch (error) {
      console.error('[Blockchain] Get status error:', error);
      return { success: false, error: error.message };
    }
  }

  return {
    initialize,
    mintNFT,
    transferRewardTokens,
    getUserNFTBalance,
    getUserTokenBalance,
    createNFTMetadata,
    rewardUserWithNFT,
    convertPointsToTokens,
    getStatus,
    config
  };
})();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlockchainNFT;
} else {
  window.BlockchainNFT = BlockchainNFT;
}

/**
 * Web3 & Blockchain Integration for Monetixra
 * Features: WalletConnect, Smart Contracts, NFT Marketplace, Zero-Knowledge Proofs
 */

const Web3Integration = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    WALLETCONNECT_PROJECT_ID: process.env.WALLETCONNECT_PROJECT_ID || '',
    REWARD_CONTRACT_ADDRESS: process.env.REWARD_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
    NFT_CONTRACT_ADDRESS: process.env.NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
    SUPPORTED_CHAINS: {
      ETHEREUM: { chainId: '0x1', name: 'Ethereum Mainnet', currency: 'ETH' },
      POLYGON: { chainId: '0x89', name: 'Polygon Mainnet', currency: 'MATIC' },
      BSC: { chainId: '0x38', name: 'BNB Smart Chain', currency: 'BNB' },
      ARBITRUM: { chainId: '0xa4b1', name: 'Arbitrum One', currency: 'ETH' }
    }
  };

  // State
  let walletState = {
    connected: false,
    address: null,
    chainId: null,
    balance: null,
    provider: null,
    signer: null
  };

  let web3Modal = null;
  let web3Instance = null;

  // Initialize Web3Modal
  async function initWeb3Modal() {
    try {
      // Dynamic import of Web3Modal
      const { default: Web3Modal } = await import('@web3modal/standalone');
      
      web3Modal = new Web3Modal({
        projectId: CONFIG.WALLETCONNECT_PROJECT_ID,
        walletConnectVersion: 2,
        themeMode: 'dark',
        themeVariables: {
          '--w3m-z-index': '999999'
        }
      });

      console.log('[Web3] Web3Modal initialized');
      return true;
    } catch (error) {
      console.error('[Web3] Web3Modal init failed:', error);
      return false;
    }
  }

  // Connect Wallet
  async function connectWallet() {
    try {
      if (!web3Modal) {
        await initWeb3Modal();
      }

      const instance = await web3Modal.connect();
      const provider = await instance.provider;
      
      // Get provider
      const { ethers } = await import('ethers');
      web3Instance = new ethers.BrowserProvider(provider);
      const signer = await web3Instance.getSigner();
      const address = await signer.getAddress();
      const balance = await web3Instance.getBalance(address);
      const network = await web3Instance.getNetwork();

      walletState = {
        connected: true,
        address: address,
        chainId: network.chainId.toString(16),
        balance: ethers.formatEther(balance),
        provider: provider,
        signer: signer
      };

      console.log('[Web3] Wallet connected:', walletState);
      
      // Save to user profile
      if (typeof CU !== 'undefined') {
        CU.walletAddress = address;
        CU.chainId = walletState.chainId;
        if (typeof saveData === 'function') saveData();
      }

      toast('s', '✅ Wallet connected successfully');
      return walletState;
    } catch (error) {
      console.error('[Web3] Wallet connection failed:', error);
      toast('e', '❌ Wallet connection failed');
      return null;
    }
  }

  // Disconnect Wallet
  async function disconnectWallet() {
    try {
      if (web3Modal) {
        await web3Modal.clearCachedProvider();
      }

      walletState = {
        connected: false,
        address: null,
        chainId: null,
        balance: null,
        provider: null,
        signer: null
      };

      // Remove from user profile
      if (typeof CU !== 'undefined') {
        delete CU.walletAddress;
        delete CU.chainId;
        if (typeof saveData === 'function') saveData();
      }

      console.log('[Web3] Wallet disconnected');
      toast('s', '✅ Wallet disconnected');
      return true;
    } catch (error) {
      console.error('[Web3] Wallet disconnect failed:', error);
      toast('e', '❌ Wallet disconnect failed');
      return false;
    }
  }

  // Switch Network
  async function switchNetwork(chainId) {
    try {
      if (!walletState.provider) {
        toast('e', '❌ Please connect wallet first');
        return false;
      }

      const targetChain = Object.values(CONFIG.SUPPORTED_CHAINS).find(c => c.chainId === chainId);
      if (!targetChain) {
        toast('e', '❌ Unsupported network');
        return false;
      }

      await walletState.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainId }]
      });

      walletState.chainId = chainId;
      console.log('[Web3] Network switched to:', targetChain.name);
      toast('s', `✅ Switched to ${targetChain.name}`);
      return true;
    } catch (error) {
      console.error('[Web3] Network switch failed:', error);
      
      // Try to add network if it doesn't exist
      if (error.code === 4902) {
        try {
          const targetChain = Object.values(CONFIG.SUPPORTED_CHAINS).find(c => c.chainId === chainId);
          await walletState.provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainId,
              chainName: targetChain.name,
              nativeCurrency: {
                name: targetChain.currency,
                symbol: targetChain.currency,
                decimals: 18
              },
              rpcUrls: ['https://rpc.ankr.com/eth'],
              blockExplorerUrls: ['https://etherscan.io']
            }]
          });
          return true;
        } catch (addError) {
          console.error('[Web3] Add network failed:', addError);
          toast('e', '❌ Failed to add network');
          return false;
        }
      }
      
      toast('e', '❌ Network switch failed');
      return false;
    }
  }

  // Get Balance
  async function getBalance() {
    try {
      if (!walletState.connected || !walletState.address) {
        return null;
      }

      const balance = await web3Instance.getBalance(walletState.address);
      const formattedBalance = ethers.formatEther(balance);
      walletState.balance = formattedBalance;
      
      return formattedBalance;
    } catch (error) {
      console.error('[Web3] Get balance failed:', error);
      return null;
    }
  }

  // ── Smart Contract Functions ────────────────────────────────────────────

  // Simple ERC20 ABI (standard functions)
  const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)'
  ];

  // Simple Reward Contract ABI
  const REWARD_CONTRACT_ABI = [
    'function distributeReward(address user, uint256 amount) external',
    'function getUserBalance(address user) view returns (uint256)',
    'function withdrawReward(uint256 amount) external',
    'event RewardDistributed(address indexed user, uint256 amount)',
    'event RewardWithdrawn(address indexed user, uint256 amount)'
  ];

  // Simple NFT Contract ABI
  const NFT_CONTRACT_ABI = [
    'function mint(address to, string memory tokenURI) external',
    'function transferFrom(address from, address to, uint256 tokenId) external',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function balanceOf(address owner) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    'event Minted(address indexed to, uint256 tokenId)'
  ];

  function getEthers() {
    if (typeof window !== 'undefined' && window.ethers) return window.ethers;
    if (typeof require !== 'undefined') {
      try { return require('ethers'); } catch (e) { }
    }
    return null;
  }

  // Get Contract Instance
  function getContract(address, abi) {
    if (!walletState.signer) {
      console.error('[Web3] No signer available');
      return null;
    }
    
    const ethers = getEthers();
    if (!ethers) return null;
    return new ethers.Contract(address, abi, walletState.signer);
  }

  // Distribute Rewards On-Chain
  async function distributeRewardsOnChain(userId, amount) {
    try {
      if (!walletState.connected) {
        toast('e', '❌ Please connect wallet first');
        return false;
      }

      const rewardContract = getContract(CONFIG.REWARD_CONTRACT_ADDRESS, REWARD_CONTRACT_ABI);
      if (!rewardContract) {
        toast('e', '❌ Reward contract not available');
        return false;
      }

      // Convert amount to wei
      const ethers = getEthers();
      if (!ethers) return false;
      const amountInWei = ethers.parseEther(amount.toString());

      // Call distribute reward
      const tx = await rewardContract.distributeReward(userId, amountInWei);
      console.log('[Web3] Reward distribution transaction:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[Web3] Reward distribution confirmed:', receipt);

      toast('s', '✅ Rewards distributed on-chain');
      return receipt;
    } catch (error) {
      console.error('[Web3] Reward distribution failed:', error);
      toast('e', '❌ Reward distribution failed');
      return null;
    }
  }

  // Withdraw Rewards
  async function withdrawRewards(amount) {
    try {
      if (!walletState.connected) {
        toast('e', '❌ Please connect wallet first');
        return false;
      }

      const rewardContract = getContract(CONFIG.REWARD_CONTRACT_ADDRESS, REWARD_CONTRACT_ABI);
      if (!rewardContract) {
        toast('e', '❌ Reward contract not available');
        return false;
      }

      // Convert amount to wei
      const ethers = getEthers();
      if (!ethers) return false;
      const amountInWei = ethers.parseEther(amount.toString());

      // Call withdraw
      const tx = await rewardContract.withdrawReward(amountInWei);
      console.log('[Web3] Withdraw transaction:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[Web3] Withdraw confirmed:', receipt);

      toast('s', '✅ Rewards withdrawn successfully');
      return receipt;
    } catch (error) {
      console.error('[Web3] Withdraw failed:', error);
      toast('e', '❌ Withdraw failed');
      return null;
    }
  }

  // ── NFT Marketplace Functions ────────────────────────────────────────────

  // Mint NFT
  async function mintNFT(to, tokenURI) {
    try {
      if (!walletState.connected) {
        toast('e', '❌ Please connect wallet first');
        return false;
      }

      const nftContract = getContract(CONFIG.NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI);
      if (!nftContract) {
        toast('e', '❌ NFT contract not available');
        return false;
      }

      // Call mint
      const tx = await nftContract.mint(to, tokenURI);
      console.log('[Web3] NFT mint transaction:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[Web3] NFT mint confirmed:', receipt);

      // Extract tokenId from event
      const mintEvent = receipt.logs.find(log => {
        try {
          const parsed = nftContract.interface.parseLog(log);
          return parsed.name === 'Minted';
        } catch {
          return false;
        }
      });

      const tokenId = mintEvent ? mintEvent.args.tokenId.toString() : null;
      toast('s', `✅ NFT minted successfully (Token ID: ${tokenId})`);
      
      return { receipt, tokenId };
    } catch (error) {
      console.error('[Web3] NFT mint failed:', error);
      toast('e', '❌ NFT mint failed');
      return null;
    }
  }

  // Transfer NFT
  async function transferNFT(from, to, tokenId) {
    try {
      if (!walletState.connected) {
        toast('e', '❌ Please connect wallet first');
        return false;
      }

      const nftContract = getContract(CONFIG.NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI);
      if (!nftContract) {
        toast('e', '❌ NFT contract not available');
        return false;
      }

      // Call transferFrom
      const tx = await nftContract.transferFrom(from, to, tokenId);
      console.log('[Web3] NFT transfer transaction:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[Web3] NFT transfer confirmed:', receipt);

      toast('s', '✅ NFT transferred successfully');
      return receipt;
    } catch (error) {
      console.error('[Web3] NFT transfer failed:', error);
      toast('e', '❌ NFT transfer failed');
      return null;
    }
  }

  // Get NFT Balance
  async function getNFTBalance(address) {
    try {
      if (!walletState.connected) {
        return 0;
      }

      const nftContract = getContract(CONFIG.NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI);
      if (!nftContract) {
        return 0;
      }

      const balance = await nftContract.balanceOf(address);
      return balance.toString();
    } catch (error) {
      console.error('[Web3] Get NFT balance failed:', error);
      return 0;
    }
  }

  // ── Zero-Knowledge Proofs (zk-SNARKs) ────────────────────────────────────

  // Simple ZKP implementation for age verification
  const ZKP = {
    // Generate age proof (simplified - in production use circomlib/snarkjs)
    async generateAgeProof(minAge) {
      try {
        // This is a simplified implementation
        // In production, use zk-SNARK libraries like circomlib + snarkjs
        
        const userAge = CU?.age || 18;
        const isOfAge = userAge >= minAge;

        // Generate proof (simulated)
        const proof = {
          isOfAge: isOfAge,
          minAge: minAge,
          timestamp: Date.now(),
          hash: crypto.randomUUID()
        };

        console.log('[ZKP] Age proof generated:', proof);
        return proof;
      } catch (error) {
        console.error('[ZKP] Age proof generation failed:', error);
        return null;
      }
    },

    // Verify age proof
    async verifyAgeProof(proof, minAge) {
      try {
        // Verify proof (simplified)
        const isValid = proof && 
                       proof.isOfAge === true && 
                       proof.minAge === minAge &&
                       (Date.now() - proof.timestamp) < 3600000; // Valid for 1 hour

        console.log('[ZKP] Age proof verification:', isValid);
        return isValid;
      } catch (error) {
        console.error('[ZKP] Age proof verification failed:', error);
        return false;
      }
    },

    // Generate ID verification proof
    async generateIDProof() {
      try {
        // Simplified ID proof
        const proof = {
          hasID: CU?.kycVerified || false,
          timestamp: Date.now(),
          hash: crypto.randomUUID()
        };

        console.log('[ZKP] ID proof generated:', proof);
        return proof;
      } catch (error) {
        console.error('[ZKP] ID proof generation failed:', error);
        return null;
      }
    },

    // Verify ID proof
    async verifyIDProof(proof) {
      try {
        const isValid = proof && 
                       proof.hasID === true &&
                       (Date.now() - proof.timestamp) < 86400000; // Valid for 24 hours

        console.log('[ZKP] ID proof verification:', isValid);
        return isValid;
      } catch (error) {
        console.error('[ZKP] ID proof verification failed:', error);
        return false;
      }
    }
  };

  // ── Event Listeners ───────────────────────────────────────────────────────

  // Listen for account changes
  function setupEventListeners() {
    if (!walletState.provider) return;

    walletState.provider.on('accountsChanged', (accounts) => {
      console.log('[Web3] Account changed:', accounts);
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        walletState.address = accounts[0];
        if (typeof CU !== 'undefined') {
          CU.walletAddress = accounts[0];
          if (typeof saveData === 'function') saveData();
        }
      }
    });

    walletState.provider.on('chainChanged', (chainId) => {
      console.log('[Web3] Chain changed:', chainId);
      walletState.chainId = chainId;
      window.location.reload(); // Reload to update UI
    });

    walletState.provider.on('disconnect', () => {
      console.log('[Web3] Provider disconnected');
      disconnectWallet();
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Wallet functions
    init: initWeb3Modal,
    connect: connectWallet,
    disconnect: disconnectWallet,
    switchNetwork: switchNetwork,
    getBalance: getBalance,
    
    // State
    getState: () => ({ ...walletState }),
    isConnected: () => walletState.connected,
    
    // Smart Contract functions
    distributeRewards: distributeRewardsOnChain,
    withdrawRewards: withdrawRewards,
    
    // NFT functions
    mintNFT: mintNFT,
    transferNFT: transferNFT,
    getNFTBalance: getNFTBalance,
    
    // ZKP functions
    ZKP: ZKP,
    
    // Config
    CONFIG: CONFIG,
    
    // Event listeners
    setupEventListeners: setupEventListeners
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Web3Integration;
}

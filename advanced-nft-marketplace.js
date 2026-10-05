/**
 * Advanced NFT Marketplace for Monetixra
 * Features: Multi-Chain NFT Support, Advanced Trading, Royalty Management, NFT Lending, Fractional Ownership
 */

const AdvancedNFTMarketplace = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    // Marketplaces
    OPENSEA_API: 'https://api.opensea.io/api/v2',
    RARIBLE_API: 'https://api.rarible.com',
    LOOKSRARE_API: 'https://api.looksrare.org',
    
    // Chains
    ETHEREUM: { chainId: 1, name: 'Ethereum', native: 'ETH' },
    POLYGON: { chainId: 137, name: 'Polygon', native: 'MATIC' },
    BSC: { chainId: 56, name: 'BNB Chain', native: 'BNB' },
    ARBITRUM: { chainId: 42161, name: 'Arbitrum', native: 'ETH' },
    OPTIMISM: { chainId: 10, name: 'Optimism', native: 'ETH' },
    AVALANCHE: { chainId: 43114, name: 'Avalanche', native: 'AVAX' },
    
    // NFT Standards
    ERC721: 'ERC721',
    ERC1155: 'ERC1155',
    ERC404: 'ERC404',
    
    // Marketplace Features
    ROYALTY_STANDARD: 2.5, // 2.5% standard royalty
    MAX_ROYALTY: 10, // 10% max royalty
    MARKETPLACE_FEE: 2.5, // 2.5% marketplace fee
    
    // Trading
    MIN_BID_INCREMENT: 0.05, // 5% minimum bid increment
    AUCTION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
    GRACE_PERIOD: 15 * 60 * 1000, // 15 minutes grace period
    
    // Lending
    LOAN_TO_VALUE_RATIO: 0.5, // 50% LTV
    INTEREST_RATE: 0.1, // 10% annual interest
    LOAN_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
    
    // Fractionalization
    MIN_FRACTION: 0.01, // 1% minimum fraction
    MAX_FRACTIONS: 1000 // Maximum number of fractions
  };

  // State
  let marketplaceState = {
    connected: false,
    walletAddress: null,
    chainId: null,
    provider: null,
    signer: null,
    listings: new Map(), // listingId -> listing data
    auctions: new Map(), // auctionId -> auction data
    bids: new Map(), // auctionId -> bids
    loans: new Map(), // loanId -> loan data
    fractionalizedNFTs: new Map(), // nftId -> fractions
    portfolio: new Map() // walletAddress -> NFT portfolio
  };

  function getEthers() {
    if (typeof window !== 'undefined' && window.ethers) return window.ethers;
    if (typeof require !== 'undefined') {
      try { return require('ethers'); } catch (e) { }
    }
    return null;
  }

  // ── Multi-Chain NFT Support ────────────────────────────────────────────────

  /**
   * Get NFTs across multiple chains
   * @param {string} walletAddress - Wallet address
   * @param {array} chains - Array of chain IDs
   */
  async function getCrossChainNFTs(walletAddress, chains = [1, 137, 56, 42161]) {
    try {
      const crossChainNFTs = {};
      
      for (const chainId of chains) {
        const chainConfig = Object.values(CONFIG).find(c => c.chainId === chainId);
        if (!chainConfig) continue;
        
        const nfts = await getNFTsForChain(walletAddress, chainId);
        crossChainNFTs[chainConfig.name] = nfts;
      }
      
      return crossChainNFTs;
    } catch (error) {
      console.error('[NFTMarketplace] Cross-chain NFT fetch failed:', error);
      return null;
    }
  }

  /**
   * Get NFTs for specific chain
   * @param {string} walletAddress - Wallet address
   * @param {number} chainId - Chain ID
   */
  async function getNFTsForChain(walletAddress, chainId) {
    try {
      // Use OpenSea API for supported chains
      const response = await fetch(
        `${CONFIG.OPENSEA_API}/chain/${chainId}/account/${walletAddress}/nfts`,
        {
          headers: {
            'X-API-KEY': process.env.OPENSEA_API_KEY || ''
          }
        }
      );

      if (!response.ok) {
        throw new Error(`OpenSea API error: ${response.status}`);
      }

      const data = await response.json();
      return data.nfts || [];
    } catch (error) {
      console.error('[NFTMarketplace] Chain NFT fetch failed:', error);
      
      // Fallback to direct blockchain query
      return await getNFTsFromBlockchain(walletAddress, chainId);
    }
  }

  /**
   * Get NFTs directly from blockchain
   * @param {string} walletAddress - Wallet address
   * @param {number} chainId - Chain ID
   */
  async function getNFTsFromBlockchain(walletAddress, chainId) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      // Get RPC URL for chain
      const chainConfig = Object.values(CONFIG).find(c => c.chainId === chainId);
      if (!chainConfig) {
        throw new Error('Unsupported chain');
      }

      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      
      // ERC721 Transfer event filter
      const transferFilter = {
        address: null, // Any ERC721 contract
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          null,
          ethers.zeroPadValue(walletAddress, 32)
        ]
      };

      const logs = await provider.getLogs(transferFilter);
      
      const nfts = [];
      const uniqueContracts = new Set();
      
      for (const log of logs) {
        if (!uniqueContracts.has(log.address)) {
          uniqueContracts.add(log.address);
          
          // Get token balance
          const ERC721ABI = ['function balanceOf(address owner) view returns (uint256)'];
          const contract = new ethers.Contract(log.address, ERC721ABI, provider);
          const balance = await contract.balanceOf(walletAddress);
          
          if (balance > 0) {
            // Get token metadata
            const metadata = await getNFTMetadata(log.address, log.topics[3], provider);
            nfts.push({
              contract: log.address,
              tokenId: log.topics[3],
              metadata: metadata,
              chainId: chainId
            });
          }
        }
      }
      
      return nfts;
    } catch (error) {
      console.error('[NFTMarketplace] Blockchain NFT fetch failed:', error);
      return [];
    }
  }

  /**
   * Get NFT metadata
   * @param {string} contractAddress - Contract address
   * @param {string} tokenId - Token ID
   * @param {object} provider - Ethers provider
   */
  async function getNFTMetadata(contractAddress, tokenId, provider) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const ERC721MetadataABI = [
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function name() view returns (string)',
        'function symbol() view returns (string)'
      ];

      const contract = new ethers.Contract(contractAddress, ERC721MetadataABI, provider);
      
      const [tokenURI, name, symbol] = await Promise.all([
        contract.tokenURI(tokenId).catch(() => null),
        contract.name().catch(() => null),
        contract.symbol().catch(() => null)
      ]);

      let metadata = {};
      
      if (tokenURI) {
        try {
          const response = await fetch(tokenURI);
          metadata = await response.json();
        } catch (error) {
          console.error('[NFTMarketplace] Metadata fetch failed:', error);
        }
      }
      
      return {
        ...metadata,
        contract: {
          address: contractAddress,
          name: name,
          symbol: symbol
        },
        tokenId: tokenId
      };
    } catch (error) {
      console.error('[NFTMarketplace] Metadata fetch failed:', error);
      return {};
    }
  }

  // ── Advanced Trading ─────────────────────────────────────────────────────────

  /**
   * Create listing
   * @param {string} contractAddress - NFT contract address
   * @param {string} tokenId - Token ID
   * @param {string} price - Listing price (in wei)
   * @param {object} options - Listing options
   */
  async function createListing(contractAddress, tokenId, price, options = {}) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const MarketplaceABI = [
        'function createListing(address nftContract, uint256 tokenId, uint256 price, uint256 duration) external',
        'function cancelListing(uint256 listingId) external',
        'function buyListing(uint256 listingId) external payable'
      ];

      // Assuming you have a marketplace contract deployed
      const marketplaceAddress = options.marketplaceAddress || process.env.MARKETPLACE_ADDRESS;
      const marketplace = new ethers.Contract(marketplaceAddress, MarketplaceABI, marketplaceState.signer);
      
      // Approve NFT transfer
      const ERC721ABI = ['function approve(address to, uint256 tokenId) external'];
      const nftContract = new ethers.Contract(contractAddress, ERC721ABI, marketplaceState.signer);
      await nftContract.approve(marketplaceAddress, tokenId);
      
      // Create listing
      const duration = options.duration || CONFIG.AUCTION_DURATION;
      const tx = await marketplace.createListing(contractAddress, tokenId, price, duration);
      
      console.log('[NFTMarketplace] Listing created:', tx.hash);
      const receipt = await tx.wait();
      
      // Extract listing ID from event
      const listingId = extractListingId(receipt, marketplace);
      
      // Store listing
      marketplaceState.listings.set(listingId.toString(), {
        id: listingId.toString(),
        contractAddress: contractAddress,
        tokenId: tokenId,
        price: price,
        seller: marketplaceState.walletAddress,
        createdAt: Date.now(),
        expiresAt: Date.now() + duration,
        status: 'active'
      });

      toast('s', '✅ Listing created successfully');
      return { success: true, listingId: listingId.toString() };
    } catch (error) {
      console.error('[NFTMarketplace] Listing creation failed:', error);
      toast('e', '❌ Listing creation failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Buy listing
   * @param {string} listingId - Listing ID
   * @param {string} price - Purchase price (in wei)
   */
  async function buyListing(listingId, price) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const MarketplaceABI = [
        'function buyListing(uint256 listingId) external payable'
      ];

      const marketplaceAddress = process.env.MARKETPLACE_ADDRESS;
      const marketplace = new ethers.Contract(marketplaceAddress, MarketplaceABI, marketplaceState.signer);
      
      const tx = await marketplace.buyListing(listingId, { value: price });
      
      console.log('[NFTMarketplace] Purchase transaction:', tx.hash);
      const receipt = await tx.wait();
      
      // Update listing status
      const listing = marketplaceState.listings.get(listingId);
      if (listing) {
        listing.status = 'sold';
        listing.soldAt = Date.now();
        listing.buyer = marketplaceState.walletAddress;
      }

      toast('s', '✅ NFT purchased successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[NFTMarketplace] Purchase failed:', error);
      toast('e', '❌ Purchase failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Create auction
   * @param {string} contractAddress - NFT contract address
   * @param {string} tokenId - Token ID
   * @param {string} startingPrice - Starting price (in wei)
   * @param {object} options - Auction options
   */
  async function createAuction(contractAddress, tokenId, startingPrice, options = {}) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const AuctionABI = [
        'function createAuction(address nftContract, uint256 tokenId, uint256 startingPrice, uint256 duration) external',
        'function placeBid(uint256 auctionId) external payable',
        'function endAuction(uint256 auctionId) external'
      ];

      const auctionAddress = options.auctionAddress || process.env.AUCTION_ADDRESS;
      const auction = new ethers.Contract(auctionAddress, AuctionABI, marketplaceState.signer);
      
      // Approve NFT transfer
      const ERC721ABI = ['function approve(address to, uint256 tokenId) external'];
      const nftContract = new ethers.Contract(contractAddress, ERC721ABI, marketplaceState.signer);
      await nftContract.approve(auctionAddress, tokenId);
      
      // Create auction
      const duration = options.duration || CONFIG.AUCTION_DURATION;
      const tx = await auction.createAuction(contractAddress, tokenId, startingPrice, duration);
      
      console.log('[NFTMarketplace] Auction created:', tx.hash);
      const receipt = await tx.wait();
      
      // Extract auction ID from event
      const auctionId = extractAuctionId(receipt, auction);
      
      // Store auction
      marketplaceState.auctions.set(auctionId.toString(), {
        id: auctionId.toString(),
        contractAddress: contractAddress,
        tokenId: tokenId,
        startingPrice: startingPrice,
        currentBid: startingPrice,
        seller: marketplaceState.walletAddress,
        createdAt: Date.now(),
        expiresAt: Date.now() + duration,
        status: 'active'
      });

      toast('s', '✅ Auction created successfully');
      return { success: true, auctionId: auctionId.toString() };
    } catch (error) {
      console.error('[NFTMarketplace] Auction creation failed:', error);
      toast('e', '❌ Auction creation failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Place bid
   * @param {string} auctionId - Auction ID
   * @param {string} bidAmount - Bid amount (in wei)
   */
  async function placeBid(auctionId, bidAmount) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const auction = marketplaceState.auctions.get(auctionId);
      if (!auction) {
        throw new Error('Auction not found');
      }

      // Check minimum bid increment
      const minBid = (parseFloat(auction.currentBid) * (1 + CONFIG.MIN_BID_INCREMENT)).toString();
      if (parseFloat(bidAmount) < parseFloat(minBid)) {
        throw new Error('Bid too low');
      }

      const AuctionABI = [
        'function placeBid(uint256 auctionId) external payable'
      ];

      const auctionAddress = process.env.AUCTION_ADDRESS;
      const auctionContract = new ethers.Contract(auctionAddress, AuctionABI, marketplaceState.signer);
      
      const tx = await auctionContract.placeBid(auctionId, { value: bidAmount });
      
      console.log('[NFTMarketplace] Bid placed:', tx.hash);
      const receipt = await tx.wait();
      
      // Update auction
      auction.currentBid = bidAmount;
      auction.lastBidder = marketplaceState.walletAddress;
      auction.lastBidAt = Date.now();
      
      // Store bid
      if (!marketplaceState.bids.has(auctionId)) {
        marketplaceState.bids.set(auctionId, []);
      }
      marketplaceState.bids.get(auctionId).push({
        bidder: marketplaceState.walletAddress,
        amount: bidAmount,
        timestamp: Date.now()
      });

      toast('s', '✅ Bid placed successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[NFTMarketplace] Bid placement failed:', error);
      toast('e', '❌ Bid placement failed');
      return { success: false, error: error.message };
    }
  }

  // ── Royalty Management ─────────────────────────────────────────────────────

  /**
   * Set royalty
   * @param {string} contractAddress - NFT contract address
   * @param {string} royaltyRecipient - Royalty recipient address
   * @param {number} royaltyPercentage - Royalty percentage (0-10)
   */
  async function setRoyalty(contractAddress, royaltyRecipient, royaltyPercentage) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      if (royaltyPercentage > CONFIG.MAX_ROYALTY) {
        throw new Error(`Royalty cannot exceed ${CONFIG.MAX_ROYALTY}%`);
      }

      const RoyaltyABI = [
        'function setRoyalty(address recipient, uint96 feeNumerator) external'
      ];

      const contract = new ethers.Contract(contractAddress, RoyaltyABI, marketplaceState.signer);
      
      // Convert percentage to basis points (10000 = 100%)
      const feeNumerator = Math.floor(royaltyPercentage * 100);
      
      const tx = await contract.setRoyalty(royaltyRecipient, feeNumerator);
      
      console.log('[NFTMarketplace] Royalty set:', tx.hash);
      const receipt = await tx.wait();

      toast('s', '✅ Royalty set successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[NFTMarketplace] Royalty setting failed:', error);
      toast('e', '❌ Royalty setting failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get royalty info
   * @param {string} contractAddress - NFT contract address
   * @param {string} tokenId - Token ID
   */
  async function getRoyaltyInfo(contractAddress, tokenId) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const RoyaltyABI = [
        'function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount)'
      ];

      const contract = new ethers.Contract(contractAddress, RoyaltyABI, marketplaceState.provider);
      
      const salePrice = ethers.parseEther('1'); // Use 1 ETH as reference
      const [receiver, royaltyAmount] = await contract.royaltyInfo(tokenId, salePrice);
      
      const royaltyPercentage = (parseFloat(ethers.formatEther(royaltyAmount)) / parseFloat(ethers.formatEther(salePrice))) * 100;
      
      return {
        receiver: receiver,
        royaltyAmount: royaltyAmount.toString(),
        royaltyPercentage: royaltyPercentage
      };
    } catch (error) {
      console.error('[NFTMarketplace] Royalty info fetch failed:', error);
      return null;
    }
  }

  // ── NFT Lending ────────────────────────────────────────────────────────────

  /**
   * Create NFT-backed loan
   * @param {string} contractAddress - NFT contract address
   * @param {string} tokenId - Token ID
   * @param {string} loanAmount - Loan amount (in wei)
   * @param {object} options - Loan options
   */
  async function createNFTLoan(contractAddress, tokenId, loanAmount, options = {}) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const LendingABI = [
        'function createLoan(address nftContract, uint256 tokenId, uint256 loanAmount, uint256 duration) external',
        'function repayLoan(uint256 loanId) external payable',
        'function liquidateLoan(uint256 loanId) external'
      ];

      const lendingAddress = options.lendingAddress || process.env.LENDING_ADDRESS;
      const lending = new ethers.Contract(lendingAddress, LendingABI, marketplaceState.signer);
      
      // Approve NFT transfer
      const ERC721ABI = ['function approve(address to, uint256 tokenId) external'];
      const nftContract = new ethers.Contract(contractAddress, ERC721ABI, marketplaceState.signer);
      await nftContract.approve(lendingAddress, tokenId);
      
      // Create loan
      const duration = options.duration || CONFIG.LOAN_DURATION;
      const tx = await lending.createLoan(contractAddress, tokenId, loanAmount, duration);
      
      console.log('[NFTMarketplace] Loan created:', tx.hash);
      const receipt = await tx.wait();
      
      // Extract loan ID from event
      const loanId = extractLoanId(receipt, lending);
      
      // Store loan
      marketplaceState.loans.set(loanId.toString(), {
        id: loanId.toString(),
        contractAddress: contractAddress,
        tokenId: tokenId,
        loanAmount: loanAmount,
        borrower: marketplaceState.walletAddress,
        interestRate: CONFIG.INTEREST_RATE,
        createdAt: Date.now(),
        dueAt: Date.now() + duration,
        status: 'active'
      });

      toast('s', '✅ Loan created successfully');
      return { success: true, loanId: loanId.toString() };
    } catch (error) {
      console.error('[NFTMarketplace] Loan creation failed:', error);
      toast('e', '❌ Loan creation failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Repay loan
   * @param {string} loanId - Loan ID
   * @param {string} repaymentAmount - Repayment amount (in wei)
   */
  async function repayLoan(loanId, repaymentAmount) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const LendingABI = [
        'function repayLoan(uint256 loanId) external payable'
      ];

      const lendingAddress = process.env.LENDING_ADDRESS;
      const lending = new ethers.Contract(lendingAddress, LendingABI, marketplaceState.signer);
      
      const tx = await lending.repayLoan(loanId, { value: repaymentAmount });
      
      console.log('[NFTMarketplace] Loan repaid:', tx.hash);
      const receipt = await tx.wait();
      
      // Update loan status
      const loan = marketplaceState.loans.get(loanId);
      if (loan) {
        loan.status = 'repaid';
        loan.repaidAt = Date.now();
      }

      toast('s', '✅ Loan repaid successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[NFTMarketplace] Loan repayment failed:', error);
      toast('e', '❌ Loan repayment failed');
      return { success: false, error: error.message };
    }
  }

  // ── Fractional Ownership ───────────────────────────────────────────────────

  /**
   * Fractionalize NFT
   * @param {string} contractAddress - NFT contract address
   * @param {string} tokenId - Token ID
   * @param {number} totalFractions - Total number of fractions
   * @param {object} options - Fractionalization options
   */
  async function fractionalizeNFT(contractAddress, tokenId, totalFractions, options = {}) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      if (totalFractions > CONFIG.MAX_FRACTIONS) {
        throw new Error(`Cannot exceed ${CONFIG.MAX_FRACTIONS} fractions`);
      }

      const FractionalizationABI = [
        'function fractionalize(address nftContract, uint256 tokenId, uint256 totalFractions) external',
        'function claimFractions(uint256 vaultId, uint256 amount) external'
      ];

      const fractionalAddress = options.fractionalAddress || process.env.FRACTIONAL_ADDRESS;
      const fractional = new ethers.Contract(fractionalAddress, FractionalizationABI, marketplaceState.signer);
      
      // Approve NFT transfer
      const ERC721ABI = ['function approve(address to, uint256 tokenId) external'];
      const nftContract = new ethers.Contract(contractAddress, ERC721ABI, marketplaceState.signer);
      await nftContract.approve(fractionalAddress, tokenId);
      
      // Fractionalize
      const tx = await fractional.fractionalize(contractAddress, tokenId, totalFractions);
      
      console.log('[NFTMarketplace] NFT fractionalized:', tx.hash);
      const receipt = await tx.wait();
      
      // Extract vault ID from event
      const vaultId = extractVaultId(receipt, fractional);
      
      // Store fractionalized NFT
      marketplaceState.fractionalizedNFTs.set(`${contractAddress}-${tokenId}`, {
        vaultId: vaultId.toString(),
        contractAddress: contractAddress,
        tokenId: tokenId,
        totalFractions: totalFractions,
        owner: marketplaceState.walletAddress,
        createdAt: Date.now()
      });

      toast('s', '✅ NFT fractionalized successfully');
      return { success: true, vaultId: vaultId.toString() };
    } catch (error) {
      console.error('[NFTMarketplace] Fractionalization failed:', error);
      toast('e', '❌ Fractionalization failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Buy fractions
   * @param {string} vaultId - Vault ID
   * @param {number} fractionAmount - Number of fractions to buy
   * @param {string} totalPrice - Total price (in wei)
   */
  async function buyFractions(vaultId, fractionAmount, totalPrice) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const FractionalizationABI = [
        'function buyFractions(uint256 vaultId, uint256 amount) external payable'
      ];

      const fractionalAddress = process.env.FRACTIONAL_ADDRESS;
      const fractional = new ethers.Contract(fractionalAddress, FractionalizationABI, marketplaceState.signer);
      
      const tx = await fractional.buyFractions(vaultId, fractionAmount, { value: totalPrice });
      
      console.log('[NFTMarketplace] Fractions purchased:', tx.hash);
      const receipt = await tx.wait();

      toast('s', '✅ Fractions purchased successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[NFTMarketplace] Fraction purchase failed:', error);
      toast('e', '❌ Fraction purchase failed');
      return { success: false, error: error.message };
    }
  }

  // ── Helper Functions ───────────────────────────────────────────────────────

  /**
   * Extract listing ID from receipt
   */
  function extractListingId(receipt, contract) {
    try {
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'ListingCreated';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed.args.listingId;
      }
      
      return receipt.hash; // Fallback
    } catch (error) {
      console.error('[NFTMarketplace] Listing ID extraction failed:', error);
      return receipt.hash;
    }
  }

  /**
   * Extract auction ID from receipt
   */
  function extractAuctionId(receipt, contract) {
    try {
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'AuctionCreated';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed.args.auctionId;
      }
      
      return receipt.hash;
    } catch (error) {
      console.error('[NFTMarketplace] Auction ID extraction failed:', error);
      return receipt.hash;
    }
  }

  /**
   * Extract loan ID from receipt
   */
  function extractLoanId(receipt, contract) {
    try {
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'LoanCreated';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed.args.loanId;
      }
      
      return receipt.hash;
    } catch (error) {
      console.error('[NFTMarketplace] Loan ID extraction failed:', error);
      return receipt.hash;
    }
  }

  /**
   * Extract vault ID from receipt
   */
  function extractVaultId(receipt, contract) {
    try {
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'VaultCreated';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed.args.vaultId;
      }
      
      return receipt.hash;
    } catch (error) {
      console.error('[NFTMarketplace] Vault ID extraction failed:', error);
      return receipt.hash;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Cross-Chain
    getCrossChainNFTs: getCrossChainNFTs,
    getNFTsForChain: getNFTsForChain,
    
    // Trading
    createListing: createListing,
    buyListing: buyListing,
    createAuction: createAuction,
    placeBid: placeBid,
    
    // Royalty
    setRoyalty: setRoyalty,
    getRoyaltyInfo: getRoyaltyInfo,
    
    // Lending
    createLoan: createNFTLoan,
    repayLoan: repayLoan,
    
    // Fractionalization
    fractionalizeNFT: fractionalizeNFT,
    buyFractions: buyFractions,
    
    // State
    getState: () => ({ ...marketplaceState }),
    isConnected: () => marketplaceState.connected,
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedNFTMarketplace;
}
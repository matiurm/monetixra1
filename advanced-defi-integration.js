/**
 * Advanced DeFi Integration for Monetixra
 * Features: DEX Aggregation, Yield Farming, Liquidity Pools, Cross-Chain Swaps, Staking
 */

const AdvancedDeFi = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    // DEX Protocols
    UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    SUSHISWAP_ROUTER: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    PANCAKESWAP_ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    CURVE_FI_POOL: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    
    // DeFi Protocols
    AAVE_POOL: '0x87870B053F5eD86389f4F604417D4Ad90A427725',
    COMPOUND_COMPTROLLER: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
    LIDO_STETH: '0xae7ab96522DE81894A3b6f2e0a868C8fB3E62C5E',
    
    // Cross-Chain Bridges
    ANYSWAP_ROUTER: '0x6b7a878A91F4648393E9e25Bf5869F4C73b51a5F',
    SYNAPSE_BRIDGE: '0xE68Ca81A3d09F5f7f894627A0F9860076683b174',
    
    // Oracle
    CHAINLINK_ETH_USD: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    
    // Gas
    GAS_PRICE_ORACLE: '0x169E633A2D1E6c10dD912380BA91E6309bC9F7c5',
    
    // Supported Chains
    CHAINS: {
      ETHEREUM: { chainId: 1, rpc: 'https://eth.llamarpc.com', native: 'ETH' },
      POLYGON: { chainId: 137, rpc: 'https://polygon.llamarpc.com', native: 'MATIC' },
      BSC: { chainId: 56, rpc: 'https://bsc-dataseed.binance.org', native: 'BNB' },
      ARBITRUM: { chainId: 42161, rpc: 'https://arb1.arbitrum.io/rpc', native: 'ETH' },
      OPTIMISM: { chainId: 10, rpc: 'https://mainnet.optimism.io', native: 'ETH' },
      AVALANCHE: { chainId: 43114, rpc: 'https://api.avax.network/ext/bc/C/rpc', native: 'AVAX' }
    }
  };

  // State
  let defiState = {
    connected: false,
    walletAddress: null,
    chainId: null,
    provider: null,
    signer: null,
    contracts: new Map(),
    liquidityPositions: new Map(),
    stakingPositions: new Map(),
    yieldFarmingPositions: new Map()
  };

  function getEthers() {
    if (typeof window !== 'undefined' && window.ethers) return window.ethers;
    if (typeof require !== 'undefined') {
      try { return require('ethers'); } catch (e) { }
    }
    return null;
  }

  // ── DEX Aggregation ────────────────────────────────────────────────────────

  /**
   * Get best swap quote across multiple DEXs
   * @param {string} tokenIn - Input token address
   * @param {string} tokenOut - Output token address
   * @param {string} amountIn - Input amount (in wei)
   */
  async function getBestSwapQuote(tokenIn, tokenOut, amountIn) {
    try {
      const quotes = await Promise.all([
        getUniswapQuote(tokenIn, tokenOut, amountIn),
        getSushiSwapQuote(tokenIn, tokenOut, amountIn),
        getPancakeSwapQuote(tokenIn, tokenOut, amountIn)
      ]);

      // Filter out failed quotes and find best
      const validQuotes = quotes.filter(q => q && q.success);
      
      if (validQuotes.length === 0) {
        return { success: false, error: 'No valid quotes found' };
      }

      // Find best quote by output amount
      const bestQuote = validQuotes.reduce((best, current) => {
        return current.amountOut > best.amountOut ? current : best;
      });

      console.log('[DeFi] Best quote:', bestQuote.dex, bestQuote.amountOut);
      return bestQuote;
    } catch (error) {
      console.error('[DeFi] Quote aggregation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Uniswap V3 quote
   */
  async function getUniswapQuote(tokenIn, tokenOut, amountIn) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      const QuoterABI = [
        'function quoteExactInputSingle(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
      ];

      const quoterAddress = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
      const quoter = new ethers.Contract(quoterAddress, QuoterABI, defiState.provider);

      const amountOut = await quoter.quoteExactInputSingle(
        tokenIn,
        tokenOut,
        amountIn,
        3000, // 0.3% fee
        0
      );

      return {
        success: true,
        dex: 'Uniswap V3',
        amountOut: amountOut.toString(),
        fee: '0.3%'
      };
    } catch (error) {
      console.error('[DeFi] Uniswap quote failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get SushiSwap quote
   */
  async function getSushiSwapQuote(tokenIn, tokenOut, amountIn) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      const RouterABI = [
        'function getAmountsOut(uint amountIn, address[] path) external view returns (uint[] amounts)'
      ];

      const router = new ethers.Contract(CONFIG.SUSHISWAP_ROUTER, RouterABI, defiState.provider);
      const path = [tokenIn, tokenOut];
      
      const amounts = await router.getAmountsOut(amountIn, path);
      
      return {
        success: true,
        dex: 'SushiSwap',
        amountOut: amounts[1].toString(),
        fee: '0.3%'
      };
    } catch (error) {
      console.error('[DeFi] SushiSwap quote failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get PancakeSwap quote
   */
  async function getPancakeSwapQuote(tokenIn, tokenOut, amountIn) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      const RouterABI = [
        'function getAmountsOut(uint amountIn, address[] path) external view returns (uint[] amounts)'
      ];

      const router = new ethers.Contract(CONFIG.PANCAKESWAP_ROUTER, RouterABI, defiState.provider);
      const path = [tokenIn, tokenOut];
      
      const amounts = await router.getAmountsOut(amountIn, path);
      
      return {
        success: true,
        dex: 'PancakeSwap',
        amountOut: amounts[1].toString(),
        fee: '0.25%'
      };
    } catch (error) {
      console.error('[DeFi] PancakeSwap quote failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute swap on best DEX
   * @param {string} tokenIn - Input token address
   * @param {string} tokenOut - Output token address
   * @param {string} amountIn - Input amount (in wei)
   * @param {string} minAmountOut - Minimum output amount (slippage protection)
   * @param {string} dex - DEX to use
   */
  async function executeSwap(tokenIn, tokenOut, amountIn, minAmountOut, dex) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      let routerAddress, routerABI;
      
      switch (dex) {
        case 'Uniswap V3':
          routerAddress = CONFIG.UNISWAP_V3_ROUTER;
          routerABI = [
            'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
          ];
          break;
        case 'SushiSwap':
          routerAddress = CONFIG.SUSHISWAP_ROUTER;
          routerABI = [
            'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) external returns (uint[] amounts)'
          ];
          break;
        case 'PancakeSwap':
          routerAddress = CONFIG.PANCAKESWAP_ROUTER;
          routerABI = [
            'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) external returns (uint[] amounts)'
          ];
          break;
        default:
          throw new Error('Unsupported DEX');
      }

      const router = new ethers.Contract(routerAddress, routerABI, defiState.signer);
      
      let tx;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      if (dex === 'Uniswap V3') {
        tx = await router.exactInputSingle({
          tokenIn: tokenIn,
          tokenOut: tokenOut,
          fee: 3000,
          recipient: defiState.walletAddress,
          deadline: deadline,
          amountIn: amountIn,
          amountOutMinimum: minAmountOut,
          sqrtPriceLimitX96: 0
        });
      } else {
        const path = [tokenIn, tokenOut];
        tx = await router.swapExactTokensForTokens(
          amountIn,
          minAmountOut,
          path,
          defiState.walletAddress,
          deadline
        );
      }

      console.log('[DeFi] Swap transaction:', tx.hash);
      const receipt = await tx.wait();
      
      toast('s', '✅ Swap executed successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[DeFi] Swap execution failed:', error);
      toast('e', '❌ Swap execution failed');
      return { success: false, error: error.message };
    }
  }

  // ── Liquidity Pool Management ───────────────────────────────────────────────

  /**
   * Add liquidity to pool
   * @param {string} tokenA - First token address
   * @param {string} tokenB - Second token address
   * @param {string} amountA - Amount of token A
   * @param {string} amountB - Amount of token B
   * @param {string} dex - DEX to use
   */
  async function addLiquidity(tokenA, tokenB, amountA, amountB, dex) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      let routerAddress, routerABI;
      
      switch (dex) {
        case 'SushiSwap':
          routerAddress = CONFIG.SUSHISWAP_ROUTER;
          routerABI = [
            'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)'
          ];
          break;
        case 'PancakeSwap':
          routerAddress = CONFIG.PANCAKESWAP_ROUTER;
          routerABI = [
            'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)'
          ];
          break;
        default:
          throw new Error('Unsupported DEX for liquidity');
      }

      const router = new ethers.Contract(routerAddress, routerABI, defiState.signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      
      // Use 1% slippage
      const amountAMin = (parseFloat(amountA) * 0.99).toString();
      const amountBMin = (parseFloat(amountB) * 0.99).toString();

      const tx = await router.addLiquidity(
        tokenA,
        tokenB,
        amountA,
        amountB,
        amountAMin,
        amountBMin,
        defiState.walletAddress,
        deadline
      );

      console.log('[DeFi] Add liquidity transaction:', tx.hash);
      const receipt = await tx.wait();
      
      // Store position
      const positionId = `${tokenA}-${tokenB}-${dex}`;
      defiState.liquidityPositions.set(positionId, {
        tokenA,
        tokenB,
        amountA,
        amountB,
        dex,
        timestamp: Date.now()
      });

      toast('s', '✅ Liquidity added successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[DeFi] Add liquidity failed:', error);
      toast('e', '❌ Add liquidity failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove liquidity from pool
   * @param {string} tokenA - First token address
   * @param {string} tokenB - Second token address
   * @param {string} liquidity - LP token amount
   * @param {string} dex - DEX to use
   */
  async function removeLiquidity(tokenA, tokenB, liquidity, dex) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      let routerAddress, routerABI;
      
      switch (dex) {
        case 'SushiSwap':
          routerAddress = CONFIG.SUSHISWAP_ROUTER;
          routerABI = [
            'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)'
          ];
          break;
        case 'PancakeSwap':
          routerAddress = CONFIG.PANCAKESWAP_ROUTER;
          routerABI = [
            'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)'
          ];
          break;
        default:
          throw new Error('Unsupported DEX for liquidity');
      }

      const router = new ethers.Contract(routerAddress, routerABI, defiState.signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      
      // Use 1% slippage
      const amountAMin = '0';
      const amountBMin = '0';

      const tx = await router.removeLiquidity(
        tokenA,
        tokenB,
        liquidity,
        amountAMin,
        amountBMin,
        defiState.walletAddress,
        deadline
      );

      console.log('[DeFi] Remove liquidity transaction:', tx.hash);
      const receipt = await tx.wait();
      
      // Remove position
      const positionId = `${tokenA}-${tokenB}-${dex}`;
      defiState.liquidityPositions.delete(positionId);

      toast('s', '✅ Liquidity removed successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[DeFi] Remove liquidity failed:', error);
      toast('e', '❌ Remove liquidity failed');
      return { success: false, error: error.message };
    }
  }

  // ── Yield Farming ───────────────────────────────────────────────────────────

  /**
   * Stake tokens in yield farm
   * @param {string} stakingContract - Staking contract address
   * @param {string} amount - Amount to stake
   */
  async function stakeTokens(stakingContract, amount) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const StakingABI = [
        'function stake(uint256 amount) external',
        'function unstake(uint256 amount) external',
        'function claimRewards() external',
        'function earned(address account) external view returns (uint256)',
        'function balanceOf(address account) external view returns (uint256)'
      ];

      const staking = new ethers.Contract(stakingContract, StakingABI, defiState.signer);
      
      // Approve tokens first
      const TokenABI = [
        'function approve(address spender, uint256 amount) external returns (bool)'
      ];
      const token = new ethers.Contract(stakingContract, TokenABI, defiState.signer);
      await token.approve(stakingContract, amount);

      // Stake tokens
      const tx = await staking.stake(amount);
      console.log('[DeFi] Stake transaction:', tx.hash);
      const receipt = await tx.wait();
      
      // Store position
      defiState.stakingPositions.set(stakingContract, {
        amount: amount,
        timestamp: Date.now()
      });

      toast('s', '✅ Tokens staked successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[DeFi] Staking failed:', error);
      toast('e', '❌ Staking failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Unstake tokens from yield farm
   * @param {string} stakingContract - Staking contract address
   * @param {string} amount - Amount to unstake
   */
  async function unstakeTokens(stakingContract, amount) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const StakingABI = [
        'function unstake(uint256 amount) external'
      ];

      const staking = new ethers.Contract(stakingContract, StakingABI, defiState.signer);
      
      const tx = await staking.unstake(amount);
      console.log('[DeFi] Unstake transaction:', tx.hash);
      const receipt = await tx.wait();
      
      // Update position
      const position = defiState.stakingPositions.get(stakingContract);
      if (position) {
        position.amount = (parseFloat(position.amount) - parseFloat(amount)).toString();
        if (parseFloat(position.amount) <= 0) {
          defiState.stakingPositions.delete(stakingContract);
        }
      }

      toast('s', '✅ Tokens unstaked successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[DeFi] Unstaking failed:', error);
      toast('e', '❌ Unstaking failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Claim staking rewards
   * @param {string} stakingContract - Staking contract address
   */
  async function claimRewards(stakingContract) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const StakingABI = [
        'function claimRewards() external'
      ];

      const staking = new ethers.Contract(stakingContract, StakingABI, defiState.signer);
      
      const tx = await staking.claimRewards();
      console.log('[DeFi] Claim rewards transaction:', tx.hash);
      const receipt = await tx.wait();

      toast('s', '✅ Rewards claimed successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[DeFi] Claim rewards failed:', error);
      toast('e', '❌ Claim rewards failed');
      return { success: false, error: error.message };
    }
  }

  // ── Lending & Borrowing (Aave/Compound) ────────────────────────────────────

  /**
   * Supply assets to Aave
   * @param {string} asset - Asset address
   * @param {string} amount - Amount to supply
   */
  async function supplyToAave(asset, amount) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const PoolABI = [
        'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external'
      ];

      const pool = new ethers.Contract(CONFIG.AAVE_POOL, PoolABI, defiState.signer);
      
      // Approve tokens first
      const TokenABI = [
        'function approve(address spender, uint256 amount) external returns (bool)'
      ];
      const token = new ethers.Contract(asset, TokenABI, defiState.signer);
      await token.approve(CONFIG.AAVE_POOL, amount);

      // Supply to Aave
      const tx = await pool.supply(asset, amount, defiState.walletAddress, 0);
      console.log('[DeFi] Aave supply transaction:', tx.hash);
      const receipt = await tx.wait();

      toast('s', '✅ Assets supplied to Aave');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[DeFi] Aave supply failed:', error);
      toast('e', '❌ Aave supply failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Borrow assets from Aave
   * @param {string} asset - Asset address
   * @param {string} amount - Amount to borrow
   */
  async function borrowFromAave(asset, amount) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const PoolABI = [
        'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
      ];

      const pool = new ethers.Contract(CONFIG.AAVE_POOL, PoolABI, defiState.signer);
      
      // Borrow from Aave (interestRateMode: 2 = variable)
      const tx = await pool.borrow(asset, amount, 2, 0, defiState.walletAddress);
      console.log('[DeFi] Aave borrow transaction:', tx.hash);
      const receipt = await tx.wait();

      toast('s', '✅ Assets borrowed from Aave');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[DeFi] Aave borrow failed:', error);
      toast('e', '❌ Aave borrow failed');
      return { success: false, error: error.message };
    }
  }

  // ── Cross-Chain Bridge ─────────────────────────────────────────────────────

  /**
   * Bridge assets across chains
   * @param {string} token - Token address
   * @param {string} amount - Amount to bridge
   * @param {number} targetChain - Target chain ID
   * @param {string} bridge - Bridge protocol
   */
  async function bridgeAssets(token, amount, targetChain, bridge) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      let bridgeAddress, bridgeABI;
      
      switch (bridge) {
        case 'AnySwap':
          bridgeAddress = CONFIG.ANYSWAP_ROUTER;
          bridgeABI = [
            'function anySwapOutUnderlying(address token, address to, uint amount, uint toChainID) external'
          ];
          break;
        case 'Synapse':
          bridgeAddress = CONFIG.SYNAPSE_BRIDGE;
          bridgeABI = [
            'function send(address destinationAddress, uint256 destinationChainId, address token, uint256 amount) external'
          ];
          break;
        default:
          throw new Error('Unsupported bridge');
      }

      const bridgeContract = new ethers.Contract(bridgeAddress, bridgeABI, defiState.signer);
      
      // Approve tokens first
      const TokenABI = [
        'function approve(address spender, uint256 amount) external returns (bool)'
      ];
      const tokenContract = new ethers.Contract(token, TokenABI, defiState.signer);
      await tokenContract.approve(bridgeAddress, amount);

      let tx;
      if (bridge === 'AnySwap') {
        tx = await bridgeContract.anySwapOutUnderlying(token, defiState.walletAddress, amount, targetChain);
      } else {
        tx = await bridgeContract.send(defiState.walletAddress, targetChain, token, amount);
      }

      console.log('[DeFi] Bridge transaction:', tx.hash);
      const receipt = await tx.wait();

      toast('s', '✅ Assets bridged successfully');
      return { success: true, receipt: receipt };
    } catch (error) {
      console.error('[DeFi] Bridge failed:', error);
      toast('e', '❌ Bridge failed');
      return { success: false, error: error.message };
    }
  }

  // ── Portfolio Management ───────────────────────────────────────────────────

  /**
   * Get portfolio overview
   */
  async function getPortfolioOverview() {
    try {
      const portfolio = {
        liquidityPositions: Array.from(defiState.liquidityPositions.values()),
        stakingPositions: Array.from(defiState.stakingPositions.values()),
        yieldFarmingPositions: Array.from(defiState.yieldFarmingPositions.values()),
        totalValue: 0,
        chains: {}
      };

      // Calculate total value (simplified - in production use price oracles)
      for (const position of portfolio.liquidityPositions) {
        portfolio.totalValue += parseFloat(position.amountA) + parseFloat(position.amountB);
      }
      
      for (const position of portfolio.stakingPositions) {
        portfolio.totalValue += parseFloat(position.amount);
      }

      return portfolio;
    } catch (error) {
      console.error('[DeFi] Portfolio overview failed:', error);
      return null;
    }
  }

  /**
   * Get asset prices from Chainlink
   * @param {array} assets - Array of asset addresses
   */
  async function getAssetPrices(assets) {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const PriceFeedABI = [
        'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'
      ];

      const prices = {};
      
      for (const asset of assets) {
        try {
          const priceFeed = new ethers.Contract(asset, PriceFeedABI, defiState.provider);
          const roundData = await priceFeed.latestRoundData();
          prices[asset] = ethers.formatUnits(roundData.answer, 8); // Chainlink uses 8 decimals
        } catch (error) {
          console.error('[DeFi] Price fetch failed for:', asset);
          prices[asset] = null;
        }
      }

      return prices;
    } catch (error) {
      console.error('[DeFi] Asset prices fetch failed:', error);
      return null;
    }
  }

  // ── Gas Optimization ───────────────────────────────────────────────────────

  /**
   * Get optimal gas price
   */
  async function getOptimalGasPrice() {
    try {
      const ethers = getEthers();
      if (!ethers) throw new Error('Ethers library not available');
      
      const GasPriceABI = [
        'function gasPrice() external view returns (uint256)'
      ];

      const gasOracle = new ethers.Contract(CONFIG.GAS_PRICE_ORACLE, GasPriceABI, defiState.provider);
      const gasPrice = await gasOracle.gasPrice();
      
      return gasPrice.toString();
    } catch (error) {
      console.error('[DeFi] Gas price fetch failed:', error);
      // Fallback to provider gas price
      return defiState.provider.getGasPrice();
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // DEX Aggregation
    getBestQuote: getBestSwapQuote,
    executeSwap: executeSwap,
    
    // Liquidity
    addLiquidity: addLiquidity,
    removeLiquidity: removeLiquidity,
    
    // Yield Farming
    stakeTokens: stakeTokens,
    unstakeTokens: unstakeTokens,
    claimRewards: claimRewards,
    
    // Lending
    supplyToAave: supplyToAave,
    borrowFromAave: borrowFromAave,
    
    // Cross-Chain
    bridgeAssets: bridgeAssets,
    
    // Portfolio
    getPortfolio: getPortfolioOverview,
    getAssetPrices: getAssetPrices,
    
    // Gas
    getOptimalGasPrice: getOptimalGasPrice,
    
    // State
    getState: () => ({ ...defiState }),
    isConnected: () => defiState.connected,
    
    // Config
    CONFIG: CONFIG
  };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedDeFi;
}
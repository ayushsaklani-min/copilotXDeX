'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import DexAIAssistant from './components/DexAIAssistant';
import PoolAnalytics from './components/PoolAnalytics';
import { usePrices } from '../../hooks/usePrices';

const getExternalProvider = (): ethers.Eip1193Provider => {
  const maybeWindow = window as unknown as { ethereum?: unknown };
  if (!maybeWindow.ethereum || typeof maybeWindow.ethereum !== 'object') {
    throw new Error('No injected Ethereum provider found');
  }
  return maybeWindow.ethereum as ethers.Eip1193Provider;
};

const TOKENS = {
  TIK: '0xf0dc4aa8063810B4116091371a74D55856c9Fa87',
  TAK: '0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3',
  TOE: '0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc',
};

const DEX_ADDRESS = '0x3Db5A1C4bE6C21ceCaf3E74611Bd55F41651f0Ba';

export default function DexPage() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'analytics' | 'ai'>('swap');
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: string }>({ message: '', type: '' });

  // Swap state
  const [fromToken, setFromToken] = useState('TIK');
  const [toToken, setToToken] = useState('TOE');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Liquidity state
  const [liquidityTab, setLiquidityTab] = useState<'add' | 'remove'>('add');
  const [selectedPool, setSelectedPool] = useState('TIK-TOE');
  const [tokenA, setTokenA] = useState('TIK');
  const [tokenB, setTokenB] = useState('TOE');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Pool data
  const [pools, setPools] = useState<Array<{ name: string; token0: string; token1: string; lpToken: string; reserve0: string; reserve1: string; tvl: number; pairKey: string; totalSupply: string }>>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [userLpBalances, setUserLpBalances] = useState<{ [key: string]: string }>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Prices (mocked for now)
  const { prices } = usePrices();

  // Network configuration
  const POLYGON_AMOY_CONFIG = {
    chainId: 80002,
    chainIdHex: '0x13882',
    name: 'Polygon Amoy',
    rpcUrl: 'https://rpc-amoy.polygon.technology/',
    explorerUrl: 'https://amoy.polygonscan.com/',
  };

  // Check wallet connection
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider(getExternalProvider());
          const accounts = await provider.listAccounts();
          
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const network = await provider.getNetwork();
            
            setSigner(signer);
            setAddress(address);
            setIsConnected(true);
            setIsCorrectNetwork(Number(network.chainId) === POLYGON_AMOY_CONFIG.chainId);
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();
  }, [POLYGON_AMOY_CONFIG.chainId]);

  // Load token balances
  const loadBalances = async () => {
    if (!signer || !address) return;

    try {
      const ERC20_ABI = [
        'function balanceOf(address) view returns (uint256)',
      ];

      const balancesData: Record<string, number> = {};
      
      for (const [symbol, tokenAddress] of Object.entries(TOKENS)) {
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const balance = await contract.balanceOf(address);
        balancesData[symbol] = parseFloat(ethers.formatEther(balance));
      }

      setBalances(balancesData);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  useEffect(() => {
    loadBalances();
  }, [signer, address, loadBalances]);

  // Load pool data
  const loadPools = async () => {
    if (!signer) return;

    try {
      const dexAbi = [
        "function pairs(bytes32) external view returns (address, address, address, uint256, uint256, uint256, uint256)",
      ];

      const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, signer);
      
      const poolConfigs = [
        {
          name: 'TIK-TOE',
          token0: TOKENS.TIK,
          token1: TOKENS.TOE,
          lpToken: '0x9999e190b6Ab99B0AC123b880b0A51171e74BfFA',
        },
        {
          name: 'TAK-TOE',
          token0: TOKENS.TAK,
          token1: TOKENS.TOE,
          lpToken: '0x7287fe333C0432c1c48602A4838e5d96db65ED49',
        },
      ];

      const poolsData: Array<{ name: string; token0: string; token1: string; lpToken: string; reserve0: string; reserve1: string; tvl: number; pairKey: string; totalSupply: string }> = [];
      const lpBalances: { [key: string]: string } = {};
      
      for (const poolConfig of poolConfigs) {
        try {
          const tikToePairKey = ethers.keccak256(ethers.solidityPacked(["address", "address"], [poolConfig.token0, poolConfig.token1]));
          const pair = await dex.pairs(tikToePairKey);
          
          const tvl = Number(ethers.formatEther(pair[3])) + Number(ethers.formatEther(pair[4]));
          
          // Fetch user LP balance if address is available
          let userLpBalance = '0';
          if (address) {
            try {
              const erc20Abi = ["function balanceOf(address) external view returns (uint256)"];
              const lpContract = new ethers.Contract(poolConfig.lpToken, erc20Abi, signer);
              const balance = await lpContract.balanceOf(address);
              userLpBalance = ethers.formatEther(balance);
            } catch (error) {
              console.error(`Error fetching LP balance for ${poolConfig.name}:`, error);
            }
          }
          
          poolsData.push({
            name: poolConfig.name,
            token0: poolConfig.token0,
            token1: poolConfig.token1,
            lpToken: poolConfig.lpToken,
            reserve0: ethers.formatEther(pair[3]),
            reserve1: ethers.formatEther(pair[4]),
            tvl,
            pairKey: tikToePairKey,
            totalSupply: ethers.formatEther(pair[5]),
          });
          
          lpBalances[poolConfig.name] = userLpBalance;
        } catch (error) {
          console.error(`Error loading pool ${poolConfig.name}:`, error);
        }
      }

      setPools(poolsData);
      setUserLpBalances(lpBalances);
    } catch (error) {
      console.error('Error loading pools:', error);
    }
  };

  useEffect(() => {
    loadPools();
  }, [signer, loadPools]);

  // Connect wallet
  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(getExternalProvider());
      await provider.send("eth_requestAccounts", []);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      
      setSigner(signer);
      setAddress(address);
      setIsConnected(true);
      setIsCorrectNetwork(Number(network.chainId) === POLYGON_AMOY_CONFIG.chainId);
      
      if (Number(network.chainId) !== POLYGON_AMOY_CONFIG.chainId) {
        setStatus({ 
          message: `Please switch to Polygon Amoy network (Chain ID: ${POLYGON_AMOY_CONFIG.chainId})`, 
          type: 'error' 
        });
      } else {
        setStatus({ message: 'Wallet connected successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Connection error:', error);
      setStatus({ message: 'Failed to connect wallet', type: 'error' });
    }
  };

  // Switch network
  const switchToAmoyNetwork = async () => {
    try {
      await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY_CONFIG.chainIdHex }]
      });
      
      setIsCorrectNetwork(true);
      setStatus({ message: 'Switched to Polygon Amoy network!', type: 'success' });
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === 4902) {
        try {
          await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: POLYGON_AMOY_CONFIG.chainIdHex,
              chainName: POLYGON_AMOY_CONFIG.name,
              rpcUrls: [POLYGON_AMOY_CONFIG.rpcUrl],
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18,
              },
              blockExplorerUrls: [POLYGON_AMOY_CONFIG.explorerUrl]
            }]
          });
          setIsCorrectNetwork(true);
          setStatus({ message: 'Added and switched to Polygon Amoy network!', type: 'success' });
        } catch {
          setStatus({ message: 'Failed to add Polygon Amoy network to MetaMask', type: 'error' });
        }
      } else {
        setStatus({ message: 'Failed to switch to Polygon Amoy network', type: 'error' });
      }
    }
  };

  // Calculate output amount for swap
  const calculateOutput = useCallback(async () => {
    if (!signer || !fromAmount || parseFloat(fromAmount) <= 0 || fromToken === toToken) {
      setToAmount('');
      return;
    }

    try {
      const dexAbi = [
        "function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256)",
      ];
      
      const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, signer);
      const amountInWei = ethers.parseEther(fromAmount);
      const amountOutWei = await dex.getAmountOut(amountInWei, TOKENS[fromToken as keyof typeof TOKENS], TOKENS[toToken as keyof typeof TOKENS]);
      const amountOut = ethers.formatEther(amountOutWei);
      
      setToAmount(amountOut);
    } catch (error) {
      console.error('Error calculating output:', error);
      setToAmount('');
    }
  }, [signer, fromAmount, fromToken, toToken]);

  // Check approval status
  const checkApproval = useCallback(async () => {
    if (!signer || !address || !fromAmount || parseFloat(fromAmount) <= 0) {
      setIsApproved(false);
      return;
    }

    try {
      const erc20Abi = ['function allowance(address, address) view returns (uint256)'];
      const contract = new ethers.Contract(TOKENS[fromToken as keyof typeof TOKENS], erc20Abi, signer);
      const allowance = await contract.allowance(address, DEX_ADDRESS);
      const amountWei = ethers.parseEther(fromAmount);
      
      setIsApproved(allowance >= amountWei);
    } catch (error) {
      console.error('Error checking approval:', error);
      setIsApproved(false);
    }
  }, [signer, address, fromAmount, fromToken]);

  // Approve tokens
  const handleApprove = useCallback(async () => {
    if (!signer || !address) return;

    try {
      const erc20Abi = ['function approve(address, uint256) returns (bool)'];
      const contract = new ethers.Contract(TOKENS[fromToken as keyof typeof TOKENS], erc20Abi, signer);
      
      const amountWei = ethers.parseEther(fromAmount);
      const tx = await contract.approve(DEX_ADDRESS, amountWei);
      await tx.wait();
      
      setIsApproved(true);
      setStatus({ message: `${fromToken} approved successfully!`, type: 'success' });
    } catch (error) {
      console.error('Error approving token:', error);
      setStatus({ message: 'Failed to approve token', type: 'error' });
    }
  }, [signer, address, fromAmount, fromToken, setStatus]);

  // Execute swap
  const handleSwap = async () => {
    if (!signer || !address || !fromAmount || !toAmount) return;

    setIsSwapping(true);
    setStatus({ message: 'Executing swap...', type: 'info' });

    try {
      const dexAbi = [
        "function swapExactTokensForTokens(address tokenIn, address tokenOut, uint256 amountIn, address to) external returns (uint256)",
      ];
      
      const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, signer);
      const amountInWei = ethers.parseEther(fromAmount);
      
      const tx = await dex.swapExactTokensForTokens(
        TOKENS[fromToken as keyof typeof TOKENS],
        TOKENS[toToken as keyof typeof TOKENS],
        amountInWei,
        address
      );
      
      const receipt = await tx.wait();
      
      setStatus({ 
        message: `Swap successful! TX: ${receipt.hash.slice(0, 10)}...`, 
        type: 'success' 
      });
      
      // Reset form
      setFromAmount('');
      setToAmount('');
      setIsApproved(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error executing swap:', error);
      setStatus({ message: `Swap failed: ${err.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsSwapping(false);
    }
  };

  // Add liquidity
  const handleAddLiquidity = async () => {
    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      setStatus({ message: 'Please enter valid amounts', type: 'error' });
      return;
    }

    setIsAdding(true);
    setStatus({ message: 'Adding liquidity...', type: 'info' });

    try {
      const dexAbi = [
        "function addLiquidity(address token0, address token1, uint256 amount0, uint256 amount1, address to) external returns (uint256)",
      ];
      
      const erc20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function balanceOf(address) external view returns (uint256)",
      ];

      const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, signer);
      
      const amountAWei = ethers.parseEther(amountA);
      const amountBWei = ethers.parseEther(amountB);

      // Check token balances first
      const tokenAContract = new ethers.Contract(TOKENS[tokenA as keyof typeof TOKENS], erc20Abi, signer);
      const tokenBContract = new ethers.Contract(TOKENS[tokenB as keyof typeof TOKENS], erc20Abi, signer);

      const balanceA = await tokenAContract.balanceOf(address);
      const balanceB = await tokenBContract.balanceOf(address);

      console.log(`Token ${tokenA} balance:`, ethers.formatEther(balanceA));
      console.log(`Token ${tokenB} balance:`, ethers.formatEther(balanceB));
      console.log(`Required ${tokenA}:`, ethers.formatEther(amountAWei));
      console.log(`Required ${tokenB}:`, ethers.formatEther(amountBWei));

      if (balanceA < amountAWei) {
        setStatus({ message: `Insufficient ${tokenA} balance. You have ${ethers.formatEther(balanceA)} but need ${amountA}`, type: 'error' });
        setIsAdding(false);
        return;
      }

      if (balanceB < amountBWei) {
        setStatus({ message: `Insufficient ${tokenB} balance. You have ${ethers.formatEther(balanceB)} but need ${amountB}`, type: 'error' });
        setIsAdding(false);
        return;
      }

      // Get current gas price and increase it
      const feeData = await signer?.provider?.getFeeData();
      const gasPrice = feeData?.gasPrice ? feeData.gasPrice * BigInt(2) : ethers.parseUnits("30", "gwei");

      // Check allowances first
      const allowanceA = await tokenAContract.allowance(address, DEX_ADDRESS);
      const allowanceB = await tokenBContract.allowance(address, DEX_ADDRESS);

      console.log(`Current ${tokenA} allowance:`, ethers.formatEther(allowanceA));
      console.log(`Current ${tokenB} allowance:`, ethers.formatEther(allowanceB));

      if (allowanceA < amountAWei) {
        setStatus({ message: `Approving ${tokenA}...`, type: 'info' });
        const approveATx = await tokenAContract.approve(DEX_ADDRESS, amountAWei, {
          gasLimit: 100000,
          gasPrice: gasPrice
        });
        await approveATx.wait();
        console.log(`${tokenA} approved successfully`);
      }

      if (allowanceB < amountBWei) {
        setStatus({ message: `Approving ${tokenB}...`, type: 'info' });
        const approveBTx = await tokenBContract.approve(DEX_ADDRESS, amountBWei, {
          gasLimit: 100000,
          gasPrice: gasPrice
        });
        await approveBTx.wait();
        console.log(`${tokenB} approved successfully`);
      }

      // Add liquidity with proper gas settings
      setStatus({ message: 'Adding liquidity...', type: 'info' });
      console.log('Calling addLiquidity with:', {
        token0: TOKENS[tokenA as keyof typeof TOKENS],
        token1: TOKENS[tokenB as keyof typeof TOKENS],
        amount0: amountAWei.toString(),
        amount1: amountBWei.toString(),
        to: address
      });

      const tx = await dex.addLiquidity(
        TOKENS[tokenA as keyof typeof TOKENS],
        TOKENS[tokenB as keyof typeof TOKENS],
        amountAWei,
        amountBWei,
        address,
        {
          gasLimit: 300000,
          gasPrice: gasPrice
        }
      );
      
      console.log('Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      
      setStatus({ 
        message: `Liquidity added! TX: ${receipt.hash.slice(0, 10)}...`, 
        type: 'success' 
      });
      
      // Reset form
      setAmountA('');
      setAmountB('');
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Add liquidity error:', error);
      
      // Provide more specific error messages
      if (err.message?.includes('insufficient funds')) {
        setStatus({ message: 'Insufficient funds for gas fees', type: 'error' });
      } else if (err.message?.includes('user rejected')) {
        setStatus({ message: 'Transaction rejected by user', type: 'error' });
      } else if (err.message?.includes('execution reverted')) {
        setStatus({ message: 'Transaction failed - check token balances and allowances', type: 'error' });
      } else {
        setStatus({ message: `Add liquidity failed: ${err.message || 'Unknown error'}`, type: 'error' });
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Update output when inputs change
  useEffect(() => {
    if (isConnected && fromAmount) {
      calculateOutput();
    }
  }, [fromAmount, fromToken, toToken, isConnected, calculateOutput]);

  // Check approval when amount changes
  useEffect(() => {
    if (isConnected && fromAmount) {
      checkApproval();
    }
  }, [fromAmount, fromToken, isConnected, checkApproval]);

  const tabs = [
    { id: 'swap', label: 'Swap', icon: '🔄' },
    { id: 'liquidity', label: 'Liquidity', icon: '💧' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'ai', label: 'AI Assistant', icon: '🤖' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-cyan-500/30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-3 py-2 rounded-lg text-cyan-300 hover:text-white hover:bg-white/10 border border-cyan-500/30 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Portfolio
              </Link>
              <h1 className="text-3xl font-bold text-white">TikTakDex</h1>
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm font-semibold">
                Polygon Amoy
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-300">Connected</div>
                    <div className="text-white font-mono text-sm">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </div>
                  </div>
                  {!isCorrectNetwork && (
                    <button
                      onClick={switchToAmoyNetwork}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      Switch Network
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 min-h-[calc(100vh-96px)] flex flex-col">
        {/* Status Messages */}
        {status.message && (
          <div className={`mb-6 p-4 rounded-lg ${
            status.type === 'error' 
              ? 'bg-red-500/20 border border-red-500/50 text-red-300' 
              : status.type === 'success'
              ? 'bg-green-500/20 border border-green-500/50 text-green-300'
              : 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
          }`}>
            {status.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-black/20 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-md font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={`grid ${activeTab === 'liquidity' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} gap-8`}>
          {/* Main Panel */}
          <div className={`${activeTab === 'liquidity' ? 'lg:col-span-2' : ''}`}>
            {activeTab === 'swap' && (
              <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-8 min-h-[520px]">
                <h2 className="text-2xl font-bold text-white mb-6">Swap Tokens</h2>
                
                {/* From Token */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">From</label>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={fromToken}
                        onChange={(e) => setFromToken(e.target.value)}
                        className="bg-transparent text-white font-semibold text-lg focus:outline-none"
                      >
                        {Object.keys(TOKENS).map((symbol) => (
                          <option key={symbol} value={symbol} className="bg-gray-800 text-white">
                            {symbol}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="number"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-transparent text-white text-2xl font-bold focus:outline-none"
                      step="0.000001"
                      min="0"
                    />
                    <div className="text-sm text-gray-400 mt-1">
                      Balance: {balances[fromToken]?.toFixed(6) || '0.000000'} {fromToken}
                    </div>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center my-4">
                  <button
                    onClick={() => {
                      const tempToken = fromToken;
                      const tempAmount = fromAmount;
                      setFromToken(toToken);
                      setToToken(tempToken);
                      setFromAmount(toAmount);
                      setToAmount(tempAmount);
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>
                </div>

                {/* To Token */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">To</label>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={toToken}
                        onChange={(e) => setToToken(e.target.value)}
                        className="bg-transparent text-white font-semibold text-lg focus:outline-none"
                      >
                        {Object.keys(TOKENS).map((symbol) => (
                          <option key={symbol} value={symbol} className="bg-gray-800 text-white">
                            {symbol}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-white text-2xl font-bold">
                      {toAmount || '0.0'}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Balance: {balances[toToken]?.toFixed(6) || '0.000000'} {toToken}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!isApproved && fromAmount && (
                    <button
                      onClick={handleApprove}
                      disabled={!fromAmount || parseFloat(fromAmount) <= 0}
                      className="w-full py-4 px-6 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-500 text-black font-bold rounded-lg transition-colors"
                    >
                      Approve {fromToken}
                    </button>
                  )}
                  
                  <button
                    onClick={handleSwap}
                    disabled={isSwapping || !fromAmount || !toAmount || !isApproved || fromToken === toToken}
                    className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-500 text-white font-bold rounded-lg transition-all duration-200 shadow-lg"
                  >
                    {isSwapping ? 'Swapping...' : 'Swap'}
                  </button>
                </div>
              </div>
            )}
            
            {activeTab === 'liquidity' && (
              <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Liquidity Management</h2>
                  <button
                    onClick={async () => {
                      setIsRefreshing(true);
                      setStatus({ message: 'Refreshing data...', type: 'info' });
                      try {
                        await Promise.all([loadBalances(), loadPools()]);
                        setStatus({ message: 'Data refreshed', type: 'success' });
                      } catch {
                        setStatus({ message: 'Refresh failed', type: 'error' });
                      } finally {
                        setIsRefreshing(false);
                      }
                    }}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-60 text-cyan-300 rounded-lg border border-cyan-500/30 font-semibold"
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                
                {/* Liquidity Tabs */}
                <div className="flex space-x-1 mb-6 bg-black/20 rounded-lg p-1">
                  <button
                    onClick={() => setLiquidityTab('add')}
                    className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
                      liquidityTab === 'add'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Add Liquidity
                  </button>
                  <button
                    onClick={() => setLiquidityTab('remove')}
                    className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
                      liquidityTab === 'remove'
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Remove Liquidity
                  </button>
                </div>

                {liquidityTab === 'add' && (
                  <div className="space-y-6">
                    {/* Pool Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Select Pool</label>
                      <select
                        value={selectedPool}
                        onChange={(e) => {
                          setSelectedPool(e.target.value);
                          const pool = pools.find(p => p.name === e.target.value);
                          if (pool) {
                            setTokenA(pool.token0 === TOKENS.TIK ? 'TIK' : pool.token0 === TOKENS.TAK ? 'TAK' : 'TOE');
                            setTokenB(pool.token1 === TOKENS.TIK ? 'TIK' : pool.token1 === TOKENS.TAK ? 'TAK' : 'TOE');
                          }
                        }}
                        className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
                      >
                        {pools.map((pool) => (
                          <option key={pool.name} value={pool.name} className="bg-gray-800 text-white">
                            {pool.name} (TVL: ${pool.tvl.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Token A */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Token A</label>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <select
                            value={tokenA}
                            onChange={(e) => setTokenA(e.target.value)}
                            className="bg-transparent text-white font-semibold text-lg focus:outline-none"
                          >
                            {Object.keys(TOKENS).map((symbol) => (
                              <option key={symbol} value={symbol} className="bg-gray-800 text-white">
                                {symbol}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="number"
                          value={amountA}
                          onChange={(e) => setAmountA(e.target.value)}
                          placeholder="0.0"
                          className="w-full bg-transparent text-white text-2xl font-bold focus:outline-none"
                          step="0.000001"
                          min="0"
                        />
                        <div className="text-sm text-gray-400 mt-1">
                          Balance: {balances[tokenA]?.toFixed(6) || '0.000000'} {tokenA}
                        </div>
                      </div>
                    </div>

                    {/* Token B */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Token B</label>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <select
                            value={tokenB}
                            onChange={(e) => setTokenB(e.target.value)}
                            className="bg-transparent text-white font-semibold text-lg focus:outline-none"
                          >
                            {Object.keys(TOKENS).map((symbol) => (
                              <option key={symbol} value={symbol} className="bg-gray-800 text-white">
                                {symbol}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="number"
                          value={amountB}
                          onChange={(e) => setAmountB(e.target.value)}
                          placeholder="0.0"
                          className="w-full bg-transparent text-white text-2xl font-bold focus:outline-none"
                          step="0.000001"
                          min="0"
                        />
                        <div className="text-sm text-gray-400 mt-1">
                          Balance: {balances[tokenB]?.toFixed(6) || '0.000000'} {tokenB}
                        </div>
                      </div>
                    </div>

                    {/* Add Liquidity Button */}
                    <button
                      onClick={handleAddLiquidity}
                      disabled={isAdding || !amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0}
                      className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-500 text-white font-bold rounded-lg transition-all duration-200 shadow-lg"
                    >
                      {isAdding ? 'Adding Liquidity...' : 'Add Liquidity'}
                    </button>
                  </div>
                )}

                {liquidityTab === 'remove' && (
                  <div className="space-y-6">
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">Remove liquidity coming soon!</div>
                      <div className="text-sm text-gray-500">This feature will be available soon</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'analytics' && (
              <PoolAnalytics
                signer={signer}
                address={address}
                isConnected={isConnected}
                isCorrectNetwork={isCorrectNetwork}
                prices={prices}
                dex={{
                  pairs: pools.map((p) => ({
                    name: p.name,
                    reserve0: Number(p.reserve0),
                    reserve1: Number(p.reserve1),
                  }))
                }}
              />
            )}

            {activeTab === 'ai' && (
              <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6 min-h-[520px]">
                <h2 className="text-2xl font-bold text-white mb-6">AI Assistant</h2>
                <DexAIAssistant 
                  signer={signer}
                  address={address}
                  pools={pools}
                  userLpBalances={userLpBalances}
                  userBalances={Object.fromEntries(Object.entries(balances).map(([key, value]) => [key, value.toString()]))}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {activeTab === 'liquidity' && (
              <>
                {/* Pool Overview */}
                <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Pool Overview</h3>
                  <div className="space-y-3">
                    {pools.map((pool) => (
                      <div key={pool.name} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <div>
                          <div className="text-white font-semibold">{pool.name}</div>
                          <div className="text-gray-400 text-sm">
                            Reserve: {parseFloat(pool.reserve0).toFixed(1)} / {parseFloat(pool.reserve1).toFixed(1)}
                          </div>
                          <div className="text-gray-500 text-xs">
                            LP: {pool.lpToken.slice(0, 6)}...{pool.lpToken.slice(-4)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-300 font-semibold">${pool.tvl.toFixed(2)}</div>
                          <div className="text-gray-400 text-sm">TVL</div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center py-4 text-sm text-green-500">
                      ✅ Pools have liquidity - Ready for trading!
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Pairs</span>
                      <span className="text-white font-semibold">{pools.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total TVL</span>
                      <span className="text-white font-semibold">
                        ${pools.reduce((sum, pool) => sum + pool.tvl, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">24h Volume</span>
                      <span className="text-white font-semibold">$0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">DEX Contract</span>
                      <span className="text-cyan-300 font-mono text-xs">0x3Db5...f0Ba</span>
                    </div>
                  </div>
                </div>

                {/* Contract Info */}
                <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Contract Info</h3>
                  <div className="space-y-3 text-sm text-gray-300">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="font-semibold text-green-300 mb-1">✅ DEX LIVE</div>
                      <div className="text-xs">Fully operational on Polygon Amoy</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="font-semibold text-green-300 mb-1">✅ Liquidity Added</div>
                      <div className="text-xs">${pools.reduce((sum, pool) => sum + pool.tvl, 0).toFixed(2)} TVL across {pools.length} pairs</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="font-semibold text-green-300 mb-1">✅ Ready for Trading</div>
                      <div className="text-xs">Swap tokens and earn fees</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <a 
                        href="https://amoy.polygonscan.com/address/0x3Db5A1C4bE6C21ceCaf3E74611Bd55F41651f0Ba" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-300 hover:text-blue-200 mb-1 block"
                      >
                        View on Explorer →
                      </a>
                      <div className="text-xs">0x3Db5...f0Ba</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
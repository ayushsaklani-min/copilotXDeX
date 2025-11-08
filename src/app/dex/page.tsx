'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import DexAIAssistant from './components/DexAIAssistant';
import PoolAnalytics from './components/PoolAnalytics';
import FarmDashboard from '../components/FarmDashboard';
import ReferralDashboard from '../components/ReferralDashboard';
import GovernanceDashboard from '../components/GovernanceDashboard';
import { usePrices } from '../../hooks/usePrices';
import contracts from '../../config/contracts.json';

const getExternalProvider = (): ethers.Eip1193Provider => {
  const maybeWindow = window as unknown as { ethereum?: unknown };
  if (!maybeWindow.ethereum || typeof maybeWindow.ethereum !== 'object') {
    throw new Error('No injected Ethereum provider found');
  }
  return maybeWindow.ethereum as ethers.Eip1193Provider;
};

const TOKENS = contracts.tokens as Record<string, string>;

const DEX_ADDRESS = contracts.dexAddress as string;

export default function DexPage() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'analytics' | 'ai' | 'farming' | 'referrals' | 'governance'>('swap');
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
  const [feeRateBps, setFeeRateBps] = useState<number | null>(null);

  // Liquidity state
  const [liquidityTab, setLiquidityTab] = useState<'add' | 'remove'>('add');
  const [selectedPool, setSelectedPool] = useState('TIK-TOE');
  const [tokenA, setTokenA] = useState('TIK');
  const [tokenB, setTokenB] = useState('TOE');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  // Remove liquidity state
  const [removePool, setRemovePool] = useState('TIK-TOE');
  const [lpAmount, setLpAmount] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  // Pool data
  const [pools, setPools] = useState<Array<{ name: string; token0: string; token1: string; lpToken: string; reserve0: string; reserve1: string; tvl: number; pairKey: string; totalSupply: string }>>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [userLpBalances, setUserLpBalances] = useState<{ [key: string]: string }>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Prices from real reserves
  const { prices } = usePrices(signer);

  // Network configuration
  const POLYGON_AMOY_CONFIG = {
    chainId: 80002,
    chainIdHex: '0x13882',
    name: 'Polygon Amoy',
    rpcUrl: process.env.NEXT_PUBLIC_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology/',
    fallbackRpcUrl: process.env.NEXT_PUBLIC_AMOY_FALLBACK_RPC_URL || 'https://polygon-amoy.infura.io/v3/5b88739e5f9d4b828d0c2237429f0524',
    explorerUrl: 'https://amoy.polygonscan.com/',
  };

  // Check wallet connection
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      const maybeWindow = window as unknown as { ethereum?: unknown };
      if (!maybeWindow.ethereum) {
        return;
      }

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
    };

    void checkConnection();
  }, [POLYGON_AMOY_CONFIG.chainId]);

  // Load token balances
  const loadBalances = useCallback(async () => {
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
  }, [signer, address]);

  useEffect(() => {
    loadBalances();
  }, [signer, address, loadBalances]);

  // Load pool data
  const loadPools = useCallback(async () => {
    if (!signer) return;

    try {
      const dexAbi = [
        "function pairs(bytes32) external view returns (address, address, address, uint256, uint256, uint256, uint256)",
      ];

      const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, signer);
      
      const poolConfigs = (contracts.pairs as Array<{ name: string; token0: string; token1: string; lpToken: string }>);

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
  }, [signer, address]);

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

  // Calculate output amount for swap with retry logic
  const calculateOutput = useCallback(async () => {
    if (!signer || !fromAmount || parseFloat(fromAmount) <= 0 || fromToken === toToken) {
      setToAmount('');
      setFeeRateBps(null);
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const dexAbi = [
          "function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256)",
          "function getUserFeeRate(address user) external view returns (uint256)"
        ];
        
        const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, signer);
        const amountInWei = ethers.parseEther(fromAmount);
        
        // Add timeout and retry logic
        const amountOutWei = await Promise.race([
          dex.getAmountOut(amountInWei, TOKENS[fromToken as keyof typeof TOKENS], TOKENS[toToken as keyof typeof TOKENS]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]) as bigint;
        
        const amountOut = ethers.formatEther(amountOutWei);
        
        // Try to get fee rate with retry
        try {
          const rate = await Promise.race([
            dex.getUserFeeRate(address),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]) as bigint;
          setFeeRateBps(Number(rate));
        } catch (feeError) {
          console.warn('Fee rate fetch failed:', feeError);
          setFeeRateBps(null);
        }
        
        setToAmount(amountOut);
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        console.warn(`Output calculation attempt ${retryCount} failed:`, error);
        
        if (error.message?.includes('missing revert data') || 
            error.message?.includes('Internal JSON-RPC error') ||
            error.message?.includes('Timeout')) {
          if (retryCount < maxRetries) {
            console.log(`Retrying output calculation in ${retryCount * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
            continue;
          } else {
            console.error('Output calculation failed after retries:', error);
            setToAmount('');
            setFeeRateBps(null);
            setStatus({ message: 'Unable to calculate swap output. Please try again.', type: 'error' });
            break;
          }
        } else {
          console.error('Error calculating output:', error);
          setToAmount('');
          setFeeRateBps(null);
          break;
        }
      }
    }
  }, [signer, fromAmount, fromToken, toToken, address]);

  // Check approval status with retry logic
  const checkApproval = useCallback(async () => {
    if (!signer || !address || !fromAmount || parseFloat(fromAmount) <= 0) {
      setIsApproved(false);
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const erc20Abi = ['function allowance(address, address) view returns (uint256)'];
        const contract = new ethers.Contract(TOKENS[fromToken as keyof typeof TOKENS], erc20Abi, signer);
        
        // Add timeout
        const allowance = await Promise.race([
          contract.allowance(address, DEX_ADDRESS),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]) as bigint;
        
        const amountWei = ethers.parseEther(fromAmount);
        setIsApproved(allowance >= amountWei);
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        console.warn(`Approval check attempt ${retryCount} failed:`, error);
        
        if (error.message?.includes('missing revert data') || 
            error.message?.includes('Internal JSON-RPC error') ||
            error.message?.includes('Timeout')) {
          if (retryCount < maxRetries) {
            console.log(`Retrying approval check in ${retryCount * 500}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 500));
            continue;
          } else {
            console.error('Approval check failed after retries:', error);
            setIsApproved(false);
            break;
          }
        } else {
          console.error('Error checking approval:', error);
          setIsApproved(false);
          break;
        }
      }
    }
  }, [signer, address, fromAmount, fromToken]);

  // Approve tokens with retry logic
  const handleApprove = useCallback(async () => {
    if (!signer || !address || !fromAmount || parseFloat(fromAmount) <= 0) {
      setStatus({ message: 'Enter a valid amount before approving.', type: 'error' });
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const erc20Abi = [
          'function approve(address, uint256) returns (bool)',
          'function allowance(address, address) view returns (uint256)',
          'function decimals() view returns (uint8)'
        ];
        const contract = new ethers.Contract(TOKENS[fromToken as keyof typeof TOKENS], erc20Abi, signer);

        let decimals = 18;
        try {
          decimals = await contract.decimals();
        } catch (decError) {
          console.warn('Failed to fetch token decimals, defaulting to 18:', decError);
        }

        const amountWei = ethers.parseUnits(fromAmount, decimals);

        // Check existing allowance to avoid unnecessary transactions
        let currentAllowance = 0n;
        try {
          currentAllowance = await contract.allowance(address, DEX_ADDRESS);
        } catch (allowError) {
          console.warn('Failed to fetch allowance:', allowError);
        }

        if (currentAllowance >= amountWei) {
          setIsApproved(true);
          setStatus({ message: `${fromToken} is already approved for this amount.`, type: 'success' });
          break;
        }

        // Some tokens require allowance reset to zero before setting a new value
        if (currentAllowance > 0n) {
          try {
            let resetGas = 60000n;
            try {
              resetGas = await contract.approve.estimateGas(DEX_ADDRESS, 0n);
            } catch (resetGasError) {
              console.warn('Allowance reset gas estimation failed, using default:', resetGasError);
            }
            const resetTx = await contract.approve(DEX_ADDRESS, 0n, {
              gasLimit: resetGas + 10000n
            });
            await resetTx.wait();
          } catch (resetError: any) {
            console.error('Failed to reset allowance:', resetError);
            throw resetError;
          }
        }

        // Estimate gas for approval
        let gasEstimate = 100000n;
        try {
          gasEstimate = await contract.approve.estimateGas(DEX_ADDRESS, amountWei);
        } catch (gasError: any) {
          console.warn('Gas estimation for approval failed:', gasError);
          if (gasError.reason || gasError.code === 'CALL_EXCEPTION') {
            throw new Error(gasError.reason || 'Approval would fail. Check balances and try again.');
          }
        }

        const tx = await contract.approve(DEX_ADDRESS, amountWei, {
          gasLimit: gasEstimate + 20000n // Add buffer
        });

        const receipt = await tx.wait();

        if (receipt && receipt.status === 1) {
          setIsApproved(true);
          setStatus({ message: `${fromToken} approved successfully!`, type: 'success' });
          break; // Success, exit retry loop
        } else {
          throw new Error('Approval transaction failed.');
        }
      } catch (error: any) {
        retryCount++;
        console.warn(`Approval attempt ${retryCount} failed:`, error);

        // User rejected the transaction
        if (error.code === 'ACTION_REJECTED' || error.code === 4001 || error.message?.includes('user rejected')) {
          setStatus({ message: 'Transaction was rejected by user', type: 'error' });
          break;
        }

        if (retryCount < maxRetries) {
          console.log(`Retrying approval in ${retryCount * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
          continue;
        }

        // Provide detailed error feedback
        if (error.reason) {
          setStatus({ message: `Approval failed: ${error.reason}`, type: 'error' });
        } else if (error.error?.message) {
          setStatus({ message: `Approval failed: ${error.error.message}`, type: 'error' });
        } else if (error.message?.includes('Internal JSON-RPC error')) {
          setStatus({ message: 'RPC error during approval. Please try again or switch RPC provider.', type: 'error' });
        } else {
          setStatus({ message: error.message || 'Failed to approve token. Please try again.', type: 'error' });
        }
        break;
      }
    }
  }, [signer, address, fromAmount, fromToken, setStatus]);

  // Execute swap with retry logic
  const handleSwap = async () => {
    if (!signer || !address || !fromAmount || !toAmount) return;

    setIsSwapping(true);
    setStatus({ message: 'Executing swap...', type: 'info' });

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const dexAbi = [
          "function swapExactTokensForTokens(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address to) external returns (uint256)",
          "function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256)",
        ];
        
        const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, signer);
        const amountInWei = ethers.parseEther(fromAmount);
        
        // Recalculate amountOut in wei to ensure accuracy
        let amountOutWei: bigint;
        try {
          amountOutWei = await dex.getAmountOut(
            amountInWei,
            TOKENS[fromToken as keyof typeof TOKENS],
            TOKENS[toToken as keyof typeof TOKENS]
          );
        } catch (calcError) {
          console.error('Failed to calculate amount out:', calcError);
          throw new Error('Failed to calculate swap output. Please try again.');
        }
        
        // Calculate minimum amount out with 0.5% slippage tolerance (in wei)
        const slippageTolerance = 0.005; // 0.5%
        // Apply slippage: amountOutMin = amountOut * (1 - slippage)
        // Use BigInt arithmetic to avoid precision loss
        const slippageBps = BigInt(Math.floor(slippageTolerance * 10000)); // 50 = 0.5%
        const amountOutMinWei = (amountOutWei * (10000n - slippageBps)) / 10000n;
        
        // Estimate gas first
        let gasEstimate;
        try {
          gasEstimate = await dex.swapExactTokensForTokens.estimateGas(
            TOKENS[fromToken as keyof typeof TOKENS],
            TOKENS[toToken as keyof typeof TOKENS],
            amountInWei,
            amountOutMinWei,
            address
          );
        } catch (gasError: any) {
          console.warn('Gas estimation failed:', gasError);
          // If gas estimation fails, check if it's a revert reason
          if (gasError.reason || gasError.data) {
            throw new Error(gasError.reason || 'Transaction would fail. Check token approval and balances.');
          }
          gasEstimate = 300000n; // Default gas limit for swaps
        }
        
        const tx = await dex.swapExactTokensForTokens(
          TOKENS[fromToken as keyof typeof TOKENS],
          TOKENS[toToken as keyof typeof TOKENS],
          amountInWei,
          amountOutMinWei,
          address,
          {
            gasLimit: gasEstimate + 20000n // Add buffer
          }
        );
        
        const receipt = await tx.wait();

        // Reputation is automatically updated by the DEX contract on-chain
        // No need for manual update - the contract handles it via _awardReputation
        
        setStatus({ 
          message: `Swap successful! TX: ${receipt.hash.slice(0, 10)}...`, 
          type: 'success' 
        });
        
        // Reset form
        setFromAmount('');
        setToAmount('');
        setIsApproved(false);
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        console.warn(`Swap attempt ${retryCount} failed:`, error);
        
        // Handle user rejection
        if (error.code === 'ACTION_REJECTED' || error.code === 4001 || error.message?.includes('user rejected')) {
          setStatus({ 
            message: 'Transaction was rejected by user', 
            type: 'error' 
          });
          break;
        }
        
        // Handle RPC errors with retry
        if (error.message?.includes('Internal JSON-RPC error') ||
            error.message?.includes('could not coalesce error') ||
            error.message?.includes('network') ||
            error.message?.includes('timeout')) {
          if (retryCount < maxRetries) {
            console.log(`Retrying swap in ${retryCount * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
            continue;
          } else {
            setStatus({ 
              message: 'Network error. Please check your connection and try again.', 
              type: 'error' 
            });
            break;
          }
        }
        
        // Handle transaction revert
        if (error.reason || error.data || error.code === 'CALL_EXCEPTION') {
          let errorMsg = 'Swap failed. ';
          if (error.reason) {
            errorMsg += error.reason;
          } else if (error.message?.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
            errorMsg += 'Slippage too high. Try increasing slippage tolerance or reducing amount.';
          } else if (error.message?.includes('INSUFFICIENT_LIQUIDITY')) {
            errorMsg += 'Insufficient liquidity in pool.';
          } else if (error.message?.includes('PAIR_NOT_EXISTS')) {
            errorMsg += 'Trading pair does not exist.';
          } else {
            errorMsg += 'Check token approval and balances.';
          }
          setStatus({ message: errorMsg, type: 'error' });
          break;
        }
        
        // Generic error
        console.error('Error executing swap:', error);
        setStatus({ 
          message: `Swap failed: ${error.message || 'Unknown error. Please try again.'}`, 
          type: 'error' 
        });
        break;
      }
    }
    
    setIsSwapping(false);
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

      // Reputation is automatically updated by the DEX contract on-chain
      // No need for manual update - the contract handles it via _awardReputation
      
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

  // Remove liquidity
  const handleRemoveLiquidity = async () => {
    if (!signer || !address) return;

    const pool = pools.find((p) => p.name === removePool);
    if (!pool) {
      setStatus({ message: 'Pool not found', type: 'error' });
      return;
    }

    if (!lpAmount || parseFloat(lpAmount) <= 0) {
      setStatus({ message: 'Please enter valid LP amount', type: 'error' });
      return;
    }

    setIsRemoving(true);
    setStatus({ message: 'Removing liquidity...', type: 'info' });

    try {
      const dexAbi = [
        'function removeLiquidity(address token0, address token1, uint256 lpAmount, address to) external returns (uint256, uint256)'
      ];

      const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, signer);
      const lpAmountWei = ethers.parseEther(lpAmount);

      const feeData = await signer.provider?.getFeeData();
      const gasPrice = feeData?.gasPrice ? feeData.gasPrice * BigInt(2) : ethers.parseUnits('30', 'gwei');

      const tx = await dex.removeLiquidity(
        pool.token0,
        pool.token1,
        lpAmountWei,
        address,
        {
          gasLimit: 300000,
          gasPrice: gasPrice
        }
      );

      const receipt = await tx.wait();

      setStatus({
        message: `Liquidity removed! TX: ${receipt.hash.slice(0, 10)}...`,
        type: 'success'
      });

      setLpAmount('');
      // Refresh balances and pools
      await Promise.all([loadBalances(), loadPools()]);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Remove liquidity error:', error);
      if (err.message?.includes('insufficient funds')) {
        setStatus({ message: 'Insufficient funds for gas fees', type: 'error' });
      } else if (err.message?.includes('user rejected')) {
        setStatus({ message: 'Transaction rejected by user', type: 'error' });
      } else if (err.message?.includes('execution reverted')) {
        setStatus({ message: 'Transaction failed - check LP balance', type: 'error' });
      } else {
        setStatus({ message: `Remove liquidity failed: ${err.message || 'Unknown error'}`, type: 'error' });
      }
    } finally {
      setIsRemoving(false);
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
    { id: 'farming', label: 'Farming', icon: '🌾' },
    { id: 'referrals', label: 'Referrals', icon: '👥' },
    { id: 'governance', label: 'Governance', icon: '🏛️' },
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
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
               className={`grid ${['liquidity', 'farming', 'referrals'].includes(activeTab) ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} gap-8`}
          >
            {/* Main Panel */}
            <div className={`${['liquidity', 'farming', 'referrals'].includes(activeTab) ? 'lg:col-span-2' : ''}`}>
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
                    {feeRateBps !== null && (
                      <div className="text-sm text-gray-300 flex items-center gap-2">
                        <span>
                          Fee Rate: <span className="text-white font-semibold">{(feeRateBps / 100).toFixed(2)}%</span>
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                          {feeRateBps <= 5 ? '💎 Diamond' : feeRateBps <= 10 ? '🥇 Gold' : feeRateBps <= 20 ? '🥈 Silver' : '🥉 Bronze'}
                        </span>
                      </div>
                    )}
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
                      {/* Pool Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Select Pool</label>
                        <select
                          value={removePool}
                          onChange={(e) => setRemovePool(e.target.value)}
                          className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
                        >
                          {pools.map((pool) => (
                            <option key={pool.name} value={pool.name} className="bg-gray-800 text-white">
                              {pool.name} (Your LP: {parseFloat(userLpBalances[pool.name] || '0').toFixed(6)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* LP Amount */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">LP Token Amount</label>
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-semibold text-lg">LP Tokens</span>
                            <button
                              onClick={() => setLpAmount((userLpBalances[removePool] || '0'))}
                              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                              MAX
                            </button>
                          </div>
                          <input
                            type="number"
                            value={lpAmount}
                            onChange={(e) => setLpAmount(e.target.value)}
                            placeholder="0.0"
                            className="w-full bg-transparent text-white text-2xl font-bold focus:outline-none"
                            step="0.000001"
                            min="0"
                          />
                          <div className="text-sm text-gray-400 mt-1">
                            Balance: {parseFloat(userLpBalances[removePool] || '0').toFixed(6)} LP
                          </div>
                        </div>
                      </div>

                      {/* Remove Liquidity Button */}
                      <button
                        onClick={handleRemoveLiquidity}
                        disabled={isRemoving || !lpAmount || parseFloat(lpAmount) <= 0}
                        className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-500 text-white font-bold rounded-lg transition-all duration-200 shadow-lg"
                      >
                        {isRemoving ? 'Removing Liquidity...' : 'Remove Liquidity'}
                      </button>
                    </div>
                  )}
                </div>
              )}

                 {activeTab === 'farming' && (
                   <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
                     <FarmDashboard
                       standalone={false}
                       signerOverride={signer}
                       addressOverride={address}
                       networkOkOverride={isCorrectNetwork}
                     />
                   </div>
                 )}

                 {activeTab === 'referrals' && (
                   <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
                     <ReferralDashboard
                       standalone={false}
                       signer={signer}
                       address={address}
                     />
                   </div>
                 )}

                 {activeTab === 'governance' && (
                   <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
                     <GovernanceDashboard
                       standalone={false}
                       signer={signer}
                       address={address}
                     />
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
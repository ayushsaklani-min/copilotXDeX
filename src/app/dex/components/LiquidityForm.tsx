'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiquidity } from '../../../hooks/useLiquidity';

interface LiquidityFormProps {
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  onStatusChange: (status: { message: string; type: string }) => void;
}

const TOKENS = {
  TIK: '0xf0dc4aa8063810B4116091371a74D55856c9Fa87',
  TAK: '0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3',
  TOE: '0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc',
};

const TOKEN_SYMBOLS = Object.keys(TOKENS);

export default function LiquidityForm({
  signer,
  address,
  isConnected,
  isCorrectNetwork,
  onStatusChange,
}: LiquidityFormProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const [selectedPool, setSelectedPool] = useState('TIK-TOE');
  
  // Add liquidity state
  const [tokenA, setTokenA] = useState('TIK');
  const [tokenB, setTokenB] = useState('TOE');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Remove liquidity state
  const [removePool, setRemovePool] = useState('TIK-TOE');
  const [lpAmount, setLpAmount] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  
  // Token balances
  const [balances, setBalances] = useState<Record<string, number>>({});

  const liquidity = useLiquidity(signer, address);

  // Load token balances
  useEffect(() => {
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

    loadBalances();
  }, [signer, address]);

  // Calculate optimal amount B when amount A changes
  useEffect(() => {
    if (!amountA || parseFloat(amountA) <= 0) {
      setAmountB('');
      return;
    }

    const pool = liquidity.pools.find(p => p.name === selectedPool);
    if (!pool) return;

    try {
      const reserveA = tokenA === pool.token0 ? parseFloat(pool.reserve0) : parseFloat(pool.reserve1);
      const reserveB = tokenB === pool.token0 ? parseFloat(pool.reserve0) : parseFloat(pool.reserve1);
      
      if (reserveA > 0 && reserveB > 0) {
        const optimalAmountB = (parseFloat(amountA) * reserveB) / reserveA;
        setAmountB(optimalAmountB.toFixed(6));
      }
    } catch (error) {
      console.error('Error calculating optimal amount:', error);
    }
  }, [amountA, tokenA, tokenB, selectedPool, liquidity.pools]);

  const handleAddLiquidity = async () => {
    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      onStatusChange({ message: 'Please enter valid amounts', type: 'error' });
      return;
    }

    setIsAdding(true);
    onStatusChange({ message: 'Adding liquidity...', type: 'info' });

    try {
      const txHash = await liquidity.addLiquidity(
        TOKENS[tokenA as keyof typeof TOKENS],
        TOKENS[tokenB as keyof typeof TOKENS],
        amountA,
        amountB
      );

      if (txHash) {
        onStatusChange({ 
          message: `Liquidity added! TX: ${txHash.slice(0, 10)}...`, 
          type: 'success' 
        });
        
        // Reset form
        setAmountA('');
        setAmountB('');
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      onStatusChange({ message: err.message || 'Unknown error occurred', type: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!lpAmount || parseFloat(lpAmount) <= 0) {
      onStatusChange({ message: 'Please enter valid LP amount', type: 'error' });
      return;
    }

    const pool = liquidity.pools.find(p => p.name === removePool);
    if (!pool) {
      onStatusChange({ message: 'Pool not found', type: 'error' });
      return;
    }

    setIsRemoving(true);
    onStatusChange({ message: 'Removing liquidity...', type: 'info' });

    try {
      const txHash = await liquidity.removeLiquidity(
        pool.token0,
        pool.token1,
        lpAmount
      );

      if (txHash) {
        onStatusChange({ 
          message: `Liquidity removed! TX: ${txHash.slice(0, 10)}...`, 
          type: 'success' 
        });
        
        // Reset form
        setLpAmount('');
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      onStatusChange({ message: err.message || 'Unknown error occurred', type: 'error' });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleMaxAmount = (token: 'A' | 'B') => {
    const balance = token === 'A' ? balances[tokenA] : balances[tokenB];
    if (token === 'A') {
      setAmountA(balance.toString());
    } else {
      setAmountB(balance.toString());
    }
  };

  const handleMaxLpAmount = () => {
    const pool = liquidity.pools.find(p => p.name === removePool);
    if (pool) {
      setLpAmount(pool.userLpBalance);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-300">Please connect your wallet to manage liquidity</p>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-red-500/30 p-8 text-center">
        <h2 className="text-2xl font-bold text-red-300 mb-4">Wrong Network</h2>
        <p className="text-gray-300">Please switch to Polygon Amoy network</p>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Liquidity Management</h2>
      
      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-black/20 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
            activeTab === 'add'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setActiveTab('remove')}
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
            activeTab === 'remove'
              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          Remove Liquidity
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'add' && (
          <motion.div
            key="add"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="space-y-6"
          >
          {/* Pool Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Select Pool</label>
            <select
              value={selectedPool}
              onChange={(e) => {
                setSelectedPool(e.target.value);
                const pool = liquidity.pools.find(p => p.name === e.target.value);
                if (pool) {
                  setTokenA(pool.token0 === TOKENS.TIK ? 'TIK' : pool.token0 === TOKENS.TAK ? 'TAK' : 'TOE');
                  setTokenB(pool.token1 === TOKENS.TIK ? 'TIK' : pool.token1 === TOKENS.TAK ? 'TAK' : 'TOE');
                }
              }}
              className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
            >
              {liquidity.pools.map((pool) => (
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
                  {TOKEN_SYMBOLS.map((symbol) => (
                    <option key={symbol} value={symbol} className="bg-gray-800 text-white">
                      {symbol}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleMaxAmount('A')}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  MAX
                </button>
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
                  {TOKEN_SYMBOLS.map((symbol) => (
                    <option key={symbol} value={symbol} className="bg-gray-800 text-white">
                      {symbol}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleMaxAmount('B')}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  MAX
                </button>
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
          </motion.div>
        )}

        {activeTab === 'remove' && (
          <motion.div
            key="remove"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="space-y-6"
          >
          {/* Pool Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Select Pool</label>
            <select
              value={removePool}
              onChange={(e) => setRemovePool(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
            >
              {liquidity.pools.map((pool) => (
                <option key={pool.name} value={pool.name} className="bg-gray-800 text-white">
                  {pool.name} (Your LP: {parseFloat(pool.userLpBalance).toFixed(6)})
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
                  onClick={handleMaxLpAmount}
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
                Balance: {liquidity.pools.find(p => p.name === removePool)?.userLpBalance || '0.000000'} LP
              </div>
            </div>
          </div>

          {/* Pool Info */}
          {liquidity.pools.find(p => p.name === removePool) && (
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Pool Information</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Your Share:</span>
                  <span className="text-cyan-300 font-semibold">
                    {liquidity.pools.find(p => p.name === removePool)?.userShare.toFixed(4)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pool TVL:</span>
                  <span className="text-green-300 font-semibold">
                    ${liquidity.pools.find(p => p.name === removePool)?.tvl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reserves:</span>
                  <span className="text-white">
                    {liquidity.pools.find(p => p.name === removePool)?.reserve0} / {liquidity.pools.find(p => p.name === removePool)?.reserve1}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Remove Liquidity Button */}
          <button
            onClick={handleRemoveLiquidity}
            disabled={isRemoving || !lpAmount || parseFloat(lpAmount) <= 0}
            className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-500 text-white font-bold rounded-lg transition-all duration-200 shadow-lg"
          >
            {isRemoving ? 'Removing Liquidity...' : 'Remove Liquidity'}
          </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pool Overview */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-4">Your Liquidity Positions</h3>
        <div className="space-y-3">
          {liquidity.pools.map((pool) => (
            <div key={pool.name} className="bg-white/5 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white font-semibold">{pool.name}</div>
                  <div className="text-gray-400 text-sm">
                    LP Balance: {parseFloat(pool.userLpBalance).toFixed(6)}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Your Share: {pool.userShare.toFixed(4)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-300 font-semibold">${pool.tvl.toFixed(2)}</div>
                  <div className="text-gray-400 text-sm">TVL</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
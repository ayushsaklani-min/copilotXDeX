'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contracts from '../../../config/contracts.json';

interface SwapFormProps {
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  onStatusChange: (status: { message: string; type: string }) => void;
  dex: { getAmountOut: (amount: number, tokenIn: string, tokenOut: string) => Promise<number>; swapTokens: (tokenIn: string, tokenOut: string, amountIn: number, amountOutMin: number, to: string) => Promise<string | null> };
  prices: Record<string, number>;
}

const TOKENS = contracts.tokens as Record<string, string>;

const TOKEN_SYMBOLS = Object.keys(TOKENS);

export default function SwapForm({
  signer,
  address,
  isConnected,
  isCorrectNetwork,
  onStatusChange,
  dex,
}: SwapFormProps) {
  const [fromToken, setFromToken] = useState('TIK');
  const [toToken, setToToken] = useState('TAK');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({});

  // Load token balances
  useEffect(() => {
    const loadBalances = async () => {
      if (!signer || !address) return;

      try {
        const ERC20_ABI = [
          'function balanceOf(address) view returns (uint256)',
          'function approve(address, uint256) returns (bool)',
          'function allowance(address, address) view returns (uint256)',
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

  // Calculate output amount
  useEffect(() => {
    const calculateOutput = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0 || fromToken === toToken) {
        setToAmount('');
        return;
      }

      try {
        const amountOut = await dex.getAmountOut(
          parseFloat(fromAmount),
          TOKENS[fromToken as keyof typeof TOKENS],
          TOKENS[toToken as keyof typeof TOKENS]
        );

        if (amountOut > 0) {
          setToAmount(amountOut.toFixed(6));
        } else {
          setToAmount('');
        }
      } catch (error) {
        console.error('Error calculating output:', error);
        setToAmount('');
      }
    };

    calculateOutput();
  }, [fromAmount, fromToken, toToken, dex]);

  // Check approval status
  useEffect(() => {
    const checkApproval = async () => {
      if (!signer || !address || !fromAmount || parseFloat(fromAmount) <= 0) {
        setIsApproved(false);
        return;
      }

      try {
        const ERC20_ABI = ['function allowance(address, address) view returns (uint256)'];
        const contract = new ethers.Contract(TOKENS[fromToken as keyof typeof TOKENS], ERC20_ABI, signer);
        
        // Get DEX address from contract config
        const dexAddress = contracts.dexAddress as string;
        const allowance = await contract.allowance(address, dexAddress);
        const amountWei = ethers.parseEther(fromAmount);
        
        setIsApproved(allowance >= amountWei);
      } catch (error) {
        console.error('Error checking approval:', error);
        setIsApproved(false);
      }
    };

    checkApproval();
  }, [signer, address, fromAmount, fromToken, onStatusChange]);

  const handleApprove = async () => {
    if (!signer || !address) return;

    try {
      const ERC20_ABI = ['function approve(address, uint256) returns (bool)'];
      const contract = new ethers.Contract(TOKENS[fromToken as keyof typeof TOKENS], ERC20_ABI, signer);
      
      const amountWei = ethers.parseEther(fromAmount);
      const dexAddress = contracts.dexAddress as string;
      
      const tx = await contract.approve(dexAddress, amountWei);
      await tx.wait();
      
      setIsApproved(true);
      onStatusChange({ message: `${fromToken} approved successfully!`, type: 'success' });
    } catch (error) {
      console.error('Error approving token:', error);
      onStatusChange({ message: 'Failed to approve token', type: 'error' });
    }
  };

  const handleSwap = async () => {
    if (!signer || !address || !fromAmount || !toAmount) return;

    setIsSwapping(true);
    onStatusChange({ message: 'Executing swap...', type: 'info' });

    try {
      // Calculate minimum amount out with 0.5% slippage tolerance
      const slippageTolerance = 0.005; // 0.5%
      const amountOutMin = parseFloat(toAmount) * (1 - slippageTolerance);
      
      const txHash = await dex.swapTokens(
        TOKENS[fromToken as keyof typeof TOKENS],
        TOKENS[toToken as keyof typeof TOKENS],
        parseFloat(fromAmount),
        amountOutMin,
        address
      );

      if (txHash) {
        onStatusChange({ 
          message: `Swap successful! Transaction: ${txHash.slice(0, 10)}...`, 
          type: 'success' 
        });
        
        // Reset form
        setFromAmount('');
        setToAmount('');
        setIsApproved(false);
      } else {
        onStatusChange({ message: 'Swap failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error executing swap:', error);
      onStatusChange({ message: 'Swap failed', type: 'error' });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleMaxAmount = () => {
    const balance = balances[fromToken] || 0;
    setFromAmount(balance.toString());
  };

  const handleTokenSwap = () => {
    const tempToken = fromToken;
    const tempAmount = fromAmount;
    
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };


  if (!isConnected) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-300">Please connect your wallet to start swapping</p>
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
      <h2 className="text-2xl font-bold text-white mb-6">Swap Tokens</h2>
      
      {/* Slippage Settings */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">Slippage Tolerance</label>
        <div className="flex space-x-2">
          {['0.1', '0.5', '1.0'].map((value) => (
            <button
              key={value}
              onClick={() => setSlippage(value)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                slippage === value
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {value}%
            </button>
          ))}
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            className="flex-1 px-3 py-2 bg-white/10 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
            placeholder="Custom"
            step="0.1"
            min="0"
            max="50"
          />
        </div>
      </div>

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
              {TOKEN_SYMBOLS.map((symbol) => (
                <option key={symbol} value={symbol} className="bg-gray-800 text-white">
                  {symbol}
                </option>
              ))}
            </select>
            <button
              onClick={handleMaxAmount}
              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              MAX
            </button>
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
          onClick={handleTokenSwap}
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
              {TOKEN_SYMBOLS.map((symbol) => (
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

      {/* Price Impact */}
      {fromAmount && toAmount && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg">
          <div className="text-sm text-gray-300">
            Price Impact: <span className="text-green-300 font-semibold">0.05%</span>
          </div>
          <div className="text-sm text-gray-300">
            Minimum Received: <span className="text-white font-semibold">
              {(parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {toToken}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useTikTakToeBalances } from '../../hooks/useTikTakToeBalances';
import { useTikTakToeSwap } from '../../hooks/useTikTakToeSwap';
import { TIK_TAK_TOE_TOKENS, POLYGON_AMOY_CONFIG } from '../../constants/tikTakToeContracts';

interface TikTakToeSwapProps {
  isOpen: boolean;
  onToggle: () => void;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  onStatusChange: (status: { message: string; type: string }) => void;
}

interface Status {
  message: string;
  type: string;
}

const getExternalProvider = (): ethers.Eip1193Provider => {
  const maybeWindow = window as unknown as { ethereum?: unknown };
  if (!maybeWindow.ethereum || typeof maybeWindow.ethereum !== 'object') {
    throw new Error('No injected Ethereum provider found');
  }
  return maybeWindow.ethereum as ethers.Eip1193Provider;
};

export default function TikTakToeSwap({ 
  isOpen, 
  onToggle, 
  signer, 
  address, 
  onStatusChange 
}: TikTakToeSwapProps) {
  const [status, setStatus] = useState<Status>({ message: '', type: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [fromToken, setFromToken] = useState('TIK');
  const [toToken, setToToken] = useState('TAK');
  const [amount, setAmount] = useState('');
  const [estimatedOutput, setEstimatedOutput] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  const { balances, isLoading: balancesLoading, refetch: refetchBalances } = useTikTakToeBalances(signer, address);
  const { 
    isApproving, 
    isSwapping, 
    error: swapError,
    approveToken, 
    swapTokens, 
    estimateOutput,
    checkAllowance
  } = useTikTakToeSwap(signer, address);

  // Check connection and network status
  useEffect(() => {
    setIsConnected(!!signer && !!address);
    
    if (signer) {
      checkNetwork();
    }
  }, [signer, address]);

  const checkNetwork = async () => {
    try {
      const provider = new ethers.BrowserProvider(getExternalProvider());
      const network = await provider.getNetwork();
      const isCorrect = Number(network.chainId) === POLYGON_AMOY_CONFIG.chainId;
      setIsCorrectNetwork(isCorrect);
      
      if (!isCorrect) {
        setStatus({ 
          message: `Please switch to Polygon Amoy network (Chain ID: ${POLYGON_AMOY_CONFIG.chainId})`, 
          type: 'error' 
        });
      } else {
        setStatus({ message: '', type: '' });
      }
    } catch (error) {
      console.error('Network check error:', error);
      setIsCorrectNetwork(false);
    }
  };

  const switchToAmoyNetwork = async () => {
    try {
      setStatus({ message: '', type: '' });
      
      await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY_CONFIG.chainIdHex }]
      });
      
      setIsCorrectNetwork(true);
      setStatus({ message: 'Switched to Polygon Amoy network!', type: 'success' });
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === 4902) {
        // Network not added, try to add it
        try {
          await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: POLYGON_AMOY_CONFIG.chainIdHex,
              chainName: POLYGON_AMOY_CONFIG.name,
              rpcUrls: [POLYGON_AMOY_CONFIG.rpcUrl],
              nativeCurrency: POLYGON_AMOY_CONFIG.nativeCurrency,
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

  // Update estimated output when amount or tokens change
  useEffect(() => {
    if (amount && fromToken && toToken && fromToken !== toToken) {
      const updateEstimate = async () => {
        const estimate = await estimateOutput({
          tokenInSymbol: fromToken,
          tokenOutSymbol: toToken,
          amountIn: amount
        });
        setEstimatedOutput(estimate);
      };
      updateEstimate();
    } else {
      setEstimatedOutput(null);
    }
  }, [amount, fromToken, toToken, estimateOutput]);

  // Check approval status when amount changes
  useEffect(() => {
    if (amount && fromToken) {
      const checkApproval = async () => {
        const approved = await checkAllowance(fromToken, amount);
        setIsApproved(approved);
      };
      checkApproval();
    } else {
      setIsApproved(false);
    }
  }, [amount, fromToken, checkAllowance]);

  const handleApprove = async () => {
    if (!amount || !fromToken) return;

    const success = await approveToken(fromToken, amount);
    if (success) {
      setStatus({ message: `${fromToken} approved successfully!`, type: 'success' });
      setIsApproved(true);
    } else {
      setStatus({ message: swapError || 'Approval failed', type: 'error' });
    }
  };

  const handleSwap = async () => {
    if (!amount || !fromToken || !toToken || fromToken === toToken) return;

    const result = await swapTokens({
      tokenInSymbol: fromToken,
      tokenOutSymbol: toToken,
      amountIn: amount
    });

    if (result) {
      setStatus({ 
        message: `Swap successful! Received ${result.amountOut} ${toToken}`, 
        type: 'success' 
      });
      
      // Show transaction hash with explorer link
      const explorerUrl = `${POLYGON_AMOY_CONFIG.explorerUrl}/tx/${result.txHash}`;
      console.log('Transaction:', explorerUrl);
      
      // Refresh balances
      await refetchBalances();
      
      // Reset form
      setAmount('');
      setEstimatedOutput(null);
      setIsApproved(false);
    } else {
      setStatus({ message: swapError || 'Swap failed', type: 'error' });
    }
  };

  const getTokenBalance = (symbol: string) => {
    const balance = balances.find(b => b.symbol === symbol);
    return balance ? balance.formattedBalance : '0.000000';
  };

  const handleMaxAmount = () => {
    const balance = getTokenBalance(fromToken);
    setAmount(balance);
  };

  // Update parent status
  useEffect(() => {
    if (status.message) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  const tokenOptions = Object.keys(TIK_TAK_TOE_TOKENS);

  return (
    <div className="neon-card rounded-lg mb-5">
      <div 
        className="p-4 cursor-pointer flex justify-between items-center text-xl font-bold"
        onClick={onToggle}
      >
        <span className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          TIK-TAK-TOE Swap
        </span>
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
      <div className={`overflow-hidden will-change-[max-height] transition-[max-height] ease-in-out duration-300 ${isOpen ? 'max-h-[800px]' : 'max-h-0'}`}>

        <div className="p-4 space-y-4">
              {/* Network Check */}
              {!isCorrectNetwork && (
                <div className="neon-control p-4 rounded-lg border-red-400/50 bg-red-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-300 font-semibold">Wrong Network</p>
                      <p className="text-red-200 text-sm">Please switch to Polygon Amoy</p>
                    </div>
                    <button
                      onClick={switchToAmoyNetwork}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      Switch to Amoy
                    </button>
                  </div>
                </div>
              )}

              {/* Connection Status */}
              {!isConnected && (
                <div className="neon-control p-4 rounded-lg border-yellow-400/50 bg-yellow-900/20">
                  <p className="text-yellow-300 font-semibold">Please connect your wallet first</p>
                </div>
              )}

              {/* Token Balances */}
              {isConnected && (
                <div className="neon-card p-4">
                  <h4 className="text-lg font-semibold text-cyan-200 mb-3">Your Balances</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {tokenOptions.map((symbol) => (
                      <div key={symbol} className="text-center">
                        <div className="text-2xl font-bold text-white">{symbol}</div>
                        <div className="text-sm text-gray-300">
                          {balancesLoading ? 'Loading...' : getTokenBalance(symbol)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contract Info */}
              {isConnected && isCorrectNetwork && (
                <div className="neon-card p-4">
                  <h4 className="text-lg font-semibold text-cyan-200 mb-3">How It Works</h4>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p>• Swap between TIK, TAK, and TOE tokens using the TikTakDex AMM</p>
                    <p>• First approve the token you want to swap, then execute the swap</p>
                    <p>• A 0.3% fee is applied to each swap (0.25% to LPs, 0.05% to protocol)</p>
                  </div>
                </div>
              )}

              {/* Swap Interface */}
              {isConnected && isCorrectNetwork && (
                <div className="neon-card p-6 space-y-4">
                  {/* From Token */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">From Token</label>
                    <div className="flex gap-2">
                      <select
                        value={fromToken}
                        onChange={(e) => setFromToken(e.target.value)}
                        className="neon-control flex-1 px-3 py-2 rounded-lg"
                      >
                        {tokenOptions.map((symbol) => (
                          <option key={symbol} value={symbol}>{symbol}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleMaxAmount}
                        className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">Amount</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      className="neon-control w-full px-3 py-2 rounded-lg"
                      step="0.000001"
                      min="0"
                    />
                    <div className="text-xs text-gray-400">
                      Balance: {getTokenBalance(fromToken)} {fromToken}
                    </div>
                  </div>

                  {/* Swap Arrow */}
                  <div className="flex justify-center">
                    <div className="text-2xl text-cyan-400">⬇</div>
                  </div>

                  {/* To Token */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">To Token</label>
                    <select
                      value={toToken}
                      onChange={(e) => setToToken(e.target.value)}
                      className="neon-control w-full px-3 py-2 rounded-lg"
                    >
                      {tokenOptions.map((symbol) => (
                        <option key={symbol} value={symbol}>{symbol}</option>
                      ))}
                    </select>
                  </div>

                  {/* Estimated Output */}
                  {estimatedOutput && (
                    <div className="neon-control p-3 rounded-lg bg-green-900/20 border-green-400/50">
                      <div className="text-sm text-green-300">
                        Estimated Output: <span className="font-semibold text-green-200">{estimatedOutput} {toToken}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      {!isApproved && amount && (
                        <button
                          onClick={handleApprove}
                          disabled={isApproving || !amount}
                          className="flex-1 py-3 px-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-500 text-black font-bold rounded-lg transition-colors"
                        >
                          {isApproving ? 'Approving...' : `Approve ${fromToken}`}
                        </button>
                      )}
                      
                      <button
                        onClick={handleSwap}
                        disabled={isSwapping || !amount || !isApproved || fromToken === toToken}
                        className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-bold rounded-lg transition-colors"
                      >
                        {isSwapping ? 'Swapping...' : 'Swap'}
                      </button>
                    </div>
                  </div>

                  {/* Status Messages */}
                  {status.message && (
                    <div className={`p-3 rounded-lg font-semibold ${
                      status.type === 'error' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-green-500 text-white'
                    }`}>
                      {status.message}
                    </div>
                  )}
                </div>
              )}
        </div>
      </div>
    </div>
  );
}

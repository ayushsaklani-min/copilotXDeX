'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ERC20_ABI, MOCK_SWAP_ABI } from '../../constants/contracts';

interface MockSwapProps {
  isOpen: boolean;
  onToggle: () => void;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  onStatusChange: (status: { message: string; type: string }) => void;
}

interface TokenBalances {
  tokenA: string;
  tokenB: string;
}

interface SwapData {
  rate: string;
  tokenAAddress: string;
  tokenBAddress: string;
}

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

// Get external provider for ethers.js v6
const getExternalProvider = (): ethers.Eip1193Provider => {
  const maybeWindow = window as unknown as { ethereum?: unknown };
  if (!maybeWindow.ethereum || typeof maybeWindow.ethereum !== 'object') {
    throw new Error('No injected Ethereum provider found');
  }
  return maybeWindow.ethereum as ethers.Eip1193Provider;
};

export default function MockSwap({ 
  isOpen, 
  onToggle, 
  signer, 
  address, 
  onStatusChange 
}: MockSwapProps) {
  const [inputAmount, setInputAmount] = useState('');
  const [balances, setBalances] = useState<TokenBalances>({ tokenA: '0.0000', tokenB: '0.0000' });
  const [swapData, setSwapData] = useState<SwapData>({ rate: '0', tokenAAddress: '', tokenBAddress: '' });
  const [tokenInfo, setTokenInfo] = useState<{ tokenA: TokenInfo; tokenB: TokenInfo }>({
    tokenA: { name: 'Token A', symbol: 'TKA', decimals: 18 },
    tokenB: { name: 'Token B', symbol: 'TKB', decimals: 18 }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [allowance, setAllowance] = useState('0');
  const [isConnected, setIsConnected] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>('');

  // Check wallet connection
  useEffect(() => {
    setIsConnected(!!signer && !!address);
  }, [signer, address]);

  // Connect wallet function
  const connectWallet = async () => {
    onStatusChange({ message: '', type: '' });
    
    if (typeof (window as unknown as { ethereum?: unknown }).ethereum === 'undefined') {
      onStatusChange({ message: 'MetaMask is not installed! Please install MetaMask extension.', type: 'error' });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(getExternalProvider());
      await provider.send("eth_requestAccounts", []);
      
      onStatusChange({ message: 'Please check the Web3Copilot main interface for wallet connection.', type: 'info' });
    } catch (error: unknown) {
      console.error('Connection error:', error);
      const err = error as { code?: number; message?: string };
      
      if (err.code === 4001) {
        onStatusChange({ message: 'Connection rejected by user. Please try again.', type: 'error' });
      } else {
        onStatusChange({ message: `Connection failed: ${err.message || 'Unknown error'}. Please try again.`, type: 'error' });
      }
    }
  };

  // Fetch balances and swap data
  const fetchData = async () => {
    if (!signer || !address) return;

    setIsLoading(true);
    try {
      const provider = signer.provider;
      if (!provider) throw new Error('No provider available');

      // Create contract instances
      const tokenAContract = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_A, ERC20_ABI, provider);
      const tokenBContract = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_B, ERC20_ABI, provider);
      const mockSwapContract = new ethers.Contract(CONTRACT_ADDRESSES.MOCK_SWAP, MOCK_SWAP_ABI, provider);

      // Fetch all data in parallel
      const [
        tokenABalance,
        tokenBBalance,
        rate,
        tokenAAddr,
        tokenBAddr,
        currentAllowance,
        tokenAName,
        tokenASymbol,
        tokenADecimals,
        tokenBName,
        tokenBSymbol,
        tokenBDecimals
      ] = await Promise.all([
        tokenAContract.balanceOf(address),
        tokenBContract.balanceOf(address),
        mockSwapContract.rate(),
        mockSwapContract.tokenA(),
        mockSwapContract.tokenB(),
        tokenAContract.allowance(address, CONTRACT_ADDRESSES.MOCK_SWAP),
        tokenAContract.name().catch(() => 'Token A'),
        tokenAContract.symbol().catch(() => 'TKA'),
        tokenAContract.decimals().catch(() => 18),
        tokenBContract.name().catch(() => 'Token B'),
        tokenBContract.symbol().catch(() => 'TKB'),
        tokenBContract.decimals().catch(() => 18)
      ]);

      // Update token info
      setTokenInfo({
        tokenA: {
          name: tokenAName,
          symbol: tokenASymbol,
          decimals: Number(tokenADecimals)
        },
        tokenB: {
          name: tokenBName,
          symbol: tokenBSymbol,
          decimals: Number(tokenBDecimals)
        }
      });

      // Format balances using actual decimals
      setBalances({
        tokenA: parseFloat(ethers.formatUnits(tokenABalance, tokenADecimals)).toFixed(4),
        tokenB: parseFloat(ethers.formatUnits(tokenBBalance, tokenBDecimals)).toFixed(4)
      });

      // Set swap data
      setSwapData({
        rate: rate.toString(),
        tokenAAddress: tokenAAddr,
        tokenBAddress: tokenBAddr
      });

      // Set current allowance
      setAllowance(ethers.formatUnits(currentAllowance, tokenADecimals));

    } catch (error) {
      console.error('Failed to fetch data:', error);
      onStatusChange({ message: 'Failed to fetch contract data. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when wallet connects or component opens
  useEffect(() => {
    if (isConnected && isOpen) {
      fetchData();
    }
  }, [isConnected, isOpen]);

  // Approve TokenA for MockSwap contract
  const handleApprove = async () => {
    if (!signer || !inputAmount || parseFloat(inputAmount) <= 0) {
      onStatusChange({ message: 'Please enter a valid amount.', type: 'error' });
      return;
    }

    setIsApproving(true);
    setTransactionHash('');
    onStatusChange({ message: `Approving ${inputAmount} ${tokenInfo.tokenA.symbol}...`, type: 'info' });

    try {
      const tokenAContract = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_A, ERC20_ABI, signer);
      const amountToApprove = ethers.parseUnits(inputAmount, tokenInfo.tokenA.decimals);

      const tx = await tokenAContract.approve(CONTRACT_ADDRESSES.MOCK_SWAP, amountToApprove);
      setTransactionHash(tx.hash);
      onStatusChange({ message: `Approval transaction sent: ${tx.hash.slice(0, 10)}...`, type: 'info' });
      
      await tx.wait();

      onStatusChange({ message: 'Approval successful! You can now swap.', type: 'success' });
      
      // Refresh allowance
      await fetchData();
    } catch (error: unknown) {
      console.error('Approval failed:', error);
      const err = error as { code?: number | string; message?: string; error?: { code?: number | string } };
      const code = err?.code ?? err?.error?.code;
      const isUserRejected = code === 4001 || code === 'ACTION_REJECTED';
      const message = isUserRejected ? 'Transaction cancelled' : (err?.message ?? 'Approval failed.');
      onStatusChange({ message, type: isUserRejected ? 'info' : 'error' });
    } finally {
      setIsApproving(false);
    }
  };

  // Execute swap
  const handleSwap = async () => {
    if (!signer || !inputAmount || parseFloat(inputAmount) <= 0) {
      onStatusChange({ message: 'Please enter a valid amount.', type: 'error' });
      return;
    }

    const inputAmountNum = parseFloat(inputAmount);
    const allowanceNum = parseFloat(allowance);

    if (inputAmountNum > allowanceNum) {
      onStatusChange({ message: 'Insufficient allowance. Please approve first.', type: 'error' });
      return;
    }

    setIsSwapping(true);
    setTransactionHash('');
    onStatusChange({ message: `Swapping ${inputAmount} ${tokenInfo.tokenA.symbol} for ${tokenInfo.tokenB.symbol}...`, type: 'info' });

    try {
      const mockSwapContract = new ethers.Contract(CONTRACT_ADDRESSES.MOCK_SWAP, MOCK_SWAP_ABI, signer);
      const amountToSwap = ethers.parseUnits(inputAmount, tokenInfo.tokenA.decimals);

      const tx = await mockSwapContract.swapAforB(amountToSwap);
      setTransactionHash(tx.hash);
      onStatusChange({ message: `Swap transaction sent: ${tx.hash.slice(0, 10)}...`, type: 'info' });
      
      await tx.wait();

      const expectedOutput = getExpectedOutput();
      onStatusChange({ message: `Swap successful! Received ~${expectedOutput} ${tokenInfo.tokenB.symbol}`, type: 'success' });
      
      // Clear input and refresh data
      setInputAmount('');
      await fetchData();
    } catch (error: unknown) {
      console.error('Swap failed:', error);
      const err = error as { code?: number | string; message?: string; error?: { code?: number | string } };
      const code = err?.code ?? err?.error?.code;
      const isUserRejected = code === 4001 || code === 'ACTION_REJECTED';
      const message = isUserRejected ? 'Transaction cancelled' : (err?.message ?? 'Swap failed.');
      onStatusChange({ message, type: isUserRejected ? 'info' : 'error' });
    } finally {
      setIsSwapping(false);
    }
  };

  // Calculate expected output based on rate
  const getExpectedOutput = () => {
    if (!inputAmount || !swapData.rate || parseFloat(inputAmount) <= 0) return '0.0000';
    const input = parseFloat(inputAmount);
    const rate = parseFloat(swapData.rate);
    return (input * rate).toFixed(4);
  };

  // Check if approval is needed
  const needsApproval = () => {
    if (!inputAmount) return false;
    const inputAmountNum = parseFloat(inputAmount);
    const allowanceNum = parseFloat(allowance);
    return inputAmountNum > allowanceNum;
  };

  // Set max balance
  const handleMaxClick = () => {
    setInputAmount(balances.tokenA);
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="neon-card rounded-lg mb-5">
      <div 
        className="p-4 cursor-pointer flex justify-between items-center text-xl font-bold"
        onClick={onToggle}
      >
        <span>MockSwap - {tokenInfo.tokenA.symbol} ↔ {tokenInfo.tokenB.symbol}</span>
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
      
      <div className={`overflow-hidden will-change-[max-height] transition-[max-height] ease-in-out duration-300 ${isOpen ? 'max-h-[1000px]' : 'max-h-0'}`}>
        <div className="px-4 pb-4">
          
          {/* Wallet Connection Section */}
          {!isConnected ? (
            <div className="text-center mb-6">
              <p className="text-gray-300 mb-4">Connect your wallet to use MockSwap</p>
              <button
                onClick={connectWallet}
                className="w-full py-3 px-6 rounded-lg neon-control text-white font-bold text-lg cursor-pointer hover:bg-blue-600 transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              {/* Contract Info Display */}
              <div className="neon-control rounded-lg p-4 mb-4">
                <h3 className="text-lg font-bold mb-3 text-cyan-200">Contract Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Swap Rate:</span>
                    <span className="text-white font-mono">
                      {isLoading ? '...' : `1 ${tokenInfo.tokenA.symbol} = ${swapData.rate} ${tokenInfo.tokenB.symbol}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">MockSwap Contract:</span>
                    <span className="text-white font-mono text-xs">
                      {formatAddress(CONTRACT_ADDRESSES.MOCK_SWAP)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">{tokenInfo.tokenA.symbol} Address:</span>
                    <span className="text-white font-mono text-xs">
                      {formatAddress(CONTRACT_ADDRESSES.TOKEN_A)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">{tokenInfo.tokenB.symbol} Address:</span>
                    <span className="text-white font-mono text-xs">
                      {formatAddress(CONTRACT_ADDRESSES.TOKEN_B)}
                    </span>
                  </div>
                  {transactionHash && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Last Transaction:</span>
                      <span className="text-green-400 font-mono text-xs">
                        {formatAddress(transactionHash)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Balance Display */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="neon-control rounded-lg p-4">
                  <div className="text-sm text-gray-300 mb-1">{tokenInfo.tokenA.symbol} Balance</div>
                  <div className="text-xl font-bold text-white font-mono">
                    {isLoading ? '...' : balances.tokenA}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{tokenInfo.tokenA.name}</div>
                </div>
                <div className="neon-control rounded-lg p-4">
                  <div className="text-sm text-gray-300 mb-1">{tokenInfo.tokenB.symbol} Balance</div>
                  <div className="text-xl font-bold text-white font-mono">
                    {isLoading ? '...' : balances.tokenB}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{tokenInfo.tokenB.name}</div>
                </div>
              </div>

              {/* Swap Input Section */}
              <div className="neon-control rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm text-gray-200 mb-2">
                  <span>You Pay ({tokenInfo.tokenA.symbol})</span>
                  <span>Balance: {balances.tokenA}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    className="flex-1 text-2xl bg-transparent border-none text-white outline-none p-0 font-mono"
                    step="0.0001"
                    min="0"
                  />
                  <button
                    onClick={handleMaxClick}
                    className="px-3 py-1 rounded neon-control text-cyan-200 text-sm font-bold hover:bg-cyan-600 transition-colors"
                    disabled={isLoading}
                  >
                    MAX
                  </button>
                </div>
                <div className="text-sm text-gray-300">
                  Current Allowance: {allowance} {tokenInfo.tokenA.symbol}
                </div>
              </div>

              {/* Expected Output */}
              <div className="neon-control rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-200 mb-2">You Receive ({tokenInfo.tokenB.symbol})</div>
                <div className="text-2xl text-gray-200 font-mono">
                  {getExpectedOutput()}
                </div>
                <div className="text-sm text-gray-300 mt-1">
                  Rate: 1 {tokenInfo.tokenA.symbol} = {swapData.rate} {tokenInfo.tokenB.symbol}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {needsApproval() && (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving || !inputAmount || parseFloat(inputAmount) <= 0}
                    className="w-full py-4 px-6 rounded-lg neon-control text-white font-bold text-lg cursor-pointer disabled:opacity-60 hover:bg-yellow-600 transition-colors"
                  >
                    {isApproving ? `Approving ${tokenInfo.tokenA.symbol}...` : `Approve ${inputAmount || '0'} ${tokenInfo.tokenA.symbol}`}
                  </button>
                )}
                
                <button
                  onClick={handleSwap}
                  disabled={
                    isSwapping || 
                    !inputAmount || 
                    parseFloat(inputAmount) <= 0 || 
                    needsApproval() ||
                    parseFloat(inputAmount) > parseFloat(balances.tokenA)
                  }
                  className="w-full py-4 px-6 rounded-lg neon-control text-white font-bold text-lg cursor-pointer disabled:opacity-60 hover:bg-green-600 transition-colors"
                >
                  {isSwapping ? `Swapping ${tokenInfo.tokenA.symbol}...` : 
                   parseFloat(inputAmount || '0') > parseFloat(balances.tokenA) ? `Insufficient ${tokenInfo.tokenA.symbol} Balance` :
                   needsApproval() ? 'Approve First' : 
                   `Swap ${inputAmount || '0'} ${tokenInfo.tokenA.symbol}`}
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="w-full mt-3 py-2 px-4 rounded-lg neon-control text-gray-300 font-medium text-sm cursor-pointer disabled:opacity-60 hover:bg-gray-700 transition-colors"
              >
                {isLoading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

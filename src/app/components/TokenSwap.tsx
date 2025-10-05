'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { wrapToken, isWrapUnwrapOperation, WrapResult } from '../utils/wrapUtils';
import { useTransactionSimulator } from '../../hooks/useTransactionSimulator';
import TransactionPreviewModal from '../../components/modals/TransactionPreviewModal';

interface TokenInfo {
  address: string;
  decimals: number;
  coingeckoId: string;
}

interface Balances {
  [key: string]: string;
}

interface Prices {
  [key: string]: number;
}

interface TokenSwapProps {
  isOpen: boolean;
  onToggle: () => void;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  balances: Balances;
  prices: Prices;
  tokens: { [key: string]: TokenInfo };
  nativeSymbol: string;
  wrappedSymbol: string;
  uniswapRouterAddress: string;
  onStatusChange: (status: { message: string; type: string }) => void;
  onBalancesRefresh: () => void;
}

// Narrow and return an EIP-1193 external provider for ethers.js v6
const getExternalProvider = (): ethers.Eip1193Provider => {
  const maybeWindow = window as unknown as { ethereum?: unknown };
  if (!maybeWindow.ethereum || typeof maybeWindow.ethereum !== 'object') {
    throw new Error('No injected Ethereum provider found');
  }
  return maybeWindow.ethereum as ethers.Eip1193Provider;
};

const TOKEN_ICONS: Record<string, string> = {
  WMATIC: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M7 12h10M12 7v10" fill="white"/></svg>`,
  MATIC: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4.11,8.34,11.3,4.1a2,2,0,0,1,1.4,0l7.19,4.24a2,2,0,0,1,1,1.76v8.4a2,2,0,0,1-1,1.76l-7.19,4.24a2,2,0,0,1-1.4,0L4.11,20.26a2,2,0,0,1-1-1.76V10.1A2,2,0,0,1,4.11,8.34ZM12,12.27,14.24,11a.5.5,0,0,1,.45,0l1.19.68a.5.5,0,0,1,.26.44v2.19a.5.5,0,0,1-.26.44l-1.19.69a.5.5,0,0,1-.45,0L12,16.73,9.76,18a.5.5,0,0,1-.45,0L8.12,17.29a.5.5,0,0,1,.26-.44V14.66a.5.5,0,0,1,.26-.44l1.19-.68A.5.5,0,0,1,9.76,13.56Z"></path></svg>`,
  WETH: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.01,2.25,11.87,2.5,6,12.08l5.87,3.42,6.13-3.42ZM12.01,16.58,6,13.16l5.87,8.2,6.13-8.2Z"></path></svg>`,
  ETH: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l7 10-7 4-7-4 7-10zm0 12l7-4-7 12-7-12 7 4z"/></svg>`,
  DAI: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2a10,10,0,1,0,10,10A10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20ZM12,8a4,4,0,0,0-4,4H6a6,6,0,0,1,6-6Zm0,8a4,4,0,0,0,4-4h2a6,6,0,0,1-6,6Z"></path></svg>`,
  USDC: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Zm-1.83-9.43a3.48,3.48,0,0,0,1.08-.2,2.68,2.68,0,0,0,1-.58,1.49,1.49,0,0,0,.43-1,1.31,1.31,0,0,0-.43-1,2.62,2.62,0,0,0-1-.59,3.58,3.58,0,0,0-1.09-.2,4,4,0,0,0-1.22.2,2.7,2.7,0,0,0-1,.58,1.39,1.39,0,0,0-.42,1v.2H8.33v-.2a3.44,3.44,0,0,1,1-2.5,5.13,5.13,0,0,1,1.94-1.2,6.33,6.33,0,0,1,2.2-.44,5.74,5.74,0,0,1,4.42,1.64,3.38,3.38,0,0,1,1.15,2.72A3.13,3.13,0,0,1,18,12.3a4.77,4.77,0,0,1-2,1.3,7.25,7.25,0,0,1-2.51.48,4.1,4.1,0,0,0-1.22-.2,3.53,3.53,0,0,0-1.09.2,2.62,2.62,0,0,0-1,.59,1.31,1.31,0,0,1-.43,1,1.49,1.49,0,0,0,.43,1,2.68,2.68,0,0,0,1,.58,3.48,3.48,0,0,0,1.08.2,3.92,3.92,0,0,0,1.22-.2,2.7,2.7,0,0,0,1-.58,1.39,1.39,0,0,0,.42-1v-.2h1.17v.2a3.44,3.44,0,0,1-1,2.5,5.13,5.13,0,0,1-1.94,1.2,6.33,6.33,0,0,1-2.2.44A5.55,5.55,0,0,1,6.5,16.5,3.47,3.47,0,0,1,5.33,13.8a3.13,3.13,0,0,1,1.17-2.73,4.77,4.77,0,0,1,2-1.3A7.25,7.25,0,0,1,11,9.28,3.67,3.67,0,0,0,10.17,10.57Z"></path></svg>`,
  POL: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M8 12l2-2 2 2-2 2-2-2zm4-4l2-2 2 2-2 2-2-2z" fill="white"/></svg>`
};

export default function TokenSwap({ 
  isOpen, 
  onToggle, 
  signer, 
  address, 
  balances, 
  prices, 
  tokens, 
  nativeSymbol,
  wrappedSymbol,
  uniswapRouterAddress, 
  onStatusChange, 
  onBalancesRefresh 
}: TokenSwapProps) {
  // Prefer WETH -> USDC by default when available, otherwise fall back
  const [fromToken, setFromToken] = useState(() => (tokens['WETH'] ? 'WETH' : nativeSymbol));
  const [toToken, setToToken] = useState(() => (tokens['USDC'] ? 'USDC' : wrappedSymbol));
  const [fromAmount, setFromAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [quote, setQuote] = useState('');
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [showSimulation, setShowSimulation] = useState(false);

  // Transaction simulation hook
  const { 
    simulateTransaction, 
    clearSimulation, 
    simulationData, 
    isLoading: isSimulating, 
    error: simulationError 
  } = useTransactionSimulator();

  const getQuote = useCallback(async () => {
    if (!address || !fromAmount || parseFloat(fromAmount) <= 0 || fromToken === toToken) {
      setQuote('');
      return;
    }

    // Validate that both tokens exist in our token list (except for native token)
    if (fromToken !== nativeSymbol && !tokens[fromToken]) {
      setQuote('');
      onStatusChange({ message: `Unknown token: ${fromToken}`, type: 'error' });
      return;
    }
    
    if (toToken !== nativeSymbol && !tokens[toToken]) {
      setQuote('');
      onStatusChange({ message: `Unknown token: ${toToken}`, type: 'error' });
      return;
    }

    setIsQuoteLoading(true);

    try {
      // Instant quote for native <-> wrapped (1:1)
      if ((fromToken === nativeSymbol && toToken === wrappedSymbol) || (fromToken === wrappedSymbol && toToken === nativeSymbol)) {
        setQuote(parseFloat(fromAmount).toString());
        return;
      }

      const provider = new ethers.BrowserProvider(getExternalProvider());
      const router = new ethers.Contract(
        uniswapRouterAddress,
        ['function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'],
        provider
      );

      const amountIn = ethers.parseUnits(
        fromAmount,
        fromToken === nativeSymbol ? 18 : tokens[fromToken].decimals
      );

      const addr = (sym: string) => (sym === nativeSymbol ? tokens[wrappedSymbol].address : tokens[sym].address);
      const hop = tokens[wrappedSymbol] ? wrappedSymbol : undefined;
      const direct = [addr(fromToken), addr(toToken)];
      const viaWrapped = hop && fromToken !== hop && toToken !== hop ? [addr(fromToken), addr(hop), addr(toToken)] : undefined;

      const candidatePaths = [direct, viaWrapped].filter(Boolean) as string[][];

      let bestOut: string | null = null;
      for (const p of candidatePaths) {
        try {
          if (p[0].toLowerCase() === p[p.length - 1].toLowerCase()) continue;
          const amts = await router.getAmountsOut(amountIn, p);
          const out = ethers.formatUnits(
            amts[amts.length - 1],
            toToken === nativeSymbol ? 18 : tokens[toToken].decimals
          );
          bestOut = out;
          break; // first successful path used
        } catch {
          // try next path
        }
      }

      if (!bestOut) {
        console.warn('No DEX route available for selected pair, falling back to price estimation');
        // Fallback: compute an estimated quote using USD prices if available
        const pFrom = prices[fromToken];
        const pTo = prices[toToken];
        if (pFrom && pTo) {
          const est = (parseFloat(fromAmount) * pFrom) / pTo;
          setQuote(est.toFixed(5));
          onStatusChange({ message: 'Using price-based estimate (DEX route unavailable).', type: 'info' });
          return;
        } else {
          setQuote('');
          onStatusChange({ message: 'Could not fetch a quote for this pair.', type: 'error' });
          return;
        }
      }
      setQuote(parseFloat(bestOut).toFixed(5));
    } catch (err) {
      console.error("Quote error:", err);
      // Use the same fallback logic as when no route is available
      const pFrom = prices[fromToken];
      const pTo = prices[toToken];
      if (pFrom && pTo) {
        const est = (parseFloat(fromAmount) * pFrom) / pTo;
        setQuote(est.toFixed(5));
        onStatusChange({ message: 'Using price-based estimate (DEX route unavailable).', type: 'info' });
      } else {
        setQuote('');
        onStatusChange({ message: 'Could not fetch a quote for this pair.', type: 'error' });
      }
    } finally {
      setIsQuoteLoading(false);
    }
  }, [address, fromAmount, fromToken, toToken, onStatusChange]);

  // Recalculate quote when inputs change
  useEffect(() => {
    const timeoutId = setTimeout(getQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [fromAmount, fromToken, toToken, address, getQuote]);

  // Create unsigned transaction for simulation
  const createUnsignedTransaction = async () => {
    if (!signer || !fromAmount || parseFloat(fromAmount) <= 0 || !quote) {
      throw new Error('Invalid amount or quote');
    }

    // Check if this is a wrap/unwrap operation
    if (isWrapUnwrapOperation(fromToken, toToken, nativeSymbol, wrappedSymbol)) {
      const isWrapping = fromToken === nativeSymbol;
      const wrappedTokenAddress = tokens[wrappedSymbol].address;
      
      if (isWrapping) {
        return {
          to: wrappedTokenAddress,
          data: '0xd0e30db0', // deposit() function selector
          value: ethers.parseEther(fromAmount).toString(),
          gas: '0x5208' // 21000 gas
        };
      } else {
        const amountUnits = ethers.parseUnits(fromAmount, tokens[wrappedSymbol].decimals);
        const withdrawData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amountUnits]);
        return {
          to: wrappedTokenAddress,
          data: '0x2e1a7d4d' + withdrawData.slice(2), // withdraw(uint256) function selector + encoded amount
          value: '0x0',
          gas: '0x5208'
        };
      }
    }

    // For DEX swaps, create the appropriate transaction
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const slippageTolerance = parseFloat(slippage) || 0.5;
    const slippageAmount = (parseFloat(quote) * slippageTolerance) / 100;
    const minAmountOut = parseFloat(quote) - slippageAmount;

    if (fromToken === nativeSymbol) {
      const amountIn = ethers.parseEther(fromAmount);
      const path = [tokens[wrappedSymbol].address, tokens[toToken].address];
      const amountOutMin = ethers.parseUnits(
        minAmountOut.toFixed(tokens[toToken].decimals),
        tokens[toToken].decimals
      );

      // Encode swapExactETHForTokens call
      const swapData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'address[]', 'address', 'uint256'],
        [amountOutMin, path, address, deadline]
      );
      
      return {
        to: uniswapRouterAddress,
        data: '0x7ff36ab5' + swapData.slice(2), // swapExactETHForTokens function selector
        value: amountIn.toString(),
        gas: '0x186a0' // 100000 gas
      };
    } else {
      const amountIn = ethers.parseUnits(fromAmount, tokens[fromToken].decimals);
      
      if (toToken === nativeSymbol) {
        const path = [tokens[fromToken].address, tokens[wrappedSymbol].address];
        const amountOutMin = ethers.parseUnits(minAmountOut.toFixed(18), 18);
        
        const swapData = ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint256', 'address[]', 'address', 'uint256'],
          [amountIn, amountOutMin, path, address, deadline]
        );
        
        return {
          to: uniswapRouterAddress,
          data: '0x18cbafe5' + swapData.slice(2), // swapExactTokensForETH function selector
          value: '0x0',
          gas: '0x186a0'
        };
      } else {
        const addr = (sym: string) => (sym === nativeSymbol ? tokens[wrappedSymbol].address : tokens[sym].address);
        const direct = [addr(fromToken), addr(toToken)];
        const path = direct; // Use direct path for simulation
        
        const amountOutMin = ethers.parseUnits(
          minAmountOut.toFixed(tokens[toToken].decimals),
          tokens[toToken].decimals
        );
        
        const swapData = ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint256', 'address[]', 'address', 'uint256'],
          [amountIn, amountOutMin, path, address, deadline]
        );
        
        return {
          to: uniswapRouterAddress,
          data: '0x38ed1739' + swapData.slice(2), // swapExactTokensForTokens function selector
          value: '0x0',
          gas: '0x186a0'
        };
      }
    }
  };

  // Handle swap button click - trigger simulation
  const handleSwap = async () => {
    if (!signer || !fromAmount || parseFloat(fromAmount) <= 0 || !quote) {
      onStatusChange({ message: 'Invalid amount or quote.', type: 'error' });
      return;
    }

    try {
      const unsignedTx = await createUnsignedTransaction();
      const provider = signer.provider;
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      setShowSimulation(true);
      await simulateTransaction(unsignedTx, chainId);
    } catch (error) {
      console.error("Failed to create transaction for simulation:", error);
      onStatusChange({ message: 'Failed to prepare transaction for simulation.', type: 'error' });
    }
  };

  // Handle actual swap execution (called from modal)
  const executeSwap = async () => {
    if (!signer || !fromAmount || parseFloat(fromAmount) <= 0 || !quote) {
      onStatusChange({ message: 'Invalid amount or quote.', type: 'error' });
      return;
    }

    setIsSwapping(true);
    onStatusChange({ message: 'Executing swap...', type: 'info' });

    try {
      // Check if this is a wrap/unwrap operation
      if (isWrapUnwrapOperation(fromToken, toToken, nativeSymbol, wrappedSymbol)) {
        const isWrapping = fromToken === nativeSymbol;
        const wrappedTokenAddress = tokens[wrappedSymbol].address;
        const wrappedTokenDecimals = tokens[wrappedSymbol].decimals;
        
        const result: WrapResult = await wrapToken({
          signer,
          amount: fromAmount,
          wrappedTokenAddress,
          wrappedTokenDecimals,
          isWrapping
        });
        
        if (result.success) {
          onStatusChange({ message: `${isWrapping ? 'Wrap' : 'Unwrap'} successful!`, type: 'success' });
          await onBalancesRefresh();
        } else {
          onStatusChange({ message: result.error || 'Wrap/Unwrap failed', type: 'error' });
        }
        return;
      }

      // Safety: ensure router address is a contract to avoid sending funds to an EOA
      const onchainProvider = signer.provider;
      const routerCode = await onchainProvider.getCode(uniswapRouterAddress);
      if (!routerCode || routerCode === '0x') {
        throw new Error('Router address has no code on this network. Provide a valid DEX router.');
      }

      const router = new ethers.Contract(
      uniswapRouterAddress,
      [
        'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable',
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
        'function approve(address spender, uint256 amount) external returns (bool)'
      ],
      signer
      );

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      const slippageTolerance = parseFloat(slippage) || 0.5;
      const slippageAmount = (parseFloat(quote) * slippageTolerance) / 100;
      const minAmountOut = parseFloat(quote) - slippageAmount;

      if (fromToken === nativeSymbol) {
        const amountIn = ethers.parseEther(fromAmount);
        const path = [tokens[wrappedSymbol].address, tokens[toToken].address];
        const amountOutMin = ethers.parseUnits(
          minAmountOut.toFixed(tokens[toToken].decimals),
          tokens[toToken].decimals
        );

        const tx = await router.swapExactETHForTokens(amountOutMin, path, address, deadline, {
          value: amountIn
        });
        await tx.wait();
      } else {
        const fromTokenContract = new ethers.Contract(
          tokens[fromToken].address,
          ['function approve(address spender, uint256 amount) external returns (bool)'],
          signer
        );

        const amountIn = ethers.parseUnits(fromAmount, tokens[fromToken].decimals);
        const approveTx = await fromTokenContract.approve(uniswapRouterAddress, amountIn);
        await approveTx.wait();

        if (toToken === nativeSymbol) {
          const path = [tokens[fromToken].address, tokens[wrappedSymbol].address];
          const amountOutMin = ethers.parseUnits(minAmountOut.toFixed(18), 18);
          const tx = await router.swapExactTokensForETH(amountIn, amountOutMin, path, address, deadline);
          await tx.wait();
        } else {
          const addr = (sym: string) => (sym === nativeSymbol ? tokens[wrappedSymbol].address : tokens[sym].address);
          const hop = tokens[wrappedSymbol] ? wrappedSymbol : undefined;
          const direct = [addr(fromToken), addr(toToken)];
          const viaWrapped = hop && fromToken !== hop && toToken !== hop ? [addr(fromToken), addr(hop), addr(toToken)] : undefined;
          const candidatePaths = [direct, viaWrapped].filter(Boolean) as string[][];

          let executed = false;
          let lastError: unknown = null;
          for (const p of candidatePaths) {
            try {
              const amountOutMin = ethers.parseUnits(
                minAmountOut.toFixed(tokens[toToken].decimals),
                tokens[toToken].decimals
              );
              const tx = await router.swapExactTokensForTokens(amountIn, amountOutMin, p, address, deadline);
              await tx.wait();
              executed = true;
              break;
            } catch (e) {
              lastError = e;
            }
          }
          if (!executed) {
            throw lastError || new Error('No route available for swap');
          }
        }
      }

      onStatusChange({ message: 'Swap successful!', type: 'success' });
      await onBalancesRefresh();
    } catch (error) {
      console.error("Swap failed", error);
      const err = error as { code?: number | string; message?: string; error?: { code?: number | string } };
      const code = err?.code ?? err?.error?.code;
      const isUserRejected = code === 4001 || code === 'ACTION_REJECTED';
      const message = isUserRejected ? 'Transaction cancelled' : (err?.message ?? 'Swap failed.');
      onStatusChange({ message, type: isUserRejected ? 'info' : 'error' });
    } finally {
      setIsSwapping(false);
      setFromAmount('');
      setQuote('');
      setShowSimulation(false);
      clearSimulation();
    }
  };

  // Handle simulation modal close
  const handleSimulationClose = () => {
    setShowSimulation(false);
    clearSimulation();
  };

  return (
    <div className="neon-card rounded-lg mb-5">
      <div 
        className="p-4 cursor-pointer flex justify-between items-center text-xl font-bold"
        onClick={onToggle}
      >
        <span>Swap Tokens</span>
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
      <div className={`overflow-hidden will-change-[max-height] transition-[max-height] ease-in-out duration-300 ${isOpen ? 'max-h-[1000px]' : 'max-h-0'}`}>
        <div className="px-4 pb-4">
          <div className="flex justify-end items-center gap-2 text-sm mb-3">
            <span>Slippage:</span>
            <input
              type="number"
              value={slippage}
              onChange={e => setSlippage(e.target.value)}
              step="0.1"
              min="0"
              className="w-12 neon-control text-white px-1 py-1 text-center font-mono"
            />
            <span>%</span>
          </div>

          <div className="neon-control rounded-lg p-3 mb-2">
            <div className="flex justify-between text-sm text-gray-200 mb-1">
              <span>You Pay</span>
              <span>Balance: {fromToken === nativeSymbol ? (balances[nativeSymbol] || '0.0000') : (balances[fromToken] || '0.0000')}</span>
            </div>
            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="text-2xl bg-transparent border-none text-white outline-none w-full p-0 font-mono"
              />
              <div className="flex items-center gap-3 neon-control px-4 py-3 rounded-lg cursor-pointer">
                <div 
                  className="w-8 h-8 text-white" 
                  dangerouslySetInnerHTML={{ __html: TOKEN_ICONS[fromToken] }} 
                />
                <select
                  className="bg-transparent text-white text-xl font-bold outline-none cursor-pointer"
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                >
                  <option className="font-bold text-xl text-black bg-white" value={nativeSymbol}>{nativeSymbol}</option>
                  {Object.keys(tokens).map(t => (
                    <option className="font-bold text-xl text-black bg-white" key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-lg text-gray-300 mt-1 h-4">
              {fromAmount && prices[fromToken] ? `$${(parseFloat(fromAmount) * prices[fromToken]).toFixed(2)}` : ''}
            </div>
          </div>

          <div className="text-center text-2xl text-cyan-200 my-2 relative z-10">↓</div>

          <div className="neon-control rounded-lg p-3 mb-4">
            <div className="flex justify-between text-sm text-gray-200 mb-1">
              <span>You Receive (Simulated)</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-2xl text-gray-200 text-left">
                {isQuoteLoading ? '...' : (quote || '0.0')}
              </div>
              <div className="flex items-center gap-3 neon-control px-4 py-3 rounded-lg cursor-pointer">
                <div 
                  className="w-8 h-8 text-white" 
                  dangerouslySetInnerHTML={{ __html: TOKEN_ICONS[toToken] }} 
                />
                <select
                  className="bg-transparent text-white text-xl font-bold outline-none cursor-pointer"
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                >
                  {Object.keys(tokens).map(t => (
                    <option className="font-bold text-xl text-black bg-white" key={t} value={t}>{t}</option>
                  ))}
                  <option className="font-bold text-xl text-black bg-white" value={nativeSymbol}>{nativeSymbol}</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-300 mt-1 h-4">
              {quote && prices[toToken] ? `$${(parseFloat(quote) * prices[toToken]).toFixed(2)}` : ''}
            </div>
          </div>

          <button
            className="w-full py-4 px-6 rounded-lg neon-control text-white font-bold text-lg cursor-pointer disabled:opacity-60"
            onClick={handleSwap}
            disabled={isSwapping || isQuoteLoading || !fromAmount || parseFloat(fromAmount) <= 0}
          >
            {isSwapping ? 'Swapping...' : 'Preview & Swap'}
          </button>
        </div>
      </div>

      {/* Transaction Preview Modal */}
      <TransactionPreviewModal
        isOpen={showSimulation}
        onClose={handleSimulationClose}
        onConfirm={executeSwap}
        simulationData={simulationData}
        isLoading={isSimulating}
        error={simulationError}
      />
    </div>
  );
}
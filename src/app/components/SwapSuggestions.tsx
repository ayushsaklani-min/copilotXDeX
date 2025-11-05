'use client';

import { useSwapSuggestions } from '../../hooks/useSwapSuggestions';
import { ethers } from 'ethers';

interface SwapSuggestionsProps {
  signer: ethers.JsonRpcSigner | null;
  dexAddress: string;
  tokens: Record<string, string>;
  balances: Record<string, number>;
  onSelectSwap?: (fromToken: string, toToken: string) => void;
}

export default function SwapSuggestions({
  signer,
  dexAddress,
  tokens,
  balances,
  onSelectSwap,
}: SwapSuggestionsProps) {
  const { suggestions, isAnalyzing, gasPrice, refresh } = useSwapSuggestions({
    signer,
    dexAddress,
    tokens,
    balances,
  });

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-400 bg-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'low':
        return 'text-orange-400 bg-orange-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (!signer) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6 text-center">
        <p className="text-gray-400">Connect wallet to see swap suggestions</p>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">💡 Smart Swap Suggestions</h3>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-400">
            Gas: <span className="text-cyan-300">{gasPrice} Gwei</span>
          </div>
          <button
            onClick={refresh}
            disabled={isAnalyzing}
            className="text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? '🔄' : '↻'}
          </button>
        </div>
      </div>

      {isAnalyzing ? (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl mb-2">🔄</div>
          <p className="text-gray-400">Analyzing pools...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No optimal swap opportunities right now</p>
          <p className="text-sm text-gray-500 mt-2">
            Make sure you have token balances and pools have liquidity
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => onSelectSwap?.(suggestion.fromToken, suggestion.toToken)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-white">
                    {suggestion.fromToken} → {suggestion.toToken}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(
                      suggestion.confidence
                    )}`}
                  >
                    {suggestion.confidence.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Expected Output</div>
                  <div className="text-white font-semibold">
                    {parseFloat(suggestion.expectedOutput).toFixed(4)} {suggestion.toToken}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Slippage:</span>
                  <span
                    className={`ml-2 ${
                      suggestion.slippage < 0.5 ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {suggestion.slippage.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Gas:</span>
                  <span className="ml-2 text-cyan-300">{suggestion.gasEstimate}</span>
                </div>
              </div>

              <div className="mt-2 text-sm text-gray-400">
                {suggestion.reason}
              </div>

              {!suggestion.poolDepth.adequate && (
                <div className="mt-2 text-xs text-orange-400">
                  ⚠️ Pool depth may be limited
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 text-center">
        Suggestions update every 60 seconds based on real-time pool data
      </div>
    </div>
  );
}

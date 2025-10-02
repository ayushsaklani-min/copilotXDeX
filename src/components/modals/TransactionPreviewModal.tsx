'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ArrowRight, Zap } from 'lucide-react';

interface AssetChange {
  type: 'SEND' | 'RECEIVE';
  symbol: string;
  amount: string;
  usdValue: number;
}

interface SimulationData {
  assetChanges: AssetChange[];
  gasFeeUSD: number;
  warnings: string[];
}

interface TransactionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  simulationData: SimulationData | null;
  isLoading: boolean;
  error: string | null;
}

export default function TransactionPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  simulationData,
  isLoading,
  error,
}: TransactionPreviewModalProps) {
  const sendAssets = simulationData?.assetChanges.filter(asset => asset.type === 'SEND') || [];
  const receiveAssets = simulationData?.assetChanges.filter(asset => asset.type === 'RECEIVE') || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-gray-900 border-4 border-black rounded-lg shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-gray-700">
              <h2 className="text-2xl font-bold text-white">Transaction Preview</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full"
                  />
                  <p className="mt-4 text-lg text-gray-300">Simulating transaction...</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-900/20 border-2 border-red-500 rounded-lg">
                  <AlertTriangle className="text-red-400" size={24} />
                  <div>
                    <p className="text-red-400 font-semibold">Simulation Failed</p>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {simulationData && !isLoading && (
                <div className="space-y-6">
                  {/* You Send Section */}
                  {sendAssets.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                        <ArrowRight className="rotate-180" size={20} />
                        You Send
                      </h3>
                      <div className="space-y-2">
                        {sendAssets.map((asset, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <span className="text-white font-semibold">{asset.amount} {asset.symbol}</span>
                            <span className="text-red-300">${asset.usdValue.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* You Receive Section */}
                  {receiveAssets.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                        <ArrowRight size={20} />
                        You Receive
                      </h3>
                      <div className="space-y-2">
                        {receiveAssets.map((asset, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                            <span className="text-white font-semibold">{asset.amount} {asset.symbol}</span>
                            <span className="text-green-300">${asset.usdValue.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Network Fee */}
                  <div className="flex justify-between items-center p-3 bg-gray-800 border border-gray-600 rounded-lg">
                    <span className="text-gray-300 flex items-center gap-2">
                      <Zap size={16} />
                      Network Fee
                    </span>
                    <span className="text-white font-semibold">${simulationData.gasFeeUSD.toFixed(2)}</span>
                  </div>

                  {/* Security Warnings */}
                  {simulationData.warnings.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                        <AlertTriangle size={20} />
                        Security Warnings
                      </h3>
                      <div className="space-y-2">
                        {simulationData.warnings.map((warning, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                            <AlertTriangle className="text-yellow-400 mt-0.5 flex-shrink-0" size={16} />
                            <p className="text-yellow-200 text-sm">{warning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 border-t-2 border-gray-700">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors border-2 border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading || !!error || !simulationData}
                className="flex-1 py-3 px-6 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors border-2 border-cyan-400"
              >
                {isLoading ? 'Simulating...' : 'Confirm Transaction'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


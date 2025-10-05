'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const TOKENS = {
  TIK: '0xf0dc4aa8063810B4116091371a74D55856c9Fa87',
  TAK: '0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3',
  TOE: '0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc',
};

const DEX_ADDRESS = '0x3Db5A1C4bE6C21ceCaf3E74611Bd55F41651f0Ba';

export default function SwapTest() {
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [fromAmount, setFromAmount] = useState('1');
  const [toAmount, setToAmount] = useState('');

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum as ethers.Eip1193Provider);
      await provider.send("eth_requestAccounts", []);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setSigner(signer);
      setAddress(address);
      setIsConnected(true);
      setStatus('Wallet connected!');
    } catch {
      setStatus('Failed to connect wallet');
    }
  };

  const calculateOutput = async () => {
    if (!signer || !fromAmount) return;

    try {
      const dexAbi = [
        "function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256)",
      ];
      
      const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, signer);
      const amountInWei = ethers.parseEther(fromAmount);
      const amountOutWei = await dex.getAmountOut(amountInWei, TOKENS.TIK, TOKENS.TOE);
      const amountOut = ethers.formatEther(amountOutWei);
      
      setToAmount(amountOut);
      setStatus(`1 TIK = ${amountOut} TOE`);
    } catch {
      setStatus('Error calculating output');
    }
  };

  const executeSwap = async () => {
    if (!signer || !fromAmount) return;

    try {
      setStatus('Executing swap...');
      
      const dexAbi = [
        "function swapExactTokensForTokens(address tokenIn, address tokenOut, uint256 amountIn, address to) external returns (uint256)",
      ];
      
      const erc20Abi = [
        "function approve(address spender, uint256 amount) returns (bool)",
      ];

      const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, signer);
      const tikToken = new ethers.Contract(TOKENS.TIK, erc20Abi, signer);
      
      const amountInWei = ethers.parseEther(fromAmount);
      
      // Approve
      setStatus('Approving TIK tokens...');
      const approveTx = await tikToken.approve(DEX_ADDRESS, amountInWei);
      await approveTx.wait();
      
      // Swap
      setStatus('Executing swap...');
      const swapTx = await dex.swapExactTokensForTokens(
        TOKENS.TIK,
        TOKENS.TOE,
        amountInWei,
        address
      );
      const receipt = await swapTx.wait();
      
      setStatus(`Swap successful! TX: ${receipt.hash.slice(0, 10)}...`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      setStatus(`Swap failed: ${err.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    if (isConnected && fromAmount) {
      calculateOutput();
    }
  }, [isConnected, fromAmount, calculateOutput]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">TikTakDex Swap Test</h1>
        
        {!isConnected ? (
          <button
            onClick={connectWallet}
            className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-200"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="space-y-4">
            <div className="text-center text-green-300">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Amount (TIK)</label>
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
                placeholder="1.0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Expected Output (TOE)</label>
              <div className="w-full px-3 py-2 bg-white/5 text-white rounded-lg border border-gray-600">
                {toAmount || '0.0'}
              </div>
            </div>
            
            <button
              onClick={executeSwap}
              className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
            >
              Execute Swap
            </button>
            
            {status && (
              <div className="text-center text-sm text-gray-300">
                {status}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

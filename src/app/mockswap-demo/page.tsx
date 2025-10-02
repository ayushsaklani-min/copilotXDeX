'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import MockSwap from '../components/MockSwap';

interface Status {
  message: string;
  type: string;
}

// Get external provider for ethers.js v6
const getExternalProvider = (): ethers.Eip1193Provider => {
  const maybeWindow = window as unknown as { ethereum?: unknown };
  if (!maybeWindow.ethereum || typeof maybeWindow.ethereum !== 'object') {
    throw new Error('No injected Ethereum provider found');
  }
  return maybeWindow.ethereum as ethers.Eip1193Provider;
};

export default function MockSwapDemo() {
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ message: '', type: '' });
  const [isOpen, setIsOpen] = useState(true);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (typeof (window as unknown as { ethereum?: unknown }).ethereum !== 'undefined') {
          const provider = new ethers.BrowserProvider(getExternalProvider());
          const accounts = await provider.listAccounts();
          
          if (accounts.length > 0) {
            const web3Signer = await provider.getSigner();
            const userAddress = await web3Signer.getAddress();
            setSigner(web3Signer);
            setAddress(userAddress);
          }
        }
      } catch (error) {
        console.log('Connection check error:', error);
      }
    };

    checkConnection();
  }, []);

  const connectWallet = async () => {
    setStatus({ message: '', type: '' });
    
    if (typeof (window as unknown as { ethereum?: unknown }).ethereum === 'undefined') {
      setStatus({ message: 'MetaMask is not installed! Please install MetaMask extension.', type: 'error' });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(getExternalProvider());
      await provider.send("eth_requestAccounts", []);
      
      const web3Signer = await provider.getSigner();
      const userAddress = await web3Signer.getAddress();
      setSigner(web3Signer);
      setAddress(userAddress);
      
      setStatus({ message: 'Wallet connected successfully!', type: 'success' });
    } catch (error: unknown) {
      console.error('Connection error:', error);
      const err = error as { code?: number; message?: string };
      
      if (err.code === 4001) {
        setStatus({ message: 'Connection rejected by user. Please try again.', type: 'error' });
      } else {
        setStatus({ message: `Connection failed: ${err.message || 'Unknown error'}. Please try again.`, type: 'error' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">MockSwap Demo</h1>
            <p className="text-gray-300">
              A DeFi swap interface for TokenA (TKA) ↔ TokenB (TKB)
            </p>
          </div>

          {/* Connection Status */}
          {!address ? (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 text-center">
              <h2 className="text-xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-gray-300 mb-4">
                Connect your MetaMask wallet to interact with the MockSwap contract
              </p>
              <button
                onClick={connectWallet}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="bg-green-800 rounded-lg p-4 mb-6">
              <p className="text-white">
                <strong>Connected:</strong> {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            </div>
          )}

          {/* Status Messages */}
          {status.message && (
            <div className={`p-4 rounded-lg mb-6 font-bold ${
              status.type === 'error' ? 'bg-red-600 text-white' : 
              status.type === 'success' ? 'bg-green-600 text-white' : 
              'bg-blue-600 text-white'
            }`}>
              {status.message}
            </div>
          )}

          {/* Contract Information */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Contract Addresses</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">MockSwap:</span>
                <span className="text-white font-mono">0x865ca22F1c5A91746cBcd0563F647ac203154403</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">TokenA (TKA):</span>
                <span className="text-white font-mono">0x0555C0c9d8719a800acA5d111239d9c76Ec7A7eF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">TokenB (TKB):</span>
                <span className="text-white font-mono">0x8C8a706DE324A6283ac4844C2fAFc6A4406ba502</span>
              </div>
            </div>
          </div>

          {/* MockSwap Component */}
          <MockSwap
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            signer={signer}
            address={address}
            onStatusChange={setStatus}
          />

          {/* Instructions */}
          <div className="bg-gray-800 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">How to Use</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Connect your MetaMask wallet</li>
              <li>Make sure you have some TokenA (TKA) in your wallet</li>
              <li>Enter the amount of TKA you want to swap</li>
              <li>Click &quot;Approve&quot; to allow the MockSwap contract to spend your TKA</li>
              <li>Once approved, click &quot;Swap&quot; to execute the exchange</li>
              <li>You&apos;ll receive TokenB (TKB) based on the current exchange rate</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

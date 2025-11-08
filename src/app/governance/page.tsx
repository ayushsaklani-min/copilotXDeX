'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import GovernanceDashboard from '../components/GovernanceDashboard';

function getExternalProvider() {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as unknown as { ethereum?: ethers.Eip1193Provider };
  return anyWindow.ethereum as ethers.Eip1193Provider;
}

export default function GovernancePage() {
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const initConnection = async () => {
      try {
        const ext = getExternalProvider();
        if (!ext) return;

        const provider = new ethers.BrowserProvider(ext);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const sgn = await provider.getSigner();
          setSigner(sgn);
          setAddress(await sgn.getAddress());
        }
      } catch (err) {
        console.error('Connection error:', err);
      }
    };

    initConnection();

    // Listen for account changes
    const ext = getExternalProvider();
    if (ext && 'on' in ext) {
      ext.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(ext);
          const sgn = await provider.getSigner();
          setSigner(sgn);
          setAddress(await sgn.getAddress());
        } else {
          setSigner(null);
          setAddress(null);
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const ext = getExternalProvider();
      if (!ext) {
        alert('Please install MetaMask or another Web3 wallet');
        return;
      }

      const provider = new ethers.BrowserProvider(ext);
      await provider.send('eth_requestAccounts', []);
      const sgn = await provider.getSigner();
      setSigner(sgn);
      setAddress(await sgn.getAddress());
    } catch (err) {
      console.error('Connection error:', err);
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  if (!signer || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🏛️ Governance Dashboard</h1>
          <p className="text-gray-300 mb-8">Connect your wallet to participate in governance</p>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="px-8 py-4 bg-purple-500 hover:bg-purple-600 rounded-lg font-semibold text-lg disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  }

  return <GovernanceDashboard signer={signer} address={address} standalone={true} />;
}



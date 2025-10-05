// Wallet context for managing Web3 wallet state
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { WalletState } from './types';

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
  });

  const connect = useCallback(async () => {
    setWalletState(prev => ({ ...prev, isConnecting: true }));
    
    // Simulate wallet connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock wallet address
    const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    
    setWalletState({
      address: mockAddress,
      chainId: 80002, // Polygon Amoy testnet
      isConnected: true,
      isConnecting: false,
    });
  }, []);

  const disconnect = useCallback(() => {
    setWalletState({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
    });
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setWalletState(prev => ({ ...prev, chainId }));
  }, []);

  return (
    <WalletContext.Provider value={{ ...walletState, connect, disconnect, switchNetwork }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

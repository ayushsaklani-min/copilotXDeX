'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PortfolioOverview from './PortfolioOverview';
import AIAssistant from './AIAssistant';

// Narrow and return an EIP-1193 external provider for ethers.js v6
const getExternalProvider = (): ethers.Eip1193Provider => {
  const maybeWindow = window as unknown as { ethereum?: unknown };
  if (!maybeWindow.ethereum || typeof maybeWindow.ethereum !== 'object') {
    throw new Error('No injected Ethereum provider found');
  }
  return maybeWindow.ethereum as ethers.Eip1193Provider;
};

const AMOY_CHAIN_ID = '0x13882';
const ALCHEMY_API_KEY_AMOY = 'cWLAkUnYYRdZ041Gea_01';
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyDl9pqcEoAg1pNUyckWPurzyxiTLhEWt8w';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Network configuration for Polygon Amoy only
const NETWORK = {
    chainIdDec: 80002,
    chainIdHex: AMOY_CHAIN_ID,
    name: 'Polygon Amoy',
    alchemyUrl: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY_AMOY}`,
    nativeSymbol: 'MATIC',
    wrappedSymbol: 'WMATIC',
    routerAddress: process.env.NEXT_PUBLIC_AMOY_ROUTER_ADDRESS || '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
    tokens: {
      'WMATIC': { address: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', decimals: 18, coingeckoId: 'matic-network' },
      'WETH':   { address: '0x7b79995e5f793A07Bc00c21412e50Eaae098E7f9', decimals: 18, coingeckoId: 'weth' },
      'DAI':    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, coingeckoId: 'dai' },
      'USDC':   { address: '0x41e94Eb019C0762f9BFC4545e35629259441294f', decimals: 6, coingeckoId: 'usd-coin' },
      // Optional POL on Amoy (provide NEXT_PUBLIC_AMOY_POL_ADDRESS)
      ...(process.env.NEXT_PUBLIC_AMOY_POL_ADDRESS ? { 'POL': { address: process.env.NEXT_PUBLIC_AMOY_POL_ADDRESS as string, decimals: 18, coingeckoId: 'polygon-ecosystem-token' } } : {})
    }
};

type TokenBalance = {
  symbol: string;
  balance: string;
  usdValue: number;
  contractAddress: string;
  decimals: number;
  coingeckoId: string;
};

export default function Web3Copilot() {
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Initialize connection on mount
  useEffect(() => {
    const initConnection = async () => {
    try {
      const ext = getExternalProvider();
      const provider = new ethers.BrowserProvider(ext);
          const accounts = await provider.listAccounts();
          
          if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();
          
          setSigner(signer);
          setAddress(address);
          setIsConnected(true);
          setIsCorrectNetwork(Number(network.chainId) === NETWORK.chainIdDec);
          
          // Fetch balances immediately
          await fetchBalances();
          }
        } catch (error) {
        console.error('Error initializing connection:', error);
      }
    };

    initConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
          setSigner(null);
          setAddress(null);
        setIsConnected(false);
        setIsCorrectNetwork(false);
        setBalances([]);
      } else {
        // User switched accounts
        const newAddress = accounts[0];
        setAddress(newAddress);
        if (signer) {
          fetchBalances();
        }
      }
    };

    const handleChainChanged = (chainId: string) => {
      const isCorrect = parseInt(chainId, 16) === NETWORK.chainIdDec;
      setIsCorrectNetwork(isCorrect);
      if (isCorrect && signer) {
        fetchBalances();
      }
    };

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      (window as any).ethereum.on('chainChanged', handleChainChanged);

      return () => {
        (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
        (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [signer]);

  const switchToAmoyNetwork = async () => {
    try {
      await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK.chainIdHex }]
      });
      
      const newProvider = new ethers.BrowserProvider(getExternalProvider());
      const newSigner = await newProvider.getSigner();
      const newAddress = await newSigner.getAddress();
      
      setSigner(newSigner);
      setAddress(newAddress);
      setIsConnected(true);
      setIsCorrectNetwork(true);
      
      await fetchBalances();
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === 4902) {
        // Network not added, try to add it
        try {
          await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: NETWORK.chainIdHex,
              chainName: NETWORK.name,
              rpcUrls: ['https://rpc-amoy.polygon.technology/'],
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18,
              },
              blockExplorerUrls: ['https://amoy.polygonscan.com/']
            }]
          });
          
          const newProvider = new ethers.BrowserProvider(getExternalProvider());
          const newSigner = await newProvider.getSigner();
          const newAddress = await newSigner.getAddress();
          
          setSigner(newSigner);
          setAddress(newAddress);
          setIsConnected(true);
          setIsCorrectNetwork(true);
          
          await fetchBalances();
        } catch (addError) {
          console.error('Error adding network:', addError);
          setError('Failed to add Polygon Amoy network to MetaMask');
        }
      } else {
        console.error('Error switching network:', error);
        setError('Failed to switch to Polygon Amoy network');
      }
    }
  };

  const connectWallet = async () => {
    if (typeof (window as unknown as { ethereum?: unknown }).ethereum === 'undefined') {
      setError('MetaMask is not installed. Please install MetaMask to use this app.');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      
      const web3Provider = new ethers.BrowserProvider(getExternalProvider());
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      
      if (accounts.length > 0) {
        const signer = await web3Provider.getSigner();
        const address = await signer.getAddress();
        const network = await web3Provider.getNetwork();
        
        setSigner(signer);
        setAddress(address);
        setIsConnected(true);
        
        const isCorrectNetwork = Number(network.chainId) === NETWORK.chainIdDec;
        setIsCorrectNetwork(isCorrectNetwork);
        
        if (isCorrectNetwork) {
          await fetchBalances();
        } else {
          // Try to switch to the correct network
        try {
          await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
            method: 'wallet_switchEthereumChain',
              params: [{ chainId: NETWORK.chainIdHex }]
            });
            
            setIsCorrectNetwork(true);
            await fetchBalances();
          } catch (switchError: unknown) {
            const switchErr = switchError as { code?: number; message?: string };
            if (switchErr.code === 4902) {
              // Network not added, try to add it
            try {
              await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: NETWORK.chainIdHex,
                    chainName: NETWORK.name,
                    rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                  nativeCurrency: {
                      name: 'MATIC',
                      symbol: 'MATIC',
                      decimals: 18,
                    },
                    blockExplorerUrls: ['https://amoy.polygonscan.com/']
                }]
              });
                
                setIsCorrectNetwork(true);
                await fetchBalances();
              } catch (addError) {
                setError('Please add Polygon Amoy network to MetaMask');
              }
            } else {
              setError('Please switch to Polygon Amoy network');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalances = async () => {
    if (!signer || !address) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch native MATIC balance
      const nativeBalanceWei = await signer.provider!.getBalance(address);
      const nativeBalance = parseFloat(ethers.formatEther(nativeBalanceWei)).toFixed(4);

      // Fetch token balances using Alchemy
      const tokenBalances: TokenBalance[] = [
        {
          symbol: NETWORK.nativeSymbol,
          balance: nativeBalance,
          usdValue: 0, // Will be calculated below
          contractAddress: '',
          decimals: 18,
          coingeckoId: 'matic-network'
        }
      ];

      // Get token balances from Alchemy
      const tokenAddresses = Object.values(NETWORK.tokens).map(token => token.address);
      
      const response = await fetch(NETWORK.alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [address, tokenAddresses]
        })
      });

      const data = await response.json();
      
      if (data.result && data.result.tokenBalances) {
        // Get token metadata
        const metadataResponse = await fetch(NETWORK.alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenMetadata',
            params: [tokenAddresses]
        })
      });

        const metadataData = await metadataResponse.json();
        const tokenMetadata = metadataData.result || [];

        for (const tokenBalance of data.result.tokenBalances) {
          if (tokenBalance.tokenBalance !== '0x0') {
            const metadata = tokenMetadata.find((meta: { contractAddress?: string }) => 
              meta.contractAddress?.toLowerCase() === tokenBalance.contractAddress?.toLowerCase()
            );

            if (metadata) {
              const balance = ethers.formatUnits(tokenBalance.tokenBalance, metadata.decimals);
              const symbol = metadata.symbol || 'UNKNOWN';
              
              // Find the token in our configuration
              const tokenConfig = Object.entries(NETWORK.tokens).find(
                ([_, config]) => config.address.toLowerCase() === tokenBalance.contractAddress?.toLowerCase()
              );

              if (tokenConfig) {
                tokenBalances.push({
                  symbol,
                  balance: parseFloat(balance).toFixed(4),
                  usdValue: 0, // Will be calculated below
                  contractAddress: tokenBalance.contractAddress,
                  decimals: metadata.decimals,
                  coingeckoId: tokenConfig[1].coingeckoId
                });
              }
            }
          }
        }
      }

      // Calculate USD values
      const coingeckoIds = tokenBalances.map(t => t.coingeckoId).join(',');
      const priceResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd`
      );
      const prices = await priceResponse.json();

      tokenBalances.forEach(token => {
        const price = prices[token.coingeckoId]?.usd || 0;
        token.usdValue = parseFloat(token.balance) * price;
      });

      setBalances(tokenBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
      setError('Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiQuery = async (query: string) => {
    if (!query.trim()) return;

    setIsAiLoading(true);
    setAiResponse('');

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a Web3 DeFi assistant. The user is connected to Polygon Amoy testnet. Current balances: ${balances.map(b => `${b.balance} ${b.symbol}`).join(', ')}. User query: ${query}`
            }]
          }]
        })
      });

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';
      setAiResponse(aiText);
    } catch (error) {
      console.error('Error calling AI:', error);
      setAiResponse('Sorry, there was an error processing your request.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const totalUsdValue = balances.reduce((sum, token) => sum + token.usdValue, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-cyan-500/30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-white">Web3 Copilot</h1>
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm font-semibold">
                Polygon Amoy
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-300">Connected</div>
                    <div className="text-white font-mono text-sm">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </div>
                    <div className="text-xs text-cyan-300">
                      ${totalUsdValue.toFixed(2)} USD
                    </div>
                  </div>
                  {!isCorrectNetwork && (
              <button
                      onClick={switchToAmoyNetwork}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
              >
                      Switch Network
              </button>
                  )}
            </div>
              )}
            </div>
              </div>
            </div>
              </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
            </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <div className="neon-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Navigation</h2>
              
              <div className="space-y-4">
                <details className="group">
                  <summary className="cursor-pointer text-cyan-300 hover:text-cyan-200 font-semibold">
                    📊 Portfolio Overview
                  </summary>
                  <div className="mt-2 pl-4 text-sm text-gray-300">
                    View your token balances and portfolio value
          </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer text-cyan-300 hover:text-cyan-200 font-semibold">
                    🤖 AI Assistant
                  </summary>
                  <div className="mt-2 pl-4 text-sm text-gray-300">
                    Get help with DeFi strategies and questions
                  </div>
                </details>
                
                
                {/* DEX Navigation */}
                <div className="mt-4 pt-4 border-t border-cyan-500/30">
                  <a 
                    href="/dex" 
                    className="w-full block py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-lg text-center transition-all duration-200 shadow-lg"
                  >
                    🚀 TikTakDex
                  </a>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Full-featured DEX for TIK-TAK-TOE tokens
                  </p>
                </div>
              </div>
              </div>
            </aside>

            {/* Main content cards */}
          <div className="col-span-12 lg:col-span-9">
              <div className="neon-card p-6">
                <h1 className="text-3xl font-bold mb-4 text-cyan-200">Web3 Copilot 🚀</h1>
              <p className="text-gray-300 mb-6">
                Your all-in-one DeFi companion for Polygon Amoy testnet. Manage your portfolio, 
                swap tokens, and get AI-powered assistance for your DeFi journey.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PortfolioOverview
                  balances={balances.reduce((acc, token) => {
                    acc[token.symbol] = token.balance;
                    return acc;
                  }, {} as Record<string, string>)} 
                  isLoading={isLoading}
                  onRefresh={fetchBalances}
                  prices={balances.reduce((acc, token) => {
                    acc[token.symbol] = token.usdValue / parseFloat(token.balance) || 0;
                    return acc;
                  }, {} as Record<string, number>)}
                  nativeSymbol={NETWORK.nativeSymbol}
                  tokens={{}}
            />

            <AIAssistant
                  onQuery={handleAiQuery}
                  response={aiResponse}
                  isLoading={isAiLoading}
            />
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import PortfolioOverview from './PortfolioOverview';
import AIAssistant from './AIAssistant';
import { useReputation } from '../../hooks/useReputation';

type EthereumProvider = ethers.Eip1193Provider & {
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

// Narrow and return an EIP-1193 external provider for ethers.js v6
const getExternalProvider = (): EthereumProvider => {
  const maybeWindow = window as unknown as { ethereum?: unknown };
  if (!maybeWindow.ethereum || typeof maybeWindow.ethereum !== 'object') {
    throw new Error('No injected Ethereum provider found');
  }
  return maybeWindow.ethereum as EthereumProvider;
};

const AMOY_CHAIN_ID = '0x13882';
const AMOY_RPC_URL = process.env.NEXT_PUBLIC_AMOY_RPC_URL ?? '';
const AMOY_FALLBACK_RPC_URL = process.env.NEXT_PUBLIC_AMOY_FALLBACK_RPC_URL ?? 'https://rpc-amoy.polygon.technology/';
const GEMINI_API_URL = '/api/copilot';

// Network configuration for Polygon Amoy only
const NETWORK = {
    chainIdDec: 80002,
    chainIdHex: AMOY_CHAIN_ID,
    name: 'Polygon Amoy',
    rpcUrl: AMOY_RPC_URL || null,
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

  const { score: reputationScore } = useReputation(signer, address ?? undefined);

  const fetchBalances = useCallback(
    async (activeSigner: ethers.JsonRpcSigner, activeAddress: string) => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch native MATIC balance with retry logic and fallback RPC
        let providerForBalances = activeSigner.provider;
        if (!providerForBalances) {
          // Try primary RPC first, then fallback
          const primaryRpc = NETWORK.rpcUrl ? new ethers.JsonRpcProvider(NETWORK.rpcUrl) : null;
          const fallbackRpc = new ethers.JsonRpcProvider(AMOY_FALLBACK_RPC_URL);
          providerForBalances = primaryRpc || fallbackRpc;
        }
        
        if (!providerForBalances) {
          throw new Error('No provider available to fetch balances');
        }

        let nativeBalanceWei: bigint = ethers.parseEther('0');
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            nativeBalanceWei = await providerForBalances.getBalance(activeAddress);
            break; // Success, exit retry loop
          } catch (balanceError: any) {
            retryCount++;
            console.warn(`Balance fetch attempt ${retryCount} failed:`, balanceError);
            
            if (balanceError.message?.includes('state histories haven\'t been fully indexed yet') || 
                balanceError.message?.includes('Internal JSON-RPC error')) {
              
              // Try switching to fallback RPC on first retry
              if (retryCount === 1 && providerForBalances === activeSigner.provider) {
                console.log('Switching to fallback RPC...');
                providerForBalances = new ethers.JsonRpcProvider(AMOY_FALLBACK_RPC_URL);
                continue;
              }
              
              if (retryCount < maxRetries) {
                console.log(`Retrying balance fetch in ${retryCount * 1000}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
                continue;
              } else {
                // After max retries, show a user-friendly message
                console.warn('Balance fetch failed after retries, using fallback');
                nativeBalanceWei = ethers.parseEther('0'); // Fallback to 0 balance
                break;
              }
            } else {
              throw balanceError; // Re-throw non-indexing errors
            }
          }
        }

        const nativeBalance = parseFloat(ethers.formatEther(nativeBalanceWei)).toFixed(4);

        // Fetch token balances using JSON RPC
        const tokenBalances: TokenBalance[] = [
          {
            symbol: NETWORK.nativeSymbol,
            balance: nativeBalance,
            usdValue: 0,
            contractAddress: '',
            decimals: 18,
            coingeckoId: 'matic-network'
          }
        ];

        const provider = providerForBalances;

        const erc20Abi = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function symbol() view returns (string)'];

        for (const tokenConfig of Object.values(NETWORK.tokens)) {
          try {
            const tokenContract = new ethers.Contract(tokenConfig.address, erc20Abi, provider);
            
            // Add retry logic for token balance fetching
            let rawBalance, decimals, symbol;
            let tokenRetryCount = 0;
            const maxTokenRetries = 2;

            while (tokenRetryCount < maxTokenRetries) {
              try {
                [rawBalance, decimals, symbol] = await Promise.all([
                  tokenContract.balanceOf(activeAddress),
                  tokenContract.decimals(),
                  tokenContract.symbol().catch(() => tokenConfig.address.slice(0, 6)),
                ]);
                break; // Success, exit retry loop
              } catch (tokenError: any) {
                tokenRetryCount++;
                console.warn(`Token ${tokenConfig.address} fetch attempt ${tokenRetryCount} failed:`, tokenError);
                
                if (tokenError.message?.includes('state histories haven\'t been fully indexed yet') || 
                    tokenError.message?.includes('Internal JSON-RPC error') ||
                    tokenError.message?.includes('could not decode result data')) {
                  if (tokenRetryCount < maxTokenRetries) {
                    console.log(`Retrying token fetch in ${tokenRetryCount * 500}ms...`);
                    await new Promise(resolve => setTimeout(resolve, tokenRetryCount * 500));
                    continue;
                  } else {
                    // After max retries, skip this token
                    console.warn(`Skipping token ${tokenConfig.address} after retries`);
                    throw tokenError;
                  }
                } else {
                  throw tokenError; // Re-throw non-indexing errors
                }
              }
            }

            const formattedBalance = ethers.formatUnits(rawBalance, decimals);
            tokenBalances.push({
              symbol,
              balance: parseFloat(formattedBalance).toFixed(4),
              usdValue: 0,
              contractAddress: tokenConfig.address,
              decimals,
              coingeckoId: tokenConfig.coingeckoId,
            });
          } catch (tokenError) {
            console.warn(`Skipping token ${tokenConfig.address}:`, tokenError);
          }
        }

        const coingeckoIds = tokenBalances.map((t) => t.coingeckoId).join(',');
        if (coingeckoIds) {
          const priceResponse = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd`
          );
          if (priceResponse.ok) {
            const prices = await priceResponse.json();
            tokenBalances.forEach((token) => {
              const price = prices[token.coingeckoId]?.usd || 0;
              const parsedBalance = parseFloat(token.balance) || 0;
              token.usdValue = parsedBalance * price;
            });
          }
        }

        setBalances(tokenBalances);
      } catch (fetchError: any) {
        console.error('Error fetching balances:', fetchError);
        
        // Provide more specific error messages
        if (fetchError.message?.includes('state histories haven\'t been fully indexed yet')) {
          setError('Blockchain is still syncing. Please wait a moment and try refreshing.');
        } else if (fetchError.message?.includes('Internal JSON-RPC error')) {
          setError('Network temporarily unavailable. Please try again in a moment.');
        } else if (fetchError.message?.includes('No provider available')) {
          setError('Unable to connect to blockchain. Please check your network connection.');
        } else {
          setError('Failed to fetch balances. Please try refreshing.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleAiQuery = async (query: string) => {
    if (!query.trim()) return;

    setIsAiLoading(true);
    setAiResponse('');

    try {
      const contextPayload = {
        walletAddress: address ?? undefined,
        balances: balances.reduce((acc, token) => {
          acc[token.symbol] = parseFloat(token.balance);
          return acc;
        }, {} as Record<string, number>),
        reputationScore,
      };

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          context: contextPayload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Copilot request failed');
      }

      const data = await response.json();
      const aiText = data.response || data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';
      setAiResponse(aiText);
    } catch (error) {
      console.error('Error calling AI:', error);
      setAiResponse('Sorry, there was an error processing your request.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Initialize connection on mount
  useEffect(() => {
    const initConnection = async () => {
      try {
        const ext = getExternalProvider();
        const provider = new ethers.BrowserProvider(ext);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          const activeSigner = await provider.getSigner();
          const activeAddress = await activeSigner.getAddress();
          const activeNetwork = await provider.getNetwork();

          setSigner(activeSigner);
          setAddress(activeAddress);
          setIsConnected(true);
          const correctNetwork = Number(activeNetwork.chainId) === NETWORK.chainIdDec;
          setIsCorrectNetwork(correctNetwork);

          if (correctNetwork) {
            await fetchBalances(activeSigner, activeAddress);
          }
        }
      } catch (error) {
        console.error('Error initializing connection:', error);
      }
    };

    void initConnection();
  }, [fetchBalances]);

  // Listen for account changes
  useEffect(() => {
    const handleAccountsChanged = async (accountsRaw: unknown) => {
      const accounts = Array.isArray(accountsRaw) ? (accountsRaw as string[]) : [];
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
          await fetchBalances(signer, newAddress);
        }
      }
    };

    const handleChainChanged = (chainIdRaw: unknown) => {
      if (typeof chainIdRaw !== 'string') {
        return;
      }
      const isCorrect = parseInt(chainIdRaw, 16) === NETWORK.chainIdDec;
      setIsCorrectNetwork(isCorrect);
      if (isCorrect && signer && address) {
        void fetchBalances(signer, address);
      }
    };

    if (typeof window !== 'undefined') {
      const ethereum = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
      if (!ethereum) {
        return;
      }
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [signer, address, fetchBalances]);

  const switchToAmoyNetwork = async () => {
    try {
      await getExternalProvider().request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK.chainIdHex }]
      });
      
      const refreshedProvider = new ethers.BrowserProvider(getExternalProvider());
      const refreshedSigner = await refreshedProvider.getSigner();
      const refreshedAddress = await refreshedSigner.getAddress();
      
      setSigner(refreshedSigner);
      setAddress(refreshedAddress);
      setIsConnected(true);
      setIsCorrectNetwork(true);
      
      await fetchBalances(refreshedSigner, refreshedAddress);
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === 4902) {
        // Network not added, try to add it
        try {
          await getExternalProvider().request({
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
          
          const refreshedProvider = new ethers.BrowserProvider(getExternalProvider());
          const refreshedSigner = await refreshedProvider.getSigner();
          const refreshedAddress = await refreshedSigner.getAddress();
          
          setSigner(refreshedSigner);
          setAddress(refreshedAddress);
          setIsConnected(true);
          setIsCorrectNetwork(true);
          
          await fetchBalances(refreshedSigner, refreshedAddress);
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
      const accounts = await web3Provider.send('eth_requestAccounts', []);
      
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
          await fetchBalances(signer, address);
        } else {
          // Try to switch to the correct network
          try {
            await getExternalProvider().request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: NETWORK.chainIdHex }]
            });

            setIsCorrectNetwork(true);
            await fetchBalances(signer, address);
          } catch (switchError: unknown) {
            const switchErr = switchError as { code?: number; message?: string };
            if (switchErr.code === 4902) {
              // Network not added, try to add it
              try {
                await getExternalProvider().request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: NETWORK.chainIdHex,
                    chainName: NETWORK.name,
                    rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                    nativeCurrency: {
                      name: 'MATIC',
                      symbol: 'MATIC',
                      decimals: 18
                    },
                    blockExplorerUrls: ['https://amoy.polygonscan.com/']
                  }]
                });

                setIsCorrectNetwork(true);
                await fetchBalances(signer, address);
              } catch {
                setError('Please add Polygon Amoy network to MetaMask');
              }
            } else {
              setError('Please switch to Polygon Amoy network');
            }
          }
        }
      }
    } catch (connectError) {
      console.error('Error connecting wallet:', connectError);
      setError('Failed to connect wallet');
    } finally {
      setIsLoading(false);
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
          <div className={`px-4 py-3 rounded-lg ${
            error.includes('syncing') || error.includes('temporarily unavailable') 
              ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-300' 
              : 'bg-red-500/20 border border-red-500/50 text-red-300'
          }`}>
            {error}
            {error.includes('syncing') && (
              <div className="mt-2 text-sm">
                💡 <strong>Tip:</strong> This is normal for testnets. The blockchain will sync automatically.
              </div>
            )}
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

                <div className="pt-4 border-t border-cyan-500/30 space-y-3">
                  <a
                    href="/dex"
                    className="w-full block py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-lg text-center transition-all duration-200 shadow-lg"
                  >
                    🚀 TikTakDex
                  </a>
                  <p className="text-xs text-gray-400 text-center">
                    Full-featured DEX with farming, swaps, and liquidity management.
                  </p>
                  
                  <a
                    href="/referrals"
                    className="w-full block py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg text-center transition-all duration-200 shadow-lg"
                  >
                    👥 Referrals
                  </a>
                  <p className="text-xs text-gray-400 text-center">
                    Earn XP by referring friends and unlock tier benefits.
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
                Your all-in-one DeFi companion for Polygon Amoy testnet. Manage your portfolio, swap tokens,
                farm liquidity, and get AI-powered assistance for your DeFi journey.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PortfolioOverview
                  balances={balances.reduce((acc, token) => {
                    acc[token.symbol] = token.balance;
                    return acc;
                  }, {} as Record<string, string>)}
                  isLoading={isLoading}
                  onRefresh={() => {
                    if (signer && address) {
                      void fetchBalances(signer, address);
                    }
                  }}
                  prices={balances.reduce((acc, token) => {
                    const amount = parseFloat(token.balance);
                    acc[token.symbol] = amount ? token.usdValue / amount : 0;
                    return acc;
                  }, {} as Record<string, number>)}
                  nativeSymbol={NETWORK.nativeSymbol}
                  tokens={{}}
                />

                <AIAssistant onQuery={handleAiQuery} response={aiResponse} isLoading={isAiLoading} />
              </div>
            </div>

            {/* Farming section removed - now available in DEX */}
          </div>
        </div>
      </div>
    </div>
  );
}
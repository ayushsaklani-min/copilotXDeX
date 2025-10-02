'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import BackgroundAnimation from './BackgroundAnimation';
import ConnectBackground from './ConnectBackground';
import PortfolioOverview from './PortfolioOverview';
import AIAssistant from './AIAssistant';
import TokenSwap from './TokenSwap';
import MockSwap from './MockSwap';

interface Status {
  message: string;
  type: string;
}

interface Balances {
  [key: string]: string;
}

interface Prices {
  [key: string]: number;
}

//

// Minimal token config shape based on NETWORKS constant
type TokenConfig = {
  address: string;
  decimals: number;
  coingeckoId: string;
};

// Alchemy token balance response item
interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string | null;
  error?: unknown;
}
interface AlchemyTokenMetadataItem {
  contractAddress: string;
  decimals: number | null;
  name: string | null;
  symbol: string | null;
  logo?: string | null;
}

// Narrow and return an EIP-1193 external provider for ethers.js v6
const getExternalProvider = (): ethers.Eip1193Provider => {
  const maybeWindow = window as unknown as { ethereum?: unknown };
  if (!maybeWindow.ethereum || typeof maybeWindow.ethereum !== 'object') {
    throw new Error('No injected Ethereum provider found');
  }
  return maybeWindow.ethereum as ethers.Eip1193Provider;
};
const AMOY_CHAIN_ID = '0x13882';
const SEPOLIA_CHAIN_ID = '0xaa36a7';
// Allow per-network keys; fall back to a single shared key if provided
const ALCHEMY_API_KEY_AMOY = 'cWLAkUnYYRdZ041Gea_01';
const ALCHEMY_API_KEY_SEPOLIA = 'GcHN5LnPwkFGcPWhGb-qc';
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyDl9pqcEoAg1pNUyckWPurzyxiTLhEWt8w';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
// Network configuration for Polygon Amoy and Ethereum Sepolia
const NETWORKS = {
  amoy: {
    chainIdDec: 80002,
    chainIdHex: AMOY_CHAIN_ID,
    name: 'Polygon Amoy',
    alchemyUrl: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY_AMOY}`,
    nativeSymbol: 'MATIC',
    wrappedSymbol: 'WMATIC',
    // Sushiswap router on Polygon PoS works on Amoy forks; change if needed
    routerAddress: process.env.NEXT_PUBLIC_AMOY_ROUTER_ADDRESS || '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
    tokens: {
      'WMATIC': { address: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', decimals: 18, coingeckoId: 'matic-network' },
      'WETH':   { address: '0x7b79995e5f793A07Bc00c21412e50Eaae098E7f9', decimals: 18, coingeckoId: 'weth' },
      'DAI':    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, coingeckoId: 'dai' },
      'USDC':   { address: '0x41e94Eb019C0762f9BFC4545e35629259441294f', decimals: 6, coingeckoId: 'usd-coin' },
      // Optional POL on Amoy (provide NEXT_PUBLIC_AMOY_POL_ADDRESS)
      ...(process.env.NEXT_PUBLIC_AMOY_POL_ADDRESS ? { 'POL': { address: process.env.NEXT_PUBLIC_AMOY_POL_ADDRESS as string, decimals: 18, coingeckoId: 'polygon-ecosystem-token' } } : {})
    }
  },
  sepolia: {
    chainIdDec: 11155111,
    chainIdHex: SEPOLIA_CHAIN_ID,
    name: 'Ethereum Sepolia',
    alchemyUrl: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY_SEPOLIA}`,
    nativeSymbol: 'ETH',
    wrappedSymbol: 'WETH',
    // Provide a router that exists on Sepolia if you plan to swap via DEX
    routerAddress: process.env.NEXT_PUBLIC_SEPOLIA_ROUTER_ADDRESS || '',
    tokens: {
      // Canonical WETH on Sepolia
      'WETH': { address: '0xfFf9976782D46CC05630D1f6eBAb18B2324d6B14', decimals: 18, coingeckoId: 'weth' },
      // DAI and USDC on Sepolia (env override supported)
      'DAI':  { address: (process.env.NEXT_PUBLIC_SEPOLIA_DAI_ADDRESS as string) || '0x68194a729C2450ad26072b3D33ADaCbcef39D574', decimals: 18, coingeckoId: 'dai' },
      'USDC': { address: (process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS as string) || '0x94a9D9AC8a22534E3FaCa4E4343A41133453d586', decimals: 6, coingeckoId: 'usd-coin' }
    }
  }
} as const;

// Selected at runtime based on connected chain
type NetworkKey = keyof typeof NETWORKS;

export default function Web3Copilot() {
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ message: '', type: '' });
  const [openSection, setOpenSection] = useState<string | null>('overview');
  const [balances, setBalances] = useState<Balances>({});
  const [isBalancesLoading, setIsBalancesLoading] = useState(false);
  const [prices, setPrices] = useState<Prices>({});
  const [networkKey, setNetworkKey] = useState<NetworkKey>('amoy');
  // Launch animation trigger counter
  const [launchId, setLaunchId] = useState<number>(0);

  // Detect connected network and account on mount; subscribe to provider events
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    try {
      const ext = getExternalProvider();
      const provider = new ethers.BrowserProvider(ext);

      // Immediately probe connection without forcing a connect
      (async () => {
        try {
          const accounts = await provider.listAccounts();
          let net;
          try {
            net = await provider.getNetwork();
          } catch (networkError) {
            console.log('Initial network detection error:', networkError);
            // If we can't get network, default to amoy
            setNetworkKey('amoy');
            return;
          }
          
          if (accounts.length > 0) {
            const detectedKey: NetworkKey = Number(net.chainId) === NETWORKS.sepolia.chainIdDec ? 'sepolia' : 'amoy';
            setNetworkKey(detectedKey);
            const detectedSigner = await provider.getSigner();
            const userAddress = await detectedSigner.getAddress();
            setSigner(detectedSigner);
            setAddress(userAddress);
          } else {
            // No account connected: still reflect current network in UI
            const detectedKey: NetworkKey = Number(net.chainId) === NETWORKS.sepolia.chainIdDec ? 'sepolia' : 'amoy';
            setNetworkKey(detectedKey);
          }
        } catch (error) {
          console.log('Initial connection probe error:', error);
          // Default to amoy if we can't detect anything
          setNetworkKey('amoy');
        }
      })();

      const handleChainChanged = async (chainIdHex: unknown) => {
        try {
          // Determine network from chainIdHex to avoid getNetwork() calls during network changes
          const chainId = typeof chainIdHex === 'string' ? parseInt(chainIdHex, 16) : 0;
          const detectedKey: NetworkKey = chainId === NETWORKS.sepolia.chainIdDec ? 'sepolia' : 'amoy';
          setNetworkKey(detectedKey);
          
          // Wait a bit for the network change to settle
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            // Create a fresh provider instance to avoid network change errors
            const freshProvider = new ethers.BrowserProvider(ext);
            const newSigner = await freshProvider.getSigner();
            const userAddress = await newSigner.getAddress();
            setSigner(newSigner);
            setAddress(userAddress);
            await fetchPrices(detectedKey);
            await fetchBalances({ signerOverride: newSigner, addressOverride: userAddress, networkOverride: detectedKey });
          } catch {
            // likely no address selected yet
            setSigner(null);
            setAddress(null);
            await fetchPrices(detectedKey);
          }
        } catch (error) {
          console.log('Network change handling error:', error);
          // Fallback: determine from chainIdHex
          const chainId = typeof chainIdHex === 'string' ? parseInt(chainIdHex, 16) : 0;
          const detectedKey: NetworkKey = chainId === NETWORKS.sepolia.chainIdDec ? 'sepolia' : 'amoy';
          setNetworkKey(detectedKey);
          await fetchPrices(detectedKey);
        }
      };

      const handleAccountsChanged = async (accounts: unknown) => {
        const accountList = accounts as string[];
        if (accountList && accountList.length > 0) {
          const newSigner = await provider.getSigner();
          setSigner(newSigner);
          setAddress(accountList[0]);
          await fetchBalances({ signerOverride: newSigner, addressOverride: accountList[0] });
        } else {
          setSigner(null);
          setAddress(null);
          setBalances({});
        }
      };

      // Subscribe to EIP-1193 events
      (ext as unknown as { on: (event: string, cb: (...args: unknown[]) => void) => void }).on('chainChanged', handleChainChanged);
      (ext as unknown as { on: (event: string, cb: (...args: unknown[]) => void) => void }).on('accountsChanged', handleAccountsChanged);

      cleanup = () => {
        try {
          (ext as unknown as { removeListener: (event: string, cb: (...args: unknown[]) => void) => void }).removeListener('chainChanged', handleChainChanged);
          (ext as unknown as { removeListener: (event: string, cb: (...args: unknown[]) => void) => void }).removeListener('accountsChanged', handleAccountsChanged);
        } catch {}
      };
    } catch {}

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Polygon sparkle burst for connect transition
  const renderPolygonBurst = (keyPrefix: string) => {
    const pieces = 28;
    return (
      <>
        {Array.from({ length: pieces }).map((_, i) => {
          const angle = (i / pieces) * Math.PI * 2 + (Math.random() * 0.6 - 0.3);
          const distance = 240 + Math.random() * 180;
          const dx = Math.cos(angle) * distance;
          const dy = Math.sin(angle) * distance;
          const size = 6 + Math.round(Math.random() * 10);
          const colors = ['#a78bfa', '#7c3aed', '#6366f1', '#60a5fa', '#22d3ee', '#f472b6', '#f59e0b'];
          const color = colors[i % colors.length];
          return (
            <motion.div
              key={`${keyPrefix}-burst-${launchId}-${i}`}
              className="absolute"
              style={{ left: '50%', top: '60%', width: size, height: size }}
              initial={{ x: -size / 2, y: -size / 2, opacity: 1, rotate: 0 }}
              animate={{ x: dx, y: -dy, opacity: [1, 1, 0.8, 0], rotate: 160 + i * 24 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
            >
              <svg width={size} height={size} viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
                <polygon points="5,0 10,3 8,10 2,10 0,3" fill={color} />
              </svg>
            </motion.div>
          );
        })}
      </>
    );
  };

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, x: 40 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 }
  } as const;

  const handleToggleSection = (section: string) => {
    setOpenSection(prev => (prev === section ? null : section));
  };

  // Passive selector used on the connect screen: only updates UI state.
  const selectNetwork = (target: NetworkKey) => {
    setStatus({ message: '', type: '' });
    setNetworkKey(target);
  };

  const switchNetwork = async (target: NetworkKey) => {
    try {
      setStatus({ message: '', type: '' });
      await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORKS[target].chainIdHex }]
      });
      // keep the existing address; just rebind the signer to new provider
      const newProvider = new ethers.BrowserProvider(getExternalProvider());
      const newSigner = await newProvider.getSigner();
      const userAddress = await newSigner.getAddress();
      setSigner(newSigner);
      setAddress(userAddress);
      setNetworkKey(target);
      // Immediately refresh using the new context to avoid stale state
      await fetchPrices(target);
      await fetchBalances({ signerOverride: newSigner, addressOverride: userAddress, networkOverride: target });
    } catch (_e) {
      setStatus({ message: 'Network switch failed or was rejected.', type: 'error' });
    }
  };

  const fetchPrices = async (overrideKey?: NetworkKey) => {
    const effectiveKey = overrideKey ?? networkKey;
    const net = NETWORKS[effectiveKey];
    // Map from symbol to potential coingecko id guesses
    const symbolToId: Record<string, string> = {
      ETH: 'ethereum',
      MATIC: 'matic-network',
      WETH: 'weth',
      WMATIC: 'matic-network',
      DAI: 'dai',
      USDC: 'usd-coin',
      LINK: 'chainlink',
      POL: 'polygon-ecosystem-token'
    };

    const allSymbols = new Set<string>([net.nativeSymbol, ...Object.keys(balances)]);
    const ids = Array.from(allSymbols)
      .map(s => symbolToId[s.toUpperCase()])
      .filter(Boolean);
    if (ids.length === 0) return;

    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${Array.from(new Set(ids)).join(',')}&vs_currencies=usd`);
      const data = await response.json();
      const newPrices: Prices = {};
      Array.from(allSymbols).forEach(sym => {
        const id = symbolToId[sym.toUpperCase()];
        if (id && data[id]?.usd) newPrices[sym.toUpperCase()] = data[id].usd;
      });
      setPrices(newPrices);
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  };

  const connectWallet = async () => {
    setStatus({ message: '', type: '' });
    // fire rocket animation immediately
    setLaunchId(prev => prev + 1);
    
    if (typeof (window as unknown as { ethereum?: unknown }).ethereum === 'undefined') {
      setStatus({ message: 'MetaMask is not installed! Please install MetaMask extension.', type: 'error' });
      return;
    }

    try {
      const web3Provider = new ethers.BrowserProvider(getExternalProvider());
      
      // Request account access
      await web3Provider.send("eth_requestAccounts", []);
      
      // Get current network
      const { chainId } = await web3Provider.getNetwork();
      const currentChainId = Number(chainId);
      
      // Check if we need to switch networks
      const desired = NETWORKS[networkKey];
      if (currentChainId !== desired.chainIdDec) {
        try {
          await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: desired.chainIdHex }]
          });
        } catch (switchError: unknown) {
          const err = switchError as { code?: number; message?: string };
          if (err.code === 4902) {
            // Network not added to MetaMask, try to add it
            try {
              await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: desired.chainIdHex,
                  chainName: desired.name,
                  rpcUrls: [desired.alchemyUrl],
                  nativeCurrency: {
                    name: desired.nativeSymbol,
                    symbol: desired.nativeSymbol,
                    decimals: 18
                  }
                }]
              });
            } catch {
              setStatus({ message: `Failed to add ${desired.name} network to MetaMask. Please add it manually.`, type: 'error' });
              return;
            }
          } else {
            setStatus({ message: `Failed to switch to ${desired.name}. Please switch manually in MetaMask.`, type: 'error' });
            return;
          }
        }
      }

      // Get final network after potential switch
      const finalNetwork = await web3Provider.getNetwork();
      const detectedKey: NetworkKey = Number(finalNetwork.chainId) === NETWORKS.sepolia.chainIdDec ? 'sepolia' : 'amoy';
      setNetworkKey(detectedKey);

      // Get signer and address
      const web3Signer = await web3Provider.getSigner();
      const userAddress = await web3Signer.getAddress();
      setSigner(web3Signer);
      setAddress(userAddress);
      
      setStatus({ message: 'Wallet connected successfully!', type: 'success' });
    } catch (error: unknown) {
      console.error('Connection error:', error);
      const err = error as { code?: number; message?: string };
      
      if (err.code === 4001) {
        setStatus({ message: 'Connection rejected by user. Please try again.', type: 'error' });
      } else if (err.message?.includes('User rejected')) {
        setStatus({ message: 'Connection rejected by user. Please try again.', type: 'error' });
      } else {
        setStatus({ message: `Connection failed: ${err.message || 'Unknown error'}. Please try again.`, type: 'error' });
      }
    }
  };

  const fetchBalances = async (opts?: { signerOverride?: ethers.Signer; addressOverride?: string; networkOverride?: NetworkKey }) => {
    const effectiveSigner = opts?.signerOverride ?? signer;
    const effectiveAddress = opts?.addressOverride ?? address;
    const effectiveKey = opts?.networkOverride ?? networkKey;
    if (!effectiveAddress || !effectiveSigner) return;
    
    setIsBalancesLoading(true);
    setStatus({ message: '', type: '' });

    try {
      const net = NETWORKS[effectiveKey];
      const newBalances: Balances = {};

      // Get native balance
      const provider = effectiveSigner.provider;
      if (!provider) throw new Error('No provider available');
      const nativeBalanceWei = await provider.getBalance(effectiveAddress);
      newBalances[net.nativeSymbol] = parseFloat(ethers.formatEther(nativeBalanceWei)).toFixed(4);

      // 1) Discover all token balances (all ERC20s) for the address
      const tbResponse = await fetch(net.alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [effectiveAddress, 'erc20']
        })
      });
      if (!tbResponse.ok) {
        const errorText = await tbResponse.text();
        throw new Error(`Alchemy ${tbResponse.status} ${tbResponse.statusText} on ${net.name}: ${errorText}`);
      }
      const tbData = await tbResponse.json();
      if (tbData.error) throw new Error(`Alchemy RPC error on ${net.name}: ${tbData.error.message}`);
      const tokenData: AlchemyTokenBalance[] = tbData.result.tokenBalances as AlchemyTokenBalance[];

      // 2) Fetch metadata for discovered contracts to get symbol/decimals
      const contracts = tokenData
        .map(t => t.contractAddress)
        .filter(Boolean) as string[];
      const metaResponse = await fetch(net.alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 2,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenMetadata',
          params: contracts.map(addr => ({ contractAddress: addr }))
        })
      });
      // Some Alchemy deployments do not support batch metadata; fall back to sequential if needed
      let metadataItems: AlchemyTokenMetadataItem[] = [];
      if (metaResponse.ok) {
        try {
          const metaData = await metaResponse.json();
          // If batch shape, normalize; if not, handle below
          if (Array.isArray(metaData.result)) {
            metadataItems = metaData.result as AlchemyTokenMetadataItem[];
          }
        } catch {}
      }
      if (metadataItems.length === 0) {
        // Fallback: call one-by-one (limited count to avoid rate issues)
        metadataItems = [];
        for (const addr of contracts.slice(0, 50)) {
          const r = await fetch(net.alchemyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: 3,
              jsonrpc: '2.0',
              method: 'alchemy_getTokenMetadata',
              params: [{ contractAddress: addr }]
            })
          });
          if (!r.ok) continue;
          const j = await r.json();
          if (j && j.result) metadataItems.push({ ...j.result, contractAddress: addr });
        }
      }

      const addressToMeta = new Map<string, { symbol: string; decimals: number }>();
      // Seed with known network tokens as a fallback when metadata is missing
      Object.entries(NETWORKS[effectiveKey].tokens).forEach(([symbol, cfg]) => {
        addressToMeta.set(cfg.address.toLowerCase(), { symbol, decimals: (cfg as TokenConfig).decimals });
      });
      metadataItems.forEach(m => {
        if (!m || !m.contractAddress) return;
        const symbol = (m.symbol || '').trim();
        const decimals = typeof m.decimals === 'number' ? m.decimals : 18;
        if (symbol) addressToMeta.set(m.contractAddress.toLowerCase(), { symbol, decimals });
      });

      // For tokens with balances but missing metadata, fetch on-chain ERC20 symbol/decimals
      const providerForChain = effectiveSigner.provider ?? new ethers.BrowserProvider(getExternalProvider());
      const erc20Abi = [
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
      ];

      for (const t of tokenData.slice(0, 60)) {
        if (!t.tokenBalance || !t.contractAddress) continue;
        const addrLower = t.contractAddress.toLowerCase();
        if (!addressToMeta.has(addrLower)) {
          try {
            const c = new ethers.Contract(t.contractAddress, erc20Abi, providerForChain);
            const [sym, dec] = await Promise.all([
              c.symbol().catch(() => ''),
              c.decimals().catch(() => 18)
            ]);
            const symbol = (typeof sym === 'string' ? sym : '').trim();
            const decimals = typeof dec === 'number' ? dec : 18;
            if (symbol) addressToMeta.set(addrLower, { symbol, decimals });
          } catch {}
        }
      }

      tokenData.forEach((t) => {
        if (!t.tokenBalance || !t.contractAddress) return;
        const meta = addressToMeta.get(t.contractAddress.toLowerCase());
        if (!meta) return;
        try {
          const balance = ethers.formatUnits(t.tokenBalance, meta.decimals);
          // Avoid overriding native symbol
          if (meta.symbol && meta.symbol.toUpperCase() !== net.nativeSymbol.toUpperCase()) {
            newBalances[meta.symbol.toUpperCase()] = parseFloat(balance).toFixed(4);
          }
        } catch {}
      });

      // Only show tokens with actual balances or native token - no false zero balances

      setBalances(newBalances);
    } catch (error) {
      console.error('Failed to fetch balances from Alchemy:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus({ message: `Could not fetch balances. ${message}`, type: 'error' });
    } finally {
      setIsBalancesLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchPrices();
  }, [networkKey]);

  useEffect(() => {
    if (!signer || !address) return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchBalances();
  }, [signer, address, networkKey]);

  // Background polling removed - balances will only refresh on user actions

  return (
    <AnimatePresence mode="wait">
      {!address ? (
        <motion.div
          key="connect"
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <ConnectBackground />
          {/* Polygon sparkle burst on connect */}
          <AnimatePresence>
            {launchId > 0 && (
              <motion.div
                key={launchId}
                className="fixed inset-0 pointer-events-none z-[999]"
                initial={{ opacity: 1 }}
                animate={{ opacity: [1, 1, 0.8, 0] }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
              >
                {renderPolygonBurst('connect')}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="neon-card connect-container p-6">
            <div className="flex flex-col items-center mb-4">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold text-center text-cyan-200">Web3 Copilot</h1>
                <motion.div
                  key={`rocket-idle-${launchId}`}
                  initial={{ y: 0, rotate: 0 }}
                  animate={launchId > 0 ? { y: ['0vh','-30vh','-120vh'], rotate: [0,2,4] } : { y: [0,-2,0,2,0], rotate: [0,1,-1,0] }}
                  transition={launchId > 0 ? { duration: 1.8, ease: 'easeIn' } : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="relative">
                    {/* rocket body */}
                    <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 3c4.5 1.5 8 6.4 8 11.9 0 2.2-.6 4.3-1.7 6.1l-6.3 3.5-6.3-3.5C8.6 19.2 8 17.1 8 14.9 8 9.4 11.5 4.5 16 3z" fill="#ef4444"/>
                      <path d="M16 10.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7z" fill="#93c5fd"/>
                      <path d="M12.5 23l-2.2 3.6c-.2.3.1.7.5.6l3.8-1.3L16 29l1.4-3.1 3.8 1.3c.4.1.7-.3.5-.6L19.5 23H12.5z" fill="#9ca3af"/>
                      <path d="M11 9L7 7 5 11l4 1" fill="#f87171"/>
                      <path d="M21 9l4-2 2 4-4 1" fill="#f87171"/>
                    </svg>
                    {/* flame when launching */}
                    <AnimatePresence>
                      {launchId > 0 && (
                        <motion.div
                          className="absolute left-1/2 -translate-x-1/2 w-3 h-10 rounded-full"
                          style={{ bottom: '-18px', background: 'linear-gradient(180deg, rgba(255,200,0,1), rgba(255,140,0,0))' }}
                          initial={{ opacity: 0.9, scaleY: 0.6 }}
                          animate={{ opacity: [0.9,0.7,0.4], scaleY: [0.6,1.2,0.8] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
              <p className="mt-2 text-center text-gray-200 font-medium">Ready to know your portfolio insight with our copilot?</p>
            </div>
            {/* Quick network pick icons */}
            <div className="flex justify-center gap-4 mb-4">
              <button
                aria-label="Switch to Ethereum Sepolia"
                onClick={() => selectNetwork('sepolia')}
                className={`relative w-14 h-14 rounded-xl neon-control flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 ${networkKey === 'sepolia' ? 'ring-2 ring-blue-400' : ''}`}
              >
                <svg viewBox="0 0 32 32" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="16,2 6,16 16,12 26,16" fill="#6366f1"/>
                  <polygon points="16,30 6,18 16,22 26,18" fill="#818cf8"/>
                </svg>
              </button>
              <button
                aria-label="Switch to Polygon Amoy"
                onClick={() => selectNetwork('amoy')}
                className={`relative w-14 h-14 rounded-xl neon-control flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 ${networkKey === 'amoy' ? 'ring-2 ring-purple-400' : ''}`}
              >
                <svg viewBox="0 0 32 32" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 10 L16 6 L22 10 L22 18 L16 22 L10 18 Z" fill="#7c3aed"/>
                </svg>
              </button>
            </div>
            {/* Fallback select for additional networks */}
            <div className="flex justify-center gap-3 mb-2">
              <select
                className="neon-control rounded px-3 py-2"
                value={networkKey}
                onChange={(e) => selectNetwork(e.target.value as NetworkKey)}
              >
                <option value="amoy">Polygon Amoy</option>
                <option value="sepolia">Ethereum Sepolia</option>
              </select>
            </div>
            
            {/* Network configuration help */}
            <div className="text-center text-sm text-gray-300 mb-4">
              <p>If connection fails, make sure you have the correct network added to MetaMask:</p>
              <div className="mt-2 space-y-1">
                <p><strong>Ethereum Sepolia:</strong> Chain ID 11155111</p>
                <p><strong>Polygon Amoy:</strong> Chain ID 80002</p>
              </div>
            </div>
            <motion.button
              whileHover={{ y: -2, boxShadow: '6px 6px 0 #000' }}
              whileTap={{ y: 0, boxShadow: '2px 2px 0 #000' }}
              onClick={connectWallet}
              className="relative connect-btn w-full py-4 px-6 rounded-lg border-4 border-black bg-yellow-400 text-black font-bold text-lg cursor-pointer transition-colors duration-200"
            >
              <span className="relative z-10">Connect Wallet</span>
              <span
                className="pointer-events-none absolute inset-0 rounded-md"
                style={{
                  boxShadow: '0 0 20px rgba(250, 204, 21, 0.6), inset 0 0 12px rgba(234, 179, 8, 0.35)'
                }}
              />
            </motion.button>
            {status.message && (
              <div className={`status-msg text-center p-3 rounded-lg mb-4 font-bold border-4 border-black ${
                status.type === 'error' ? 'bg-red-400 text-black' : 'bg-green-400 text-black'
              }`}>
                {status.message}
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="app"
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <BackgroundAnimation />
          {/* Top marquee header */}
          <div className="mx-auto max-w-6xl mt-2 mb-4">
            <div className="overflow-hidden rounded-lg glass-header text-cyan-300">
              <motion.div
                className="whitespace-nowrap py-2 px-4 font-bold text-xl tracking-wide"
                initial={{ x: 0 }}
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              >
                <span className="mx-10">Web3 Copilot 🚀</span>
                <span className="mx-10">Your AI wallet copilot</span>
                <span className="mx-10">Secure • Non-custodial • On-chain</span>
                <span className="mx-10">Swap • Portfolio • Assistant</span>
                <span className="mx-10">Web3 Copilot 🚀</span>
                <span className="mx-10">Your AI wallet copilot</span>
              </motion.div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl grid grid-cols-12 gap-6 px-2">
            {/* Left sidebar: networks */}
            <aside className="col-span-12 md:col-span-3">
              <div className="neon-card text-white p-4">
                <div className="text-lg font-bold mb-3">Networks</div>
                <details className="group">
                  <summary className="cursor-pointer select-none neon-control px-3 py-2 flex items-center justify-between">
                    <span>Select network</span>
                    <span className="transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button onClick={() => switchNetwork('sepolia')} className={`neon-control py-2 font-bold ${networkKey==='sepolia'?'ring-2 ring-blue-400':''}`}>
                      Sepolia
                    </button>
                    <button onClick={() => switchNetwork('amoy')} className={`neon-control py-2 font-bold ${networkKey==='amoy'?'ring-2 ring-purple-400':''}`}>
                      Amoy
                    </button>
                  </div>
                </details>
              </div>
            </aside>

            {/* Main content cards */}
            <div className="col-span-12 md:col-span-9">
              <div className="neon-card p-6">
                <h1 className="text-3xl font-bold mb-4 text-cyan-200">Web3 Copilot 🚀</h1>
            {status.message && (
              <div className={`status-msg text-center p-3 rounded-lg mb-4 font-bold border-4 border-black ${
                status.type === 'error' ? 'bg-red-400 text-black' : 'bg-green-400 text-black'
              }`}>
                {status.message}
              </div>
            )}

            <PortfolioOverview
              isOpen={openSection === 'overview'}
              onToggle={() => handleToggleSection('overview')}
              balances={balances}
              isBalancesLoading={isBalancesLoading}
              prices={prices}
              nativeSymbol={NETWORKS[networkKey].nativeSymbol}
              tokens={NETWORKS[networkKey].tokens}
            />

            <AIAssistant
              isOpen={openSection === 'ai'}
              onToggle={() => handleToggleSection('ai')}
              balances={balances}
              geminiApiUrl={GEMINI_API_URL}
              networkName={NETWORKS[networkKey].name}
            />

            <TokenSwap
              isOpen={openSection === 'swap'}
              onToggle={() => handleToggleSection('swap')}
              signer={signer}
              address={address}
              balances={balances}
              prices={prices}
              tokens={NETWORKS[networkKey].tokens}
              nativeSymbol={NETWORKS[networkKey].nativeSymbol}
              wrappedSymbol={NETWORKS[networkKey].wrappedSymbol}
              uniswapRouterAddress={NETWORKS[networkKey].routerAddress}
              onStatusChange={setStatus}
              onBalancesRefresh={fetchBalances}
            />

            <MockSwap
              isOpen={openSection === 'mockswap'}
              onToggle={() => handleToggleSection('mockswap')}
              signer={signer}
              address={address}
              onStatusChange={setStatus}
            />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

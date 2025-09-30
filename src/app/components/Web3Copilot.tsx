'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import BackgroundAnimation from './BackgroundAnimation';
import ConnectBackground from './ConnectBackground';
import PortfolioOverview from './PortfolioOverview';
import AIAssistant from './AIAssistant';
import TokenSwap from './TokenSwap';

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

// Narrow and return an EIP-1193 external provider for ethers.js
const getExternalProvider = (): ethers.providers.ExternalProvider => {
  const maybeWindow = window as unknown as { ethereum?: unknown };
  if (!maybeWindow.ethereum || typeof maybeWindow.ethereum !== 'object') {
    throw new Error('No injected Ethereum provider found');
  }
  return maybeWindow.ethereum as ethers.providers.ExternalProvider;
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
      'WMATIC': { address: '0x833bf555ad7201dba33d4a5aea88c179468ca424', decimals: 18, coingeckoId: 'matic-network' },
      'WETH':   { address: '0x6e7655b7b12128526569b1348b8959d2a4501a3f', decimals: 18, coingeckoId: 'weth' },
      'DAI':    { address: '0x6c4495e55c1e96a40a233c467e0824b077ad17c6', decimals: 18, coingeckoId: 'dai' },
      'USDC':   { address: '0x99505f251a18671198a6dd69c8a98075fc5e941b', decimals: 6, coingeckoId: 'usd-coin' },
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
      'WETH': { address: '0xdd13E55209Fd76AfE204dBda4007C227904f0a81', decimals: 18, coingeckoId: 'weth' }
      // Add more ERC-20s on Sepolia as needed
    }
  }
} as const;

// Selected at runtime based on connected chain
type NetworkKey = keyof typeof NETWORKS;

export default function Web3Copilot() {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ message: '', type: '' });
  const [openSection, setOpenSection] = useState<string | null>('overview');
  const [balances, setBalances] = useState<Balances>({});
  const [isBalancesLoading, setIsBalancesLoading] = useState(false);
  const [prices, setPrices] = useState<Prices>({});
  const [networkKey, setNetworkKey] = useState<NetworkKey>('amoy');
  // Launch animation trigger counter
  const [launchId, setLaunchId] = useState<number>(0);

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
      const newProvider = new ethers.providers.Web3Provider(getExternalProvider(), 'any');
      const newSigner = newProvider.getSigner();
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
    const tokenIds = Array.from(new Set([
      net.nativeSymbol === 'MATIC' ? 'matic-network' : 'ethereum',
      ...Object.values(net.tokens).map(t => t.coingeckoId)
    ]));
    const ids = tokenIds.join(',');
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      const data = await response.json();
      const newPrices: Prices = {};
      // Native symbol
      if (net.nativeSymbol === 'MATIC') newPrices['MATIC'] = data['matic-network']?.usd;
      if (net.nativeSymbol === 'ETH') newPrices['ETH'] = data['ethereum']?.usd;
      // ERC20s
      Object.entries(net.tokens).forEach(([symbol, info]) => {
        newPrices[symbol] = data[info.coingeckoId]?.usd;
      });
      setPrices(newPrices);
    } catch (error) {
      console.error("Failed to fetch prices:", error);
    }
  };

  const connectWallet = async () => {
    setStatus({ message: '', type: '' });
    // fire rocket animation immediately
    setLaunchId(prev => prev + 1);
    if (typeof (window as unknown as { ethereum?: unknown }).ethereum === 'undefined') {
      setStatus({ message: 'MetaMask is not installed!', type: 'error' });
      return;
    }

    try {
      const web3Provider = new ethers.providers.Web3Provider(getExternalProvider(), 'any');
      await web3Provider.send("eth_requestAccounts", []);
      const { chainId } = await web3Provider.getNetwork();
      // Ensure we are on the user-selected network
      const desired = NETWORKS[networkKey];
      if (chainId !== desired.chainIdDec) {
        await (getExternalProvider() as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: desired.chainIdHex }]
        });
      }

      const finalNetwork = await web3Provider.getNetwork();
      const detectedKey: NetworkKey = finalNetwork.chainId === NETWORKS.sepolia.chainIdDec ? 'sepolia' : 'amoy';
      setNetworkKey(detectedKey);

      const web3Signer = web3Provider.getSigner();
      const userAddress = await web3Signer.getAddress();
      setSigner(web3Signer);
      setAddress(userAddress);
    } catch (_e) {
      setStatus({ message: 'Wallet connection rejected or failed.', type: 'error' });
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
      const nativeBalanceWei = await effectiveSigner.getBalance();
      newBalances[net.nativeSymbol] = parseFloat(ethers.utils.formatEther(nativeBalanceWei)).toFixed(4);

      // Get token balances from Alchemy
      const alchemyRequestBody = {
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [effectiveAddress, Object.values(net.tokens).map(t => t.address)]
      };

      const response = await fetch(net.alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alchemyRequestBody)
      });

      // Alchemy returns non-2xx for invalid keys or insufficient permissions.
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Alchemy ${response.status} ${response.statusText} on ${net.name}: ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`Alchemy RPC error on ${net.name}: ${data.error.message}`);
      }

      const tokenData: AlchemyTokenBalance[] = data.result.tokenBalances as AlchemyTokenBalance[];
      const tokenSymbolMap: Record<string, { symbol: string } & TokenConfig> = Object.entries(net.tokens).reduce(
        (acc, [symbol, token]) => {
          acc[token.address.toLowerCase()] = { symbol, ...(token as TokenConfig) };
          return acc;
        },
        {} as Record<string, { symbol: string } & TokenConfig>
      );

      tokenData.forEach((tokenItem) => {
        const tokenInfo = tokenSymbolMap[tokenItem.contractAddress.toLowerCase()];
        if (tokenInfo && tokenItem.tokenBalance) {
          const balance = ethers.utils.formatUnits(tokenItem.tokenBalance, tokenInfo.decimals);
          newBalances[tokenInfo.symbol] = parseFloat(balance).toFixed(4);
        }
      });

      // Set zero balances for tokens not found
      Object.keys(net.tokens).forEach(symbol => {
        if (!newBalances[symbol]) newBalances[symbol] = "0.0000";
      });

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
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

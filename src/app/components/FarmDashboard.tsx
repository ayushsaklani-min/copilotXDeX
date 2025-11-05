'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import contractsJson from '@/config/contracts.json';
import { useReputation } from '@/hooks/useReputation';
import { useFarming } from '@/hooks/useFarming';
import { usePrices } from '@/hooks/usePrices';

interface FarmContracts {
  chainId: number;
  farmAddress?: string;
  pairs: Array<{ name: string; lpToken: string }>;
}

const contracts = contractsJson as FarmContracts;
const FARM_ADDRESS = contracts.farmAddress;
const POOL_NAME_MAP: Record<string, string> = Object.fromEntries(
  contracts.pairs.map((pair) => [pair.lpToken.toLowerCase(), pair.name])
);

interface TxStatus {
  message: string;
  type: 'info' | 'success' | 'error';
}

interface FarmDashboardProps {
  standalone?: boolean;
  signerOverride?: ethers.JsonRpcSigner | null;
  addressOverride?: string | null;
  networkOkOverride?: boolean;
}

export default function FarmDashboard({
  standalone = true,
  signerOverride,
  addressOverride,
  networkOkOverride,
}: FarmDashboardProps) {
  const [internalSigner, setInternalSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [internalAddress, setInternalAddress] = useState<string | null>(null);
  const [internalNetworkOk, setInternalNetworkOk] = useState(false);
  const [activePool, setActivePool] = useState(0);
  const [stakeAmount, setStakeAmount] = useState('');
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);

  const signer = signerOverride ?? internalSigner;
  const address = addressOverride ?? internalAddress;
  const isCorrectNetwork = networkOkOverride ?? internalNetworkOk;

  const { score: reputationScore } = useReputation(signer, address ?? undefined);
  const { prices } = usePrices(signer);

  const {
    pools,
    userInfo,
    isLoading,
    error: farmError,
    deposit,
    withdraw,
    harvest,
    compound,
    refreshData,
  } = useFarming(signer, address, FARM_ADDRESS ?? ethers.ZeroAddress, POOL_NAME_MAP);

  useEffect(() => {
    if (signerOverride !== undefined || addressOverride !== undefined || networkOkOverride !== undefined) {
      return;
    }

    const init = async () => {
      if (typeof window === 'undefined') return;
      const { ethereum } = window as unknown as { ethereum?: ethers.Eip1193Provider };
      if (!ethereum) return;

      const provider = new ethers.BrowserProvider(ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) return;

      const nextSigner = await provider.getSigner();
      const nextAddress = await nextSigner.getAddress();
      const network = await provider.getNetwork();

      setInternalSigner(nextSigner);
      setInternalAddress(nextAddress);
      setInternalNetworkOk(Number(network.chainId) === contracts.chainId);
    };

    void init();
  }, [signerOverride, addressOverride, networkOkOverride]);

  useEffect(() => {
    if (!signer || !address || !FARM_ADDRESS) return;
    refreshData();
    const id = setInterval(() => refreshData(), 30000);
    return () => clearInterval(id);
  }, [signer, address, refreshData]);

  const activePoolInfo = useMemo(() => pools.find((p) => p.pid === activePool), [pools, activePool]);
  const activeUserInfo = userInfo[activePool] ?? {
    stakedAmount: '0',
    pendingRewards: '0',
    totalEarned: '0',
    reputationMultiplier: 1,
  };

  const handleTx = async (action: 'stake' | 'withdraw' | 'harvest' | 'compound') => {
    try {
      if (!signer || !address || !FARM_ADDRESS) {
        setTxStatus({ message: 'Connect wallet on Polygon Amoy to interact with the farm.', type: 'error' });
        return;
      }

      if (!isCorrectNetwork) {
        setTxStatus({ message: 'Please switch MetaMask to Polygon Amoy testnet.', type: 'error' });
        return;
      }

      setTxStatus({ message: 'Submitting transaction…', type: 'info' });

      let txHash: string | null = null;
      switch (action) {
        case 'stake':
          if (!stakeAmount || Number(stakeAmount) <= 0) {
            setTxStatus({ message: 'Enter an amount greater than zero.', type: 'error' });
            return;
          }
          txHash = await deposit(activePool, stakeAmount);
          break;
        case 'withdraw':
          if (!stakeAmount || Number(stakeAmount) <= 0) {
            setTxStatus({ message: 'Enter an amount greater than zero.', type: 'error' });
            return;
          }
          txHash = await withdraw(activePool, stakeAmount);
          break;
        case 'harvest':
          txHash = await harvest(activePool);
          break;
        case 'compound':
          txHash = await compound(activePool);
          break;
      }

      if (txHash) {
        setTxStatus({ message: `Transaction confirmed: ${txHash.slice(0, 10)}…`, type: 'success' });
        setStakeAmount('');
      } else {
        setTxStatus({ message: 'Transaction failed or was rejected.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setTxStatus({ message: err instanceof Error ? err.message : 'Transaction failed', type: 'error' });
    }
  };

  const tvlUSD = pools.reduce((sum, pool) => {
    const price = prices[pool.name] ?? 1;
    return sum + Number(pool.totalStaked) * price;
  }, 0);

  const renderNotConfigured = () => (
    <div className="rounded-xl border border-cyan-500/30 bg-black/30 p-6 text-center text-sm text-gray-300">
      Liquidity farm contract address is not configured. Deploy `LiquidityFarm.sol` and update `farmAddress` in `src/config/contracts.json`.
    </div>
  );

  if (!FARM_ADDRESS) {
    return standalone ? (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center text-white px-6">
        <div className="max-w-xl text-center space-y-4">
          <h1 className="text-4xl font-bold">Liquidity Farm Not Configured</h1>
          <p className="text-gray-300">Deploy the farming smart contract and set `farmAddress` in `src/config/contracts.json`.</p>
          <Link href="/dex" className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold">Back to DEX</Link>
        </div>
      </div>
    ) : renderNotConfigured();
  }

  const renderConnectMessage = (message: string) => (
    <div className="rounded-xl border border-cyan-500/30 bg-black/30 p-6 text-center text-sm text-gray-300">
      {message}
    </div>
  );

  if (!signer) {
    return standalone ? (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center text-white px-6">
        <div className="max-w-xl text-center space-y-4">
          <h1 className="text-4xl font-bold">Connect Wallet</h1>
          <p className="text-gray-300">Connect MetaMask on Polygon Amoy testnet to access farming.</p>
          <Link href="/" className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold">Back to Portfolio</Link>
        </div>
      </div>
    ) : renderConnectMessage('Connect your wallet on Polygon Amoy to view farming data.');
  }

  const mainContent = (
    <div className="space-y-8">
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-black/30 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Total Value Locked</h2>
            <div className="text-3xl font-bold text-cyan-300">${tvlUSD.toFixed(2)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400">Pools</div>
              <div className="text-lg font-semibold">{pools.length}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400">Pending Rewards</div>
              <div className="text-lg font-semibold">{Number(activeUserInfo.pendingRewards).toFixed(4)} TIK</div>
            </div>
          </div>
          <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/30 text-sm">
            <div className="font-semibold text-cyan-300">Reputation Bonus</div>
            <p className="text-gray-300">
              Current multiplier: {(activeUserInfo.reputationMultiplier ?? 1).toFixed(2)}x · Higher XP tiers earn more rewards automatically.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-black/30 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pools</h2>
            <button
              onClick={() => refreshData()}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-400 py-10">Loading pool data…</div>
          ) : pools.length === 0 ? (
            <div className="text-center text-gray-400 py-10">No pools configured. Deploy the farm smart contract.</div>
          ) : (
            <div className="space-y-3">
              {pools.map((pool) => {
                const isActive = pool.pid === activePool;
                const user = userInfo[pool.pid];
                return (
                  <button
                    key={pool.pid}
                    onClick={() => setActivePool(pool.pid)}
                    className={`w-full text-left p-4 rounded-xl border transition ${
                      isActive
                        ? 'border-cyan-500/60 bg-cyan-500/10 shadow-lg'
                        : 'border-cyan-500/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{pool.name}</h3>
                        <p className="text-sm text-gray-300">APR: {pool.apr.toFixed(2)}%</p>
                      </div>
                      <div className="text-right text-sm text-gray-300">
                        <div>Staked: {Number(pool.totalStaked).toFixed(2)} LP</div>
                        <div>Your stake: {user ? Number(user.stakedAmount).toFixed(4) : '0.0000'} LP</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {activePoolInfo && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2 bg-black/30 border border-cyan-500/30 rounded-2xl p-6 space-y-5">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{activePoolInfo.name}</h2>
                <p className="text-sm text-gray-300">Stake LP tokens to earn auto-compounding TIK rewards.</p>
              </div>
              <div className="bg-white/5 rounded-lg px-3 py-1 text-sm text-gray-200">
                APR: {activePoolInfo.apr.toFixed(2)}%
              </div>
            </header>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-xs text-gray-400">Your Staked LP</div>
                <div className="text-xl font-semibold text-white">{Number(activeUserInfo.stakedAmount).toFixed(4)} LP</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-xs text-gray-400">Pending Rewards</div>
                <div className="text-xl font-semibold text-white">{Number(activeUserInfo.pendingRewards).toFixed(4)} TIK</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-xs text-gray-400">Total Earned</div>
                <div className="text-xl font-semibold text-white">{Number(activeUserInfo.totalEarned).toFixed(4)} TIK</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-xs text-gray-400">Reputation Multiplier</div>
                <div className="text-xl font-semibold text-white">{activeUserInfo.reputationMultiplier.toFixed(2)}x</div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Amount</label>
                  <input
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full mt-1 bg-black/30 border border-cyan-500/40 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                    type="number"
                    min="0"
                    step="0.0001"
                  />
                </div>
                <button
                  onClick={() => setStakeAmount(activeUserInfo.stakedAmount ? Number(activeUserInfo.stakedAmount).toString() : '0')}
                  className="px-4 py-2 mt-6 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-sm"
                >
                  MAX
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <button
                  onClick={() => handleTx('stake')}
                  className="py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold"
                >
                  Stake
                </button>
                <button
                  onClick={() => handleTx('withdraw')}
                  className="py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold"
                >
                  Unstake
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <button
                  onClick={() => handleTx('harvest')}
                  className="py-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold"
                >
                  Harvest
                </button>
                <button
                  onClick={() => handleTx('compound')}
                  className="py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-semibold"
                >
                  Auto-compound
                </button>
              </div>

              {txStatus && (
                <div className={`text-sm rounded-lg px-3 py-2 border ${
                  txStatus.type === 'success'
                    ? 'bg-green-500/20 border-green-500/40 text-green-200'
                    : txStatus.type === 'error'
                    ? 'bg-red-500/20 border-red-500/40 text-red-200'
                    : 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                }`}>
                  {txStatus.message}
                </div>
              )}

              {farmError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {farmError}
                </div>
              )}
            </div>
          </div>

          <aside className="bg-black/30 border border-cyan-500/30 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-lg font-semibold mb-2">How It Works</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Stake LP tokens to earn TIK block rewards.</li>
                <li>• XP boosts your effective APR (Bronze→Diamond tiers).</li>
                <li>• Harvest to claim rewards or auto-compound for passive growth.</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-cyan-500/20 rounded-lg p-4 text-sm text-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span>Bronze</span>
                <span>1.00x</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Silver (50 XP)</span>
                <span>1.15x</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Gold (100 XP)</span>
                <span>1.30x</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Diamond (500 XP)</span>
                <span>1.50x</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 text-sm text-gray-300">
              <p className="font-semibold mb-2 text-white">Gas Tips</p>
              <p className="mb-3">Approvals happen automatically if allowances are insufficient. All transactions run against the configured farm contract on Polygon Amoy.</p>
              <div className="text-xs text-gray-500 break-all">
                Contract address: <a className="text-cyan-300 hover:text-cyan-200" href={`https://amoy.polygonscan.com/address/${FARM_ADDRESS}`} target="_blank" rel="noreferrer">{FARM_ADDRESS}</a>
              </div>
            </div>
          </aside>
        </section>
      )}
    </div>
  );

  if (!standalone) {
    return mainContent;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <header className="border-b border-cyan-500/20 bg-black/30">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">TikTakDex Farming</h1>
            <p className="text-sm text-gray-300">Stake LP tokens to earn TIK rewards. Reputation boosts your yield.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Connected</div>
            <div className="font-mono">{address?.slice(0, 6)}…{address?.slice(-4)}</div>
            <div className="text-xs text-cyan-300">Reputation: {reputationScore} XP</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {mainContent}
      </main>
    </div>
  );
}


'use client';

import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useTokenFactory, type CreatedToken } from '../../../hooks/useTokenFactory';
import { useReputation } from '../../../hooks/useReputation';
import { REPUTATION_ABI, REPUTATION_ADDRESS } from '../../../constants/reputation';
import { motion, AnimatePresence } from 'framer-motion';

export default function TokensPage() {
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [tokens, setTokens] = useState<CreatedToken[]>([]);
  const [form, setForm] = useState({ name: '', symbol: '', supply: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'achievements'>('tokens');

  useEffect(() => {
    const getSigner = async () => {
      if (typeof window === 'undefined' || !(window as any).ethereum) return;
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        setSigner(signer);
        setAddress(await signer.getAddress());
      } catch {}
    };
    getSigner();
  }, []);

  const { createToken } = useTokenFactory(signer as unknown as ethers.Signer | null);

  const { score } = useReputation(signer as unknown as ethers.Signer | null, address || undefined);

  const provider = useMemo(() => {
    try {
      return signer?.provider ?? (typeof window !== 'undefined' && (window as any).ethereum ? new ethers.BrowserProvider((window as any).ethereum) : null);
    } catch {
      return null;
    }
  }, [signer]);

  const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)'
  ];

  const fetchTokenDetails = async (addr: string): Promise<CreatedToken | null> => {
    try {
      if (!provider) return null;
      const p = (provider as any).getSigner ? await (provider as ethers.BrowserProvider).getSigner() : signer;
      const cprov = p ? p : provider;
      const contract = new ethers.Contract(addr, ERC20_ABI, cprov as any);
      const [name, symbol, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.totalSupply(),
      ]);
      return {
        address: addr,
        name,
        symbol,
        supply: ethers.formatUnits(totalSupply, 18),
      };
    } catch {
      return null;
    }
  };

  // Load previously created tokens from localStorage and enrich with on-chain details
  useEffect(() => {
    const load = async () => {
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('createdTokens') : null;
        if (!raw) return;
        const addresses: string[] = JSON.parse(raw);
        const details: CreatedToken[] = [];
        for (const addr of addresses) {
          const info = await fetchTokenDetails(addr);
          if (info) details.push(info);
        }
        if (details.length > 0) setTokens(details);
      } catch {}
    };
    load();
  }, [provider]);

  const handleCreate = async () => {
    if (!form.name || !form.symbol || !form.supply) return;
    setLoading(true);
    try {
      const token = await createToken(form.name, form.symbol, form.supply);
      // On successful creation, also attempt a direct reputation update using same signer
      try {
        const { REPUTATION_ABI, REPUTATION_ADDRESS } = await import('../../../constants/reputation');
        const repAddr = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('reputationAddress')) || REPUTATION_ADDRESS;
        if (repAddr && signer && address) {
          const rep = new ethers.Contract(repAddr, REPUTATION_ABI, signer);
          await rep.updateScore(address, 5);
          console.log('Reputation +5 for token creation');
        }
      } catch (e) {
        console.warn('Reputation update token failed', e);
      }
      if (token) {
        // Persist address
        try {
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem('createdTokens') : null;
          const list: string[] = raw ? JSON.parse(raw) : [];
          if (!list.includes(token.address)) list.push(token.address);
          if (typeof window !== 'undefined') window.localStorage.setItem('createdTokens', JSON.stringify(list));
        } catch {}

        // Fetch canonical details from chain (name/symbol/totalSupply)
        const enriched = await fetchTokenDetails(token.address);
        const item = enriched ?? token;
        setTokens((prev) => [...prev, item]);
        setForm({ name: '', symbol: '', supply: '' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Your Tokens</h1>

        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Create New Token</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="p-3 rounded bg-black/30 border border-gray-700 text-white"
            />
            <input
              placeholder="Symbol"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              className="p-3 rounded bg-black/30 border border-gray-700 text-white"
            />
            <input
              placeholder="Supply"
              value={form.supply}
              type="number"
              onChange={(e) => setForm({ ...form, supply: e.target.value })}
              className="p-3 rounded bg-black/30 border border-gray-700 text-white"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="mt-4 bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded-lg font-bold text-black disabled:opacity-60"
          >
            {loading ? 'Creating...' : 'Create Token'}
          </button>
        </div>

        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('tokens')}
              className={`px-3 py-2 rounded-md text-sm font-semibold ${activeTab === 'tokens' ? 'bg-cyan-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >Tokens</button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-3 py-2 rounded-md text-sm font-semibold ${activeTab === 'achievements' ? 'bg-cyan-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >Achievements</button>
          </div>

          {activeTab === 'tokens' && (
            <>
          <h2 className="text-xl font-semibold text-white mb-4">Created Tokens</h2>
          {tokens.length === 0 ? (
            <p className="text-gray-400">No tokens created yet.</p>
          ) : (
            <div className="space-y-4">
              {tokens.map((t, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg border border-gray-700">
                  <div className="font-bold text-lg text-white">
                    {t.name} ({t.symbol})
                  </div>
                  <div className="text-gray-300">Supply: {t.supply}</div>
                  <div className="text-gray-300">
                    Address: <a className="text-cyan-400" target="_blank" href={`https://amoy.polygonscan.com/address/${t.address}`}>{t.address}</a>
                  </div>
                  {address && (
                    <div className="text-xs text-gray-500">Owner: {address.slice(0,6)}...{address.slice(-4)}</div>
                  )}
                </div>
              ))}
            </div>
              )}
            </>
          )}

          {activeTab === 'achievements' && (
            <AchievementsSection signer={signer} address={address} score={score} />
          )}
        </div>
      </div>
    </div>
  );
}

function AchievementsSection({ signer, address, score }: { signer: ethers.JsonRpcSigner | null; address: string | null; score: number }) {
  const [leaderboard, setLeaderboard] = useState<Array<{ addr: string; score: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const tierOf = (s: number): { name: string; color: string; icon: string; nextAt: number } => {
    if (s >= 500) return { name: 'Diamond', color: 'text-cyan-300', icon: '💎', nextAt: Infinity };
    if (s >= 100) return { name: 'Gold', color: 'text-yellow-300', icon: '🥇', nextAt: 500 };
    if (s >= 50) return { name: 'Silver', color: 'text-gray-200', icon: '🥈', nextAt: 100 };
    if (s >= 10) return { name: 'Bronze', color: 'text-amber-400', icon: '🥉', nextAt: 50 };
    return { name: 'Unranked', color: 'text-gray-400', icon: '•', nextAt: 10 };
  };

  const short = (a: string) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : '';

  const fetchLeaderboard = async () => {
    if (!signer) return;
    setIsLoading(true);
    try {
      const repAddr = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('reputationAddress')) || REPUTATION_ADDRESS;
      if (!repAddr) {
        setLeaderboard(address ? [{ addr: address, score }] : []);
        return;
      }
      const rep = new ethers.Contract(repAddr, REPUTATION_ABI, signer);

      let entries: Array<{ addr: string; score: number }> = [];
      try {
        // Try optional getAllScores(): returns tuple arrays or struct[]
        const all = await (rep as any).getAllScores?.();
        if (all && Array.isArray(all)) {
          // compatible with [addresses[], scores[]] or [{user,score}] forms
          if (all.length === 2 && Array.isArray(all[0]) && Array.isArray(all[1])) {
            entries = all[0].map((a: string, i: number) => ({ addr: a, score: Number(all[1][i]) }));
          } else if (all.length > 0 && typeof all[0] === 'object') {
            entries = all.map((e: any) => ({ addr: e.user || e.addr || e[0], score: Number(e.score || e[1]) }));
          }
        }
      } catch {}

      if (entries.length === 0) {
        // Fallback: mock with local known addresses
        const knownRaw = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('recentUsers') : null;
        const known = knownRaw ? (JSON.parse(knownRaw) as string[]) : [];
        const candidates = Array.from(new Set([address || '', ...known])).filter(Boolean) as string[];
        const scores = await Promise.all(candidates.map(async (a) => {
          try { const s = await rep.getScore(a); return { addr: a, score: Number(s) }; } catch { return { addr: a, score: 0 }; }
        }));
        entries = scores.filter(e => e.score > 0 || e.addr.toLowerCase() === (address||'').toLowerCase());
      }

      entries.sort((a, b) => b.score - a.score);
      setLeaderboard(entries);
    } catch {
      setLeaderboard(address ? [{ addr: address, score }] : []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const id = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer, address]);

  const userIndex = leaderboard.findIndex(e => e.addr.toLowerCase() === (address||'').toLowerCase());
  const rank = userIndex >= 0 ? userIndex + 1 : null;
  const total = leaderboard.length;
  const userTier = tierOf(score);
  const progressMax = isFinite(userTier.nextAt) ? userTier.nextAt : Math.max(score, 1);
  const progressPct = Math.min(100, Math.round((score / progressMax) * 100));

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">Achievements</h2>
      {address ? (
        <div className="p-4 bg-white/5 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-gray-300">Address: <span className="font-mono">{short(address)}</span></div>
            <div className={`text-sm font-semibold ${userTier.color}`}>
              <span className="mr-1">{userTier.icon}</span>{userTier.name}
            </div>
          </div>
          <div className="text-white text-2xl font-bold mt-1">Reputation: {score}</div>
          <div className="text-xs text-gray-400 mt-2">Auto-updates on swap (+1), add liquidity (+2), token creation (+5).</div>

          <div className="my-4 border-t border-cyan-500/30" />

          <div className="mb-2">
            <div className="text-lg font-semibold text-white">Leaderboard 🏆</div>
            <div className="text-xs text-gray-400">Top Reputation Holders</div>
          </div>

          <div className="max-h-[300px] overflow-y-auto rounded-lg">
            <AnimatePresence initial={false}>
              {isLoading ? (
                <div className="text-gray-400 text-sm">Loading...</div>
              ) : (
                leaderboard.length === 0 ? (
                  <div className="text-gray-400 text-sm">No entries yet.</div>
                ) : (
                  leaderboard.map((entry, i) => {
                    const t = tierOf(entry.score);
                    const isUser = entry.addr.toLowerCase() === (address||'').toLowerCase();
                    return (
                      <motion.div
                        key={entry.addr}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-center justify-between px-3 py-2 border-b border-white/10 ${isUser ? 'bg-cyan-500/10 ring-1 ring-cyan-500/40' : ''}`}
                      >
                        <div className="w-12 text-gray-400 text-sm">#{i+1}</div>
                        <div className="flex-1 text-white text-sm">
                          {short(entry.addr)} {isUser && <span className="text-cyan-300">(You)</span>}
                        </div>
                        <div className="w-24 text-right text-gray-200 text-sm">{entry.score}</div>
                        <div className={`ml-3 text-xs font-semibold ${t.color}`}>
                          <span className="mr-1">{t.icon}</span>{t.name}
                        </div>
                      </motion.div>
                    );
                  })
                )
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-300">
              Your Rank: <span className="font-semibold text-white">{rank ? `#${rank}` : '—'}</span> out of <span className="font-semibold text-white">{total}</span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              Tier: <span className={`font-semibold ${userTier.color}`}>{userTier.name}</span>
              {isFinite(userTier.nextAt) && (
                <span className="text-gray-400"> (Progress: {score} / {userTier.nextAt})</span>
              )}
            </div>
            <div className="mt-2 h-2 w-full bg-white/10 rounded">
              <div className="h-2 bg-cyan-500 rounded" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Connect your wallet to view achievements.</p>
      )}
    </div>
  );
}


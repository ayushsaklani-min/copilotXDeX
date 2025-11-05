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

  const { createToken } = useTokenFactory(signer);

  const { score } = useReputation(signer, address || undefined);

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tokens')}
              className={`px-3 py-2 rounded-md text-sm font-semibold ${activeTab === 'tokens' ? 'bg-cyan-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >Tokens</button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-3 py-2 rounded-md text-sm font-semibold ${activeTab === 'achievements' ? 'bg-cyan-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >Achievements</button>
            </div>
            {address && (
              <InlineReputationBadge signer={signer} address={address} score={score} />
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'tokens' && (
              <motion.div
                key="tokens"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
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
              </motion.div>
            )}

            {activeTab === 'achievements' && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <AchievementsSection signer={signer} address={address} score={score} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function AchievementsSection({ signer, address, score }: { signer: ethers.JsonRpcSigner | null; address: string | null; score: number }) {
  const [leaderboard, setLeaderboard] = useState<Array<{ addr: string; score: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);

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
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-white">Achievements</h2>
        <button
          onClick={() => setShowLevelInfo(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/30 transition-all duration-200 flex items-center gap-2"
        >
          <span>ℹ️</span>
          <span>Level Info</span>
        </button>
      </div>
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

      {/* Level Info Dialog */}
      <AnimatePresence>
        {showLevelInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLevelInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 border-2 border-cyan-500/50 shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="text-3xl">🏆</span>
                    Reputation Level System
                  </h2>
                  <button
                    onClick={() => setShowLevelInfo(false)}
                    className="text-gray-400 hover:text-white text-2xl leading-none transition-colors"
                  >
                    ×
                  </button>
                </div>

                {/* Current Status */}
                <div className="mb-4 p-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                  <div className="text-xs text-gray-300 mb-1">Your Current Status</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{userTier.icon}</span>
                      <div>
                        <div className={`text-xl font-bold ${userTier.color}`}>{userTier.name}</div>
                        <div className="text-sm text-white">Reputation: {score} points</div>
                      </div>
                    </div>
                    {isFinite(userTier.nextAt) && (
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Next Level</div>
                        <div className="text-lg font-bold text-cyan-400">{userTier.nextAt - score} to go</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Levels Table */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span>📊</span>
                    Trading Fee Benefits
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b-2 border-cyan-500/50">
                          <th className="text-left py-2 px-3 text-cyan-400 font-semibold text-xs">Score</th>
                          <th className="text-left py-2 px-3 text-cyan-400 font-semibold text-xs">Level</th>
                          <th className="text-left py-2 px-3 text-cyan-400 font-semibold text-xs">Fee</th>
                          <th className="text-left py-2 px-3 text-cyan-400 font-semibold text-xs">Reduction</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className={`border-b border-gray-700/50 ${score < 50 ? 'bg-amber-500/10 ring-1 ring-amber-500/40' : 'hover:bg-white/5'}`}>
                          <td className="py-2 px-3 text-white text-xs">0-49</td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600/20 border border-amber-500/30 text-amber-300 font-semibold text-xs">
                              <span>🥉</span> Bronze
                            </span>
                          </td>
                          <td className="py-2 px-3 text-white font-bold">0.30%</td>
                          <td className="py-2 px-3 text-gray-400 text-xs">Default</td>
                        </tr>
                        <tr className={`border-b border-gray-700/50 ${score >= 50 && score < 100 ? 'bg-gray-300/10 ring-1 ring-gray-400/40' : 'hover:bg-white/5'}`}>
                          <td className="py-2 px-3 text-white text-xs">50-99</td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-600/20 border border-gray-400/30 text-gray-200 font-semibold text-xs">
                              <span>🥈</span> Silver
                            </span>
                          </td>
                          <td className="py-2 px-3 text-white font-bold">0.20%</td>
                          <td className="py-2 px-3 text-green-400 font-semibold text-xs">33%</td>
                        </tr>
                        <tr className={`border-b border-gray-700/50 ${score >= 100 && score < 500 ? 'bg-yellow-500/10 ring-1 ring-yellow-400/40' : 'hover:bg-white/5'}`}>
                          <td className="py-2 px-3 text-white text-xs">100-499</td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-600/20 border border-yellow-400/30 text-yellow-300 font-semibold text-xs">
                              <span>🥇</span> Gold
                            </span>
                          </td>
                          <td className="py-2 px-3 text-white font-bold">0.10%</td>
                          <td className="py-2 px-3 text-green-400 font-semibold text-xs">67%</td>
                        </tr>
                        <tr className={`${score >= 500 ? 'bg-cyan-500/10 ring-1 ring-cyan-400/40' : 'hover:bg-white/5'}`}>
                          <td className="py-2 px-3 text-white text-xs">500+</td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-600/20 border border-cyan-400/30 text-cyan-300 font-semibold text-xs">
                              <span>💎</span> Platinum
                            </span>
                          </td>
                          <td className="py-2 px-3 text-white font-bold">0.05%</td>
                          <td className="py-2 px-3 text-green-400 font-semibold text-xs">83%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* How to Earn Points */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span>⭐</span>
                    How to Earn Points
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white/5 border border-cyan-500/30">
                      <div className="text-2xl mb-1">🔄</div>
                      <div className="text-sm font-semibold text-white mb-1">Token Swap</div>
                      <div className="text-xl font-bold text-cyan-400 mb-1">+1 XP</div>
                      <div className="text-xs text-gray-400">Per swap transaction</div>
                    </div>
                    <div className="p-3 bg-white/5 border border-cyan-500/30">
                      <div className="text-2xl mb-1">💧</div>
                      <div className="text-sm font-semibold text-white mb-1">Add Liquidity</div>
                      <div className="text-xl font-bold text-cyan-400 mb-1">+2 XP</div>
                      <div className="text-xs text-gray-400">Per liquidity add</div>
                    </div>
                    <div className="p-3 bg-white/5 border border-cyan-500/30">
                      <div className="text-2xl mb-1">🪙</div>
                      <div className="text-sm font-semibold text-white mb-1">Create Token</div>
                      <div className="text-xl font-bold text-cyan-400 mb-1">+5 XP</div>
                      <div className="text-xs text-gray-400">Per token created</div>
                    </div>
                  </div>
                </div>

                {/* Level Progression Examples */}
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    Level Progression Guide
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-gradient-to-r from-gray-600/20 to-gray-700/20 border border-gray-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span>🥈</span>
                        <span className="text-sm font-semibold text-white">To Reach Silver (50 pts):</span>
                      </div>
                      <div className="text-xs text-gray-300 pl-6">
                        • 50 swaps OR 25 liquidity adds OR 10 tokens<br />
                        • Mix: 20 swaps + 10 liquidity + 2 tokens
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 border border-yellow-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span>🥇</span>
                        <span className="text-sm font-semibold text-white">To Reach Gold (100 pts):</span>
                      </div>
                      <div className="text-xs text-gray-300 pl-6">
                        • 100 swaps OR 50 liquidity adds OR 20 tokens<br />
                        • Mix: 40 swaps + 20 liquidity + 4 tokens
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-cyan-600/20 to-cyan-700/20 border border-cyan-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span>💎</span>
                        <span className="text-sm font-semibold text-white">To Reach Platinum (500 pts):</span>
                      </div>
                      <div className="text-xs text-gray-300 pl-6">
                        • 500 swaps OR 250 liquidity adds OR 100 tokens<br />
                        • Mix: 200 swaps + 100 liquidity + 20 tokens
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/30">
                  <div className="text-xs text-gray-300">
                    <span className="font-semibold text-white">💡 Pro Tip:</span> Higher levels unlock better trading fees! Keep trading and providing liquidity to level up and save on fees.
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InlineReputationBadge({ signer, address, score }: { signer: ethers.JsonRpcSigner | null; address: string; score: number }) {
  const tierOf = (s: number): { name: string; color: string; bg: string } => {
    if (s >= 1000) return { name: 'Crystal', color: 'text-fuchsia-200', bg: 'bg-fuchsia-600/30' };
    if (s >= 500) return { name: 'Diamond', color: 'text-purple-200', bg: 'bg-purple-600/30' };
    if (s >= 250) return { name: 'Gold', color: 'text-amber-200', bg: 'bg-amber-600/30' };
    if (s >= 100) return { name: 'Silver', color: 'text-zinc-200', bg: 'bg-zinc-600/30' };
    return { name: 'Bronze', color: 'text-orange-200', bg: 'bg-orange-600/30' };
  };

  const tier = tierOf(score);
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border border-white/10 ${tier.bg}`}>
      <span className={`text-xs font-semibold ${tier.color}`}>{tier.name}</span>
      <span className="text-xs text-gray-300">Score:</span>
      <span className="text-sm font-bold text-white">{score}</span>
    </div>
  );
}


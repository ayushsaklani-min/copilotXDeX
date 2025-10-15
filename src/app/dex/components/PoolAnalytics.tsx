'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAnalytics } from '../../../hooks/useAnalytics';

interface PoolAnalyticsProps {
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  dex: { pairs?: Array<{ name: string; reserve0: number; reserve1: number }> };
  prices: Record<string, number>;
}

export default function PoolAnalytics({
  isConnected,
  isCorrectNetwork,
  dex,
  prices,
}: PoolAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  
  // Use real analytics data instead of mock
  const { data: analyticsData, isLoading, error, refreshData } = useAnalytics(
    isConnected && isCorrectNetwork ? (dex as any).signer : null,
    timeframe
  );

  // Small SVG chart components (no external deps)
  const SimpleBarChart = ({ data, height = 300 }: { data: { volume: number; trades?: number; time: string }[]; height?: number }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<{ index: number; xPct: number } | null>(null);
    
    if (!data || data.length === 0) {
      return (
        <div className="w-full h-[300px] flex items-center justify-center text-gray-400">No data</div>
      );
    }
    const maxVal = Math.max(1, ...data.map(d => d.volume));
    const barWidth = 100 / data.length;

    const onMove = (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const idx = Math.min(data.length - 1, Math.max(0, Math.floor((x / rect.width) * data.length)));
      const xPct = (idx + 0.5) * barWidth;
      setHover({ index: idx, xPct });
    };

    const onLeave = () => setHover(null);

    const tickCount = Math.min(6, Math.max(2, Math.floor(data.length)));
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const idx = Math.round((i * (data.length - 1)) / (tickCount - 1));
      const xPct = (idx / Math.max(1, data.length - 1)) * 100;
      return { idx, xPct, label: data[idx]?.time ?? '' };
    });

    return (
      <div ref={containerRef} className="w-full h-[300px] relative" onMouseMove={onMove} onMouseLeave={onLeave}>
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {data.map((d, i) => {
            const barHeight = (d.volume / maxVal) * (height - 20);
            const x = i * barWidth + 1;
            const y = height - barHeight - 10;
            const isActive = hover?.index === i;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barWidth - 2}
                height={barHeight}
                rx={1}
                className={isActive ? 'fill-cyan-300' : 'fill-cyan-400/70'}
              />
            );
          })}
          <line x1="0" y1={height - 10} x2="100" y2={height - 10} className="stroke-white/20" strokeWidth={0.5} />
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={t.xPct} y1={height - 10} x2={t.xPct} y2={height - 8} className="stroke-white/30" strokeWidth={0.5} />
              <text x={t.xPct} y={height - 2} textAnchor="middle" className="fill-gray-300" fontSize="4">
                {t.label}
              </text>
            </g>
          ))}
          {hover && (
            <line x1={hover.xPct} y1={10} x2={hover.xPct} y2={height - 10} className="stroke-white/40" strokeWidth={0.5} />
          )}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full bg-black/80 border border-cyan-500/40 text-white text-xs rounded-md px-3 py-2 shadow"
            style={{ left: `${hover.xPct}%`, top: 8 }}
          >
            <div className="font-semibold text-cyan-300">{data[hover.index].time}</div>
            <div>Volume: ${Math.round(data[hover.index].volume).toLocaleString()}</div>
            {typeof data[hover.index].trades === 'number' && <div>Trades: {data[hover.index].trades}</div>}
          </div>
        )}
      </div>
    );
  };

  const SimpleLineChart = ({ data, height = 300 }: { data: { tvl: number; time: string }[]; height?: number }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<{ index: number; xPct: number; yPct: number } | null>(null);
    
    if (!data || data.length === 0) {
      return (
        <div className="w-full h-[300px] flex items-center justify-center text-gray-400">No data</div>
      );
    }
    const maxVal = Math.max(1, ...data.map(d => d.tvl));
    const minVal = Math.min(...data.map(d => d.tvl));
    const range = Math.max(1, maxVal - minVal);
    const getXY = (idx: number) => {
      const safeIdx = Math.min(data.length - 1, Math.max(0, idx));
      const x = (safeIdx / Math.max(1, data.length - 1)) * 100;
      const y = (1 - ((data[safeIdx]?.tvl ?? 0) - minVal) / range) * (height - 20) + 10;
      return { x, y };
    };
    const points = data.map((_, i) => {
      const { x, y } = getXY(i);
      return `${x},${y}`;
    }).join(' ');
    const tickCount = Math.min(6, Math.max(2, Math.floor(data.length)));
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const idx = Math.round((i * (data.length - 1)) / (tickCount - 1));
      const pos = getXY(idx);
      return { idx, xPct: pos.x, label: data[idx]?.time ?? '' };
    });
    const onMove = (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const idx = Math.round((x / rect.width) * (data.length - 1));
      const clamped = Math.min(data.length - 1, Math.max(0, idx));
      const { x: xPct, y } = getXY(clamped);
      setHover({ index: clamped, xPct, yPct: y });
    };
    const onLeave = () => setHover(null);
    return (
      <div ref={containerRef} className="w-full h-[300px] relative" onMouseMove={onMove} onMouseLeave={onLeave}>
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <polyline points={points} fill="none" className="stroke-blue-400" strokeWidth={1.5} />
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,${height} ${points} 100,${height}`} fill="url(#area)" />
          <line x1="0" y1={height - 10} x2="100" y2={height - 10} className="stroke-white/20" strokeWidth={0.5} />
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={t.xPct} y1={height - 10} x2={t.xPct} y2={height - 8} className="stroke-white/30" strokeWidth={0.5} />
              <text x={t.xPct} y={height - 2} textAnchor="middle" className="fill-gray-300" fontSize="4">
                {t.label}
              </text>
            </g>
          ))}
          {hover && (
            <g>
              <line x1={hover.xPct} y1={10} x2={hover.xPct} y2={height - 10} className="stroke-white/40" strokeWidth={0.5} />
              <circle cx={hover.xPct} cy={hover.yPct} r={1.2} className="fill-blue-300" />
            </g>
          )}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full bg-black/80 border border-blue-500/40 text-white text-xs rounded-md px-3 py-2 shadow"
            style={{ left: `${hover.xPct}%`, top: 8 }}
          >
            <div className="font-semibold text-blue-300">{data[hover.index].time}</div>
            <div>TVL: ${Math.round(data[hover.index].tvl).toLocaleString()}</div>
          </div>
        )}
      </div>
    );
  };

  // Use real data from analytics hook
  const volumeData = analyticsData.volumeData;
  const tvlData = analyticsData.tvlData;

  // Auto-refresh charts periodically
  useEffect(() => {
    const id = setInterval(refreshData, 15000);
    return () => clearInterval(id);
  }, [refreshData]);

  const totalVolume = analyticsData.totalVolume;
  const totalTrades = analyticsData.totalTrades;
  const avgTvl = analyticsData.currentTVL;

  if (!isConnected) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-300">Please connect your wallet to view analytics</p>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-red-500/30 p-8 text-center">
        <h2 className="text-2xl font-bold text-red-300 mb-4">Wrong Network</h2>
        <p className="text-gray-300">Please switch to Polygon Amoy network</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Loading Analytics...</h2>
        <p className="text-gray-300">Fetching real-time data from blockchain</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-red-500/30 p-8 text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Data</h2>
        <p className="text-gray-300">{error}</p>
        <button 
          onClick={refreshData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Pool Analytics</h2>
          <div className="flex space-x-2">
            {(['24h', '7d', '30d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  timeframe === period
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-gray-400">Total Volume</div>
            <div className="text-2xl font-bold text-white">${totalVolume.toLocaleString()}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-gray-400">Total Trades</div>
            <div className="text-2xl font-bold text-white">{totalTrades.toLocaleString()}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-gray-400">Avg TVL</div>
            <div className="text-2xl font-bold text-white">${avgTvl.toLocaleString()}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-gray-400">Active Pairs</div>
            <div className="text-2xl font-bold text-white">{dex.pairs?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Trading Volume</h3>
          <div className="bg-white/5 rounded-lg">
            <SimpleBarChart data={volumeData} />
          </div>
        </div>

        {/* TVL Chart */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Total Value Locked</h3>
          <div className="bg-white/5 rounded-lg">
            <SimpleLineChart data={tvlData} />
          </div>
        </div>
      </div>

      {/* Pool Details */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Pool Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Pair</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Reserves</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">TVL</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">24h Volume</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Fee Rate</th>
              </tr>
            </thead>
            <tbody>
              {dex.pairs?.map((pair) => (
                <tr key={pair.name} className="border-b border-gray-800">
                  <td className="py-3 px-4 text-white font-semibold">{pair.name}</td>
                  <td className="py-3 px-4 text-gray-300">
                    {pair.reserve0?.toFixed(2)} / {pair.reserve1?.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-white">
                    ${((pair.reserve0 + pair.reserve1) * (prices[pair.name] || 1)).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-white">
                    ${((pair.reserve0 + pair.reserve1) * 0.1).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-green-300">0.30%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trading Activity */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Trading Activity</h3>
          <div className="text-sm text-gray-300">
            Hover bars for exact trades per {timeframe === '24h' ? 'hour' : 'day'}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg">
          <SimpleBarChart data={volumeData.map(d => ({ time: d.time, volume: d.trades, trades: d.trades }))} />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Most Active {timeframe === '24h' ? 'Hour' : 'Day'}</div>
            <div className="text-white font-semibold text-lg">
              {volumeData.length ? volumeData.reduce((a, b) => (a.trades > b.trades ? a : b)).time : '-'}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Peak Trades</div>
            <div className="text-white font-semibold text-lg">
              {volumeData.length ? volumeData.reduce((m, d) => Math.max(m, d.trades), 0) : 0}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Avg Trades</div>
            <div className="text-white font-semibold text-lg">
              {volumeData.length ? Math.round(volumeData.reduce((s, d) => s + d.trades, 0) / volumeData.length) : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

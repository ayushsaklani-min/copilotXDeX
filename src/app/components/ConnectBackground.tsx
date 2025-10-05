'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

// Space scene background for the Connect Wallet page.
// Twinkling stars, colorful planets, galaxy glow, and floating shiny coins.
export default function ConnectBackground() {

  const icons = [
    // Ethereum (diamond)
    (
      <svg key="eth" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <polygon points="32,4 12,32 32,24 52,32" fill="#6366f1"/>
        <polygon points="32,60 12,34 32,42 52,34" fill="#818cf8"/>
      </svg>
    ),
    // DAI (circle with D)
    (
      <svg key="dai" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="#f59e0b"/>
        <text x="32" y="40" fontSize="28" textAnchor="middle" fill="#ffffff" fontFamily="Arial, Helvetica, sans-serif">D</text>
      </svg>
    ),
    // USDC (circle with $ waves)
    (
      <svg key="usdc" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="#0ea5e9"/>
        <path d="M24 24c2-4 12-4 16 0 4 4-2 8-8 8s-12 4-8 8c4 4 14 4 16 0" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    // MATIC (hex-like)
    (
      <svg key="matic" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 20 L32 12 L44 20 L44 36 L32 44 L20 36 Z" fill="#7c3aed"/>
      </svg>
    ),
    // Polygon link motif
    (
      <svg key="polygon" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 28l10-6 10 6v12l-10 6-10-6V28z" fill="#a78bfa"/>
        <path d="M26 24l10-6 10 6v12l-10 6-10-6V24z" fill="#c4b5fd"/>
      </svg>
    ),
    // Bitcoin
    (
      <svg key="btc" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="#f7931a"/>
        <path d="M20 24h8l-2 8h-8l2-8zm0 16h8l-2 8h-8l2-8z" fill="#ffffff"/>
      </svg>
    ),
    // Chainlink
    (
      <svg key="link" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="#2a5ada"/>
        <path d="M20 32l12-12 4 4-12 12-4-4zm24 0l-12 12-4-4 12-12 4 4z" fill="#ffffff"/>
      </svg>
    ),
    // Uniswap
    (
      <svg key="uni" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="#ff007a"/>
        <path d="M32 12l8 8-8 8-8-8 8-8zm0 24l8 8-8 8-8-8 8-8z" fill="#ffffff"/>
      </svg>
    ),
    // Aave
    (
      <svg key="aave" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="#b6509e"/>
        <path d="M32 16l8 16-8 16-8-16 8-16z" fill="#ffffff"/>
      </svg>
    ),
    // Compound
    (
      <svg key="comp" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="#00d395"/>
        <path d="M24 24h16v16H24V24z" fill="#ffffff"/>
      </svg>
    )
  ];

  // Create many floating tokens after mount to avoid SSR randomness -> hydration mismatch
  type FloatSpec = {
    left: string;
    top: string;
    delay: number;
    fallSpeed: number;
    size: number;
    sway: number;
    iconIndex: number;
  };

  const [floats, setFloats] = useState<FloatSpec[]>([]);
  const [stars, setStars] = useState<Array<{ left: string; top: string; size: number; twinkle: number }>>([]);
  const [nodes, setNodes] = useState<Array<{ x: number; y: number; r: number; glow: number }>>([]);
  const [links, setLinks] = useState<Array<{ s: number; t: number }>>([]);

  // Adaptive counts to reduce jank on low-power devices or when users prefer reduced motion
  const counts = useMemo(() => {
    if (typeof window === 'undefined') return { floats: 24, stars: 100, nodes: 8 };
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmall = window.innerWidth < 768;
    if (reduced) return { floats: 8, stars: 40, nodes: 4 };
    if (isSmall) return { floats: 16, stars: 80, nodes: 6 };
    return { floats: 24, stars: 100, nodes: 8 };
  }, []);

  useEffect(() => {
    // Floating coins
    const generated: FloatSpec[] = Array.from({ length: counts.floats }).map((_, i) => {
      const left = `${Math.random() * 90 + 2}%`;
      const top = `${Math.random() * 90 + 2}%`;
      const delay = Math.random() * 4;
      const fallSpeed = 16 + Math.random() * 16; // slower movement reduces CPU
      const size = 24 + Math.round(Math.random() * 22);
      const sway = Math.random() * 40 + 16;
      return { left, top, delay, fallSpeed, size, sway, iconIndex: i % icons.length };
    });
    setFloats(generated);

    // Stars
    const starField = Array.from({ length: counts.stars }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 1.8 + 0.4,
      twinkle: 3 + Math.random() * 5,
    }));
    setStars(starField);

    // Network nodes and links
    const createdNodes = Array.from({ length: counts.nodes }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: 2 + Math.random() * 3,
      glow: 2 + Math.random() * 5
    }));
    // Connect each node to its nearest 1-2 neighbors (lighter)
    const createdLinks: Array<{ s: number; t: number }> = [];
    createdNodes.forEach((n, i) => {
      const distances = createdNodes
        .map((m, j) => ({ j, d: Math.hypot(n.x - m.x, n.y - m.y) }))
        .filter(({ j }) => j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      distances.forEach(({ j }) => createdLinks.push({ s: i, t: j }));
    });
    setNodes(createdNodes);
    setLinks(createdLinks);
  }, [counts, icons.length]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: 'radial-gradient(1200px 800px at 50% 60%, #0b1020 0%, #070b17 40%, #03060e 70%, #01030a 100%)' }}>
      {/* Galaxy glow */}
      <motion.div
        className="absolute -inset-1"
        initial={{ opacity: 0.35 }}
        animate={{ opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(700px 500px at 20% 30%, rgba(99,102,241,0.25), transparent 60%),\
             radial-gradient(900px 600px at 80% 20%, rgba(14,165,233,0.18), transparent 65%),\
             radial-gradient(1000px 700px at 60% 85%, rgba(245,158,11,0.16), transparent 70%)',
          filter: 'blur(2px)'
        }}
      />

      {/* Glowing network graph */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
        </defs>
        {links.map((l, idx) => {
          const a = nodes[l.s];
          const b = nodes[l.t];
          if (!a || !b) return null;
          return (
            <motion.line
              key={`link-${idx}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#38bdf8"
              strokeWidth={0.1}
              initial={{ opacity: 0.12 }}
              animate={{ opacity: [0.1, 0.22, 0.1] }}
              transition={{ duration: 6 + (idx % 7) * 0.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: 'drop-shadow(0 0 2px rgba(56,189,248,0.35))' }}
            />
          );
        })}
        {nodes.map((n, idx) => (
          <g key={`node-${idx}`}>
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill="#e2e8f0"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: [0.5, 0.85, 0.5] }}
              transition={{ duration: n.glow + 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <circle cx={n.x} cy={n.y} r={n.r * 4} fill="url(#nodeGlow)" />
          </g>
        ))}
      </svg>

      {/* Stars */}
      {stars.map((s, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute rounded-full"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, background: 'white', boxShadow: '0 0 6px 2px rgba(255,255,255,0.6)' }}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: s.twinkle, repeat: Infinity, ease: 'easeInOut', delay: (i % 10) * 0.1 }}
        />
      ))}

      {/* Planets */}
      <motion.div
        className="absolute"
        style={{ left: '8%', top: '18%', width: 220, height: 220, borderRadius: 9999, background: 'radial-gradient(circle at 30% 30%, #ffcf33 0%, #f59e0b 40%, #b45309 75%)', boxShadow: '0 0 40px 10px rgba(245,158,11,0.35)' }}
        animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute"
        style={{ left: '72%', top: '12%', width: 160, height: 160, borderRadius: 9999, background: 'radial-gradient(circle at 35% 35%, #8b5cf6 0%, #6d28d9 50%, #4c1d95 80%)', boxShadow: '0 0 36px 10px rgba(139,92,246,0.35)' }}
        animate={{ y: [0, 14, 0], rotate: [0, -12, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute"
        style={{ left: '60%', top: '70%', width: 260, height: 260, borderRadius: 9999, background: 'radial-gradient(circle at 40% 40%, #22d3ee 0%, #0ea5e9 50%, #0369a1 80%)', boxShadow: '0 0 46px 12px rgba(14,165,233,0.30)' }}
        animate={{ y: [0, -18, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating shiny coins */}
      {floats.map((pos, idx) => (
        <motion.div
          key={idx}
          className="absolute"
          style={{ left: pos.left, top: pos.top, filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.7))' }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0.95, scale: 0.95 }}
          animate={{
            y: [0, 10, -8, 0],
            x: [0, pos.sway, -pos.sway * 0.8, 0],
            rotate: [0, 120, 240],
            opacity: [0.9, 0.8, 0.9],
            scale: [0.96, 1.04, 0.96]
          }}
          transition={{ 
            y: { duration: pos.fallSpeed, repeat: Infinity, ease: 'easeInOut', delay: pos.delay },
            x: { duration: pos.fallSpeed, repeat: Infinity, ease: 'easeInOut', delay: pos.delay * 0.6 },
            rotate: { duration: pos.fallSpeed * 1.4, repeat: Infinity, ease: 'linear' },
            opacity: { duration: pos.fallSpeed, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: pos.fallSpeed, repeat: Infinity, ease: 'easeInOut' }
          }}
        >
          <div style={{ width: pos.size, height: pos.size }}>
            {icons[pos.iconIndex]}
          </div>
        </motion.div>
      ))}
    </div>
  );
}



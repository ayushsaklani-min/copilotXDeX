'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// Colorful, friendly background for the Connect Wallet page.
// Shows soft gradients and falling crypto tokens.
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

  // Create many falling tokens after mount to avoid SSR randomness -> hydration mismatch
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

  useEffect(() => {
    const generated: FloatSpec[] = Array.from({ length: 80 }).map((_, i) => {
      const left = `${Math.random() * 80 + 5}%`;
      const top = `${Math.random() * 20 - 20}%`; // Start above viewport
      const delay = Math.random() * 2;
      const fallSpeed = 8 + Math.random() * 12;
      const size = 32 + Math.round(Math.random() * 24);
      const sway = Math.random() * 40 + 20;
      return { left, top, delay, fallSpeed, size, sway, iconIndex: i % icons.length };
    });
    setFloats(generated);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 50%, #81d4fa 100%)' }}>
      {/* Color gradients */}
      <motion.div
        className="absolute -inset-1"
        initial={{ opacity: 0.7 }}
        animate={{ opacity: [0.7, 0.6, 0.7] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(600px 600px at 15% 20%, rgba(99,102,241,0.12), transparent 55%),\
             radial-gradient(520px 520px at 85% 25%, rgba(14,165,233,0.10), transparent 55%),\
             radial-gradient(640px 640px at 40% 80%, rgba(245,158,11,0.08), transparent 60%)',
        }}
      />

      {/* Falling crypto tokens with mouse interaction */}
      {floats.map((pos, idx) => (
        <motion.div
          key={idx}
          className="absolute"
          style={{ left: pos.left, top: pos.top }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0.9 }}
          animate={{
            y: ['0vh', '120vh'],
            x: [0, pos.sway, -pos.sway, 0],
            rotate: [0, 180, 360],
            opacity: [0.9, 0.7, 0.9]
          }}
          transition={{ 
            y: { duration: pos.fallSpeed, repeat: Infinity, ease: 'linear' },
            x: { duration: pos.fallSpeed * 0.8, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: pos.fallSpeed, repeat: Infinity, ease: 'linear' },
            opacity: { duration: pos.fallSpeed * 0.5, repeat: Infinity, ease: 'easeInOut' }
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



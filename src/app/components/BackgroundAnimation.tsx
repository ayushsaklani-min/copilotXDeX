'use client';

import { motion } from 'framer-motion';

// Animated background for wallet overview with bouncing crypto tokens
export default function BackgroundAnimation() {
  const icons = [
    // Ethereum
    <svg key="eth" viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,2 6,16 16,12 26,16" fill="#6366f1"/>
      <polygon points="16,30 6,18 16,22 26,18" fill="#818cf8"/>
    </svg>,
    // DAI
    <svg key="dai" viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#f59e0b"/>
      <text x="16" y="20" fontSize="14" textAnchor="middle" fill="#ffffff" fontFamily="Arial">D</text>
    </svg>,
    // USDC
    <svg key="usdc" viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#0ea5e9"/>
      <path d="M12 12c1-2 6-2 8 0 2 2-1 4-4 4s-6 2-4 4c2 2 7 2 8 0" stroke="#ffffff" strokeWidth="1.5" fill="none"/>
    </svg>,
    // MATIC
    <svg key="matic" viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 10 L16 6 L22 10 L22 18 L16 22 L10 18 Z" fill="#7c3aed"/>
    </svg>,
    // Bitcoin
    <svg key="btc" viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#f7931a"/>
      <path d="M10 12h4l-1 4h-4l1-4zm0 8h4l-1 4h-4l1-4z" fill="#ffffff"/>
    </svg>,
    // Chainlink
    <svg key="link" viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#2a5ada"/>
      <path d="M10 16l6-6 2 2-6 6-2-2zm12 0l-6 6-2-2 6-6 2 2z" fill="#ffffff"/>
    </svg>,
    // Uniswap
    <svg key="uni" viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#ff007a"/>
      <path d="M16 6l4 4-4 4-4-4 4-4zm0 12l4 4-4 4-4-4 4-4z" fill="#ffffff"/>
    </svg>,
    // Aave
    <svg key="aave" viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#b6509e"/>
      <path d="M16 8l4 8-4 8-4-8 4-8z" fill="#ffffff"/>
    </svg>
  ];

  // Create bouncing tokens
  const bouncingTokens = Array.from({ length: 25 }).map((_, i) => {
    const left = `${Math.random() * 80 + 10}%`;
    const top = `${Math.random() * 70 + 15}%`;
    const delay = Math.random() * 3;
    const bounceHeight = 20 + Math.random() * 30;
    const bounceSpeed = 3 + Math.random() * 4;
    const size = 24 + Math.round(Math.random() * 16);
    return { left, top, delay, bounceHeight, bounceSpeed, size, iconIndex: i % icons.length };
  });

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 -z-10 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 30%, #bae6fd 70%, #7dd3fc 100%)' }}>
      {/* Soft gradient overlays */}
      <motion.div
        aria-hidden
        className="absolute -inset-1"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.4, 0.3, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(40% 40% at 20% 20%, rgba(59,130,246,0.08), transparent 60%),\
             radial-gradient(50% 50% at 80% 30%, rgba(14,165,233,0.06), transparent 60%),\
             radial-gradient(35% 35% at 50% 80%, rgba(99,102,241,0.05), transparent 55%)',
        }}
      />


      {/* Bouncing crypto tokens */}
      {bouncingTokens.map((token, idx) => (
        <motion.div
          key={idx}
          className="absolute"
          style={{ left: token.left, top: token.top }}
          initial={{ y: 0, rotate: 0, opacity: 0.7 }}
          animate={{
            y: [0, -token.bounceHeight, 0],
            rotate: [0, 5, -5, 0],
            opacity: [0.7, 0.9, 0.7]
          }}
          transition={{
            y: { duration: token.bounceSpeed, repeat: Infinity, ease: 'easeInOut', delay: token.delay },
            rotate: { duration: token.bounceSpeed * 1.5, repeat: Infinity, ease: 'easeInOut', delay: token.delay },
            opacity: { duration: token.bounceSpeed * 0.8, repeat: Infinity, ease: 'easeInOut', delay: token.delay }
          }}
        >
          <div style={{ width: token.size, height: token.size }}>
            {icons[token.iconIndex]}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
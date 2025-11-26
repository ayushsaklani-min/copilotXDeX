'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/design-system/components';

interface BondingCurveChartProps {
  curveType: 'LINEAR' | 'EXPONENTIAL' | 'SIGMOID';
  currentSupply: number;
  currentPrice: number;
  trades: Array<{ timestamp: number; price: number; type: 'buy' | 'sell' }>;
}

export function BondingCurveChart({ curveType, currentSupply, currentPrice, trades }: BondingCurveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const padding = 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = padding + (height - 2 * padding) * (i / 10);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw bonding curve
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const maxSupply = currentSupply * 2 || 1000;
    const points = 100;

    for (let i = 0; i <= points; i++) {
      const supply = (maxSupply * i) / points;
      const price = calculatePrice(supply, curveType);
      
      const x = padding + ((width - 2 * padding) * i) / points;
      const maxPrice = calculatePrice(maxSupply, curveType);
      const y = height - padding - ((height - 2 * padding) * price) / maxPrice;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw current position
    const currentX = padding + ((width - 2 * padding) * currentSupply) / maxSupply;
    const maxPrice = calculatePrice(maxSupply, curveType);
    const currentY = height - padding - ((height - 2 * padding) * currentPrice) / maxPrice;

    ctx.fillStyle = '#d946ef';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw trades
    trades.slice(-50).forEach(trade => {
      const tradeSupply = currentSupply; // Simplified
      const tradeX = padding + ((width - 2 * padding) * tradeSupply) / maxSupply;
      const tradeY = height - padding - ((height - 2 * padding) * trade.price) / maxPrice;

      ctx.fillStyle = trade.type === 'buy' ? '#22c55e' : '#ef4444';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(tradeX, tradeY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw labels
    ctx.fillStyle = '#a3a3a3';
    ctx.font = '12px Inter';
    ctx.fillText('Supply', width / 2 - 20, height - 10);
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Price', 0, 0);
    ctx.restore();

  }, [curveType, currentSupply, currentPrice, trades]);

  return (
    <Card variant="elevated" padding="lg">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white mb-2">Bonding Curve</h3>
        <p className="text-neutral-400 text-sm">{curveType} curve</p>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-64 rounded-lg"
        style={{ background: '#141414' }}
      />
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary-500" />
          <span className="text-neutral-400">Curve</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-secondary-500" />
          <span className="text-neutral-400">Current</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success-500" />
          <span className="text-neutral-400">Buys</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-error-500" />
          <span className="text-neutral-400">Sells</span>
        </div>
      </div>
    </Card>
  );
}

function calculatePrice(supply: number, curveType: string): number {
  const initialPrice = 0.001;
  
  switch (curveType) {
    case 'LINEAR':
      return initialPrice + (supply * 0.000001);
    case 'EXPONENTIAL':
      return initialPrice * Math.pow(1.001, supply);
    case 'SIGMOID':
      const midpoint = 1000000;
      return (initialPrice * 2) / (1 + Math.exp(-0.000001 * (supply - midpoint)));
    default:
      return initialPrice;
  }
}

export default BondingCurveChart;

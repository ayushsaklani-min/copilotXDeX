// Cyberpunk animated polygon background
'use client';

import { useEffect, useRef } from 'react';

interface Polygon {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  vx: number;
  vy: number;
  color: string;
  opacity: number;
  sides: number;
}

export function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const polygonsRef = useRef<Polygon[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize polygons with Polygon-themed colors (purple dominant)
    const colors = ['#8247e5', '#a855f7', '#9333ea', '#c084fc', '#7c3aed']; // Polygon purple variations
    const polygonSides = [3, 4, 5, 6, 8]; // Triangle, square, pentagon, hexagon, octagon
    polygonsRef.current = Array.from({ length: 25 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 70 + 25,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.012,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.3 + 0.1,
      sides: polygonSides[Math.floor(Math.random() * polygonSides.length)],
    }));

    const drawPolygon = (poly: Polygon) => {
      ctx.save();
      ctx.translate(poly.x, poly.y);
      ctx.rotate(poly.rotation);

      ctx.beginPath();
      for (let i = 0; i < poly.sides; i++) {
        const angle = (Math.PI * 2 * i) / poly.sides;
        const x = Math.cos(angle) * poly.size;
        const y = Math.sin(angle) * poly.size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Gradient fill
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, poly.size);
      gradient.addColorStop(0, `${poly.color}${Math.floor(poly.opacity * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${poly.color}00`);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Glowing border
      ctx.strokeStyle = `${poly.color}${Math.floor(poly.opacity * 0.6 * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 20;
      ctx.shadowColor = poly.color;
      ctx.stroke();

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      polygonsRef.current.forEach((poly) => {
        // Update position
        poly.x += poly.vx;
        poly.y += poly.vy;
        poly.rotation += poly.rotationSpeed;

        // Bounce off edges
        if (poly.x < -poly.size) poly.x = canvas.width + poly.size;
        if (poly.x > canvas.width + poly.size) poly.x = -poly.size;
        if (poly.y < -poly.size) poly.y = canvas.height + poly.size;
        if (poly.y > canvas.height + poly.size) poly.y = -poly.size;

        drawPolygon(poly);
      });

      // Draw connections between nearby polygons with Polygon purple theme
      ctx.strokeStyle = 'rgba(130, 71, 229, 0.2)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < polygonsRef.current.length; i++) {
        for (let j = i + 1; j < polygonsRef.current.length; j++) {
          const poly1 = polygonsRef.current[i];
          const poly2 = polygonsRef.current[j];
          const dx = poly1.x - poly2.x;
          const dy = poly1.y - poly2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 220) {
            ctx.beginPath();
            ctx.moveTo(poly1.x, poly1.y);
            ctx.lineTo(poly2.x, poly2.y);
            const gradient = ctx.createLinearGradient(poly1.x, poly1.y, poly2.x, poly2.y);
            gradient.addColorStop(0, poly1.color + '40');
            gradient.addColorStop(1, poly2.color + '40');
            ctx.strokeStyle = gradient;
            ctx.stroke();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'linear-gradient(135deg, #0a0518 0%, #1a0b2e 50%, #2d1b4e 100%)' }}
    />
  );
}
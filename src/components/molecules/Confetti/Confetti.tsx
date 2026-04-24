'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
}

const colors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

const shapes = ['circle', 'square', 'triangle'] as const;

export function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const newPieces: ConfettiPiece[] = [];
    
    for (let i = 0; i < 150; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }
    
    setPieces(newPieces);
    
    const timer = setTimeout(() => {
      setPieces([]);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  const getShapeStyle = (shape: ConfettiPiece['shape']) => {
    switch (shape) {
      case 'circle':
        return 'rounded-full';
      case 'triangle':
        return 'clip-path: polygon(50% 0%, 0% 100%, 100% 100%)';
      default:
        return '';
    }
  };

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}vw`,
            top: `${piece.y}vh`,
            width: '10px',
            height: '10px',
            backgroundColor: piece.color,
            ...(piece.shape === 'triangle' ? { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' } : {}),
            borderRadius: piece.shape === 'circle' ? '50%' : '2px',
          }}
          initial={{
            y: piece.y,
            x: piece.x,
            rotate: piece.rotation,
            scale: piece.scale,
          }}
          animate={{
            y: '100vh',
            x: piece.x + (Math.random() - 0.5) * 50,
            rotate: piece.rotation + 720,
            scale: [piece.scale, piece.scale * 1.2, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
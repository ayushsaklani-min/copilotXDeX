'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-dark-bg-secondary border border-dark-border-primary',
  elevated: 'bg-dark-bg-elevated shadow-xl',
  outlined: 'bg-transparent border-2 border-dark-border-primary',
  glass: 'bg-white/5 backdrop-blur-xl border border-white/10',
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  hover = false,
  children,
  className = '',
  ...props
}) => {
  return (
    <motion.div
      className={`
        rounded-xl
        transition-all duration-200
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hover ? 'hover:shadow-2xl hover:border-primary-500/50 cursor-pointer' : ''}
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -4 } : {}}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;

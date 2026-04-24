import React, { memo } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  glow?: boolean;
  accent?: boolean;
}

const CardComponent = ({ children, className = '', onClick, hover = false, glow = false, accent = false }: CardProps) => {
  return (
    <div
      onClick={onClick}
      className={`
        card-premium gradient-vivid-elegant layer-surface layer-elevated rounded-2xl p-5 md:p-6
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${glow ? 'glow-teal-sm' : ''}
        ${accent ? '!border-teal-500/20' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export const Card = memo(CardComponent);

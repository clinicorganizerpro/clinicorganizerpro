import React, { memo } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'teal';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 shadow-sm glow-subtle',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/15 shadow-sm glow-subtle',
  error: 'bg-red-500/10 text-red-400 border border-red-500/15 shadow-sm glow-subtle',
  info: 'bg-blue-500/10 text-blue-400 border border-blue-500/15 shadow-sm glow-subtle',
  neutral: 'bg-white/5 text-zinc-300 border border-white/10',
  teal: 'bg-teal-500/10 text-teal-400 border border-teal-500/15 shadow-sm glow-subtle-teal',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  neutral: 'bg-zinc-400',
  teal: 'bg-teal-400',
};

const BadgeComponent = ({ children, variant = 'neutral', className = '', dot = false }: BadgeProps) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-medium tracking-tight transition-all duration-200 ${variantClasses[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

export const Badge = memo(BadgeComponent);

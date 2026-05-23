import React, { memo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  accentColor?: 'teal' | 'emerald' | 'blue' | 'amber';
  subtitle?: string;
}

const accentMap = {
  teal: {
    iconClass: 'from-teal-500/18 to-teal-600/8 text-teal-400',
    glowColor: 'rgba(20,184,166,0.1)',
    spotColor: 'rgba(20,184,166,0.12)',
    borderColor: 'rgba(20,184,166,0.14)',
  },
  emerald: {
    iconClass: 'from-emerald-500/18 to-emerald-600/8 text-emerald-400',
    glowColor: 'rgba(16,185,129,0.1)',
    spotColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.14)',
  },
  blue: {
    iconClass: 'from-blue-500/18 to-blue-600/8 text-blue-400',
    glowColor: 'rgba(59,130,246,0.1)',
    spotColor: 'rgba(59,130,246,0.12)',
    borderColor: 'rgba(59,130,246,0.14)',
  },
  amber: {
    iconClass: 'from-amber-500/18 to-amber-600/8 text-amber-400',
    glowColor: 'rgba(245,158,11,0.1)',
    spotColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.14)',
  },
};

const StatCardComponent = ({ title, value, change, icon, accentColor = 'teal', subtitle }: StatCardProps) => {
  const accent = accentMap[accentColor];
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className="card-premium gradient-vivid-elegant layer-surface layer-elevated card-hover relative min-h-[118px] overflow-hidden rounded-xl p-3.5 group sm:min-h-[148px] sm:rounded-2xl sm:p-5"
      style={{
        boxShadow: `0 1px 0 rgba(255,255,255,0.045) inset, 0 -1px 0 rgba(0,0,0,0.25) inset, 0 4px 28px rgba(0,0,0,0.42), 0 0 32px ${accent.glowColor}`,
      }}
    >
      {/* Ambient spot light */}
      <div
        className="absolute right-0 top-0 h-24 w-24 pointer-events-none opacity-45 sm:h-36 sm:w-36 sm:opacity-60"
        style={{
          background: `radial-gradient(ellipse at 85% 15%, ${accent.spotColor}, transparent 65%)`,
        }}
      />
      {/* Bottom left faint glow */}
      <div
        className="absolute bottom-0 left-0 h-16 w-16 pointer-events-none opacity-15 sm:h-24 sm:w-24 sm:opacity-20"
        style={{
          background: `radial-gradient(ellipse at 10% 90%, ${accent.spotColor}, transparent 70%)`,
        }}
      />

      <div className="relative mb-3 flex items-start justify-between gap-2 sm:mb-4">
        <div
          className={`rounded-lg bg-gradient-to-br p-2 ${accent.iconClass} border float-subtle sm:rounded-xl sm:p-2.5`}
          style={{ borderColor: accent.borderColor }}
        >
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold sm:rounded-lg sm:px-2 sm:py-1 sm:text-[11px] ${
            isPositive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
              : 'bg-red-500/10 text-red-400 border border-red-500/15'
          }`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div className="relative">
        <p className="mb-1 break-words text-[20px] font-extrabold leading-tight text-zinc-50 sm:text-[26px] sm:leading-none">{value}</p>
        <p className="text-[11px] font-medium leading-snug text-zinc-500 sm:text-[12px]">{title}</p>
        {subtitle && <p className="mt-1 text-[10px] font-medium leading-snug text-zinc-600 sm:mt-1.5 sm:text-[11px]">{subtitle}</p>}
      </div>
    </div>
  );
};

export const StatCard = memo(StatCardComponent);

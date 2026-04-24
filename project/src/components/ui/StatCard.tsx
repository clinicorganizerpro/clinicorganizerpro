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
      className="card-premium gradient-vivid-elegant layer-surface layer-elevated card-hover rounded-2xl p-5 relative overflow-hidden group"
      style={{
        boxShadow: `0 1px 0 rgba(255,255,255,0.045) inset, 0 -1px 0 rgba(0,0,0,0.25) inset, 0 4px 28px rgba(0,0,0,0.42), 0 0 32px ${accent.glowColor}`,
      }}
    >
      {/* Ambient spot light */}
      <div
        className="absolute top-0 right-0 w-36 h-36 pointer-events-none opacity-60"
        style={{
          background: `radial-gradient(ellipse at 85% 15%, ${accent.spotColor}, transparent 65%)`,
        }}
      />
      {/* Bottom left faint glow */}
      <div
        className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(ellipse at 10% 90%, ${accent.spotColor}, transparent 70%)`,
        }}
      />

      <div className="flex items-start justify-between mb-4 relative">
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${accent.iconClass} border float-subtle`}
          style={{ borderColor: accent.borderColor }}
        >
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${
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
        <p className="text-[26px] font-extrabold text-zinc-50 leading-none tracking-tighter mb-1">{value}</p>
        <p className="text-[12px] text-zinc-500 font-medium tracking-tight">{title}</p>
        {subtitle && <p className="text-[11px] text-zinc-600 mt-1.5 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
};

export const StatCard = memo(StatCardComponent);

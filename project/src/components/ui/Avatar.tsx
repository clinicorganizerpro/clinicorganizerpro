
import { memo } from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function getGradient(name: string): string {
  const gradients = [
    'from-teal-500/30 to-teal-600/20 text-teal-300',
    'from-emerald-500/30 to-emerald-600/20 text-emerald-300',
    'from-blue-500/30 to-blue-600/20 text-blue-300',
    'from-amber-500/30 to-amber-600/20 text-amber-300',
    'from-rose-500/30 to-rose-600/20 text-rose-300',
    'from-cyan-500/30 to-cyan-600/20 text-cyan-300',
  ];
  const idx = name.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

const AvatarComponent = ({ name, src, size = 'md', className = '' }: AvatarProps) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 ring-1 ring-white/10 ${className}`}
      />
    );
  }

  return (
    <div
      className={`
        ${sizeClasses[size]}
        bg-gradient-to-br ${getGradient(name)}
        rounded-full flex items-center justify-center font-semibold
        flex-shrink-0 ring-1 ring-white/10 ${className}
      `}
    >
      {getInitials(name)}
    </div>
  );
};

export const Avatar = memo(AvatarComponent);

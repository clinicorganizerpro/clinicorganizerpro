
import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

const previewSize = 148;

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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!previewPosition) return;

    const close = () => setPreviewPosition(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewPosition]);

  const togglePreview = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (previewPosition) {
      setPreviewPosition(null);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const margin = 12;
    const left = Math.min(
      Math.max(margin, rect.left + rect.width / 2 - previewSize / 2),
      window.innerWidth - previewSize - margin,
    );
    const preferredTop = rect.bottom + 10;
    const top = preferredTop + previewSize + margin > window.innerHeight
      ? Math.max(margin, rect.top - previewSize - 10)
      : preferredTop;

    setPreviewPosition({ left, top });
  };

  if (src) {
    return (
      <>
        <button
          ref={buttonRef}
          type="button"
          onClick={togglePreview}
          className={`${sizeClasses[size]} rounded-full flex-shrink-0 overflow-hidden ring-1 ring-white/10 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400/60 ${className}`}
          aria-label={`Ampliar foto de ${name}`}
          title="Ampliar foto"
        >
          <img src={src} alt={name} className="h-full w-full object-cover" />
        </button>
        {previewPosition && createPortal(
          <button
            type="button"
            className="fixed z-[1000] overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-md"
            style={{ left: previewPosition.left, top: previewPosition.top, width: previewSize, height: previewSize }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setPreviewPosition(null);
            }}
            aria-label="Fechar foto ampliada"
          >
            <img src={src} alt={name} className="avatar-preview-zoom h-full w-full rounded-xl object-cover" />
          </button>,
          document.body,
        )}
      </>
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

import { ChevronLeft } from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';
import type { PageId } from '../../hooks/useNavigation';

type BackButtonProps = {
  to?: PageId;
  label?: string;
  className?: string;
  onClick?: () => void;
};

export function BackButton({ to = 'dashboard', label = 'Voltar', className = '', onClick }: BackButtonProps) {
  const { navigate } = useLayout();

  return (
    <button
      type="button"
      onClick={() => { if (onClick) onClick(); else navigate(to); }}
      aria-label={label}
      className={[
        'inline-flex items-center gap-2',
        'px-3 py-1.5 rounded-xl',
        'text-[12px] font-semibold tracking-tight',
        'border border-teal-500/25',
        'bg-teal-500/10 backdrop-blur',
        'shadow-[0_10px_28px_rgba(20,184,166,0.14)]',
        'hover:bg-teal-500/15 hover:border-teal-500/35 hover:shadow-[0_14px_40px_rgba(20,184,166,0.18)]',
        'active:translate-y-[1px]',
        'transition-all duration-200 select-none',
        className,
      ].join(' ')}
      style={{
        background: 'linear-gradient(135deg, rgba(20,184,166,0.16), rgba(13,148,136,0.06))',
      }}
    >
      <ChevronLeft size={14} className="text-teal-300" />
      <span className="text-zinc-200">{label}</span>
    </button>
  );
}

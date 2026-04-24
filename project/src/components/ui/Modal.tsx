import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open?: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
  footer?: ReactNode;
}

export function Modal({ open = true, onClose, title, subtitle, children, maxWidth = 'max-w-xl', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} rounded-2xl scale-in flex flex-col layer-surface`}
        style={{
          background: 'linear-gradient(145deg, rgba(20,22,30,0.98) 0%, rgba(12,13,19,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 34px 84px rgba(0,0,0,0.66), 0 0 24px rgba(20,184,166,0.08), 0 1px 0 rgba(255,255,255,0.05) inset',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h2 className="text-[16px] font-bold text-zinc-100 tracking-tight">{title}</h2>
            {subtitle && <p className="text-[12px] text-zinc-600 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200 hover:scale-[1.02] flex-shrink-0 ml-4"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

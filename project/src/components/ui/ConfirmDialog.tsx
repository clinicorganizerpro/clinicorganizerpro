import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, description, confirmLabel = 'Confirmar', onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 scale-in layer-surface"
        style={{
          background: 'linear-gradient(145deg, rgba(20,22,30,0.98) 0%, rgba(13,14,19,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 26px 68px rgba(0,0,0,0.62), 0 0 22px rgba(244,63,94,0.09)',
        }}
      >
        <button onClick={onCancel} className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-400 transition-all duration-200 hover:scale-[1.02]">
          <X size={16} />
        </button>
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-zinc-100 tracking-tight mb-1">{title}</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

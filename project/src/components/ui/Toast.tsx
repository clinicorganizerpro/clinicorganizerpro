import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { Toast } from '../../types';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const icons = {
  success: <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />,
  error: <XCircle size={15} className="text-red-400 flex-shrink-0" />,
  warning: <AlertCircle size={15} className="text-amber-400 flex-shrink-0" />,
  info: <Info size={15} className="text-blue-400 flex-shrink-0" />,
};

const borders: Record<Toast['type'], string> = {
  success: 'rgba(16,185,129,0.25)',
  error: 'rgba(244,63,94,0.25)',
  warning: 'rgba(245,158,11,0.25)',
  info: 'rgba(59,130,246,0.25)',
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl scale-in layer-surface"
          style={{
            background: 'rgba(13,14,20,0.97)',
            border: `1px solid ${borders[toast.type]}`,
            boxShadow: '0 10px 34px rgba(0,0,0,0.52), 0 0 16px rgba(20,184,166,0.08), 0 1px 0 rgba(255,255,255,0.05) inset',
            backdropFilter: 'blur(20px)',
            maxWidth: '340px',
          }}
        >
          {icons[toast.type]}
          <p className="text-[13px] font-medium text-zinc-200 flex-1 tracking-tight">{toast.message}</p>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-zinc-600 hover:text-zinc-400 transition-all duration-200 hover:scale-[1.02] ml-2 flex-shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

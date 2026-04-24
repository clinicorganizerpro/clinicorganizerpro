import { Calendar, DollarSign, Megaphone, MessageCircle, Users } from 'lucide-react';
import type { PageId } from '../../hooks/useNavigation';

interface QuickActionsBarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const quickActions: Array<{
  label: string;
  page: PageId;
  icon: typeof Users;
  iconClassName: string;
}> = [
  {
    label: 'Novo Paciente',
    page: 'pacientes',
    icon: Users,
    iconClassName: 'text-teal-400/90',
  },
  {
    label: 'Agendar',
    page: 'agenda',
    icon: Calendar,
    iconClassName: 'text-blue-400/90',
  },
  {
    label: 'Financeiro',
    page: 'financeiro',
    icon: DollarSign,
    iconClassName: 'text-emerald-400/90',
  },
  {
    label: 'WhatsApp',
    page: 'whatsapp',
    icon: MessageCircle,
    iconClassName: 'text-sky-400/90',
  },
  {
    label: 'Marketing',
    page: 'marketing',
    icon: Megaphone,
    iconClassName: 'text-orange-400/90',
  },
];

export function QuickActionsBar({ currentPage, onNavigate }: QuickActionsBarProps) {
  return (
    <div
      className="mb-4 rounded-2xl px-3 py-2.5"
      style={{
        background: 'rgba(255,255,255,0.018)',
        border: '1px solid rgba(255,255,255,0.045)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Ações rápidas
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {quickActions.map(({ label, page, icon: Icon, iconClassName }) => {
          const isCurrent = currentPage === page;

          return (
            <button
              key={`${label}-${page}`}
              type="button"
              onClick={() => onNavigate(isCurrent ? 'dashboard' : page)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-2.5 py-2 text-center transition-all ${
                isCurrent
                  ? 'border-white/10 bg-white/[0.04] opacity-70'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={14} className={iconClassName} />
              <span className="text-[11px] font-medium text-zinc-400">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

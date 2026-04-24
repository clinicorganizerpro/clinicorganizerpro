import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Megaphone,
} from 'lucide-react';
import { PageId } from '../../hooks/useNavigation';
import clinicOrganizerLogo from '../../assets/clinic-organizer-pro-logo.svg';
import { useApp } from '../../context/useApp';

type SidebarAppContext = {
  theme: 'light' | 'dark';
  t: (key: string, fallback?: string) => string;
  clinicProfile?: {
    clinicName?: string;
    address?: string;
  } | null;
  toggleTheme?: () => void;
  signOut: () => Promise<void>;
};

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isOpen: boolean;
  isDesktopCollapsed?: boolean;
  onToggleDesktopSidebar?: () => void;
  onClose: () => void;
}

const navItems = [
  { id: 'dashboard' as PageId, labelKey: 'sidebar.dashboard', fallback: 'Dashboard', icon: LayoutDashboard },
  { id: 'agenda' as PageId, labelKey: 'sidebar.agenda', fallback: 'Agenda', icon: Calendar },
  { id: 'pacientes' as PageId, labelKey: 'sidebar.patients', fallback: 'Pacientes', icon: Users },
  { id: 'financeiro' as PageId, labelKey: 'sidebar.financial', fallback: 'Financeiro', icon: DollarSign },
  { id: 'whatsapp' as PageId, labelKey: 'sidebar.whatsapp', fallback: 'WhatsApp', icon: MessageCircle },
  { id: 'marketing' as PageId, labelKey: 'sidebar.marketing', fallback: 'Marketing', icon: Megaphone },
  { id: 'configuracoes' as PageId, labelKey: 'sidebar.settings', fallback: 'Configurações', icon: Settings },
];

export function Sidebar({
  currentPage,
  onNavigate,
  isOpen,
  isDesktopCollapsed = false,
  onToggleDesktopSidebar,
  onClose,
}: SidebarProps) {
  const app = useApp() as unknown as SidebarAppContext;
  const { theme, t, clinicProfile } = app;

  const clinicName = clinicProfile?.clinicName ?? t('sidebar.clinicName', 'Clínica Estética');
  const clinicAddress = clinicProfile?.address ?? t('sidebar.clinicAddress', 'Av. Paulista, 1000 - São Paulo, SP');
  const clinicInitials = clinicName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CL';

  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-full z-40 flex flex-col
          transition-all duration-300 ease-out
          lg:translate-x-0
          ${isDesktopCollapsed ? 'lg:w-[4.5rem]' : 'w-64'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: theme === 'light'
            ? 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(243,246,250,0.98) 100%)'
            : 'linear-gradient(180deg, rgba(9,9,11,0.98) 0%, rgba(11,11,14,0.99) 100%)',
          borderRight: theme === 'light'
            ? '1px solid rgba(15,23,42,0.08)'
            : '1px solid rgba(255,255,255,0.055)',
          boxShadow: theme === 'light'
            ? '4px 0 24px rgba(15,23,42,0.08)'
            : '4px 0 24px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: theme === 'light'
              ? 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.07) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.04) 0%, transparent 60%)',
          }}
        />

        <div
          className={`relative ${isDesktopCollapsed ? 'px-2 py-4' : 'px-2 py-3'}`}
          style={{ borderBottom: theme === 'light' ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className={`flex ${isDesktopCollapsed ? 'justify-center mb-2' : 'justify-end mb-2'}`}>
            <div
              className="flex items-center gap-2 rounded-lg backdrop-blur-sm"
              style={{ background: theme === 'light' ? 'rgba(15,23,42,0.05)' : 'rgba(0,0,0,0.25)' }}
            >
              <button
                type="button"
                onClick={onToggleDesktopSidebar}
                className={`hidden lg:flex p-1.5 rounded-lg transition-all ${theme === 'light' ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-900/5' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}
                aria-label={isDesktopCollapsed ? t('sidebar.expandSidebar', 'Expandir sidebar') : t('sidebar.collapseSidebar', 'Colapsar sidebar')}
                title={isDesktopCollapsed ? t('sidebar.expandSidebar', 'Expandir sidebar') : t('sidebar.collapseSidebar', 'Colapsar sidebar')}
              >
                {isDesktopCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
              <button
                onClick={onClose}
                className={`lg:hidden p-1.5 rounded-lg transition-all ${theme === 'light' ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-900/5' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div
            className={`${isDesktopCollapsed ? 'h-14 flex items-center justify-center' : 'w-full flex items-center justify-center px-1'}`}
          >
            <img
              src={clinicOrganizerLogo}
              alt="Clinic Organizer Pro"
              className={`${isDesktopCollapsed ? 'w-10 h-10 object-contain' : 'block w-full h-auto object-contain object-center'}`}
            />
          </div>
        </div>

        <nav className="relative flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, labelKey, fallback, icon: Icon }) => {
            const isActive = currentPage === id;
            return (
              <button
                key={id}
                onClick={() => handleNavigate(id)}
                className={`
                  w-full flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 group relative
                  ${isDesktopCollapsed ? 'justify-center px-2' : 'px-3'}
                  ${isActive ? 'sidebar-item-active text-teal-300' : theme === 'light' ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-500 hover:text-zinc-200'}
                `}
                style={!isActive ? undefined : undefined}
              >
                {!isActive && (
                  <span
                    className="absolute inset-0 rounded-xl transition-all duration-150"
                    style={{ background: 'transparent' }}
                  />
                )}
                <Icon
                  size={17}
                  className={`flex-shrink-0 transition-colors ${isActive ? 'text-teal-400' : theme === 'light' ? 'text-slate-400 group-hover:text-slate-600' : 'text-zinc-600 group-hover:text-zinc-400'}`}
                />
                {!isDesktopCollapsed && <span className="flex-1 text-left tracking-tight">{t(labelKey, fallback)}</span>}
                {isActive && !isDesktopCollapsed && (
                  <ChevronRight size={13} className="text-teal-500 opacity-70" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="relative px-3 py-4 space-y-3" style={{ borderTop: theme === 'light' ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.05)' }}>
          <div
            className={`flex items-center gap-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 group ${isDesktopCollapsed ? 'justify-center px-2' : 'px-3'}`}
            style={{ background: theme === 'light' ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.02)' }}
            title={`${clinicName} • ${clinicAddress}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-teal-300 flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(20,184,166,0.25), rgba(13,148,136,0.15))',
                border: '1px solid rgba(20,184,166,0.2)',
              }}
            >
              {clinicInitials}
            </div>
            {!isDesktopCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate tracking-tight ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>{clinicName}</p>
                  <p className={`text-xs truncate ${theme === 'light' ? 'text-slate-500' : 'text-zinc-600'}`}>{clinicAddress}</p>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
              </>
            )}
          </div>

        </div>
      </aside>
    </>
  );
}

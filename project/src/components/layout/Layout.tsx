import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { PageId } from '../../hooks/useNavigation';
import { useApp } from '../../context/useApp';

interface LayoutProps {
  children?: ReactNode;
  currentPage?: PageId;
  onNavigate?: (page: PageId) => void;
  sidebarOpen?: boolean;
  desktopSidebarCollapsed?: boolean;
  onToggleDesktopSidebar?: () => void;
  onOpenSidebar?: () => void;
  onCloseSidebar?: () => void;
}

const noop = () => {};

const navigateNoop = (page: PageId) => {
  void page;
};

export function Layout({
  children = null,
  currentPage = 'dashboard',
  onNavigate = navigateNoop,
  sidebarOpen = false,
  desktopSidebarCollapsed = false,
  onToggleDesktopSidebar = noop,
  onOpenSidebar = noop,
  onCloseSidebar = noop,
}: LayoutProps = {}) {
  const app = useApp() as { theme?: 'light' | 'dark' };
  const theme = app.theme ?? 'light';

  return (
    <div
      className="layout min-h-screen bg-mesh relative overflow-hidden"
      style={{ backgroundColor: theme === 'light' ? '#F7F9FB' : '#06070a' }}
    >
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        isDesktopCollapsed={desktopSidebarCollapsed}
        onToggleDesktopSidebar={onToggleDesktopSidebar}
        onClose={onCloseSidebar}
      />

      {!sidebarOpen && (
        <button
          type="button"
          onClick={onOpenSidebar}
          className="fixed left-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-zinc-200 shadow-lg backdrop-blur-xl transition hover:scale-[1.02] active:scale-[0.98] lg:hidden"
          style={{
            background: theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(13,14,19,0.9)',
            borderColor: theme === 'light' ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.09)',
            color: theme === 'light' ? '#334155' : '#e4e4e7',
            boxShadow: theme === 'light'
              ? '0 10px 24px rgba(15,23,42,0.12)'
              : '0 10px 24px rgba(0,0,0,0.38)',
          }}
          aria-label="Abrir menu lateral"
          title="Menu"
        >
          <Menu size={19} />
        </button>
      )}

      <div className={`content min-h-screen h-auto flex flex-col justify-start transition-all duration-300 relative z-0 ${desktopSidebarCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64'}`}>
        <main className="flex-1 flex flex-col justify-start h-auto px-4 pt-16 pb-6 md:px-6 md:pt-6 md:pb-7 lg:px-8 lg:pt-6 lg:pb-7 overflow-x-hidden">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

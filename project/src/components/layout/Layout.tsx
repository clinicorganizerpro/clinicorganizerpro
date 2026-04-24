import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { PageId } from '../../hooks/useNavigation';

interface LayoutProps {
  children?: ReactNode;
  currentPage?: PageId;
  onNavigate?: (page: PageId) => void;
  sidebarOpen?: boolean;
  desktopSidebarCollapsed?: boolean;
  onToggleDesktopSidebar?: () => void;
  onCloseSidebar?: () => void;
}

const noop = () => {};

const navigateNoop = (_page: PageId) => {};

export function Layout({
  children = null,
  currentPage = 'dashboard',
  onNavigate = navigateNoop,
  sidebarOpen = false,
  desktopSidebarCollapsed = false,
  onToggleDesktopSidebar = noop,
  onCloseSidebar = noop,
}: LayoutProps = {}) {
  return (
    <div className="layout min-h-screen bg-mesh relative overflow-hidden" style={{ backgroundColor: '#06070a' }}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        isDesktopCollapsed={desktopSidebarCollapsed}
        onToggleDesktopSidebar={onToggleDesktopSidebar}
        onClose={onCloseSidebar}
      />

      <div className={`content min-h-screen h-auto flex flex-col justify-start transition-all duration-300 relative z-0 ${desktopSidebarCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64'}`}>
        <main className="flex-1 flex flex-col justify-start h-auto px-4 pt-6 pb-6 md:px-6 md:pt-6 md:pb-7 lg:px-8 lg:pt-6 lg:pb-7 overflow-x-hidden">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

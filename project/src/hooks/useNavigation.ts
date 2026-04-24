import { useState } from 'react';

export type PageId = 'dashboard' | 'agenda' | 'pacientes' | 'financeiro' | 'whatsapp' | 'marketing' | 'configuracoes';

export function useNavigation() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  return {
    currentPage,
    setCurrentPage,
    sidebarOpen,
    setSidebarOpen,
    desktopSidebarCollapsed,
    setDesktopSidebarCollapsed,
    toggleSidebar: () => setSidebarOpen((v) => !v),
    toggleDesktopSidebar: () => setDesktopSidebarCollapsed((v) => !v),
  };
}

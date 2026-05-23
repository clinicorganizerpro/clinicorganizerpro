import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { PageId } from '../hooks/useNavigation';

interface LayoutContextType {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  // Navigate with optional params (e.g. { date: 'YYYY-MM-DD' })
  navigate: (page: PageId, params?: Record<string, unknown> | null) => void;
  // Parameters provided for the currently active page (or null)
  pageParams: Record<string, unknown> | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  desktopSidebarCollapsed: boolean;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleDesktopSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [pageParams, setPageParams] = useState<Record<string, unknown> | null>(null);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const toggleDesktopSidebar = useCallback(() => {
    setDesktopSidebarCollapsed((prev) => !prev);
  }, []);

  const handleSetCurrentPage = useCallback((page: PageId) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  }, []);

  const navigate = useCallback((page: PageId, params?: Record<string, unknown> | null) => {
    handleSetCurrentPage(page);
    setPageParams(params ?? null);
  }, [handleSetCurrentPage]);

  const value: LayoutContextType = {
    currentPage,
    setCurrentPage: handleSetCurrentPage,
    navigate,
    pageParams,
    sidebarOpen,
    setSidebarOpen,
    desktopSidebarCollapsed,
    setDesktopSidebarCollapsed,
    toggleSidebar,
    toggleDesktopSidebar,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextType {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

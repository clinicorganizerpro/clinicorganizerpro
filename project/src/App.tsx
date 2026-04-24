import { Loader2 } from 'lucide-react';
import { Layout } from './components/layout/Layout';
import { AppProvider, useApp } from './context/AppContext';
import { LayoutProvider, useLayout } from './context/LayoutContext';
import type { PageId } from './hooks/useNavigation';
import { Agenda } from './pages/Agenda';
import AdminPanel from './pages/AdminPanel';
import { Configuracoes } from './pages/Configuracoes';
import { Dashboard } from './pages/Dashboard';
import { Financeiro } from './pages/Financeiro';
import { Marketing } from './pages/Marketing';
import { Pacientes } from './pages/Pacientes';
import { WhatsApp } from './pages/WhatsApp';
import AuthPage from './pages/AuthPage';

type AppState = {
  session: unknown;
  adminSession: { email: string; role: 'admin' } | null;
  authReady: boolean;
};

function renderPage(currentPage: PageId) {
  switch (currentPage) {
    case 'agenda':
      return <Agenda />;
    case 'pacientes':
      return <Pacientes />;
    case 'financeiro':
      return <Financeiro />;
    case 'whatsapp':
      return <WhatsApp />;
    case 'marketing':
      return <Marketing />;
    case 'configuracoes':
      return <Configuracoes />;
    default:
      return <Dashboard />;
  }
}

function AppShell() {
  const { session, adminSession, authReady } = useApp() as AppState;
  const layout = useLayout();

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          <span className="text-sm font-medium">Loading your workspace…</span>
        </div>
      </main>
    );
  }

  if (adminSession) {
    return <AdminPanel />;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <Layout
      currentPage={layout.currentPage}
      onNavigate={layout.setCurrentPage}
      sidebarOpen={layout.sidebarOpen}
      desktopSidebarCollapsed={layout.desktopSidebarCollapsed}
      onToggleDesktopSidebar={layout.toggleDesktopSidebar}
      onCloseSidebar={() => layout.setSidebarOpen(false)}
    >
      {renderPage(layout.currentPage)}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <LayoutProvider>
        <AppShell />
      </LayoutProvider>
    </AppProvider>
  );
}

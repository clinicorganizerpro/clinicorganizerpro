import { Loader2 } from 'lucide-react';
import { Layout } from './components/layout/Layout';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import { LayoutProvider, useLayout } from './context/LayoutContext';
import type { PageId } from './hooks/useNavigation';
import { Agenda } from './pages/Agenda';
import AdminPanel from './pages/AdminPanel';
import { Configuracoes } from './pages/Configuracoes';
import { Dashboard } from './pages/Dashboard';
import { Financeiro } from './pages/Financeiro';
import { Marketing } from './pages/Marketing';
import { Pacientes } from './pages/Pacientes';
import { Planos } from './pages/Planos';
import { WhatsApp } from './pages/WhatsApp';
import { Chatbot } from './pages/Chatbot';
import AuthPage from './pages/AuthPage';
import { FloatingChatbot } from './components/chat/FloatingChatbot';

type AppState = {
  session: unknown;
  user?: unknown | null;
  adminSession: { email: string; role: 'admin' } | null;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    clinicId?: string;
    clinicName: string;
    phone: string;
    cnpj: string;
    cep: string;
    address: string;
    addressNumber: string;
    city: string;
    state: string;
  }) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;
};

function renderPage(currentPage: PageId) {
  switch (currentPage) {
    case 'agenda':
      return <Agenda />;
    case 'pacientes':
      return <Pacientes />;
    case 'financeiro':
      return <Financeiro />;
    case 'planos':
      return <Planos />;
    case 'whatsapp':
      return <WhatsApp />;
    case 'marketing':
      return <Marketing />;
    case 'configuracoes':
      return <Configuracoes />;
    case 'chatbot':
      return <Chatbot />;
    default:
      return <Dashboard />;
  }
}

function AppShell() {
  const { session, user, adminSession, authReady, signIn, signUp } = useApp() as AppState;
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

  // Fluxo do login "local JWT" do backend: `user` pode existir enquanto `session` fica null.
  const isAuthenticated = Boolean(user);

  if (!session && !isAuthenticated) {
    return (
      <AuthPage
        signIn={signIn}
        signUp={signUp}
      />
    );
  }

  return (
    <Layout
      currentPage={layout.currentPage}
      onNavigate={layout.setCurrentPage}
      sidebarOpen={layout.sidebarOpen}
      desktopSidebarCollapsed={layout.desktopSidebarCollapsed}
      onToggleDesktopSidebar={layout.toggleDesktopSidebar}
      onOpenSidebar={() => layout.setSidebarOpen(true)}
      onCloseSidebar={() => layout.setSidebarOpen(false)}
    >
      {renderPage(layout.currentPage)}
      <FloatingChatbot />
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

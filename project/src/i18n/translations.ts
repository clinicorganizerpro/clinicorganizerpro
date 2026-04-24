export const translations = {
  common: {
    search: 'Buscar...',
    professional: 'Profissional',
    clinicTeam: 'Equipe da clínica',
    close: 'Fechar',
    closeNotifications: 'Fechar notificações',
    noNotifications: 'Nenhuma notificação',
    notificationsWillAppear: 'Novos avisos aparecerão aqui.',
    thisWeek: 'Esta semana',
    systemActive: 'Sistema ativo',
    lightMode: 'Modo claro',
    darkMode: 'Modo escuro',
    theme: 'Tema',
    language: 'Idioma',
    portuguese: 'Português',
    english: 'Inglês',
    spanish: 'Espanhol',
    french: 'Francês',
    minutes: 'minutos',
    cancel: 'Cancelar',
  },
  sidebar: {
    dashboard: 'Dashboard',
    agenda: 'Agenda',
    patients: 'Pacientes',
    financial: 'Financeiro',
    whatsapp: 'WhatsApp',
    marketing: 'Marketing',
    settings: 'Configurações',
    expandSidebar: 'Expandir sidebar',
    collapseSidebar: 'Colapsar sidebar',
    clinicName: 'Clínica Estética',
  },
  topbar: {
    notifications: 'Notificações',
    openNotifications: 'Abrir notificações',
    appointment: 'Consulta',
    payment: 'Pagamento',
    alert: 'Alerta',
    info: 'Informação',
  },
  pages: {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Visão geral da clínica',
      greetingMorning: 'Bom dia',
      greetingAfternoon: 'Boa tarde',
      greetingEvening: 'Boa noite',
      readyMessage:
        'Sistema pronto para começar. Todos os recursos estão disponíveis no menu lateral:',
      readyMessageHighlight:
        'Dashboard, Agenda, Pacientes, Financeiro, WhatsApp, Marketing e Configurações',
      totalPatients: 'Total de Pacientes',
      clickPatientsToAdd: "Clique em 'Pacientes' para adicionar",
      appointmentsToday: 'Consultas Hoje',
      scheduled: 'agendadas',
      monthlyRevenue: 'Receita do Mês',
      seeFinancial: 'Veja o Financeiro',
      occupancyRate: 'Taxa de Ocupação',
      appointmentsAgenda: 'Agenda de consultas',
      weeklyOccupancy: 'Ocupação Semanal',
      noDataAddAppointments: 'Sem dados - Adicione consultas para visualizar',
      financialSummary: 'Resumo Financeiro',
      confirmedRevenue: 'Receita Confirmada',
      pending: 'Pendente',
      netBalance: 'Saldo Líquido',
      upcomingAppointments: 'Próximas Consultas',
      noAppointmentsScheduled: 'Nenhuma consulta agendada',
      noAppointmentsToday: 'Nenhuma consulta para hoje',
      goToAgendaToSchedule: 'Vá para "Agenda" para agendar',
      recentPatients: 'Pacientes Recentes',
      noPatientsRegistered: 'Nenhum paciente cadastrado',
      emptySystem: 'Sistema vazio',
      goToPatientsToStart: 'Vá para "Pacientes" para começar',
      featureLocations: 'Localização das Funções',
      featureLocationsSubtitle:
        'Encontre cada recurso no menu lateral e navegue rapidamente.',
      dashboardDescription: 'Visão geral da clínica e indicadores principais.',
      agendaDescription:
        'Gerencie consultas, horários e disponibilidade dos profissionais.',
      patientsDescription: 'Cadastre e acompanhe seus pacientes em um só lugar.',
      financialDescription: 'Controle receitas, despesas e relatórios financeiros.',
      whatsappDescription: 'Envie mensagens automatizadas para seus pacientes.',
      marketingDescription: 'Crie campanhas e acompanhe comunicação com clientes.',
      settingsDescription: 'Ajuste preferências do sistema e da sua conta.',
    },
    agenda: {
      title: 'Agenda',
      subtitle: 'Consultas e procedimentos',
    },
    pacientes: {
      title: 'Pacientes',
      subtitle: 'Gestão de pacientes',
    },
    financeiro: {
      title: 'Financeiro',
      subtitle: 'Receitas e despesas',
    },
    whatsapp: {
      title: 'WhatsApp Automático',
      subtitle: 'Automações e mensagens',
    },
    marketing: {
      title: 'Marketing',
      subtitle: 'Campanhas e comunicação',
    },
    configuracoes: {
      title: 'Configurações',
      subtitle: 'Preferências e conta',
    },
  },
} as const;

export type TranslationDictionary = typeof translations;

export function getNestedTranslation(path: string, fallback?: string): string {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, translations);

  if (typeof value === 'string') return value;
  return fallback ?? path;
}

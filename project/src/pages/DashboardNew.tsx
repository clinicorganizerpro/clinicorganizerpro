import { useState } from 'react';
import { CalendarDays, CalendarRange, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/useApp';

interface DashboardProps {
  onQuickActionNavigate: (page: string) => void;
}

type DashboardAppState = {
  selectedProfessional?: {
    name?: string;
  } | null;
  theme: 'light' | 'dark';
};

function capitalize(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Dashboard({ onQuickActionNavigate }: DashboardProps) {
  const { selectedProfessional, theme } = useApp() as DashboardAppState;
  const [isOccupancyModalOpen, setIsOccupancyModalOpen] = useState(false);

  const isDark = theme === 'dark';
  const locale = 'pt-BR';

  const formattedDate = capitalize(
    new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
      .format(new Date())
      .replace('.', '')
  );

  const professionalName = selectedProfessional?.name || 'Dra. Camila';
  const greeting = getGreeting();

  const containerClass = isDark ? 'text-white' : 'text-slate-900';
  const panelClass = isDark
    ? 'border border-white/[0.05] bg-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]'
    : 'border border-slate-200 bg-white shadow-sm';
  const softTextClass = isDark ? 'text-zinc-400' : 'text-slate-500';
  const mutedTextClass = isDark ? 'text-zinc-500' : 'text-slate-400';
  const activeChipClass = isDark
    ? 'border border-emerald-400/10 bg-emerald-400/5 text-emerald-300'
    : 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  const dateChipClass = isDark
    ? 'border border-cyan-400/10 bg-cyan-400/10 text-cyan-300'
    : 'border border-cyan-200 bg-cyan-50 text-cyan-700';

  const weeklyData = [
    { day: 'Seg', fullDay: 'Segunda-feira', value: 0, active: false },
    { day: 'Ter', fullDay: 'Terça-feira', value: 0, active: false },
    { day: 'Qua', fullDay: 'Quarta-feira', value: 0, active: false },
    { day: 'Qui', fullDay: 'Quinta-feira', value: 0, active: false },
    { day: 'Sex', fullDay: 'Sexta-feira', value: 0, active: false },
    { day: 'Sáb', fullDay: 'Sábado', value: 0, active: false },
    { day: 'Dom', fullDay: 'Domingo', value: 0, active: false },
  ];

  const totalWeeklyAppointments = weeklyData.reduce((sum, item) => sum + item.value, 0);
  const weeklyAverageOccupancy =
    totalWeeklyAppointments === 0 ? 0 : Math.round(totalWeeklyAppointments / weeklyData.length);
  const peakDay = weeklyData.find((item) => item.value === Math.max(...weeklyData.map((d) => d.value)));

  const stats = [
    {
      title: 'Total de Pacientes',
      value: '0',
      subtitle: 'Sem pacientes cadastrados',
      trend: '↔ 0%',
      icon: Users,
      iconWrap: isDark ? 'bg-emerald-400/12 text-emerald-300' : 'bg-emerald-50 text-emerald-600',
      trendClass: isDark ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
      glowClass: isDark ? 'from-emerald-400/12 to-transparent' : 'from-emerald-100 to-transparent',
      onClick: () => onQuickActionNavigate('pacientes'),
      actionLabel: 'Abrir pacientes',
    },
    {
      title: 'Consultas Hoje',
      value: '0',
      subtitle: 'Nenhuma consulta agendada',
      trend: '• Agenda',
      icon: CalendarDays,
      iconWrap: isDark ? 'bg-blue-400/12 text-blue-300' : 'bg-blue-50 text-blue-600',
      trendClass: isDark ? 'bg-blue-400/10 text-blue-300' : 'bg-blue-50 text-blue-700',
      glowClass: isDark ? 'from-blue-400/12 to-transparent' : 'from-blue-100 to-transparent',
      onClick: () => onQuickActionNavigate('agenda'),
      actionLabel: 'Abrir agenda',
    },
    {
      title: 'Receita do Mês',
      value: 'R$ 0,00',
      subtitle: 'R$ 0,00 pendente',
      trend: '↔ 0%',
      icon: DollarSign,
      iconWrap: isDark ? 'bg-emerald-400/12 text-emerald-300' : 'bg-emerald-50 text-emerald-600',
      trendClass: isDark ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
      glowClass: isDark ? 'from-emerald-400/12 to-transparent' : 'from-emerald-100 to-transparent',
      onClick: () => onQuickActionNavigate('financeiro'),
      actionLabel: 'Abrir financeiro',
    },
    {
      title: 'Taxa de Ocupação',
      value: '0%',
      subtitle: 'Média semanal zerada',
      trend: '↔ 0%',
      icon: TrendingUp,
      iconWrap: isDark ? 'bg-amber-400/12 text-amber-300' : 'bg-amber-50 text-amber-600',
      trendClass: isDark ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
      glowClass: isDark ? 'from-amber-400/12 to-transparent' : 'from-amber-100 to-transparent',
      onClick: () => setIsOccupancyModalOpen(true),
      actionLabel: 'Ver detalhes',
    },
  ];

  const financialRows = [
    {
      label: 'Receitas',
      value: 'R$ 0,00',
      barClass: 'bg-emerald-400',
      textClass: isDark ? 'text-emerald-400' : 'text-emerald-600',
      width: '0%',
    },
    {
      label: 'Despesas',
      value: 'R$ 0,00',
      barClass: 'bg-rose-500',
      textClass: isDark ? 'text-rose-400' : 'text-rose-600',
      width: '0%',
    },
    {
      label: 'Pendentes',
      value: 'R$ 0,00',
      barClass: 'bg-amber-400',
      textClass: isDark ? 'text-amber-400' : 'text-amber-600',
      width: '0%',
    },
  ];

  const peakDayLabel = peakDay ? peakDay.fullDay : 'Sem movimentação';

  return (
    <div className={`space-y-6 ${containerClass}`}>
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${dateChipClass}`}>
            {formattedDate}
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {greeting}, {professionalName}
            </h2>
            <p className={`mt-2 text-base ${softTextClass}`}>
              Você tem <span className="font-semibold text-white dark:text-white">0 consultas</span> agendadas para hoje.
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-medium ${activeChipClass}`}>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          Sistema ativo
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <button
              key={stat.title}
              type="button"
              onClick={stat.onClick}
              className={`group relative flex min-h-[108px] flex-col overflow-hidden rounded-xl border p-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 md:p-3 ${panelClass}`}
              aria-label={stat.actionLabel}
            >
              <div className={`pointer-events-none absolute inset-0 bg-emerald-400/5`} />
              <div className="relative flex items-start justify-between gap-1.5">
                <div className={`rounded-lg p-1.5 ${stat.iconWrap}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${stat.trendClass}`}>
                  {stat.trend}
                </div>
              </div>

              <div className="relative mt-3 flex flex-1 flex-col justify-end">
                <div className="text-xl font-bold tracking-tight md:text-2xl">{stat.value}</div>
                <div className={`mt-0.5 text-[11px] font-medium ${softTextClass}`}>{stat.title}</div>
                <div className={`mt-0.5 text-[10px] leading-4 ${mutedTextClass}`}>{stat.subtitle}</div>
              </div>
            </button>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <article className={`rounded-[28px] p-5 md:p-6 ${panelClass}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Ocupação Semanal</h3>
              <p className={`mt-1 text-sm ${softTextClass}`}>Comparativo de consultas por dia</p>
            </div>

            <div className={`inline-flex items-center gap-2 self-start rounded-xl px-4 py-2 text-sm font-semibold ${dateChipClass}`}>
              <CalendarRange className="h-4 w-4" />
              Esta semana
            </div>
          </div>

          <div className="mt-10">
            <div className="flex h-[180px] items-end justify-between gap-3">
              {weeklyData.map((item) => (
                <div key={item.day} className="flex flex-1 flex-col items-center justify-end gap-4">
                  <div className="flex h-[140px] w-full items-end justify-center">
                    {item.value > 0 ? (
                      <div className="h-full w-full max-w-[92px] rounded-[18px] bg-transparent">
                        <div
                          className="mx-auto rounded-[14px] bg-cyan-300 shadow-[0_0_32px_rgba(45,212,191,0.35)]"
                          style={{ height: `${item.value}%`, width: '72px' }}
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-full max-w-[72px] rounded-[14px] ${isDark ? 'bg-white/[0.03]' : 'bg-slate-100'}`}
                        style={{ height: '10%' }}
                      />
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${item.active ? 'text-cyan-300' : softTextClass}`}>
                    {item.day}
                  </span>
                </div>
              ))}
            </div>

            <div className={`mt-6 border-t pt-5 ${isDark ? 'border-white/[0.05]' : 'border-slate-200'}`}>
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className={softTextClass}>Meta semanal: 0 consultas</span>
                <span className="font-semibold text-cyan-300">0% atingido</span>
              </div>
            </div>
          </div>
        </article>

        <article className={`rounded-[28px] p-5 md:p-6 ${panelClass}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Resumo Financeiro</h3>
              <p className={`mt-1 text-sm ${softTextClass}`}>Abril 2024</p>
            </div>

            <button type="button" className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200">
              Ver ↗
            </button>
          </div>

          <div className="mt-8 space-y-6">
            {financialRows.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className={`text-base ${softTextClass}`}>{item.label}</span>
                  <span className={`text-xl font-bold ${item.textClass}`}>{item.value}</span>
                </div>

                <div className={`h-2 rounded-full ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
                  <div className={`h-2 rounded-full ${item.barClass}`} style={{ width: item.width }} />
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-12 border-t pt-6 ${isDark ? 'border-white/[0.05]' : 'border-slate-200'}`}>
            <div className="flex items-end justify-between gap-4">
              <span className={`text-xl ${softTextClass}`}>Lucro Líquido</span>
              <span className="text-4xl font-bold tracking-tight">R$ 0,00</span>
            </div>
          </div>
        </article>
      </section>

      <Modal
        open={isOccupancyModalOpen}
        onClose={() => setIsOccupancyModalOpen(false)}
        title="Detalhes da ocupação semanal"
        subtitle="Resumo dos dados da semana atual"
        maxWidth="max-w-3xl"
        footer={
          <button
            type="button"
            onClick={() => setIsOccupancyModalOpen(false)}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
          >
            Fechar
          </button>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/5 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-sm ${softTextClass}`}>Total da semana</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">0 consultas</p>
            </div>

            <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/5 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-sm ${softTextClass}`}>Taxa média</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">0%</p>
            </div>

            <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/5 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-sm ${softTextClass}`}>Dia mais ocupado</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{peakDayLabel}</p>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/5 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold tracking-tight">Distribuição por dia</h4>
                <p className={`mt-1 text-sm ${softTextClass}`}>Todos os dias estão zerados no momento</p>
              </div>
              <span className="text-sm font-semibold text-cyan-300">{weeklyAverageOccupancy}% média</span>
            </div>

            <div className="mt-5 space-y-3">
              {weeklyData.map((item) => (
                <div key={item.day} className="grid grid-cols-[120px_1fr_110px] items-center gap-3">
                  <span className="text-sm font-semibold">{item.fullDay}</span>
                  <div className={`h-2 rounded-full ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`}>
                    <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${item.value}%` }} />
                  </div>
                  <span className={`text-right text-sm ${softTextClass}`}>{item.value} consultas</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/5 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
            <h4 className="text-lg font-bold tracking-tight">Interpretação dos dados</h4>
            <ul className={`mt-3 space-y-2 text-sm leading-6 ${softTextClass}`}>
              <li>• Nenhuma consulta foi registrada na semana atual.</li>
              <li>• A ocupação permanece em 0% até que novos agendamentos sejam criados.</li>
              <li>• Ao adicionar consultas na Agenda, este painel passa a refletir a distribuição real por dia.</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}

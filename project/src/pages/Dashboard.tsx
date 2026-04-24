import React, { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Bell,
  UserX,
  CreditCard,
  CalendarCheck,
  MoonStar,
  SunMedium,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import { useLayout } from '../context/LayoutContext';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatClock(date: Date) {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' | 'error' | 'teal' }> = {
  confirmed: { label: 'Confirmado', variant: 'success' },
  scheduled: { label: 'Agendado', variant: 'info' },
  completed: { label: 'Concluído', variant: 'teal' },
  cancelled: { label: 'Cancelado', variant: 'error' },
  'no-show': { label: 'Não compareceu', variant: 'warning' },
};

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const occupancyData = [0, 0, 0, 0, 0, 0, 0];

type TodayAppointment = {
  id: string;
  status: string;
  time: string;
  duration: number;
  patientName: string;
  procedure: string;
};

type RecentPatient = {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'pending';
  totalSpent: number;
};

type NotificationItem = {
  id: string;
  type: 'appointment' | 'payment' | 'alert' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
};

function MiniStat({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div
      className="flex items-center gap-3.5 p-4 rounded-2xl card-hover"
      style={{
        background: 'linear-gradient(145deg, rgba(20,22,30,0.96) 0%, rgba(13,14,19,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.055)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.045) inset, 0 -1px 0 rgba(0,0,0,0.25) inset, 0 4px 20px rgba(0,0,0,0.38)',
      }}
    >
      <div className={`p-2.5 rounded-xl ${color} border border-white/5`}>{icon}</div>
      <div>
        <p className="text-[22px] font-extrabold text-zinc-50 leading-none tracking-tighter">{value}</p>
        <p className="text-[11px] text-zinc-500 font-medium mt-1.5">{label}</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { loading, theme, toggleTheme } = useApp();
  const { setCurrentPage } = useLayout();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = {
    totalPatients: 0,
    appointmentsToday: 0,
    appointmentsThisWeek: 0,
    monthlyRevenue: 0,
    occupancyRate: 0,
    newPatientsThisMonth: 0,
  };

  const todayAppointments: TodayAppointment[] = [];
  const recentPatients: RecentPatient[] = [];
  const notifications: NotificationItem[] = [];

  const completedToday = 0;
  const pendingPayments = 0;
  const unreadNotifs = 0;
  const peakDayLabel = 'Sem movimentação';

  if (loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium rounded-2xl p-5 space-y-3">
              <Skeleton className="w-10 h-10" />
              <Skeleton className="w-24 h-8" />
              <Skeleton className="w-32 h-4" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[11px] font-semibold text-teal-400 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}
            >
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h2 className="text-[26px] font-extrabold text-zinc-50 tracking-tighter leading-none">Bom dia, Dra. Maria Augusta Cyrino</h2>
          <p className="text-[13px] text-zinc-500 mt-2">
            Você tem <span className="text-zinc-200 font-semibold">{todayAppointments.length} consultas</span> agendadas para hoje.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[12px] text-emerald-400 font-semibold">Sistema ativo</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.15)' }}
              title={formatClock(now)}
            >
              <Clock size={14} className="text-teal-400" />
              <span className="text-[12px] text-teal-400 font-semibold tabular-nums">{formatClock(now)}</span>
            </div>
            {typeof toggleTheme === 'function' && (
              <button
                type="button"
                onClick={toggleTheme}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-150 ${
                  theme === 'light'
                    ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                    : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/15 hover:bg-white/10 hover:text-white'
                }`}
                aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
                title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              >
                {theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="fade-in-up stagger-1 cursor-pointer" onClick={() => setCurrentPage('pacientes')}>
          <StatCard title="Total de Pacientes" value={stats.totalPatients} change={0} icon={<Users size={16} />} accentColor="teal" subtitle={`+${stats.newPatientsThisMonth} este mês`} />
        </div>
        <div className="fade-in-up stagger-2 cursor-pointer" onClick={() => setCurrentPage('agenda')}>
          <StatCard title="Consultas Hoje" value={stats.appointmentsToday} change={0} icon={<Calendar size={16} />} accentColor="blue" subtitle={`${stats.appointmentsThisWeek} total`} />
        </div>
        <div className="fade-in-up stagger-3 cursor-pointer" onClick={() => setCurrentPage('financeiro')}>
          <StatCard title="Receita do Mês" value={formatCurrency(stats.monthlyRevenue)} change={0} icon={<DollarSign size={16} />} accentColor="emerald" subtitle="Confirmados e concluídos" />
        </div>
        <div className="fade-in-up stagger-4 cursor-pointer" onClick={() => setCurrentPage('agenda')}>
          <StatCard title="Taxa de Ocupação" value={`${stats.occupancyRate}%`} change={0} icon={<TrendingUp size={16} />} accentColor="amber" subtitle="Média semanal" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-bold text-zinc-100 tracking-tight">Ocupação Semanal</h3>
              <p className="text-[12px] text-zinc-600 mt-0.5">Comparativo de consultas por dia</p>
            </div>
            <Badge variant="teal" dot>Esta semana</Badge>
          </div>
          <div className="flex items-end gap-2.5" style={{ height: '132px' }}>
            {weekDays.map((day, i) => {
              const isToday = i === 2;
              const pct = occupancyData[i];
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-xl transition-all duration-350 group-hover:brightness-110"
                      style={{
                        height: `${pct}%`,
                        background: isToday ? 'linear-gradient(180deg, #2dd4bf 0%, #14b8a6 50%, #0d9488 100%)' : 'rgba(255,255,255,0.055)',
                        boxShadow: isToday ? '0 4px 20px rgba(20,184,166,0.35), 0 0 0 1px rgba(20,184,166,0.15)' : 'none',
                      }}
                    />
                  </div>
                  <span className={`text-[11px] font-semibold transition-colors ${isToday ? 'text-teal-400' : 'text-zinc-700 group-hover:text-zinc-500'}`}>{day}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #2dd4bf, #0d9488)' }} /><span className="text-[11px] text-zinc-600">Hoje</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} /><span className="text-[11px] text-zinc-600">Outros dias</span></div>
            </div>
            <span className="text-[11px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/15 px-2 py-0.5 rounded-md">0% atingido</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-bold text-zinc-100 tracking-tight">Resumo Financeiro</h3>
              <p className="text-[12px] text-zinc-600 mt-0.5">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
            </div>
            <button
              onClick={() => setCurrentPage('financeiro')}
              className="text-[12px] text-teal-400 hover:text-teal-300 font-semibold transition-colors flex items-center gap-1"
            >
              Ver <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Receitas', value: 0, max: 35000, color: '#10b981', glow: 'rgba(16,185,129,0.35)' },
              { label: 'Despesas', value: 0, max: 35000, color: '#f43f5e', glow: 'rgba(244,63,94,0.35)' },
              { label: 'Pendentes', value: 0, max: 35000, color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
            ].map(({ label, value, max, color, glow }) => (
              <div key={label}>
                <div className="flex justify-between mb-2">
                  <span className="text-[12px] text-zinc-500 font-medium">{label}</span>
                  <span className="text-[12px] font-bold tracking-tight" style={{ color }}>{formatCurrency(value)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color, boxShadow: `0 0 8px ${glow}` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-zinc-500 font-medium">Lucro Líquido</span>
              <span className="text-[20px] font-extrabold text-zinc-50 tracking-tighter">{formatCurrency(0)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-zinc-100 tracking-tight">Agenda de Hoje</h3>
              <p className="text-[12px] text-zinc-600 mt-0.5">{todayAppointments.length} consultas agendadas</p>
            </div>
            <button
              onClick={() => setCurrentPage('agenda')}
              className="text-[12px] text-teal-400 hover:text-teal-300 font-semibold transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-teal-500/8"
            >
              Ver tudo <ArrowUpRight size={12} />
            </button>
          </div>
          {todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <Calendar size={28} className="text-zinc-700 mb-3" />
              <p className="text-[13px] text-zinc-500">Nenhuma consulta hoje</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((appt) => {
                const status = statusMap[appt.status];
                return (
                  <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 row-interactive">
                    <div className="flex-shrink-0 text-center w-[52px] py-1.5 rounded-xl" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.13)' }}>
                      <p className="text-[12px] font-bold text-teal-400 leading-none">{appt.time}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{appt.duration}m</p>
                    </div>
                    <Avatar name={appt.patientName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-zinc-200 truncate tracking-tight">{appt.patientName}</p>
                      <p className="text-[11px] text-zinc-600 truncate mt-0.5">{appt.procedure}</p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-zinc-100 tracking-tight">Pacientes Recentes</h3>
              <p className="text-[12px] text-zinc-600 mt-0.5">Últimos cadastros</p>
            </div>
            <button
              onClick={() => setCurrentPage('pacientes')}
              className="text-[12px] text-teal-400 hover:text-teal-300 font-semibold transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-teal-500/8"
            >
              Ver tudo <ArrowUpRight size={12} />
            </button>
          </div>
          {recentPatients.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <Users size={28} className="text-zinc-700 mb-3" />
              <p className="text-[13px] text-zinc-500">Nenhum paciente cadastrado</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 row-interactive">
                  <Avatar name={patient.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-zinc-200 truncate tracking-tight">{patient.name}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{patient.status === 'active' ? 'Ativo' : patient.status === 'inactive' ? 'Inativo' : 'Pendente'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-zinc-200 tracking-tight">{formatCurrency(patient.totalSpent)}</p>
                    <p className="text-[11px] text-zinc-600">total gasto</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniStat label="Consultas concluídas hoje" value={completedToday} icon={<CheckCircle size={17} className="text-emerald-400" />} color="bg-emerald-500/10" />
        <MiniStat label="Consultas agendadas" value={pendingPayments} icon={<Clock size={17} className="text-amber-400" />} color="bg-amber-500/10" />
        <MiniStat label="Notificações não lidas" value={unreadNotifs} icon={<AlertCircle size={17} className="text-red-400" />} color="bg-red-500/10" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.16)' }}>
              <Bell size={14} className="text-teal-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-zinc-100 tracking-tight">Central de Avisos</h3>
              <p className="text-[12px] text-zinc-600 mt-0.5">Atividades e notificações recentes</p>
            </div>
          </div>
          {unreadNotifs > 0 && (
            <span className="text-[11px] font-bold text-teal-400 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
              {unreadNotifs} novos
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-10">
            <Bell size={28} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-[13px] text-zinc-500">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {notifications.slice(0, 8).map((notif) => {
              const icons: Record<string, React.ReactNode> = {
                appointment: <CalendarCheck size={14} className="text-emerald-400" />,
                payment: <CreditCard size={14} className="text-blue-400" />,
                alert: <UserX size={14} className="text-red-400" />,
                info: <Bell size={14} className="text-teal-400" />,
              };
              const bgs: Record<string, string> = {
                appointment: 'rgba(16,185,129,0.1)',
                payment: 'rgba(59,130,246,0.1)',
                alert: 'rgba(244,63,94,0.1)',
                info: 'rgba(20,184,166,0.1)',
              };
              const dots: Record<string, string> = {
                appointment: '#10b981',
                payment: '#3b82f6',
                alert: '#f43f5e',
                info: '#14b8a6',
              };
              return (
                <div key={notif.id} className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-150 row-interactive">
                  <div className="p-2 rounded-xl flex-shrink-0" style={{ background: bgs[notif.type], border: `1px solid ${bgs[notif.type]}` }}>
                    {icons[notif.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-zinc-200 tracking-tight truncate">{notif.title}</p>
                      {!notif.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dots[notif.type], boxShadow: `0 0 5px ${dots[notif.type]}90` }} />}
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-zinc-700 font-semibold mt-1.5">
                      {typeof notif.time === 'string' && notif.time.includes('T')
                        ? new Date(notif.time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : notif.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="hidden">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-zinc-500 font-medium">Dia mais ocupado</span>
          <span className="text-[20px] font-extrabold text-zinc-50 tracking-tighter">{peakDayLabel}</span>
        </div>
      </Card>
    </div>
  );
}

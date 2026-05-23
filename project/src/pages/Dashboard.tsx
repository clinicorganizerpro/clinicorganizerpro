import React, { useEffect, useMemo, useState } from 'react';
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
  MessageCircle,
  X,
  MoonStar,
  SunMedium,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import type { AppNotification } from '../types';
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

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function isCurrentMonthKey(dateKey: string, referenceDate: Date) {
  return dateKey.slice(0, 7) === `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
}

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

type NotificationItem = Pick<
  AppNotification,
  'id' | 'category' | 'type' | 'title' | 'message' | 'createdAt' | 'read' | 'priority' | 'actionUrl'
>;

function MiniStat({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div
      className="flex min-h-[82px] items-center gap-3 rounded-xl p-3 card-hover sm:min-h-[96px] sm:gap-3.5 sm:rounded-2xl sm:p-4"
      style={{
        background: 'linear-gradient(145deg, rgba(20,22,30,0.96) 0%, rgba(13,14,19,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.055)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.045) inset, 0 -1px 0 rgba(0,0,0,0.25) inset, 0 4px 20px rgba(0,0,0,0.38)',
      }}
    >
      <div className={`shrink-0 rounded-lg p-2 ${color} border border-white/5 sm:rounded-xl sm:p-2.5`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[19px] font-extrabold leading-none text-zinc-50 sm:text-[22px]">{value}</p>
        <p className="mt-1 text-[10px] font-medium leading-snug text-zinc-500 sm:mt-1.5 sm:text-[11px]">{label}</p>
      </div>
    </div>
  );
}

const WHATSAPP_WEB_URL = 'https://web.whatsapp.com/';

function openWhatsAppWebInNewTab() {
  window.open(WHATSAPP_WEB_URL, '_blank', 'noopener,noreferrer');
}

type SwipeToDismissNotificationProps = {
  children: React.ReactNode;
  onDismiss: () => void;
};

function SwipeToDismissNotification({ children, onDismiss }: SwipeToDismissNotificationProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isDismissing) {
      return undefined;
    }

    const timer = window.setTimeout(onDismiss, 180);
    return () => window.clearTimeout(timer);
  }, [isDismissing, onDismiss]);

  const resetDrag = () => {
    setIsDragging(false);
    setStartPoint(null);
    setDragX(0);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDismissing) {
      return;
    }

    setIsDragging(true);
    setStartPoint({ x: event.clientX, y: event.clientY });

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore pointer capture issues on some browsers.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !startPoint || isDismissing) {
      return;
    }

    const deltaX = event.clientX - startPoint.x;
    const deltaY = event.clientY - startPoint.y;

    if (Math.abs(deltaY) > 18 && Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    const boundedX = Math.max(-180, Math.min(180, deltaX));
    setDragX(boundedX);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore pointer capture release issues on some browsers.
    }

    const deltaX = event.clientX - (startPoint?.x ?? event.clientX);
    const shouldDismiss = Math.abs(deltaX) > 90;

    if (shouldDismiss) {
      setIsDismissing(true);
      return;
    }

    resetDrag();
  };

  const handlePointerCancel = () => {
    resetDrag();
  };

  return (
    <div
      style={{
        transform: `translateX(${dragX}px)`,
        opacity: isDismissing ? 0 : Math.max(0.4, 1 - Math.abs(dragX) / 260),
        transition: isDragging || isDismissing ? 'none' : 'transform 180ms ease, opacity 180ms ease',
        touchAction: 'pan-y',
        userSelect: 'none',
        willChange: 'transform, opacity',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {children}
    </div>
  );
}

export function Dashboard() {
  const {
    loading,
    theme,
    toggleTheme,
    notifications: appNotifications,
    patients,
    appointments,
    incomes,
    expenses,
    clinicProfile,
    professionals,
  } = useApp();
  const { setCurrentPage, navigate } = useLayout();
  const [now, setNow] = useState(() => new Date());
  const [isWhatsAppPopupOpen, setIsWhatsAppPopupOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);

  const professionalName = useMemo(() => {
    const activeProfessional = professionals.find((professional) => professional.active && professional.name.trim());
    const anyProfessional = professionals.find((professional) => professional.name.trim());
    const responsibleName = clinicProfile.responsibleName.trim();

    return activeProfessional?.name.trim() || anyProfessional?.name.trim() || responsibleName || 'Profissional';
  }, [clinicProfile.responsibleName, professionals]);


  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dashboardData = useMemo(() => {
    const todayKey = toDateKey(now);
    const startOfWeek = new Date(now);
    const weekStartOffset = (startOfWeek.getDay() + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - weekStartOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(0, 0, 0, 0);

    const weekDates = Array.from({ length: weekDays.length }, (_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      return date;
    });

    const monthPatients = patients.filter((patient) => isCurrentMonthKey(patient.createdAt ?? patient.lastVisit ?? '', now));
    const todaysAppointments = appointments
      .filter((appointment) => appointment.date === todayKey)
      .sort((left, right) => left.time.localeCompare(right.time));
    const weekAppointments = appointments.filter((appointment) => {
      const appointmentDate = parseDateKey(appointment.date);
      return appointmentDate >= startOfWeek && appointmentDate < endOfWeek;
    });

    const weekCounts = weekDates.map((date) => {
      const dayKey = toDateKey(date);
      return weekAppointments.filter((appointment) => appointment.date === dayKey).length;
    });

    const maxWeekCount = Math.max(...weekCounts, 1);
    const occupancyData = weekCounts.map((count) => Math.round((count / maxWeekCount) * 100));
    const peakDayIndex = weekCounts.indexOf(Math.max(...weekCounts));
    const peakDayLabel = peakDayIndex >= 0 && weekCounts[peakDayIndex] > 0 ? weekDays[peakDayIndex] : 'Sem movimentação';

    const totalIncome = incomes
      .filter((income) => income.status === 'paid' && isCurrentMonthKey(income.attendanceDate || income.createdAt || '', now))
      .reduce((sum, income) => sum + income.amount, 0);
    const totalExpense = expenses
      .filter((expense) => expense.status === 'paid' && isCurrentMonthKey(expense.date || expense.createdAt || '', now))
      .reduce((sum, expense) => sum + expense.amount, 0);
    const pendingAmount =
      incomes
        .filter((income) => income.status === 'pending' && isCurrentMonthKey(income.attendanceDate || income.createdAt || '', now))
        .reduce((sum, income) => sum + income.amount, 0) +
      expenses
        .filter((expense) => expense.status === 'pending' && isCurrentMonthKey(expense.date || expense.createdAt || '', now))
        .reduce((sum, expense) => sum + expense.amount, 0);

    const completedToday = todaysAppointments.filter((appointment) => appointment.status === 'completed').length;
    const scheduledAppointmentsToday = todaysAppointments.filter(
      (appointment) => appointment.status === 'scheduled' || appointment.status === 'confirmed',
    ).length;

    const recentPatients = [...patients]
      .sort((left, right) => {
        const leftDate = new Date(left.createdAt || left.lastVisit || 0).getTime();
        const rightDate = new Date(right.createdAt || right.lastVisit || 0).getTime();
        return rightDate - leftDate;
      })
      .slice(0, 5)
      .map((patient) => ({
        id: patient.id,
        name: patient.name,
        status: patient.status,
        totalSpent: patient.totalSpent,
      }));

    return {
      stats: {
        totalPatients: patients.length,
        appointmentsToday: todaysAppointments.length,
        appointmentsThisWeek: weekAppointments.length,
        monthlyRevenue: totalIncome,
        occupancyRate: Math.round((weekAppointments.length / Math.max(weekDays.length * 5, 1)) * 100),
        newPatientsThisMonth: monthPatients.length,
        completedToday,
        scheduledToday: scheduledAppointmentsToday,
        totalExpense,
        pendingAmount,
        netProfit: totalIncome - totalExpense,
      },
      todayAppointments: todaysAppointments,
      recentPatients,
      occupancyData,
      weekDates,
      peakDayLabel,
    };
  }, [appointments, expenses, incomes, now, patients]);

  const stats = dashboardData.stats;
  const todayAppointments: TodayAppointment[] = dashboardData.todayAppointments;
  const recentPatients: RecentPatient[] = dashboardData.recentPatients;
  const occupancyData = dashboardData.occupancyData;
  const completedToday = dashboardData.stats.completedToday;
  const scheduledAppointmentsToday = dashboardData.stats.scheduledToday;
  const unreadNotifs = (appNotifications ?? []).filter((notification) => !notification.read).length;
  const peakDayLabel = dashboardData.peakDayLabel;

  const dismissNotification = (id: string) => {
    setDismissedNotificationIds((current) => (current.includes(id) ? current : [...current, id]));
  };

  const notifications: NotificationItem[] = useMemo(() => {
    const mapped: NotificationItem[] = (appNotifications ?? []).map((notification) => ({
      id: notification.id,
      category: notification.category,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
      read: notification.read,
      priority: notification.priority,
      actionUrl: notification.actionUrl,
    }));

    return mapped
      .filter((notification) => !dismissedNotificationIds.includes(notification.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [appNotifications, dismissedNotificationIds]);

  if (loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium rounded-xl p-3.5 space-y-3 sm:rounded-2xl sm:p-5">
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 w-full">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="text-[11px] font-semibold text-teal-400 px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}
              >
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:ml-auto sm:justify-end">
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                <span className="text-[12px] text-emerald-400 font-semibold">Sistema ativo</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen((current) => !current)}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/20 bg-amber-500/10 text-amber-400 transition-all duration-150 hover:border-amber-400/35 hover:bg-amber-500/15 hover:text-amber-300"
                  aria-label="Abrir notificações"
                  title="Notificações"
                >
                  <Bell size={16} />
                  {unreadNotifs > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg">
                      {unreadNotifs > 9 ? '9+' : unreadNotifs}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsWhatsAppPopupOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-emerald-400 transition-all duration-150 hover:border-emerald-400/35 hover:bg-emerald-500/15 hover:text-emerald-300"
                  aria-label="Abrir WhatsApp"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle size={16} />
                </button>

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

          <h2 className="text-[26px] font-extrabold text-zinc-50 tracking-tighter leading-none">
            {greeting}, {professionalName}
          </h2>
          <p className="text-[13px] text-zinc-500 mt-2">
            Você tem <span className="text-zinc-200 font-semibold">{todayAppointments.length} consultas</span> agendadas para hoje.
          </p>
        </div>

      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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
            <Badge variant="teal" dot>
              Esta semana
            </Badge>
          </div>
          <div className="flex items-end gap-2.5" style={{ height: '132px' }}>
            {weekDays.map((day, i) => {
              const isToday = i === 2;
              const pct = occupancyData[i];
              const date = dashboardData.weekDates?.[i];
              const dateKey = date ? toDateKey(date) : null;
              return (
                <div
                  key={day}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full"
                  onClick={() => {
                    if (dateKey) navigate('agenda', { date: dateKey });
                  }}
                >
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
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #2dd4bf, #0d9488)' }} />
                <span className="text-[11px] text-zinc-600">Hoje</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="text-[11px] text-zinc-600">Outros dias</span>
              </div>
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
                  <span className="text-[12px] font-bold tracking-tight" style={{ color }}>
                    {formatCurrency(value)}
                  </span>
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

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:grid-cols-3 sm:gap-4">
        <MiniStat label="Consultas concluídas hoje" value={completedToday} icon={<CheckCircle size={17} className="text-emerald-400" />} color="bg-emerald-500/10" />
        <MiniStat label="Consultas agendadas" value={scheduledAppointmentsToday} icon={<Clock size={17} className="text-amber-400" />} color="bg-amber-500/10" />
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
                patient: <UserX size={14} className="text-emerald-300" />,
                financial: <CreditCard size={14} className="text-blue-400" />,
                reminder: <Bell size={14} className="text-amber-400" />,
                system: <Bell size={14} className="text-teal-400" />,
                update: <Sparkles size={14} className="text-teal-300" />,
                security: <UserX size={14} className="text-red-400" />,
                sync: <RotateCcw size={14} className="text-teal-300" />,
                ai: <Sparkles size={14} className="text-teal-300" />,
                marketing: <Sparkles size={14} className="text-teal-300" />,
              };
              const bgs: Record<string, string> = {
                appointment: 'rgba(16,185,129,0.1)',
                patient: 'rgba(20,184,166,0.08)',
                financial: 'rgba(59,130,246,0.1)',
                reminder: 'rgba(245,158,11,0.10)',
                system: 'rgba(20,184,166,0.10)',
                update: 'rgba(45,212,191,0.10)',
                security: 'rgba(239,68,68,0.10)',
                sync: 'rgba(20,184,166,0.10)',
                ai: 'rgba(45,212,191,0.10)',
                marketing: 'rgba(20,184,166,0.10)',
              };
              const dots: Record<string, string> = {
                appointment: '#10b981',
                patient: '#14b8a6',
                financial: '#3b82f6',
                reminder: '#f59e0b',
                system: '#14b8a6',
                update: '#2dd4bf',
                security: '#ef4444',
                sync: '#14b8a6',
                ai: '#2dd4bf',
                marketing: '#14b8a6',
              };
              return (
                <SwipeToDismissNotification key={notif.id} onDismiss={() => dismissNotification(notif.id)}>
                  <div className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-150 row-interactive">
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
                        {notif.createdAt
                          ? new Date(notif.createdAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </p>
                    </div>
                  </div>
                </SwipeToDismissNotification>
              );
            })}
          </div>
        )}
      </Card>

      {isNotificationsOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}>
          <div
            className="absolute right-4 top-20 w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950/30 p-3 shadow-2xl shadow-black/15 backdrop-blur-2xl"
            onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[17px] font-bold text-zinc-100 tracking-tight">Notificações</h3>
                <p className="mt-0.5 text-[13px] text-zinc-600">WhatsApp, agenda e cancelamentos recentes</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-zinc-200"
                aria-label="Fechar notificações"
                title="Fechar"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1.5">
              {notifications.slice(0, 5).map((notification) => {
                const icon =
                  notification.category === 'appointment'
                    ? <CalendarCheck size={14} className="text-emerald-400" />
                    : notification.category === 'patient'
                      ? <UserX size={14} className="text-emerald-300" />
                      : notification.category === 'financial'
                        ? <CreditCard size={14} className="text-blue-400" />
                        : notification.category === 'security'
                          ? <UserX size={14} className="text-red-400" />
                          : notification.category === 'reminder'
                            ? <Bell size={14} className="text-amber-400" />
                            : notification.category === 'system'
                              ? <Bell size={14} className="text-teal-400" />
                              : notification.category === 'update'
                                ? <Sparkles size={14} className="text-teal-300" />
                                : notification.category === 'sync'
                                  ? <RotateCcw size={14} className="text-teal-300" />
                                  : <MessageCircle size={14} className="text-teal-400" />;

                const badgeBg =
                  notification.category === 'appointment'
                    ? 'rgba(16,185,129,0.1)'
                    : notification.category === 'patient'
                      ? 'rgba(20,184,166,0.08)'
                      : notification.category === 'financial'
                        ? 'rgba(59,130,246,0.1)'
                        : notification.category === 'security'
                          ? 'rgba(239,68,68,0.1)'
                          : notification.category === 'reminder'
                            ? 'rgba(245,158,11,0.10)'
                            : notification.category === 'system'
                              ? 'rgba(20,184,166,0.10)'
                              : notification.category === 'update'
                                ? 'rgba(45,212,191,0.10)'
                                : notification.category === 'sync'
                                  ? 'rgba(20,184,166,0.10)'
                                  : 'rgba(20,184,166,0.10)';

                return (
                  <SwipeToDismissNotification key={notification.id} onDismiss={() => dismissNotification(notification.id)}>
                    <div
                      className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5"
                      title="Arraste para esquerda ou direita para apagar"
                    >
                      <div className="rounded-xl border border-white/5 p-1.5" style={{ background: badgeBg }}>
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[14px] font-semibold text-zinc-200">{notification.title}</p>
                          {!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{notification.message}</p>
                        <p className="mt-1 text-[11px] font-semibold text-zinc-700">
                          {notification.createdAt
                            ? new Date(notification.createdAt).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </p>
                      </div>
                    </div>
                  </SwipeToDismissNotification>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isWhatsAppPopupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
          onClick={() => setIsWhatsAppPopupOpen(false)}
        >
          <div className="w-full max-w-md" onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}>
            <Card className="border border-emerald-400/20 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-400">
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-extrabold text-zinc-50 tracking-tight">WhatsApp</h3>
                    <p className="mt-1 text-[12px] text-zinc-500">Acesse o WhatsApp Web sem sair do sistema.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWhatsAppPopupOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-zinc-200"
                  aria-label="Fechar popup do WhatsApp"
                  title="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-[13px] font-semibold text-zinc-200">Popup interno do sistema</p>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                  O WhatsApp Web não pode ser incorporado diretamente dentro de um card por limitações de segurança do navegador.
                  Este popup mantém a experiência dentro do sistema e abre o WhatsApp Web em uma nova aba quando você clicar no botão abaixo.
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openWhatsAppWebInNewTab}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition-all hover:border-emerald-400/35 hover:bg-emerald-500/15 hover:text-emerald-200"
                >
                  <MessageCircle size={16} />
                  Abrir WhatsApp Web
                </button>
                <button
                  type="button"
                  onClick={() => setIsWhatsAppPopupOpen(false)}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-300 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                >
                  Fechar
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Card className="hidden">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-zinc-500 font-medium">Dia mais ocupado</span>
          <span className="text-[20px] font-extrabold text-zinc-50 tracking-tighter">{peakDayLabel}</span>
        </div>
      </Card>
    </div>
  );
}

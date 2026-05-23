import { useEffect, useMemo, useState } from 'react';
import type { AppNotification } from '../types';
import { notificationService } from '../services/notificationService';
import { Bell, Check, X, AlertCircle, CalendarCheck, CreditCard, Sparkles, RotateCcw } from 'lucide-react';

type NotificationsCenterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (actionUrl?: string) => void;
};

type GroupedByCategory = Record<string, AppNotification[]>;

const iconByType = {
  appointment: <CalendarCheck size={14} className="text-emerald-400" />,
  patient: <AlertCircle size={14} className="text-emerald-300" />,
  financial: <CreditCard size={14} className="text-blue-400" />,
  reminder: <AlertCircle size={14} className="text-amber-400" />,
  system: <Sparkles size={14} className="text-teal-400" />,
  update: <RotateCcw size={14} className="text-teal-300" />,
  security: <AlertCircle size={14} className="text-red-400" />,
  sync: <RotateCcw size={14} className="text-teal-300" />,
  ai: <Sparkles size={14} className="text-teal-300" />,
  marketing: <Sparkles size={14} className="text-teal-300" />,
} as const;

const badgeDotByCategory: Record<AppNotification['category'], string> = {
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

const priorityBadgeByPriority: Record<AppNotification['priority'], { label: string; bg: string; border: string }> = {
  low: { label: 'Baixa', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
  medium: { label: 'Média', bg: 'rgba(20,184,166,0.10)', border: 'rgba(20,184,166,0.22)' },
  high: { label: 'Alta', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)' },
  urgent: { label: 'Urgente', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.22)' },
};

export function NotificationsCenter({ open, onOpenChange, onNavigate }: NotificationsCenterProps) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<AppNotification['category'] | 'all'>('all');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(true);

  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await notificationService.listNotifications();
      // dedupe by id (caso polling retorne overlaps)
      const map = new Map<string, AppNotification>();
      for (const n of next) map.set(n.id, n);
      setItems([...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    void refresh();

    const sub = notificationService.subscribeWithPolling((newOnes) => {
      setItems((current) => {
        const map = new Map<string, AppNotification>();
        for (const n of current) map.set(n.id, n);
        for (const n of newOnes) map.set(n.id, n);
        return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
    });

    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    let next = items;

    if (filterUnreadOnly) next = next.filter((n) => !n.read);
    if (filterCategory !== 'all') next = next.filter((n) => n.category === filterCategory);

    return next;
  }, [filterCategory, filterUnreadOnly, items]);

  const grouped: GroupedByCategory = useMemo(() => {
    // agrupamento por categoria (mantemos ordem pelo timestamp)
    const result: GroupedByCategory = {};
    for (const n of filtered) {
      const key = n.category;
      if (!result[key]) result[key] = [];
      result[key].push(n);
    }
    return result;
  }, [filtered]);

  const groupedByDay = useMemo(() => {
    // agrupamento por data (YYYY-MM-DD)
    const result: Record<string, AppNotification[]> = {};
    for (const n of filtered) {
      const key = n.createdAt.slice(0, 10);
      if (!result[key]) result[key] = [];
      result[key].push(n);
    }
    return result;
  }, [filtered]);

  const listToRender = useMemo(() => {
    // se houver poucos itens, prioriza data; se houver muitos, categorias
    if (filtered.length <= 12) return { mode: 'day' as const, grouped: groupedByDay };
    return { mode: 'category' as const, grouped };
  }, [filtered.length, grouped, groupedByDay]);

  const markAsRead = async (id: string) => {
    // optimistic
    setItems((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationService.markNotificationRead(id);
    } catch (e) {
      // reverter caso falhe
      setItems((current) => current.map((n) => (n.id === id ? { ...n, read: false } : n)));
      setError(e instanceof Error ? e.message : 'Falha ao marcar como lida');
    }
  };

  const clearAllRead = async () => {
    setMarkingAll(true);
    setError(null);
    try {
      await notificationService.clearAllRead();
      setItems((current) => current.map((n) => ({ ...n, read: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao limpar notificações');
    } finally {
      setMarkingAll(false);
    }
  };

  if (!open) return null;

  const categories: Array<AppNotification['category']> = [
    'appointment',
    'patient',
    'financial',
    'reminder',
    'system',
    'update',
    'security',
    'sync',
    'ai',
    'marketing',
  ];

  return (
    <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)}>
      <div
        className="absolute right-4 top-20 w-full max-w-[420px] rounded-2xl border border-white/10 bg-zinc-950/30 p-3 shadow-2xl shadow-black/15 backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-bold text-zinc-100 tracking-tight">Central de Notificações</h3>
            <p className="mt-0.5 text-[13px] text-zinc-600">
              {unreadCount > 0 ? (
                <>
                  <span className="text-teal-300 font-semibold">{unreadCount}</span> não lidas
                </>
              ) : (
                'Tudo em dia ✨'
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-zinc-200"
            aria-label="Fechar notificações"
            title="Fechar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterUnreadOnly((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] font-semibold text-zinc-200 hover:bg-white/[0.05]"
              aria-label="Filtrar não lidas"
            >
              <span className={`inline-flex h-2 w-2 rounded-full ${filterUnreadOnly ? 'bg-red-400' : 'bg-white/30'}`} />
              Não lidas
            </button>

            <select
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-zinc-200"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
              aria-label="Filtrar por categoria"
            >
              <option value="all">Todas</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={markingAll}
            onClick={() => void clearAllRead()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] font-semibold text-zinc-200 hover:bg-white/[0.05] disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Marcar todas como lidas"
            title="Marcar tudo como lido"
          >
            <Check size={14} />
            Limpar lidas
          </button>
        </div>

        {error && (
          <div
            className="mb-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-[12px] text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="py-6">
            <p className="text-center text-[13px] text-zinc-400">Carregando…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10">
            <Bell size={26} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-[13px] text-zinc-500 text-center">Sem notificações no filtro atual</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
            {listToRender.mode === 'day' ? (
              Object.entries(listToRender.grouped).map(([day, notifList]) => (
                <div key={day}>
                  <div className="sticky top-0 z-0 mb-2">
                    <div className="text-[11px] font-bold text-zinc-500">
                      {new Date(day + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {notifList.map((n) => {
                      const dot = badgeDotByCategory[n.category];
                      const priority = priorityBadgeByPriority[n.priority];

                      return (
                        <div
                          key={n.id}
                          className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5"
                        >
                          <button
                            type="button"
                            onClick={() => void markAsRead(n.id)}
                            disabled={n.read}
                            className="mt-0.5 rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2 hover:bg-white/[0.06] disabled:opacity-60 disabled:cursor-default"
                            aria-label={n.read ? 'Notificação já lida' : 'Marcar como lida'}
                            title={n.read ? 'Lida' : 'Marcar como lida'}
                          >
                              <div className="flex items-center justify-center" style={{ width: 28, height: 28 }}>
                              {(iconByType[n.category as keyof typeof iconByType] ?? <Bell size={14} className="text-zinc-400" />)}
                            </div>
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {!n.read && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot, boxShadow: `0 0 6px ${dot}90` }} />}
                              <p className="truncate text-[13px] font-semibold text-zinc-200">{n.title}</p>
                              <span
                                className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-lg"
                                style={{ background: priority.bg, border: `1px solid ${priority.border}`, color: 'rgba(255,255,255,0.9)' }}
                              >
                                {priority.label}
                              </span>
                            </div>

                            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{n.message}</p>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold text-zinc-700">
                                {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </p>

                              {n.actionUrl ? (
                                <button
                                  type="button"
                                  onClick={() => onNavigate?.(n.actionUrl)}
                                  className="text-[11px] font-semibold text-teal-300 hover:text-teal-200 transition"
                                >
                                  Abrir
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              Object.entries(listToRender.grouped).map(([category, notifList]) => (
                <div key={category}>
                  <div className="mb-2 text-[12px] font-bold text-zinc-300 capitalize">{category}</div>
                  <div className="space-y-1.5">
                    {notifList.map((n) => {
                      const dot = badgeDotByCategory[n.category];
                      const priority = priorityBadgeByPriority[n.priority];

                      return (
                        <div
                          key={n.id}
                          className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5"
                        >
                          <button
                            type="button"
                            onClick={() => void markAsRead(n.id)}
                            disabled={n.read}
                            className="mt-0.5 rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2 hover:bg-white/[0.06] disabled:opacity-60 disabled:cursor-default"
                            aria-label={n.read ? 'Notificação já lida' : 'Marcar como lida'}
                            title={n.read ? 'Lida' : 'Marcar como lida'}
                          >
                            <div className="flex items-center justify-center" style={{ width: 28, height: 28 }}>
                              {iconByType[n.category]}
                            </div>
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {!n.read && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot, boxShadow: `0 0 6px ${dot}90` }} />}
                              <p className="truncate text-[13px] font-semibold text-zinc-200">{n.title}</p>
                              <span
                                className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-lg"
                                style={{ background: priority.bg, border: `1px solid ${priority.border}`, color: 'rgba(255,255,255,0.9)' }}
                              >
                                {priority.label}
                              </span>
                            </div>

                            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{n.message}</p>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold text-zinc-700">
                                {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </p>

                              {n.actionUrl ? (
                                <button
                                  type="button"
                                  onClick={() => onNavigate?.(n.actionUrl)}
                                  className="text-[11px] font-semibold text-teal-300 hover:text-teal-200 transition"
                                >
                                  Abrir
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

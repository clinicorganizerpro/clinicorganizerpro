import type { AppNotification } from '../types';
import { supabase } from '../lib/supabase';
import { apiFetch, createApiUrl } from '../lib/api';
import { localApiCreate, localApiDelete, localApiList, localApiUpdate } from '../lib/localApiClient';

export type CreateNotificationInput = Omit<
  AppNotification,
  'id' | 'createdAt' | 'read'
> & {
  createdAt?: string;
  read?: boolean;
};

const RECENT_LIMIT = 100;

const safeJsonFetch = async <T,>(url: string, options: RequestInit): Promise<T> => {
  const res = await apiFetch(url, options);
  const json = (await res.json()) as T;
  return json;
};

const getLocalNotifications = async (): Promise<AppNotification[]> => {
  const electronDb = typeof window !== 'undefined' ? window.clinicLocalDb?.isAvailable ? window.clinicLocalDb : null : null;
  if (electronDb) {
    const all = await electronDb.records.list<AppNotification & { id: string }>('notifications');
    return all.slice(0, RECENT_LIMIT);
  }
  const { data } = await supabase.from('notifications').select('*').limit(RECENT_LIMIT);
  return (data ?? []) as unknown as AppNotification[];
};

export const notificationService = {
  async listNotifications(): Promise<AppNotification[]> {
    if (typeof window !== 'undefined' && window.clinicLocalDb?.isAvailable) {
      const all = await localApiList<AppNotification & { id: string }>('notifications');
      return all.slice(0, RECENT_LIMIT);
    }

    try {
      const url = createApiUrl('/api/notifications');
      // localApi genérico não implementa limit; fazemos no cliente
      const json = await safeJsonFetch<{ data: AppNotification[] | null; error: { message: string } | null }>(
        url.toString(),
        { method: 'GET' },
      );

      const all = json?.data ?? [];
      return all.slice(0, RECENT_LIMIT);
    } catch {
      // Fallback: usa supabase/local adapter (sem realtime garantido)
      return await getLocalNotifications();
    }
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    if (typeof window !== 'undefined' && window.clinicLocalDb?.isAvailable) {
      await localApiUpdate<AppNotification & { id: string }>('notifications', notificationId, { read: true });
      return;
    }

    const url = createApiUrl(`/api/notifications/${notificationId}/read`);

    const res = await apiFetch(url.toString(), { method: 'POST' });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(json?.error?.message ?? 'Falha ao marcar notificação como lida');
    }
  },

  async clearAllRead(): Promise<void> {
    if (typeof window !== 'undefined' && window.clinicLocalDb?.isAvailable) {
      const all = await localApiList<AppNotification & { id: string }>('notifications');
      await Promise.all(
        all.filter((notification) => notification.read).map((notification) => localApiDelete('notifications', notification.id)),
      );
      return;
    }

    const url = createApiUrl('/api/notifications/clear');
    const res = await apiFetch(url.toString(), { method: 'POST' });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(json?.error?.message ?? 'Falha ao limpar notificações');
    }
  },

  async createNotification(input: CreateNotificationInput): Promise<AppNotification> {
    if (typeof window !== 'undefined' && window.clinicLocalDb?.isAvailable) {
      const nowIso = new Date().toISOString();
      return await localApiCreate<AppNotification & { id: string }>('notifications', {
        type: input.type,
        category: input.category,
        title: input.title,
        message: input.message,
        createdAt: input.createdAt ?? nowIso,
        read: input.read ?? false,
        priority: input.priority,
        relatedId: input.relatedId,
        relatedType: input.relatedType,
        actionUrl: input.actionUrl,
        icon: input.icon,
      });
    }

    const url = createApiUrl('/api/notifications');

    const nowIso = new Date().toISOString();

    const payload: Omit<AppNotification, 'id'> = {
      type: input.type,
      category: input.category,
      title: input.title,
      message: input.message,
      createdAt: input.createdAt ?? nowIso,
      read: input.read ?? false,
      priority: input.priority,
      relatedId: input.relatedId,
      relatedType: input.relatedType,
      actionUrl: input.actionUrl,
      icon: input.icon,
    };

    const json = await safeJsonFetch<{ data: AppNotification | null; error: { message: string } | null }>(
      url.toString(),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload }),
      },
    );

    if (json.error || !json.data) {
      throw new Error(json.error?.message ?? 'Falha ao criar notificação');
    }

    return json.data;
  },

  /**
   * Polling inteligente (sem websocket ainda):
   * - chama listNotifications()
   * - compara ids/createdAt recentes
   * - dispara callback quando houver novas notificações
   */
  subscribeWithPolling(
    onNew: (notifications: AppNotification[]) => void,
    options?: { intervalMs?: number; maxBackoffMs?: number },
  ): { unsubscribe: () => void } {
    const intervalMs = options?.intervalMs ?? 4000;
    const maxBackoffMs = options?.maxBackoffMs ?? 30000;

    let stopped = false;
    let lastSeenCreatedAt = '';

    let consecutiveErrors = 0;
    let currentInterval = intervalMs;

    const tick = async () => {
      if (stopped) return;

      try {
        const all = await notificationService.listNotifications();
        const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        const newest = sorted.filter((n) => n.createdAt > lastSeenCreatedAt);
        if (newest.length > 0) {
          lastSeenCreatedAt = sorted[0]?.createdAt ?? lastSeenCreatedAt;
          onNew(newest);
          consecutiveErrors = 0;
          currentInterval = intervalMs;
        }
      } catch {
        consecutiveErrors += 1;
        const backoff = Math.min(maxBackoffMs, intervalMs * (2 ** consecutiveErrors));
        currentInterval = backoff;
      }

      if (!stopped) {
        window.setTimeout(() => void tick(), currentInterval);
      }
    };

    void tick();

    return {
      unsubscribe: () => {
        stopped = true;
      },
    };
  },
};

/**
 * Notification system — types and client-side helpers.
 *
 * Table: public.notifications
 *   id         uuid primary key default gen_random_uuid()
 *   user_id    uuid references auth.users(id) on delete cascade
 *   type       text  -- 'newRelease' | 'recommendation' | 'news' | 'system'
 *   title      text
 *   message    text
 *   read       boolean default false
 *   metadata   jsonb  -- e.g. { tmdbId, mediaType, imageUrl, url }
 *   created_at timestamptz default now()
 */

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type NotificationType = 'newRelease' | 'recommendation' | 'news' | 'system';

export interface AppNotification {
    id: string;                              // UUID — siempre string
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;                           // campo canónico — algunos clientes antiguos usaban is_read
    metadata?: NotificationMetadata;
    created_at: string;
}

export interface NotificationMetadata {
    tmdbId?: number;
    mediaType?: 'movie' | 'tv';
    imageUrl?: string;
    url?: string;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/** Convierte una fila de Supabase al tipo AppNotification, normalizando campos. */
function normalizeNotification(raw: Record<string, unknown>): AppNotification {
    return {
        id: raw.id as string,
        user_id: raw.user_id as string,
        type: (raw.type as NotificationType) ?? 'system',
        title: (raw.title as string) ?? '',
        message: (raw.message as string) ?? '',
        read: Boolean(raw.read ?? (raw as any).is_read ?? false),
        metadata: raw.metadata as NotificationMetadata | undefined,
        created_at: raw.created_at as string,
    };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

/** Obtiene las notificaciones más recientes (máx. 30). */
export async function fetchNotifications(): Promise<AppNotification[]> {
    const supabase = createClient();
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) {
            console.error('[notifications] fetch error:', error);
            return [];
        }
        return (data ?? []).map(normalizeNotification);
    } catch (err) {
        console.error('[notifications] unexpected fetch error:', err);
        return [];
    }
}

/** Cuenta las notificaciones no leídas (para el badge del ícono). */
export async function getUnreadCount(): Promise<number> {
    const supabase = createClient();
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('read', false);

        if (error) {
            console.error('[notifications] count error:', error);
            return 0;
        }
        return count ?? 0;
    } catch {
        return 0;
    }
}

// ── Mark as read ──────────────────────────────────────────────────────────────

/** Marca una notificación como leída por ID. */
export async function markAsRead(id: string): Promise<void> {
    if (!id) return;
    const supabase = createClient();
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (error) console.error('[notifications] markAsRead error:', error);
    } catch (err) {
        console.error('[notifications] markAsRead unexpected error:', err);
    }
}

/** Marca todas las notificaciones como leídas para el usuario actual. */
export async function markAllAsRead(): Promise<void> {
    const supabase = createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false);

        if (error) console.error('[notifications] markAllAsRead error:', error);
    } catch (err) {
        console.error('[notifications] markAllAsRead unexpected error:', err);
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────

/** Elimina una notificación por ID. */
export async function deleteNotification(id: string): Promise<void> {
    if (!id) return;
    const supabase = createClient();
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) console.error('[notifications] delete error:', error);
    } catch (err) {
        console.error('[notifications] delete unexpected error:', err);
    }
}

/** Elimina todas las notificaciones del usuario actual. */
export async function deleteAllNotifications(): Promise<void> {
    const supabase = createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id);

        if (error) console.error('[notifications] deleteAll error:', error);
    } catch (err) {
        console.error('[notifications] deleteAll unexpected error:', err);
    }
}

// ── Realtime ──────────────────────────────────────────────────────────────────

/**
 * Se suscribe a nuevas notificaciones vía Supabase Realtime.
 * Retorna el canal para que el consumidor pueda desuscribirse en cleanup.
 *
 * Prevención de duplicados: la suscripción usa INSERT exclusivamente,
 * por lo que cada notificación se emite una sola vez.
 */
export function subscribeToNotifications(
    userId: string,
    onNew: (notification: AppNotification) => void,
): RealtimeChannel {
    const supabase = createClient();
    const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            },
            (payload: { new: Record<string, unknown> }) => {
                onNew(normalizeNotification(payload.new));
            },
        )
        .subscribe((status: string, err: Error | null) => {
            if (status === 'CHANNEL_ERROR' && err) {
                console.error('[notifications] Realtime subscription error:', err);
            }
        });

    return channel;
}
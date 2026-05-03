/**
 * Notification system — types and client-side helpers.
 *
 * The `notifications` table schema:
 *   id          uuid primary key default gen_random_uuid()
 *   user_id     uuid references auth.users(id) on delete cascade
 *   type        text  -- 'newRelease' | 'recommendation' | 'news' | 'system'
 *   title       text
 *   message     text
 *   read        boolean default false
 *   metadata    jsonb  -- e.g. { tmdbId, mediaType, imageUrl }
 *   created_at  timestamptz default now()
 */

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type NotificationType = 'newRelease' | 'recommendation' | 'news' | 'system';

export interface AppNotification {
    id: string | number;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    is_read?: boolean;
    metadata?: {
        tmdbId?: number;
        mediaType?: 'movie' | 'tv';
        imageUrl?: string;
        url?: string;
    };
    created_at: string;
}

/** Fetch the most recent notifications for the current user (max 30). */
export async function fetchNotifications(): Promise<AppNotification[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error('[notifications] fetch error:', error);
        return [];
    }
    return (data ?? []) as AppNotification[];
}

/** Mark a single notification as read. */
export async function markAsRead(id: string): Promise<void> {
    const supabase = createClient();
    await supabase.from('notifications').update({ read: true }).eq('id', id);
}

/** Mark all notifications as read for the current user. */
export async function markAllAsRead(): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)   // SEC-015: explicit user filter — never touch other users' rows
        .eq('read', false);
}

/**
 * Subscribe to new notifications for a user via Supabase Realtime.
 * Returns the channel so the caller can unsubscribe on cleanup.
 */
export function subscribeToNotifications(
    userId: string,
    onNew: (notification: AppNotification) => void
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
                onNew(payload.new as unknown as AppNotification);
            }
        )
        .subscribe();

    return channel;
}

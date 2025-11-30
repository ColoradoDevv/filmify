import { createClient } from '@/lib/supabase/client';

export type AdminAction =
    | 'BAN_USER'
    | 'UNBAN_USER'
    | 'UPDATE_SETTINGS'
    | 'CLOSE_PARTY'
    | 'DELETE_CONTENT'
    | 'BLACKLIST_CONTENT'
    | 'UNBLACKLIST_CONTENT'
    | 'BROADCAST_MESSAGE'
    | 'BAN_IP'
    | 'IMPERSONATE_USER';

export async function logAdminAction(
    action: AdminAction,
    targetId?: string,
    details?: any
) {
    const supabase = createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get IP address if possible (client-side it's hard, usually done in middleware or server action)
        // For client-side calls, we might omit IP or let the server handle it if we move this to a server action.
        // For now, we'll just log the action.

        await supabase.from('admin_logs').insert({
            admin_id: user.id,
            action,
            target_id: targetId,
            details,
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}

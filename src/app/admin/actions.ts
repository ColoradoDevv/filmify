'use server';

import { createClient, createAdminClient, createServiceRoleClient } from '@/lib/supabase/server';

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

/**
 * Helper to ensure the current user is an admin.
 * Throws an error if not authorized.
 */
export async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        throw new Error('Unauthorized: Admin access required');
    }

    return user;
}

export async function logAdminAction(
    action: AdminAction,
    targetId?: string,
    details?: any
) {
    const user = await requireAdmin();
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action,
        target_id: targetId,
        details,
    });

    if (error) {
        console.error('Failed to log admin action:', error);
    }
}

export async function getDashboardStats() {
    try {
        await requireAdmin();

        // Use Admin Client to bypass RLS for stats
        const supabase = await createAdminClient();

        // Get total users
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });


        // Get total reviews count
        const { count: totalReviews } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true });

        return {
            totalUsers: totalUsers || 0,
            conversionRate: totalReviews?.toString() || "0", // Using Total Reviews as "Conversion" metric for now
            costs: "$0.00",
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            totalUsers: 0,
            conversionRate: "0",
            costs: "$0.00",
        };
    }
}

export async function getRecentAuditLogs() {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        return [];
    }
}

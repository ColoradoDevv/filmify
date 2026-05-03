'use server';

import { createClient, createAdminClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getSupabaseConfig } from '@/lib/env';
import { revalidatePath } from 'next/cache';

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

export async function getUsers(page = 1, pageSize = 10, search = '') {
    try {
        await requireAdmin();

        // Use Admin Client to bypass RLS for user list
        const supabase = await createAdminClient();
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('updated_at', { ascending: false })
            .range(from, to);

        // Note: Filtering by email on 'profiles' won't work if email isn't there.
        // We'll search by 'full_name' instead which exists in profiles.
        if (search) {
            query = query.ilike('full_name', `%${search}%`);
        }

        const { data: profiles, count, error } = await query;

        if (error) {
            console.error('Error fetching users:', error);
            return { data: [], count: 0 };
        }

        // Fetch emails and IPs from auth.users/sessions for the retrieved profiles
        const profilesWithDetails = await Promise.all(
            (profiles || []).map(async (profile) => {
                const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.id);

                return {
                    ...profile,
                    email: user?.email || 'No email found',
                    last_ip: 'Unknown', // Placeholder until we implement tracking
                };
            })
        );

        return {
            data: profilesWithDetails,
            count: count || 0
        };
    } catch (error) {
        console.error('Unauthorized access to getUsers:', error);
        return { data: [], count: 0 };
    }
}

export async function impersonateUser(userId: string) {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        // Generate magic link
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: (await supabase.auth.admin.getUserById(userId)).data.user?.email || '',
        });

        if (error) return { success: false, error: error.message };

        const actionLink = data.properties?.action_link;
        if (!actionLink) {
            return { success: false, error: 'No magic link generated' };
        }

        try {
            const linkUrl = new URL(actionLink);
            const supabaseHost = new URL(getSupabaseConfig().url).hostname;
            const isAllowedHost = linkUrl.protocol === 'https:' &&
                (linkUrl.hostname === supabaseHost || linkUrl.hostname.endsWith('.supabase.co'));

            if (!isAllowedHost) {
                console.error('[impersonateUser] Unsafe magic link host:', linkUrl.hostname);
                return { success: false, error: 'Generated link is not from a trusted Supabase domain' };
            }
        } catch (err) {
            console.error('[impersonateUser] Invalid magic link URL:', err);
            return { success: false, error: 'Invalid magic link URL' };
        }

        // SEC-011: always audit-log impersonation BEFORE returning the link
        await logAdminAction('IMPERSONATE_USER', userId, {
            timestamp: new Date().toISOString(),
        });

        return { success: true, url: actionLink };
    } catch (error) {
        return { success: false, error: 'Unauthorized' };
    }
}(ip: string, userId?: string) {
    try {
        const user = await requireAdmin();
        const supabase = await createAdminClient();

        const { error } = await supabase.from('ip_bans').insert({
            ip_address: ip,
            reason: 'Admin Manual Ban',
            banned_by: user.id
        });

        if (error) return { success: false, error: error.message };

        // Also ban the user account if userId provided
        if (userId) {
            await supabase.auth.admin.updateUserById(userId, { ban_duration: '876000h' }); // 100 years
            await supabase.from('profiles').update({ is_banned: true }).eq('id', userId);
        }

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Unauthorized' };
    }
}

export async function updateUserRole(userId: string, newRole: 'admin' | 'user') {
    try {
        await requireAdmin();
        const adminSupabase = await createAdminClient();

        // Use Admin Client to perform the update (bypassing RLS if necessary)
        const { error } = await adminSupabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) return { success: false, error: error.message };

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Unauthorized' };
    }
}

export async function banUser(userId: string) {
    try {
        await requireAdmin();
        const adminSupabase = await createAdminClient();

        // Toggle ban status (or set to true)
        // First get current status
        const { data: targetProfile } = await adminSupabase
            .from('profiles')
            .select('is_banned')
            .eq('id', userId)
            .single();

        const newBanStatus = !targetProfile?.is_banned;

        // Update profile status
        await adminSupabase
            .from('profiles')
            .update({ is_banned: newBanStatus })
            .eq('id', userId);

        // If banning, also ban in auth
        if (newBanStatus) {
            await adminSupabase.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
        } else {
            await adminSupabase.auth.admin.updateUserById(userId, { ban_duration: '0s' });
        }

        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Unauthorized' };
    }
}




// --- Moderation Actions ---

export async function getLatestReviews() {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        // Fetch reviews with user data
        // Assuming 'reviews' table exists and has user_id
        const { data, error } = await supabase
            .from('reviews')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching reviews:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        return [];
    }
}

export async function deleteReview(reviewId: string) {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId);

        if (error) return { success: false, error: error.message };

        revalidatePath('/admin/moderation');
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Unauthorized' };
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

export async function deleteUser(userId: string) {
    try {
        await requireAdmin();
        const adminSupabase = await createAdminClient();

        const { error: deleteError } = await adminSupabase.rpc('delete_user_and_related', {
            user_id: userId,
        });

        if (deleteError) {
            console.error('Error deleting related user data:', deleteError);
            return { success: false, error: deleteError.message };
        }

        const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId);
        if (authError) {
            console.error('Error deleting user from auth:', authError);
            return { success: false, error: authError.message };
        }

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Delete user exception:', error);
        return { success: false, error: 'Unauthorized or Unexpected Error' };
    }
}

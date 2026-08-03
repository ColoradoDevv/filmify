'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getSupabaseConfig } from '@/lib/env';
import { revalidatePath } from 'next/cache';
import { requireAdmin, logAdminAction } from '../actions';

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
                const { data: { user } } = await supabase.auth.admin.getUserById(profile.id);

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
}

export async function banIp(ip: string, userId?: string) {
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
        const currentAdmin = await requireAdmin();

        // Prevent self-demotion and prevent escalation to super_admin
        if (userId === currentAdmin.id) {
            return { success: false, error: 'No puedes cambiar tu propio rol' };
        }
        if (!['admin', 'user'].includes(newRole)) {
            return { success: false, error: 'Rol no válido' };
        }

        const adminSupabase = await createAdminClient();

        // Prevent changing super_admin accounts
        const { data: target } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (target?.role === 'super_admin') {
            return { success: false, error: 'No se puede modificar un super_admin' };
        }

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
        const currentAdmin = await requireAdmin();
        if (userId === currentAdmin.id) {
            return { success: false, error: 'No puedes banearte a ti mismo' };
        }

        const adminSupabase = await createAdminClient();

        const { data: targetProfile } = await adminSupabase
            .from('profiles')
            .select('is_banned, role')
            .eq('id', userId)
            .single();

        if (targetProfile?.role === 'super_admin') {
            return { success: false, error: 'No se puede banear a un super_admin' };
        }

        const newBanStatus = !targetProfile?.is_banned;

        await adminSupabase.from('profiles').update({ is_banned: newBanStatus }).eq('id', userId);

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

export async function deleteUser(userId: string) {
    try {
        const currentAdmin = await requireAdmin();
        if (userId === currentAdmin.id) {
            return { success: false, error: 'No puedes eliminarte a ti mismo' };
        }

        const adminSupabase = await createAdminClient();

        const { data: target } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (target?.role === 'super_admin') {
            return { success: false, error: 'No se puede eliminar un super_admin' };
        }

        const { error: deleteError } = await adminSupabase.rpc('delete_user_and_related', {
            user_id: userId,
        });

        if (deleteError) {
            // Función SQL no existe — hacer los deletes directamente
            const tables: Array<{ table: string; column: string }> = [
                { table: 'reviews', column: 'user_id' },
                { table: 'party_members', column: 'user_id' },
                { table: 'party_messages', column: 'user_id' },
                { table: 'parties', column: 'host_id' },
                { table: 'search_history', column: 'user_id' },
                { table: 'notifications', column: 'user_id' },
                { table: 'profiles', column: 'id' },
            ];
            for (const { table, column } of tables) {
                await adminSupabase.from(table).delete().eq(column, userId);
            }
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

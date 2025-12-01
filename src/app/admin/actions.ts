'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Helper to ensure the current user is an admin.
 * Throws an error if not authorized.
 */
async function requireAdmin() {
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

export async function getDashboardStats() {
    try {
        await requireAdmin();

        // Use Admin Client to bypass RLS for stats
        const supabase = await createAdminClient();

        // Get total users
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // Get active rooms count
        const { count: activeRooms } = await supabase
            .from('watch_parties')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'finished');

        // Get total reviews count
        const { count: totalReviews } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true });

        return {
            totalUsers: totalUsers || 0,
            activeUsers: activeRooms || 0, // Using Active Rooms as "Active Users" metric for now
            conversionRate: totalReviews?.toString() || "0", // Using Total Reviews as "Conversion" metric for now
            costs: "$0.00",
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            totalUsers: 0,
            activeUsers: 0,
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

        return { success: true, url: data.properties?.action_link };
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



// --- Live Ops Actions ---

export async function getRooms() {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        // Fetch active rooms (not finished)
        const { data, error } = await supabase
            .from('parties')
            .select('*')
            .neq('status', 'finished')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching rooms:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        return [];
    }
}

export async function terminateRoom(roomId: string) {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        const { error } = await supabase
            .from('parties')
            .update({ status: 'finished', ended_at: new Date().toISOString() })
            .eq('id', roomId);

        if (error) return { success: false, error: error.message };

        revalidatePath('/admin/live-ops');
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Unauthorized' };
    }
}

export async function broadcastRoomMessage(roomId: string, message: string) {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        // Assuming 'party_messages' table exists
        const { error } = await supabase
            .from('party_messages')
            .insert({
                party_id: roomId,
                content: `[SYSTEM ALERT]: ${message}`,
                is_system: true, // If column exists, otherwise we rely on content format
                user_id: (await supabase.auth.getUser()).data.user?.id // Admin ID
            });

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Unauthorized' };
    }
}

export async function getRoomUsers(roomId: string) {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        // Fetch party members
        const { data: members, error: membersError } = await supabase
            .from('party_members')
            .select('*')
            .eq('party_id', roomId);

        if (membersError) {
            console.error('Error fetching room users:', membersError);
            return [];
        }

        if (!members || members.length === 0) return [];

        // Fetch profiles for these members
        const userIds = members.map(m => m.user_id);
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', userIds);

        if (profilesError) {
            console.error('Error fetching member profiles:', profilesError);
            // Return members without profile data if profile fetch fails
            return members.map(member => ({
                ...member,
                profiles: { full_name: 'Unknown', email: 'Unknown', avatar_url: null }
            }));
        }

        // Merge data
        const membersWithProfiles = members.map(member => {
            const profile = profiles?.find(p => p.id === member.user_id);
            return {
                ...member,
                profiles: profile || { full_name: 'Unknown', email: 'Unknown', avatar_url: null }
            };
        });

        return membersWithProfiles;
    } catch (error) {
        return [];
    }
}

export async function kickUserFromRoom(roomId: string, userId: string) {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        const { error } = await supabase
            .from('party_members')
            .delete()
            .eq('party_id', roomId)
            .eq('user_id', userId);

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Unauthorized' };
    }
}

export async function warnUser(roomId: string, userId: string, message: string) {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        // Send a private system message (or just a system message tagged for that user if schema supported, 
        // but for now we'll send a general system message mentioning the user)

        // First get user name for better context
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
        const userName = profile?.full_name || 'User';

        const { error } = await supabase
            .from('party_messages')
            .insert({
                party_id: roomId,
                content: `[WARNING to ${userName}]: ${message}`,
                is_system: true,
                user_id: (await supabase.auth.getUser()).data.user?.id
            });

        if (error) return { success: false, error: error.message };
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
        const supabase = await createAdminClient();

        // Manually delete related records to avoid foreign key constraints
        // 1. Delete reviews
        await supabase.from('reviews').delete().eq('user_id', userId);

        // 2. Delete party memberships
        await supabase.from('party_members').delete().eq('user_id', userId);

        // 3. Delete party messages
        await supabase.from('party_messages').delete().eq('user_id', userId);

        // 4. Delete parties hosted by user
        await supabase.from('parties').delete().eq('host_id', userId);

        // 5. Delete search history
        await supabase.from('search_history').delete().eq('user_id', userId);

        // 6. Delete announcements created by user
        await supabase.from('announcements').delete().eq('created_by', userId);

        // 7. Delete admin logs (if user was admin)
        await supabase.from('admin_logs').delete().eq('admin_id', userId);

        // 8. Delete ip bans created by user (if user was admin)
        await supabase.from('ip_bans').delete().eq('banned_by', userId);

        // 9. Delete profile
        await supabase.from('profiles').delete().eq('id', userId);

        // 6. Delete from Auth
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

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

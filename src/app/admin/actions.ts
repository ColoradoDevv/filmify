'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getDashboardStats() {
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
}

export async function getUsers(page = 1, pageSize = 10, search = '') {
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

    // Fetch emails from auth.users for the retrieved profiles
    const profilesWithEmail = await Promise.all(
        (profiles || []).map(async (profile) => {
            const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.id);
            return {
                ...profile,
                email: user?.email || 'No email found',
            };
        })
    );

    return {
        data: profilesWithEmail,
        count: count || 0
    };
}

export async function updateUserRole(userId: string, newRole: 'admin' | 'user') {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Check if requester is admin (using normal client to verify session)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (requesterProfile?.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    // Use Admin Client to perform the update (bypassing RLS if necessary)
    const { error } = await adminSupabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/users');
    return { success: true };
}

export async function banUser(userId: string) {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Check if requester is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (requesterProfile?.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    // Toggle ban status (or set to true)
    // First get current status
    const { data: targetProfile } = await adminSupabase
        .from('profiles')
        .select('is_banned')
        .eq('id', userId)
        .single();

    const newBanStatus = !targetProfile?.is_banned;
    revalidatePath('/admin');
    return { success: true };
}



// --- Live Ops Actions ---

export async function getRooms() {
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
}

export async function terminateRoom(roomId: string) {
    const supabase = await createAdminClient();

    // Check if requester is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (requesterProfile?.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('parties')
        .update({ status: 'finished', ended_at: new Date().toISOString() })
        .eq('id', roomId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/live-ops');
    revalidatePath('/admin');
    return { success: true };
}

// --- Moderation Actions ---

export async function getLatestReviews() {
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
}

export async function deleteReview(reviewId: string) {
    const supabase = await createAdminClient();

    // Check if requester is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (requesterProfile?.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/moderation');
    revalidatePath('/admin');
    return { success: true };
}

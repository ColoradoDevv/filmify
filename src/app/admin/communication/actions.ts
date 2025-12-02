'use server';

import { createServiceRoleClient, createClient } from '@/lib/supabase/server';

export async function getBroadcastHistory() {
    const supabaseAuth = await createClient();
    const supabaseAdmin = createServiceRoleClient();

    // Verify admin privileges
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return [];

    const { data: requesterProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (requesterProfile?.role !== 'admin' && requesterProfile?.role !== 'super_admin') {
        return [];
    }

    const { data: logs, error } = await supabaseAdmin
        .from('admin_logs')
        .select('*')
        .eq('action', 'BROADCAST_MESSAGE')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching broadcast history:', error);
        return [];
    }

    if (!logs || logs.length === 0) return [];

    // Manually fetch profiles
    const userIds = [...new Set(logs.map(l => l.admin_id).filter(Boolean))];

    if (userIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        return logs.map(l => ({
            ...l,
            profiles: profileMap.get(l.admin_id) || { email: 'Unknown' }
        }));
    }

    return logs.map(l => ({ ...l, profiles: { email: 'Unknown' } }));
}

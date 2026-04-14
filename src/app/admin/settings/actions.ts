'use server';

import { unstable_cache, revalidatePath } from 'next/cache';
import { getSettings, saveSettings, AdminSettings } from '@/lib/admin-settings';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';

export const fetchSettings = unstable_cache(async () => {
    return await getSettings();
}, {
    revalidate: 60,
});

export async function updateSettings(newSettings: AdminSettings) {
    const supabaseAuth = await createClient();
    const supabaseAdmin = createServiceRoleClient();

    // Verify admin privileges
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: requesterProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (requesterProfile?.role !== 'admin' && requesterProfile?.role !== 'super_admin') {
        return { success: false, error: 'Unauthorized' };
    }

    const success = await saveSettings(newSettings);
    if (!success) return { success: false, error: 'Failed to save settings' };

    revalidatePath('/admin/settings');
    return { success: true };
}

export async function updateAnnouncement(announcement: string, type: 'info' | 'warning' | 'success' = 'info') {
    const supabaseAuth = await createClient();
    const supabaseAdmin = createServiceRoleClient();

    // Verify admin privileges
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: requesterProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (requesterProfile?.role !== 'admin' && requesterProfile?.role !== 'super_admin') {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabaseAdmin
        .from('announcements')
        .insert({
            message: announcement,
            type: type,
            created_by: user.id,
            is_active: true,
            start_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error creating announcement:', error);
        return { success: false, error: 'Failed to save announcement: ' + error.message };
    }

    revalidatePath('/admin/settings');
    revalidatePath('/', 'layout'); // Revalidate global layout
    return { success: true };
}

export async function deactivateAnnouncement(id: string) {
    const supabaseAuth = await createClient();
    const supabaseAdmin = createServiceRoleClient();

    // Verify admin privileges
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (!user) {
        console.error('DeactivateAnnouncement: No user found', authError);
        return { success: false, error: 'Unauthorized: No user session' };
    }

    const { data: requesterProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || (requesterProfile?.role !== 'admin' && requesterProfile?.role !== 'super_admin')) {
        console.error('DeactivateAnnouncement: Not admin', {
            userId: user.id,
            role: requesterProfile?.role,
            error: profileError
        });
        return { success: false, error: 'Unauthorized: Not admin' };
    }

    const { error } = await supabaseAdmin
        .from('announcements')
        .update({ is_active: false, end_at: new Date().toISOString() })
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/settings');
    revalidatePath('/', 'layout');
    return { success: true };
}

export async function getAnnouncementHistory() {
    const supabase = createServiceRoleClient();

    const { data: announcements, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching history:', error);
        return [];
    }

    if (!announcements || announcements.length === 0) return [];

    // Manually fetch profiles to avoid missing FK relationship error
    const userIds = [...new Set(announcements.map(a => a.created_by).filter(Boolean))];

    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        return announcements.map(a => ({
            ...a,
            profiles: profileMap.get(a.created_by) || { email: 'Unknown' }
        }));
    }

    const result = announcements.map(a => ({ ...a, profiles: { email: 'Unknown' } }));
    console.log('getAnnouncementHistory returning:', result.length, 'records. Active:', result.filter(r => r.is_active).length);
    return result;
}

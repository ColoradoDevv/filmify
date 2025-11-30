'use server';

import { getSettings, saveSettings, AdminSettings } from '@/lib/admin-settings';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function fetchSettings() {
    return await getSettings();
}

export async function updateSettings(newSettings: AdminSettings) {
    const supabase = await createAdminClient();

    // Verify admin privileges
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

    const success = await saveSettings(newSettings);
    if (!success) return { success: false, error: 'Failed to save settings' };

    revalidatePath('/admin/settings');
    return { success: true };
}

export async function updateAnnouncement(announcement: string, type: 'info' | 'warning' | 'success' = 'info') {
    const supabase = await createAdminClient();

    // Verify admin privileges
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
    const supabase = await createAdminClient();

    const { error } = await supabase
        .from('announcements')
        .update({ is_active: false, end_at: new Date().toISOString() })
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/settings');
    revalidatePath('/', 'layout');
    return { success: true };
}

export async function getAnnouncementHistory() {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('announcements')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching history:', error);
    }

    return data || [];
}

'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/admin-logger';

export async function addToBlacklist(tmdbId: number, mediaType: 'movie' | 'tv', reason: string) {
    const supabase = await createAdminClient();
    const { data: { user } } = await createClient().then(c => c.auth.getUser());

    if (!user) return { success: false, error: 'Unauthorized' };

    // Check if already exists
    const { data: existing } = await supabase
        .from('content_blacklist')
        .select('id')
        .eq('tmdb_id', tmdbId)
        .eq('media_type', mediaType)
        .single();

    if (existing) {
        return { success: false, error: 'Content already blacklisted' };
    }

    const { error } = await supabase.from('content_blacklist').insert({
        tmdb_id: tmdbId,
        media_type: mediaType,
        reason,
    });

    if (error) return { success: false, error: error.message };

    await logAdminAction('BLACKLIST_CONTENT', tmdbId.toString(), { mediaType, reason });
    revalidatePath('/admin/content');
    return { success: true };
}

export async function removeFromBlacklist(id: string) {
    const supabase = await createAdminClient();

    const { data: item } = await supabase.from('content_blacklist').select('tmdb_id').eq('id', id).single();

    const { error } = await supabase.from('content_blacklist').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    if (item) {
        await logAdminAction('UNBLACKLIST_CONTENT', item.tmdb_id.toString());
    }

    revalidatePath('/admin/content');
    return { success: true };
}

export async function getBlacklist() {
    const supabase = await createAdminClient();
    const { data } = await supabase.from('content_blacklist').select('*').order('created_at', { ascending: false });
    return data || [];
}

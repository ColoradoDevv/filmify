'use server';

import { requireAdmin } from '../actions';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

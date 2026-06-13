'use server';

import { requireAdmin } from '@/app/admin/actions';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ReportedReview = {
    id: string;
    media_id: number;
    media_type: string;
    user_id: string;
    userEmail: string;
    username: string;
    content: string;
    rating: number;
    created_at: string;
};

export async function getReportedReviews(): Promise<ReportedReview[]> {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        const { data, error } = await supabase
            .from('reviews')
            .select('*, profiles:user_id(username, full_name)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[moderation] getReportedReviews error:', error);
            return [];
        }

        return (data ?? []).map((r: any) => ({
            id: r.id,
            media_id: r.media_id,
            media_type: r.media_type,
            user_id: r.user_id,
            userEmail: r.profiles?.full_name ?? 'Desconocido',
            username: r.profiles?.username ?? 'anon',
            content: r.content,
            rating: r.rating,
            created_at: r.created_at,
        }));
    } catch {
        return [];
    }
}

export async function deleteReview(reviewId: string) {
    try {
        await requireAdmin();
        const supabase = await createAdminClient();

        const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
        if (error) return { success: false, error: error.message };

        revalidatePath('/admin/moderation');
        return { success: true };
    } catch {
        return { success: false, error: 'Unauthorized' };
    }
}

export async function dismissReport(reviewId: string) {
    // Sin tabla de reportes separada, "dismiss" simplemente no elimina la reseña.
    // Si en el futuro se agrega tabla `reports`, actualizar aquí.
    await requireAdmin();
    return { success: true };
}

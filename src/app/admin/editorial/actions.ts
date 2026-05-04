'use server';

import { requireAdmin } from '@/app/admin/actions';
import { upsertArticle, deleteArticle, getAllArticlesAdmin } from '@/lib/editorial';
import { revalidatePath } from 'next/cache';

export async function getArticlesAction() {
    await requireAdmin();
    return getAllArticlesAdmin();
}

export async function saveArticleAction(formData: FormData) {
    await requireAdmin();

    const id       = formData.get('id') as string | null;
    const slug     = (formData.get('slug') as string).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const title    = (formData.get('title') as string).trim();
    const excerpt  = (formData.get('excerpt') as string).trim();
    const content  = (formData.get('content') as string).trim();
    const category = (formData.get('category') as string) || 'general';
    const tags     = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean);
    const author   = (formData.get('author_name') as string).trim() || 'FilmiFy Editorial';
    const status   = (formData.get('status') as 'draft' | 'published') || 'draft';
    const featured = formData.get('featured') === 'true';
    const cover_url = (formData.get('cover_url') as string).trim() || null;

    if (!slug || !title || !content || !excerpt) {
        return { success: false, error: 'Slug, título, extracto y contenido son obligatorios' };
    }

    const result = await upsertArticle({
        ...(id ? { id } : {}),
        slug, title, excerpt, content, category, tags,
        author_name: author, status, featured,
        cover_url: cover_url || null,
    });

    if (result.success) {
        revalidatePath('/editorial');
        revalidatePath(`/editorial/${slug}`);
    }

    return result;
}

export async function deleteArticleAction(id: string) {
    await requireAdmin();
    const result = await deleteArticle(id);
    if (result.success) revalidatePath('/editorial');
    return result;
}

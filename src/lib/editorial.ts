import { createServiceRoleClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export interface Article {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    cover_url: string | null;
    category: string;
    tags: string[];
    author_name: string;
    status: 'draft' | 'published';
    featured: boolean;
    read_time: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

export async function getPublishedArticles(limit = 20): Promise<Article[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('editorial_articles')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
    if (error) { console.error('[editorial]', error); return []; }
    return (data ?? []) as Article[];
}

export async function getFeaturedArticle(): Promise<Article | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('editorial_articles')
        .select('*')
        .eq('status', 'published')
        .eq('featured', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return (data as Article | null);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('editorial_articles')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
    return (data as Article | null);
}

export async function getArticlesByCategory(category: string, limit = 10): Promise<Article[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('editorial_articles')
        .select('*')
        .eq('status', 'published')
        .eq('category', category)
        .order('published_at', { ascending: false })
        .limit(limit);
    return (data ?? []) as Article[];
}

// ── Admin functions (service role) ──────────────────────────────────────────

export async function getAllArticlesAdmin(): Promise<Article[]> {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
        .from('editorial_articles')
        .select('*')
        .order('created_at', { ascending: false });
    return (data ?? []) as Article[];
}

export async function upsertArticle(article: Partial<Article> & { slug: string; title: string; content: string; excerpt: string }): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();
    const payload = {
        ...article,
        updated_at: new Date().toISOString(),
        published_at: article.status === 'published' ? (article.published_at ?? new Date().toISOString()) : article.published_at,
    };
    const { error } = await supabase
        .from('editorial_articles')
        .upsert(payload, { onConflict: 'slug' });
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteArticle(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
        .from('editorial_articles')
        .delete()
        .eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export const CATEGORIES: Record<string, string> = {
    general:   'General',
    streaming: 'Streaming',
    series:    'Series',
    peliculas: 'Películas',
    guias:     'Guías',
    premios:   'Premios',
    consejos:  'Consejos',
    noticias:  'Noticias',
};

// ── News feed (external RSS) ─────────────────────────────────────────────────

export interface NewsItem {
    id: string;
    guid: string;
    title: string;
    excerpt: string;
    image_url: string | null;
    source_name: string;
    source_url: string;
    author: string | null;
    original_url: string;
    category: string;
    published_at: string | null;
    fetched_at: string;
}

export async function getLatestNews(limit = 30): Promise<NewsItem[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('news_feed')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);
    return (data ?? []) as NewsItem[];
}

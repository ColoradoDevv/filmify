import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Article, NewsItem } from '@/lib/editorial-types';
import { CATEGORIES } from '@/lib/editorial-types';

// Re-export so server components can keep importing from '@/lib/editorial'
export type { Article, NewsItem };
export { CATEGORIES };

/**
 * Las lecturas de contenido PÚBLICO publicado usan el cliente de service role
 * (sin cookies). Esto es deliberado: el contenido es público de todas formas,
 * y usar el cliente de sesión (createClient con cookies) marca estas rutas
 * como dinámicas, rompiendo la generación estática del sitemap y de
 * generateStaticParams (error "couldn't be rendered statically because it
 * used cookies"). El service role lee igual sin depender de la sesión.
 */
export async function getPublishedArticles(limit = 20): Promise<Article[]> {
    const supabase = createServiceRoleClient();
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
    const supabase = createServiceRoleClient();
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
    const supabase = createServiceRoleClient();
    const { data } = await supabase
        .from('editorial_articles')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
    return (data as Article | null);
}

export async function getArticlesByCategory(category: string, limit = 10): Promise<Article[]> {
    const supabase = createServiceRoleClient();
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

// ── News feed (external RSS) ─────────────────────────────────────────────────

export async function getLatestNews(limit = 30): Promise<NewsItem[]> {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
        .from('news_feed')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);
    return (data ?? []) as NewsItem[];
}

export async function getNewsByCategory(category: string, limit = 20): Promise<NewsItem[]> {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
        .from('news_feed')
        .select('*')
        .eq('category', category)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);
    return (data ?? []) as NewsItem[];
}

export async function getArticlesAndNewsByCategory(category: string): Promise<{
    articles: Article[];
    news: NewsItem[];
}> {
    const [articles, news] = await Promise.all([
        getArticlesByCategory(category, 12),
        getNewsByCategory(category, 20),
    ]);
    return { articles, news };
}

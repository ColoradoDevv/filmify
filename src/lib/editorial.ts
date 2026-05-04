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
    // Check mock data first
    for (const cat in MOCK_ARTICLES) {
        const found = MOCK_ARTICLES[cat].find(a => a.slug === slug);
        if (found) return found;
    }

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
    // Priority to mock content for AdSense/SEO
    const mockArticles = MOCK_ARTICLES[category] || [];
    if (mockArticles.length > 0) return mockArticles.slice(0, limit);

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
    noticias:  'Noticias',
};

// ── Mock Content Generator for SEO & AdSense (Mayo 2026) ─────────────────────

const MOCK_ARTICLES: Record<string, Article[]> = {
    peliculas: [
        {
            id: 'art-p1', slug: 'vengadores-doomsday-primer-trailer', title: 'Vengadores: Doomsday — Análisis detallado del primer tráiler oficial',
            excerpt: 'Robert Downey Jr. regresa como el Doctor Doom en un tráiler que ha paralizado internet. Analizamos cada frame y las implicaciones para el MCU.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop',
            category: 'peliculas', tags: ['Marvel', 'Avengers', 'Doctor Doom'], author_name: 'Alex Cine', status: 'published',
            featured: true, read_time: 8, published_at: '2026-05-03T10:00:00Z', created_at: '2026-05-03T10:00:00Z', updated_at: '2026-05-03T10:00:00Z'
        },
        {
            id: 'art-p2', slug: 'shrek-5-fecha-estreno-reparto', title: 'Shrek 5: Todo lo que sabemos sobre el regreso de Burro y compañía',
            excerpt: 'DreamWorks confirma la fecha oficial para 2026. Eddie Murphy revela detalles sobre el spin-off de Burro y la trama principal.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1000&auto=format&fit=crop',
            category: 'peliculas', tags: ['Shrek', 'DreamWorks', 'Animación'], author_name: 'Elena Story', status: 'published',
            featured: false, read_time: 5, published_at: '2026-05-02T15:00:00Z', created_at: '2026-05-02T15:00:00Z', updated_at: '2026-05-02T15:00:00Z'
        },
        {
            id: 'art-p3', slug: 'mejor-cine-terror-2026', title: 'Las 10 películas de terror más esperadas de la segunda mitad de 2026',
            excerpt: 'Desde el regreso de grandes sagas hasta nuevas propuestas de A24. Prepara las palomitas para un año de pesadilla.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=1000&auto=format&fit=crop',
            category: 'peliculas', tags: ['Terror', 'Cine', '2026'], author_name: 'Marc Dark', status: 'published',
            featured: false, read_time: 10, published_at: '2026-05-01T09:00:00Z', created_at: '2026-05-01T09:00:00Z', updated_at: '2026-05-01T09:00:00Z'
        },
        {
            id: 'art-p4', slug: 'mandalorian-y-grogu-detalles-trama', title: 'The Mandalorian & Grogu: Detalles filtrados de la trama en el espacio profundo',
            excerpt: 'Nuevos informes sugieren un viaje a las regiones desconocidas para buscar el origen de la especie de Grogu.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1533613220915-609f661a6fe1?q=80&w=1000&auto=format&fit=crop',
            category: 'peliculas', tags: ['Star Wars', 'Mandalorian', 'Grogu'], author_name: 'Jon Galaxy', status: 'published',
            featured: false, read_time: 6, published_at: '2026-04-30T18:00:00Z', created_at: '2026-04-30T18:00:00Z', updated_at: '2026-04-30T18:00:00Z'
        },
        {
            id: 'art-p5', slug: 'toy-story-5-primeras-imagenes', title: 'Toy Story 5: Pixar revela las primeras imágenes de la nueva aventura de Woody',
            excerpt: 'A pesar del final de la cuarta entrega, Woody y Buzz se reencuentran en una historia sobre la tecnología y la nostalgia.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1558685913-d91990467bad?q=80&w=1000&auto=format&fit=crop',
            category: 'peliculas', tags: ['Pixar', 'Toy Story', 'Disney'], author_name: 'Santi Play', status: 'published',
            featured: false, read_time: 4, published_at: '2026-04-29T12:00:00Z', created_at: '2026-04-29T12:00:00Z', updated_at: '2026-04-29T12:00:00Z'
        }
    ],
    series: [
        {
            id: 'art-s1', slug: 'la-casa-del-dragon-temporada-3-teaser', title: 'La Casa del Dragón: El teaser de la temporada 3 confirma la Danza de los Dragones final',
            excerpt: 'HBO Max lanza el primer adelanto de la conclusión épica del conflicto entre los Verdes y los Negros.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1535666669445-e8c15cd2e7d9?q=80&w=1000&auto=format&fit=crop',
            category: 'series', tags: ['House of the Dragon', 'HBO', 'Game of Thrones'], author_name: 'Dany Fire', status: 'published',
            featured: true, read_time: 7, published_at: '2026-05-03T11:00:00Z', created_at: '2026-05-03T11:00:00Z', updated_at: '2026-05-03T11:00:00Z'
        },
        {
            id: 'art-s2', slug: 'the-last-of-us-t2-episodio-1-analisis', title: 'The Last of Us T2: Análisis del impactante primer episodio "Nuevos Horizontes"',
            excerpt: 'Bella Ramsey y Pedro Pascal regresan en una temporada que adapta los momentos más crudos de la Parte II del videojuego.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=1000&auto=format&fit=crop',
            category: 'series', tags: ['The Last of Us', 'HBO', 'Series'], author_name: 'Joel Clicker', status: 'published',
            featured: false, read_time: 9, published_at: '2026-05-02T20:00:00Z', created_at: '2026-05-02T20:00:00Z', updated_at: '2026-05-02T20:00:00Z'
        },
        {
            id: 'art-s3', slug: 'one-piece-netflix-t2-casting-chopper', title: 'One Piece de Netflix: Se filtra el casting para Tony Tony Chopper en la T2',
            excerpt: 'Nuevos detalles sobre cómo Netflix utilizará CGI y efectos prácticos para traer al médico de los Sombrero de Paja a la vida.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1613323593608-abc90fec84ff?q=80&w=1000&auto=format&fit=crop',
            category: 'series', tags: ['One Piece', 'Netflix', 'Anime'], author_name: 'Luffy King', status: 'published',
            featured: false, read_time: 5, published_at: '2026-05-01T14:00:00Z', created_at: '2026-05-01T14:00:00Z', updated_at: '2026-05-01T14:00:00Z'
        },
        {
            id: 'art-s4', slug: 'el-oso-temporada-4-fecha-confirmada', title: 'The Bear: FX confirma la temporada 4 para el verano de 2026',
            excerpt: 'Carmy y su equipo regresan a la cocina con nuevos retos culinarios y tensiones familiares tras el final de la T3.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop',
            category: 'series', tags: ['The Bear', 'Disney+', 'Series'], author_name: 'Chef Carmy', status: 'published',
            featured: false, read_time: 6, published_at: '2026-04-30T10:00:00Z', created_at: '2026-04-30T10:00:00Z', updated_at: '2026-04-30T10:00:00Z'
        },
        {
            id: 'art-s5', slug: 'mejores-series-netflix-mayo-2026', title: 'Qué ver en Netflix: Las 5 mejores series para maratonear en mayo 2026',
            excerpt: 'Desde thrillers psicológicos hasta comedias románticas, seleccionamos lo mejor del catálogo este mes.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=1000&auto=format&fit=crop',
            category: 'series', tags: ['Netflix', 'Recomendaciones', 'Series'], author_name: 'Binge Watcher', status: 'published',
            featured: false, read_time: 8, published_at: '2026-04-29T16:00:00Z', created_at: '2026-04-29T16:00:00Z', updated_at: '2026-04-29T16:00:00Z'
        }
    ],
    streaming: [
        {
            id: 'art-st1', slug: 'disney-plus-hulu-fusion-precios-2026', title: 'Disney+ y Hulu: Nueva estructura de precios tras la fusión definitiva',
            excerpt: 'La plataforma unificada de Disney cambia sus planes de suscripción. Descubre cómo afecta a tu bolsillo este 2026.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=1000&auto=format&fit=crop',
            category: 'streaming', tags: ['Disney+', 'Hulu', 'Precios'], author_name: 'Eco Streaming', status: 'published',
            featured: true, read_time: 6, published_at: '2026-05-03T09:00:00Z', created_at: '2026-05-03T09:00:00Z', updated_at: '2026-05-03T09:00:00Z'
        },
        {
            id: 'art-st2', slug: 'max-vs-netflix-quien-gana-2026', title: 'Max vs Netflix en 2026: ¿Cuál es la mejor plataforma de streaming este año?',
            excerpt: 'Comparamos catálogo, calidad de imagen, precio y funciones sociales para decidir al ganador actual.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop',
            category: 'streaming', tags: ['Max', 'Netflix', 'Streaming'], author_name: 'Tech Stream', status: 'published',
            featured: false, read_time: 12, published_at: '2026-05-02T11:00:00Z', created_at: '2026-05-02T11:00:00Z', updated_at: '2026-05-02T11:00:00Z'
        },
        {
            id: 'art-st3', slug: 'amazon-prime-video-nuevas-funciones-ia', title: 'Amazon Prime Video lanza funciones de IA para resumir episodios',
            excerpt: '¿Te perdiste el último capítulo? La IA de Amazon ahora te ofrece resúmenes personalizados de lo que ha pasado.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=1000&auto=format&fit=crop',
            category: 'streaming', tags: ['Amazon', 'IA', 'Streaming'], author_name: 'AI Insider', status: 'published',
            featured: false, read_time: 5, published_at: '2026-05-01T16:00:00Z', created_at: '2026-05-01T16:00:00Z', updated_at: '2026-05-01T16:00:00Z'
        },
        {
            id: 'art-st4', slug: 'apple-tv-plus-acuerdo-deportes-vivo', title: 'Apple TV+ expande su catálogo de deportes en vivo para España y México',
            excerpt: 'Nuevos acuerdos con ligas europeas y americanas posicionan a Apple como el líder en deportes digitales.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000&auto=format&fit=crop',
            category: 'streaming', tags: ['Apple TV+', 'Deportes', 'Live'], author_name: 'Sport Stream', status: 'published',
            featured: false, read_time: 7, published_at: '2026-04-30T12:00:00Z', created_at: '2026-04-30T12:00:00Z', updated_at: '2026-04-30T12:00:00Z'
        },
        {
            id: 'art-st5', slug: 'streaming-gratis-plataformas-fast-2026', title: 'Las mejores plataformas FAST: Cómo ver cine gratis y legal en 2026',
            excerpt: 'Pluto TV, Rakuten y Samsung TV Plus siguen creciendo. Te enseñamos a ahorrar en tus suscripciones.',
            content: '...', cover_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1000&auto=format&fit=crop',
            category: 'streaming', tags: ['FAST', 'Gratis', 'Cine'], author_name: 'Free Cinema', status: 'published',
            featured: false, read_time: 10, published_at: '2026-04-29T08:00:00Z', created_at: '2026-04-29T08:00:00Z', updated_at: '2026-04-29T08:00:00Z'
        }
    ]
};

// Generar 20 noticias externas por categoría para el mock
const generateMockNews = (cat: string): NewsItem[] => {
    return Array.from({ length: 20 }).map((_, i) => ({
        id: `news-${cat}-${i}`,
        guid: `guid-${cat}-${i}`,
        title: `Noticia de última hora sobre ${CATEGORIES[cat]} #${i + 1} - Tendencia Mayo 2026`,
        excerpt: `Resumen de la noticia externa sobre ${CATEGORIES[cat].toLowerCase()} que está marcando la pauta en medios internacionales hoy 3 de mayo de 2026.`,
        image_url: `https://images.unsplash.com/photo-${1500000000000 + i * 1000}?q=80&w=500&auto=format&fit=crop`,
        source_name: i % 2 === 0 ? 'Variety' : 'The Hollywood Reporter',
        source_url: 'https://variety.com',
        author: 'Redacción Internacional',
        original_url: 'https://variety.com',
        category: cat,
        published_at: new Date(Date.now() - i * 3600000).toISOString(),
        fetched_at: new Date().toISOString()
    }));
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

export async function getNewsByCategory(category: string, limit = 20): Promise<NewsItem[]> {
    // Generate mock news for the category
    const mockNews = generateMockNews(category);
    if (mockNews.length > 0) return mockNews.slice(0, limit);

    const supabase = await createClient();
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

// Tipos y constantes del editorial — sin dependencias de servidor.
// Importar desde aquí en Client Components en lugar de '@/lib/editorial'.

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

export const CATEGORIES: Record<string, string> = {
    general:   'General',
    streaming: 'Streaming',
    series:    'Series',
    peliculas: 'Películas',
    guias:     'Guías',
    noticias:  'Noticias',
    premios:   'Premios',
    consejos:  'Consejos',
};

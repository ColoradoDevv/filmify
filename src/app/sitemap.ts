import { MetadataRoute } from 'next';
import { getBlacklist } from '@/server/services/tmdb';
import {
    getVimeusMovieCatalog,
    getVimeusSeriesCatalog,
} from '@/server/services/vimeus';
import { GENRE_PAGES } from '@/lib/genres';
import { getPublishedArticles, CATEGORIES } from '@/lib/editorial';
import { getOptionalApiKeys, hasRequiredEnv } from '@/lib/env';

/**
 * Dynamic Sitemap for FilmiFy
 * Generates sitemap.xml with static pages and top popular movies/TV shows
 * This helps Google discover and index our most valuable content first.
 *
 * Safe-by-default: if TMDB is not configured (e.g. during a cold build without
 * secrets), we still emit the static pages instead of crashing the route.
 */

// El sitemap puede sondear cientos de embeds en frío (luego todo queda en
// caché 6h); amplía el límite de ejecución de la función en Vercel.
export const maxDuration = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const BASE_URL = getOptionalApiKeys().appUrl;
    const currentDate = new Date();

    // Static pages with high priority
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/browse`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/about`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/search`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/editorial`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/live-tv`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        ...Object.keys(CATEGORIES).map((cat) => ({
            url: `${BASE_URL}/editorial/categoria/${cat}`,
            lastModified: currentDate,
            changeFrequency: 'weekly' as const,
            priority: 0.5,
        })),
        {
            url: `${BASE_URL}/contact`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/legal/privacy`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${BASE_URL}/legal/terms`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${BASE_URL}/legal/cookies`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
    ];

    if (!hasRequiredEnv()) {
        console.warn('[sitemap] TMDB not configured — emitting static pages only');
        return staticPages;
    }

    try {
        // La blacklist es opcional — si su consulta falla (p. ej. Supabase),
        // no debe impedir generar el sitemap del catálogo.
        let blacklist = new Set<number>();
        try {
            blacklist = new Set(await getBlacklist());
        } catch (e) {
            console.warn('[sitemap] blacklist fetch failed, continuing', e);
        }

        // El catálogo del listing de Vimeus YA son títulos reproducibles, así
        // que se usa directamente — sin verificar embed por embed (eso es lo
        // que provocaba timeouts). Solo unas pocas peticiones paginadas.
        const [movieCatalog, seriesCatalog] = await Promise.all([
            getVimeusMovieCatalog(1000),
            getVimeusSeriesCatalog(500),
        ]);

        const seenMovies = new Set<number>();
        const movieUrls: MetadataRoute.Sitemap = [];
        movieCatalog.forEach(m => {
            if (blacklist.has(m.tmdb_id) || seenMovies.has(m.tmdb_id)) return;
            seenMovies.add(m.tmdb_id);
            movieUrls.push({
                url: `${BASE_URL}/movie/${m.tmdb_id}`,
                lastModified: currentDate,
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            });
        });

        const seenShows = new Set<number>();
        const tvUrls: MetadataRoute.Sitemap = [];
        seriesCatalog.forEach(s => {
            if (blacklist.has(s.tmdb_id) || seenShows.has(s.tmdb_id)) return;
            seenShows.add(s.tmdb_id);
            tvUrls.push({
                url: `${BASE_URL}/tv/${s.tmdb_id}`,
                lastModified: currentDate,
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            });
        });

        // Páginas de género — landing pages permanentes de alto valor.
        const genreUrls: MetadataRoute.Sitemap = GENRE_PAGES.map((g) => ({
            url: `${BASE_URL}/genero/${g.slug}`,
            lastModified: currentDate,
            changeFrequency: 'daily' as const,
            priority: 0.7,
        }));

        // Editorial articles — public, high-value SEO content.
        let articleUrls: MetadataRoute.Sitemap = [];
        try {
            const articles = await getPublishedArticles(100);
            articleUrls = articles.map((a) => ({
                url: `${BASE_URL}/editorial/${a.slug}`,
                lastModified: new Date(a.updated_at || a.published_at || a.created_at),
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }));
        } catch (e) {
            console.warn('[sitemap] editorial fetch failed', e);
        }

        // Combine all URLs
        return [
            ...staticPages,
            ...genreUrls,
            ...movieUrls,
            ...tvUrls,
            ...articleUrls,
        ];
    } catch (error) {
        console.error('Error generating sitemap:', error);
        // Return at least static pages if API fails
        return staticPages;
    }
}

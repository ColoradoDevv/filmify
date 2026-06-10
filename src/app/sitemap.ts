import { MetadataRoute } from 'next';
import { getPopular, getTrending, getBlacklist } from '@/server/services/tmdb';
import {
    filterAvailableMovies,
    filterAvailableSeries,
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

    // If TMDB is not configured at build time, emit only static pages.
    if (!hasRequiredEnv()) {
        console.warn('[sitemap] TMDB not configured — emitting static pages only');
        return staticPages;
    }

    try {
        const blacklistIds = await getBlacklist();
        const blacklist = new Set(blacklistIds);

        // Fetch top popular movies (multiple pages for better coverage)
        const moviePages = await Promise.all([
            getPopular(1),
            getPopular(2),
            getPopular(3),
            getPopular(4),
            getPopular(5),
        ]);

        // Catálogo real del proveedor: los títulos más recientemente
        // sincronizados en Vimeus (con su fecha real como lastModified).
        // Esto multiplica la superficie indexable frente a usar solo trending.
        const [movieCatalog, seriesCatalog] = await Promise.all([
            getVimeusMovieCatalog(300),
            getVimeusSeriesCatalog(150),
        ]);

        // Only announce content that is actually playable — unavailable
        // titles 404, and a sitemap full of 404s tanks crawl trust.
        // (filterAvailable* aplica listing + sonda de embeds, ambas cacheadas.)
        const movieCandidates = new Map<number, Date>();
        movieCatalog.forEach(m => {
            if (!blacklist.has(m.tmdb_id)) {
                movieCandidates.set(m.tmdb_id, new Date(m.synced_at));
            }
        });
        moviePages.flatMap(page => page.results).forEach(m => {
            if (!blacklist.has(m.id) && !movieCandidates.has(m.id)) {
                movieCandidates.set(m.id, currentDate);
            }
        });

        const availableMovies = await filterAvailableMovies(
            Array.from(movieCandidates.keys()).map(id => ({ id }))
        );

        const movieUrls: MetadataRoute.Sitemap = availableMovies.map(({ id }) => ({
            url: `${BASE_URL}/movie/${id}`,
            lastModified: movieCandidates.get(id) ?? currentDate,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));

        // Series: catálogo del proveedor + trending, igualmente filtradas.
        const tvPages = await Promise.all([
            getTrending('tv', 'week', 1),
            getTrending('tv', 'week', 2),
            getTrending('tv', 'week', 3),
        ]);

        const seriesCandidates = new Map<number, Date>();
        seriesCatalog.forEach(s => {
            if (!blacklist.has(s.tmdb_id)) {
                seriesCandidates.set(s.tmdb_id, new Date(s.synced_at));
            }
        });
        tvPages.flatMap(page => page.results).forEach(s => {
            if (!blacklist.has(s.id) && !seriesCandidates.has(s.id)) {
                seriesCandidates.set(s.id, currentDate);
            }
        });

        const availableShows = await filterAvailableSeries(
            Array.from(seriesCandidates.keys()).map(id => ({ id }))
        );

        const tvUrls: MetadataRoute.Sitemap = availableShows.map(({ id }) => ({
            url: `${BASE_URL}/tv/${id}`,
            lastModified: seriesCandidates.get(id) ?? currentDate,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));

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
        return [...staticPages, ...genreUrls, ...movieUrls, ...tvUrls, ...articleUrls];
    } catch (error) {
        console.error('Error generating sitemap:', error);
        // Return at least static pages if API fails
        return staticPages;
    }
}

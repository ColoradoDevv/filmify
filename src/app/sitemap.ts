import { MetadataRoute } from 'next';
import { getPopular, getTrending } from '@/lib/tmdb/service';

/**
 * Dynamic Sitemap for FilmiFy
 * Generates sitemap.xml with static pages and top popular movies/TV shows
 * This helps Google discover and index our most valuable content first
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://filmify.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
            url: `${BASE_URL}/search`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/favorites`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/rooms`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.7,
        },
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

    try {
        // Fetch top popular movies (multiple pages for better coverage)
        const moviePages = await Promise.all([
            getPopular(1),
            getPopular(2),
            getPopular(3),
            getPopular(4),
            getPopular(5),
        ]);

        const movieUrls: MetadataRoute.Sitemap = moviePages
            .flatMap(page => page.results)
            .map(movie => ({
                url: `${BASE_URL}/movie/${movie.id}`,
                lastModified: currentDate,
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            }));

        // Fetch trending TV shows (multiple pages)
        const tvPages = await Promise.all([
            getTrending('tv', 'week', 1),
            getTrending('tv', 'week', 2),
            getTrending('tv', 'week', 3),
            getTrending('tv', 'week', 4),
            getTrending('tv', 'week', 5),
        ]);

        const tvUrls: MetadataRoute.Sitemap = tvPages
            .flatMap(page => page.results)
            .map(show => ({
                url: `${BASE_URL}/tv/${show.id}`,
                lastModified: currentDate,
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            }));

        // Combine all URLs
        return [...staticPages, ...movieUrls, ...tvUrls];
    } catch (error) {
        console.error('Error generating sitemap:', error);
        // Return at least static pages if API fails
        return staticPages;
    }
}

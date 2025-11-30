import { MetadataRoute } from 'next';

/**
 * Robots.txt configuration for FilmiFy
 * Tells search engines what to index and what to avoid
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://filmify.vercel.app';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',           // Block API routes
                    '/auth/',          // Block authentication pages
                    '/settings/',      // Block user settings (private)
                    '/*.json',         // Block JSON files
                    '/debug-schema',   // Block debug routes
                ],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: [
                    '/api/',
                    '/auth/',
                    '/settings/',
                    '/*.json',
                    '/debug-schema',
                ],
                crawlDelay: 0,
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}

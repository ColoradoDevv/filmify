import { MetadataRoute } from 'next';
import { getOptionalApiKeys } from '@/lib/env';

/**
 * Robots.txt configuration for FilmiFy
 * Tells search engines what to index and what to avoid
 */

const BASE_URL = getOptionalApiKeys().appUrl;

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

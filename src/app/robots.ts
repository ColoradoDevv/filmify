import { MetadataRoute } from 'next';
import { getOptionalApiKeys } from '@/lib/env';

/**
 * Robots.txt configuration for FilmiFy
 * Tells search engines what to index and what to avoid.
 */

const BASE_URL = getOptionalApiKeys().appUrl;

// Private / non-indexable areas. Auth-gated and personal routes are excluded
// so crawlers don't waste budget on pages that just redirect to /login.
const DISALLOW = [
    '/api/',          // API routes
    '/auth/',         // Auth callback routes
    '/login',         // Auth pages
    '/register',
    '/forgot-password',
    '/reset-password',
    '/confirm-email',
    '/admin',         // Admin dashboard (private)
    '/settings',      // User settings (private)
    '/favorites',     // Personal — requires login
    '/lists',         // Personal — requires login
    '/profile',       // Personal — requires login
    '/watch-party',   // Ephemeral private rooms
    '/*.json',        // JSON files
    '/debug-schema',  // Debug routes
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: DISALLOW,
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: DISALLOW,
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
        host: BASE_URL,
    };
}

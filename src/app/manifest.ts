import { MetadataRoute } from 'next';

/**
 * Web App Manifest for FilmiFy.
 *
 * Improves mobile/PWA SEO signals (installability, theme color, name shown
 * when added to home screen) and is referenced automatically by Next.js at
 * /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'FilmiFy - Dónde ver películas y series online',
        short_name: 'FilmiFy',
        description:
            'Descubre dónde ver películas y series online: streaming, reseñas, tráileres y proveedores actualizados.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0e11',
        theme_color: '#0b0e11',
        lang: 'es',
        categories: ['entertainment', 'movies'],
        icons: [
            {
                src: '/logo-icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
            },
            // PNGs: instalabilidad PWA real (Android/Chrome exige rasters).
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}

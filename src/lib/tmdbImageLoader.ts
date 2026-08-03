/**
 * Custom image loader para next/image.
 *
 * Objetivo de rendimiento: servir cada imagen de TMDB en el tamaño REAL en que
 * se muestra, no en un w500/original fijo. Next llama a este loader con el
 * `width` que necesita cada slot del srcset, y nosotros reescribimos el tamaño
 * de TMDB al más cercano por encima. Resultado:
 *   - srcset responsive automático (móvil baja w185, desktop w342, etc.).
 *   - hasta ~70% menos bytes en pósters respecto a w500.
 *   - SIN usar el optimizador de Vercel (cero coste de transformaciones): solo
 *     cambiamos la URL que ya sirve el CDN de TMDB.
 *
 * Imágenes que no son de TMDB (avatares de Supabase, SVG locales) se devuelven
 * sin tocar.
 */

// Anchos que ofrece el CDN de TMDB (posters + backdrops combinados), ascendente.
const TMDB_WIDTHS = [92, 154, 185, 300, 342, 500, 780, 1280];

function nearestTmdbSize(width: number): string {
    for (const w of TMDB_WIDTHS) {
        if (width <= w) return `w${w}`;
    }
    return 'original';
}

export default function tmdbImageLoader({
    src,
    width,
}: {
    src: string;
    width: number;
    quality?: number;
}): string {
    // Solo reescribimos imágenes del CDN de TMDB: .../t/p/{size}{path}
    const marker = '/t/p/';
    const idx = src.indexOf(marker);
    if (!src.includes('image.tmdb.org') || idx === -1) {
        return src;
    }

    const prefix = src.slice(0, idx + marker.length);
    const rest = src.slice(idx + marker.length); // "{size}/abc.jpg"
    const slash = rest.indexOf('/');
    if (slash === -1) return src;

    const path = rest.slice(slash); // "/abc.jpg"
    return `${prefix}${nearestTmdbSize(width)}${path}`;
}

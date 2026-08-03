'use client';

import { track } from '@vercel/analytics';

/**
 * Eventos personalizados de Vercel Analytics.
 *
 * Los pageviews se capturan solos con <Analytics />. Aquí centralizamos los
 * eventos de producto — los que de verdad explican el comportamiento en un
 * sitio de streaming: qué se reproduce, qué se busca, qué se guarda. Tener un
 * único lugar evita nombres de evento inconsistentes (que rompen los informes).
 *
 * Las propiedades deben ser planas (string | number | boolean | null).
 */

type MediaType = 'movie' | 'serie';

/** Reproducción iniciada (el evento más valioso del sitio). */
export function trackPlay(params: {
    mediaType: MediaType;
    tmdbId: number;
    title: string;
    season?: number;
    episode?: number;
}) {
    track('play', {
        media_type: params.mediaType,
        tmdb_id: params.tmdbId,
        title: params.title,
        season: params.season ?? null,
        episode: params.episode ?? null,
    });
}

/** Tráiler reproducido. */
export function trackTrailer(params: { mediaType: MediaType; tmdbId: number; title: string }) {
    track('trailer', {
        media_type: params.mediaType,
        tmdb_id: params.tmdbId,
        title: params.title,
    });
}

/** Búsqueda enviada — revela la demanda de contenido. */
export function trackSearch(query: string) {
    const q = query.trim().slice(0, 80);
    if (!q) return;
    track('search', { query: q });
}

/** Favorito añadido (no registramos el quitado para no inflar ruido). */
export function trackFavorite(params: { mediaType: MediaType; tmdbId: number; title: string }) {
    track('favorite_add', {
        media_type: params.mediaType,
        tmdb_id: params.tmdbId,
        title: params.title,
    });
}

/** Error de reproducción — mide la salud real del catálogo. */
export function trackPlaybackError(params: { mediaType: MediaType; tmdbId: number }) {
    track('playback_error', {
        media_type: params.mediaType,
        tmdb_id: params.tmdbId,
    });
}

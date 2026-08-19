'use client';

/**
 * Eventos de producto — se envían a Google Analytics 4.
 *
 * Antes iban a Vercel Analytics, que en esta infraestructura no recogía nada:
 * su script vive en `/_vercel/insights/script.js`, un endpoint que solo existe
 * cuando el sitio corre en Vercel. En el EC2 devolvía 404 en cada carga de
 * página (≈380 peticiones fallidas cada 5 h en producción) y ningún evento
 * llegaba a ningún sitio. GA4 ya está montado en el layout con modo de
 * consentimiento, así que los eventos viajan por ahí.
 *
 * Aquí se centralizan los eventos que de verdad explican el comportamiento en
 * un sitio de streaming: qué se reproduce, qué se busca, qué se guarda. Un
 * único lugar evita nombres inconsistentes, que son los que rompen los
 * informes.
 *
 * Las propiedades deben ser planas (string | number | boolean | null).
 */

type MediaType = 'movie' | 'serie';

type EventParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Envía un evento a GA4 si está disponible.
 *
 * No hace nada cuando `gtag` no existe — sin `NEXT_PUBLIC_GA_ID`, con el
 * consentimiento rechazado o mientras se renderiza en servidor. La medición no
 * debe romper nunca la funcionalidad que la dispara.
 */
function track(name: string, params: EventParams = {}): void {
    if (typeof window === 'undefined') return;
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== 'function') return;
    try {
        gtag('event', name, params);
    } catch {
        // Un bloqueador de anuncios puede dejar un gtag roto; no es asunto nuestro.
    }
}

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
    // `search_term` es el nombre que espera GA4 para su informe de búsquedas.
    track('search', { search_term: q });
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

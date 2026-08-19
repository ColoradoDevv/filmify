'use client';

/**
 * Eventos de producto — se envían a Google Analytics 4 y a Umami.
 *
 * Antes iban a Vercel Analytics, que en esta infraestructura no recogía nada:
 * su script vive en `/_vercel/insights/script.js`, un endpoint que solo existe
 * cuando el sitio corre en Vercel. En el EC2 devolvía 404 en cada carga de
 * página (≈380 peticiones fallidas cada 5 h en producción) y ningún evento
 * llegaba a ningún sitio. GA4 ya está montado en el layout con modo de
 * consentimiento, y Umami corre autoalojado en analytics.filmify.me con el
 * script ya cargado en el layout. Se envía a los dos porque cuestan lo mismo y
 * cubren huecos distintos: GA4 respeta el modo de consentimiento (los eventos
 * previos al "aceptar" quedan retenidos), mientras que Umami no usa cookies y
 * registra siempre. Si algún día sobra uno, se quita de `track()` y ya.
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
 * Envía un evento a los destinos que estén disponibles.
 *
 * No hace nada cuando ninguno lo está — sin `NEXT_PUBLIC_GA_ID`, con el script
 * bloqueado, o mientras se renderiza en servidor. La medición no debe romper
 * nunca la funcionalidad que la dispara.
 */
function track(name: string, params: EventParams = {}): void {
    if (typeof window === 'undefined') return;

    const w = window as unknown as {
        gtag?: (...args: unknown[]) => void;
        umami?: { track?: (name: string, data?: EventParams) => void };
    };

    // Cada destino en su propio try: que uno falle no debe callar al otro, y un
    // bloqueador puede dejar cualquiera de los dos a medias.
    try {
        w.gtag?.('event', name, params);
    } catch {
        // sin acción: medir no puede romper lo que mide
    }
    try {
        w.umami?.track?.(name, params);
    } catch {
        // idem
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

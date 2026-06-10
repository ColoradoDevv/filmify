import type {
    Movie,
    TVShow,
    Person,
    MovieDetails,
    TVDetails,
    MultiSearchResult,
    PaginatedResponse,
    SearchFilters,
} from '@/types/tmdb';

// ── Constantes ────────────────────────────────────────────────────────────────
const FETCH_TIMEOUT_MS = 10_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Construye la URL del proxy de TMDB en el cliente (solo navegador). */
const buildClientUrl = (params: Record<string, string | number | boolean | undefined>): string => {
    if (typeof window === 'undefined') {
        throw new Error('TMDB client solo puede usarse en el navegador');
    }
    const url = new URL('/api/tmdb', window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.append(key, String(value));
        }
    });
    return url.toString();
};

/**
 * Llamada genérica al proxy de TMDB con timeout y manejo de errores.
 * Lanza un error descriptivo si la petición falla.
 */
const clientFetch = async <T>(params: Record<string, string | number | boolean | undefined>): Promise<T> => {
    const url = buildClientUrl(params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            cache: 'no-store',
            signal: controller.signal,
        });

        if (!response.ok) {
            let message = `Error del servidor (${response.status})`;
            try {
                const body = await response.text();
                if (body) message = body;
            } catch {}
            throw new Error(message);
        }

        return (await response.json()) as T;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error('La petición a TMDB tardó demasiado. Intenta de nuevo.');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
};

/** Normaliza la página: entero ≥ 1 */
const safePage = (page?: number): number => Math.max(1, Math.floor(page ?? 1));

// ── Búsqueda ──────────────────────────────────────────────────────────────────

export const searchMulti = (query: string, page: number = 1) =>
    clientFetch<PaginatedResponse<MultiSearchResult>>({
        action: 'search-multi',
        query: query.trim(),
        page: safePage(page),
    });

export const searchMovies = (query: string, page: number = 1) =>
    clientFetch<PaginatedResponse<Movie>>({
        action: 'search-movies',
        query: query.trim(),
        page: safePage(page),
    });

// ── Tendencias ────────────────────────────────────────────────────────────────
// Se mantiene la API con sobrecargas, pero con implementación genérica interna.

export function getTrending(mediaType: 'movie', timeWindow?: 'day' | 'week', page?: number): Promise<PaginatedResponse<Movie>>;
export function getTrending(mediaType: 'tv', timeWindow?: 'day' | 'week', page?: number): Promise<PaginatedResponse<TVShow>>;
export function getTrending(mediaType: 'all', timeWindow?: 'day' | 'week', page?: number): Promise<PaginatedResponse<Movie | TVShow>>;
export function getTrending(
    mediaType: 'movie' | 'tv' | 'all' = 'movie',
    timeWindow: 'day' | 'week' = 'week',
    page: number = 1,
) {
    return clientFetch<PaginatedResponse<Movie | TVShow>>({
        action: 'trending',
        mediaType,
        timeWindow,
        page: safePage(page),
    });
}

// ── Descubrir ─────────────────────────────────────────────────────────────────

export const discoverMovies = (filters: SearchFilters = {}) =>
    clientFetch<PaginatedResponse<Movie>>({
        action: 'discover',
        mediaType: 'movie',
        page: safePage(filters.page),
        genre: filters.genre,
        year: filters.year,
        sort_by: filters.sortBy,
    });

export const discoverTV = (filters: SearchFilters = {}) =>
    clientFetch<PaginatedResponse<TVShow>>({
        action: 'discover',
        mediaType: 'tv',
        page: safePage(filters.page),
        genre: filters.genre,
        year: filters.year,
        sort_by: filters.sortBy,
    });

// ── Detalles ──────────────────────────────────────────────────────────────────

export const getMovieDetails = (id: number) =>
    clientFetch<MovieDetails>({
        action: 'details',
        mediaType: 'movie',
        id,
    });

export const getTVDetails = (id: number) =>
    clientFetch<TVDetails>({
        action: 'details',
        mediaType: 'tv',
        id,
    });

/**
 * @deprecated Usa getMovieDetails o getTVDetails para tipos más precisos.
 * Se mantiene por compatibilidad.
 */
export const getMediaDetails = (mediaType: 'movie' | 'tv', id: number) =>
    mediaType === 'movie' ? getMovieDetails(id) : getTVDetails(id);
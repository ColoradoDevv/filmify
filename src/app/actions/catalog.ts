'use server';

import { getTrending, discoverMovies, discoverTV } from '@/lib/tmdb/service';
import { filterAvailableMovies, filterAvailableSeries } from '@/server/services/vimeus';
import type { Movie, TVShow } from '@/types/tmdb';

export interface LoadMoreOptions {
    /** Página TMDB desde la que empezar a acumular. */
    page: number;
    mediaType?: 'movie' | 'tv';
    genre?: number;
    year?: number;
    sortBy?: 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc';
}

export interface LoadMoreResult {
    items: (Movie | TVShow)[];
    /** Próxima página TMDB a consumir en la siguiente carga. */
    nextPage: number;
    /** Si quedan más páginas por explorar. */
    hasMore: boolean;
}

const VALID_SORT_OPTIONS = ['popularity.desc', 'vote_average.desc', 'primary_release_date.desc'] as const;

/** Mínimo de títulos DISPONIBLES que devuelve cada carga. */
const MIN_RESULTS = 20;
/** Tope de páginas TMDB a escanear por carga (evita bucles si hay pocas). */
const MAX_SCAN_PAGES = 6;
/** Límite duro de TMDB. */
const MAX_TMDB_PAGE = 500;

/** Trae una página cruda de TMDB según los filtros. */
async function fetchRawPage(opts: LoadMoreOptions, page: number): Promise<(Movie | TVShow)[]> {
    const isTV = opts.mediaType === 'tv';
    const hasFilters = Boolean(opts.genre || opts.year || opts.sortBy);
    const sortBy = opts.sortBy && VALID_SORT_OPTIONS.includes(opts.sortBy) ? opts.sortBy : undefined;

    if (isTV) {
        const data = hasFilters
            ? await discoverTV({ genre: opts.genre, year: opts.year, sortBy, page })
            : await getTrending('tv', 'week', page);
        return data.results as TVShow[];
    }
    const data = hasFilters
        ? await discoverMovies({ genre: opts.genre, year: opts.year, sortBy, page })
        : await getTrending('movie', 'week', page);
    return data.results as Movie[];
}

async function filterAvailable(items: (Movie | TVShow)[], isTV: boolean): Promise<(Movie | TVShow)[]> {
    if (items.length === 0) return [];
    return isTV
        ? filterAvailableSeries(items as TVShow[])
        : filterAvailableMovies(items as Movie[]);
}

/**
 * Acumula títulos DISPONIBLES recorriendo páginas de TMDB hasta juntar al
 * menos MIN_RESULTS (o agotar el tope de escaneo). Como el filtro de
 * disponibilidad descarta ~half de cada página de TMDB, una sola página deja
 * muy pocos resultados; esto garantiza un grid lleno (≥20 por carga).
 */
export async function loadMoreMovies(opts: LoadMoreOptions): Promise<LoadMoreResult> {
    const isTV = opts.mediaType === 'tv';
    let page = Math.max(1, Math.min(MAX_TMDB_PAGE, Math.floor(opts.page)));

    const seen = new Set<number>();
    const acc: (Movie | TVShow)[] = [];
    let scanned = 0;
    let exhausted = false;

    while (acc.length < MIN_RESULTS && scanned < MAX_SCAN_PAGES) {
        let raw: (Movie | TVShow)[] = [];
        try {
            raw = await fetchRawPage(opts, page);
        } catch (error) {
            console.error('[loadMoreMovies] TMDB fetch error:', error);
            exhausted = true;
            break;
        }

        if (raw.length === 0) {
            exhausted = true;
            page += 1;
            break;
        }

        let available: (Movie | TVShow)[] = [];
        try {
            available = await filterAvailable(raw, isTV);
        } catch (error) {
            console.error('[loadMoreMovies] availability filter error:', error);
            available = raw; // fail-open
        }

        for (const item of available) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                acc.push(item);
            }
        }

        scanned += 1;
        page += 1;

        if (page > MAX_TMDB_PAGE) {
            exhausted = true;
            break;
        }
    }

    return { items: acc, nextPage: page, hasMore: !exhausted };
}

// Re-exportamos los filtros para que puedan usarse como server actions desde el cliente
export { filterAvailableMovies, filterAvailableSeries };

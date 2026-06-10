'use server';

import { getTrending, discoverMovies, discoverTV } from '@/lib/tmdb/service';
import { filterAvailableMovies, filterAvailableSeries } from '@/server/services/vimeus';
import type { Movie, TVShow } from '@/types/tmdb';

export interface LoadMoreOptions {
    page: number;
    mediaType?: 'movie' | 'tv';
    genre?: number;
    year?: number;
    sortBy?: 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc';
}

const VALID_SORT_OPTIONS = ['popularity.desc', 'vote_average.desc', 'primary_release_date.desc'] as const;

/**
 * Server action para cargar más contenido (películas o series) en el grid.
 * Aplica los filtros activos y verifica la disponibilidad en el proveedor.
 * Si algo falla, devuelve un array vacío para no interrumpir la experiencia.
 */
export async function loadMoreMovies(opts: LoadMoreOptions): Promise<(Movie | TVShow)[]> {
    // Normalizar página
    const page = Math.max(1, Math.min(500, Math.floor(opts.page)));
    const isTV = opts.mediaType === 'tv';
    const hasFilters = Boolean(opts.genre || opts.year || opts.sortBy);

    // Validar sortBy en runtime (TypeScript no lo garantiza)
    const sortBy = opts.sortBy && VALID_SORT_OPTIONS.includes(opts.sortBy)
        ? opts.sortBy
        : undefined;

    let rawResults: (Movie | TVShow)[] = [];

    try {
        if (isTV) {
            const data = hasFilters
                ? await discoverTV({ genre: opts.genre, year: opts.year, sortBy, page })
                : await getTrending('tv', 'week', page);
            rawResults = data.results as TVShow[];
        } else {
            const data = hasFilters
                ? await discoverMovies({ genre: opts.genre, year: opts.year, sortBy, page })
                : await getTrending('movie', 'week', page);
            rawResults = data.results as Movie[];
        }
    } catch (error) {
        console.error('[loadMoreMovies] Error fetching content:', error);
        return [];
    }

    // Evitar llamada innecesaria al filtro si no hay nada
    if (rawResults.length === 0) return [];

    try {
        if (isTV) {
            return await filterAvailableSeries(rawResults as TVShow[]);
        }
        return await filterAvailableMovies(rawResults as Movie[]);
    } catch (error) {
        console.error('[loadMoreMovies] Error filtering availability:', error);
        // Opción: devolver sin filtrar para no dejar la página vacía
        return rawResults;
    }
}
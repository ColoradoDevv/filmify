'use server';

import { searchMulti } from '@/lib/tmdb/service';
import { filterAvailableMovies, filterAvailableSeries } from '@/server/services/vimeus';
import type { Movie, TVShow, MultiSearchResult } from '@/types/tmdb';

/** Resultado de búsqueda unificado: película o serie, con su tipo. */
export type SearchResultItem = (Movie | TVShow) & { media_type: 'movie' | 'tv' };

/**
 * Busca títulos (películas + series) y devuelve SOLO los reproducibles en
 * Vimeus, conservando el orden de relevancia de TMDB.
 *
 * - Usa /search/multi (películas, series y personas) y descarta personas.
 * - Aplica los mismos filtros de disponibilidad que el resto del catálogo:
 *   filterAvailableMovies para películas y filterAvailableSeries para series.
 *   Así, una serie como "Gossip Girl" que no está en el proveedor no aparece.
 */
export async function searchTitles(query: string): Promise<SearchResultItem[]> {
    const q = query.trim();
    if (!q) return [];

    let results: MultiSearchResult[] = [];
    try {
        const data = await searchMulti(q);
        results = data.results ?? [];
    } catch (error) {
        console.error('[searchTitles] TMDB search failed:', error);
        return [];
    }

    const movies = results.filter((r) => r.media_type === 'movie') as Movie[];
    const series = results.filter((r) => r.media_type === 'tv') as TVShow[];

    let availMovieIds = new Set<number>();
    let availSeriesIds = new Set<number>();
    try {
        const [availMovies, availSeries] = await Promise.all([
            filterAvailableMovies(movies),
            filterAvailableSeries(series),
        ]);
        availMovieIds = new Set(availMovies.map((m) => m.id));
        availSeriesIds = new Set(availSeries.map((s) => s.id));
    } catch (error) {
        console.error('[searchTitles] availability filter failed:', error);
        // fail-open: si el proveedor falla, mostramos movies+series sin filtrar
        // (mejor que una página vacía).
        availMovieIds = new Set(movies.map((m) => m.id));
        availSeriesIds = new Set(series.map((s) => s.id));
    }

    // Conserva el orden de relevancia de TMDB; solo deja disponibles.
    return results.filter((r) =>
        (r.media_type === 'movie' && availMovieIds.has(r.id)) ||
        (r.media_type === 'tv' && availSeriesIds.has(r.id)),
    ) as SearchResultItem[];
}

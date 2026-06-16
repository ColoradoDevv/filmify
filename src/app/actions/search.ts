'use server';

import { searchMulti } from '@/lib/tmdb/service';
import {
    filterAvailableMovies,
    filterAvailableSeries,
    filterAvailableAnimes,
    getVimeusAnimeCatalog,
} from '@/server/services/vimeus';
import type { Movie, TVShow, MultiSearchResult } from '@/types/tmdb';

/** Resultado de búsqueda unificado: película, serie o anime, con su tipo. */
export type SearchResultItem = (Movie | TVShow) & { media_type: 'movie' | 'tv' | 'anime' };

/**
 * Busca títulos (películas, series y anime) y devuelve SOLO los reproducibles
 * en Vimeus, conservando el orden de relevancia de TMDB.
 *
 * - Usa /search/multi (películas, series y personas) y descarta personas.
 * - Los resultados `tv` se cruzan contra el catálogo de anime de Vimeus:
 *   si el tmdb_id está en el catálogo de anime, se proba con /e/anime;
 *   si no, se proba con /e/serie. Así los animes populares (Attack on Titan,
 *   Demon Slayer...) aparecen correctamente en lugar de fallar el probe de serie.
 * - fail-open por tipo si el filtro de disponibilidad falla.
 */
export async function searchTitles(query: string): Promise<SearchResultItem[]> {
    const q = query.trim();
    if (!q) return [];

    // Lanzamos TMDB search y el catálogo de anime en paralelo — la segunda
    // petición está cacheada 1h, así que en hot path no añade latencia real.
    let results: MultiSearchResult[] = [];
    let animeIdSet = new Set<number>();

    try {
        const [tmdbData, animeCatalog] = await Promise.all([
            searchMulti(q),
            getVimeusAnimeCatalog(1000).catch(() => []),
        ]);
        results = tmdbData.results ?? [];
        animeIdSet = new Set(animeCatalog.map((a) => a.tmdb_id));
    } catch (error) {
        console.error('[searchTitles] TMDB search failed:', error);
        return [];
    }

    const movies = results.filter((r) => r.media_type === 'movie') as Movie[];
    // Separar resultados tv en anime vs serie según el catálogo de Vimeus.
    const tvResults = results.filter((r) => r.media_type === 'tv') as TVShow[];
    const animes  = tvResults.filter((t) => animeIdSet.has(t.id));
    const series  = tvResults.filter((t) => !animeIdSet.has(t.id));

    let availMovieIds  = new Set<number>();
    let availSeriesIds = new Set<number>();
    let availAnimeIds  = new Set<number>();

    try {
        const [availMovies, availSeries, availAnimes] = await Promise.all([
            filterAvailableMovies(movies),
            filterAvailableSeries(series),
            filterAvailableAnimes(animes),
        ]);
        availMovieIds  = new Set(availMovies.map((m) => m.id));
        availSeriesIds = new Set(availSeries.map((s) => s.id));
        availAnimeIds  = new Set(availAnimes.map((a) => a.id));
    } catch (error) {
        console.error('[searchTitles] availability filter failed:', error);
        // fail-open: mostramos todo sin filtrar antes que una página vacía.
        availMovieIds  = new Set(movies.map((m) => m.id));
        availSeriesIds = new Set(series.map((s) => s.id));
        availAnimeIds  = new Set(animes.map((a) => a.id));
    }

    // Conserva el orden de relevancia de TMDB; solo deja disponibles.
    // Los anime se marcan con media_type 'anime' para que MovieCard enlace a /tv/[id]
    // (que es donde están en TMDB) pero la UI los puede distinguir si hace falta.
    return results
        .filter((r) => {
            if (r.media_type === 'movie') return availMovieIds.has(r.id);
            if (r.media_type === 'tv') {
                return availSeriesIds.has(r.id) || availAnimeIds.has(r.id);
            }
            return false;
        })
        .map((r) => ({
            ...r,
            media_type: (r.media_type === 'tv' && availAnimeIds.has(r.id))
                ? 'anime'
                : r.media_type,
        })) as SearchResultItem[];
}

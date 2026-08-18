'use server';

import { searchMulti } from '@/server/services/tmdb';
import {
    filterAvailableMovies,
    filterAvailableSeries,
    filterAvailableAnimes,
    getAnimeIdSet,
} from '@/server/services/vimeus';
import { anilistFromTmdb } from '@/server/services/anime';
import type { Movie, TVShow, MultiSearchResult } from '@/types/tmdb';

/**
 * Resultado de búsqueda unificado: película, serie o anime, con su tipo.
 *
 * Los resultados de anime llevan además `anilist_id`: el módulo de anime es
 * independiente del de series y vive en /anime/[anilistId], así que la UI
 * necesita ese id para enlazar al sitio correcto en vez de a /tv/[tmdbId].
 */
export type SearchResultItem = (Movie | TVShow) & {
    media_type: 'movie' | 'tv' | 'anime';
    /** Solo en resultados de anime que el dataset de mapeo sabe traducir. */
    anilist_id?: number;
};

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
        const [tmdbData, animeIds] = await Promise.all([
            searchMulti(q),
            getAnimeIdSet(1000).catch(() => new Set<number>()),
        ]);
        results = tmdbData.results ?? [];
        animeIdSet = animeIds;
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
    const visible = results.filter((r) => {
        if (r.media_type === 'movie') return availMovieIds.has(r.id);
        if (r.media_type === 'tv') {
            return availSeriesIds.has(r.id) || availAnimeIds.has(r.id);
        }
        return false;
    });

    // Los anime se marcan con media_type 'anime' y se les adjunta su id de
    // AniList para que la UI enlace a /anime/[anilistId] — el módulo de anime
    // ya no vive dentro del de series.
    const animeTmdbIds = visible
        .filter((r) => r.media_type === 'tv' && availAnimeIds.has(r.id))
        .map((r) => r.id);

    const anilistByTmdb = new Map<number, number>();
    if (animeTmdbIds.length > 0) {
        const matches = await Promise.all(
            animeTmdbIds.map((id) =>
                anilistFromTmdb(id)
                    .then((list) => [id, list[0]?.anilistId] as const)
                    .catch(() => [id, undefined] as const),
            ),
        );
        for (const [tmdbId, anilistId] of matches) {
            if (anilistId) anilistByTmdb.set(tmdbId, anilistId);
        }
    }

    return visible.map((r) => {
        const isAnime = r.media_type === 'tv' && availAnimeIds.has(r.id);
        if (!isAnime) return r as SearchResultItem;
        return {
            ...r,
            media_type: 'anime',
            anilist_id: anilistByTmdb.get(r.id),
        } as SearchResultItem;
    });
}

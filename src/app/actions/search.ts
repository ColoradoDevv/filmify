'use server';

import { searchMulti } from '@/server/services/tmdb';
import {
    filterAvailableMovies,
    filterAvailableSeries,
    filterAvailableAnimes,
    getAnimeIdSet,
} from '@/server/services/vimeus';
import { anilistFromTmdb } from '@/server/services/anime';
import { readUserPreferences } from '@/server/repositories/user-preferences';
import ANIME_TMDB_REDIRECTS from '@/lib/anime-tmdb-redirects.json';
import type { Movie, TVShow, MultiSearchResult } from '@/types/tmdb';

/** tmdb_id → anilist_id. Mapa estático (~57 KB, 4166 entradas), en memoria. */
const ANIME_BY_TMDB = ANIME_TMDB_REDIRECTS as Record<string, number>;

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

    // El catálogo de anime y la preferencia +18 salen a la vez, no en fila: el
    // primero está cacheado 1h y la segunda es una lectura por clave primaria,
    // pero encadenarlas sumaba su latencia a CADA pulsación del autocompletado.
    //
    // TMDB sí tiene que esperar a la preferencia: `include_adult` forma parte
    // de la URL, así que no se puede lanzar la búsqueda antes de saberla.
    let results: MultiSearchResult[] = [];
    let animeIdSet = new Set<number>();

    try {
        const [preferences, animeIds] = await Promise.all([
            readUserPreferences(),
            getAnimeIdSet(1000).catch(() => new Set<number>()),
        ]);
        animeIdSet = animeIds;

        const tmdbData = await searchMulti(q, 1, preferences.playback.adultContent);
        results = tmdbData.results ?? [];
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

/**
 * Sugerencias para el desplegable de la barra de búsqueda.
 *
 * Es la versión BARATA de `searchTitles`, y la diferencia es deliberada.
 * `searchTitles` sondea el proveedor título a título (`filterAvailable*`) y
 * pide a AniList el id de cada anime: entre 0,7 y 1,6 segundos por consulta,
 * medido. Eso es asumible al aterrizar en /search, pero no en un desplegable
 * que se refresca mientras se teclea — ahí Google y YouTube responden por
 * debajo de 100 ms, y es lo que hace que se sientan instantáneos.
 *
 * Aquí solo se consulta TMDB (cacheado 60 s) y se etiqueta el anime con el
 * mapa estático que ya usa el middleware para sus redirecciones, que está en
 * memoria y no cuesta nada.
 *
 * El precio: una sugerencia puede llevar a un título sin fuentes. Se asume a
 * propósito. Sugerir es orientar; confirmar es lo que hace /search, que sí
 * filtra.
 */
export async function suggestTitles(query: string, limit = 6): Promise<SearchResultItem[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    try {
        const preferences = await readUserPreferences();
        const data = await searchMulti(q, 1, preferences.playback.adultContent);

        return (data.results ?? [])
            .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
            .slice(0, limit)
            .map((r) => {
                if (r.media_type !== 'tv') return r as SearchResultItem;
                const anilistId = ANIME_BY_TMDB[String(r.id)];
                if (!anilistId) return r as SearchResultItem;
                return { ...r, media_type: 'anime', anilist_id: anilistId } as SearchResultItem;
            });
    } catch (error) {
        console.error('[suggestTitles] TMDB search failed:', error);
        return [];
    }
}

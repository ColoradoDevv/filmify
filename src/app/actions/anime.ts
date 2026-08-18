'use server';

/**
 * Server Actions del apartado de Anime.
 *
 * Dos bloques:
 *  - Descubrimiento (AniList): búsqueda en vivo, paginación, filtro por género.
 *  - Reproducción: resolver las fuentes de un episodio contra el registro de
 *    proveedores. El anime NO pasa por el módulo de series: se identifica por
 *    su id de AniList de principio a fin.
 */

import {
    getTrendingAnime, getPopularAnime, getTopRatedAnime, getSeasonalAnime,
    searchAnime, getAnimeByGenre,
} from '@/server/services/anilist';
import { filterPlayableAnimeCards, getAnimePlayback } from '@/server/services/anime';
import type { AnimePlayback } from '@/server/services/anime';
import type { AnimeCard } from '@/lib/anilist/types';

export async function searchAnimeAction(query: string, page = 1): Promise<AnimeCard[]> {
    // La búsqueda respeta lo que el usuario pide, pero solo devuelve lo que
    // realmente puede ver (evita fichas muertas en los resultados).
    const results = await searchAnime(query, 40, page);
    return filterPlayableAnimeCards(results).catch(() => results);
}

export async function animeByGenreAction(genre: string, page = 1): Promise<AnimeCard[]> {
    const results = await getAnimeByGenre(genre, 40, page);
    return filterPlayableAnimeCards(results).then((a) => a.slice(0, 24)).catch(() => results.slice(0, 24));
}

export async function trendingAnimeAction(page = 1): Promise<AnimeCard[]> {
    return getTrendingAnime(24, page);
}

export async function popularAnimeAction(page = 1): Promise<AnimeCard[]> {
    return getPopularAnime(24, page);
}

export async function topRatedAnimeAction(page = 1): Promise<AnimeCard[]> {
    return getTopRatedAnime(24, page);
}

export async function seasonalAnimeAction(page = 1): Promise<AnimeCard[]> {
    return getSeasonalAnime(24, page);
}

/**
 * Fuentes reproducibles de un episodio concreto, ya ordenadas (español
 * primero, verificadas antes que las que no se pueden comprobar).
 *
 * El reproductor la llama cada vez que el usuario cambia de episodio: las
 * URLs de los proveedores llevan el número de episodio dentro, así que no se
 * pueden derivar en cliente sin duplicar aquí la lógica del registro.
 */
export async function getAnimeSourcesAction(
    anilistId: number,
    episode: number,
    titles?: { english?: string | null; romaji?: string | null },
    year?: number | null,
): Promise<AnimePlayback> {
    if (!Number.isFinite(anilistId) || anilistId <= 0) {
        return { sources: [], hasVerifiedSource: false };
    }
    const ep = Number.isFinite(episode) && episode > 0 ? Math.floor(episode) : 1;
    return getAnimePlayback({ anilistId, episode: ep, titles, year });
}

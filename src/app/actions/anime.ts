'use server';

/**
 * Server Actions del apartado de Anime (descubrimiento vía AniList).
 *
 * Envuelven el servicio de AniList (`@/server/services/anilist`) para poder
 * llamarlo desde componentes cliente (búsqueda en vivo, paginación, filtro por
 * género). La reproducción se resuelve por separado con el puente AniList→TMDB.
 */

import {
    getTrendingAnime, getPopularAnime, getTopRatedAnime, getSeasonalAnime,
    searchAnime, getAnimeByGenre,
} from '@/server/services/anilist';
import { resolveAnimeTmdb, filterPlayableAnimeCards } from '@/server/services/anime-bridge';
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
 * Resuelve el destino reproducible de un anime de AniList.
 * Devuelve la URL de la ficha del catálogo (donde vive el player de Vimeus) o
 * null si no encontramos un tmdb_id razonable.
 */
export async function resolveAnimeWatchHref(
    anilistId: number,
    english?: string | null,
    romaji?: string | null,
    year?: number | null,
): Promise<{ href: string; confirmed: boolean } | null> {
    const match = await resolveAnimeTmdb(anilistId, { english, romaji, year });
    if (!match) return null;
    const base = match.mediaType === 'movie' ? '/movie' : '/tv';
    return { href: `${base}/${match.tmdbId}`, confirmed: match.confirmed };
}

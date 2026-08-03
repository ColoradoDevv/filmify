/**
 * AniList — servicio de descubrimiento de anime.
 *
 * Porta la forma de obtener animes de animeflix (chirag-droid/animeflix):
 * consultas GraphQL contra la API pública y gratuita de AniList
 * (https://graphql.anilist.co), sin API key. Provee trending, popularidad,
 * mejor puntuados, temporada actual, búsqueda, detalle + recomendaciones y
 * catálogo por género.
 *
 * Diferencias con animeflix:
 *  - Usa `fetch` nativo con el Data Cache de Next (revalidate) en lugar de
 *    graphql-request + codegen — cero dependencias nuevas.
 *  - Devuelve una forma normalizada (`AnimeCard`) para la UI de FilmiFy.
 *  - La reproducción NO usa el scraper de GogoAnime (repo muerto, frágil):
 *    FilmiFy ya reproduce anime vía el embed de Vimeus por tmdb_id; el puente
 *    AniList→TMDB vive en `@/server/services/anime-bridge`.
 *
 * Rate limits: AniList permite ~90 req/min por IP. Todas las llamadas se
 * cachean en el Data Cache (30 min listados, 1 h detalle) para no acercarnos.
 */

import type {
    AniListAnime, AniListAnimeDetail, AnimeCard,
    AnimeSort, AnimeSeason,
} from '@/lib/anilist/types';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const FETCH_TIMEOUT_MS = 8_000;
const LIST_REVALIDATE_S = 1_800; // 30 min
const DETAIL_REVALIDATE_S = 3_600; // 1 h
const DEBUG = process.env.NODE_ENV === 'development';

// ── Fragmentos GraphQL (equivalentes a los .gql de animeflix) ─────────────────

const ANIME_INFO_FRAGMENT = `
fragment AnimeInfo on Media {
    id
    idMal
    title { english romaji native }
    coverImage { color medium large extraLarge }
    bannerImage
    format
    status
    episodes
    duration
    genres
    averageScore
    meanScore
    popularity
    favourites
    seasonYear
    season
    description(asHtml: false)
    startDate { year month day }
    isAdult
    nextAiringEpisode { airingAt timeUntilAiring episode }
}`;

// ── Cliente GraphQL mínimo ────────────────────────────────────────────────────

interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message: string }>;
}

async function anilistQuery<T>(
    query: string,
    variables: Record<string, unknown>,
    revalidate: number,
): Promise<T | null> {
    try {
        const res = await fetch(ANILIST_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ query, variables }),
            next: { revalidate },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
            if (DEBUG) console.warn(`[AniList] HTTP ${res.status}`);
            return null;
        }
        const json = (await res.json()) as GraphQLResponse<T>;
        if (json.errors?.length) {
            if (DEBUG) console.warn('[AniList] GraphQL error:', json.errors[0].message);
            return null;
        }
        return json.data ?? null;
    } catch (err) {
        if (DEBUG) console.error('[AniList] Fetch error:', err);
        return null;
    }
}

// ── Normalización ─────────────────────────────────────────────────────────────

/** Convierte un Media de AniList a la forma que consume la UI de FilmiFy. */
export function toAnimeCard(a: AniListAnime): AnimeCard {
    const primary = a.title.english || a.title.romaji || a.title.native || 'Sin título';
    const alt = a.title.english && a.title.romaji && a.title.english !== a.title.romaji
        ? a.title.romaji
        : null;
    return {
        id: a.id,
        title: primary,
        subtitle: alt,
        coverImage: a.coverImage.extraLarge || a.coverImage.large || a.coverImage.medium,
        bannerImage: a.bannerImage,
        color: a.coverImage.color,
        format: a.format,
        episodes: a.episodes,
        genres: a.genres ?? [],
        score: a.averageScore ?? a.meanScore,
        year: a.seasonYear ?? a.startDate?.year ?? null,
        // AniList incrusta <br>/<i> en la descripción; los limpiamos.
        description: a.description
            ? a.description.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+>/g, '').trim()
            : null,
        isAdult: a.isAdult,
    };
}

/** Temporada de anime actual (WINTER/SPRING/SUMMER/FALL) según el mes. */
export function currentSeason(): { season: AnimeSeason; year: number } {
    const now = new Date();
    const month = now.getMonth(); // 0–11
    const year = now.getFullYear();
    if (month <= 1 || month === 11) {
        // Dic–Feb → WINTER (dic pertenece al invierno del año siguiente)
        return { season: 'WINTER', year: month === 11 ? year + 1 : year };
    }
    if (month <= 4) return { season: 'SPRING', year };
    if (month <= 7) return { season: 'SUMMER', year };
    return { season: 'FALL', year };
}

// ── Listados por orden (equivalente a getList de animeflix) ───────────────────

interface PageResult {
    Page: { media: (AniListAnime | null)[] };
}

async function getListBySort(
    sort: AnimeSort,
    perPage = 24,
    page = 1,
): Promise<AnimeCard[]> {
    const query = `
    query getList($perPage: Int, $page: Int, $sort: [MediaSort]) {
        Page(perPage: $perPage, page: $page) {
            media(sort: $sort, type: ANIME, isAdult: false) { ...AnimeInfo }
        }
    }
    ${ANIME_INFO_FRAGMENT}`;
    const data = await anilistQuery<PageResult>(query, { perPage, page, sort: [sort] }, LIST_REVALIDATE_S);
    return (data?.Page.media ?? []).filter(Boolean).map((a) => toAnimeCard(a as AniListAnime));
}

export const getTrendingAnime = (perPage = 24, page = 1) =>
    getListBySort('TRENDING_DESC', perPage, page);

export const getPopularAnime = (perPage = 24, page = 1) =>
    getListBySort('POPULARITY_DESC', perPage, page);

export const getTopRatedAnime = (perPage = 24, page = 1) =>
    getListBySort('SCORE_DESC', perPage, page);

// ── Temporada actual (equivalente a indexPage $seasonYear de animeflix) ───────

export async function getSeasonalAnime(perPage = 24, page = 1): Promise<AnimeCard[]> {
    const { season, year } = currentSeason();
    const query = `
    query getSeasonal($perPage: Int, $page: Int, $season: MediaSeason, $seasonYear: Int) {
        Page(perPage: $perPage, page: $page) {
            media(season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
                ...AnimeInfo
            }
        }
    }
    ${ANIME_INFO_FRAGMENT}`;
    const data = await anilistQuery<PageResult>(
        query, { perPage, page, season, seasonYear: year }, LIST_REVALIDATE_S,
    );
    return (data?.Page.media ?? []).filter(Boolean).map((a) => toAnimeCard(a as AniListAnime));
}

// ── Búsqueda (equivalente a searchAnime de animeflix) ─────────────────────────

export async function searchAnime(search: string, perPage = 24, page = 1): Promise<AnimeCard[]> {
    const q = search.trim();
    if (!q) return [];
    const query = `
    query searchAnime($search: String, $perPage: Int, $page: Int) {
        Page(perPage: $perPage, page: $page) {
            media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
                ...AnimeInfo
            }
        }
    }
    ${ANIME_INFO_FRAGMENT}`;
    const data = await anilistQuery<PageResult>(query, { search: q, perPage, page }, LIST_REVALIDATE_S);
    return (data?.Page.media ?? []).filter(Boolean).map((a) => toAnimeCard(a as AniListAnime));
}

// ── Por género (equivalente a searchGenre de animeflix) ───────────────────────

export async function getAnimeByGenre(genre: string, perPage = 24, page = 1): Promise<AnimeCard[]> {
    const query = `
    query getByGenre($genre: String, $perPage: Int, $page: Int) {
        Page(perPage: $perPage, page: $page) {
            media(genre: $genre, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
                ...AnimeInfo
            }
        }
    }
    ${ANIME_INFO_FRAGMENT}`;
    const data = await anilistQuery<PageResult>(query, { genre, perPage, page }, LIST_REVALIDATE_S);
    return (data?.Page.media ?? []).filter(Boolean).map((a) => toAnimeCard(a as AniListAnime));
}

/** Lista de géneros disponibles en AniList. */
export async function getAnimeGenres(): Promise<string[]> {
    const data = await anilistQuery<{ GenreCollection: string[] }>(
        `query { GenreCollection }`, {}, DETAIL_REVALIDATE_S * 24,
    );
    // Filtramos géneros hentai/adultos del listado público.
    return (data?.GenreCollection ?? []).filter((g) => g !== 'Hentai');
}

// ── Detalle + recomendaciones (equivalente a animePage de animeflix) ──────────

interface AnimePageResult {
    Media: (AniListAnime & {
        recommendations: {
            nodes: Array<{ mediaRecommendation: AniListAnime | null }>;
        };
    }) | null;
}

export async function getAnimeById(id: number): Promise<AniListAnimeDetail | null> {
    if (!Number.isFinite(id) || id <= 0) return null;
    const query = `
    query animePage($id: Int, $perPage: Int) {
        Media(id: $id, type: ANIME) {
            ...AnimeInfo
            recommendations(perPage: $perPage, sort: RATING_DESC) {
                nodes { mediaRecommendation { ...AnimeInfo } }
            }
        }
    }
    ${ANIME_INFO_FRAGMENT}`;
    const data = await anilistQuery<AnimePageResult>(query, { id, perPage: 12 }, DETAIL_REVALIDATE_S);
    if (!data?.Media) return null;
    const recs = (data.Media.recommendations?.nodes ?? [])
        .map((n) => n.mediaRecommendation)
        .filter(Boolean) as AniListAnime[];
    return { ...data.Media, recommendations: recs };
}

// ── Utilidades de presentación ────────────────────────────────────────────────

/** Mapa de formato AniList → etiqueta legible en español. */
export const FORMAT_LABELS: Record<string, string> = {
    TV: 'Serie TV',
    TV_SHORT: 'TV corta',
    MOVIE: 'Película',
    SPECIAL: 'Especial',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Música',
};

import type {
    Movie,
    TVShow,
    Person,
    MovieDetails,
    TVDetails,
    PaginatedResponse,
    MultiSearchResult,
    SearchFilters,
} from '@/types/tmdb';
import { unstable_cache } from 'next/cache';
import { getSupabaseConfig, getTmdbApiKey } from '@/lib/env';
import { getImageUrl, getPosterUrl, getBackdropUrl, getProfileUrl } from './helpers';

// ── Error personalizado ──────────────────────────────────────────────────────
export class TMDBError extends Error {
    public status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'TMDBError';
        this.status = status;
    }
}

const BASE_URL = 'https://api.themoviedb.org/3';
const FETCH_TIMEOUT_MS = 8_000;
const DEBUG = process.env.NODE_ENV === 'development';

// ── Blacklist cache (devuelve un array plano, compatible con unstable_cache) ─
export const getBlacklist = unstable_cache(
    async (): Promise<number[]> => {
        try {
            const { url: supabaseUrl, anonKey: supabaseKey } = getSupabaseConfig();
            const response = await fetch(
                `${supabaseUrl}/rest/v1/content_blacklist?select=tmdb_id`,
                {
                    headers: {
                        apikey: supabaseKey,
                        Authorization: `Bearer ${supabaseKey}`,
                    },
                    next: { revalidate: 300 },
                },
            );

            if (!response.ok) return [];

            const data: { tmdb_id: number }[] = await response.json();
            return data.map((item) => item.tmdb_id);
        } catch {
            if (DEBUG) console.error('[TMDB] Failed to fetch blacklist');
            return [];
        }
    },
    [],
    { revalidate: 300 },
);

// ── Build URL ────────────────────────────────────────────────────────────────
const getApiKey = (): string => getTmdbApiKey();

const buildUrl = (
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
): string => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', getApiKey());
    url.searchParams.append('language', 'es-MX');

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
        }
    });

    return url.toString();
};

// ── Generic fetch wrapper ────────────────────────────────────────────────────
async function fetchFromTMDB<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
): Promise<T> {
    const url = buildUrl(endpoint, params);

    let response: Response;
    try {
        response = await fetch(url, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
    } catch (err) {
        if (DEBUG) console.error(`[TMDB] Network error for ${endpoint}:`, err);
        throw new TMDBError('Error de conexión con TMDB', 0);
    }

    if (!response.ok) {
        throw new TMDBError(
            `TMDB API Error: ${response.status} ${response.statusText}`,
            response.status,
        );
    }

    const data = await response.json();

    // Obtener la blacklist (array) y convertirla a Set para búsqueda O(1)
    const blacklistArray = await getBlacklist();
    const blacklistSet = new Set(blacklistArray);

    if (data.results && Array.isArray(data.results)) {
        data.results = data.results.filter((item: any) => !blacklistSet.has(item.id));
    } else if (data.id && blacklistSet.has(data.id)) {
        throw new TMDBError('Content is blacklisted', 403);
    }

    return data;
}

// ── Trending ──────────────────────────────────────────────────────────────────
export async function getTrending<T extends 'movie' | 'tv' | 'all'>(
    mediaType: T = 'movie' as T,
    timeWindow: 'day' | 'week' = 'week',
    page: number = 1,
): Promise<PaginatedResponse<T extends 'movie' ? Movie : T extends 'tv' ? TVShow : Movie | TVShow>> {
    const safePage = Math.max(1, Math.floor(page));
    return fetchFromTMDB(`/trending/${mediaType}/${timeWindow}`, { page: safePage }) as Promise<any>;
}

// ── Search ────────────────────────────────────────────────────────────────────
export const searchMulti = async (
    query: string,
    page: number = 1,
): Promise<PaginatedResponse<MultiSearchResult>> => {
    if (!query.trim()) {
        return { page: 1, results: [], total_pages: 0, total_results: 0 };
    }
    const safePage = Math.max(1, Math.floor(page));
    return fetchFromTMDB('/search/multi', { query, page: safePage });
};

export const searchMovies = async (
    query: string,
    page: number = 1,
): Promise<PaginatedResponse<Movie>> => {
    if (!query.trim()) {
        return { page: 1, results: [], total_pages: 0, total_results: 0 };
    }
    const safePage = Math.max(1, Math.floor(page));
    return fetchFromTMDB('/search/movie', { query, page: safePage });
};

// ── Details ───────────────────────────────────────────────────────────────────
export const getMovieDetails = async (movieId: number): Promise<MovieDetails> => {
    return fetchFromTMDB(`/movie/${movieId}`, {
        append_to_response:
            'videos,credits,similar,recommendations,watch/providers,external_ids,keywords,release_dates',
    });
};

export const getTVDetails = async (tvId: number): Promise<TVDetails> => {
    return fetchFromTMDB(`/tv/${tvId}`, {
        append_to_response:
            'videos,credits,similar,recommendations,watch/providers,external_ids',
    });
};

// ── Discover ─────────────────────────────────────────────────────────────────
export const getByGenre = async (
    genreId: number,
    page: number = 1,
): Promise<PaginatedResponse<Movie>> => {
    return discoverMovies({ genre: genreId, page });
};

export const discoverMovies = async (
    filters: SearchFilters = {},
): Promise<PaginatedResponse<Movie>> => {
    const params: Record<string, string | number | undefined> = {
        page: Math.max(1, Math.floor(filters.page || 1)),
        sort_by: filters.sortBy || 'popularity.desc',
    };
    if (filters.genre) params.with_genres = filters.genre;
    if (filters.year) params.primary_release_year = filters.year;

    return fetchFromTMDB('/discover/movie', params);
};

export const discoverTV = async (
    filters: SearchFilters = {},
): Promise<PaginatedResponse<TVShow>> => {
    const params: Record<string, string | number | undefined> = {
        page: Math.max(1, Math.floor(filters.page || 1)),
        sort_by: filters.sortBy || 'popularity.desc',
    };
    if (filters.genre) params.with_genres = filters.genre;
    if (filters.year) params.first_air_date_year = filters.year;

    return fetchFromTMDB('/discover/tv', params);
};

// ── Popular / Top Rated / Now Playing / Upcoming ────────────────────────────
export const getPopular = async (page: number = 1): Promise<PaginatedResponse<Movie>> =>
    fetchFromTMDB('/movie/popular', { page: Math.max(1, Math.floor(page)) });

export const getTopRated = async (page: number = 1): Promise<PaginatedResponse<Movie>> =>
    fetchFromTMDB('/movie/top_rated', { page: Math.max(1, Math.floor(page)) });

export const getNowPlaying = async (page: number = 1): Promise<PaginatedResponse<Movie>> =>
    fetchFromTMDB('/movie/now_playing', { page: Math.max(1, Math.floor(page)) });

export const getUpcoming = async (page: number = 1): Promise<PaginatedResponse<Movie>> =>
    fetchFromTMDB('/movie/upcoming', { page: Math.max(1, Math.floor(page)) });

// ── Genres ────────────────────────────────────────────────────────────────────
export const getGenres = async (): Promise<{ genres: { id: number; name: string }[] }> =>
    fetchFromTMDB('/genre/movie/list');

export const getTVGenres = async (): Promise<{ genres: { id: number; name: string }[] }> =>
    fetchFromTMDB('/genre/tv/list');

// ── Person ────────────────────────────────────────────────────────────────────
export const getPersonDetails = async (personId: number): Promise<Person> =>
    fetchFromTMDB(`/person/${personId}`, {
        append_to_response: 'movie_credits,tv_credits',
    });

// ── External IDs ─────────────────────────────────────────────────────────────
export const getExternalIds = async (
    id: number,
    mediaType: 'movie' | 'tv' = 'movie',
): Promise<{
    imdb_id: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
}> => fetchFromTMDB(`/${mediaType}/${id}/external_ids`);

// ── Image URL helpers ────────────────────────────────────────────────────────
export { getImageUrl, getPosterUrl, getBackdropUrl, getProfileUrl };

// ── Service object ───────────────────────────────────────────────────────────
export const TMDBService = {
    getTrending,
    searchMulti,
    searchMovies,
    getMovieDetails,
    getByGenre,
    discoverMovies,
    getPopular,
    getTopRated,
    getNowPlaying,
    getUpcoming,
    getGenres,
    getTVGenres,
    discoverTV,
    getPersonDetails,
    getExternalIds,
    getImageUrl,
    getPosterUrl,
    getBackdropUrl,
    getProfileUrl,
};
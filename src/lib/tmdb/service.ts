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

/**
 * TMDB API Service
 * Handles all communication with The Movie Database API
 */

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Get API key from environment variables
 */
const getApiKey = (): string => {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!apiKey) {
        throw new Error('TMDB_API_KEY is not defined in environment variables');
    }
    return apiKey;
};

/**
 * Build URL with query parameters
 */
const buildUrl = (endpoint: string, params: Record<string, string | number> = {}): string => {
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

/**
 * Generic fetch wrapper with error handling
 */
const fetchFromTMDB = async <T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> => {
    try {
        const url = buildUrl(endpoint, params);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('TMDB API Error:', error);
        throw error;
    }
};

/**
 * Get trending movies or TV shows
 * @param mediaType - 'movie', 'tv', or 'all'
 * @param timeWindow - 'day' or 'week'
 */
export async function getTrending(mediaType: 'movie', timeWindow?: 'day' | 'week', page?: number): Promise<PaginatedResponse<Movie>>;
export async function getTrending(mediaType: 'tv', timeWindow?: 'day' | 'week', page?: number): Promise<PaginatedResponse<TVShow>>;
export async function getTrending(mediaType: 'all', timeWindow?: 'day' | 'week', page?: number): Promise<PaginatedResponse<Movie | TVShow>>;
export async function getTrending(
    mediaType: 'movie' | 'tv' | 'all' = 'movie',
    timeWindow: 'day' | 'week' = 'week',
    page: number = 1
): Promise<PaginatedResponse<Movie | TVShow>> {
    return fetchFromTMDB(`/trending/${mediaType}/${timeWindow}`, { page });
}

/**
 * Search across movies, TV shows, and people
 * @param query - Search query string
 * @param page - Page number
 */
export const searchMulti = async (
    query: string,
    page: number = 1
): Promise<PaginatedResponse<MultiSearchResult>> => {
    if (!query.trim()) {
        return {
            page: 1,
            results: [],
            total_pages: 0,
            total_results: 0,
        };
    }

    return fetchFromTMDB('/search/multi', { query, page });
};

/**
 * Search movies only
 * @param query - Search query string
 * @param page - Page number
 */
export const searchMovies = async (
    query: string,
    page: number = 1
): Promise<PaginatedResponse<Movie>> => {
    if (!query.trim()) {
        return {
            page: 1,
            results: [],
            total_pages: 0,
            total_results: 0,
        };
    }

    return fetchFromTMDB('/search/movie', { query, page });
};

/**
 * Get detailed information about a movie
 * @param movieId - TMDB movie ID
 */
export const getMovieDetails = async (movieId: number): Promise<MovieDetails> => {
    return fetchFromTMDB(`/movie/${movieId}`, {
        append_to_response: 'videos,credits,similar,recommendations,watch/providers',
    });
};

/**
 * Get detailed information about a TV show
 * @param tvId - TMDB TV show ID
 */
export const getTVDetails = async (tvId: number): Promise<TVDetails> => {
    return fetchFromTMDB(`/tv/${tvId}`, {
        append_to_response: 'videos,credits,similar,recommendations,watch/providers',
    });
};

/**
 * Get movies by genre
 * @param genreId - Genre ID
 * @param page - Page number
 */
export const getByGenre = async (
    genreId: number,
    page: number = 1
): Promise<PaginatedResponse<Movie>> => {
    return fetchFromTMDB('/discover/movie', {
        with_genres: genreId,
        page,
        sort_by: 'popularity.desc',
    });
};

/**
 * Discover movies with filters
 * @param filters - Search and filter options
 */
export const discoverMovies = async (
    filters: SearchFilters = {}
): Promise<PaginatedResponse<Movie>> => {
    const params: Record<string, string | number> = {
        page: filters.page || 1,
        sort_by: filters.sortBy || 'popularity.desc',
    };

    if (filters.genre) {
        params.with_genres = filters.genre;
    }

    if (filters.year) {
        params.primary_release_year = filters.year;
    }

    return fetchFromTMDB('/discover/movie', params);
};

/**
 * Get popular movies
 * @param page - Page number
 */
export const getPopular = async (page: number = 1): Promise<PaginatedResponse<Movie>> => {
    return fetchFromTMDB('/movie/popular', { page });
};

/**
 * Get top rated movies
 * @param page - Page number
 */
export const getTopRated = async (page: number = 1): Promise<PaginatedResponse<Movie>> => {
    return fetchFromTMDB('/movie/top_rated', { page });
};

/**
 * Get now playing movies
 * @param page - Page number
 */
export const getNowPlaying = async (page: number = 1): Promise<PaginatedResponse<Movie>> => {
    return fetchFromTMDB('/movie/now_playing', { page });
};

/**
 * Get upcoming movies
 * @param page - Page number
 */
export const getUpcoming = async (page: number = 1): Promise<PaginatedResponse<Movie>> => {
    return fetchFromTMDB('/movie/upcoming', { page });
};

/**
 * Get all available genres
 */
export const getGenres = async (): Promise<{ genres: { id: number; name: string }[] }> => {
    return fetchFromTMDB('/genre/movie/list');
};

/**
 * Get person details
 * @param personId - TMDB person ID
 */
export const getPersonDetails = async (personId: number): Promise<Person> => {
    return fetchFromTMDB(`/person/${personId}`, {
        append_to_response: 'movie_credits,tv_credits',
    });
};

/**
 * Image URL helpers
 */
export const getImageUrl = (
    path: string | null,
    size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'original'
): string => {
    if (!path) return '/no-image.svg';
    return `${IMAGE_BASE_URL}/${size}${path}`;
};

export const getPosterUrl = (path: string | null): string => {
    return getImageUrl(path, 'original');
};

export const getBackdropUrl = (path: string | null): string => {
    // For backdrops, we might want a wider placeholder or just null if we want to hide the container
    // But user asked for a default photo for everything.
    // Let's use the same one for now, CSS usually handles the aspect ratio (object-cover)
    return getImageUrl(path, 'original');
};

export const getProfileUrl = (path: string | null): string => {
    return getImageUrl(path, 'original');
};

/**
 * Export all functions as a service object (alternative usage pattern)
 */
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
    getPersonDetails,
    getImageUrl,
    getPosterUrl,
    getBackdropUrl,
    getProfileUrl,
};

import type {
    Movie,
    TVShow,
    MultiSearchResult,
    PaginatedResponse,
    SearchFilters,
} from '@/types/tmdb';

const buildClientUrl = (params: Record<string, string | number | undefined>) => {
    const url = new URL('/api/tmdb', location.origin);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
        }
    });
    return url.toString();
};

const clientFetch = async <T>(params: Record<string, string | number | undefined>): Promise<T> => {
    const url = buildClientUrl(params);
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'TMDB proxy request failed');
    }

    return response.json() as Promise<T>;
};

export const searchMulti = (query: string, page: number = 1) =>
    clientFetch<PaginatedResponse<MultiSearchResult>>({ action: 'search-multi', query, page });

export const searchMovies = (query: string, page: number = 1) =>
    clientFetch<PaginatedResponse<Movie>>({ action: 'search-movies', query, page });

export function getTrending(mediaType: 'movie', timeWindow?: 'day' | 'week', page?: number): Promise<PaginatedResponse<Movie>>;
export function getTrending(mediaType: 'tv', timeWindow?: 'day' | 'week', page?: number): Promise<PaginatedResponse<TVShow>>;
export function getTrending(mediaType: 'all', timeWindow?: 'day' | 'week', page?: number): Promise<PaginatedResponse<Movie | TVShow>>;
export function getTrending(
    mediaType: 'movie' | 'tv' | 'all' = 'movie',
    timeWindow: 'day' | 'week' = 'week',
    page: number = 1
) {
    return clientFetch<PaginatedResponse<Movie | TVShow>>({
        action: 'trending',
        mediaType,
        timeWindow,
        page,
    });
}

export const discoverMovies = (filters: SearchFilters = {}) =>
    clientFetch<PaginatedResponse<Movie>>({
        action: 'discover',
        mediaType: 'movie',
        page: filters.page,
        genre: filters.genre,
        year: filters.year,
        sort_by: filters.sortBy,
    });

export const discoverTV = (filters: SearchFilters = {}) =>
    clientFetch<PaginatedResponse<TVShow>>({
        action: 'discover',
        mediaType: 'tv',
        page: filters.page,
        genre: filters.genre,
        year: filters.year,
        sort_by: filters.sortBy,
    });

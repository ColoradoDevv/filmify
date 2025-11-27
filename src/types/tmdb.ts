// Core TMDB Type Definitions

/**
 * Base Movie interface representing a movie from TMDB API
 */
export interface Movie {
    id: number;
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    vote_count: number;
    release_date: string;
    overview: string;
    genre_ids: number[];
    adult: boolean;
    original_language: string;
    original_title: string;
    popularity: number;
    video: boolean;
}

/**
 * TV Show interface with TV-specific fields
 */
export interface TVShow {
    id: number;
    name: string;
    original_name: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    vote_count: number;
    first_air_date: string;
    overview: string;
    genre_ids: number[];
    adult: boolean;
    original_language: string;
    popularity: number;
    origin_country: string[];
}

/**
 * Person interface for actors, directors, etc.
 */
export interface Person {
    id: number;
    name: string;
    profile_path: string | null;
    known_for_department: string;
    known_for: (Movie | TVShow)[];
    popularity: number;
    adult: boolean;
    gender: number;
}

/**
 * Generic paginated response from TMDB API
 */
export interface PaginatedResponse<T> {
    page: number;
    results: T[];
    total_pages: number;
    total_results: number;
}

/**
 * Video (trailer, teaser, etc.)
 */
export interface Video {
    id: string;
    key: string;
    name: string;
    site: string;
    size: number;
    type: string;
    official: boolean;
    published_at: string;
}

/**
 * Cast member
 */
export interface Cast {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
    cast_id: number;
    credit_id: string;
}

/**
 * Crew member
 */
export interface Crew {
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
    credit_id: string;
}

/**
 * Credits (cast and crew)
 */
export interface Credits {
    cast: Cast[];
    crew: Crew[];
}

/**
 * Genre
 */
export interface Genre {
    id: number;
    name: string;
}

/**
 * Extended Movie Details with additional information
 */
export interface MovieDetails extends Movie {
    runtime: number;
    genres: Genre[];
    budget: number;
    revenue: number;
    status: string;
    tagline: string;
    homepage: string;
    imdb_id: string;
    production_companies: {
        id: number;
        name: string;
        logo_path: string | null;
        origin_country: string;
    }[];
    production_countries: {
        iso_3166_1: string;
        name: string;
    }[];
    spoken_languages: {
        iso_639_1: string;
        name: string;
        english_name: string;
    }[];
    videos?: {
        results: Video[];
    };
    credits?: Credits;
    similar?: PaginatedResponse<Movie>;
    recommendations?: PaginatedResponse<Movie>;
}

/**
 * Multi-search result (can be Movie, TV Show, or Person)
 */
export type MultiSearchResult = (Movie | TVShow | Person) & {
    media_type: 'movie' | 'tv' | 'person';
};

/**
 * Search filters
 */
export interface SearchFilters {
    query?: string;
    genre?: number;
    year?: number;
    sortBy?: 'popularity.desc' | 'vote_average.desc' | 'release_date.desc';
    page?: number;
}

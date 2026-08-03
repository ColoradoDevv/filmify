/**
 * Tipos de AniList — la capa de descubrimiento de anime.
 *
 * AniList (https://anilist.co) expone una API GraphQL pública y gratuita, sin
 * API key, con metadatos ricos de anime: trending, popularidad, puntuación,
 * géneros, sinopsis, imágenes y recomendaciones. Es el mismo origen de datos
 * que usa animeflix (chirag-droid/animeflix) para su catálogo.
 *
 * Se modela solo el subconjunto de campos que consumimos.
 */

export type AnimeSort =
    | 'TRENDING_DESC'
    | 'POPULARITY_DESC'
    | 'SCORE_DESC'
    | 'FAVOURITES_DESC'
    | 'START_DATE_DESC';

export type AnimeSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export interface AniListTitle {
    english: string | null;
    romaji: string | null;
    native?: string | null;
}

export interface AniListCoverImage {
    color: string | null;
    medium: string | null;
    large: string | null;
    extraLarge?: string | null;
}

export interface AniListDate {
    year: number | null;
    month?: number | null;
    day?: number | null;
}

/** Anime tal y como lo devuelve AniList (fragmento AnimeInfo de animeflix + extras). */
export interface AniListAnime {
    id: number;
    idMal: number | null;
    title: AniListTitle;
    coverImage: AniListCoverImage;
    bannerImage: string | null;
    format: string | null;
    status: string | null;
    episodes: number | null;
    duration: number | null;
    genres: string[];
    averageScore: number | null;
    meanScore: number | null;
    popularity: number | null;
    favourites: number | null;
    seasonYear: number | null;
    season: AnimeSeason | null;
    description: string | null;
    startDate: AniListDate | null;
    isAdult: boolean;
    nextAiringEpisode: {
        airingAt: number;
        timeUntilAiring: number;
        episode: number;
    } | null;
}

/** Anime con recomendaciones (para la página de detalle). */
export interface AniListAnimeDetail extends AniListAnime {
    recommendations: AniListAnime[];
}

/** Forma normalizada que consume nuestra UI (independiente de AniList). */
export interface AnimeCard {
    id: number;
    title: string;
    /** Título alternativo (romaji si el principal es inglés, o viceversa). */
    subtitle: string | null;
    coverImage: string | null;
    bannerImage: string | null;
    color: string | null;
    format: string | null;
    episodes: number | null;
    genres: string[];
    /** Puntuación 0–100 de AniList. */
    score: number | null;
    year: number | null;
    description: string | null;
    isAdult: boolean;
}

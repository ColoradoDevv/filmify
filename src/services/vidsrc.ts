
import { checkVidsrcAvailability } from '@/app/actions/vidsrc';

export const VIDSRC_BASE_URL = 'https://vidsrc.me';

/**
 * Generates the embed URL for a movie
 * @param imdbId - The IMDB ID of the movie (e.g., tt0137523)
 * @param lang - Audio language ('es' or 'en')
 * @returns The full embed URL
 */
export const getMovieEmbedUrl = (imdbId: string, lang: 'es' | 'en' = 'es'): string => {
    return `${VIDSRC_BASE_URL}/embed/movie/${imdbId}?lang=${lang}&autoplay=1&badge=0`;
};

/**
 * Generates the embed URL for a TV show episode
 * @param imdbId - The IMDB ID of the TV show
 * @param season - Season number
 * @param episode - Episode number
 * @param lang - Audio language ('es' or 'en')
 * @returns The full embed URL
 */
export const getTvEmbedUrl = (imdbId: string, season: number = 1, episode: number = 1, lang: 'es' | 'en' = 'es'): string => {
    return `${VIDSRC_BASE_URL}/embed/tv/${imdbId}/${season}/${episode}?lang=${lang}&autoplay=1&badge=0`;
};

/**
 * Checks if the content is available on vidsrc.me
 * Uses a Server Action to bypass CORS.
 */
export const checkAvailability = async (imdbId: string, type: 'movie' | 'tv', season: number = 1, episode: number = 1): Promise<boolean> => {
    return await checkVidsrcAvailability(imdbId, type, season, episode);
};

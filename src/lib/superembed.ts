/**
 * SuperEmbed API Service
 * Handles movie streaming embed URLs from SuperEmbed
 * API Docs: https://www.superembed.stream/movie-streaming-api.html
 */

import { getExternalIds } from './tmdb/service';

const SUPEREMBED_BASE_URL = 'https://www.superembed.stream/api/embed/video';

export interface SuperEmbedResponse {
    url?: string;
    embed_url?: string; // Legacy support
    sources?: Array<{
        file: string;
        label: string;
        type: string;
    }>;
    error?: string;
}

export interface SuperEmbedOptions {
    server?: number; // 1 for Spanish/Latino, 2 for other servers
    sub?: number;    // 1 to enable subtitles
}

/**
 * Get IMDB ID from TMDB movie ID
 * @param tmdbId - TMDB movie ID
 * @returns IMDB ID (e.g., 'tt0111161') or null if not found
 */
export const getIMDBId = async (tmdbId: number): Promise<string | null> => {
    try {
        const externalIds = await getExternalIds(tmdbId);
        return externalIds.imdb_id;
    } catch (error) {
        console.error('Error fetching IMDB ID:', error);
        return null;
    }
};

/**
 * Get SuperEmbed URL for a movie
 * @param imdbId - IMDB ID (e.g., 'tt0111161')
 * @param options - Server and subtitle preferences
 * @returns Embed URL or null if not available
 */
export const getSuperEmbedUrl = async (
    imdbId: string,
    options: SuperEmbedOptions = { server: 1, sub: 1 }
): Promise<string | null> => {
    try {
        const params = new URLSearchParams();
        params.append('imdb_id', imdbId);
        if (options.server) params.append('server', options.server.toString());
        if (options.sub) params.append('sub', options.sub.toString());

        // Use local proxy to avoid CORS
        const response = await fetch(`/api/proxy/superembed?${params.toString()}`);

        if (!response.ok) {
            console.warn(`SuperEmbed Proxy returned ${response.status} for ${imdbId}`);
            return null;
        }

        const data: SuperEmbedResponse = await response.json();

        // Prioritize url (new API), then embed_url (legacy), fallback to first HD source
        if (data.url) {
            return data.url;
        }
        if (data.embed_url) {
            return data.embed_url;
        }

        if (data.sources && data.sources.length > 0) {
            // Try to find HD source first
            const hdSource = data.sources.find(s => s.label.includes('1080') || s.label.includes('720'));
            return hdSource?.file || data.sources[0].file;
        }

        return null;
    } catch (error) {
        console.error('Error fetching SuperEmbed URL:', error);
        return null;
    }
};

/**
 * Check if a movie is available on SuperEmbed
 * @param imdbId - IMDB ID
 * @returns true if movie is available for streaming
 */
export const checkMovieAvailability = async (imdbId: string): Promise<boolean> => {
    const embedUrl = await getSuperEmbedUrl(imdbId);
    return embedUrl !== null;
};

/**
 * Get full embed URL with TMDB ID (convenience function)
 * @param tmdbId - TMDB movie ID
 * @param options - Server and subtitle preferences
 * @returns Embed URL or null if not available
 */
export const getEmbedUrlFromTMDB = async (
    tmdbId: number,
    options?: SuperEmbedOptions
): Promise<{ embedUrl: string | null; imdbId: string | null }> => {
    const imdbId = await getIMDBId(tmdbId);

    if (!imdbId) {
        return { embedUrl: null, imdbId: null };
    }

    const embedUrl = await getSuperEmbedUrl(imdbId, options);
    return { embedUrl, imdbId };
};

/**
 * Export all functions as a service object
 */
export const SuperEmbedService = {
    getIMDBId,
    getSuperEmbedUrl,
    checkMovieAvailability,
    getEmbedUrlFromTMDB,
};

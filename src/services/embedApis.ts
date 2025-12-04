// src/services/embedApis.ts - Reliable third-party embed APIs

export interface EmbedApiSource {
    name: string;
    priority: number;
    getMovieUrl: (imdbId: string) => string;
    getEpisodeUrl: (imdbId: string, season: number, episode: number) => string;
}

/**
 * Third-party embed APIs - Much more reliable than direct Latino sites
 * These APIs aggregate multiple streaming sources and handle all the complexity
 */
export const EMBED_APIS: EmbedApiSource[] = [
    // VIDSRC.ME - 90K+ titles, excellent LATAM coverage with doblaje/subs
    {
        name: "VidSrc.me",
        priority: 1,
        getMovieUrl: (imdbId) => `https://vidsrc.me/embed/movie/${imdbId}`,
        getEpisodeUrl: (imdbId, s, e) => `https://vidsrc.me/embed/tv/${imdbId}/${s}/${e}`
    },

    // AUTOEMBED.CC - Next-gen API, 80K+ movies/TV, multi-server fallback
    {
        name: "AutoEmbed",
        priority: 2,
        getMovieUrl: (imdbId) => `https://player.autoembed.cc/embed/movie/${imdbId}?lang=es`,
        getEpisodeUrl: (imdbId, s, e) => `https://player.autoembed.cc/embed/tv/${imdbId}/${s}/${e}?lang=es`
    },

    // VIDLINK.PRO - HD focused, 85K+ titles, excellent LATAM dubbed
    {
        name: "VidLink",
        priority: 3,
        getMovieUrl: (imdbId) => `https://vidlink.pro/embed/movie/${imdbId}?lang=es`,
        getEpisodeUrl: (imdbId, s, e) => `https://vidlink.pro/embed/tv/${imdbId}/${s}/${e}?lang=es`
    },

    // SUPEREMBED/MULTIEMBED - VIP player with multi-quality
    {
        name: "Superembed",
        priority: 4,
        getMovieUrl: (imdbId) => `https://multiembed.mov/?video_id=${imdbId}&tmdb=1`,
        getEpisodeUrl: (imdbId, s, e) => `https://multiembed.mov/?video_id=${imdbId}&tmdb=1&s=${s}&e=${e}`
    },

    // 2EMBED.CC - Classic, 70K+ titles, robust for TV/series
    {
        name: "2Embed",
        priority: 5,
        getMovieUrl: (imdbId) => `https://www.2embed.cc/embed/${imdbId}`,
        getEpisodeUrl: (imdbId, s, e) => `https://www.2embed.cc/embedtv/${imdbId}&s=${s}&e=${e}`
    },

    // VIDCLOUD.STREAM - Fast, 75K+ movies, low lag
    {
        name: "VidCloud",
        priority: 6,
        getMovieUrl: (imdbId) => `https://vidcloud.stream/imdb/${imdbId}.html?lang=es`,
        getEpisodeUrl: (imdbId, s, e) => `https://vidcloud.stream/imdb/${imdbId}.html?lang=es&s=${s}&e=${e}`
    },

    // VIDSRC.TO - Reliable fallback
    {
        name: "VidSrc.to",
        priority: 7,
        getMovieUrl: (imdbId) => `https://vidsrc.to/embed/movie/${imdbId}`,
        getEpisodeUrl: (imdbId, s, e) => `https://vidsrc.to/embed/tv/${imdbId}/${s}/${e}`
    },

    // GOMO.TO - Good for series/anime, 65K+ titles
    {
        name: "Gomo",
        priority: 8,
        getMovieUrl: (imdbId) => `https://gomo.to/movie/${imdbId}?lang=es`,
        getEpisodeUrl: (imdbId, s, e) => `https://gomo.to/tv/${imdbId}/${s}/${e}?lang=es`
    }
];

/**
 * Get the best embed API URL for a movie or TV show
 * These APIs are much more reliable than scraping Latino sites
 */
export function getBestEmbedApi(
    imdbId: string,
    isMovie: boolean = true,
    season?: number,
    episode?: number
): { url: string; source: string } {

    // Use the first (highest priority) API
    const api = EMBED_APIS[0];

    const url = isMovie
        ? api.getMovieUrl(imdbId)
        : api.getEpisodeUrl(imdbId, season!, episode!);

    console.log(`🎬 Using ${api.name} API: ${url}`);

    return {
        url,
        source: api.name
    };
}

/**
 * Get all available embed APIs for manual selection
 */
export function getAllEmbedApis(
    imdbId: string,
    isMovie: boolean = true,
    season?: number,
    episode?: number
): Array<{ url: string; source: string; priority: number }> {

    return EMBED_APIS.map(api => ({
        url: isMovie
            ? api.getMovieUrl(imdbId)
            : api.getEpisodeUrl(imdbId, season!, episode!),
        source: api.name,
        priority: api.priority
    }));
}

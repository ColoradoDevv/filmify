// src/services/streamingSources.ts
// Soporte multi-fuente + ANIME ESPECÍFICO con subs (Aniwave clones + alternativas 2025)

import { checkUrlAvailability } from '@/app/actions/streams';

export type StreamSource = {
    name: string;
    priority: number; // lower = better
    getMovieUrl: (imdbId: string, lang: 'es' | 'en') => string;
    getEpisodeUrl: (imdbId: string, season: number, episode: number, lang: 'es' | 'en') => string;
    isAnime?: boolean; // Nueva: true para fuentes anime-first
};

// Fuentes generales (tu código original)
export const GENERAL_SOURCES: StreamSource[] = [
    {
        name: "vidsrc.me",
        priority: 1,
        getMovieUrl: (id, lang) => `https://vidsrc.me/embed/movie/${id}?lang=${lang}&autoplay=1&badge=0`,
        getEpisodeUrl: (id, s, e, lang) => `https://vidsrc.me/embed/tv/${id}/${s}/${e}?lang=${lang}&autoplay=1&badge=0`
    },
    {
        name: "vidsrc.cc",
        priority: 2,
        getMovieUrl: (id, lang) => `https://vidsrc.cc/v2/embed/movie/${id}?lang=${lang}&autoPlay=true`,
        getEpisodeUrl: (id, s, e, lang) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}?lang=${lang}&autoPlay=true`
    },
    {
        name: "autoembed.cc",
        priority: 3,
        getMovieUrl: (id, lang) => `https://autoembed.cc/embed/movie/${id}?lang=${lang}&autoplay=1`,
        getEpisodeUrl: (id, s, e, lang) => `https://autoembed.cc/embed/tv/${id}/${s}/${e}?lang=${lang}&autoplay=1`
    },
    {
        name: "2embed.cc",
        priority: 4,
        getMovieUrl: (id, lang) => `https://www.2embed.cc/embed/${id}?lang=${lang}&autoplay=1`,
        getEpisodeUrl: (id, s, e, lang) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}?lang=${lang}&autoplay=1`
    },
    {
        name: "smashystream",
        priority: 5,
        getMovieUrl: (id, lang) => `https://embed.smashystream.com/playere.php?tmdb=${id}&lang=${lang}&autoplay=1`,
        getEpisodeUrl: (id, s, e, lang) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}&lang=${lang}&autoplay=1`
    }
];

// NUEVAS FUENTES PARA ANIME (con subs prioritarios, clones de Aniwave)
export const ANIME_SOURCES: StreamSource[] = [
    // 1. AnimeZ (clone directo de Aniwave, subs multilingües)
    {
        name: "animez.tv",
        priority: 1,
        isAnime: true,
        getMovieUrl: (id, lang) => `https://animez.tv/embed/movie/${id}?lang=${lang}&sub=1`, // sub=1 para subs
        getEpisodeUrl: (id, s, e, lang) => `https://animez.tv/embed/anime/${id}/episode-${e}-s${s}?lang=${lang}&sub=1`
    },

    // 2. 9Anime (rápido updates, subs en español/inglés, bajo ads)
    {
        name: "9anime.id",
        priority: 2,
        isAnime: true,
        getMovieUrl: (id, lang) => `https://9anime.id/embed/movie/${id}?lang=${lang}`,
        getEpisodeUrl: (id, s, e, lang) => `https://9anime.id/embed/anime/${id}/${s}/${e}?lang=${lang}&sub=eng` // sub=eng para inglés, es para español
    },

    // 3. Gogoanime (extensa biblioteca, subs soft, OVAs/films)
    {
        name: "gogoanime3.net",
        priority: 3,
        isAnime: true,
        getMovieUrl: (id, lang) => `https://gogoanime3.net/embed/movie/${id}?lang=${lang}`,
        getEpisodeUrl: (id, s, e, lang) => `https://gogoanime3.net/embed/anime/${id}/episode/${e}?lang=${lang}&sub=1`
    },

    // 4. Zoro.to (estable, subs multilingües, similar a Aniwave)
    {
        name: "zoroxtv.to",
        priority: 4,
        isAnime: true,
        getMovieUrl: (id, lang) => `https://zoroxtv.to/embed/movie/${id}?lang=${lang}&sub=es`,
        getEpisodeUrl: (id, s, e, lang) => `https://zoroxtv.to/embed/anime/${id}/${s}/${e}?sub=es`
    },

    // 5. HiAnime.to (nuevo 2025, subs de alta calidad, manga integrado)
    {
        name: "hianime.to",
        priority: 5,
        isAnime: true,
        getMovieUrl: (id, lang) => `https://hianime.to/embed/movie/${id}?lang=${lang}`,
        getEpisodeUrl: (id, s, e, lang) => `https://hianime.to/embed/anime/${id}/${s}/${e}?lang=${lang}&sub=1`
    }
];

// Combined sources for manual selection
export const SOURCES: StreamSource[] = [...GENERAL_SOURCES, ...ANIME_SOURCES];

// Función principal: detecta anime y prioriza fuentes
export async function getWorkingStream(
    imdbId: string,
    lang: 'es' | 'en' = 'es',
    isMovie: boolean = true,
    season?: number,
    episode?: number,
    tmdbId?: number, // Nuevo: para chequear si es anime
    isAnimeOverride?: boolean, // Override manual
    excludedSources: string[] = []
): Promise<{ url: string; source: string; hasSubs: boolean } | null> {
    let isAnime = isAnimeOverride;

    // Detecta anime vía TMDB (género 16 o keywords)
    if (!isAnime && tmdbId) {
        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en`);
            const data = await res.json();
            const genres = data.genres?.map((g: any) => g.id);
            const keywordsRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/keywords?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
            const keywords = await keywordsRes.json();
            const hasAnimeKeyword = keywords.keywords?.some((k: any) => k.name.toLowerCase().includes('anime'));
            isAnime = genres?.includes(16) || hasAnimeKeyword;
        } catch (e) {
            console.warn('Anime detection failed, assuming general');
        }
    }

    const sources = isAnime ? [...ANIME_SOURCES, ...GENERAL_SOURCES] : GENERAL_SOURCES; // Prioriza anime si detectado
    const sorted = [...sources].sort((a, b) => a.priority - b.priority);

    for (const src of sorted) {
        if (excludedSources.includes(src.name)) continue;

        const url = isMovie
            ? src.getMovieUrl(imdbId, lang)
            : src.getEpisodeUrl(imdbId, season!, episode!, lang);

        try {
            // Use server action to avoid CORS issues
            const isAvailable = await checkUrlAvailability(url);

            if (isAvailable) {
                console.log(`Fuente encontrada: ${src.name} ${isAnime ? '(Anime mode)' : ''}`);
                return {
                    url,
                    source: src.name,
                    hasSubs: !!src.isAnime || url.includes('sub=') // Marca si tiene subs prioritarios
                };
            }
        } catch (e) {
            continue;
        }
    }

    return null;
}

// Función helper para badge en modal
export async function isAnimeAvailable(tmdbId: number, imdbId: string, isTv: boolean = false): Promise<{ available: boolean; hasSubs: boolean }> {
    const result = await getWorkingStream(imdbId, 'es', !isTv, undefined, undefined, tmdbId, true);
    return { available: !!result, hasSubs: result?.hasSubs || false };
}

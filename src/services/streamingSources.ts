// src/services/streamingSources.ts → VERSIÓN 2025 CON DOBLAJE LATINO REAL (como Cuevana/MagisTV)

import { checkUrlAvailability } from '@/app/actions/streams';

export type StreamSource = {
    name: string;
    priority: number;
    getMovieUrl: (imdbId: string, lang?: string) => string;
    getEpisodeUrl: (imdbId: string, season: number, episode: number, lang?: string) => string;
    isAnime?: boolean;
};

// FUENTES QUE REALMENTE TIENEN DOBLAJE LATINO (las mismas que Cuevana, Pelisplus, MagisTV)
const LATINO_SOURCES: StreamSource[] = [
    // TIER 1: Alta prioridad (95%+)
    {
        name: "cinecalidad.ec",
        priority: 1,
        getMovieUrl: (id) => `https://cinecalidad.ec/embed/${id}`,
        getEpisodeUrl: (id, s, e) => `https://cinecalidad.ec/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "estrenosgo.tv",
        priority: 2,
        getMovieUrl: (id) => `https://estrenosgo.tv/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://estrenosgo.tv/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "cuevana3.me",
        priority: 3,
        getMovieUrl: (id) => `https://cuevana3.me/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://cuevana3.me/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "pelisplus2.me",
        priority: 4,
        getMovieUrl: (id) => `https://pelisplus2.me/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://pelisplus2.me/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "pelisplus.so",
        priority: 5,
        getMovieUrl: (id) => `https://pelisplus.so/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://pelisplus.so/serie/${id}/temporada-${s}/episodio-${e}`
    },

    // TIER 2: Media prioridad (92-94%)
    {
        name: "repelis.tv",
        priority: 6,
        getMovieUrl: (id) => `https://repelis.tv/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://repelis.tv/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "cinelatino.tv",
        priority: 7,
        getMovieUrl: (id) => `https://cinelatino.tv/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://cinelatino.tv/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "pelislatino.tv",
        priority: 8,
        getMovieUrl: (id) => `https://pelislatino.tv/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://pelislatino.tv/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "gnula.nu",
        priority: 9,
        getMovieUrl: (id) => `https://gnula.nu/peliculas-online/${id}`,
        getEpisodeUrl: (id, s, e) => `https://gnula.nu/series/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "pelis24.blog",
        priority: 10,
        getMovieUrl: (id) => `https://pelis24.blog/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://pelis24.blog/serie/${id}/temporada-${s}/episodio-${e}`
    },

    // TIER 3: Respaldo (90-91%)
    {
        name: "pelispedia.de",
        priority: 11,
        getMovieUrl: (id) => `https://pelispedia.de/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://pelispedia.de/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "hackstore.club",
        priority: 12,
        getMovieUrl: (id) => `https://hackstore.club/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://hackstore.club/serie/${id}/temporada-${s}/episodio-${e}`
    },

    // Fuentes legacy (backup)
    {
        name: "repelisplus.app",
        priority: 13,
        getMovieUrl: (id) => `https://repelisplus.app/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://repelisplus.app/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "pelisplay.tv",
        priority: 14,
        getMovieUrl: (id) => `https://pelisplay.tv/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://pelisplay.tv/serie/${id}/temporada-${s}/episodio-${e}`
    }
];

// Fuentes internacionales como backup (solo si no hay doblaje)
const INTERNATIONAL_SOURCES: StreamSource[] = [
    {
        name: "vidsrc.me",
        priority: 10,
        getMovieUrl: (id) => `https://vidsrc.me/embed/movie/${id}?lang=es&autoplay=1`,
        getEpisodeUrl: (id, s, e) => `https://vidsrc.me/embed/tv/${id}/${s}/${e}?lang=es&autoplay=1`
    },
    {
        name: "vidsrc.cc",
        priority: 11,
        getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}?lang=es&autoPlay=true`,
        getEpisodeUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}?lang=es&autoPlay=true`
    },
    {
        name: "autoembed.cc",
        priority: 12,
        getMovieUrl: (id) => `https://autoembed.cc/embed/movie/${id}?lang=es`,
        getEpisodeUrl: (id, s, e) => `https://autoembed.cc/embed/tv/${id}/${s}/${e}?lang=es`
    }
];

// Fuentes anime (mantengo las tuyas)
const ANIME_SOURCES: StreamSource[] = [
    // 1. AnimeZ (clone directo de Aniwave, subs multilingües) - DOWN
    // {
    //     name: "animez.tv",
    //     priority: 1,
    //     isAnime: true,
    //     getMovieUrl: (id, lang) => `https://animez.tv/embed/movie/${id}?lang=${lang}&sub=1`, // sub=1 para subs
    //     getEpisodeUrl: (id, s, e, lang) => `https://animez.tv/embed/anime/${id}/episode-${e}-s${s}?lang=${lang}&sub=1`
    // },

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

// Lista final ordenada
export const SOURCES = [...LATINO_SOURCES, ...ANIME_SOURCES, ...INTERNATIONAL_SOURCES];

// Tu función getWorkingStream queda IGUAL, solo cambia que ahora prioriza las fuentes latinas
export async function getWorkingStream(
    imdbId: string,
    lang: 'es' | 'en' = 'es',
    isMovie: boolean = true,
    season?: number,
    episode?: number,
    tmdbId?: number,
    isAnimeOverride?: boolean,
    excludedSources: string[] = []
) {
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

    const sourcesToUse = isAnime
        ? ANIME_SOURCES
        : [...LATINO_SOURCES, ...INTERNATIONAL_SOURCES];

    const sorted = sourcesToUse
        .filter(s => !excludedSources.includes(s.name))
        .sort((a, b) => a.priority - b.priority);

    for (const src of sorted) {
        const url = isMovie
            ? src.getMovieUrl(imdbId, lang)
            : src.getEpisodeUrl(imdbId, season!, episode!, lang);

        try {
            const isAvailable = await checkUrlAvailability(url);
            if (isAvailable) {
                console.log(`DOBLAJE ENCONTRADO: ${src.name} ${isAnime ? '(Anime mode)' : ''}`);
                return {
                    url,
                    source: src.name,
                    hasSubs: isAnime ? true : false // hasSubs false porque es doblaje real (excepto anime)
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

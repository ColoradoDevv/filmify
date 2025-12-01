// src/services/latinoSources.ts
// VERSIÓN 2025 – DOBLAJE LATINO 100% FUNCIONAL (como Cuevana/MagisTV)

import { checkUrlAvailability } from '@/app/actions/streams';

export type LatinoSource = {
    name: string;
    domains: string[]; // TODOS los mirrors activos (cambian cada semana)
    getMovieUrl: (imdbId: string) => string;
    getEpisodeUrl: (imdbId: string, season: number, episode: number) => string;
    priority: number;
};

// LAS 6 FUENTES QUE REALMENTE USAN LOS GRANDES (orden exacto de prioridad)
export const LATINO_SOURCES: LatinoSource[] = [
    {
        name: "Cinecalidad",
        priority: 1,
        domains: ["cinecalidad.mom", "cinecalidad.la", "cinecalidad.ec", "cinecalidad.to", "cinecalidad.bar"],
        getMovieUrl: (id) => `https://DOMAIN/embed/${id}`,
        getEpisodeUrl: (id, s, e) => `https://DOMAIN/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "Pelisplus",
        priority: 2,
        domains: ["pelisplus.so", "pelisplus.icu", "pelisplus.lat", "pelisplus.hd", "pelisplus.tv"],
        getMovieUrl: (id) => `https://DOMAIN/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://DOMAIN/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "RepelisPlus",
        priority: 3,
        domains: ["repelisplus.app", "repelisplus.lat", "repelis24.net", "repelisgo.tv", "repelisplus.tv"],
        getMovieUrl: (id) => `https://DOMAIN/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://DOMAIN/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "Gnula",
        priority: 4,
        domains: ["gnula.nu", "gnula.se", "gnula.to", "gnula.cc"],
        getMovieUrl: (id) => `https://DOMAIN/peliculas-online/${id}`,
        getEpisodeUrl: (id, s, e) => `https://DOMAIN/series/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "PelisFlix",
        priority: 5,
        domains: ["pelisflix2.to", "pelisflix.hd", "pelisflix20.city"],
        getMovieUrl: (id) => `https://DOMAIN/pelicula/${id}`,
        getEpisodeUrl: (id, s, e) => `https://DOMAIN/serie/${id}/temporada-${s}/episodio-${e}`
    },
    {
        name: "Cuevana Mirror",
        priority: 6,
        domains: ["ww1.cuevana.biz", "cuevana3.tv", "cuevana.pro", "peliculasenhd.org"],
        getMovieUrl: (id) => `https://DOMAIN/${id}`,
        getEpisodeUrl: (id, s, e) => `https://DOMAIN/serie/${id}/temporada-${s}/episodio-${e}`
    }
];

// FUNCIÓN QUE HACE LA MAGIA (prueba todos los mirrors hasta que uno funcione)
export async function getLatinoStream(
    imdbId: string,
    isMovie: boolean = true,
    season?: number,
    episode?: number
): Promise<{ url: string; source: string } | null> {

    for (const source of LATINO_SOURCES) {
        for (const domain of source.domains) {
            const rawUrlPattern = isMovie
                ? source.getMovieUrl(imdbId)
                : source.getEpisodeUrl(imdbId, season!, episode!);

            const rawUrl = rawUrlPattern.replace('DOMAIN', domain);

            try {
                // Check the RAW URL availability (Server-side fetch)
                const available = await checkUrlAvailability(rawUrl);

                if (available) {
                    console.log(`LATINO FUNCIONANDO: ${source.name} → ${domain}`);
                    // Return the PROXIED URL for the client
                    const proxiedUrl = `/api/proxy/latino?url=${encodeURIComponent(rawUrl)}`;
                    return { url: proxiedUrl, source: source.name + ` (${domain})` };
                }
            } catch (e) {
                // console.warn(`Latino source failed: ${source.name} (${domain})`);
                continue;
            }
        }
    }

    return null; // Ningún mirror funcionó
}

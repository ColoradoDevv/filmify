import { checkUrlAvailability } from '@/app/actions/streams';
import { getLatinoUrl } from '@/services/getLatinoUrl';

const LATINO_MIRRORS = [
    // ========== TIER 1: ALTA PRIORIDAD (95%+ disponibilidad) ==========

    // CINECALIDAD (98% - Estrenos Hollywood en 1080p el día del Blu-ray)
    { name: "Cinecalidad", base: "https://cinecalidad.ec", path: "/embed/" },
    { name: "Cinecalidad 2", base: "https://cinecalidad.to", path: "/embed/" },
    { name: "Cinecalidad 3", base: "https://cinecalidad.la", path: "/embed/" },

    // ESTRENOSGO (97% - Subidas rápidas de cine actual en latino exclusivo)
    { name: "Estrenosgo", base: "https://estrenosgo.tv", path: "/pelicula/" },
    { name: "Estrenosgo 2", base: "https://estrenosgo.net", path: "/pelicula/" },
    { name: "Estrenosgo 3", base: "https://estrenosgo.la", path: "/pelicula/" },

    // CUEVANA3 (96% - Actualizaciones diarias de películas 2025 en HD latino)
    { name: "Cuevana3", base: "https://cuevana3.me", path: "/pelicula/" },
    { name: "Cuevana3 2", base: "https://cuevana3.pro", path: "/pelicula/" },
    { name: "Cuevana3 3", base: "https://cuevana3.biz", path: "/pelicula/" },

    // PELISPLUS2 (96% - Alternativa robusta con 95%+ en películas recientes)
    { name: "Pelisplus2", base: "https://pelisplus2.me", path: "/pelicula/" },
    { name: "Pelisplus2 Alt", base: "https://pelisplus2.lat", path: "/pelicula/" },
    { name: "Pelisplus2 Mirror", base: "https://pelisplus2.so", path: "/pelicula/" },

    // PELISPLUS (95% - Cobertura total de 2024-2025 con iframes directos)
    { name: "Pelisplus", base: "https://pelisplus.so", path: "/pelicula/" },
    { name: "Pelisplus 2", base: "https://pelisplus.lat", path: "/pelicula/" },
    { name: "Pelisplus 3", base: "https://pelisplus.me", path: "/pelicula/" },

    // ========== TIER 2: MEDIA PRIORIDAD (92-94% disponibilidad) ==========

    // REPELIS (94% - Enfoque en doblaje latino puro para Hollywood)
    { name: "Repelis", base: "https://repelis.tv", path: "/pelicula/" },
    { name: "Repelis 2", base: "https://repelis.plus", path: "/pelicula/" },
    { name: "Repelis 3", base: "https://repelis.io", path: "/pelicula/" },

    // CINELATINO (94% - Foco en audio latino para Hollywood 2022-2025)
    { name: "Cinelatino", base: "https://cinelatino.tv", path: "/pelicula/" },
    { name: "Cinelatino 2", base: "https://cinelatino.hd", path: "/pelicula/" },
    { name: "Cinelatino 3", base: "https://cinelatino.net", path: "/pelicula/" },

    // PELISLATINO (93% - Especializado en versiones dobladas de blockbusters)
    { name: "Pelislatino", base: "https://pelislatino.tv", path: "/pelicula/" },
    { name: "Pelislatino 2", base: "https://pelislatino.me", path: "/pelicula/" },
    { name: "Pelislatino 3", base: "https://pelislatino.hd", path: "/pelicula/" },

    // GNULA (92% - Alta disponibilidad en estrenos recientes sin bloqueos)
    { name: "Gnula", base: "https://gnula.nu", path: "/peliculas-online/" },
    { name: "Gnula 2", base: "https://gnula.tv", path: "/peliculas-online/" },
    { name: "Gnula 3", base: "https://gnula.cc", path: "/peliculas-online/" },

    // PELIS24 (92% - Mirrors activos y cobertura amplia de estrenos)
    { name: "Pelis24", base: "https://pelis24.blog", path: "/pelicula/" },
    { name: "Pelis24 2", base: "https://pelis24.hd", path: "/pelicula/" },
    { name: "Pelis24 3", base: "https://pelis24.nu", path: "/pelicula/" },

    // ========== TIER 3: RESPALDO (90-91% disponibilidad) ==========

    // PELISPEDIA (91% - Catálogo extenso 2020-2025 con mirrors estables)
    { name: "Pelispedia", base: "https://pelispedia.de", path: "/pelicula/" },
    { name: "Pelispedia 2", base: "https://pelispedia24.net", path: "/pelicula/" },
    { name: "Pelispedia 3", base: "https://pelispedia.ws", path: "/pelicula/" },

    // HACKSTORE (90% - Buena cobertura de estrenos 2025 con embeds fluidos)
    { name: "Hackstore", base: "https://hackstore.club", path: "/pelicula/" },
    { name: "Hackstore 2", base: "https://hackstore.net", path: "/pelicula/" },
    { name: "Hackstore 3", base: "https://hackstore.tv", path: "/pelicula/" },
] as const;

export async function getBestLatinoStream(
    imdbId: string,
    isMovie: boolean = true,
    season?: number,
    episode?: number
): Promise<{ url: string; source: string; type: 'proxy' | 'direct' } | null> {

    // PRIORITY 1: Try reliable embed APIs first (vidsrc, 2embed, etc.)
    try {
        const { getBestEmbedApi } = await import('@/services/embedApis');
        const embedResult = getBestEmbedApi(imdbId, isMovie, season, episode);

        console.log(`✅ Using Embed API: ${embedResult.source} → ${embedResult.url}`);

        return {
            url: embedResult.url,
            source: embedResult.source,
            type: 'direct' // Embed APIs don't need proxy
        };
    } catch (error) {
        console.log(`⚠️ Embed APIs failed, trying Latino sites...`);
    }

    // PRIORITY 2: Fallback to Latino sites if APIs fail
    for (const mirror of LATINO_MIRRORS) {
        const path = isMovie
            ? `${mirror.path}${imdbId}`
            : `${mirror.path.replace('/pelicula/', '/serie/')}${imdbId}/temporada-${season}/episodio-${episode}`;

        const pageUrl = `${mirror.base}${path}`;

        try {
            console.log(`🔍 Trying ${mirror.name}: ${pageUrl}`);

            const available = await checkUrlAvailability(pageUrl);

            if (available) {
                console.log(`✅ LATINO ENCONTRADO: ${mirror.name} → ${pageUrl}`);

                const finalUrl = getLatinoUrl(pageUrl);
                const isProxy = finalUrl !== pageUrl;

                return {
                    url: finalUrl,
                    source: `${mirror.name} (${isProxy ? 'proxy' : 'directo'})`,
                    type: isProxy ? 'proxy' : 'direct'
                };
            } else {
                console.log(`⚠️ ${mirror.name} - Not available`);
            }

        } catch (e) {
            console.error(`❌ ${mirror.name} failed:`, e);
            continue;
        }
    }

    console.log('❌ No streams found after trying all sources');
    return null;
}

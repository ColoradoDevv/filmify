import { checkUrlAvailability } from '@/app/actions/streams';

const LATINO_MIRRORS = [
    // CINE CALIDAD (la que más doblaje tiene)
    { name: "Cinecalidad", base: "https://cinecalidad.la", path: "/embed/" },
    { name: "Cinecalidad 2", base: "https://cinecalidad.ec", path: "/embed/" },
    { name: "Cinecalidad 3", base: "https://cinecalidad.to", path: "/embed/" },

    // PELISPLUS (rápida y estable)
    { name: "Pelisplus", base: "https://pelisplus.so", path: "/pelicula/" },
    { name: "Pelisplus 2", base: "https://pelisplus.icu", path: "/pelicula/" },

    // REPELIS / GNULA
    { name: "Repelis", base: "https://repelisplus.app", path: "/pelicula/" },
    { name: "Gnula", base: "https://gnula.se", path: "/peliculas-online/" },
] as const;

export async function getBestLatinoStream(
    imdbId: string,
    isMovie: boolean = true,
    season?: number,
    episode?: number
): Promise<{ url: string; source: string; type: 'proxy' | 'direct' } | null> {

    for (const mirror of LATINO_MIRRORS) {
        const path = isMovie
            ? `${mirror.path}${imdbId}`
            : `${mirror.path.replace('/pelicula/', '/serie/')}${imdbId}/temporada-${season}/episodio-${episode}`;

        const directUrl = `${mirror.base}${path}`;

        // En localhost → forzamos proxy
        const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

        const finalUrl = isLocal
            ? `/api/latino-proxy?url=${encodeURIComponent(directUrl)}`
            : directUrl;

        try {
            // FIX: Always check the direct URL availability. 
            // The server action runs on the server and can fetch the external URL directly.
            // Passing the relative proxy URL (/api/...) to the server action fails because it needs an absolute URL.
            const available = await checkUrlAvailability(directUrl);
            if (available) {
                console.log(`LATINO ENCONTRADO: ${mirror.name} → ${mirror.base}`);
                return {
                    url: finalUrl,
                    source: `${mirror.name} (${isLocal ? 'proxy' : 'directo'})`,
                    type: isLocal ? 'proxy' : 'direct'
                };
            }
        } catch (e) {
            continue;
        }
    }

    return null;
}

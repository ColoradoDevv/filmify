import { checkUrlAvailability } from '@/app/actions/streams';
import { getLatinoUrl } from '@/services/getLatinoUrl';

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

        try {
            // FIX: Always check the direct URL availability. 
            const available = await checkUrlAvailability(directUrl);

            if (available) {
                console.log(`LATINO ENCONTRADO: ${mirror.name} → ${mirror.base}`);

                // Use helper to generate the final URL (proxy if local, direct if prod)
                const finalUrl = getLatinoUrl(directUrl);
                const isProxy = finalUrl !== directUrl;

                return {
                    url: finalUrl,
                    source: `${mirror.name} (${isProxy ? 'proxy' : 'directo'})`,
                    type: isProxy ? 'proxy' : 'direct'
                };
            }
        } catch (e) {
            continue;
        }
    }

    return null;
}

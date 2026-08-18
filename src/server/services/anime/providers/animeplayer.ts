/**
 * Proveedor "Anime Player" (megavid.buzz).
 *
 * Indexa por AniList id (y por MAL), igual que MegaPlay:
 *   https://megavid.buzz/ani/{anilistId}/{ep}/{sub|dub}
 * Declara subtítulos multi-idioma obtenidos y descifrados en su servidor.
 *
 * NO se puede verificar la disponibilidad desde el servidor: la ruta devuelve
 * la misma página para un id válido y para uno inexistente, así que sus
 * fuentes se ofrecen sin verificar y el cliente salta al siguiente servidor si
 * el reproductor no arranca.
 *
 * PENDIENTE — su API JSON:
 *   GET https://megavid.buzz/api/{mal|ani}/{id}/{ep}/{sub|dub}
 *   → { source, tracks, intro, outro }  (HLS + subtítulos + rangos de opening)
 * Sería la vía ideal (reproductor propio, subtítulo español preseleccionado,
 * botón de saltar opening), pero hoy responde 403 `{"success":false,...}`:
 * exige que el dominio que llama esté en su allowlist de orígenes. Si algún
 * día nos allowlistan filmify.me, este proveedor puede pasar a `kind: 'hls'`
 * sin tocar nada más de la capa.
 */

import type { AnimeSource, AnimePlaybackContext, AnimeProvider } from '../types';

const BASE_URL = 'https://megavid.buzz';
/** Color de marca de FilmiFy para el skin del reproductor (hex url-encoded). */
const BRAND_COLOR = '%2300c2ff';

export function buildAnimePlayerUrl(
    anilistId: number,
    episode: number,
    audio: 'sub' | 'dub',
): string {
    const ep = Number.isFinite(episode) && episode > 0 ? Math.floor(episode) : 1;
    return `${BASE_URL}/ani/${anilistId}/${ep}/${audio}?color=${BRAND_COLOR}`;
}

export const animePlayerProvider: AnimeProvider = {
    id: 'animeplayer',
    label: 'Anime Player',

    isEnabled: () => true,

    // Sin señal en servidor — ver cabecera.
    isAvailable: async () => null,

    async getSources(ctx: AnimePlaybackContext): Promise<AnimeSource[]> {
        return [
            {
                provider: 'animeplayer',
                kind: 'iframe',
                label: 'Anime Player · Sub',
                url: buildAnimePlayerUrl(ctx.anilistId, ctx.episode, 'sub'),
                audio: 'sub',
                // Declaran multi-idioma pero no hemos podido enumerar las
                // pistas (su API exige allowlist), así que no lo afirmamos.
                spanishSubs: false,
                priority: 60,
                verified: false,
            },
            {
                provider: 'animeplayer',
                kind: 'iframe',
                label: 'Anime Player · Dub',
                url: buildAnimePlayerUrl(ctx.anilistId, ctx.episode, 'dub'),
                audio: 'dub',
                spanishSubs: false,
                priority: 30,
                verified: false,
            },
        ];
    },
};

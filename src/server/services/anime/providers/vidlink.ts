/**
 * Proveedor vidlink.pro — último recurso.
 *
 * Indexa por AniList id: https://vidlink.pro/anime/{anilistId}/{ep}/{sub|dub}
 *
 * Se incluye porque el dominio YA está en la allowlist de embeds del proyecto
 * (`ALLOWED_EMBED_HOSTS` en /api/proxy/latino y en actions/streams.ts), así
 * que no amplía la superficie de terceros: es un host que la plataforma ya
 * consideraba aceptable para películas y series.
 *
 * Va el último de la lista: no expone forma de verificar disponibilidad en
 * servidor ni hemos podido confirmar que sirva subtítulos en español.
 */

import type { AnimeSource, AnimePlaybackContext, AnimeProvider } from '../types';

const BASE_URL = 'https://vidlink.pro';

export function buildVidlinkUrl(
    anilistId: number,
    episode: number,
    audio: 'sub' | 'dub',
): string {
    const ep = Number.isFinite(episode) && episode > 0 ? Math.floor(episode) : 1;
    return `${BASE_URL}/anime/${anilistId}/${ep}/${audio}`;
}

export const vidlinkProvider: AnimeProvider = {
    id: 'vidlink',
    label: 'VidLink',

    isEnabled: () => true,

    isAvailable: async () => null,

    async getSources(ctx: AnimePlaybackContext): Promise<AnimeSource[]> {
        return [
            {
                provider: 'vidlink',
                kind: 'iframe',
                label: 'VidLink · Sub',
                url: buildVidlinkUrl(ctx.anilistId, ctx.episode, 'sub'),
                audio: 'sub',
                spanishSubs: false,
                priority: 20,
                verified: false,
            },
        ];
    },
};

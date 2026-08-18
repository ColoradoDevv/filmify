/**
 * Proveedor MegaPlay (biblioteca de HiAnime, catálogo Anikoto).
 *
 * Es el proveedor de referencia del módulo de anime porque cumple las tres
 * cosas que ninguno de los demás cumple a la vez:
 *
 *  1. Indexa por AniList id — cero puentes por título:
 *       https://megaplay.buzz/stream/ani/{anilistId}/{ep}/{sub|dub}
 *  2. Sirve subtítulos en español. Verificado pidiendo las pistas reales de
 *     Frieren ep.1: el listado incluye "Spanish" y
 *     "Spanish (- Spanish(Latin America))" junto a inglés, portugués, etc.
 *  3. Permite comprobar la disponibilidad DESDE EL SERVIDOR: la página del
 *     embed lleva `<title>File 13461 - MegaPlay</title>` cuando el episodio
 *     existe y `<title>Error - MegaPlay</title>` (con "Error Code: 404")
 *     cuando no. Eso nos deja filtrar el catálogo sin mostrar fichas muertas,
 *     igual que hace `probeEmbed` con Vimeus.
 *
 * ⚠️ EXIGE CABECERA `Referer` ⚠️
 * Sin `Referer`, MegaPlay responde la página de error incluso para ids
 * válidos ("Direct Access to Embed Links are Disabled"). Comprobado: el mismo
 * id devuelve `File 13461` con referer y `Error` sin él. Por eso:
 *   - el probe del servidor manda `Referer` explícitamente, y
 *   - el iframe del cliente depende de que la página NO suprima el referer
 *     (la `Referrer-Policy: origin-when-cross-origin` de middleware.ts vale).
 * No quites el referer "porque parece innecesario": rompe el proveedor entero.
 */

import { getOptionalApiKeys } from '@/lib/env';
import type { AnimeSource, AnimePlaybackContext, AnimeProvider } from '../types';

const BASE_URL = 'https://megaplay.buzz';
const FETCH_TIMEOUT_MS = 8_000;
/** Igual que el probe de Vimeus: 2 h, para que una caída se corrija pronto. */
const PROBE_REVALIDATE_S = 7_200;
const DEBUG = process.env.NODE_ENV === 'development';

/** Referer que enviamos en el probe. Debe ser un origen real nuestro. */
function referer(): string {
    const { appUrl } = getOptionalApiKeys();
    return appUrl || 'https://filmify.me';
}

export function buildMegaplayUrl(
    anilistId: number,
    episode: number,
    audio: 'sub' | 'dub',
): string {
    const ep = Number.isFinite(episode) && episode > 0 ? Math.floor(episode) : 1;
    return `${BASE_URL}/stream/ani/${anilistId}/${ep}/${audio}`;
}

/**
 * ¿Tiene MegaPlay este episodio?
 *
 * Discrimina por el `<title>` de la respuesta (ver cabecera). Fail-closed: si
 * la petición falla o el HTML no trae un título reconocible, devolvemos false
 * — preferimos ocultar un anime a ofrecer un reproductor que no carga.
 */
export async function probeMegaplay(
    anilistId: number,
    episode = 1,
    audio: 'sub' | 'dub' = 'sub',
): Promise<boolean> {
    if (!Number.isFinite(anilistId) || anilistId <= 0) return false;

    try {
        const res = await fetch(buildMegaplayUrl(anilistId, episode, audio), {
            headers: {
                // Imprescindible — ver la advertencia de la cabecera del módulo.
                Referer: referer(),
                'User-Agent': 'Mozilla/5.0 (compatible; FilmiFy/2.0)',
                Accept: 'text/html,application/xhtml+xml',
            },
            next: { revalidate: PROBE_REVALIDATE_S },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return false;

        const html = await res.text();
        // Página de error explícita.
        if (/<title>\s*Error\s*-\s*MegaPlay\s*<\/title>/i.test(html)) return false;
        // Página buena: el título lleva el id del fichero resuelto.
        return /<title>\s*File\s+\d+\s*-\s*MegaPlay\s*<\/title>/i.test(html);
    } catch (err) {
        if (DEBUG) console.warn(`[megaplay] probe falló para ${anilistId}:`, err);
        return false;
    }
}

export const megaplayProvider: AnimeProvider = {
    id: 'megaplay',
    label: 'MegaPlay',

    isEnabled: () => true,

    isAvailable: (ctx) => probeMegaplay(ctx.anilistId, ctx.episode),

    async getSources(ctx: AnimePlaybackContext): Promise<AnimeSource[]> {
        // Ofrecemos sub y dub como servidores distintos: el usuario elige.
        // El sub es el que trae subtítulos en español, así que va primero.
        return [
            {
                provider: 'megaplay',
                kind: 'iframe',
                label: 'MegaPlay · Sub español',
                url: buildMegaplayUrl(ctx.anilistId, ctx.episode, 'sub'),
                audio: 'sub',
                spanishSubs: true,
                priority: 90,
                verified: false, // lo marca el registro tras el probe
            },
            {
                provider: 'megaplay',
                kind: 'iframe',
                label: 'MegaPlay · Dub inglés',
                url: buildMegaplayUrl(ctx.anilistId, ctx.episode, 'dub'),
                audio: 'dub',
                spanishSubs: false,
                priority: 40,
                verified: false,
            },
        ];
    },
};

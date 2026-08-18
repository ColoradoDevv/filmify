/**
 * Registro de proveedores de anime.
 *
 * Punto único donde se decide QUÉ proveedores existen, en QUÉ orden se
 * ofrecen y CÓMO se comprueba la disponibilidad. La UI no conoce ningún
 * proveedor concreto: pide `getAnimePlayback()` y recibe una lista de fuentes
 * ya ordenada.
 *
 * ORDEN (criterio del producto: FilmiFy es es-ES, así que manda el español)
 * ------------------------------------------------------------------------
 *  100  Vimeus      · audio latino          — la mejor experiencia posible
 *   90  MegaPlay    · sub español (ES/LATAM) — verificado pista a pista
 *   80  anime1v     · fuentes hispanas       — solo si está desplegado
 *   60  AnimePlayer · sub                    — idioma sin confirmar
 *   40  MegaPlay    · dub inglés
 *   30  AnimePlayer · dub inglés
 *   20  VidLink     · sub                    — último recurso
 *
 * Se dejan fuera del registro por ahora:
 *  - AniXo: su `embed-sdk.js` exige cargar un script suyo en nuestras páginas
 *    para comprobar que no metemos el iframe en un sandbox, y el embed trae un
 *    script de CloudFront con pinta de pop-ads. Añadir un tercero con permiso
 *    de ejecución en filmify.me no compensa por un servidor más.
 */

import type {
    AnimePlayback,
    AnimePlaybackContext,
    AnimeProvider,
    AnimeSource,
} from './types';
import { vimeusProvider } from './providers/vimeus';
import { megaplayProvider, probeMegaplay } from './providers/megaplay';
import { animePlayerProvider } from './providers/animeplayer';
import { vidlinkProvider } from './providers/vidlink';
import { anime1vProvider } from './providers/anime1v';

/** Todos los proveedores conocidos; `isEnabled()` decide cuáles corren. */
const PROVIDERS: AnimeProvider[] = [
    vimeusProvider,
    megaplayProvider,
    anime1vProvider,
    animePlayerProvider,
    vidlinkProvider,
];

/** Concurrencia máxima al comprobar disponibilidad en lote. */
const BATCH_CONCURRENCY = 8;

/** Ejecuta `fn` sobre cada elemento con concurrencia acotada, conservando orden. */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let cursor = 0;
    async function worker() {
        while (cursor < items.length) {
            const idx = cursor++;
            out[idx] = await fn(items[idx]);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return out;
}

/**
 * Resuelve todas las fuentes reproducibles de un episodio.
 *
 * Consulta a los proveedores habilitados EN PARALELO y, en la misma ronda,
 * lanza su comprobación de disponibilidad. Los que responden `false` se
 * descartan; los que responden `null` (no se puede saber en servidor) se
 * ofrecen marcados como no verificados para que el reproductor pueda saltar
 * al siguiente si no arrancan.
 */
export async function getAnimePlayback(ctx: AnimePlaybackContext): Promise<AnimePlayback> {
    const enabled = PROVIDERS.filter((p) => {
        try {
            return p.isEnabled();
        } catch {
            return false;
        }
    });

    const perProvider = await Promise.all(
        enabled.map(async (provider) => {
            const [sources, available] = await Promise.all([
                provider.getSources(ctx).catch(() => [] as AnimeSource[]),
                provider.isAvailable(ctx).catch(() => null),
            ]);

            // Comprobado y ausente → fuera del listado.
            if (available === false) return [] as AnimeSource[];

            return sources.map((s) => ({ ...s, verified: available === true }));
        }),
    );

    const sources = perProvider
        .flat()
        .sort((a, b) => {
            // Primero lo verificado, luego por prioridad de producto.
            if (a.verified !== b.verified) return a.verified ? -1 : 1;
            return b.priority - a.priority;
        });

    return {
        sources,
        hasVerifiedSource: sources.some((s) => s.verified),
    };
}

/**
 * ¿Se puede ver este anime en FilmiFy? — comprobación BARATA para filtrar el
 * catálogo (rejillas de /anime, búsqueda…).
 *
 * Antes esta pregunta se respondía cruzando el título contra el listing de
 * anime de Vimeus, lo que exigía resolver un tmdb_id por heurística y
 * descartaba todo lo que Vimeus no tuviera. Ahora basta una sonda a MegaPlay
 * con el propio id de AniList: una sola petición, cacheada 2 h, sin puentes.
 * Vimeus se consulta solo como segunda opción, porque resolverlo es caro.
 */
export async function isAnimePlayable(
    anilistId: number,
    opts: { deep?: boolean } = {},
): Promise<boolean> {
    if (!Number.isFinite(anilistId) || anilistId <= 0) return false;

    // 1) MegaPlay: id nativo de AniList y sonda fiable en servidor.
    if (await probeMegaplay(anilistId, 1).catch(() => false)) return true;

    // 2) Vimeus: solo si nos piden profundidad — implica resolver el tmdb_id.
    if (opts.deep) {
        const available = await vimeusProvider
            .isAvailable({ anilistId, episode: 1 })
            .catch(() => false);
        if (available === true) return true;
    }

    return false;
}

/** Versión en lote de `isAnimePlayable`, con concurrencia acotada. */
export async function filterPlayableAnimeIds(
    anilistIds: number[],
    opts: { deep?: boolean } = {},
): Promise<Set<number>> {
    const flags = await mapPool(anilistIds, BATCH_CONCURRENCY, (id) =>
        isAnimePlayable(id, opts),
    );
    return new Set(anilistIds.filter((_, i) => flags[i]));
}

/**
 * Filtra una lista de tarjetas de AniList dejando solo las reproducibles.
 *
 * Sustituye a `filterPlayableAnimeCards` de anime-bridge.ts, que exigía que el
 * anime estuviera CONFIRMADO en el listing de anime de Vimeus. Aquello ataba
 * el catálogo entero al techo de Vimeus (y al acierto del matcheo por título):
 * un anime que Vimeus no tuviera desaparecía del sitio aunque fuese
 * perfectamente reproducible. Ahora basta con que CUALQUIER proveedor lo
 * tenga, y la comprobación se hace con el id de AniList directamente.
 *
 * Conserva el orden de entrada (la relevancia que da AniList).
 */
export async function filterPlayableAnimeCards<T extends { id: number }>(
    cards: T[],
    opts: { deep?: boolean } = {},
): Promise<T[]> {
    if (cards.length === 0) return cards;
    const playable = await filterPlayableAnimeIds(cards.map((c) => c.id), opts);
    return cards.filter((c) => playable.has(c.id));
}

/** Proveedores activos (para diagnóstico y para la UI de "servidores"). */
export function listEnabledProviders(): { id: string; label: string }[] {
    return PROVIDERS.filter((p) => {
        try {
            return p.isEnabled();
        } catch {
            return false;
        }
    }).map((p) => ({ id: p.id, label: p.label }));
}

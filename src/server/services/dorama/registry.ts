/**
 * Registro de proveedores de doramas.
 *
 * ORDEN (criterio de producto: FilmiFy es es-ES, manda el español)
 * ---------------------------------------------------------------
 *  100  Vimeus     · audio latino            — la mejor experiencia posible
 *   90  APIPlayer  · cuando trae sub español — 9 de cada 10 títulos suyos
 *   70  APIPlayer  · sin español detectado
 *   20  KissKH     · sub inglés              — apagado salvo DORAMA_ENABLE_KISSKH=1
 *
 * Cobertura medida sobre 22 doramas (KR/JP/CN/TH, modernos y antiguos):
 *   Vimeus 6/22 · APIPlayer 10/22 · juntos 11/22 · con KissKH ~18/22
 * El punto ciego común es el catálogo anterior a 2016.
 */

import type {
    DoramaPlayback,
    DoramaPlaybackContext,
    DoramaProvider,
    DoramaSource,
} from './types';
import { getSeriesIdSet } from '@/server/services/vimeus';
import { vimeusDoramaProvider } from './providers/vimeus';
import { apiPlayerProvider, probeApiPlayer } from './providers/apiplayer';
import { kisskhProvider } from './providers/kisskh';

const PROVIDERS: DoramaProvider[] = [
    vimeusDoramaProvider,
    apiPlayerProvider,
    kisskhProvider,
];

/** Concurrencia máxima al comprobar disponibilidad en lote. */
const BATCH_CONCURRENCY = 8;

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

function enabledProviders(): DoramaProvider[] {
    return PROVIDERS.filter((p) => {
        try {
            return p.isEnabled();
        } catch {
            return false;
        }
    });
}

/**
 * Resuelve todas las fuentes reproducibles de un episodio.
 *
 * Los proveedores se consultan en paralelo. Los que responden `false` a la
 * comprobación se descartan; los que responden `null` (no se puede saber) se
 * ofrecen sin verificar, para que el reproductor pueda intentarlo y saltar al
 * siguiente si no arranca.
 */
export async function getDoramaPlayback(ctx: DoramaPlaybackContext): Promise<DoramaPlayback> {
    const perProvider = await Promise.all(
        enabledProviders().map(async (provider) => {
            const [sources, available] = await Promise.all([
                provider.getSources(ctx).catch(() => [] as DoramaSource[]),
                provider.isAvailable(ctx).catch(() => null),
            ]);
            if (available === false) return [] as DoramaSource[];
            return sources.map((s) => ({ ...s, verified: available === true }));
        }),
    );

    const sources = perProvider.flat().sort((a, b) => {
        if (a.verified !== b.verified) return a.verified ? -1 : 1;
        return b.priority - a.priority;
    });

    return {
        sources,
        hasVerifiedSource: sources.some((s) => s.verified),
        subtitleLanguages: [...new Set(sources.flatMap((s) => s.subtitleLanguages))],
    };
}

/**
 * ¿Se puede ver este dorama? — comprobación barata para filtrar el catálogo.
 *
 * Consulta las DOS sondas baratas en paralelo, y a propósito son las mismas
 * señales que usa la ficha de /tv/[id] para decidir si existe:
 *
 *   · APIPlayer en modo `catalog` (3 s en vez de 20). Su latencia es bimodal
 *     (~0,5 s si lo tiene, ~15 s si no), así que ese corte discrimina bien.
 *   · Vimeus, el mismo `probeEmbed` que filtra /browse, pero solo si el título
 *     aparece en su listing (~1100 series, memoizado): así no descargamos el
 *     HTML del embed de los cientos de doramas que Vimeus ni siquiera lista.
 *
 * DEGRADA CERRADO, al revés que el módulo de anime, y esto es deliberado: la
 * ficha de /tv/[id] hace `notFound()` cuando ningún proveedor tiene el título,
 * así que un catálogo optimista no llena la sección de contenido — la llena de
 * enlaces a 404. Si un proveedor no puede pronunciarse, el otro manda; si
 * ninguno confirma, el título no se muestra. Mejor un catálogo más corto que
 * uno que se rompe al hacer clic.
 */
export async function isDoramaPlayable(
    tmdbId: number,
    // Reservado: hoy las dos sondas ya se consultan siempre.
    _opts: { deep?: boolean } = {},
): Promise<boolean> {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return false;

    const [api, viaVimeus] = await Promise.all([
        probeApiPlayer(tmdbId, 1, 1, { mode: 'catalog' }).catch(() => ({
            available: null as boolean | null,
            subtitleLanguages: [] as string[],
        })),
        isListedOnVimeus(tmdbId).then((listed) =>
            listed
                ? vimeusDoramaProvider.isAvailable({ tmdbId, season: 1, episode: 1 }).catch(() => null)
                : false,
        ),
    ]);

    return api.available === true || viaVimeus === true;
}

/**
 * ¿Vimeus tiene este tmdb_id en su listing de series?
 *
 * Pre-filtro barato: un `false` aquí ahorra la descarga del embed. Si el
 * listing no está disponible (sin API key, fallo de red) devolvemos `true`
 * para no descartar nada por un problema nuestro — que decida la sonda.
 */
async function isListedOnVimeus(tmdbId: number): Promise<boolean> {
    const set = await getSeriesIdSet().catch(() => null);
    if (!set || set.size === 0) return true;
    return set.has(tmdbId);
}

/** Filtra una lista de series dejando solo las reproducibles. Conserva el orden. */
export async function filterPlayableDoramas<T extends { id: number }>(
    items: T[],
    opts: { deep?: boolean } = {},
): Promise<T[]> {
    if (items.length === 0) return items;
    const flags = await mapPool(items, BATCH_CONCURRENCY, (i) => isDoramaPlayable(i.id, opts));
    return items.filter((_, idx) => flags[idx]);
}

/**
 * Alias de `getDoramaPlayback` para las series en general.
 *
 * El registro no tiene nada específico de doramas: trabaja con tmdb_id,
 * temporada y episodio, así que sirve igual para una serie occidental. Se
 * expone con este nombre para que la ficha de /tv no tenga que importar algo
 * llamado "dorama" cuando está pintando Breaking Bad. KissKH sí es específico
 * de contenido asiático, pero ya se autodescarta al no encontrar el título.
 */
export const getSeriesPlayback = getDoramaPlayback;

/** Proveedores activos (diagnóstico y UI de servidores). */
export function listEnabledDoramaProviders(): { id: string; label: string }[] {
    return enabledProviders().map((p) => ({ id: p.id, label: p.label }));
}

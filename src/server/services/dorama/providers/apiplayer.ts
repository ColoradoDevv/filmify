/**
 * Proveedor APIPlayer (apiplayer.ru) — el hallazgo del estudio de doramas.
 *
 * Por qué es el proveedor de referencia del módulo:
 *
 *  1. **Se indexa por tmdb_id**, igual que nuestro catálogo:
 *       https://apiplayer.ru/embed/tv/{tmdbId}/{temporada}/{episodio}
 *     Cero puentes de identidad, a diferencia del módulo de anime.
 *
 *  2. **Cobertura complementaria a Vimeus.** Medido sobre 22 doramas
 *     (coreanos, japoneses, chinos y tailandeses): Vimeus 6/22, APIPlayer
 *     10/22, y juntos 11/22 — casi el doble. APIPlayer cubre huecos concretos
 *     de Vimeus: Goblin, Itaewon Class, The Untamed, Yanxi Palace y Girl from
 *     Nowhere.
 *
 *  3. **Subtítulos en español en 9 de sus 10 títulos disponibles**, y no de
 *     refilón: Squid Game llega con 82 pistas, Queen of Tears con 84.
 *     Combina subtítulos propios (`(Server)`) con OpenSubtitles vía Stremio
 *     (`[OpenSubs]`).
 *
 *  4. **Se puede comprobar la disponibilidad desde el servidor.** Su
 *     reproductor resuelve las fuentes contra un endpoint interno que responde
 *     JSON y que es consultable directamente, sin navegador ni clave:
 *
 *       GET /manifest.php?path=<ruta del embed url-encoded>&server=s1&vid=<id>
 *         disponible  → 200 {"success":true,"sources":[…],"tracks":[…]}
 *         no está     → 404 {"success":false,"error":"No media streams found…"}
 *
 *     `tracks[]` trae las etiquetas de subtítulo, así que la misma petición
 *     nos dice si existe y en qué idiomas está.
 *
 * Nota: el vídeo real lo sirve `player.videasy.to` — APIPlayer es una capa
 * sobre Videasy. Si algún día su reskin desaparece, la fuente original sigue
 * ahí.
 */

import type { DoramaPlaybackContext, DoramaProvider, DoramaSource } from '../types';

const BASE_URL = 'https://apiplayer.ru';
/** Igual que las sondas de anime: 2 h, para que una caída se corrija pronto. */
const PROBE_REVALIDATE_S = 7_200;
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * LATENCIA BIMODAL — de aquí salen los dos timeouts.
 *
 * Medido contra el endpoint real:
 *   - título disponible  → ~0,5 s (lo tienen resuelto y cacheado)
 *   - título NO disponible → ~14-15 s (lo buscan a demanda antes de rendirse)
 *
 * No hay caso intermedio, y esa separación es explotable:
 *
 *  · Al resolver la reproducción de UNA ficha queremos la respuesta correcta
 *    aunque tarde, así que esperamos por encima del peor caso.
 *  · Al filtrar el catálogo (decenas de títulos) no podemos pagar 15 s por
 *    fallo. Con 3 s el veredicto es claro: si no ha contestado, casi con
 *    seguridad no lo tiene. Es una heurística, pero apoyada en la medición,
 *    no en una corazonada.
 */
const PLAYBACK_TIMEOUT_MS = 20_000;
const CATALOG_TIMEOUT_MS = 3_000;

/**
 * CORTACIRCUITOS — cuando el proveedor nos pide verificación (Turnstile) o nos
 * limita, lo hace para TODAS las peticiones, no para un título concreto.
 *
 * Sin esto, filtrar el catálogo lanza cientos de peticiones que ya sabemos que
 * van a fallar: medido, 20 sondas en paralelo tardan ~5,7 s incluso cuando
 * responden 403. Al primer bloqueo dejamos de llamar durante unos minutos y
 * después una sonda vuelve a probar (medio abierto), así que la recuperación
 * es automática.
 */
const BLOCK_COOLDOWN_MS = 5 * 60 * 1000;
let blockedUntil = 0;

export function buildApiPlayerUrl(tmdbId: number, season: number, episode: number): string {
    const s = Number.isFinite(season) && season > 0 ? Math.floor(season) : 1;
    const e = Number.isFinite(episode) && episode > 0 ? Math.floor(episode) : 1;
    return `${BASE_URL}/embed/tv/${tmdbId}/${s}/${e}`;
}

interface ManifestTrack {
    label?: string;
    lang?: string;
    kind?: string;
}

interface ManifestResponse {
    success?: boolean;
    error?: string;
    /** Código de error del proveedor, p. ej. `turnstile_required`. */
    code?: string;
    sources?: Array<{ file?: string; type?: string }>;
    tracks?: ManifestTrack[];
}

export interface ApiPlayerProbe {
    /** true disponible, false no lo tiene, null no se pudo determinar. */
    available: boolean | null;
    /** Etiquetas de subtítulo tal y como las nombra el proveedor. */
    subtitleLanguages: string[];
    /**
     * El proveedor nos está negando el acceso (desafío de verificación, límite
     * de peticiones). No es "no lo sé" sobre ESTE título: es que ahora mismo no
     * nos sirve NINGUNO, así que tampoco tiene sentido ofrecer su embed.
     */
    blocked?: boolean;
}

/** ¿Alguna etiqueta corresponde a español? Cubre las formas que usa el proveedor. */
export function hasSpanish(labels: string[]): boolean {
    return labels.some((l) => /spanish|espa[nñ]ol|castellano|latino/i.test(l));
}

/**
 * Consulta el manifiesto del episodio: disponibilidad + idiomas en una sola
 * petición.
 *
 * Tri-estado deliberado, igual que la sonda de MegaPlay en anime: un fallo de
 * red no debe interpretarse como "no existe", porque entonces una caída del
 * proveedor vaciaría el catálogo entero.
 */
export async function probeApiPlayer(
    tmdbId: number,
    season = 1,
    episode = 1,
    opts: { mode?: 'playback' | 'catalog' } = {},
): Promise<ApiPlayerProbe> {
    const mode = opts.mode ?? 'playback';
    const timeoutMs = mode === 'catalog' ? CATALOG_TIMEOUT_MS : PLAYBACK_TIMEOUT_MS;
    const empty: ApiPlayerProbe = { available: null, subtitleLanguages: [] };
    const blocked: ApiPlayerProbe = { available: null, subtitleLanguages: [], blocked: true };
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
        return { available: false, subtitleLanguages: [] };
    }

    // Cortacircuitos abierto: no gastamos una petición que sabemos negada.
    if (Date.now() < blockedUntil) return blocked;

    const embedPath = `/embed/tv/${tmdbId}/${Math.max(1, Math.floor(season))}/${Math.max(1, Math.floor(episode))}`;
    const url =
        `${BASE_URL}/manifest.php?path=${encodeURIComponent(embedPath)}` +
        `&server=s1&vid=v_${tmdbId}${season}${episode}`;

    try {
        const res = await fetch(url, {
            headers: {
                // El manifiesto se sirve al reproductor: mandamos su propio
                // embed como referer, que es lo que espera ver.
                Referer: `${BASE_URL}${embedPath}`,
                'User-Agent': 'Mozilla/5.0 (compatible; FilmiFy/2.0)',
                Accept: 'application/json',
            },
            next: { revalidate: PROBE_REVALIDATE_S },
            signal: AbortSignal.timeout(timeoutMs),
        });

        // 5xx: problema suyo, no una respuesta sobre el contenido.
        if (res.status >= 500) return empty;

        // 401/403/429: nos está pidiendo verificación (Turnstile) o limitando
        // el ritmo. Es una respuesta sobre NOSOTROS, no sobre el título: leerla
        // como "no lo tiene" borraría el proveedor entero del catálogo.
        if (res.status === 401 || res.status === 403 || res.status === 429) {
            if (DEBUG) console.warn(`[apiplayer] acceso denegado (HTTP ${res.status}) para ${tmdbId}`);
            blockedUntil = Date.now() + BLOCK_COOLDOWN_MS;
            return blocked;
        }

        const json = (await res.json().catch(() => null)) as ManifestResponse | null;
        if (!json) return empty;

        // Mismo caso que el 403, pero servido con 200: es un desafío, no un
        // veredicto sobre el contenido.
        if (json.code === 'turnstile_required' || /verification required/i.test(json.error ?? '')) {
            if (DEBUG) console.warn(`[apiplayer] verificación requerida para ${tmdbId}`);
            blockedUntil = Date.now() + BLOCK_COOLDOWN_MS;
            return blocked;
        }

        // Nos responde con normalidad: si veníamos de un bloqueo, se acabó.
        blockedUntil = 0;

        if (json.success !== true) {
            // Respuesta explícita: no tienen el episodio.
            return { available: false, subtitleLanguages: [] };
        }

        const labels = (json.tracks ?? [])
            .map((t) => (t.label ?? '').trim())
            .filter((l) => l && l.toLowerCase() !== 'auto');

        return {
            available: Array.isArray(json.sources) && json.sources.length > 0,
            subtitleLanguages: [...new Set(labels)],
        };
    } catch (err) {
        // En modo catálogo, agotar 3 s es la señal de que NO lo tienen (ver la
        // nota sobre latencia bimodal). En modo reproducción, un fallo tras
        // 20 s sí es genuinamente "no lo sé": puede ser red, no ausencia.
        if (mode === 'catalog') {
            return { available: false, subtitleLanguages: [] };
        }
        if (DEBUG) console.warn(`[apiplayer] sonda falló para ${tmdbId}:`, err);
        return empty;
    }
}

export const apiPlayerProvider: DoramaProvider = {
    id: 'apiplayer',
    label: 'APIPlayer',

    isEnabled: () => true,

    async isAvailable(ctx) {
        return (await probeApiPlayer(ctx.tmdbId, ctx.season, ctx.episode)).available;
    },

    async getSources(ctx: DoramaPlaybackContext): Promise<DoramaSource[]> {
        // La misma sonda nos da los idiomas, así que la reutilizamos para
        // etiquetar la fuente en vez de lanzar una segunda petición.
        const probe = await probeApiPlayer(ctx.tmdbId, ctx.season, ctx.episode)
            .catch(() => ({ available: null, subtitleLanguages: [] as string[] }));

        if (probe.available === false) return [];
        // Nos está pidiendo verificación: su embed tampoco va a cargar, y
        // ofrecerlo convertiría cualquier ficha en un reproductor muerto.
        if ('blocked' in probe && probe.blocked) return [];

        const spanish = hasSpanish(probe.subtitleLanguages);
        return [
            {
                provider: 'apiplayer',
                kind: 'iframe',
                label: spanish ? 'APIPlayer · Sub español' : 'APIPlayer',
                url: buildApiPlayerUrl(ctx.tmdbId, ctx.season, ctx.episode),
                audio: 'sub',
                subtitleLanguages: probe.subtitleLanguages,
                spanishSubs: spanish,
                // Por debajo de Vimeus (audio latino), por encima de KissKH.
                priority: spanish ? 90 : 70,
                verified: false, // lo marca el registro
            },
        ];
    },
};

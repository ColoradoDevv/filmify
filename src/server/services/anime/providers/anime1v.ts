/**
 * Proveedor anime1v — agregador self-hosted de fuentes HISPANAS.
 *
 * DESACTIVADO POR DEFECTO. Se activa poniendo `ANIME1V_API_URL` (y casi
 * seguro `ANIME1V_API_KEY`) en el entorno.
 *
 * Qué es
 * ------
 * `anime1v-api` (github.com/FxxMorgan/anime1v-api, MIT) es un servicio Node
 * que se despliega en NUESTRA infraestructura — el mismo EC2 que sirve
 * FilmiFy, bajo PM2 — y que hace scraping de AnimeAV1, AnimeFLV, TioAnime,
 * JKAnime y MonosChinos. NO existe instancia pública: `ANIME1V_API_URL`
 * apunta a nuestro propio proceso (por defecto escucha en el puerto 3001,
 * así que en el EC2 sería algo como `http://127.0.0.1:3001`).
 *
 * No aloja vídeo: devuelve la URL directa del `.m3u8`, que reproducimos con
 * hls.js a través de `/api/stream` — sin el reproductor ni la publicidad de
 * un tercero. Es la única fuente del registro con contenido nativo en
 * español (sub y doblaje latino).
 *
 * Coste: un proceso más que mantener (Node 18+, Puppeteer para los sitios
 * protegidos), se rompe cuando un sitio origen cambia su HTML, y la IP del
 * servidor puede acabar bloqueada por los orígenes. Además NO indexa por
 * AniList id: hay que buscar por título, así que reintroduce un puente
 * heurístico. Por eso va con prioridad por debajo de Vimeus.
 *
 * Flujo de su API (4 saltos, todos autenticados con X-API-Key)
 * ------------------------------------------------------------
 *   1. GET /api/v1/anime/search?q=<título>        → [{ slug, url, provider }]
 *   2. GET /api/v1/anime/info?url=<url del anime> → { episodes: [...] }
 *   3. GET /api/v1/anime/episode?url=<url del ep> → servidores + urls de embed
 *   4. GET /api/v1/anime/resolve?urls=<json[]>    → { success, mediaType, streamUrl }
 *
 * Son 4 peticiones por reproducción, pero van contra localhost, así que el
 * coste real es despreciable frente a salir a internet.
 *
 * ⚠️ Las formas concretas de `episodes[]` y de la respuesta de `/episode` no
 * están documentadas campo a campo en el README y NO se han podido verificar
 * contra una instancia real (no hay ninguna desplegada todavía). El parseo es
 * deliberadamente defensivo: ante cualquier forma inesperada devolvemos [] y
 * el registro sigue con el resto de proveedores. Al levantar el servicio,
 * comprueba estos cuatro endpoints y ajusta los parsers si difieren.
 */

import type { AnimeSource, AnimePlaybackContext, AnimeProvider } from '../types';

const FETCH_TIMEOUT_MS = 12_000;
const RESULT_REVALIDATE_S = 1_800; // 30 min
const DEBUG = process.env.NODE_ENV === 'development';

/** Base de la instancia self-hosted, sin barra final. */
function baseUrl(): string {
    return (process.env.ANIME1V_API_URL ?? '').replace(/\/+$/, '');
}

function apiKey(): string {
    return process.env.ANIME1V_API_KEY ?? '';
}

// ── Formas esperadas (defensivas) ────────────────────────────────────────────

interface SearchHit {
    title?: string;
    slug?: string;
    url?: string;
    image?: string;
    provider?: string;
    year?: number;
}

interface EpisodeRef {
    number?: number;
    episode?: number;
    url?: string;
}

interface ServerRef {
    url?: string;
    embed?: string;
    server?: string;
    name?: string;
    lang?: string;
    variant?: string;
}

interface ResolveResult {
    success?: boolean;
    server?: string;
    mediaType?: string;
    streamUrl?: string;
}

async function apiGet<T>(path: string): Promise<T | null> {
    const base = baseUrl();
    if (!base) return null;
    const key = apiKey();
    try {
        const res = await fetch(`${base}${path}`, {
            headers: {
                Accept: 'application/json',
                // Todos los endpoints excepto /image-proxy exigen la clave.
                ...(key ? { 'X-API-Key': key } : {}),
            },
            next: { revalidate: RESULT_REVALIDATE_S },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
            if (DEBUG) console.warn(`[anime1v] HTTP ${res.status} en ${path}`);
            return null;
        }
        return (await res.json()) as T;
    } catch (err) {
        if (DEBUG) console.error(`[anime1v] fallo en ${path}:`, err);
        return null;
    }
}

/** Saca el array útil de una respuesta que puede venir suelta o envuelta. */
function unwrapArray<T>(raw: unknown, keys: string[]): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        for (const k of keys) {
            if (Array.isArray(obj[k])) return obj[k] as T[];
        }
    }
    return [];
}

/** Normaliza títulos para comparar (misma idea que en anime-bridge). */
function norm(t: string): string {
    return t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/** Elige el mejor resultado de búsqueda por parecido de título y año. */
function pickBestMatch(hits: SearchHit[], ctx: AnimePlaybackContext): SearchHit | null {
    const wanted = [ctx.titles?.english, ctx.titles?.romaji]
        .filter(Boolean)
        .map((t) => norm(t as string));
    if (wanted.length === 0 || hits.length === 0) return null;

    let best: { hit: SearchHit; score: number } | null = null;
    for (const hit of hits) {
        if (!hit.title || !hit.url) continue;
        const name = norm(hit.title);
        let score = 0;
        if (wanted.includes(name)) score += 100;
        else if (wanted.some((w) => name.startsWith(w) || w.startsWith(name))) score += 60;
        else if (wanted.some((w) => name.includes(w) || w.includes(name))) score += 30;
        else continue;

        if (ctx.year && hit.year) {
            const diff = Math.abs(hit.year - ctx.year);
            if (diff === 0) score += 20;
            else if (diff === 1) score += 8;
            else if (diff > 3) score -= 10;
        }
        if (!best || score > best.score) best = { hit, score };
    }
    // Umbral alto: con fuentes que no indexan por id, un match flojo es peor
    // que no ofrecer nada (reproduciría OTRA serie).
    return best && best.score >= 60 ? best.hit : null;
}

/** Localiza la URL del episodio pedido dentro de la ficha del anime. */
function findEpisodeUrl(raw: unknown, episode: number): string | null {
    const eps = unwrapArray<EpisodeRef>(raw, ['episodes', 'data', 'results']);
    for (const ep of eps) {
        const n = typeof ep.number === 'number' ? ep.number : ep.episode;
        if (n === episode && typeof ep.url === 'string') return ep.url;
    }
    return null;
}

export const anime1vProvider: AnimeProvider = {
    id: 'anime1v',
    label: 'anime1v (hispano)',

    isEnabled: () => Boolean(baseUrl()),

    // La disponibilidad real solo se sabe recorriendo los 4 saltos;
    // getSources ya devuelve [] cuando no hay nada.
    isAvailable: async () => null,

    async getSources(ctx: AnimePlaybackContext): Promise<AnimeSource[]> {
        if (!baseUrl()) return [];

        const query = ctx.titles?.english || ctx.titles?.romaji;
        if (!query) return [];

        // 1) Buscar el anime por título.
        const searchRaw = await apiGet<unknown>(
            `/api/v1/anime/search?q=${encodeURIComponent(query)}`,
        );
        const match = pickBestMatch(
            unwrapArray<SearchHit>(searchRaw, ['results', 'data']),
            ctx,
        );
        if (!match?.url) return [];

        // 2) Ficha del anime → lista de episodios.
        const infoRaw = await apiGet<unknown>(
            `/api/v1/anime/info?url=${encodeURIComponent(match.url)}`,
        );
        const episodeUrl = findEpisodeUrl(infoRaw, ctx.episode);
        if (!episodeUrl) return [];

        // 3) Episodio → servidores con sus urls de embed.
        const epRaw = await apiGet<unknown>(
            `/api/v1/anime/episode?url=${encodeURIComponent(episodeUrl)}`,
        );
        const servers = unwrapArray<ServerRef>(epRaw, ['servers', 'results', 'data']);
        const embedUrls = servers
            .map((s) => s.url || s.embed)
            .filter((u): u is string => typeof u === 'string' && u.length > 0)
            .slice(0, 6);
        if (embedUrls.length === 0) return [];

        // 4) Resolver en paralelo — devuelve el primero que responde.
        const resolved = await apiGet<ResolveResult>(
            `/api/v1/anime/resolve?urls=${encodeURIComponent(JSON.stringify(embedUrls))}`,
        );

        // Solo HLS: nuestro reproductor usa hls.js. Un mp4 suelto necesitaría
        // otra rama en AnimePlayer, así que no lo ofrecemos como si funcionara.
        if (
            !resolved?.success ||
            resolved.mediaType !== 'hls' ||
            typeof resolved.streamUrl !== 'string'
        ) {
            return [];
        }

        // La URL final la valida el SSRF guard de /api/stream antes de que el
        // servidor haga cualquier petición saliente.
        return [
            {
                provider: 'anime1v',
                kind: 'hls',
                label: `anime1v · ${resolved.server || match.provider || 'hispano'}`,
                url: resolved.streamUrl,
                audio: 'sub',
                spanishSubs: true, // fuentes hispanas por definición
                priority: 80,      // por debajo de Vimeus, por encima del resto
                verified: false,
            },
        ];
    },
};

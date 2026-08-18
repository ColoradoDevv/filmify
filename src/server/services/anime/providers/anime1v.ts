/**
 * Proveedor anime1v — agregador self-hosted de fuentes HISPANAS.
 *
 * DESACTIVADO POR DEFECTO. Se activa poniendo `ANIME1V_API_URL` en el entorno.
 *
 * Qué es
 * ------
 * `anime1v-api` (github.com/FxxMorgan/anime1v-api, MIT) es un servicio Node
 * que se despliega en NUESTRA infraestructura — el mismo EC2 que sirve
 * FilmiFy, bajo PM2 — y que hace scraping de AnimeAV1, AnimeFLV, TioAnime,
 * JKAnime y MonosChinos. No aloja vídeo: devuelve la URL directa del `.m3u8`
 * (o del servidor de descarga) y nosotros lo reproducimos con hls.js a través
 * de `/api/stream`, igual que la sección de TV en vivo.
 *
 * Por qué interesa
 * ----------------
 * Es la única fuente del registro con contenido nativo en español (sub y
 * doblaje latino) y, al devolver HLS crudo, permite reproducir SIN el
 * reproductor ni la publicidad de un tercero.
 *
 * Por qué está apagado
 * --------------------
 *  - Requiere levantar y mantener un proceso más (Node 18+, Puppeteer para
 *    los sitios protegidos, ffmpeg opcional). Se rompe cuando un sitio origen
 *    cambia su HTML.
 *  - La IP del servidor puede acabar bloqueada por los orígenes.
 *  - NO indexa por AniList id: hay que buscar por título, así que reintroduce
 *    un puente heurístico como el que este módulo acaba de quitarse de encima.
 *    Por eso va con prioridad baja y solo como complemento.
 *
 * ⚠️ Las formas de respuesta de abajo son las documentadas en el README del
 * proyecto y NO se han podido verificar contra una instancia real (no hay
 * ninguna desplegada todavía). Al levantarlo, comprueba `/search` y
 * `/resolve` y ajusta `pickBestMatch` / `parseResolve` si difieren. Todo el
 * parseo es defensivo: ante cualquier forma inesperada devolvemos [] y el
 * registro sigue con el resto de proveedores.
 */

import type { AnimeSource, AnimePlaybackContext, AnimeProvider } from '../types';

const FETCH_TIMEOUT_MS = 12_000;
const RESULT_REVALIDATE_S = 1_800; // 30 min
const DEBUG = process.env.NODE_ENV === 'development';

/** Base de la instancia self-hosted, sin barra final. */
function baseUrl(): string {
    return (process.env.ANIME1V_API_URL ?? '').replace(/\/+$/, '');
}

// ── Formas esperadas (defensivas) ────────────────────────────────────────────

interface SearchHit {
    id?: string;
    slug?: string;
    title?: string;
    provider?: string;
    year?: number;
    type?: string;
}

interface ResolvedStream {
    url?: string;
    file?: string;
    server?: string;
    quality?: string;
    language?: string;
}

async function apiGet<T>(path: string): Promise<T | null> {
    const base = baseUrl();
    if (!base) return null;
    try {
        const res = await fetch(`${base}${path}`, {
            headers: { Accept: 'application/json' },
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
        if (!hit.title) continue;
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
    return best && best.score >= 60 ? best.hit : null;
}

function parseResolve(raw: unknown): ResolvedStream[] {
    if (Array.isArray(raw)) return raw as ResolvedStream[];
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        for (const key of ['streams', 'sources', 'results', 'data']) {
            if (Array.isArray(obj[key])) return obj[key] as ResolvedStream[];
        }
        if (typeof obj.url === 'string' || typeof obj.file === 'string') {
            return [obj as ResolvedStream];
        }
    }
    return [];
}

export const anime1vProvider: AnimeProvider = {
    id: 'anime1v',
    label: 'anime1v (hispano)',

    isEnabled: () => Boolean(baseUrl()),

    // La disponibilidad real solo se sabe resolviendo; getSources ya devuelve
    // [] cuando no hay nada, así que no gastamos una ronda extra aquí.
    isAvailable: async () => null,

    async getSources(ctx: AnimePlaybackContext): Promise<AnimeSource[]> {
        if (!baseUrl()) return [];

        const query = ctx.titles?.english || ctx.titles?.romaji;
        if (!query) return [];

        const search = await apiGet<{ results?: SearchHit[] } | SearchHit[]>(
            `/search?q=${encodeURIComponent(query)}`,
        );
        const hits = Array.isArray(search) ? search : search?.results ?? [];
        const match = pickBestMatch(hits, ctx);
        if (!match) return [];

        const animeKey = match.slug || match.id;
        if (!animeKey) return [];

        const resolved = await apiGet<unknown>(
            `/resolve?anime=${encodeURIComponent(animeKey)}&episode=${ctx.episode}` +
                (match.provider ? `&provider=${encodeURIComponent(match.provider)}` : ''),
        );

        const streams = parseResolve(resolved)
            // Solo HLS: los servidores de descarga (Mega, StreamTape…) no se
            // pueden reproducir en línea sin más plumbing.
            .filter((s) => {
                const u = s.url || s.file || '';
                return typeof u === 'string' && u.includes('.m3u8');
            });

        // La URL final la valida el SSRF guard de /api/stream antes de que el
        // servidor haga cualquier petición saliente.
        return streams.slice(0, 3).map((s, i) => ({
            provider: 'anime1v' as const,
            kind: 'hls' as const,
            label: `anime1v · ${s.server || s.language || `Servidor ${i + 1}`}`,
            url: (s.url || s.file) as string,
            audio: 'sub' as const,
            spanishSubs: true, // fuentes hispanas por definición
            priority: 80 - i,  // por debajo de Vimeus, por encima del resto
            verified: false,
        }));
    },
};

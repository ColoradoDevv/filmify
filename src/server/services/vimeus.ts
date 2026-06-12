/**
 * Vimeus availability service — official Listing API.
 *
 * Strategy:
 *  1. Build Sets of available tmdb_ids from paginated listings.
 *  2. Each page fetch is cached in the Next.js Data Cache (1h).
 *  3. Assembled Sets are memoized in‑process (10 min) → O(1) lookups.
 *  4. Fallback (movies only): probe the embed endpoint.
 *  5. Transient errors fail OPEN (catalog never blanks).
 */

const API_KEY = process.env.VIMEUS_API_KEY ?? '';
const VIEW_KEY = process.env.NEXT_PUBLIC_VIMEUS_VIEW_KEY ?? '';
const BASE_URL = 'https://vimeus.com';

const PAGE_REVALIDATE_S = 3_600;       // Next Data Cache TTL per page
const FETCH_TIMEOUT_MS = 8_000;
const MAX_PAGES = 200;                 // safety bound al recorrer el catálogo
const MAX_PROBE_CONCURRENCY = 16;      // workers for embed probes (acelera cold start)
const MAX_EPISODE_PAGES = 10;

const DEBUG = process.env.NODE_ENV === 'development';

// ── Types ─────────────────────────────────────────────────────────────────────

// Campos reales devueltos por la API (data.result[]). Las imágenes son rutas
// relativas de TMDB → prefijar con https://image.tmdb.org/t/p/<size>.
export interface VimeusMovie {
    tmdb_id: number;
    imdb_id: string | null;
    title: string;
    poster: string | null;
    backdrop: string | null;
    quality?: string;
    embed_url?: string;
    download_url?: string;
}

export interface VimeusSeries {
    tmdb_id: number;
    imdb_id: string | null;
    title: string;
    poster: string | null;
    backdrop: string | null;
    quality?: string;
    embed_url?: string;
    download_url?: string;
}

// En episodes, season y episode llegan como STRING ("1").
export interface VimeusEpisode {
    tmdb_id: number;
    imdb_id: string | null;
    show_title?: string;
    parent_type?: string;
    poster: string | null;
    backdrop: string | null;
    season: string | number;
    episode: string | number;
}

/**
 * Forma REAL de la respuesta del listing (verificada contra la API en vivo):
 *   { error, message, data: { result: Item[], pages: <total de páginas> } }
 * Nota: los items NO traen `synced_at`; `pages` es un entero (no un objeto).
 */
interface ListingData<I> {
    result: I[];
    pages: number;
}

interface ListingEnvelope<I> {
    error: boolean;
    message: string;
    data: ListingData<I> | null;
}

/** Resultado normalizado de una página del listing. */
interface ListingPage<I> {
    items: I[];
    pages: number;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchListing<I>(path: string): Promise<ListingPage<I> | null> {
    if (!API_KEY) return null;
    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            headers: { 'X-API-Key': API_KEY, Accept: 'application/json' },
            next: { revalidate: PAGE_REVALIDATE_S },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
            if (DEBUG) console.warn(`[Vimeus] HTTP ${res.status} for ${path}`);
            return null;
        }
        const json = (await res.json()) as ListingEnvelope<I>;
        if (json.error || !json.data) {
            if (DEBUG) console.warn(`[Vimeus] API error: ${json.message}`);
            return null;
        }
        const items = Array.isArray(json.data.result) ? json.data.result : [];
        const pages = typeof json.data.pages === 'number' && json.data.pages > 0
            ? json.data.pages
            : 1;
        return { items, pages };
    } catch (err) {
        if (DEBUG) console.error(`[Vimeus] Fetch error for ${path}:`, err);
        return null;
    }
}

const fetchMoviesPage = (page: number) =>
    fetchListing<VimeusMovie>(`/api/listing/movies?page=${page}`);

const fetchSeriesPage = (page: number) =>
    fetchListing<VimeusSeries>(`/api/listing/series?page=${page}`);

const fetchEpisodesPage = (tmdbId: number, page: number) =>
    fetchListing<VimeusEpisode>(
        `/api/listing/episodes?tmdb_id=${tmdbId}&page=${page}`,
    );

// ── Recently added movies ────────────────────────────────────────────────────

export async function getRecentlyAddedMovies(limit = 20): Promise<VimeusMovie[]> {
    if (!API_KEY) return [];
    const data = await fetchMoviesPage(1);
    return (data?.items ?? []).slice(0, limit);
}

// ── Catálogo (para sitemap) ──────────────────────────────────────────────────
// Recorre el listing por páginas (100 items/página) hasta `limit`. Las páginas
// están cacheadas 1h en el Data Cache, así que recorrer varias es barato.

export async function getVimeusMovieCatalog(limit = 500): Promise<VimeusMovie[]> {
    if (!API_KEY) return [];
    const items: VimeusMovie[] = [];
    const first = await fetchMoviesPage(1);
    if (!first) return [];
    items.push(...first.items);
    const totalPages = Math.min(first.pages, MAX_PAGES);
    for (let page = 2; page <= totalPages && items.length < limit; page++) {
        const data = await fetchMoviesPage(page);
        if (!data) break;
        items.push(...data.items);
    }
    return items.slice(0, limit);
}

export async function getVimeusSeriesCatalog(limit = 300): Promise<VimeusSeries[]> {
    if (!API_KEY) return [];
    const items: VimeusSeries[] = [];
    const first = await fetchSeriesPage(1);
    if (!first) return [];
    items.push(...first.items);
    const totalPages = Math.min(first.pages, MAX_PAGES);
    for (let page = 2; page <= totalPages && items.length < limit; page++) {
        const data = await fetchSeriesPage(page);
        if (!data) break;
        items.push(...data.items);
    }
    return items.slice(0, limit);
}

// ── Memoized ID Sets ─────────────────────────────────────────────────────────

// NOTA DE DISEÑO: antes construíamos un Set con TODOS los tmdb_id del listing
// (152 páginas de películas ≈ 15 000 títulos). Recorrer eso en cada cold start
// disparaba timeouts y hacía que la home tardara >40s. Se eliminó.
//
// Ahora la disponibilidad se decide por título con `probeEmbed` (sonda del
// embed, cacheada 6h) — ~20 sondas por página, baratas y cacheadas. El sitemap
// usa el catálogo del listing directamente (ya son títulos reproducibles), sin
// verificar nada.

// ── Embed‑probe (validación por título) ──────────────────────────────────────

/**
 * El listing de Vimeus incluye títulos cuyo embed todavía NO tiene fuentes
 * ("Rastreando embeds.."). Verificado empíricamente: la página del embed
 * incrusta su estado como JSON en el HTML del servidor:
 *   - sin fuentes:  {"backdrop":...,"embeds":[],...}
 *   - con fuentes:  {"backdrop":...,"embeds":[{"server":...,"url":...}],...}
 * Esta sonda descarga el HTML y descarta los títulos con "embeds":[].
 * Cacheada 6h por título (su crawler "actualiza cada pocas horas").
 */
async function probeEmbed(tmdbId: number, kind: 'movie' | 'serie' = 'movie'): Promise<boolean> {
    if (!VIEW_KEY) return true; // sin view key no podemos verificar → fail open
    try {
        const res = await fetch(
            `${BASE_URL}/e/${kind}?tmdb=${tmdbId}&view_key=${VIEW_KEY}`,
            {
                next: { revalidate: 21_600 }, // 6h
                headers: { 'User-Agent': 'FilmiFy/1.0' },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            },
        );
        if (!res.ok) return false;
        const html = await res.text();

        if (kind === 'movie') {
            // 1. Estado embebido con lista de fuentes vacía → no reproducible.
            //    (caso "Rastreando embeds..": {"embeds":[],...})
            if (/"embeds"\s*:\s*\[\s*\]/.test(html)) return false;
            // 2. Estado embebido con fuentes → reproducible.
            if (/"embeds"\s*:\s*\[/.test(html)) return true;
        } else {
            // Series: el estado embebido lista episodios sincronizados.
            if (/"episodes"\s*:\s*\[\s*\{/.test(html)) return true;
            if (/"episodes"\s*:\s*\[\s*\]/.test(html)) return false;
        }

        // Fallback (si Vimeus cambia el formato): <title> con nombre real →
        // reproducible; vacío o genérico ("Player") → no.
        const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
        return title.length > 0 && title.toLowerCase() !== 'player';
    } catch {
        return true; // error transitorio → fail open
    }
}

/** Sonda concurrente sobre una lista; conserva el orden. */
async function probeFilter<T extends { id: number }>(
    items: T[],
    kind: 'movie' | 'serie',
): Promise<T[]> {
    if (items.length === 0) return items;
    const flags: boolean[] = new Array(items.length).fill(false);
    let cursor = 0;
    async function worker() {
        while (cursor < items.length) {
            const idx = cursor++;
            flags[idx] = await probeEmbed(items[idx].id, kind);
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(MAX_PROBE_CONCURRENCY, items.length) }, worker),
    );
    return items.filter((_, idx) => flags[idx]);
}

// ── Public API — movies ───────────────────────────────────────────────────────

export async function isMovieAvailableOnVimeus(tmdbId: number): Promise<boolean> {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return false;
    // Sonda del embed: distingue reproducible / "Rastreando embeds…" (cacheada 6h).
    return probeEmbed(tmdbId, 'movie');
}

export async function filterAvailableMovies<T extends { id: number }>(
    items: T[],
): Promise<T[]> {
    if (items.length === 0) return items;
    return probeFilter(items, 'movie');
}

// ── Public API — series ───────────────────────────────────────────────────────

export async function isSeriesAvailableOnVimeus(tmdbId: number): Promise<boolean> {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return false;
    return probeEmbed(tmdbId, 'serie');
}

export async function filterAvailableSeries<T extends { id: number }>(
    items: T[],
): Promise<T[]> {
    if (items.length === 0) return items;
    return probeFilter(items, 'serie');
}

// ── Episodes map ──────────────────────────────────────────────────────────────

export async function getSeriesEpisodeMap(
    tmdbId: number,
): Promise<{ season: number; episodes: number[] }[]> {
    if (!API_KEY || !Number.isFinite(tmdbId) || tmdbId <= 0) return [];

    const bySeason = new Map<number, Set<number>>();

    try {
        const first = await fetchEpisodesPage(tmdbId, 1);
        if (!first) return [];
        const totalPages = Math.min(first.pages, MAX_EPISODE_PAGES);

        const collect = (items: VimeusEpisode[]) => {
            items.forEach((ep) => {
                // season/episode llegan como string ("1") → normalizar a número.
                const s = Number(ep.season);
                const e = Number(ep.episode);
                if (!Number.isFinite(s) || !Number.isFinite(e)) return;
                if (!bySeason.has(s)) bySeason.set(s, new Set());
                bySeason.get(s)!.add(e);
            });
        };

        collect(first.items);
        for (let page = 2; page <= totalPages; page++) {
            const data = await fetchEpisodesPage(tmdbId, page);
            if (!data) break;
            collect(data.items);
        }
    } catch {
        // Fallback silencioso
    }

    return Array.from(bySeason.entries())
        .map(([season, eps]) => ({
            season,
            episodes: Array.from(eps).sort((a, b) => a - b),
        }))
        .sort((a, b) => a.season - b.season);
}
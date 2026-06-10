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
const MEMO_TTL_MS = 10 * 60_000;       // in‑process memo TTL
const FETCH_TIMEOUT_MS = 8_000;
const MAX_PAGES = 200;                 // safety bound
const MAX_CONCURRENT_PAGES = 6;        // workers for building the set
const MAX_PROBE_CONCURRENCY = 10;      // workers for embed probes
const MAX_EPISODE_PAGES = 10;
const PAGE_RETRY_COUNT = 2;            // retries for individual pages

const DEBUG = process.env.NODE_ENV === 'development';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VimeusMovie {
    id: number;
    content_type: 'movie';
    tmdb_id: number;
    imdb_id: string | null;
    title: string;
    poster: string | null;
    backdrop: string | null;
    synced_at: string;
}

export interface VimeusSeries {
    id: number;
    content_type: 'series';
    tmdb_id: number;
    imdb_id: string | null;
    title: string;
    poster: string | null;
    backdrop: string | null;
    total_seasons: number;
    total_episodes: number;
    synced_at: string;
}

export interface VimeusEpisode {
    id: number;
    content_type: string;
    tmdb_id: number;
    imdb_id: string | null;
    title: string;
    poster: string | null;
    backdrop: string | null;
    season: number;
    episode: number;
    synced_at: string;
}

interface Pagination {
    current_page: number;
    total_pages: number;
    total_results: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
}

interface ListingEnvelope<T> {
    error: boolean;
    message: string;
    data: (T & { pagination: Pagination }) | null;
}

// ── Generic concurrent executor ───────────────────────────────────────────────

/** Runs async tasks with limited concurrency. */
async function runWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number,
): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let cursor = 0;

    async function worker() {
        while (cursor < tasks.length) {
            const idx = cursor++;
            try {
                results[idx] = await tasks[idx]();
            } catch {
                // La tarea individual puede fallar sin detener a las demás
            }
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
    );
    return results.filter((_, i) => results[i] !== undefined);
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchListing<T>(
    path: string,
): Promise<(T & { pagination: Pagination }) | null> {
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
        const json = (await res.json()) as ListingEnvelope<T>;
        if (json.error || !json.data) {
            if (DEBUG) console.warn(`[Vimeus] API error: ${json.message}`);
            return null;
        }
        // Verificación defensiva: si falta pagination, devolvemos una mínima
        if (!json.data.pagination) {
            if (DEBUG) console.warn(`[Vimeus] Missing pagination for ${path}`);
            return {
                ...json.data,
                pagination: {
                    current_page: 1,
                    total_pages: 1,
                    total_results: 0,
                    per_page: 50,
                    has_next: false,
                    has_prev: false,
                },
            };
        }
        return json.data;
    } catch (err) {
        if (DEBUG) console.error(`[Vimeus] Fetch error for ${path}:`, err);
        return null;
    }
}

const fetchMoviesPage = (page: number) =>
    fetchListing<{ movies: VimeusMovie[] }>(`/api/listing/movies?page=${page}`);

const fetchSeriesPage = (page: number) =>
    fetchListing<{ series: VimeusSeries[] }>(`/api/listing/series?page=${page}`);

const fetchEpisodesPage = (tmdbId: number, page: number) =>
    fetchListing<{ episodes: VimeusEpisode[] }>(
        `/api/listing/episodes?tmdb_id=${tmdbId}&page=${page}`,
    );

// ── Recently added movies ────────────────────────────────────────────────────

export async function getRecentlyAddedMovies(limit = 20): Promise<VimeusMovie[]> {
    if (!API_KEY) return [];
    const data = await fetchMoviesPage(1);
    return (data?.movies ?? []).slice(0, limit);
}

// ── Memoized ID Sets ─────────────────────────────────────────────────────────

type Kind = 'movies' | 'series';

interface MemoEntry {
    ids: Set<number>;
    expires: number;
}

const memos: Record<Kind, MemoEntry | null> = { movies: null, series: null };
const memoPromises: Record<Kind, Promise<Set<number> | null> | null> = {
    movies: null,
    series: null,
};

/** Invalida la caché en proceso para forzar un refresco completo. */
export function invalidateAvailabilityCache(kind?: Kind) {
    if (kind) {
        memos[kind] = null;
        memoPromises[kind] = null;
    } else {
        memos.movies = null;
        memos.series = null;
        memoPromises.movies = null;
        memoPromises.series = null;
    }
}

async function buildIdSet(kind: Kind): Promise<Set<number> | null> {
    if (!API_KEY) return null;

    const extract = (data: any): { tmdb_id: number }[] =>
        kind === 'movies' ? (data?.movies ?? []) : (data?.series ?? []);
    const fetchPage = kind === 'movies' ? fetchMoviesPage : fetchSeriesPage;

    const first = await fetchPage(1);
    if (!first) return null;

    const ids = new Set<number>(extract(first).map((m) => m.tmdb_id));

    // Si no hay paginación o falta total_pages, asumimos solo una página
    if (!first.pagination || typeof first.pagination.total_pages !== 'number') {
        if (DEBUG) console.warn('[Vimeus] Invalid pagination, using single page');
        return ids;
    }

    const totalPages = Math.min(first.pagination.total_pages, MAX_PAGES);

    // Construir funciones de tarea con reintentos
    const tasks: (() => Promise<void>)[] = [];
    for (let p = 2; p <= totalPages; p++) {
        tasks.push(() =>
            attemptWithRetries(async () => {
                const data = await fetchPage(p);
                if (data) {
                    extract(data).forEach((m) => ids.add(m.tmdb_id));
                }
            }, PAGE_RETRY_COUNT),
        );
    }

    await runWithConcurrency(tasks, MAX_CONCURRENT_PAGES);
    return ids;
}

/** Reintenta una función asíncrona un número limitado de veces. */
async function attemptWithRetries(
    fn: () => Promise<void>,
    retries: number,
): Promise<void> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            await fn();
            return;
        } catch {
            if (attempt === retries) {
                if (DEBUG) console.warn('[Vimeus] Max retries reached for a page');
            }
            // Espera exponencial mínima
            await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
        }
    }
}

async function getAvailableIds(kind: Kind): Promise<Set<number> | null> {
    const now = Date.now();
    const memo = memos[kind];
    if (memo && memo.expires > now) return memo.ids;

    if (!memoPromises[kind]) {
        memoPromises[kind] = buildIdSet(kind).then((ids) => {
            memoPromises[kind] = null;
            if (ids && ids.size > 0) {
                memos[kind] = { ids, expires: now + MEMO_TTL_MS };
                return ids;
            }
            return null;
        });
    }
    return memoPromises[kind];
}

// ── Embed‑probe fallback (solo películas) ────────────────────────────────────

async function probeEmbed(tmdbId: number): Promise<boolean> {
    if (!VIEW_KEY) return true; // sin view key no podemos verificar → fail open
    try {
        const res = await fetch(
            `${BASE_URL}/e/movie?tmdb=${tmdbId}&view_key=${VIEW_KEY}`,
            {
                next: { revalidate: 86_400 },
                headers: { 'User-Agent': 'FilmiFy/1.0' },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            },
        );
        if (!res.ok) return false;
        const html = await res.text();
        // Busca <title> no vacío
        const match = html.match(/<title>([^<]*)<\/title>/i);
        return match ? match[1].trim().length > 0 : false;
    } catch {
        return true; // error transitorio → fail open
    }
}

// ── Public API — movies ───────────────────────────────────────────────────────

export async function isMovieAvailableOnVimeus(tmdbId: number): Promise<boolean> {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return false;
    const ids = await getAvailableIds('movies');
    if (ids) return ids.has(tmdbId);
    return probeEmbed(tmdbId);
}

export async function filterAvailableMovies<T extends { id: number }>(
    items: T[],
): Promise<T[]> {
    if (items.length === 0) return items;
    const ids = await getAvailableIds('movies');
    if (ids) return items.filter((item) => ids.has(item.id));

    // Fallback: probes concurrentes
    const tasks = items.map((item) => () => probeEmbed(item.id));
    const results = await runWithConcurrency(tasks, MAX_PROBE_CONCURRENCY);
    return items.filter((_, idx) => results[idx] ?? false);
}

// ── Public API — series ───────────────────────────────────────────────────────

export async function isSeriesAvailableOnVimeus(tmdbId: number): Promise<boolean> {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return false;
    const ids = await getAvailableIds('series');
    // Sin API key no podemos verificar series → fail open
    if (!ids) return true;
    return ids.has(tmdbId);
}

export async function filterAvailableSeries<T extends { id: number }>(
    items: T[],
): Promise<T[]> {
    if (items.length === 0) return items;
    const ids = await getAvailableIds('series');
    if (!ids) return items; // fail open
    return items.filter((item) => ids.has(item.id));
}

// ── Episodes map ──────────────────────────────────────────────────────────────

export async function getSeriesEpisodeMap(
    tmdbId: number,
): Promise<{ season: number; episodes: number[] }[]> {
    if (!API_KEY || !Number.isFinite(tmdbId) || tmdbId <= 0) return [];

    const bySeason = new Map<number, Set<number>>();

    try {
        let page = 1;
        let hasNext = true;
        while (hasNext && page <= MAX_EPISODE_PAGES) {
            const data = await fetchEpisodesPage(tmdbId, page);
            if (!data) break;
            data.episodes.forEach((ep) => {
                if (!bySeason.has(ep.season)) bySeason.set(ep.season, new Set());
                bySeason.get(ep.season)!.add(ep.episode);
            });
            hasNext = data.pagination.has_next;
            page++;
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
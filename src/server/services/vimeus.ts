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
const MAX_PROBE_CONCURRENCY = 8;       // workers for embed probes (fail-closed, no saturar Vimeus)
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

// El listing de animes usa el MISMO formato que movies/series:
// data.result[] y data.pages (verificado contra la API en vivo).
export interface VimeusAnime {
    tmdb_id: number;
    imdb_id?: string | null;
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

// El endpoint de animes tiene formato de respuesta distinto: data.animes[] y
// data.pagination.total_pages en lugar de data.result[] y data.pages.
// Usa el mismo fetchListing genérico — el endpoint de animes tiene el mismo
// formato de respuesta que movies/series: data.result[] y data.pages.
const fetchAnimesPage = (page: number) =>
    fetchListing<VimeusAnime>(`/api/listing/animes?page=${page}`);

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

// ── Quality map ───────────────────────────────────────────────────────────────

/**
 * Devuelve un Map<tmdb_id, quality> construido desde las primeras páginas del
 * listing. Solo cubre los títulos más recientes (~primera página = 50 ítems),
 * que son los que aparecen en home y browse. Para el catálogo completo sería
 * demasiado costoso; las páginas del listing ya están cacheadas 1h, así que
 * este Map se construye sin coste extra en hot path.
 */
export async function getQualityMap(
    kind: 'movie' | 'serie' | 'anime' = 'movie',
    pages = 4,
): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (!API_KEY) return map;
    try {
        const fetches = Array.from({ length: pages }, (_, i) => {
            if (kind === 'movie') return fetchMoviesPage(i + 1);
            if (kind === 'serie') return fetchSeriesPage(i + 1);
            return fetchAnimesPage(i + 1);
        });
        const results = await Promise.all(fetches);
        for (const data of results) {
            if (!data) continue;
            for (const item of data.items) {
                // VimeusAnime no tiene campo quality; los movies/series sí.
                const q = (item as { quality?: string }).quality;
                if (q) map.set(item.tmdb_id, q);
            }
        }
    } catch {
        // Silencioso — el badge es opcional, no bloquea el render
    }
    return map;
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
// embed, cacheada 2h) — ~20 sondas por página, baratas y cacheadas. El sitemap
// usa el catálogo del listing directamente (ya son títulos reproducibles), sin
// verificar nada.

// ── JSON-array extraction helpers ────────────────────────────────────────────

/**
 * Encuentra la posición del '[' inicial del array con clave `key` en el HTML.
 * Devuelve -1 si no se encuentra.
 */
function findJsonArrayStart(html: string, key: string): number {
    const keyIdx = html.indexOf(key);
    if (keyIdx === -1) return -1;
    // Avanza desde la clave hasta el primer '[', ignorando espacios y ':'
    let i = keyIdx + key.length;
    while (i < html.length && (html[i] === ' ' || html[i] === ':' || html[i] === '\t' || html[i] === '\n' || html[i] === '\r')) {
        i++;
    }
    return html[i] === '[' ? i : -1;
}

/**
 * Extrae el bloque JSON de array que empieza en `startIdx` usando conteo de corchetes.
 * Maneja strings internos con escape para no confundirse con '[' o ']' dentro de URLs.
 * Devuelve null si el JSON está incompleto o malformado.
 */
function extractJsonArray(html: string, startIdx: number): string | null {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = startIdx; i < html.length; i++) {
        const ch = html[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '[') depth++;
        else if (ch === ']') {
            depth--;
            if (depth === 0) return html.slice(startIdx, i + 1);
        }
    }
    return null; // array sin cerrar → malformado
}

// ── Embed‑probe (validación por título) ──────────────────────────────────────

// Señales en el HTML del embed que indican que el contenido NO está disponible,
// independientemente de lo que diga el listing. Verificadas empíricamente contra
// respuestas reales de Vimeus.
const UNAVAILABLE_SIGNALS = [
    // array de embeds/fuentes vacío (estado "Rastreando embeds..")
    /"embeds"\s*:\s*\[\s*\]/,
    // array de episodios sincronizados vacío (serie sin episodios cargados)
    /"episodes"\s*:\s*\[\s*\]/,
    // mensajes de error explícitos que Vimeus incrusta en el HTML
    /not\s+found/i,
    /contenido\s+no\s+disponible/i,
    /no\s+disponible/i,
    /título\s+no\s+encontrado/i,
    // página de error genérica de Vimeus
    /<title>\s*(error|not found|404)\s*<\/title>/i,
];

/**
 * Sonda el embed de Vimeus para verificar si el contenido tiene fuentes reales.
 *
 * Reglas (fail-closed por defecto — dudas = no disponible):
 *  1. HTTP != 2xx → false.
 *  2. Cualquier señal de "no disponible" en el HTML → false.
 *  3. Película: necesita "embeds":[{...}] con al menos un objeto que tenga "url" no vacía.
 *  4. Serie: necesita "episodes":[{...}] con al menos un episodio con datos.
 *  5. Si el JSON embebido no se puede parsear, fail-closed (false) — no
 *     usamos el <title> como fallback porque genera demasiados falsos positivos.
 *  6. Timeout o error de red → false (fail-closed).
 *     El listing ya garantiza que el título existe; si la sonda no responde,
 *     preferimos no mostrarlo antes que mostrar algo que no carga.
 */
async function probeEmbed(tmdbId: number, kind: 'movie' | 'serie' | 'anime' = 'movie'): Promise<boolean> {
    // Sin view key no podemos verificar; mostramos solo lo que tenga API_KEY
    // validado por el listing (acepta el riesgo conscientemente).
    if (!VIEW_KEY) return true;
    try {
        const res = await fetch(
            `${BASE_URL}/e/${kind}?tmdb=${tmdbId}&view_key=${VIEW_KEY}`,
            {
                // Reducimos caché a 2h para que errores de disponibilidad se corrijan
                // más rápido (antes eran 6h, lo que propagaba falsos positivos mucho tiempo).
                next: { revalidate: 7_200 },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; FilmiFy/2.0)',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            },
        );

        // Cualquier respuesta no-2xx es definitivamente no disponible.
        if (!res.ok) return false;

        const html = await res.text();

        // Paso 1 — señales de no disponibilidad (rápido, orden importa).
        for (const signal of UNAVAILABLE_SIGNALS) {
            if (signal.test(html)) return false;
        }

        if (kind === 'movie') {
            // Extraemos el valor del array "embeds" del estado JSON embebido.
            // Usamos extracción balanceada de corchetes para manejar URLs con caracteres especiales.
            const embedsStart = findJsonArrayStart(html, '"embeds"');
            if (embedsStart === -1) return false;
            const embedsJson = extractJsonArray(html, embedsStart);
            if (!embedsJson) return false;
            try {
                const embeds = JSON.parse(embedsJson) as Array<{ url?: string; server?: string }>;
                // Al menos un embed debe tener url no vacía.
                return embeds.some(e => typeof e.url === 'string' && e.url.length > 4);
            } catch {
                return false;
            }
        } else {
            // Series y anime: al menos un episodio con datos en el array "episodes".
            const epsStart = findJsonArrayStart(html, '"episodes"');
            if (epsStart === -1) return false;
            const epsJson = extractJsonArray(html, epsStart);
            if (!epsJson) return false;
            try {
                const episodes = JSON.parse(epsJson) as Array<unknown>;
                return episodes.length > 0;
            } catch {
                return false;
            }
        }
    } catch {
        // Timeout, error de red, etc. → fail-closed.
        // El listing garantiza que el título existe; si la sonda no responde
        // preferimos ocultarlo antes que mostrar algo que nunca carga.
        return false;
    }
}

/** Sonda concurrente sobre una lista; conserva el orden. */
async function probeFilter<T extends { id: number }>(
    items: T[],
    kind: 'movie' | 'serie' | 'anime',
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
    // Sonda del embed: distingue reproducible / "Rastreando embeds…" (cacheada 2h).
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

// ── Public API — anime ────────────────────────────────────────────────────────

export async function isAnimeAvailableOnVimeus(tmdbId: number): Promise<boolean> {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return false;
    return probeEmbed(tmdbId, 'anime');
}

export async function filterAvailableAnimes<T extends { id: number }>(
    items: T[],
): Promise<T[]> {
    if (items.length === 0) return items;
    return probeFilter(items, 'anime');
}

export async function getRecentlyAddedAnimes(limit = 20): Promise<VimeusAnime[]> {
    if (!API_KEY) return [];
    const data = await fetchAnimesPage(1);
    return (data?.items ?? []).slice(0, limit);
}

export async function getVimeusAnimeCatalog(limit = 500): Promise<VimeusAnime[]> {
    if (!API_KEY) return [];
    const items: VimeusAnime[] = [];
    const first = await fetchAnimesPage(1);
    if (!first) return [];
    items.push(...first.items);
    const totalPages = Math.min(first.pages, MAX_PAGES);
    for (let page = 2; page <= totalPages && items.length < limit; page++) {
        const data = await fetchAnimesPage(page);
        if (!data) break;
        items.push(...data.items);
    }
    return items.slice(0, limit);
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
        if (totalPages > 1) {
            // Páginas 2..N en paralelo: la página 1 ya nos dio el total, así que
            // no hay dependencia entre ellas. En frío esto evita N×8s en serie.
            const rest = await Promise.all(
                Array.from({ length: totalPages - 1 }, (_, i) =>
                    fetchEpisodesPage(tmdbId, i + 2),
                ),
            );
            rest.forEach((data) => {
                if (data) collect(data.items);
            });
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
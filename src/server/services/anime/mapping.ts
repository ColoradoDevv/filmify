/**
 * Mapa de identidades de anime — AniList ↔ TMDB ↔ MAL.
 *
 * PROBLEMA QUE RESUELVE
 * ---------------------
 * AniList identifica cada anime por su id (y el de MyAnimeList); Vimeus y el
 * resto del catálogo de FilmiFy se indexan por tmdb_id. Hasta ahora el puente
 * entre ambos mundos era `anime-bridge.ts`: buscaba el título en TMDB y
 * puntuaba los resultados por parecido de cadena y cercanía de año. Eso falla
 * con los títulos que AniList y TMDB nombran distinto (romaji vs inglés vs
 * "Season 2" vs "2nd Season") y no tiene forma de acertar la temporada.
 *
 * Fribb/anime-lists publica el mapeo EXACTO entre las bases de datos de anime
 * (AniDB, AniList, MAL, TVDB, TMDB, Kitsu…), generado y mantenido de forma
 * automática. Con él, AniList→TMDB deja de ser una heurística y pasa a ser un
 * lookup, y además obtenemos la dirección inversa (TMDB→AniList), necesaria
 * para redirigir las fichas de anime que hoy viven en /tv/[tmdbId].
 *
 * POR QUÉ NO USAMOS EL DATA CACHE DE NEXT
 * ---------------------------------------
 * El fichero pesa ~5,9 MB y el Data Cache de Next descarta las respuestas de
 * más de 2 MB, así que `next: { revalidate }` no lo cachearía y volveríamos a
 * descargarlo en cada petición. En su lugar lo pedimos con `no-store`, lo
 * parseamos UNA vez y nos quedamos solo con dos índices compactos (~7 k
 * entradas cada uno); el JSON crudo queda libre para el GC inmediatamente.
 * El resultado se memoiza en proceso 24 h — los ids de anime son estables.
 *
 * DEGRADACIÓN
 * -----------
 * Si la descarga falla, conservamos el último índice bueno; si nunca se pudo
 * construir, los lookups devuelven null y quien llama debe recurrir al puente
 * por título (`anime-bridge.ts`), que se conserva justo para eso.
 */

const SOURCE_URL =
    'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json';

const TTL_MS = 24 * 60 * 60 * 1000;   // 24 h — los mapeos de id no cambian
const FETCH_TIMEOUT_MS = 30_000;      // el fichero es grande; margen amplio
const DEBUG = process.env.NODE_ENV === 'development';

// ── Forma del dataset (solo los campos que consumimos) ───────────────────────

/**
 * `themoviedb_id` llega en tres formas según la entrada:
 *   { tv: 26209 } | { movie: 129 } | 129 | "unknown" | ausente
 * Lo normalizamos en `parseTmdb`.
 */
type RawTmdbId =
    | { tv?: number | number[]; movie?: number | number[] }
    | number
    | string
    | null;

interface RawEntry {
    type?: string;
    anilist_id?: number;
    mal_id?: number;
    themoviedb_id?: RawTmdbId;
    /** Temporada equivalente en cada base: AniList numera cada temporada como
     *  una entrada propia, TMDB las agrupa bajo una sola serie. */
    season?: { tvdb?: number | string; tmdb?: number | string } | null;
}

// ── Tipos públicos ───────────────────────────────────────────────────────────

export interface AnimeIdMatch {
    anilistId: number;
    tmdbId: number;
    mediaType: 'tv' | 'movie';
    /** Temporada de TMDB que corresponde a esta entrada de AniList (1 si no consta). */
    season: number;
    malId: number | null;
}

// ── Estado memoizado ─────────────────────────────────────────────────────────

interface IdIndex {
    /** anilist_id → match */
    byAnilist: Map<number, AnimeIdMatch>;
    /** tmdb_id → matches ordenados por temporada ascendente */
    byTmdb: Map<number, AnimeIdMatch[]>;
}

let _index: IdIndex | null = null;
let _builtAt = 0;
let _inflight: Promise<IdIndex | null> | null = null;

// ── Helpers de parseo ────────────────────────────────────────────────────────

/** Extrae el primer id numérico de `themoviedb_id` junto a su tipo de medio. */
function parseTmdb(raw: RawTmdbId): { id: number; mediaType: 'tv' | 'movie' } | null {
    if (raw == null) return null;

    // Forma suelta: themoviedb_id: 129 — el dataset no dice si es película o
    // serie, y en la práctica corresponde a películas.
    if (typeof raw === 'number') {
        return Number.isFinite(raw) && raw > 0 ? { id: raw, mediaType: 'movie' } : null;
    }
    // "unknown" y demás cadenas centinela.
    if (typeof raw === 'string') return null;

    // Algunas entradas traen un array (varias películas de la misma saga);
    // nos quedamos con la primera, que es la principal.
    const first = (v: number | number[] | undefined): number | null => {
        if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
        if (Array.isArray(v)) {
            const n = v.find((x) => typeof x === 'number' && Number.isFinite(x) && x > 0);
            return n ?? null;
        }
        return null;
    };

    const tv = first(raw.tv);
    if (tv) return { id: tv, mediaType: 'tv' };
    const movie = first(raw.movie);
    if (movie) return { id: movie, mediaType: 'movie' };
    return null;
}

/** Normaliza `season.tmdb`, que puede venir como número, cadena o "unknown". */
function parseSeason(raw: RawEntry['season']): number {
    const v = raw?.tmdb;
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
    if (typeof v === 'string') {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return 1;
}

// ── Construcción del índice ──────────────────────────────────────────────────

async function buildIndex(): Promise<IdIndex | null> {
    let entries: RawEntry[];
    try {
        const res = await fetch(SOURCE_URL, {
            // Ver cabecera: el fichero excede el límite del Data Cache.
            cache: 'no-store',
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
            if (DEBUG) console.warn(`[anime/mapping] HTTP ${res.status}`);
            return null;
        }
        entries = (await res.json()) as RawEntry[];
    } catch (err) {
        if (DEBUG) console.error('[anime/mapping] fallo al descargar el dataset:', err);
        return null;
    }

    if (!Array.isArray(entries) || entries.length === 0) return null;

    const byAnilist = new Map<number, AnimeIdMatch>();
    const byTmdb = new Map<number, AnimeIdMatch[]>();

    for (const e of entries) {
        const anilistId = e.anilist_id;
        if (typeof anilistId !== 'number' || !Number.isFinite(anilistId)) continue;

        const tmdb = parseTmdb(e.themoviedb_id ?? null);
        if (!tmdb) continue;

        const match: AnimeIdMatch = {
            anilistId,
            tmdbId: tmdb.id,
            mediaType: tmdb.mediaType,
            season: tmdb.mediaType === 'tv' ? parseSeason(e.season) : 1,
            malId: typeof e.mal_id === 'number' ? e.mal_id : null,
        };

        // Un anilist_id apunta a un único título; si el dataset trae duplicados
        // nos quedamos con el primero (orden estable del fichero).
        if (!byAnilist.has(anilistId)) byAnilist.set(anilistId, match);

        const bucket = byTmdb.get(tmdb.id);
        if (bucket) bucket.push(match);
        else byTmdb.set(tmdb.id, [match]);
    }

    // Un tmdb_id agrupa varias temporadas → varias entradas de AniList.
    // Las ordenamos por temporada para que "la canónica" sea la primera.
    for (const list of byTmdb.values()) {
        list.sort((a, b) => a.season - b.season);
    }

    if (byAnilist.size === 0) return null;
    if (DEBUG) {
        console.log(
            `[anime/mapping] índice listo: ${byAnilist.size} anilist→tmdb, ${byTmdb.size} tmdb→anilist`,
        );
    }
    return { byAnilist, byTmdb };
}

/** ¿Hay un índice utilizable ahora mismo, sin esperar a ninguna descarga? */
function isWarm(): boolean {
    return _index != null && Date.now() - _builtAt < TTL_MS;
}

/**
 * Devuelve el índice, reconstruyéndolo si venció el TTL. Las llamadas
 * concurrentes comparten una única construcción en vuelo (mismo patrón que
 * `getAnimeIdSet` en vimeus.ts) para no descargar 5,9 MB N veces en frío.
 */
async function getIndex(): Promise<IdIndex | null> {
    if (_index && Date.now() - _builtAt < TTL_MS) return _index;
    if (_inflight) return _inflight;

    _inflight = (async () => {
        try {
            const built = await buildIndex();
            if (built) {
                _index = built;
                _builtAt = Date.now();
            } else if (_index) {
                // Fallo transitorio: conservamos el índice viejo y reintentamos
                // en la siguiente ventana en vez de quedarnos sin mapeo.
                _builtAt = Date.now() - TTL_MS + 5 * 60 * 1000; // reintento en 5 min
            }
            return _index;
        } finally {
            _inflight = null;
        }
    })();

    return _inflight;
}

// ── API pública ──────────────────────────────────────────────────────────────

/** AniList → TMDB. null si el dataset no conoce ese anime. */
export async function tmdbFromAnilist(anilistId: number): Promise<AnimeIdMatch | null> {
    if (!Number.isFinite(anilistId) || anilistId <= 0) return null;
    const idx = await getIndex();
    return idx?.byAnilist.get(anilistId) ?? null;
}

/**
 * TMDB → AniList. Un tmdb_id de serie agrupa todas sus temporadas, así que
 * devuelve la lista completa ordenada por temporada.
 */
export async function anilistFromTmdb(tmdbId: number): Promise<AnimeIdMatch[]> {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return [];
    const idx = await getIndex();
    return idx?.byTmdb.get(tmdbId) ?? [];
}

/**
 * Entrada de AniList canónica para un tmdb_id: la de temporada más baja.
 * Es la que usamos al redirigir /tv/[tmdbId] → /anime/[anilistId].
 */
export async function canonicalAnilistForTmdb(
    tmdbId: number,
    season?: number,
): Promise<AnimeIdMatch | null> {
    const all = await anilistFromTmdb(tmdbId);
    if (all.length === 0) return null;
    if (season != null) {
        const exact = all.find((m) => m.season === season);
        if (exact) return exact;
    }
    return all[0];
}

/**
 * Igual que `canonicalAnilistForTmdb`, pero SIN esperar a que se construya el
 * índice: si aún no está caliente, devuelve null y lanza la construcción en
 * segundo plano para que las siguientes peticiones sí acierten.
 *
 * Es la variante que debe usar la ficha de serie (/tv/[id]): esa página se
 * renderiza para CUALQUIER serie, no solo anime, y bloquearla mientras se
 * descargan 5,9 MB penalizaría a todo el catálogo de series en cada arranque
 * en frío de un worker. El grueso de las redirecciones ya lo resuelve el
 * middleware con su snapshot estático; esto es solo la red de seguridad para
 * los animes que aún no estén en él.
 */
export async function canonicalAnilistForTmdbIfWarm(
    tmdbId: number,
    season?: number,
): Promise<AnimeIdMatch | null> {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;
    if (!isWarm()) {
        // Dispara la construcción sin esperarla. `void` + catch para no dejar
        // una promesa rechazada sin gestionar.
        void getIndex().catch(() => null);
        return null;
    }
    return canonicalAnilistForTmdb(tmdbId, season);
}

/**
 * ¿Este tmdb_id es un anime según el dataset? Se usa para decidir si /tv/[id]
 * debe redirigir al módulo de anime.
 */
export async function isAnimeTmdbId(tmdbId: number): Promise<boolean> {
    return (await anilistFromTmdb(tmdbId)).length > 0;
}

/** Precalienta el índice (por ejemplo desde el render del lobby de /anime). */
export async function warmAnimeIdIndex(): Promise<boolean> {
    return (await getIndex()) != null;
}

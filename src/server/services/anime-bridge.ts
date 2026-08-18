/**
 * Puente AniList → TMDB → Vimeus.
 *
 * AniList da un catálogo de anime riquísimo pero identifica los títulos por su
 * propio id (y el de MyAnimeList), no por tmdb_id. FilmiFy reproduce anime con
 * el embed de Vimeus, que se indexa por tmdb_id. Este módulo resuelve, para un
 * anime de AniList, el tmdb_id reproducible correspondiente:
 *
 *  1. Se busca el título en TMDB (`/search/multi`) — igual que hace el buscador
 *     del catálogo.
 *  2. Entre los resultados `tv`/`movie`, se elige el mejor match por título
 *     normalizado y cercanía de año.
 *  3. Se cruza contra el catálogo de anime de Vimeus (`getAnimeIdSet`) para
 *     confirmar que ese tmdb_id es realmente reproducible como anime; si no,
 *     se acepta igualmente el match `tv` de mayor confianza (fail-open suave).
 *
 * El resultado se memoiza en proceso (los ids de AniList son estables) para no
 * repetir la búsqueda en cada visita a la ficha.
 */

import { searchMulti } from './tmdb';
import {
    getAnimeIdSet, getAnimeTitleIndex,
    isAnimeAvailableOnVimeus, isSeriesAvailableOnVimeus,
} from '@/server/services/vimeus';
import { getAnimeById } from '@/server/services/anilist';
import type { Movie, TVShow, MultiSearchResult } from '@/types/tmdb';
import type { AnimeCard } from '@/lib/anilist/types';

export interface AnimeTmdbMatch {
    tmdbId: number;
    mediaType: 'tv' | 'movie';
    /** true si el tmdb_id está confirmado en el catálogo de anime de Vimeus. */
    confirmed: boolean;
    /**
     * true si el embed tiene fuentes reales (sonda de /e/anime|serie). Solo se
     * calcula bajo demanda (playableOnly); null = no verificado todavía.
     */
    playable?: boolean | null;
}

const MATCH_TTL_MS = 6 * 60 * 60 * 1000; // 6 h
const _cache = new Map<number, { at: number; match: AnimeTmdbMatch | null }>();

/** Concurrencia máxima al resolver/verificar animes en lote (no saturar TMDB/Vimeus). */
const BATCH_CONCURRENCY = 6;

/** Normaliza un título para comparar: minúsculas, sin signos, sin sufijos comunes. */
function normalizeTitle(t: string): string {
    return t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')   // acentos/diacríticos
        .replace(/\b(tv|the animation|season\s*\d+|\d+(st|nd|rd|th)\s*season|part\s*\d+)\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * Normalización "exacta" (sin quitar sufijos de temporada) — debe coincidir con
 * `normalizeAnimeTitle` de vimeus.ts para que el lookup directo en el índice
 * título→tmdb_id acierte.
 */
function normalizeExact(t: string): string {
    return t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function titleName(r: MultiSearchResult): string {
    const anyR = r as unknown as Partial<Movie & TVShow>;
    return anyR.title || anyR.name || '';
}

function releaseYear(r: MultiSearchResult): number | null {
    const anyR = r as unknown as Partial<Movie & TVShow>;
    const date = anyR.release_date || anyR.first_air_date || '';
    const y = parseInt(date.slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
}

/**
 * Resuelve el tmdb_id reproducible de un anime de AniList a partir de sus
 * títulos (inglés / romaji) y su año. Devuelve null si no hay match razonable.
 */
export async function resolveAnimeTmdb(
    anilistId: number,
    opts: { english?: string | null; romaji?: string | null; year?: number | null } = {},
): Promise<AnimeTmdbMatch | null> {
    if (!Number.isFinite(anilistId) || anilistId <= 0) return null;

    const cached = _cache.get(anilistId);
    if (cached && Date.now() - cached.at < MATCH_TTL_MS) return cached.match;

    // Si no nos pasaron títulos, los pedimos a AniList.
    let { english, romaji, year } = opts;
    if (!english && !romaji) {
        const detail = await getAnimeById(anilistId).catch(() => null);
        english = detail?.title.english ?? null;
        romaji = detail?.title.romaji ?? null;
        year = detail?.seasonYear ?? detail?.startDate?.year ?? null;
    }

    const queries = Array.from(new Set([english, romaji].filter(Boolean))) as string[];
    if (queries.length === 0) {
        _cache.set(anilistId, { at: Date.now(), match: null });
        return null;
    }

    let animeIdSet = new Set<number>();
    let candidates: MultiSearchResult[] = [];
    try {
        const [animeIds, ...searches] = await Promise.all([
            getAnimeIdSet(1000).catch(() => new Set<number>()),
            ...queries.map((q) => searchMulti(q).then((r) => r.results ?? []).catch(() => [])),
        ]);
        animeIdSet = animeIds;
        candidates = searches.flat().filter(
            (r) => r.media_type === 'tv' || r.media_type === 'movie',
        );
    } catch {
        _cache.set(anilistId, { at: Date.now(), match: null });
        return null;
    }

    if (candidates.length === 0) {
        _cache.set(anilistId, { at: Date.now(), match: null });
        return null;
    }

    const wantTitles = queries.map(normalizeTitle);

    // Puntuar cada candidato: match exacto de título normalizado > prefijo;
    // bonus si el año coincide; bonus grande si está en el catálogo de anime.
    let best: { r: MultiSearchResult; score: number } | null = null;
    for (const r of candidates) {
        const name = normalizeTitle(titleName(r));
        if (!name) continue;
        let score = 0;
        if (wantTitles.includes(name)) score += 100;
        else if (wantTitles.some((w) => name.startsWith(w) || w.startsWith(name))) score += 60;
        else if (wantTitles.some((w) => name.includes(w) || w.includes(name))) score += 30;
        else continue; // sin ninguna coincidencia de título, se descarta

        const ry = releaseYear(r);
        if (year && ry) {
            const diff = Math.abs(ry - year);
            if (diff === 0) score += 20;
            else if (diff === 1) score += 8;
            else if (diff > 3) score -= 10;
        }
        if (animeIdSet.has(r.id)) score += 40;

        if (!best || score > best.score) best = { r, score };
    }

    if (!best || best.score < 30) {
        _cache.set(anilistId, { at: Date.now(), match: null });
        return null;
    }

    const match: AnimeTmdbMatch = {
        tmdbId: best.r.id,
        mediaType: best.r.media_type === 'movie' ? 'movie' : 'tv',
        confirmed: animeIdSet.has(best.r.id),
    };
    _cache.set(anilistId, { at: Date.now(), match });
    return match;
}

// ── Filtrado por lote (para ocultar lo no reproducible del catálogo) ──────────

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
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, worker),
    );
    return out;
}

/**
 * Verifica que un match resuelto sea REALMENTE reproducible sondeando el embed
 * de Vimeus (fuentes reales), no solo que exista el tmdb_id. El resultado se
 * cachea en el propio match para no re-sondear en la misma ventana.
 */
async function ensurePlayable(match: AnimeTmdbMatch): Promise<boolean> {
    if (match.playable != null) return match.playable;
    // Los movies TMDB rara vez están como anime en Vimeus; probamos ambas rutas
    // según el tipo, empezando por /e/anime (el más común para este flujo).
    const playable = match.mediaType === 'movie'
        ? await isSeriesAvailableOnVimeus(match.tmdbId).catch(() => false)
        : (await isAnimeAvailableOnVimeus(match.tmdbId).catch(() => false))
          || (await isSeriesAvailableOnVimeus(match.tmdbId).catch(() => false));
    match.playable = playable;
    return playable;
}

export interface ResolvedAnime {
    card: AnimeCard;
    match: AnimeTmdbMatch;
}

/**
 * Filtra una lista de animes de AniList dejando SOLO los que se pueden ver de
 * verdad en FilmiFy. Dos niveles:
 *
 *  - `confirmedOnly` (por defecto): basta con que el título resuelva a un
 *    tmdb_id presente en el catálogo de anime de Vimeus. Rápido (sin sondas),
 *    suficiente para las rejillas del lobby de /anime.
 *  - `playableOnly`: además sondea el embed para exigir fuentes reales. Más
 *    lento; se reserva para donde la certeza importa más que la latencia.
 *
 * Conserva el orden de entrada (relevancia de AniList).
 */
export async function filterPlayableAnime(
    cards: AnimeCard[],
    opts: { playableOnly?: boolean } = {},
): Promise<ResolvedAnime[]> {
    if (cards.length === 0) return [];

    // Índice título→tmdb_id del catálogo REPRODUCIBLE de Vimeus. Empareja la
    // mayoría de animes sin gastar una sola búsqueda de TMDB.
    const titleIndex = await getAnimeTitleIndex(1000).catch(() => new Map<string, number>());

    const resolved = await mapPool(cards, BATCH_CONCURRENCY, async (card): Promise<ResolvedAnime | { card: AnimeCard; match: null }> => {
        // Paso rápido: match directo AniList→Vimeus por título (inglés o romaji).
        // Usa la misma normalización que el índice (sin quitar sufijos).
        const keys = [card.title, card.subtitle].filter(Boolean).map((t) => normalizeExact(t as string));
        for (const k of keys) {
            const tmdbId = titleIndex.get(k);
            if (tmdbId) {
                return { card, match: { tmdbId, mediaType: 'tv', confirmed: true } };
            }
        }
        // Paso lento (solo si el título no está en el catálogo): resolver vía TMDB.
        const match = await resolveAnimeTmdb(card.id, {
            english: card.title,
            romaji: card.subtitle,
            year: card.year,
        }).catch(() => null);
        return { card, match };
    });

    // Nivel 1: exigir match confirmado en el catálogo de anime.
    const confirmed = resolved.filter(
        (r): r is ResolvedAnime => r.match != null && r.match.confirmed,
    );

    if (!opts.playableOnly) return confirmed;

    // Nivel 2: sondear el embed para exigir fuentes reales.
    const flags = await mapPool(confirmed, BATCH_CONCURRENCY, (r) => ensurePlayable(r.match));
    return confirmed.filter((_, i) => flags[i]);
}

/** Versión que devuelve solo las tarjetas (para reusar la UI existente). */
export async function filterPlayableAnimeCards(
    cards: AnimeCard[],
    opts: { playableOnly?: boolean } = {},
): Promise<AnimeCard[]> {
    const resolved = await filterPlayableAnime(cards, opts);
    return resolved.map((r) => r.card);
}

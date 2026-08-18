/**
 * Proveedor Vimeus — el que ya usaba FilmiFy.
 *
 * Es el único proveedor con AUDIO ESPAÑOL LATINO, así que conserva la máxima
 * prioridad pese a ser el más caro de resolver: Vimeus se indexa por tmdb_id,
 * no por AniList id, y hay que traducir.
 *
 * La traducción va en dos pasos, del más fiable al menos:
 *   1. `mapping.ts` (dataset Fribb/anime-lists) — lookup exacto, incluye la
 *      temporada de TMDB equivalente a esta entrada de AniList. AniList crea
 *      una entrada por temporada y TMDB las agrupa, así que sin ese offset
 *      pediríamos siempre la temporada 1.
 *   2. `anime-bridge.ts` — el puente heurístico por título que existía antes.
 *      Se conserva como red de seguridad para los animes que el dataset aún no
 *      mapea (estrenos muy recientes, sobre todo).
 */

import { buildVimeusUrl } from '@/lib/vimeus-embed';
import { isAnimeAvailableOnVimeus, isSeriesAvailableOnVimeus } from '@/server/services/vimeus';
import { resolveAnimeTmdb } from '@/server/services/anime-bridge';
import { tmdbFromAnilist } from '../mapping';
import type { AnimeSource, AnimePlaybackContext, AnimeProvider } from '../types';

/** Coordenada de Vimeus para un anime de AniList. */
interface VimeusTarget {
    tmdbId: number;
    mediaType: 'tv' | 'movie';
    /** Temporada de TMDB (1 si es película o si no consta). */
    season: number;
}

/** Memoización en proceso: la resolución es estable y puede costar 2 peticiones. */
const TARGET_TTL_MS = 6 * 60 * 60 * 1000; // 6 h
const _targets = new Map<number, { at: number; target: VimeusTarget | null }>();

/**
 * Resuelve el tmdb_id (y temporada) que Vimeus necesita para un anime de
 * AniList. Devuelve null si no lo conseguimos por ninguna vía.
 */
export async function resolveVimeusTarget(
    ctx: AnimePlaybackContext,
): Promise<VimeusTarget | null> {
    const cached = _targets.get(ctx.anilistId);
    if (cached && Date.now() - cached.at < TARGET_TTL_MS) return cached.target;

    let target: VimeusTarget | null = null;

    // 1) Lookup exacto en el dataset de mapeo.
    const exact = await tmdbFromAnilist(ctx.anilistId).catch(() => null);
    if (exact) {
        target = {
            tmdbId: exact.tmdbId,
            mediaType: exact.mediaType,
            season: exact.season,
        };
    } else {
        // 2) Puente heurístico por título (comportamiento histórico).
        const fuzzy = await resolveAnimeTmdb(ctx.anilistId, {
            english: ctx.titles?.english ?? null,
            romaji: ctx.titles?.romaji ?? null,
            year: ctx.year ?? null,
        }).catch(() => null);
        if (fuzzy) {
            target = {
                tmdbId: fuzzy.tmdbId,
                mediaType: fuzzy.mediaType,
                // El puente por título no sabe de temporadas: asumimos la 1.
                season: 1,
            };
        }
    }

    _targets.set(ctx.anilistId, { at: Date.now(), target });
    return target;
}

export const vimeusProvider: AnimeProvider = {
    id: 'vimeus',
    label: 'Vimeus',

    // Sin API key el listing no responde, pero el embed sigue funcionando con
    // la view key pública, así que el proveedor sigue siendo útil.
    isEnabled: () => Boolean(process.env.NEXT_PUBLIC_VIMEUS_VIEW_KEY),

    async isAvailable(ctx) {
        const target = await resolveVimeusTarget(ctx);
        if (!target) return false;
        if (target.mediaType === 'movie') {
            return isSeriesAvailableOnVimeus(target.tmdbId).catch(() => false);
        }
        // Un anime puede estar catalogado en Vimeus como /e/anime o /e/serie.
        const asAnime = await isAnimeAvailableOnVimeus(target.tmdbId).catch(() => false);
        if (asAnime) return true;
        return isSeriesAvailableOnVimeus(target.tmdbId).catch(() => false);
    },

    async getSources(ctx: AnimePlaybackContext): Promise<AnimeSource[]> {
        const target = await resolveVimeusTarget(ctx);
        if (!target) return [];

        return [
            {
                provider: 'vimeus',
                kind: 'iframe',
                label: 'Vimeus · Latino',
                url: buildVimeusUrl(
                    target.tmdbId,
                    target.mediaType === 'movie' ? 'movie' : 'anime',
                    target.season,
                    ctx.episode,
                ),
                audio: 'latino',
                spanishSubs: true,
                priority: 100, // audio en español: siempre primero
                verified: false, // lo marca el registro tras el probe
            },
        ];
    },
};

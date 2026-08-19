/**
 * Capa de anime — punto de entrada.
 *
 * El módulo de anime es INDEPENDIENTE del de series: se identifica por id de
 * AniList, resuelve la reproducción con su propio registro de proveedores y
 * tiene su propia ruta (/anime/[id]). Nada de aquí debe depender de que un
 * anime exista como serie en TMDB.
 *
 *   catalog   → qué anime mostrar (AniList, ya filtrado y paginado)
 *   registry  → qué fuentes hay para reproducir un episodio
 *   mapping   → traducción exacta de ids (AniList ↔ TMDB ↔ MAL)
 *   episodes  → cuántos episodios ofrecer
 */

export type {
    AnimeAudio,
    AnimePlayback,
    AnimePlaybackContext,
    AnimeProvider,
    AnimeProviderId,
    AnimeSource,
    AnimeSourceKind,
} from './types';

export {
    getAnimePlayback,
    isAnimePlayable,
    filterPlayableAnimeIds,
    filterPlayableAnimeCards,
    listEnabledProviders,
} from './registry';

export { loadAnimeCatalog } from './catalog';
export type { AnimeCatalogOptions, AnimeCatalogPage } from './catalog';

export {
    tmdbFromAnilist,
    anilistFromTmdb,
    canonicalAnilistForTmdb,
    canonicalAnilistForTmdbIfWarm,
    isAnimeTmdbId,
    warmAnimeIdIndex,
} from './mapping';

export type { AnimeIdMatch } from './mapping';

export { resolveEpisodeCount } from './episodes';

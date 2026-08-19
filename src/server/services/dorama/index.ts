/**
 * Capa de doramas — punto de entrada.
 *
 * Doramas = series asiáticas de imagen real (coreanas, japonesas, chinas,
 * taiwanesas y tailandesas). La animación queda fuera a propósito: eso es
 * anime y tiene su propio módulo en `@/server/services/anime`.
 *
 *   catalog   → qué doramas existen (TMDB por país de origen)
 *   registry  → dónde se pueden ver (Vimeus, APIPlayer, KissKH)
 *
 * A diferencia del anime, aquí el id canónico es el **tmdb_id** en todas las
 * capas, así que no hay traducción de identidades en ningún punto.
 */

export type {
    DoramaAudio,
    DoramaPlayback,
    DoramaPlaybackContext,
    DoramaProvider,
    DoramaProviderId,
    DoramaSource,
    DoramaSourceKind,
} from './types';

export {
    getDoramaPlayback,
    getSeriesPlayback,
    isDoramaPlayable,
    filterPlayableDoramas,
    listEnabledDoramaProviders,
} from './registry';

export {
    DORAMA_REGIONS,
    DORAMA_COUNTRIES,
    discoverDoramas,
    loadDoramaCatalog,
    isDoramaShow,
} from './catalog';

export type {
    DoramaRegion,
    DoramaRegionId,
    DiscoverDoramasOptions,
    DoramaCatalogOptions,
    DoramaCatalogPage,
} from './catalog';

'use server';

/**
 * Server Actions del apartado de Anime.
 *
 * Dos bloques:
 *  - Descubrimiento (AniList): catálogo paginado, búsqueda en vivo y filtro
 *    por género — todo a través de una sola acción.
 *  - Reproducción: resolver las fuentes de un episodio contra el registro de
 *    proveedores. El anime NO pasa por el módulo de series: se identifica por
 *    su id de AniList de principio a fin.
 */

import { getAnimePlayback, loadAnimeCatalog } from '@/server/services/anime';
import type { AnimeCatalogOptions, AnimeCatalogPage, AnimePlayback } from '@/server/services/anime';

/**
 * Una página del catálogo: búsqueda, género o listado general.
 *
 * Es la única puerta de entrada del explorador: recorre AniList hasta juntar
 * un mínimo de títulos reproducibles y dice por dónde seguir, igual que
 * `loadMoreMovies` en películas y series.
 */
export async function animeCatalogAction(opts: AnimeCatalogOptions = {}): Promise<AnimeCatalogPage> {
    return loadAnimeCatalog({
        page: Number.isFinite(opts.page) ? opts.page : 1,
        query: typeof opts.query === 'string' ? opts.query.slice(0, 100) : null,
        genre: typeof opts.genre === 'string' ? opts.genre.slice(0, 60) : null,
    });
}

/**
 * Fuentes reproducibles de un episodio concreto, ya ordenadas (español
 * primero, verificadas antes que las que no se pueden comprobar).
 *
 * El reproductor la llama cada vez que el usuario cambia de episodio: las
 * URLs de los proveedores llevan el número de episodio dentro, así que no se
 * pueden derivar en cliente sin duplicar aquí la lógica del registro.
 */
export async function getAnimeSourcesAction(
    anilistId: number,
    episode: number,
    titles?: { english?: string | null; romaji?: string | null },
    year?: number | null,
): Promise<AnimePlayback> {
    if (!Number.isFinite(anilistId) || anilistId <= 0) {
        return { sources: [], hasVerifiedSource: false };
    }
    const ep = Number.isFinite(episode) && episode > 0 ? Math.floor(episode) : 1;
    return getAnimePlayback({ anilistId, episode: ep, titles, year });
}

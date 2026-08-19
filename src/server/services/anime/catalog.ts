/**
 * Catálogo paginado de anime.
 *
 * AniList tiene miles de títulos, pero solo una parte es reproducible en
 * FilmiFy, y la sonda de disponibilidad va título a título. Si se pidiera una
 * sola página de AniList y se filtrara, la grilla quedaría rala y sin forma de
 * seguir cargando.
 *
 * Este módulo hace lo mismo que `loadMoreMovies` para películas y series:
 * recorre páginas de origen hasta juntar un mínimo de títulos DISPONIBLES y
 * devuelve por dónde seguir. Así /anime se navega igual que /browse.
 */

import { getPopularAnime, searchAnime, getAnimeByGenre } from '@/server/services/anilist';
import { filterPlayableAnimeCards } from './registry';
import type { AnimeCard } from '@/lib/anilist/types';

/** Página de origen de AniList (su máximo por consulta es 50). */
const SOURCE_PER_PAGE = 50;
/** Mínimo de títulos DISPONIBLES que devuelve cada carga. */
const MIN_RESULTS = 24;
/** Tope de páginas de AniList por carga (evita bucles si quedan pocas). */
const MAX_SCAN_PAGES = 4;
/** Los listados paginados de AniList no pasan de 5000 títulos. */
const MAX_SOURCE_PAGE = Math.ceil(5000 / SOURCE_PER_PAGE);

export interface AnimeCatalogOptions {
    /** Página de AniList desde la que empezar a acumular. */
    page?: number;
    /** Búsqueda libre. Tiene prioridad sobre el género. */
    query?: string | null;
    /** Género de AniList (en inglés, tal como los devuelve su API). */
    genre?: string | null;
}

export interface AnimeCatalogPage {
    items: AnimeCard[];
    /** Próxima página de AniList a consumir en la siguiente carga. */
    nextPage: number;
    /** Si quedan más páginas por explorar. */
    hasMore: boolean;
}

/** Trae una página cruda de AniList según el modo activo. */
function fetchRawPage(opts: AnimeCatalogOptions, page: number): Promise<AnimeCard[]> {
    const query = opts.query?.trim();
    if (query) return searchAnime(query, SOURCE_PER_PAGE, page);
    if (opts.genre) return getAnimeByGenre(opts.genre, SOURCE_PER_PAGE, page);
    return getPopularAnime(SOURCE_PER_PAGE, page);
}

/**
 * Acumula anime REPRODUCIBLE recorriendo páginas de AniList hasta juntar al
 * menos MIN_RESULTS (o agotar el tope de escaneo).
 */
export async function loadAnimeCatalog(opts: AnimeCatalogOptions = {}): Promise<AnimeCatalogPage> {
    let page = Math.max(1, Math.min(MAX_SOURCE_PAGE, Math.floor(opts.page ?? 1)));

    const seen = new Set<number>();
    const acc: AnimeCard[] = [];
    let scanned = 0;
    let exhausted = false;

    while (acc.length < MIN_RESULTS && scanned < MAX_SCAN_PAGES) {
        let raw: AnimeCard[] = [];
        try {
            raw = await fetchRawPage(opts, page);
        } catch (error) {
            console.error('[loadAnimeCatalog] AniList error:', error);
            exhausted = true;
            break;
        }

        if (raw.length === 0) {
            exhausted = true;
            page += 1;
            break;
        }

        let playable: AnimeCard[] = [];
        try {
            playable = await filterPlayableAnimeCards(raw);
        } catch (error) {
            console.error('[loadAnimeCatalog] availability filter error:', error);
            playable = raw; // fail-open: mejor mostrar de más que vaciar la sección
        }

        for (const item of playable) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                acc.push(item);
            }
        }

        scanned += 1;
        page += 1;

        // AniList no pagina más allá de su tope, y una página corta significa
        // que se acabó el listado.
        if (raw.length < SOURCE_PER_PAGE || page > MAX_SOURCE_PAGE) {
            exhausted = true;
            break;
        }
    }

    // Sin red de seguridad que devuelva la página sin filtrar: si un título no
    // está confirmado, su ficha tampoco lo estará. El margen ante fallos de
    // infraestructura ya lo da `isAnimePlayable`, que degrada abierto solo
    // cuando la sonda no puede pronunciarse (5xx, timeout).
    return { items: acc, nextPage: page, hasMore: !exhausted };
}

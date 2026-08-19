/**
 * Catálogo de doramas — construido sobre TMDB.
 *
 * No hace falta una base de datos externa como AniList: los doramas ya son
 * series de TMDB y se identifican por su país de origen. Eso da metadatos en
 * español, imágenes, reparto y sinopsis sin añadir una sola dependencia, y el
 * mismo tmdb_id que usan Vimeus y APIPlayer para reproducir.
 *
 * ⚠️ La animación se excluye SIEMPRE. Sin ese filtro, "series japonesas" trae
 * medio catálogo de anime, que tiene su propio módulo en /anime y su propio
 * registro de proveedores. Un título no debe aparecer en las dos secciones.
 */

import { discoverTVBy } from '@/server/services/tmdb';
import { filterPlayableDoramas } from './registry';
import type { PaginatedResponse, TVShow } from '@/types/tmdb';

/** Género "Animation" de TMDB. Se excluye para no solapar con /anime. */
const ANIMATION_GENRE_ID = 16;

export type DoramaRegionId = 'kr' | 'jp' | 'cn' | 'th';

export interface DoramaRegion {
    id: DoramaRegionId;
    /** Etiqueta en español para la UI. */
    label: string;
    /** Códigos ISO 3166-1 de TMDB. */
    countries: string[];
}

export const DORAMA_REGIONS: Record<DoramaRegionId, DoramaRegion> = {
    kr: { id: 'kr', label: 'Coreanos', countries: ['KR'] },
    jp: { id: 'jp', label: 'Japoneses', countries: ['JP'] },
    // China continental, Taiwán y Hong Kong se agrupan: el público los busca
    // junto como "c-dramas".
    cn: { id: 'cn', label: 'Chinos', countries: ['CN', 'TW', 'HK'] },
    th: { id: 'th', label: 'Tailandeses', countries: ['TH'] },
};

/** Todos los países que consideramos dorama. */
export const DORAMA_COUNTRIES: string[] = Object.values(DORAMA_REGIONS)
    .flatMap((r) => r.countries);

export interface DiscoverDoramasOptions {
    region?: DoramaRegionId;
    page?: number;
    sortBy?: 'popularity.desc' | 'vote_average.desc' | 'first_air_date.desc';
    /** Mínimo de votos: evita que el "mejor valorados" se llene de rarezas con 3 votos. */
    minVotes?: number;
}

/**
 * Descubre doramas por región. Sin región, busca en todas a la vez.
 */
export async function discoverDoramas(
    opts: DiscoverDoramasOptions = {},
): Promise<PaginatedResponse<TVShow>> {
    const countries = opts.region
        ? DORAMA_REGIONS[opts.region].countries
        : DORAMA_COUNTRIES;

    return discoverTVBy({
        page: opts.page,
        sortBy: opts.sortBy ?? 'popularity.desc',
        // '|' es OR en la API de TMDB.
        originCountry: countries.join('|'),
        withoutGenres: ANIMATION_GENRE_ID,
        voteCountGte: opts.minVotes,
    });
}

/**
 * ¿Esta serie es un dorama?
 *
 * Se usa para decidir si una ficha de /tv pertenece en realidad al módulo de
 * doramas. Trabaja sobre datos que la página ya tiene, así que no cuesta
 * ninguna petición extra.
 */
export function isDoramaShow(
    show: Pick<TVShow, 'origin_country' | 'genre_ids'> & { genres?: { id: number }[] },
): boolean {
    const countries = Array.isArray(show.origin_country) ? show.origin_country : [];
    if (!countries.some((c) => DORAMA_COUNTRIES.includes(c))) return false;

    // La animación es anime: tiene su propio módulo.
    const genreIds = [
        ...(Array.isArray(show.genre_ids) ? show.genre_ids : []),
        ...((show.genres ?? []).map((g) => g.id)),
    ];
    if (genreIds.includes(ANIMATION_GENRE_ID)) return false;

    return true;
}

// ── Catálogo paginado ─────────────────────────────────────────────────────────

/** Mínimo de títulos DISPONIBLES que devuelve cada carga. */
const MIN_RESULTS = 24;
/**
 * Tope de páginas de TMDB a escanear por carga.
 *
 * Alto a propósito: la disponibilidad real de doramas ronda el 20-30 % de
 * cada página, así que con pocas páginas la grilla sale a medias. Cada página
 * son 20 sondas con concurrencia 8, y el resultado queda cacheado 2 h.
 */
const MAX_SCAN_PAGES = 8;
/** Límite duro de TMDB. */
const MAX_TMDB_PAGE = 500;

export interface DoramaCatalogOptions {
    region?: DoramaRegionId | null;
    /** Página de TMDB desde la que empezar a acumular. */
    page?: number;
}

export interface DoramaCatalogPage {
    items: TVShow[];
    /** Próxima página de TMDB a consumir en la siguiente carga. */
    nextPage: number;
    /** Si quedan más páginas por explorar. */
    hasMore: boolean;
}

/**
 * Acumula doramas REPRODUCIBLES recorriendo páginas de TMDB hasta juntar al
 * menos MIN_RESULTS (o agotar el tope de escaneo).
 *
 * TMDB tiene decenas de miles de series asiáticas, pero el filtro de
 * disponibilidad descarta buena parte de cada página: con una sola página la
 * grilla quedaría a medias. Mismo criterio que `loadMoreMovies` en /browse,
 * para que los dos módulos se naveguen igual.
 */
export async function loadDoramaCatalog(
    opts: DoramaCatalogOptions = {},
): Promise<DoramaCatalogPage> {
    let page = Math.max(1, Math.min(MAX_TMDB_PAGE, Math.floor(opts.page ?? 1)));

    const seen = new Set<number>();
    const acc: TVShow[] = [];
    let scanned = 0;
    let exhausted = false;

    while (acc.length < MIN_RESULTS && scanned < MAX_SCAN_PAGES) {
        let data: PaginatedResponse<TVShow> | null = null;
        try {
            data = await discoverDoramas({
                region: opts.region ?? undefined,
                page,
                sortBy: 'popularity.desc',
            });
        } catch (error) {
            console.error('[loadDoramaCatalog] TMDB error:', error);
            exhausted = true;
            break;
        }

        const raw = data?.results ?? [];
        if (raw.length === 0) {
            exhausted = true;
            page += 1;
            break;
        }

        let playable: TVShow[] = [];
        try {
            playable = await filterPlayableDoramas(raw);
        } catch (error) {
            console.error('[loadDoramaCatalog] availability filter error:', error);
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

        const lastPage = Math.min(data?.total_pages ?? MAX_TMDB_PAGE, MAX_TMDB_PAGE);
        if (page > lastPage) {
            exhausted = true;
            break;
        }
    }

    // Aquí NO hay red de seguridad que devuelva la página sin filtrar: la
    // ficha de /tv/[id] hace notFound() cuando ningún proveedor tiene el
    // título, así que rellenar la grilla con lo no verificado solo produce
    // tarjetas que llevan a un 404.
    return { items: acc, nextPage: page, hasMore: !exhausted };
}

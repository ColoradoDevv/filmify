'use server';

/**
 * Server Actions del catálogo de doramas.
 *
 * Solo descubrimiento: la reproducción va por `@/app/actions/series`, porque
 * un dorama es una serie de TMDB y comparte reproductor con el resto de /tv.
 */

import { DORAMA_REGIONS, loadDoramaCatalog } from '@/server/services/dorama';
import type { DoramaCatalogPage, DoramaRegionId } from '@/server/services/dorama';

const REGION_IDS = Object.keys(DORAMA_REGIONS) as DoramaRegionId[];

function toRegion(value: unknown): DoramaRegionId | null {
    return typeof value === 'string' && (REGION_IDS as string[]).includes(value)
        ? (value as DoramaRegionId)
        : null;
}

/**
 * Una página del catálogo de doramas, ya filtrada a lo reproducible.
 *
 * La región llega del cliente, así que se valida contra la lista conocida en
 * lugar de pasarla tal cual a la consulta de TMDB.
 */
export async function doramaCatalogAction(
    opts: { region?: string | null; page?: number } = {},
): Promise<DoramaCatalogPage> {
    return loadDoramaCatalog({
        region: toRegion(opts.region),
        page: Number.isFinite(opts.page) ? opts.page : 1,
    });
}

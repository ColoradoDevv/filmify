'use server';

/**
 * Fuentes de reproducción de una serie.
 *
 * El reproductor de series ya no depende de un único proveedor: resuelve
 * contra el registro (Vimeus + APIPlayer, y KissKH si está activado). Como las
 * URLs de cada proveedor llevan la temporada y el episodio dentro, hay que
 * volver a pedirlas cada vez que el usuario cambia de episodio.
 *
 * Vale para cualquier serie, no solo doramas: el registro trabaja con
 * tmdb_id y los proveedores que no tengan el título simplemente no devuelven
 * nada.
 */

import { getSeriesPlayback } from '@/server/services/dorama';
import type { DoramaPlayback } from '@/server/services/dorama';

export async function getSeriesSourcesAction(
    tmdbId: number,
    season: number,
    episode: number,
    titles?: { name?: string | null; originalName?: string | null },
): Promise<DoramaPlayback> {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
        return { sources: [], hasVerifiedSource: false, subtitleLanguages: [] };
    }
    return getSeriesPlayback({
        tmdbId,
        season: Number.isFinite(season) && season > 0 ? Math.floor(season) : 1,
        episode: Number.isFinite(episode) && episode > 0 ? Math.floor(episode) : 1,
        titles,
    });
}

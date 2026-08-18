/**
 * Cuántos episodios ofrecer en el selector del reproductor.
 *
 * AniList no siempre sabe el total: en las series en emisión `episodes` llega
 * a null y lo único fiable es `nextAiringEpisode.episode`, que indica el
 * PRÓXIMO por emitir (así que ya emitidos = ese número − 1).
 */

import type { AniListAnime } from '@/lib/anilist/types';

/** Tope defensivo: evita pintar miles de botones si un dato viene corrupto. */
const MAX_EPISODES = 2_000;

export function resolveEpisodeCount(anime: Pick<AniListAnime, 'episodes' | 'nextAiringEpisode' | 'format'>): number {
    // Películas, especiales y música: un solo "episodio".
    if (anime.format === 'MOVIE' || anime.format === 'MUSIC') return 1;

    const airing = anime.nextAiringEpisode?.episode;
    if (typeof airing === 'number' && airing > 1) {
        // En emisión: los ya disponibles son los anteriores al próximo.
        return Math.min(airing - 1, MAX_EPISODES);
    }

    if (typeof anime.episodes === 'number' && anime.episodes > 0) {
        return Math.min(anime.episodes, MAX_EPISODES);
    }

    // Sin datos: ofrecemos el primero para que al menos se pueda intentar.
    return 1;
}

/**
 * Proveedor Vimeus para doramas.
 *
 * Es el único con AUDIO ESPAÑOL LATINO, así que encabeza el orden pese a
 * tener la cobertura más baja: medido sobre 22 doramas, 6/22 (27 %). Fuerte
 * en los K-dramas más mainstream (Squid Game, Crash Landing on You, Queen of
 * Tears, Lovely Runner) y prácticamente ausente en chino, tailandés y
 * catálogo anterior a 2016.
 *
 * A diferencia del módulo de anime, aquí no hay traducción de ids: los
 * doramas son series de TMDB y Vimeus se indexa por tmdb_id, así que el
 * contexto ya trae todo lo necesario.
 */

import { buildVimeusUrl } from '@/lib/vimeus-embed';
import { isSeriesAvailableOnVimeus } from '@/server/services/vimeus';
import type { DoramaPlaybackContext, DoramaProvider, DoramaSource } from '../types';

export const vimeusDoramaProvider: DoramaProvider = {
    id: 'vimeus',
    label: 'Vimeus',

    // El embed necesita la view key pública; sin ella no hay nada que ofrecer.
    isEnabled: () => Boolean(process.env.NEXT_PUBLIC_VIMEUS_VIEW_KEY),

    async isAvailable(ctx) {
        return isSeriesAvailableOnVimeus(ctx.tmdbId).catch(() => null);
    },

    async getSources(ctx: DoramaPlaybackContext): Promise<DoramaSource[]> {
        return [
            {
                provider: 'vimeus',
                kind: 'iframe',
                label: 'Vimeus · Latino',
                url: buildVimeusUrl(ctx.tmdbId, 'tv', ctx.season, ctx.episode),
                audio: 'latino',
                // El embed no expone su lista de pistas; sabemos que sirve
                // español porque es su propuesta de valor, no por enumeración.
                subtitleLanguages: [],
                spanishSubs: true,
                priority: 100, // audio en español: siempre primero
                verified: false, // lo marca el registro
            },
        ];
    },
};

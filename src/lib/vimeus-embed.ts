/**
 * Construcción de URLs del embed de Vimeus — compartido entre el reproductor
 * normal (VideoPlayer) y el de Watch Party (PartyPlayer).
 */

const VIMEUS_VIEW_KEY = process.env.NEXT_PUBLIC_VIMEUS_VIEW_KEY ?? '';

// Personalización del player (según docs de Vimeus): tema + color de marca.
const VIMEUS_STYLE = 'title=Filmify&theme=vimeus&primary_color=00c2ff&fs=1&autoplay=1';

export function buildVimeusUrl(
    mediaId: number,
    mediaType: 'movie' | 'tv',
    season = 1,
    episode = 1,
): string {
    const base = 'https://vimeus.com/e';
    const vk = `view_key=${VIMEUS_VIEW_KEY}`;
    if (mediaType === 'movie') {
        return `${base}/movie?tmdb=${mediaId}&${vk}&${VIMEUS_STYLE}`;
    }
    return `${base}/serie?tmdb=${mediaId}&se=${season}&ep=${episode}&${vk}&${VIMEUS_STYLE}`;
}

/**
 * Proveedores de reproducción en cascada — Filmify.
 *
 * Vimeus sigue siendo el proveedor inicial (prioridad 0). Si su respuesta
 * indica caída o falta de contenido, el reproductor avanza automáticamente
 * al siguiente proveedor: VidAPI → VidCore → VidSrc → … y así
 * consecutivamente hasta agotar la lista.
 *
 * Este módulo es seguro para el cliente (solo construye URLs, no usa claves
 * privadas). La view_key de Vimeus es pública (NEXT_PUBLIC_*) y se inyecta
 * vía contexto. La comprobación de salud vive en `@/app/actions/playback`.
 */

export type PlaybackProviderId =
    | 'vimeus'
    | 'vidapi'
    | 'vidcore'
    | 'vidsrc'
    | 'unlimplay'
    | 'vidlink'
    | 'embedsu'
    | 'superembed'
    | '2embed'
    | 'autoembed'
    | 'rivestream';

export type PlaybackMediaType = 'movie' | 'tv' | 'anime';

export interface PlaybackContext {
    tmdbId: number;
    mediaType: PlaybackMediaType;
    season?: number;
    episode?: number;
    /** View key pública de Vimeus (NEXT_PUBLIC_VIMEUS_VIEW_KEY). */
    viewKey?: string;
}

export interface PlaybackSource {
    id: PlaybackProviderId;
    /** Etiqueta corta para el selector de servidor. */
    label: string;
    lang: 'lat' | 'es' | 'en';
    url: string;
}

/**
 * Orden de la cascada. Vimeus primero por contrato; el resto por
 * fiabilidad observada + soporte de audio latino/subtítulos ES.
 */
export const PROVIDER_ORDER: PlaybackProviderId[] = [
    'vimeus',
    'vidapi',
    'vidcore',
    'vidsrc',
    'unlimplay',
    'vidlink',
    'embedsu',
    'superembed',
    '2embed',
    'autoembed',
    'rivestream',
];

export const PROVIDER_LABELS: Record<PlaybackProviderId, string> = {
    vimeus: 'Vimeus',
    vidapi: 'VidAPI',
    vidcore: 'VidCore',
    vidsrc: 'VidSrc',
    unlimplay: 'Latino',
    vidlink: 'VidLink',
    embedsu: 'Embed.su',
    superembed: 'SuperEmbed',
    '2embed': '2Embed',
    autoembed: 'AutoEmbed',
    rivestream: 'Rivestream',
};

/** Hosts de cada proveedor (para allowlists y validación de postMessage). */
export const PROVIDER_HOSTS: Record<PlaybackProviderId, string[]> = {
    vimeus: ['vimeus.com'],
    vidapi: ['vaplayer.ru'],
    vidcore: ['vidcore.org'],
    vidsrc: ['vsembed.su', 'vidsrcme.su', 'vid-src.top', 'vidsrc.tw'],
    unlimplay: ['unlimplay.com'],
    vidlink: ['vidlink.pro'],
    embedsu: ['embed.su'],
    superembed: ['multiembed.mov'],
    '2embed': ['www.2embed.cc', '2embed.cc'],
    autoembed: ['autoembed.co'],
    rivestream: ['watch.rivestream.app'],
};

const VIMEUS_STYLE = 'title=Filmify&theme=vimeus&primary_color=00c2ff&fs=1&autoplay=1';

function vimeusUrl(ctx: PlaybackContext): string | null {
    if (!ctx.viewKey) return null;
    const vk = `view_key=${ctx.viewKey}`;
    if (ctx.mediaType === 'movie') {
        return `https://vimeus.com/e/movie?tmdb=${ctx.tmdbId}&${vk}&${VIMEUS_STYLE}`;
    }
    const endpoint = ctx.mediaType === 'anime' ? 'anime' : 'serie';
    const se = `&se=${ctx.season ?? 1}&ep=${ctx.episode ?? 1}`;
    return `https://vimeus.com/e/${endpoint}?tmdb=${ctx.tmdbId}&${vk}&${VIMEUS_STYLE}${se}`;
}

function vidapiUrl(ctx: PlaybackContext): string {
    const q = 'ds_lang=es&autoplay=1';
    if (ctx.mediaType === 'movie') {
        return `https://vaplayer.ru/embed/movie/${ctx.tmdbId}?${q}`;
    }
    // VidAPI trata anime como serie (ruta /tv).
    return `https://vaplayer.ru/embed/tv/${ctx.tmdbId}/${ctx.season ?? 1}/${ctx.episode ?? 1}?${q}`;
}

function vidcoreUrl(ctx: PlaybackContext): string {
    const q = 'lang=es&autoplay=true';
    if (ctx.mediaType === 'movie') {
        return `https://vidcore.org/embed/movie/${ctx.tmdbId}?${q}`;
    }
    return `https://vidcore.org/embed/tv/${ctx.tmdbId}/${ctx.season ?? 1}/${ctx.episode ?? 1}?${q}`;
}

function vidsrcUrl(ctx: PlaybackContext): string {
    const q = 'ds_lang=es';
    if (ctx.mediaType === 'movie') {
        return `https://vsembed.su/embed/movie/${ctx.tmdbId}?${q}`;
    }
    return `https://vsembed.su/embed/tv/${ctx.tmdbId}/${ctx.season ?? 1}/${ctx.episode ?? 1}?${q}`;
}

function unlimplayUrl(ctx: PlaybackContext): string {
    if (ctx.mediaType === 'movie') {
        return `https://unlimplay.com/play/embed/movie/${ctx.tmdbId}`;
    }
    return `https://unlimplay.com/play/embed/tv/${ctx.tmdbId}/${ctx.season ?? 1}/${ctx.episode ?? 1}`;
}

function vidlinkUrl(ctx: PlaybackContext): string {
    if (ctx.mediaType === 'movie') {
        return `https://vidlink.pro/movie/${ctx.tmdbId}`;
    }
    return `https://vidlink.pro/tv/${ctx.tmdbId}/${ctx.season ?? 1}/${ctx.episode ?? 1}`;
}

function embedsuUrl(ctx: PlaybackContext): string {
    if (ctx.mediaType === 'movie') {
        return `https://embed.su/embed/movie/${ctx.tmdbId}`;
    }
    return `https://embed.su/embed/tv/${ctx.tmdbId}/${ctx.season ?? 1}/${ctx.episode ?? 1}`;
}

function superembedUrl(ctx: PlaybackContext): string {
    if (ctx.mediaType === 'movie') {
        return `https://multiembed.mov/?video_id=${ctx.tmdbId}&tmdb=1`;
    }
    return `https://multiembed.mov/?video_id=${ctx.tmdbId}&tmdb=1&s=${ctx.season ?? 1}&e=${ctx.episode ?? 1}`;
}

function twoEmbedUrl(ctx: PlaybackContext): string {
    if (ctx.mediaType === 'movie') {
        return `https://www.2embed.cc/embed/${ctx.tmdbId}`;
    }
    return `https://www.2embed.cc/embedtv/${ctx.tmdbId}&s=${ctx.season ?? 1}&e=${ctx.episode ?? 1}`;
}

function autoembedUrl(ctx: PlaybackContext): string {
    if (ctx.mediaType === 'movie') {
        return `https://autoembed.co/movie/tmdb/${ctx.tmdbId}`;
    }
    return `https://autoembed.co/tv/tmdb/${ctx.tmdbId}-${ctx.season ?? 1}-${ctx.episode ?? 1}`;
}

function rivestreamUrl(ctx: PlaybackContext): string {
    if (ctx.mediaType === 'movie') {
        return `https://watch.rivestream.app/embed?type=movie&id=${ctx.tmdbId}`;
    }
    return `https://watch.rivestream.app/embed?type=tv&id=${ctx.tmdbId}&season=${ctx.season ?? 1}&episode=${ctx.episode ?? 1}`;
}

const BUILDERS: Record<PlaybackProviderId, (ctx: PlaybackContext) => string | null> = {
    vimeus: vimeusUrl,
    vidapi: vidapiUrl,
    vidcore: vidcoreUrl,
    vidsrc: vidsrcUrl,
    unlimplay: unlimplayUrl,
    vidlink: vidlinkUrl,
    embedsu: embedsuUrl,
    superembed: superembedUrl,
    '2embed': twoEmbedUrl,
    autoembed: autoembedUrl,
    rivestream: rivestreamUrl,
};

const LANGS: Record<PlaybackProviderId, PlaybackSource['lang']> = {
    vimeus: 'lat',
    vidapi: 'es',
    vidcore: 'es',
    vidsrc: 'es',
    unlimplay: 'lat',
    vidlink: 'es',
    embedsu: 'es',
    superembed: 'lat',
    '2embed': 'es',
    autoembed: 'es',
    rivestream: 'es',
};

/**
 * Construye la lista ordenada de fuentes para un título. Si falta la
 * view_key, Vimeus se omite (la cascada empieza en VidAPI).
 */
export function buildPlaybackSources(ctx: PlaybackContext): PlaybackSource[] {
    const sources: PlaybackSource[] = [];
    for (const id of PROVIDER_ORDER) {
        const url = BUILDERS[id](ctx);
        if (!url) continue;
        sources.push({ id, label: PROVIDER_LABELS[id], lang: LANGS[id], url });
    }
    return sources;
}

/** Comprueba si un origin de postMessage pertenece a algún proveedor. */
export function isProviderOrigin(origin: string): boolean {
    try {
        const host = new URL(origin).hostname.toLowerCase();
        return Object.values(PROVIDER_HOSTS).some((hosts) =>
            hosts.some((h) => host === h || host.endsWith(`.${h}`)),
        );
    } catch {
        return false;
    }
}

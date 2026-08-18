/**
 * Contratos de la capa de proveedores de anime.
 *
 * El módulo de anime es independiente del de series: se identifica por
 * `anilistId` (no por tmdb_id) y la reproducción se resuelve consultando a
 * varios proveedores en paralelo. Cada proveedor sabe traducir un anime de
 * AniList a una URL reproducible; el registro (`registry.ts`) decide el orden
 * y agrega los resultados.
 */

/** Pista de audio/subtítulo que ofrece una fuente. */
export type AnimeAudio =
    /** Audio español latino (Vimeus). */
    | 'latino'
    /** Audio japonés con subtítulos (incluye español cuando `spanishSubs`). */
    | 'sub'
    /** Audio inglés doblado. */
    | 'dub';

export type AnimeProviderId =
    | 'vimeus'
    | 'megaplay'
    | 'animeplayer'
    | 'vidlink'
    | 'anime1v';

/**
 * Cómo se reproduce una fuente:
 *  - `iframe`: el proveedor sirve su propio reproductor (Vimeus, MegaPlay…).
 *  - `hls`: el proveedor devuelve un .m3u8 y lo reproducimos NOSOTROS con
 *    hls.js a través de `/api/stream`, igual que hace la TV en vivo. Solo lo
 *    usan los agregadores self-hosted (anime1v).
 */
export type AnimeSourceKind = 'iframe' | 'hls';

/** Una fuente concreta lista para reproducir. */
export interface AnimeSource {
    provider: AnimeProviderId;
    kind: AnimeSourceKind;
    /** Etiqueta para la pestaña del selector de servidor, en español. */
    label: string;
    /** URL del iframe (kind 'iframe') o del manifiesto .m3u8 (kind 'hls'). */
    url: string;
    audio: AnimeAudio;
    /**
     * true si el proveedor sirve subtítulos en español (castellano o latino).
     * Verificado con peticiones reales, no declarado por el proveedor.
     */
    spanishSubs: boolean;
    /** Mayor = se ofrece antes. Ver ORDEN en registry.ts. */
    priority: number;
    /**
     * true si la disponibilidad se confirmó en servidor. Cuando es false la
     * fuente se ofrece igual, pero el cliente debe estar listo para un fallo
     * de carga y saltar al siguiente servidor.
     */
    verified: boolean;
}

/** Datos con los que el registro resuelve una reproducción. */
export interface AnimePlaybackContext {
    anilistId: number;
    /** Episodio a reproducir (1-indexado). */
    episode: number;
    /**
     * Títulos del anime. Solo los necesitan los proveedores que NO indexan por
     * AniList (hoy: anime1v, que busca por título en sitios hispanos).
     */
    titles?: {
        english?: string | null;
        romaji?: string | null;
    };
    /** Año de estreno — desambigua búsquedas por título. */
    year?: number | null;
}

/**
 * Un proveedor de reproducción de anime.
 *
 * `isAvailable` devuelve `null` cuando el proveedor no puede comprobarlo desde
 * el servidor (por ejemplo, los que sirven una SPA idéntica exista o no el
 * anime). En ese caso la fuente se ofrece como no verificada.
 */
export interface AnimeProvider {
    id: AnimeProviderId;
    /** Nombre visible en el selector de servidor. */
    label: string;
    /** false desactiva el proveedor sin borrar su código (falta config, caído…). */
    isEnabled(): boolean;
    /** true/false si se puede determinar en servidor; null si no. */
    isAvailable(ctx: AnimePlaybackContext): Promise<boolean | null>;
    /** Fuentes que este proveedor puede ofrecer para el contexto dado. */
    getSources(ctx: AnimePlaybackContext): Promise<AnimeSource[]>;
}

/** Resultado agregado que consume la UI. */
export interface AnimePlayback {
    sources: AnimeSource[];
    /** true si al menos una fuente fue verificada en servidor. */
    hasVerifiedSource: boolean;
}

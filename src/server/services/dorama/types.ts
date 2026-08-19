/**
 * Contratos de la capa de doramas (series asiáticas: coreanas, japonesas,
 * chinas, taiwanesas y tailandesas).
 *
 * Diferencia clave con el módulo de anime: aquí el id canónico es el
 * **tmdb_id**, no un id de catálogo externo. Los doramas ya son series de
 * TMDB, y tanto Vimeus como APIPlayer se indexan por tmdb_id, así que no hace
 * falta ningún puente de identidades como el que necesita AniList. El precio
 * es que comparten espacio de ids con /tv, lo que obliga a decidir dónde vive
 * cada ficha (ver el README del módulo).
 */

/** Naturaleza de la pista que ofrece una fuente. */
export type DoramaAudio =
    /** Audio español latino (Vimeus). */
    | 'latino'
    /** Audio original con subtítulos. */
    | 'sub';

export type DoramaProviderId = 'vimeus' | 'apiplayer' | 'kisskh';

/** Cómo se reproduce una fuente. Hoy todas son iframe; se deja abierto. */
export type DoramaSourceKind = 'iframe' | 'hls';

/** Una fuente concreta lista para reproducir. */
export interface DoramaSource {
    provider: DoramaProviderId;
    kind: DoramaSourceKind;
    /** Etiqueta del selector de servidor, en español. */
    label: string;
    url: string;
    audio: DoramaAudio;
    /**
     * Idiomas de subtítulo detectados en la fuente, tal y como los nombra el
     * proveedor. Vacío si no se pueden enumerar. Permite decirle al usuario
     * qué va a encontrar ANTES de darle al play.
     */
    subtitleLanguages: string[];
    /** true si `subtitleLanguages` incluye español. */
    spanishSubs: boolean;
    /** Mayor = se ofrece antes. Ver ORDEN en registry.ts. */
    priority: number;
    /** true si la disponibilidad se confirmó en servidor. */
    verified: boolean;
}

/** Datos con los que el registro resuelve una reproducción. */
export interface DoramaPlaybackContext {
    tmdbId: number;
    season: number;
    episode: number;
    /** Título original y en español — solo lo necesita KissKH, que busca por texto. */
    titles?: {
        name?: string | null;
        originalName?: string | null;
    };
    year?: number | null;
}

export interface DoramaProvider {
    id: DoramaProviderId;
    label: string;
    isEnabled(): boolean;
    /** true/false si se puede determinar en servidor; null si no. */
    isAvailable(ctx: DoramaPlaybackContext): Promise<boolean | null>;
    getSources(ctx: DoramaPlaybackContext): Promise<DoramaSource[]>;
}

export interface DoramaPlayback {
    sources: DoramaSource[];
    hasVerifiedSource: boolean;
    /** Unión de idiomas de subtítulo de todas las fuentes. */
    subtitleLanguages: string[];
}

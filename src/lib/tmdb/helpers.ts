const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// ── Tipos de tamaño según tipo de imagen (documentación TMDB) ────────────────
type PosterSize   = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
type ProfileSize  = 'w45' | 'w185' | 'h632' | 'original';
type LogoSize     = 'w45' | 'w92' | 'w154' | 'w185' | 'w300' | 'w500' | 'original';

type ImageSize = PosterSize | BackdropSize | ProfileSize | LogoSize;

/**
 * Construye una URL de imagen de TMDB con el tamaño especificado.
 * Si la ruta es inválida, devuelve un placeholder genérico.
 */
export function getImageUrl(
    path: string | null | undefined,
    size: ImageSize = 'original',
): string {
    if (!path) return '/no-image.svg';
    return `${IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * URL del póster.
 * @returns string | null — útil para lógica condicional (ej. `posterUrl ?? fallback`).
 */
export function getPosterUrl(
    path: string | null | undefined,
    size: PosterSize = 'w500',
): string | null {
    if (!path) return null;
    return `${IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * URL del backdrop (fondo).
 * Siempre devuelve un string — si no hay imagen, placeholder genérico.
 */
export function getBackdropUrl(
    path: string | null | undefined,
    size: BackdropSize = 'w1280',
): string {
    if (!path) return '/no-image.svg';
    return `${IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * URL de foto de perfil (elenco / crew).
 * Siempre devuelve un string con fallback.
 */
export function getProfileUrl(
    path: string | null | undefined,
    size: ProfileSize = 'w185',
): string {
    if (!path) return '/no-image.svg';
    return `${IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * URL de logo (networks, compañías).
 * Siempre devuelve un string con fallback.
 */
export function getLogoUrl(
    path: string | null | undefined,
    size: LogoSize = 'w154',
): string {
    if (!path) return '/no-image.svg';
    return `${IMAGE_BASE_URL}/${size}${path}`;
}
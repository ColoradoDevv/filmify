import { headers, cookies } from 'next/headers';

/** Cookie para forzar el modo TV en cualquier dispositivo */
export const TV_MODE_COOKIE = 'filmify_tv_mode';

// ── Lista de palabras clave de TV (normalizada) ─────────────────────────────
const TV_KEYWORDS = new Set([
    // Sistemas operativos y plataformas
    'tizen', 'webos', 'web0s', 'vidaa', 'android tv', 'google tv', 'googletv',
    'fire tv', 'firetv', 'appletv', 'roku', 'viera', 'netcast', 'nettv',
    'smarttv', 'smart-tv', 'hbbtv', 'smart tv', 'sonybravia', 'bravia',
    // Fabricantes
    'philips', 'hisense', 'tcltv', 'panasonic', 'samsung', 'lg tv',
    'sony tv', 'philips tv', 'hisense tv', 'tcl tv', 'panasonic tv',
    'aoc tv', 'hyundai tv', 'jvc tv', 'noblex', 'rca tv', 'sanyo tv',
    'sharp tv', 'toshiba tv', 'hitachi tv', 'pioneer tv', 'grundig',
    'vestel', 'telefunken', 'blaupunkt', 'ok.', 'loewe', 'bang & olufsen',
    'technicolor', 'thomson', 'medion', 'infinix tv', 'itel tv', 'realme tv',
    // Cajas IPTV / STB
    'mag25', 'mag32', 'mag35', 'mag42', 'mag52', 'mag200', 'mag250', 'mag254',
    'mag256', 'mag322', 'mag349', 'mag351', 'mag410', 'mag420', 'mag520',
    'stbapp', 'qtembedded',
    'formuler', 'buzz tv',
    'dreamlink', 'dreambox', 'vu+', 'zgemma', 'amiko', 'edision',
    'octagon', 'gigablue', 'xtrend', 'technomate', 'starsat', 'qviart',
    'mutant hd', 'axas', 'venton', 'ixuss', 'openbox', 'skybox',
    'freesky', 'duosat', 'tocom', 'azamerica', 'athomics', 'meoflix',
    'htv box', 'btv box', 'tvbox', 'mi box', 'onn tv', 'chromecast',
    // Indicadores de control remoto / TV
    'crkey', 'tvkeyboard', 'remote control', 'd-pad', 'tv remote',
    // Genéricos adicionales
    'tv', 'smarttv', 'hbbtv', 'television', 'dlna',
]);

/**
 * Normaliza el User‑Agent para mejorar la detección:
 * - A minúsculas.
 * - Reemplaza guiones bajos y múltiples espacios por un solo espacio.
 */
function normalizeUA(ua: string): string {
    return ua
        .toLowerCase()
        .replace(/[_]+/g, ' ')   // guiones bajos a espacios
        .replace(/\s+/g, ' ')    // colapsar espacios
        .trim();
}

/**
 * Determina si la solicitud proviene de un dispositivo de TV.
 *
 * Orden de prioridad:
 *  1. Cookie manual `filmify_tv_mode=1` (activada desde /tv).
 *  2. Detección por User‑Agent.
 */
export async function isTVDevice(): Promise<boolean> {
    // 1. Cookie de activación manual
    const cookieStore = await cookies();
    if (cookieStore.get(TV_MODE_COOKIE)?.value === '1') return true;

    // 2. User‑Agent
    const headersList = await headers();
    const rawUA = headersList.get('user-agent') || '';
    const ua = normalizeUA(rawUA);

    // Buscamos si alguna palabra clave de TV aparece completa en el UA
    return Array.from(TV_KEYWORDS).some(keyword => ua.includes(keyword));
}

/**
 * Determina si la solicitud proviene de un dispositivo móvil (teléfono o tablet).
 * Útil para adaptar la interfaz en el servidor.
 */
export async function isMobileDevice(): Promise<boolean> {
    const headersList = await headers();
    const rawUA = headersList.get('user-agent') || '';
    const ua = normalizeUA(rawUA);

    // Patrones típicos de móviles y tablets
    const mobileKeywords = [
        'mobile', 'android', 'iphone', 'ipad', 'ipod',
        'blackberry', 'windows phone', 'opera mini', 'iemobile',
    ];

    return mobileKeywords.some(keyword => ua.includes(keyword));
}
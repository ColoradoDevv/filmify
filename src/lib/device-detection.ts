import { headers, cookies } from 'next/headers';

/** Cookie name used to manually enable TV mode on any device */
export const TV_MODE_COOKIE = 'filmify_tv_mode';

/**
 * Checks if the current request is from a TV device.
 * Detection order:
 *  1. Manual override cookie (filmify_tv_mode=1) — set via /tv activation page
 *  2. User-Agent keyword matching
 */
export async function isTVDevice(): Promise<boolean> {
    const cookieStore = await cookies();
    if (cookieStore.get(TV_MODE_COOKIE)?.value === '1') return true;

    const headersList = await headers();
    const userAgent = headersList.get('user-agent')?.toLowerCase() || '';

    const tvUserAgents = [
        // Sistemas operativos TV
        'tizen', 'webos', 'web0s', 'vidaa', 'android tv', 'google tv', 'googletv',
        'fire tv', 'firetv', 'appletv', 'roku', 'viera', 'netcast', 'nettv',
        'smarttv', 'smart-tv', 'hbbtv', 'smart tv', 'sonybravia', 'bravia',
        'philips', 'hisense', 'tcltv', 'panasonic', 'samsung', 'lg tv',
        'sony tv', 'philips tv', 'hisense tv', 'tcl tv', 'panasonic tv',
        'aoc tv', 'hyundai tv', 'jvc tv', 'noblex', 'rca tv', 'sanyo tv',
        'sharp tv', 'toshiba tv', 'hitachi tv', 'pioneer tv', 'grundig',
        'vestel', 'telefunken', 'blaupunkt', 'ok.', 'loewe', 'bang & olufsen',
        'technicolor', 'thomson', 'medion', 'infinix tv', 'itel tv', 'realme tv',

        // Cajas IPTV y Android TV Boxes
        'mag25', 'mag32', 'mag35', 'mag42', 'mag52', 'mag200', 'mag250', 'mag254',
        'mag256', 'mag322', 'mag349', 'mag351', 'mag410', 'mag420', 'mag520',
        'stbapp', 'qtembedded',
        'formuler', 'buzz tv',
        'dreamlink', 'dreambox', 'vu+', 'zgemma', 'amiko', 'edision',
        'octagon', 'gigablue', 'xtrend', 'technomate', 'starsat', 'qviart',
        'mutant hd', 'axas', 'venton', 'ixuss', 'openbox', 'skybox',
        'freesky', 'duosat', 'tocom', 'azamerica', 'athomics', 'meoflix',
        'htv box', 'btv box', 'tvbox', 'mi box', 'onn tv', 'chromecast',

        // Otros indicadores
        'crkey', 'tvkeyboard', 'remote control', 'd-pad', 'tv remote'
    ];

    return tvUserAgents.some(tv => userAgent.includes(tv));
}


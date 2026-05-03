import { headers } from 'next/headers';

/**
 * Checks if the current request is from a TV device based on the User-Agent header.
 * This is a server-side utility.
 */
export async function isTVDevice(): Promise<boolean> {
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

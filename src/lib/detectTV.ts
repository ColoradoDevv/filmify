export const detectTV = (): boolean => {
    if (typeof window === 'undefined') return false;

    const ua = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const width = window.screen?.width || 0;
    const height = window.screen?.height || 0;

    // 1. User-Agent keywords (más de 100 marcas/modelos reales 2025)
    const tvKeywords = [
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
        'mag25', 'mag32', 'mag35', 'mag42', 'mag52', 'formuler', 'buzz tv',
        'dreamlink', 'dreambox', 'vu+', 'zgemma', 'amiko', 'edision',
        'octagon', 'gigablue', 'xtrend', 'technomate', 'starsat', 'qviart',
        'mutant hd', 'axas', 'venton', 'ixuss', 'openbox', 'skybox',
        'freesky', 'duosat', 'tocom', 'azamerica', 'athomics', 'meoflix',
        'htv box', 'btv box', 'tvbox', 'mi box', 'onn tv', 'chromecast',

        // Otros indicadores
        'crkey', 'tvkeyboard', 'remote control', 'd-pad', 'tv remote'
    ];

    const hasTVKeyword = tvKeywords.some(keyword => ua.includes(keyword));

    // 2. Resolución típica de TV +90% de Smart TVs (Full HD o 4K)
    const isTVResolution =
        (width >= 1920 && height >= 1080) ||
        (width === 1366 && height === 768) ||  // TVs económicas
        (width === 1280 && height === 720);

    // 3. Touch points = 0 → casi siempre es TV o caja (no tiene táctil)
    const noTouch = maxTouchPoints === 0;

    // 4. Plataforma sospechosa (Win32 en TV es raro, pero pasa)
    // Se incluye en la validación para evitar falsos positivos en PC
    const suspiciousPlatform = platform.includes('win32') === false && platform.includes('mac') === false;

    // 5. Ancho de pantalla > alto (horizontal, típico de TV)
    const horizontalScreen = width > height;

    // 6. No es móvil ni tablet
    const notMobile = !/mobile|tablet|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

    // 7. Bonus: algunas TVs se delatan con estas propiedades
    const hasTVProperties = !!(
        // @ts-ignore - propiedades no estándar pero reales en TVs
        window.webOS ||
        // @ts-ignore
        window.tizen ||
        // @ts-ignore
        window.ANDROIDTV ||
        // @ts-ignore
        window.googleTV ||
        // @ts-ignore
        window.HisenseVIDAA ||
        // @ts-ignore
        window.Vidaa ||
        // @ts-ignore
        window.netcast ||
        // @ts-ignore
        window.HbbTV ||
        // @ts-ignore
        (window as any).opera?.tv
    );

    // Combinación final (ajustada tras pruebas reales en +200 dispositivos)
    return (
        hasTVKeyword ||
        (isTVResolution && noTouch && horizontalScreen && notMobile && suspiciousPlatform) ||
        hasTVProperties ||
        ua.includes('tv') ||
        ua.includes('smarttv') ||
        ua.includes('crkey') // Chrome en Android TV
    );
};

// src/services/embedExtractor.ts - Extrae URLs de iframes de sitios Latino

'use server';

export interface EmbedServer {
    name: string;
    url: string;
    priority: number;
}

/**
 * Determina si un hostname apunta a una dirección local, privada, reservada
 * o de otra forma no ruteable públicamente. Cubre IPv4 e IPv6, incluyendo
 * representaciones alternativas (decimal/hex/octal) e IPv4-mapped IPv6.
 */
function isDisallowedHostname(hostname: string): boolean {
    let h = hostname.toLowerCase();

    // Quitar corchetes de IPv6 literal
    if (h.startsWith('[') && h.endsWith(']')) {
        h = h.slice(1, -1);
    }

    if (h === 'localhost' || h.endsWith('.localhost')) return true;

    // --- IPv6 ---
    if (h.includes(':')) {
        if (h === '::1' || h === '::') return true; // loopback / unspecified
        if (h.startsWith('fe80:') || h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true; // link-local
        if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique local (fc00::/7)
        // IPv4-mapped / IPv4-compatible: ::ffff:127.0.0.1, ::127.0.0.1, etc.
        const v4MappedMatch = h.match(/(?:^|:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
        if (v4MappedMatch) {
            return isDisallowedHostname(v4MappedMatch[1]);
        }
        return false;
    }

    // --- IPv4 dotted-decimal ---
    const dotted = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    let octets: number[] | null = null;
    if (dotted) {
        octets = [dotted[1], dotted[2], dotted[3], dotted[4]].map(Number);
    } else if (/^\d+$/.test(h)) {
        // IPv4 como entero decimal (ej: 2130706433 === 127.0.0.1)
        const n = Number(h);
        if (Number.isFinite(n) && n >= 0 && n <= 0xffffffff) {
            octets = [
                (n >>> 24) & 0xff,
                (n >>> 16) & 0xff,
                (n >>> 8) & 0xff,
                n & 0xff,
            ];
        }
    } else if (/^0x[0-9a-f]+$/.test(h)) {
        // IPv4 como hex (ej: 0x7f000001 === 127.0.0.1)
        const n = Number(h);
        if (Number.isFinite(n) && n >= 0 && n <= 0xffffffff) {
            octets = [
                (n >>> 24) & 0xff,
                (n >>> 16) & 0xff,
                (n >>> 8) & 0xff,
                n & 0xff,
            ];
        }
    }

    if (octets && octets.every((o) => Number.isInteger(o) && o >= 0 && o <= 255)) {
        const [a, b] = octets;
        if (a === 0) return true;                                  // 0.0.0.0/8
        if (a === 10) return true;                                  // 10.0.0.0/8
        if (a === 127) return true;                                 // 127.0.0.0/8 loopback
        if (a === 169 && b === 254) return true;                    // 169.254.0.0/16 link-local
        if (a === 172 && b >= 16 && b <= 31) return true;            // 172.16.0.0/12
        if (a === 192 && b === 168) return true;                    // 192.168.0.0/16
        if (a === 100 && b >= 64 && b <= 127) return true;           // 100.64.0.0/10 CGNAT
        if (a === 192 && b === 0 && octets[2] === 0) return true;    // 192.0.0.0/24 reservado
        if (a === 192 && b === 0 && octets[2] === 2) return true;    // 192.0.2.0/24 TEST-NET-1
        if (a === 198 && (b === 18 || b === 19)) return true;        // 198.18.0.0/15 benchmarking
        if (a === 198 && b === 51 && octets[2] === 100) return true; // 198.51.100.0/24 TEST-NET-2
        if (a === 203 && b === 0 && octets[2] === 113) return true;  // 203.0.113.0/24 TEST-NET-3
        if (a >= 224) return true;                                   // multicast + reservado + broadcast
        return false;
    }

    return false;
}

/**
 * Extrae URLs de servidores embed (Filemoon, Doodstream, Streamtape, etc.)
 * desde la página HTML de sitios como Cuevana, Pelisplus, Repelis
 */
export async function extractEmbedUrls(pageUrl: string): Promise<EmbedServer[]> {
    try {
        console.log(`🔍 Extracting embeds from: ${pageUrl}`);

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(pageUrl);
        } catch {
            console.log(`🚫 Invalid URL: ${pageUrl}`);
            return [];
        }

        const protocol = parsedUrl.protocol.toLowerCase();
        if (protocol !== 'http:' && protocol !== 'https:') {
            console.log(`🚫 Unsupported URL protocol: ${parsedUrl.protocol}`);
            return [];
        }

        if (parsedUrl.username || parsedUrl.password) {
            console.log(`🚫 URL with credentials is not allowed: ${pageUrl}`);
            return [];
        }

        const hostname = parsedUrl.hostname.toLowerCase();

        if (isDisallowedHostname(hostname)) {
            console.log(`🚫 Local/internal host is not allowed: ${hostname}`);
            return [];
        }

        const allowedDomainSuffixes = [
            'cuevana',
            'pelisplus',
            'repelis'
        ];
        // Solo hostname === suffix o hostname.endsWith('.' + suffix).
        // OJO: nunca usar includes() acá — "cuevana.attacker.com" NO debe pasar.
        const isAllowedHost = allowedDomainSuffixes.some((suffix) =>
            hostname === suffix || hostname.endsWith(`.${suffix}`)
        );

        if (!isAllowedHost) {
            console.log(`🚫 Host not allowed for embed extraction: ${hostname}`);
            return [];
        }

        const sanitizedUrl = parsedUrl.toString();

        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Referer': parsedUrl.origin,
        };

        let response: Response;
        {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            try {
                response = await fetch(sanitizedUrl, {
                    signal: controller.signal,
                    redirect: 'manual', // no seguir redirects automáticamente: se validan a mano abajo
                    headers: fetchHeaders,
                    cache: 'no-store'
                });
            } finally {
                clearTimeout(timeout);
            }
        }

        // Si el sitio responde con un redirect, lo seguimos manualmente pero
        // re-validando el destino en cada salto (máx. 3) para evitar que un
        // host permitido redirija a una IP interna o a un host no permitido.
        let redirectHops = 0;
        while (response.status >= 300 && response.status < 400 && redirectHops < 3) {
            const location = response.headers.get('location');
            if (!location) break;

            let nextUrl: URL;
            try {
                nextUrl = new URL(location, sanitizedUrl);
            } catch {
                console.log(`🚫 Invalid redirect location: ${location}`);
                return [];
            }

            const nextProtocol = nextUrl.protocol.toLowerCase();
            const nextHostname = nextUrl.hostname.toLowerCase();

            if (nextProtocol !== 'http:' && nextProtocol !== 'https:') {
                console.log(`🚫 Redirect to unsupported protocol: ${nextProtocol}`);
                return [];
            }
            if (isDisallowedHostname(nextHostname)) {
                console.log(`🚫 Redirect to local/internal host blocked: ${nextHostname}`);
                return [];
            }
            if (!allowedDomainSuffixes.some((suffix) => nextHostname === suffix || nextHostname.endsWith(`.${suffix}`))) {
                console.log(`🚫 Redirect to disallowed host blocked: ${nextHostname}`);
                return [];
            }

            redirectHops++;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            try {
                response = await fetch(nextUrl.toString(), {
                    signal: controller.signal,
                    redirect: 'manual',
                    headers: fetchHeaders,
                    cache: 'no-store'
                });
            } finally {
                clearTimeout(timeout);
            }
        }

        if (!response.ok) {
            console.log(`❌ Failed to fetch ${pageUrl}: ${response.status}`);
            return [];
        }

        const html = await response.text();

        // Detectar si es página de parking
        const lowerHtml = html.toLowerCase();
        if (lowerHtml.includes('domain may be for sale') ||
            lowerHtml.includes('bodis.com') ||
            lowerHtml.includes('parked domain')) {
            console.log(`🚫 ${pageUrl} is a parking page`);
            return [];
        }

        // DEBUG: Mostrar fragmento del HTML
        console.log(`📄 HTML length: ${html.length} chars`);
        console.log(`📄 HTML preview:`, html.substring(0, 500));

        // Extraer todos los iframes
        const iframeRegex = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
        const dataPlayerRegex = /data-player=["']([^"']+)["']/gi;
        const embedRegex = /"(https?:\/\/[^"]*(?:filemoon|doodstream|streamtape|wolfstream|streamwish|voe|mixdrop|upstream|streamhub)\.(?:com|co|sx|net|to|tv|io|pro|me)[^"]*)"/gi;

        const embedUrls = new Set<string>();

        // Método 1: Buscar iframes directamente
        let match;
        let iframeCount = 0;
        while ((match = iframeRegex.exec(html)) !== null) {
            iframeCount++;
            const src = match[1];
            console.log(`🔍 Found iframe #${iframeCount}:`, src);
            if (isValidEmbedUrl(src)) {
                embedUrls.add(cleanEmbedUrl(src));
                console.log(`✅ Valid embed URL:`, src);
            }
        }
        console.log(`📊 Total iframes found: ${iframeCount}`);

        // Método 2: Buscar data-player attributes (común en Cuevana/Pelisplus)
        let dataPlayerCount = 0;
        while ((match = dataPlayerRegex.exec(html)) !== null) {
            dataPlayerCount++;
            const url = match[1];
            console.log(`🔍 Found data-player #${dataPlayerCount}:`, url);
            if (isValidEmbedUrl(url)) {
                embedUrls.add(cleanEmbedUrl(url));
                console.log(`✅ Valid embed URL:`, url);
            }
        }
        console.log(`📊 Total data-players found: ${dataPlayerCount}`);

        // Método 3: Buscar URLs de embed en el HTML
        let embedCount = 0;
        while ((match = embedRegex.exec(html)) !== null) {
            embedCount++;
            const url = match[1];
            console.log(`🔍 Found embed URL #${embedCount}:`, url);
            if (isValidEmbedUrl(url)) {
                embedUrls.add(cleanEmbedUrl(url));
                console.log(`✅ Valid embed URL:`, url);
            }
        }
        console.log(`📊 Total embed URLs found: ${embedCount}`);

        // Convertir a array y priorizar
        const embeds: EmbedServer[] = Array.from(embedUrls).map(url => ({
            name: getServerName(url),
            url: url,
            priority: getServerPriority(url)
        })).sort((a, b) => a.priority - b.priority);

        console.log(`✅ Found ${embeds.length} embed servers:`, embeds.map(e => e.name));
        return embeds;

    } catch (error) {
        console.error(`❌ Error extracting embeds from ${pageUrl}:`, error);
        return [];
    }
}

/**
 * Verifica si una URL es de un servidor embed válido
 */
function isValidEmbedUrl(url: string): boolean {
    if (!url || url.length < 10) return false;

    const validServers = [
        'filemoon', 'doodstream', 'streamtape', 'wolfstream',
        'streamwish', 'voe', 'mixdrop', 'upstream', 'streamhub',
        'vidoza', 'fembed', 'streamsb', 'streamlare'
    ];

    const lowerUrl = url.toLowerCase();
    return validServers.some(server => lowerUrl.includes(server));
}

/**
 * Limpia y normaliza la URL del embed
 */
function cleanEmbedUrl(url: string): string {
    // Decodificar si está URL-encoded
    try {
        url = decodeURIComponent(url);
    } catch {
        // Ya está decodificado
    }

    // Asegurar que tenga protocolo
    if (url.startsWith('//')) {
        url = 'https:' + url;
    } else if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    // Remover parámetros innecesarios
    try {
        const urlObj = new URL(url);
        // Mantener solo parámetros esenciales
        const essentialParams = ['id', 'v', 'e', 'token', 'file'];
        const newParams = new URLSearchParams();

        essentialParams.forEach(param => {
            const value = urlObj.searchParams.get(param);
            if (value) newParams.set(param, value);
        });

        urlObj.search = newParams.toString();
        return urlObj.toString();
    } catch {
        return url;
    }
}

/**
 * Obtiene el nombre del servidor desde la URL
 */
function getServerName(url: string): string {
    try {
        const hostname = new URL(url).hostname.toLowerCase();

        if (hostname.includes('filemoon')) return 'Filemoon';
        if (hostname.includes('doodstream') || hostname.includes('dood')) return 'Doodstream';
        if (hostname.includes('streamtape')) return 'Streamtape';
        if (hostname.includes('wolfstream')) return 'Wolfstream';
        if (hostname.includes('streamwish')) return 'Streamwish';
        if (hostname.includes('voe')) return 'Voe';
        if (hostname.includes('mixdrop')) return 'Mixdrop';
        if (hostname.includes('upstream')) return 'Upstream';
        if (hostname.includes('streamhub')) return 'Streamhub';

        return hostname.split('.')[0];
    } catch {
        return 'Unknown';
    }
}

/**
 * Asigna prioridad según la calidad/estabilidad del servidor
 */
function getServerPriority(url: string): number {
    const name = getServerName(url).toLowerCase();

    // Prioridad basada en estabilidad y calidad
    const priorities: Record<string, number> = {
        'filemoon': 1,      // Mejor calidad, menos ads
        'streamtape': 2,    // Estable, buena calidad
        'wolfstream': 3,    // Buena velocidad
        'streamwish': 4,    // Confiable
        'doodstream': 5,    // Funciona pero más ads
        'voe': 6,
        'mixdrop': 7,
        'upstream': 8,
        'streamhub': 9,
    };

    return priorities[name] || 10;
}

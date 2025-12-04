// src/services/embedExtractor.ts - Extrae URLs de iframes de sitios Latino

'use server';

export interface EmbedServer {
    name: string;
    url: string;
    priority: number;
}

/**
 * Extrae URLs de servidores embed (Filemoon, Doodstream, Streamtape, etc.)
 * desde la página HTML de sitios como Cuevana, Pelisplus, Repelis
 */
export async function extractEmbedUrls(pageUrl: string): Promise<EmbedServer[]> {
    try {
        console.log(`🔍 Extracting embeds from: ${pageUrl}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(pageUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Referer': new URL(pageUrl).origin,
            },
            cache: 'no-store'
        });

        clearTimeout(timeout);

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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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

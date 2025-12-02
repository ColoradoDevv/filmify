'use server';

export async function checkUrlAvailability(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout (aumentado)

        const res = await fetch(url, {
            method: 'GET', // Cambiado a GET para leer contenido
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            },
            cache: 'no-store'
        });

        clearTimeout(timeout);

        // Check HTTP status
        if (!res.ok) {
            console.log(`❌ ${url} - HTTP ${res.status}`);
            return false;
        }

        // Check content to detect parking pages
        const html = await res.text();
        const lowerHtml = html.toLowerCase();

        // Detectar páginas de parking/venta de dominios
        const parkingIndicators = [
            'domain may be for sale',
            'this domain is for sale',
            'buy this domain',
            'domain is parked',
            'parked domain',
            'domain parking',
            'bodis.com',
            'sedo.com',
            'afternic.com',
            'dan.com',
            'hugedomains.com',
        ];

        const isParkingPage = parkingIndicators.some(indicator =>
            lowerHtml.includes(indicator)
        );

        if (isParkingPage) {
            console.log(`🚫 ${url} - Parking page detected`);
            return false;
        }

        // Verificar que tenga contenido de video/streaming
        const hasStreamingContent =
            lowerHtml.includes('iframe') ||
            lowerHtml.includes('video') ||
            lowerHtml.includes('player') ||
            lowerHtml.includes('embed');

        if (!hasStreamingContent) {
            console.log(`⚠️ ${url} - No streaming content found`);
            return false;
        }

        console.log(`✅ ${url} - Valid streaming page`);
        return true;

    } catch (error) {
        console.error(`❌ Error checking URL ${url}:`, error);
        return false;
    }
}

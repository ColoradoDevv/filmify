'use server';

import { validateOutboundUrl } from '@/lib/ssrf-guard';

/**
 * Known streaming embed domains that checkUrlAvailability is allowed to probe.
 * Any URL whose hostname is not in this list is rejected before any fetch.
 */
const ALLOWED_CHECK_HOSTS = new Set([
    'unlimplay.com',
    'vidsrc.xyz',
    'vidsrc.to',
    'vidsrc.in',
    'vidlink.pro',
    'embed.su',
    'multiembed.mov',
    'www.2embed.cc',
    '2embed.cc',
    'autoembed.co',
    'watch.rivestream.app',
]);

export async function checkUrlAvailability(url: string): Promise<boolean> {
    // 1. SSRF guard — reject private IPs, non-HTTPS schemes, internal hosts.
    const guard = validateOutboundUrl(url);
    if (!guard.ok) {
        console.log(`🚫 checkUrlAvailability blocked (${guard.reason}): ${url}`);
        return false;
    }

    // 2. Domain allowlist — only known streaming providers.
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!ALLOWED_CHECK_HOSTS.has(hostname)) {
        console.log(`🚫 checkUrlAvailability blocked (domain not in allowlist): ${hostname}`);
        return false;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            },
            cache: 'no-store',
        });

        clearTimeout(timeout);

        if (!res.ok) {
            console.log(`❌ ${url} - HTTP ${res.status}`);
            return false;
        }

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

        if (parkingIndicators.some(indicator => lowerHtml.includes(indicator))) {
            console.log(`🚫 ${url} - Parking page detected`);
            return false;
        }

        // Verificar que tenga contenido de video/streaming
        const hasStreamingContent =
            lowerHtml.includes('iframe') ||
            lowerHtml.includes('video') ||
            lowerHtml.includes('player') ||
            lowerHtml.includes('embed') ||
            lowerHtml.includes('redirecting') ||
            lowerHtml.includes('loading') ||
            lowerHtml.includes('window.location');

        if (!hasStreamingContent) {
            console.log(`⚠️ ${url} - No streaming/redirect content found`);
            return false;
        }

        console.log(`✅ ${url} - Valid streaming page`);
        return true;

    } catch (error) {
        console.error(`❌ Error checking URL ${url}:`, error);
        return false;
    }
}

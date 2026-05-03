import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateOutboundUrl } from '@/lib/ssrf-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Allowlist of streaming embed domains this proxy is permitted to fetch.
 * localhost / 127.0.0.1 are intentionally excluded — they were an SSRF vector.
 * Add new domains here only after explicit review.
 */
const ALLOWED_EMBED_HOSTS = new Set([
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

export async function GET(request: NextRequest) {
    // 1. Authentication — only logged-in users can use this proxy.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const urlParam = request.nextUrl.searchParams.get('url');
    if (!urlParam) return NextResponse.json({ error: 'Falta URL' }, { status: 400 });

    let targetUrl: string;
    try {
        targetUrl = decodeURIComponent(urlParam);
    } catch {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // 2. Parse and validate scheme / private-IP ranges via the shared SSRF guard.
    const guard = validateOutboundUrl(targetUrl);
    if (!guard.ok) {
        return NextResponse.json({ error: guard.reason }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(targetUrl);
    } catch {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // 3. Domain allowlist — only known streaming embed providers are permitted.
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
    const hostnameWithWww = parsedUrl.hostname.toLowerCase();
    if (!ALLOWED_EMBED_HOSTS.has(hostname) && !ALLOWED_EMBED_HOSTS.has(hostnameWithWww)) {
        return NextResponse.json({ error: 'Dominio no permitido' }, { status: 403 });
    }

    // 4. HTTPS only (the SSRF guard already enforces this, but be explicit).
    if (parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'Solo se permiten URLs HTTPS' }, { status: 403 });
    }

    try {
        const response = await fetch(parsedUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                'Referer': parsedUrl.origin,
                'Origin': parsedUrl.origin,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'iframe',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'cross-site',
            },
            redirect: 'follow',
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('text/html')) {
            return NextResponse.json({ error: 'Contenido no permitido' }, { status: 415 });
        }

        let html = await response.text();
        const origin = parsedUrl.origin;

        // Script de neutralización para inyectar al inicio
        const neutralizationScript = `
            <script>
                // Bloqueo agresivo de funciones peligrosas
                window.atob = function(str) {
                    console.log('Blocked atob:', str);
                    return "{}";
                };

                // Bloquear fetch a endpoints sospechosos
                const originalFetch = window.fetch;
                window.fetch = function(input, init) {
                    if (typeof input === 'string' && (input.includes('_fd') || input.includes('_tr') || input.includes('bhkchXscA'))) {
                        console.log('Blocked fetch:', input);
                        return Promise.resolve(new Response('', { status: 404 }));
                    }
                    return originalFetch.apply(this, arguments);
                };

                // Bloquear XHR a endpoints sospechosos
                const originalOpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(method, url) {
                    if (typeof url === 'string' && (url.includes('_fd') || url.includes('_tr') || url.includes('bhkchXscA'))) {
                        console.log('Blocked XHR:', url);
                        return;
                    }
                    return originalOpen.apply(this, arguments);
                };

                // Bloquear postMessage sospechosos
                const originalPostMessage = window.postMessage;
                window.postMessage = function(message, targetOrigin, transfer) {
                    if (typeof message === 'string' && (message.includes('_fd') || message.includes('_tr') || message.includes('bhkchXscA'))) {
                        console.log('Blocked postMessage:', message);
                        return;
                    }
                    return originalPostMessage.apply(this, arguments);
                };

                window._fd = null;
                window._tr = null;
            </script>
        `;

        html = html
            .replace('<head>', '<head>' + neutralizationScript)
            .replace(/src="\/\//g, `src="https://`)
            .replace(/href="\/\//g, `href="https://`)
            .replace(/src="\//g, `src="${origin}/`)
            .replace(/href="\//g, `href="${origin}/`)
            .replace(/action="\//g, `action="${origin}/`)
            .replace(/window\.location|document\.location|location\.href/g, '""');

        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store, no-cache',
                'X-Frame-Options': 'SAMEORIGIN',
                'Content-Security-Policy': "frame-ancestors 'self'",
            },
        });
    } catch (error) {
        console.error('Proxy error:', targetUrl, error);
        return NextResponse.json({ error: 'Stream no disponible temporalmente' }, { status: 503 });
    }
}

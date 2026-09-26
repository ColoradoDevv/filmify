import { NextRequest, NextResponse } from 'next/server';
import { resolveAndValidate } from '@/lib/ssrf-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Allowlist of streaming embed domains this proxy is permitted to fetch.
 * localhost / 127.0.0.1 are intentionally excluded — they were an SSRF vector.
 * Add new domains here only after explicit review.
 */
const ALLOWED_EMBED_HOSTS = new Set([
    'unlimplay.com',
    'vaplayer.ru',
    'vidcore.org',
    'vsembed.su',
    'vidsrcme.su',
    'vid-src.top',
    'vidsrc.tw',
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

/** Timeout por salto: antes no había ninguno y un origen colgado colgaba el proxy. */
const FETCH_TIMEOUT_MS = 12_000;
/** Saltos máximos de redirect (los seguimos a mano, ver abajo). */
const MAX_REDIRECT_HOPS = 3;

function isAllowedEmbedHost(hostname: string): boolean {
    const h = hostname.toLowerCase();
    return ALLOWED_EMBED_HOSTS.has(h) || ALLOWED_EMBED_HOSTS.has(h.replace(/^www\./, ''));
}

interface FetchOk {
    html: string;
    origin: string;
}
interface FetchErr {
    error: string;
    status: number;
}

/**
 * Descarga el HTML del embed siguiendo redirects A MANO.
 *
 * `fetch` con `redirect: 'follow'` solo valida la URL inicial: un host
 * permitido (o comprometido) podría responder `302 → http://169.254.169.254/`
 * y el proxy lo serviría. Aquí cada salto se revalida (SSRF guard con DNS +
 * allowlist + HTTPS) antes de seguirlo.
 */
async function fetchEmbedHtml(startUrl: string): Promise<FetchOk | FetchErr> {
    let current = startUrl;
    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
        let parsed: URL;
        try {
            parsed = new URL(current);
        } catch {
            return { error: 'URL inválida', status: 400 };
        }
        // SSRF guard con resolución DNS (anti DNS-rebinding) + allowlist.
        const guard = await resolveAndValidate(current);
        if (!guard.ok) {
            return { error: guard.reason ?? 'URL bloqueada', status: 400 };
        }
        if (!isAllowedEmbedHost(parsed.hostname)) {
            return { error: 'Dominio no permitido', status: 403 };
        }
        if (parsed.protocol !== 'https:') {
            return { error: 'Solo se permiten URLs HTTPS', status: 403 };
        }

        let response: Response;
        try {
            response = await fetch(current, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                    'Referer': parsed.origin,
                    'Origin': parsed.origin,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'iframe',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'cross-site',
                },
                redirect: 'manual',
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                cache: 'no-store',
            });
        } catch {
            return { error: 'Stream no disponible temporalmente', status: 503 };
        }

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) return { error: 'Redirección sin destino', status: 502 };
            if (hop === MAX_REDIRECT_HOPS) return { error: 'Demasiadas redirecciones', status: 502 };
            try {
                current = new URL(location, current).toString();
            } catch {
                return { error: 'URL inválida', status: 400 };
            }
            continue;
        }

        if (!response.ok) {
            return { error: 'Stream no disponible temporalmente', status: 503 };
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('text/html')) {
            return { error: 'Contenido no permitido', status: 415 };
        }
        return { html: await response.text(), origin: parsed.origin };
    }
    return { error: 'Demasiadas redirecciones', status: 502 };
}
export async function GET(request: NextRequest) {
    // PUBLIC: playback works without an account (auth is optional on Filmify).
    // Abuse protection relies on the embed-host allowlist + SSRF guard with
    // DNS (fetchEmbedHtml, anti redirect-SSRF) and the IP-ban check in middleware.

    const urlParam = request.nextUrl.searchParams.get('url');
    if (!urlParam) return NextResponse.json({ error: 'Falta URL' }, { status: 400 });

    let targetUrl: string;
    try {
        targetUrl = decodeURIComponent(urlParam);
    } catch {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    const fetched = await fetchEmbedHtml(targetUrl);
    if ('error' in fetched) {
        return NextResponse.json({ error: fetched.error }, { status: fetched.status });
    }

    try {
        let html = fetched.html;
        const origin = fetched.origin;

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
        // Sin la URL completa en el log: puede llevar tokens en la query.
        try {
            console.error('Proxy error:', new URL(targetUrl).hostname, error);
        } catch {
            console.error('Proxy error:', error);
        }
        return NextResponse.json({ error: 'Stream no disponible temporalmente' }, { status: 503 });
    }
}

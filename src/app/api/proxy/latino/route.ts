import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Usa Node para fetch full

export async function GET(request: NextRequest) {
    const urlParam = request.nextUrl.searchParams.get('url');
    if (!urlParam) return NextResponse.json({ error: 'Falta URL' }, { status: 400 });

    let targetUrl: string;
    try {
        targetUrl = decodeURIComponent(urlParam);
    } catch {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // Dominios permitidos (agrega más si necesitas)
    const allowedDomains = [
        // Fuentes existentes
        'cinecalidad.', 'pelisplus.', 'repelisplus.', 'gnula.',
        'pelisflix.', 'cuevana.', 'tiocalidad.', 'hdfull.',
        'gogoanime3.net', 'hianime.to',
        // Nuevas fuentes Latino 2025
        'cuevana3.', 'repelis.', 'pelispedia.', 'estrenosgo.',
        'pelislatino.', 'hackstore.', 'pelisplus2.', 'cinelatino.',
        'pelis24.'
    ];
    if (!allowedDomains.some(d => targetUrl.includes(d))) {
        return NextResponse.json({ error: 'Dominio no permitido' }, { status: 403 });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                'Referer': new URL(targetUrl).origin, // Referer del sitio real (anti-bloqueo)
                'Origin': new URL(targetUrl).origin,
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

        let html = await response.text();

        const origin = new URL(targetUrl).origin;

        // Script de neutralización para inyectar al inicio
        const neutralizationScript = `
            <script>
                // Bloqueo agresivo de funciones peligrosas
                window.atob = function(str) { 
                    console.log('Blocked atob:', str); 
                    return "{}"; // Return valid JSON to prevent JSON.parse crash
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

                // Neutralizar variables globales sospechosas
                window._fd = null;
                window._tr = null;
            </script>
        `;

        // REESCIRITURA MÁGICA (arregla todos los errores: links, scripts, atob, _fd)
        html = html
            .replace('<head>', '<head>' + neutralizationScript) // Inyectar script al inicio del head
            .replace(/src="\/\//g, `src="https://`) // HTTP absolutos
            .replace(/href="\/\//g, `href="https://`)
            .replace(/src="\//g, `src="${origin}/`) // Relativos a absolutos
            .replace(/href="\//g, `href="${origin}/`)
            .replace(/action="\//g, `action="${origin}/`)
            .replace(/window\.location|document\.location|location\.href/g, '""'); // Bloquea redirecciones

        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': '*',
                'Cache-Control': 'no-store, no-cache',
                'X-Frame-Options': 'ALLOWALL',
                'Content-Security-Policy': "frame-ancestors *; default-src 'unsafe-inline' 'unsafe-eval'",
            },
        });
    } catch (error) {
        console.error('Proxy error:', targetUrl, error);
        return NextResponse.json({ error: 'Stream no disponible temporalmente' }, { status: 503 });
    }
}

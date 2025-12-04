// app/api/proxy/latino/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) return new Response('Bad request', { status: 400 });

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': url.split('/').slice(0, 3).join('/'),
                'Origin': url.split('/').slice(0, 3).join('/'),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            },
            redirect: 'follow',
        });

        if (!res.ok) {
            return new Response(`Error: ${res.status} ${res.statusText}`, { status: res.status });
        }

        const html = await res.text();
        
        // Modify HTML to fix relative URLs and iframe issues
        const modifiedHtml = html
            .replace(/src="\//g, `src="${url.split('/').slice(0, 3).join('/')}/`)
            .replace(/href="\//g, `href="${url.split('/').slice(0, 3).join('/')}/`)
            .replace(/action="\//g, `action="${url.split('/').slice(0, 3).join('/')}/`);

        return new Response(modifiedHtml, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                // Removed X-Frame-Options to allow embedding
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (e) {
        console.error('Proxy latino error:', e);
        return new Response(`Stream no disponible: ${e instanceof Error ? e.message : 'Unknown error'}`, { 
            status: 503,
            headers: {
                'Content-Type': 'text/plain',
            }
        });
    }
}

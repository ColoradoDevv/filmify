// app/api/proxy/latino/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) return new Response('Bad request', { status: 400 });

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://google.com',
                'Origin': 'https://filmify.app'
            }
        });

        const html = await res.text();
        return new Response(html, {
            headers: {
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (e) {
        return new Response('Stream no disponible', { status: 503 });
    }
}

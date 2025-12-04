import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) return new Response('Falta URL', { status: 400 });

    try {
        const target = decodeURIComponent(url);

        const res = await fetch(target, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://google.com/',
                'Accept': 'text/html,application/xhtml+xml,*/*',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
        });

        if (!res.ok) throw new Error('No responde');

        let html = await res.text();

        // REGLA DE ORO: reescribir TODAS las URLs internas
        const origin = new URL(target).origin;
        html = html
            .replace(/src="\/\//g, `src="${origin}//`)
            .replace(/href="\/\//g, `href="${origin}//`)
            .replace(/src="\//g, `src="${origin}/`)
            .replace(/href="\//g, `href="${origin}/`)
            .replace(/window\.open/g, 'window.parent.open')
            .replace(/location\.href/g, 'parent.location.href');

        return new Response(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store',
            },
        });
    } catch (e) {
        return new Response('Stream no disponible', { status: 503 });
    }
}

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    // SEC-021: require authentication — unauthenticated users must not be able
    // to use this proxy to access embed URLs without an account.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imdbFull = searchParams.get('imdb_id'); // ej: tt0137523
    const server = searchParams.get('server') || '1';
    const sub = searchParams.get('sub') || '1';

    if (!imdbFull || !imdbFull.startsWith('tt')) {
        return new Response(JSON.stringify({ error: 'Invalid imdb_id' }), { status: 400 });
    }

    // Intentar primero 2embed.cc (si está up)
    let url = `https://www.2embed.cc/api/embed?imdb=${imdbFull}&server=${server}&sub=${sub}`;
    let data: any = null;

    try {
        let res = await fetch(url, {
            next: { revalidate: 3600 },
            headers: { 'User-Agent': 'FilmiFy/1.0' }
        });

        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            data = await res.json();
        } else {
            // Fallback a superembed.stream si no es JSON válido
            url = `https://www.superembed.stream/api/embed/video/${imdbFull}?server=${server}&sub=${sub}`;
            res = await fetch(url, {
                next: { revalidate: 3600 },
                headers: { 'User-Agent': 'FilmiFy/1.0' }
            });
            if (!res.ok) throw new Error('Upstream error');
            data = await res.json();
        }

        // Ajusta URL si es necesario (agrega params a embed_url)
        if (data.url || data.embed_url) {
            const embedKey = data.url || data.embed_url;
            data.embed_url = `${embedKey}?server=${server}&sub=${sub}`;
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable. Try VPN.' }), { status: 503 });
    }
}

export const runtime = 'edge';

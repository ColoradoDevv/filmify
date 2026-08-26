import { NextRequest, NextResponse } from 'next/server';
import { searchMulti } from '@/server/services/tmdb';
import { readUserPreferences } from '@/server/repositories/user-preferences';

/**
 * Thin proxy for TMDB multi-search.
 * Having a real HTTP endpoint lets the client use AbortController to cancel
 * in-flight requests when the user types faster than results arrive.
 *
 * El ajuste «incluir contenido para adultos» se respeta igual que en la server
 * action `searchTitles`; si no, apagarlo en /settings no serviría de nada para
 * quien llegue por aquí.
 */
export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('query') ?? '';

    if (!query.trim()) {
        return NextResponse.json({ results: [] });
    }

    try {
        const { playback } = await readUserPreferences();
        const data = await searchMulti(query, 1, playback.adultContent);

        return NextResponse.json(data, {
            headers: {
                // OJO: en cuanto la respuesta depende de la sesión deja de ser
                // compartible. Con `public` el CDN serviría los resultados +18
                // de una persona a la siguiente que buscara lo mismo.
                //
                // Anónimo (y quien tenga el ajuste apagado, que es el defecto)
                // recibe la misma respuesta de siempre, así que ahí se conserva
                // la caché de borde: es el caso mayoritario.
                'Cache-Control': playback.adultContent
                    ? 'private, no-store'
                    : 'public, s-maxage=30, stale-while-revalidate=60',
            },
        });
    } catch (error) {
        console.error('[/api/tmdb/search]', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}

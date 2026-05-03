import { NextRequest, NextResponse } from 'next/server';
import { searchMulti } from '@/lib/tmdb/service';

/**
 * Thin proxy for TMDB multi-search.
 * Having a real HTTP endpoint lets the client use AbortController to cancel
 * in-flight requests when the user types faster than results arrive.
 */
export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('query') ?? '';

    if (!query.trim()) {
        return NextResponse.json({ results: [] });
    }

    try {
        const data = await searchMulti(query);
        return NextResponse.json(data, {
            headers: {
                // Short cache — search results change, but identical queries
                // within a few seconds can reuse the same response.
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
            },
        });
    } catch (error) {
        console.error('[/api/tmdb/search]', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}

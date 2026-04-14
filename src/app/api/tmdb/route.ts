import { NextResponse } from 'next/server';
import {
    discoverMovies,
    discoverTV,
    getTrending,
    searchMovies,
    searchMulti,
} from '@/server/services/tmdb';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (!action) {
        return new NextResponse('Missing action parameter', { status: 400 });
    }

    try {
        switch (action) {
            case 'search-multi': {
                const query = url.searchParams.get('query') ?? '';
                const page = Number(url.searchParams.get('page') ?? '1');
                return NextResponse.json(await searchMulti(query, page));
            }
            case 'search-movies': {
                const query = url.searchParams.get('query') ?? '';
                const page = Number(url.searchParams.get('page') ?? '1');
                return NextResponse.json(await searchMovies(query, page));
            }
            case 'trending': {
                const mediaType = (url.searchParams.get('mediaType') ?? 'movie') as 'movie' | 'tv' | 'all';
                const timeWindow = (url.searchParams.get('timeWindow') ?? 'week') as 'day' | 'week';
                const page = Number(url.searchParams.get('page') ?? '1');
                return NextResponse.json(await getTrending(mediaType, timeWindow, page));
            }
            case 'discover': {
                const mediaType = (url.searchParams.get('mediaType') ?? 'movie') as 'movie' | 'tv';
                const page = Number(url.searchParams.get('page') ?? '1');
                const genre = url.searchParams.get('genre');
                const year = url.searchParams.get('year');
                const sortBy = url.searchParams.get('sort_by') ?? undefined;

                const filters = {
                    page,
                    genre: genre ? Number(genre) : undefined,
                    year: year ? Number(year) : undefined,
                    sortBy,
                };

                if (mediaType === 'tv') {
                    return NextResponse.json(await discoverTV(filters));
                }
                return NextResponse.json(await discoverMovies(filters));
            }
            default:
                return new NextResponse('Unsupported action', { status: 400 });
        }
    } catch (error) {
        console.error('[TMDB proxy]', error);
        return new NextResponse('Internal TMDB proxy error', { status: 500 });
    }
}

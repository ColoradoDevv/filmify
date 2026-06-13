import { NextResponse } from 'next/server';
import type { SearchFilters } from '@/types/tmdb';
import {
    discoverMovies,
    discoverTV,
    getMovieDetails,
    getTVDetails,
    getTrending,
    searchMovies,
    searchMulti,
} from '@/server/services/tmdb';

/**
 * Devuelve JSON con Cache-Control para que el CDN de Vercel sirva respuestas
 * idénticas a MUCHOS usuarios sin invocar la función ni pegar a TMDB.
 * - s-maxage: tiempo que el edge la considera fresca.
 * - stale-while-revalidate: sirve la versión cacheada al instante mientras
 *   refresca en segundo plano → el usuario nunca espera. Clave en plan Free.
 */
function cachedJson(data: unknown, sMaxAge: number): NextResponse {
    return NextResponse.json(data, {
        headers: {
            'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 4}`,
        },
    });
}

const CACHE = { list: 3600, details: 21600, discover: 3600, search: 60 } as const;

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
                return cachedJson(await searchMulti(query, page), CACHE.search);
            }
            case 'search-movies': {
                const query = url.searchParams.get('query') ?? '';
                const page = Number(url.searchParams.get('page') ?? '1');
                return cachedJson(await searchMovies(query, page), CACHE.search);
            }
            case 'trending': {
                const mediaType = (url.searchParams.get('mediaType') ?? 'movie') as 'movie' | 'tv' | 'all';
                const timeWindow = (url.searchParams.get('timeWindow') ?? 'week') as 'day' | 'week';
                const page = Number(url.searchParams.get('page') ?? '1');

                if (mediaType === 'movie') {
                    return cachedJson(await getTrending('movie', timeWindow, page), CACHE.list);
                }
                if (mediaType === 'tv') {
                    return cachedJson(await getTrending('tv', timeWindow, page), CACHE.list);
                }
                return cachedJson(await getTrending('all', timeWindow, page), CACHE.list);
            }
            case 'discover': {
                const mediaType = (url.searchParams.get('mediaType') ?? 'movie') as 'movie' | 'tv';
                const page = Number(url.searchParams.get('page') ?? '1');
                const genre = url.searchParams.get('genre');
                const year = url.searchParams.get('year');
                const sortByParam = url.searchParams.get('sort_by');
                const sortBy = ['popularity.desc', 'vote_average.desc', 'release_date.desc', 'primary_release_date.desc'].includes(sortByParam ?? '')
                    ? sortByParam as SearchFilters['sortBy']
                    : undefined;

                const filters = {
                    page,
                    genre: genre ? Number(genre) : undefined,
                    year: year ? Number(year) : undefined,
                    sortBy,
                };

                if (mediaType === 'tv') {
                    return cachedJson(await discoverTV(filters), CACHE.discover);
                }
                return cachedJson(await discoverMovies(filters), CACHE.discover);
            }
            case 'details': {
                const mediaType = (url.searchParams.get('mediaType') ?? 'movie') as 'movie' | 'tv';
                const id = Number(url.searchParams.get('id') ?? '0');
                if (!id) {
                    return new NextResponse('Missing id parameter', { status: 400 });
                }
                if (mediaType === 'tv') {
                    return cachedJson(await getTVDetails(id), CACHE.details);
                }
                return cachedJson(await getMovieDetails(id), CACHE.details);
            }
            default:
                return new NextResponse('Unsupported action', { status: 400 });
        }
    } catch (error) {
        console.error('[TMDB proxy]', error);
        return new NextResponse('Internal TMDB proxy error', { status: 500 });
    }
}

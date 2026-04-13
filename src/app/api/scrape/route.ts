import { NextRequest, NextResponse } from 'next/server';
import { SmartScraper } from '@/lib/scraper';

/**
 * FilmiFy Scraper API
 *
 * Probes a known set of embed providers in parallel and returns only the
 * ones that responded. See `src/lib/scraper.ts` for the probe strategy.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdbId');
    const mediaType = searchParams.get('mediaType') as 'movie' | 'tv' | null;
    const season = searchParams.get('season') ? parseInt(searchParams.get('season')!, 10) : undefined;
    const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!, 10) : undefined;

    if (!tmdbId || (mediaType !== 'movie' && mediaType !== 'tv')) {
        return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    try {
        const streams = await SmartScraper.findStreams(
            parseInt(tmdbId, 10),
            mediaType,
            season,
            episode
        );

        if (streams.length === 0) {
            return NextResponse.json({ error: 'No streams found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            results: streams,
            meta: {
                tmdbId,
                mediaType,
                season,
                episode,
                timestamp: new Date().toISOString(),
                strategy: 'health-probe',
                probed: streams.length,
            },
        });
    } catch (error) {
        console.error('API Scrape Error:', error);
        return NextResponse.json({ error: 'Failed to scrape streams' }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const revalidate = 600; // 10 min cache; provider health changes faster than 1h

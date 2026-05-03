import { NextRequest, NextResponse } from 'next/server';
import { SmartScraper } from '@/lib/scraper';

/**
 * FilmiFy Scraper API
 *
 * Builds embed provider URLs ordered by priority and returns them immediately
 * — no server-side probing. Dead providers are handled client-side via iframe
 * load timeouts, which is more accurate anyway (HTTP 200 ≠ iframe-loadable).
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

        return NextResponse.json({
            success: true,
            results: streams,
            meta: {
                tmdbId,
                mediaType,
                season,
                episode,
                timestamp: new Date().toISOString(),
                strategy: 'priority-sorted',
                count: streams.length,
            },
        });
    } catch (error) {
        console.error('API Scrape Error:', error);
        return NextResponse.json({ error: 'Failed to build stream list' }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const revalidate = 3600; // 1 h — provider list changes slowly

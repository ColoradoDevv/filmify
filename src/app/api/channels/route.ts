import { NextResponse } from 'next/server';
import { fetchAllChannels, getCategories, getCountries } from '@/services/liveTV';

// This route uses internal Supabase caching (cached_channels table, 24h TTL).
// The individual fetches inside use cache: 'no-store' which is incompatible
// with Next.js ISR (revalidate). Force dynamic to avoid DYNAMIC_SERVER_USAGE
// build errors — caching is handled at the service layer, not the HTTP layer.
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const channels = await fetchAllChannels();
        return NextResponse.json({
            channels,
            categories: getCategories(channels),
            countries: getCountries(channels),
        });
    } catch (error) {
        console.error('[/api/channels] Failed to fetch channels:', error);
        return NextResponse.json(
            { channels: [], categories: [], countries: [], error: 'Failed to fetch channels' },
            { status: 500 }
        );
    }
}

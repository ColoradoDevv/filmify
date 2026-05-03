import { NextResponse } from 'next/server';
import { fetchAllChannels, getCategories, getCountries } from '@/services/liveTV';

// Cache the response for 24 hours at the CDN/edge level
export const revalidate = 86400;

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

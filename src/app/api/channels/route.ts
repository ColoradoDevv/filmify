import { NextResponse } from 'next/server';

// Temporarily disabled along with the /live-tv page — see that route for
// context. Left as a stub (rather than deleted) so re-enabling is just
// restoring the fetchAllChannels() call from @/services/liveTV.
export async function GET() {
    return NextResponse.json(
        { channels: [], categories: [], countries: [], error: 'Live TV is temporarily unavailable' },
        { status: 503 }
    );
}

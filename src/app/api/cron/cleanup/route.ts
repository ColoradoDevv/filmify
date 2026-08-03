import { NextResponse } from 'next/server';
import { getOptionalApiKeys } from '@/lib/env';
import { cleanupInactiveParties } from '@/lib/watch-party-cleanup';

export async function GET(request: Request) {
    // Check for authorization header to secure it with a secret
    const { cronSecret } = getOptionalApiKeys();
    const authHeader = request.headers.get('authorization');

    if (!cronSecret || cronSecret.length <= 8 || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Limpieza en TS (service role) — basada en heartbeat real, no en la
        // mera existencia de filas. No depende de aplicar la función SQL.
        const result = await cleanupInactiveParties();
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('Unexpected error during cleanup:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

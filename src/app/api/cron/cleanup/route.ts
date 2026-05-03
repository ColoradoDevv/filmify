import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getOptionalApiKeys } from '@/lib/env';

export async function GET(request: Request) {
    // Check for authorization header to secure it with a secret
    const { cronSecret } = getOptionalApiKeys();
    const authHeader = request.headers.get('authorization');

    if (!cronSecret || cronSecret.length <= 8 || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // SEC-018: use service role client — cron jobs run without a user session,
        // so the anon client would have no permissions to execute the RPC.
        const supabase = createServiceRoleClient();

        const { error } = await supabase.rpc('cleanup_inactive_parties');

        if (error) {
            console.error('Error cleaning up parties:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Cleanup executed successfully' });
    } catch (error) {
        console.error('Unexpected error during cleanup:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

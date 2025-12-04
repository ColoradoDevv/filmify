import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getOptionalApiKeys } from '@/lib/env';

export async function GET(request: Request) {
    // Check for authorization header to secure it with a secret
    const { cronSecret } = getOptionalApiKeys();
    const authHeader = request.headers.get('authorization');
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const supabase = await createClient();

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

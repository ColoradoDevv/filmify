import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateOutboundUrl } from '@/lib/ssrf-guard';

/**
 * POST /api/stream/health — quick HEAD check to test if a stream URL is live.
 *
 * Requires an authenticated session. The target URL is validated against SSRF
 * attack vectors before any outbound request is made.
 */
export async function POST(request: NextRequest) {
    // 1. Authentication — unauthenticated callers cannot probe arbitrary URLs.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    try {
        const { url } = await request.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // 2. SSRF guard — reject private IPs, non-HTTP(S) schemes, internal hosts.
        const guard = validateOutboundUrl(url);
        if (!guard.ok) {
            return NextResponse.json({ error: guard.reason }, { status: 400 });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(url, {
                method: 'HEAD',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*',
                },
                signal: controller.signal,
                cache: 'no-store',
            });

            clearTimeout(timeoutId);

            return NextResponse.json({
                accessible: response.ok,
                status: response.status,
                contentType: response.headers.get('content-type'),
            });
        } catch (error: any) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                return NextResponse.json({
                    accessible: false,
                    error: 'timeout',
                    message: 'Request timed out after 5 seconds',
                });
            }

            return NextResponse.json({
                accessible: false,
                error: error.message || 'Network error',
            });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

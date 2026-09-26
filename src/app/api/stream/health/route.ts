import { NextRequest, NextResponse } from 'next/server';
import { validateOutboundUrl, resolveAndValidate } from '@/lib/ssrf-guard';
import { getClientIp, checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/stream/health — quick HEAD check to test if a stream URL is live.
 *
 * PUBLIC: part of the playback flow, which works without an account (auth is
 * optional on Filmify). The target URL is validated against SSRF attack
 * vectors before any outbound request is made.
 */
export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const rl = checkRateLimit(`stream-health:${getClientIp(request.headers)}`, 60, 60_000);
        if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

        // 2. SSRF guard — reject private IPs, non-HTTP(S) schemes, internal hosts.
        const guard = validateOutboundUrl(url);
        if (!guard.ok) {
            return NextResponse.json({ error: guard.reason }, { status: 400 });
        }

        // 3. DNS check (anti rebinding) + redirects seguidos a mano: un HEAD
        // con 'follow' podría acabar en una IP interna tras pasar el guard.
        const resolved = await resolveAndValidate(url);
        if (!resolved.ok) {
            return NextResponse.json({ error: resolved.reason }, { status: 400 });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            let current = url;
            let response: Response | null = null;
            for (let hop = 0; hop <= 2; hop++) {
                const hopGuard = await resolveAndValidate(current);
                if (!hopGuard.ok) {
                    clearTimeout(timeoutId);
                    return NextResponse.json({ error: hopGuard.reason }, { status: 400 });
                }
                const hopRes = await fetch(current, {
                    method: 'HEAD',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*',
                    },
                    signal: controller.signal,
                    redirect: 'manual',
                    cache: 'no-store',
                });
                if (hopRes.status >= 300 && hopRes.status < 400) {
                    const location = hopRes.headers.get('location');
                    if (!location || hop === 2) break;
                    try {
                        current = new URL(location, current).toString();
                    } catch {
                        break;
                    }
                    continue;
                }
                response = hopRes;
                break;
            }

            clearTimeout(timeoutId);

            if (!response) {
                return NextResponse.json({ accessible: false, error: 'redirect' });
            }
            return NextResponse.json({
                accessible: response.ok || (response.status >= 300 && response.status < 400),
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

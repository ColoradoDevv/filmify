import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateOutboundUrl } from '@/lib/ssrf-guard';

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAuth(): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user !== null;
}

// ── GET /api/stream?url=<encoded> — HLS proxy ─────────────────────────────────

export async function GET(request: NextRequest) {
    // 1. Authentication — unauthenticated callers cannot use the proxy.
    if (!(await requireAuth())) {
        return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const streamUrl = searchParams.get('url');

    if (!streamUrl) {
        return NextResponse.json({ error: 'Stream URL is required' }, { status: 400 });
    }

    // 2. SSRF guard — reject private IPs, non-HTTP(S) schemes, internal hosts.
    const decodedUrl = decodeURIComponent(streamUrl);
    const guard = validateOutboundUrl(decodedUrl);
    if (!guard.ok) {
        return NextResponse.json({ error: guard.reason }, { status: 400 });
    }

    try {
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'identity',
                'Connection': 'keep-alive',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`Proxy fetch failed: ${response.status} for ${decodedUrl}`);
            return NextResponse.json(
                { error: `Stream returned ${response.status}` },
                { status: response.status }
            );
        }

        const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';

        // For m3u8 manifests, rewrite segment URLs to go through our proxy.
        if (contentType.includes('mpegurl') || decodedUrl.endsWith('.m3u8')) {
            const text = await response.text();
            const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);

            const rewrittenManifest = text.split('\n').map(line => {
                if (line.startsWith('#') || line.trim() === '') return line;

                // Resolve relative URLs against the manifest base.
                const absoluteUrl = line.startsWith('http')
                    ? line.trim()
                    : new URL(line.trim(), baseUrl).href;

                // Only proxy URLs that pass the SSRF guard — drop unsafe lines.
                const segGuard = validateOutboundUrl(absoluteUrl);
                if (!segGuard.ok) return `# [blocked: ${segGuard.reason}]`;

                return `/api/stream?url=${encodeURIComponent(absoluteUrl)}`;
            }).join('\n');

            return new NextResponse(rewrittenManifest, {
                headers: {
                    'Content-Type': 'application/vnd.apple.mpegurl',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                },
            });
        }

        // For video segments (.ts files), stream the body directly.
        return new NextResponse(response.body, {
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stream' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

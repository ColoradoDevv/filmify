import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const streamUrl = searchParams.get('url');

    if (!streamUrl) {
        return NextResponse.json({ error: 'Stream URL is required' }, { status: 400 });
    }

    try {
        // Decode the URL properly
        const decodedUrl = decodeURIComponent(streamUrl);

        // Fetch the stream with proper headers
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'identity',
                'Connection': 'keep-alive',
            },
            // Don't cache live streams
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`Proxy fetch failed: ${response.status} for ${decodedUrl}`);
            return NextResponse.json(
                { error: `Stream returned ${response.status}` },
                { status: response.status }
            );
        }

        // Get the content type
        const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';

        // For m3u8 files, we need to rewrite URLs to go through our proxy
        if (contentType.includes('mpegurl') || decodedUrl.endsWith('.m3u8')) {
            const text = await response.text();
            const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);

            // Rewrite relative URLs in the manifest to use our proxy
            const rewrittenManifest = text.split('\n').map(line => {
                // Skip comments and empty lines
                if (line.startsWith('#') || line.trim() === '') {
                    return line;
                }

                // If it's a relative URL, make it absolute and proxy it
                if (!line.startsWith('http')) {
                    const absoluteUrl = new URL(line.trim(), baseUrl).href;
                    return `/api/stream?url=${encodeURIComponent(absoluteUrl)}`;
                }

                // If it's already absolute, proxy it
                return `/api/stream?url=${encodeURIComponent(line.trim())}`;
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

        // For video segments (.ts files), just stream them
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

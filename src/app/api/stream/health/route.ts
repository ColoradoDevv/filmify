import { NextRequest, NextResponse } from 'next/server';

/**
 * Quick health check endpoint to test if a stream URL is accessible
 * This helps identify which channels are actually working
 */
export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
            const response = await fetch(url, {
                method: 'HEAD', // Just check headers, don't download content
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
                    message: 'Request timed out after 5 seconds'
                });
            }

            return NextResponse.json({
                accessible: false,
                error: error.message || 'Network error'
            });
        }
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        );
    }
}

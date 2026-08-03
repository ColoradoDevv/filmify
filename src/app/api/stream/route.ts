import { NextRequest, NextResponse } from 'next/server';
import { validateOutboundUrl } from '@/lib/ssrf-guard';

// Timeout del fetch al origen. Antes no había timeout: orígenes IPTV caídos
// colgaban ~10s+ y devolvían 500, contaminando los logs y bloqueando al
// usuario. AbortSignal.timeout aborta la operación completa (incluida la
// descarga del cuerpo), así que se elige un valor que dé margen a descargar un
// segmento .ts completo en redes lentas, pero corte rápido los orígenes
// muertos (el caso de los logs: ConnectTimeout a un host inalcanzable).
const UPSTREAM_TIMEOUT_MS = 8_000;

// ── GET /api/stream?url=<encoded> — HLS proxy ─────────────────────────────────

export async function GET(request: NextRequest) {
    // PUBLIC: playback works without an account (auth is optional on Filmify).
    // Abuse protection relies on the SSRF guard below and the IP-ban check
    // in middleware.

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
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });

        if (!response.ok) {
            console.error(`Proxy fetch failed: ${response.status} for ${decodedUrl}`);
            // 502 Bad Gateway: el origen respondió con error. Diferencia un
            // fallo del stream remoto de un bug nuestro (5xx propio).
            return NextResponse.json(
                { error: `Stream returned ${response.status}` },
                { status: 502 }
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
        // Timeout (AbortSignal.timeout) → 504 Gateway Timeout; cualquier otro
        // fallo de conexión (DNS, connect refused, reset) → 502 Bad Gateway.
        // Nunca 500: el problema es el origen remoto, no nuestro servidor, y así
        // estos fallos esperables no aparecen como errores de servidor en logs.
        const isTimeout =
            error instanceof Error &&
            (error.name === 'TimeoutError' || error.name === 'AbortError');
        const status = isTimeout ? 504 : 502;
        console.error(`Proxy error (${status}) for ${decodedUrl}:`, error);
        return NextResponse.json(
            { error: isTimeout ? 'Stream timed out' : 'Failed to fetch stream' },
            { status }
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

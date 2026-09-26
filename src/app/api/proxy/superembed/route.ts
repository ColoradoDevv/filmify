import { NextRequest } from 'next/server';
import { resolveAndValidate } from '@/lib/ssrf-guard';
import { getClientIp, checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Upstreams conocidos de SuperEmbed/2Embed — nada fuera de aquí. */
const ALLOWED_UPSTREAM_HOSTS = new Set([
    'www.2embed.cc',
    '2embed.cc',
    'www.superembed.stream',
    'superembed.stream',
]);

const IMDB_RE = /^tt\d{4,}$/;
const SERVER_PARAM_RE = /^[A-Za-z0-9_-]{1,16}$/;
const FETCH_TIMEOUT_MS = 8_000;

async function fetchUpstreamJson(url: string): Promise<unknown> {
    // SSRF guard con DNS + allowlist ANTES de pedir nada.
    const guard = await resolveAndValidate(url);
    if (!guard.ok) throw new Error(guard.reason ?? 'URL bloqueada');
    const hostname = new URL(url).hostname.toLowerCase();
    if (!ALLOWED_UPSTREAM_HOSTS.has(hostname)) throw new Error('Host no permitido');
    const res = await fetch(url, {
        // Sin 'follow' ciego: estos endpoints devuelven JSON, no redirects.
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': 'FilmiFy/1.0' },
    });
    if (!res.ok) throw new Error('Upstream error');
    if (!res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Upstream no-JSON');
    }
    return res.json();
}

export async function GET(request: NextRequest) {
    // PUBLIC: playback is available without an account (auth is optional on
    // Filmify). Abuse protection relies on the strict input validation below
    // (SEC-017: nada se interpola sin validar), the SSRF guard + upstream
    // allowlist, and the IP-ban check in middleware.

    const { searchParams } = new URL(request.url);
    const imdbFull = searchParams.get('imdb_id'); // ej: tt0137523
    const server = searchParams.get('server') || '1';
    const sub = searchParams.get('sub') || '1';

    // Throttle: el upstream es ajeno y cada llamada cuesta.
    const rl = checkRateLimit(`superembed:${getClientIp(request.headers)}`, 30, 60_000);
    if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

    // SEC-017: `tt../../../x` pasaba el startsWith('tt') e inyectaba path/query
    // en el upstream; `server`/`sub` se interpolaban crudos.
    if (!imdbFull || !IMDB_RE.test(imdbFull)) {
        return new Response(JSON.stringify({ error: 'Invalid imdb_id' }), { status: 400 });
    }
    if (!SERVER_PARAM_RE.test(server) || !SERVER_PARAM_RE.test(sub)) {
        return new Response(JSON.stringify({ error: 'Invalid server/sub' }), { status: 400 });
    }

    // Intentar primero 2embed.cc (si está up)
    const e = encodeURIComponent;
    const candidates = [
        `https://www.2embed.cc/api/embed?imdb=${e(imdbFull)}&server=${e(server)}&sub=${e(sub)}`,
        `https://www.superembed.stream/api/embed/video/${e(imdbFull)}?server=${e(server)}&sub=${e(sub)}`,
    ];

    try {
        let data: any = null;
        let lastError: unknown = null;
        for (const url of candidates) {
            try {
                data = await fetchUpstreamJson(url);
                break;
            } catch (err) {
                lastError = err;
            }
        }
        if (!data) throw lastError ?? new Error('Upstream error');

        // Ajusta URL si es necesario (agrega params a embed_url).
        // La URL que devuelve el upstream se valida: solo hosts conocidos
        // llegan al cliente (el iframe la cargaría tal cual).
        const embedKey = data.url || data.embed_url;
        if (typeof embedKey === 'string' && embedKey.length > 0) {
            try {
                const host = new URL(embedKey).hostname.toLowerCase();
                if (!ALLOWED_UPSTREAM_HOSTS.has(host)) {
                    throw new Error('embed_url de host no permitido');
                }
                data.embed_url = `${embedKey}?server=${e(server)}&sub=${e(sub)}`;
            } catch {
                delete data.url;
                delete data.embed_url;
            }
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable. Try VPN.' }), { status: 503 });
    }
}

// Note: `export const runtime = 'edge'` has been removed.
// @opennextjs/cloudflare only supports the Node.js runtime.
// The edge runtime from Next.js is intentionally unsupported by this adapter.

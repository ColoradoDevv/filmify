import { NextResponse } from 'next/server';

/**
 * Rate limiting en memoria (ventana deslizante) + IP de cliente unificada.
 *
 * Es aproximado por proceso (PM2 cluster = un contador por worker), pero
 * frena el abuso obvio: scrapers, reventas de proxy y loops de IA que queman
 * cuota de Groq/TMDB. Para límites duros por cuenta ya existe la tabla
 * `rate_limits` (ver /api/contact).
 *
 * Edge-safe: solo Map + Date.now, sin node:dns. Vale para middleware, route
 * handlers y Server Actions (vía `headers()`).
 */

/**
 * IP real del visitante. Orden de confianza:
 *  1. `cf-connecting-ip` — la pone Cloudflare, el cliente no la falsifica.
 *  2. `x-real-ip` — la pone Nginx.
 *  3. Primer `x-forwarded-for` — último recurso (el ÚLTIMO es el más
 *     falsificable: cada proxy añade a la derecha, así que pop() es justo
 *     lo que un atacante controla).
 */
export function getClientIp(headers: Headers): string {
    return (
        headers.get('cf-connecting-ip')?.trim() ||
        headers.get('x-real-ip')?.trim() ||
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'unknown'
    );
}

interface Bucket {
    hits: number[];
}

const _buckets = new Map<string, Bucket>();
/** Tope de claves: evita crecimiento sin cota si rotan IPs. */
const MAX_KEYS = 20_000;

export interface RateLimitResult {
    ok: boolean;
    /** Segundos hasta poder reintentar (para el header Retry-After). */
    retryAfterSec: number;
}

/** Ventana deslizante: como máximo `limit` eventos por `windowMs`. */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    let bucket = _buckets.get(key);
    if (!bucket) {
        bucket = { hits: [] };
        _buckets.set(key, bucket);
    }
    // Poda de claves muertas cuando el mapa crece (amortizado).
    if (_buckets.size > MAX_KEYS) {
        for (const [k, v] of _buckets) {
            if (v.hits.length === 0 || now - v.hits[v.hits.length - 1] >= windowMs) {
                _buckets.delete(k);
            }
            if (_buckets.size <= MAX_KEYS / 2) break;
        }
    }
    const fresh = bucket.hits.filter((t) => now - t < windowMs);
    bucket.hits = fresh;
    if (fresh.length >= limit) {
        const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - fresh[0])) / 1000));
        return { ok: false, retryAfterSec };
    }
    fresh.push(now);
    return { ok: true, retryAfterSec: 0 };
}

/** Respuesta 429 estándar para route handlers. */
export function rateLimitedResponse(retryAfterSec: number): NextResponse {
    return NextResponse.json(
        { error: 'Demasiadas peticiones. Inténtalo de nuevo en unos segundos.' },
        {
            status: 429,
            headers: { 'Retry-After': String(retryAfterSec) },
        },
    );
}

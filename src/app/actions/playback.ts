'use server';

import { validateOutboundUrl } from '@/lib/ssrf-guard';
import {
    isCircuitOpen,
    recordProviderSuccess,
    recordProviderFailure,
} from '@/server/services/provider-health';
import {
    buildPlaybackSources,
    PROVIDER_HOSTS,
    type PlaybackContext,
    type PlaybackMediaType,
    type PlaybackProviderId,
} from '@/lib/playback-providers';

/**
 * Resolución de la cascada de reproducción (servidor).
 *
 * Recorre los proveedores en orden (Vimeus → VidAPI → VidCore → VidSrc → …)
 * y devuelve el primero cuya RESPUESTA indique que está operativo y con
 * contenido para el título pedido. La respuesta manda:
 *  - HTTP no-2xx / timeout / error de red → proveedor caído → siguiente.
 *  - Señales explícitas de "sin contenido" → siguiente.
 *  - Sin señales de fallo → se considera reproducible.
 *
 * Si ninguno responde, se devuelve el primero (Vimeus, fail-open) para que
 * la UI muestre el selector manual en lugar de una pantalla vacía.
 */

const FETCH_TIMEOUT_MS = 4_500;

/** Hosts que esta sonda tiene permitido verificar (allowlist estricta). */
const ALLOWED_PROBE_HOSTS = new Set<string>([
    'vimeus.com',
    ...Object.values(PROVIDER_HOSTS).flat(),
]);

interface ProbeInput {
    tmdbId: number;
    mediaType: PlaybackMediaType;
    season?: number;
    episode?: number;
    viewKey?: string;
}

// Señales de "sin contenido" en la respuesta de Vimeus (verificadas
// empíricamente; ver src/server/services/vimeus.ts).
const VIMEUS_EMPTY_SIGNALS = [
    /"embeds"\s*:\s*\[\s*\]/,
    /"episodes"\s*:\s*\[\s*\]/,
    /contenido\s+no\s+disponible/i,
    /título\s+no\s+encontrado/i,
    /<title>\s*(error|not found|404)\s*<\/title>/i,
];

// Páginas de parking/venta de dominios o caídas genéricas (resto de proveedores).
const DOWN_SIGNALS = [
    'domain may be for sale',
    'this domain is for sale',
    'buy this domain',
    'domain is parked',
    'parked domain',
    'domain parking',
    'bodis.com',
    'sedo.com',
    'afternic.com',
    'hugedomains.com',
    'cloudflare',
    'origin is unreachable',
    'error code: 522',
    'error code: 523',
    'error code: 524',
];

// Caché en proceso (5 min) para no sondear al mismo título en cada render.
const CACHE_TTL_MS = 5 * 60 * 1000;
const _cache = new Map<string, { providerId: PlaybackProviderId; url: string; at: number }>();

function cacheKey(input: ProbeInput): string {
    return `${input.tmdbId}:${input.mediaType}:${input.season ?? 1}:${input.episode ?? 1}`;
}

async function probeUrl(url: string, providerId: PlaybackProviderId): Promise<boolean> {
    // 1. SSRF guard — bloquea IPs privadas, esquemas no-HTTPS, hosts internos.
    const guard = validateOutboundUrl(url);
    if (!guard.ok) return false;

    // 2. Allowlist — solo proveedores conocidos.
    let hostname: string;
    try {
        hostname = new URL(url).hostname.toLowerCase();
    } catch {
        return false;
    }
    if (!ALLOWED_PROBE_HOSTS.has(hostname)) return false;

    // Circuito abierto (host caído): ni se intenta, fail rápido.
    if (isCircuitOpen(hostname)) return false;

    // 3. Sonda HTTP con timeout corto.
    let html: string;
    try {
        const res = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FilmiFy/2.0)',
                Accept: 'text/html,application/xhtml+xml',
            },
        });
        if (!res.ok) {
            if (res.status >= 500) recordProviderFailure(hostname);
            return false;
        }
        html = await res.text();
        recordProviderSuccess(hostname);
    } catch {
        // Timeout o error de red → proveedor caído → siguiente en la cascada.
        recordProviderFailure(hostname);
        return false;
    }

    // 4. Señales en el cuerpo de la respuesta.
    if (providerId === 'vimeus') {
        for (const signal of VIMEUS_EMPTY_SIGNALS) {
            if (signal.test(html)) return false;
        }
        return true;
    }
    const lower = html.toLowerCase();
    if (DOWN_SIGNALS.some((s) => lower.includes(s))) return false;
    if (/<title>\s*(error|not found|404|domain)/i.test(html)) return false;
    return true;
}

export interface ResolvedPlayback {
    providerId: PlaybackProviderId;
    url: string;
    /** true si ningún proveedor respondió y se devolvió Vimeus en fail-open. */
    degraded: boolean;
}

export async function resolveAvailableProvider(input: ProbeInput): Promise<ResolvedPlayback> {
    const ctx: PlaybackContext = {
        tmdbId: input.tmdbId,
        mediaType: input.mediaType,
        season: input.season ?? 1,
        episode: input.episode ?? 1,
        viewKey: input.viewKey,
    };
    if (!Number.isFinite(ctx.tmdbId) || ctx.tmdbId <= 0) {
        return { providerId: 'vimeus', url: '', degraded: true };
    }

    const key = cacheKey(input);
    const cached = _cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return { providerId: cached.providerId, url: cached.url, degraded: false };
    }

    const sources = buildPlaybackSources(ctx);
    // Sondas en paralelo (cada una con su propio timeout): el tiempo total
    // es el de la más lenta, no la suma. Se elige la primera SANA EN ORDEN
    // de cascada, no la primera en responder.
    const results = await Promise.all(
        sources.map((source) => probeUrl(source.url, source.id)),
    );
    const firstOk = sources.findIndex((_, idx) => results[idx]);
    if (firstOk !== -1) {
        const winner = sources[firstOk];
        _cache.set(key, { providerId: winner.id, url: winner.url, at: Date.now() });
        return { providerId: winner.id, url: winner.url, degraded: false };
    }

    // Ninguno respondió: fail-open con el primero para no dejar pantalla vacía.
    const first = sources[0];
    if (!first) return { providerId: 'vimeus', url: '', degraded: true };
    return { providerId: first.id, url: first.url, degraded: true };
}

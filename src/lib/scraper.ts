/**
 * FilmiFy Smart Scraper
 *
 * This is NOT stream-extraction (no m3u8/mp4 dump) — that requires Cloudflare
 * bypass and breaks weekly. Instead, this module:
 *
 *   1. Builds candidate embed URLs across known providers (TMDB and IMDB based)
 *   2. Probes each candidate concurrently with a real HTTP request + timeout
 *   3. Returns only the providers that actually answered with a 2xx/3xx
 *   4. Sorts the survivors by an empirical priority
 *
 * Caveats:
 *   - HTTP 200 does NOT prove the player will accept being framed (X-Frame
 *     headers are honored by the browser, not the server). It only proves the
 *     domain is alive. Iframe-level failures still need a client-side timeout.
 *   - Cloudflare-protected providers may return 403 to a server fetch yet
 *     load fine in a real browser. We treat 403 as "alive but uncertain" and
 *     keep them with reduced priority instead of dropping them.
 */

import { getExternalIds } from './tmdb/service';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
];

const PROBE_TIMEOUT_MS = 4500;

export interface ScraperResult {
    url: string;
    server: string;
    lang: 'es' | 'en' | 'lat';
    quality?: string;
    /** Higher is better. Empirical, based on observed reliability + audio quality. */
    priority: number;
}

interface Candidate extends ScraperResult {
    /**
     * If the play URL itself blocks server-side probes, set a different URL
     * here (e.g. provider homepage) to verify the domain is alive.
     */
    probeUrl?: string;
    /**
     * Drop the priority by this much when the probe returns 403 (Cloudflare
     * bot challenge). The provider is probably alive but uncertain.
     */
    cloudflarePenalty?: number;
}

function pickUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Probe a URL with a real HTTP request and short timeout.
 *
 * Returns:
 *   - 'ok'    → 2xx/3xx, definitely alive
 *   - 'maybe' → 403 (likely Cloudflare bot block, real browser might still load)
 *   - 'dead'  → 4xx (other) / 5xx / network error / timeout
 */
async function probeUrl(url: string): Promise<'ok' | 'maybe' | 'dead'> {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method: 'GET',
            signal: ctrl.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': pickUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.5',
            },
        });
        if (res.status >= 200 && res.status < 400) return 'ok';
        if (res.status === 403) return 'maybe';
        return 'dead';
    } catch {
        return 'dead';
    } finally {
        clearTimeout(timeout);
    }
}

export class SmartScraper {
    /**
     * Resolve playable embed URLs for a TMDB item, ordered by health + priority.
     */
    static async findStreams(
        tmdbId: number,
        mediaType: 'movie' | 'tv',
        season?: number,
        episode?: number
    ): Promise<ScraperResult[]> {
        const isMovie = mediaType === 'movie';

        // IMDB ID is optional. Some providers (vidsrc.me, autoembed) need it,
        // but the most reliable ones (vidsrc.xyz, vidlink, embed.su) accept
        // TMDB IDs directly. We try to fetch it but don't fail if it's missing.
        let imdbId: string | null = null;
        try {
            const ext = await getExternalIds(tmdbId, mediaType);
            imdbId = ext.imdb_id;
        } catch (err) {
            console.warn('[scraper] external_ids lookup failed', err);
        }

        const candidates: Candidate[] = [];

        // ── Tier 0: Latino-default providers (preferred) ─────────────────────

        // UnLimPlay — multi-scraper que agrega Cuevana, GNULA, CineHD+,
        // CineCalidad, JKAnime, EMBED69 y más. **Default Latino**, fallback
        // Español, fallback Inglés sub. Es el provider más alineado con el
        // requisito de "audio en español latino".
        candidates.push({
            url: isMovie
                ? `https://unlimplay.com/play/embed/movie/${tmdbId}`
                : `https://unlimplay.com/play/embed/tv/${tmdbId}/${season}/${episode}`,
            server: 'UnLimPlay (Latino)',
            lang: 'lat',
            priority: 260,
            quality: '1080p',
            cloudflarePenalty: 20,
        });

        // ── Tier 1: TMDB-native providers (no IMDB ID needed) ────────────────

        // VidSrc.xyz — most reliable multi-source aggregator. Has Spanish
        // audio/subs picker inside the player.
        candidates.push({
            url: isMovie
                ? `https://vidsrc.xyz/embed/movie/${tmdbId}`
                : `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}-${episode}`,
            server: 'VidSrc XYZ',
            lang: 'es',
            priority: 220,
            quality: '1080p',
            cloudflarePenalty: 30,
        });

        // VidSrc.to — same family, asks for Spanish subs by default with ds_lang.
        candidates.push({
            url: (isMovie
                ? `https://vidsrc.to/embed/movie/${tmdbId}`
                : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`) + '?ds_lang=es',
            server: 'VidSrc.to (Subs ES)',
            lang: 'es',
            priority: 210,
            quality: '1080p',
            cloudflarePenalty: 30,
        });

        // VidLink Pro — clean UI, often ad-free, usually has Spanish track.
        candidates.push({
            url: isMovie
                ? `https://vidlink.pro/movie/${tmdbId}`
                : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,
            server: 'VidLink Pro',
            lang: 'es',
            priority: 200,
            quality: '4K/1080p',
            cloudflarePenalty: 40,
        });

        // Embed.su — newer, high availability.
        candidates.push({
            url: isMovie
                ? `https://embed.su/embed/movie/${tmdbId}`
                : `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`,
            server: 'Embed.su',
            lang: 'es',
            priority: 190,
            quality: '1080p',
            cloudflarePenalty: 30,
        });

        // SuperEmbed (multiembed.mov) — strong Latino track support.
        candidates.push({
            url: isMovie
                ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
                : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
            // multiembed serves a working homepage; the query string only matters
            // when the iframe loads it. Probe the bare domain to avoid weird
            // 404s on the parameterized URL.
            probeUrl: 'https://multiembed.mov/',
            server: 'SuperEmbed Latino',
            lang: 'lat',
            priority: 180,
            quality: '1080p',
            cloudflarePenalty: 40,
        });

        // 2Embed.cc — long-running, stable.
        candidates.push({
            url: isMovie
                ? `https://www.2embed.cc/embed/${tmdbId}`
                : `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`,
            server: '2Embed',
            lang: 'es',
            priority: 170,
            quality: '1080p',
            cloudflarePenalty: 30,
        });

        // AutoEmbed.co — note .co (not .cc, which is dead).
        candidates.push({
            url: isMovie
                ? `https://autoembed.co/movie/tmdb/${tmdbId}`
                : `https://autoembed.co/tv/tmdb/${tmdbId}-${season}-${episode}`,
            server: 'AutoEmbed',
            lang: 'es',
            priority: 160,
            quality: '1080p',
            cloudflarePenalty: 30,
        });

        // Rivestream — modern aggregator with multi-source backend (servers,
        // torrent, agg). Documented embed format. No language picker docs but
        // the underlying sources commonly include Spanish.
        candidates.push({
            url: isMovie
                ? `https://watch.rivestream.app/embed?type=movie&id=${tmdbId}`
                : `https://watch.rivestream.app/embed?type=tv&id=${tmdbId}&season=${season}&episode=${episode}`,
            server: 'Rivestream',
            lang: 'es',
            priority: 155,
            quality: '1080p',
            cloudflarePenalty: 25,
        });

        // ── Tier 2: IMDB-based providers (only if we resolved an IMDB ID) ────

        if (imdbId) {
            // VidSrc.in — community mirror of vidsrc.xyz with IMDB lookup.
            candidates.push({
                url: isMovie
                    ? `https://vidsrc.in/embed/movie/${imdbId}`
                    : `https://vidsrc.in/embed/tv/${imdbId}/${season}/${episode}`,
                server: 'VidSrc.in (IMDB)',
                lang: 'es',
                priority: 150,
                quality: '1080p',
                cloudflarePenalty: 30,
            });
        }

        // ── Probe everything in parallel and filter to the survivors ─────────

        const probed = await Promise.all(
            candidates.map(async (c) => {
                const result = await probeUrl(c.probeUrl ?? c.url);
                if (result === 'dead') return null;
                if (result === 'maybe') {
                    return { ...c, priority: c.priority - (c.cloudflarePenalty ?? 0) };
                }
                return c;
            })
        );

        const survivors: ScraperResult[] = probed
            .filter((c): c is Candidate => c !== null)
            .map(({ probeUrl: _p, cloudflarePenalty: _cf, ...rest }) => rest)
            .sort((a, b) => b.priority - a.priority);

        return survivors;
    }
}

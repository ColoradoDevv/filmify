/**
 * FilmiFy Smart Scraper
 *
 * Returns embed URLs for known providers ordered by empirical priority.
 * Probing is intentionally skipped — it blocked the user for 4.5 s × N
 * providers and the HTTP result didn't reliably predict iframe success anyway
 * (Cloudflare 403s load fine in a real browser; HTTP 200s can still be
 * X-Frame-blocked). Client-side iframe timeouts handle dead providers instead.
 *
 * IMDB ID is resolved in parallel with building the candidate list so it
 * doesn't add latency on the critical path.
 */

import { getExternalIds } from './tmdb/service';

export interface ScraperResult {
    url: string;
    server: string;
    lang: 'es' | 'en' | 'lat';
    quality?: string;
    /** Higher is better. Empirical, based on observed reliability + audio quality. */
    priority: number;
}

interface Candidate extends ScraperResult {}

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
        });

        // SuperEmbed (multiembed.mov) — strong Latino track support.
        candidates.push({
            url: isMovie
                ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
                : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
            server: 'SuperEmbed Latino',
            lang: 'lat',
            priority: 180,
            quality: '1080p',
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
            });
        }

        // Return all candidates sorted by priority — no probing.
        // Dead providers are handled client-side via iframe load timeouts.
        return candidates.sort((a, b) => b.priority - a.priority);
    }
}

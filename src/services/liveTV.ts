// Live TV Service - Fetches and parses M3U playlists from multiple IPTV sources
// Channels are cached in Supabase (cached_channels table) for 24 hours to avoid
// re-downloading ~29 MB of M3U data on every request.

import { createServiceRoleClient } from '@/lib/supabase/server';

export interface LiveChannel {
    id: string;
    name: string;
    logo: string;
    country: string;
    category: string;
    streamUrl: string;
    source: string;
    language?: string;
}

// IPTV Sources - Organized by reliability
// Note: Free IPTV streams are inherently unstable. Many channels may be offline.
const IPTV_SOURCES = [
    // Primary sources (more reliable)
    {
        name: 'iptv-org-world',
        url: 'https://iptv-org.github.io/iptv/index.m3u',
        type: 'm3u' as const,
        priority: 1
    },
    {
        name: 'iptv-org-es',
        url: 'https://iptv-org.github.io/iptv/languages/spa.m3u',
        type: 'm3u' as const,
        priority: 2
    },
    {
        name: 'iptv-org-en',
        url: 'https://iptv-org.github.io/iptv/languages/eng.m3u',
        type: 'm3u' as const,
        priority: 2
    },
    // Secondary sources (less reliable)
    {
        name: 'free-tv',
        url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
        type: 'm3u' as const,
        priority: 3
    }
];

/**
 * Parse M3U playlist content into LiveChannel array
 */
function getRandomId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).crypto !== 'undefined' && typeof (globalThis as any).crypto.randomUUID === 'function') {
        return (globalThis as any).crypto.randomUUID();
    }

    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function parseM3U(content: string, sourceName: string): LiveChannel[] {
    const lines = content.split('\n');
    const channels: LiveChannel[] = [];
    let currentChannel: Partial<LiveChannel> = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXTINF:')) {
            // Parse: #EXTINF:-1 tvg-id="..." tvg-logo="..." group-title="Category",Channel Name
            const logoMatch = line.match(/tvg-logo="([^"]*)"/);
            const categoryMatch = line.match(/group-title="([^"]*)"/);
            const countryMatch = line.match(/tvg-country="([^"]*)"/);
            const languageMatch = line.match(/tvg-language="([^"]*)"/);
            const idMatch = line.match(/tvg-id="([^"]*)"/);

            // Channel name is after the last comma
            const parts = line.split(',');
            const name = parts[parts.length - 1]?.trim() || 'Unknown Channel';

            // Try to extract country from tvg-id if not present (e.g. Channel.es -> ES)
            let country = countryMatch?.[1] || '';
            if (!country && idMatch?.[1]) {
                const idParts = idMatch[1].split('.');
                const potentialCountry = idParts[idParts.length - 1]; // Last part often country code
                // Simple check if it looks like a 2-letter country code
                if (potentialCountry && potentialCountry.length === 2 && !potentialCountry.includes('@')) {
                    country = potentialCountry.toUpperCase();
                } else if (idMatch[1].includes('@')) {
                    // Handle format like ID.fr@...
                    const beforeAt = idMatch[1].split('@')[0];
                    const parts = beforeAt.split('.');
                    const code = parts[parts.length - 1];
                    if (code && code.length === 2) country = code.toUpperCase();
                }
            }

            currentChannel = {
                name,
                logo: logoMatch?.[1] || '',
                category: categoryMatch?.[1] || 'General',
                country: country,
                language: languageMatch?.[1] || '',
                source: sourceName
            };
        } else if (line.startsWith('http')) {
            // Stream URL found
            if (currentChannel.name) {
                currentChannel.streamUrl = line;
                currentChannel.id = `${sourceName}-${getRandomId()}`;
                channels.push(currentChannel as LiveChannel);
            }
            currentChannel = {};
        }
    }

    return channels;
}

/**
 * Fetch channels from a single source
 */
async function fetchFromSource(source: typeof IPTV_SOURCES[0]): Promise<LiveChannel[]> {
    try {
        const response = await fetch(source.url, {
            next: { revalidate: 86400 } // Cache for 24 hours
        });

        if (!response.ok) {
            console.error(`Failed to fetch from ${source.name}: ${response.status}`);
            return [];
        }

        if (source.type === 'm3u') {
            const content = await response.text();
            return parseM3U(content, source.name);
        }
        return [];
    } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
        return [];
    }
}

const CACHE_TTL_MS = 86_400_000; // 24 hours

/**
 * Fetch all channels — Supabase cache first, IPTV sources as fallback.
 * Saves ~29 MB of M3U downloads on every request after the first daily fetch.
 */
export async function fetchAllChannels(): Promise<LiveChannel[]> {
    // ── 1. Try Supabase cache ────────────────────────────────────────────────
    try {
        const supabase = createServiceRoleClient();
        const { data: cached } = await supabase
            .from('cached_channels')
            .select('channels, updated_at')
            .eq('id', 1)
            .single();

        const isStale =
            !cached ||
            Date.now() - new Date(cached.updated_at).getTime() > CACHE_TTL_MS;

        if (!isStale && Array.isArray(cached.channels) && cached.channels.length > 0) {
            return cached.channels as LiveChannel[];
        }
    } catch (err) {
        // Cache miss or table doesn't exist yet — fall through to live fetch
        console.warn('[liveTV] cache read failed, fetching live:', err);
    }

    // ── 2. Fetch from IPTV sources ───────────────────────────────────────────
    const channels = await fetchFromIPTVSources();

    // ── 3. Persist to cache (fire-and-forget, don't block the response) ──────
    if (channels.length > 0) {
        createServiceRoleClient()
            .from('cached_channels')
            .upsert({ id: 1, channels, updated_at: new Date().toISOString() })
            .then(({ error }) => {
                if (error) console.error('[liveTV] cache write failed:', error);
            });
    }

    return channels;
}

/**
 * Download and merge channels from all IPTV sources.
 */
async function fetchFromIPTVSources(): Promise<LiveChannel[]> {
    const channelArrays = await Promise.all(
        IPTV_SOURCES.map(source => fetchFromSource(source))
    );

    // Flatten and deduplicate by stream URL
    const allChannels = channelArrays.flat();
    const uniqueChannels = new Map<string, LiveChannel>();

    for (const channel of allChannels) {
        if (channel.streamUrl && !uniqueChannels.has(channel.streamUrl)) {
            uniqueChannels.set(channel.streamUrl, channel);
        }
    }

    return Array.from(uniqueChannels.values());
}

/**
 * Filter channels by criteria
 */
export function filterChannels(
    channels: LiveChannel[],
    filters: {
        country?: string;
        category?: string;
        search?: string;
        language?: string;
    }
): LiveChannel[] {
    return channels.filter(channel => {
        if (filters.country && !channel.country.toLowerCase().includes(filters.country.toLowerCase())) {
            return false;
        }
        if (filters.category && channel.category !== filters.category) {
            return false;
        }
        if (filters.search && !channel.name.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
        }
        if (filters.language && !channel.language?.toLowerCase().includes(filters.language.toLowerCase())) {
            return false;
        }
        return true;
    });
}

/**
 * Get unique categories from channels with smart sorting
 */
export function getCategories(channels: LiveChannel[]): string[] {
    const categories = new Set(channels.map(ch => ch.category).filter(Boolean));
    const categoryArray = Array.from(categories);

    // Priority categories (common ones first)
    const priorityCategories = ['News', 'Sports', 'Entertainment', 'Movies', 'Music', 'Kids', 'Documentary'];

    // Sort: priority categories first, then alphabetically
    return categoryArray.sort((a, b) => {
        const aPriority = priorityCategories.indexOf(a);
        const bPriority = priorityCategories.indexOf(b);

        // Both are priority categories
        if (aPriority !== -1 && bPriority !== -1) {
            return aPriority - bPriority;
        }

        // Only a is priority
        if (aPriority !== -1) return -1;

        // Only b is priority
        if (bPriority !== -1) return 1;

        // Neither is priority, sort alphabetically
        return a.localeCompare(b);
    });
}

/**
 * Get unique countries from channels with smart sorting
 */
export function getCountries(channels: LiveChannel[]): string[] {
    const countries = new Set(
        channels
            .map(ch => ch.country)
            .filter(Boolean)
            .map(c => c.toUpperCase())
    );
    const countryArray = Array.from(countries);

    // Priority countries (Spanish-speaking and popular ones first)
    const priorityCountries = ['MX', 'ES', 'AR', 'CO', 'US', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY'];

    // Sort: priority countries first, then alphabetically
    return countryArray.sort((a, b) => {
        const aPriority = priorityCountries.indexOf(a);
        const bPriority = priorityCountries.indexOf(b);

        // Both are priority countries
        if (aPriority !== -1 && bPriority !== -1) {
            return aPriority - bPriority;
        }

        // Only a is priority
        if (aPriority !== -1) return -1;

        // Only b is priority
        if (bPriority !== -1) return 1;

        // Neither is priority, sort alphabetically
        return a.localeCompare(b);
    });
}

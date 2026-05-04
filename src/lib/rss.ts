/**
 * RSS feed parser — fetches and parses RSS/Atom feeds from cinema news sources.
 * Runs server-side only (Node.js runtime).
 */

export interface RssItem {
    guid: string;
    title: string;
    excerpt: string;
    image_url: string | null;
    source_name: string;
    source_url: string;
    author: string | null;
    original_url: string;
    category: string;
    published_at: string | null;
}

export interface RssSource {
    name: string;
    url: string;
    feedUrl: string;
    category: string;
}

/** Cinema/streaming news RSS sources — all publicly available feeds */
export const RSS_SOURCES: RssSource[] = [
    // NOTICIAS generales de cine
    { name: 'Screen Rant', url: 'https://screenrant.com', feedUrl: 'https://screenrant.com/feed/movies/', category: 'noticias' },
    { name: 'MovieWeb', url: 'https://movieweb.com', feedUrl: 'https://movieweb.com/feed/', category: 'noticias' },
    { name: 'FirstShowing', url: 'https://www.firstshowing.net', feedUrl: 'https://www.firstshowing.net/feed/', category: 'noticias' },
    { name: 'The Playlist', url: 'https://theplaylist.net', feedUrl: 'https://theplaylist.net/feed/', category: 'noticias' },
    { name: 'Film School Rejects', url: 'https://filmschoolrejects.com', feedUrl: 'https://filmschoolrejects.com/feed/', category: 'noticias' },
    // SERIES
    { name: 'Screen Rant TV', url: 'https://screenrant.com', feedUrl: 'https://screenrant.com/feed/tv/', category: 'series' },
    { name: 'TV Line', url: 'https://tvline.com', feedUrl: 'https://tvline.com/feed/', category: 'series' },
    { name: 'Den of Geek TV', url: 'https://www.denofgeek.com', feedUrl: 'https://www.denofgeek.com/tv/feed/', category: 'series' },
    // STREAMING
    { name: 'What\'s on Netflix', url: 'https://www.whats-on-netflix.com', feedUrl: 'https://www.whats-on-netflix.com/feed/', category: 'streaming' },
    { name: 'Decider', url: 'https://decider.com', feedUrl: 'https://decider.com/feed/', category: 'streaming' },
    // RESEÑAS / PELÍCULAS
    { name: 'Roger Ebert', url: 'https://www.rogerebert.com', feedUrl: 'https://www.rogerebert.com/feed', category: 'peliculas' },
    { name: 'Den of Geek', url: 'https://www.denofgeek.com', feedUrl: 'https://www.denofgeek.com/movies/feed/', category: 'peliculas' },
    // PREMIOS
    { name: 'Gold Derby', url: 'https://www.goldderby.com', feedUrl: 'https://www.goldderby.com/feed/', category: 'premios' },
    { name: 'Awards Watch', url: 'https://awardswatch.com', feedUrl: 'https://awardswatch.com/feed/', category: 'premios' },
];

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** Extract first image URL from RSS item */
function extractImage(item: Element): string | null {
    // 1. <media:content url="...">
    const mediaContent = item.querySelector('content');
    if (mediaContent?.getAttribute('url')) return mediaContent.getAttribute('url');

    // 2. <enclosure url="..." type="image/...">
    const enclosure = item.querySelector('enclosure');
    if (enclosure?.getAttribute('type')?.startsWith('image')) {
        return enclosure.getAttribute('url');
    }

    // 3. <media:thumbnail url="...">
    const thumbnail = item.querySelector('thumbnail');
    if (thumbnail?.getAttribute('url')) return thumbnail.getAttribute('url');

    // 4. First <img> in content:encoded
    const encoded = item.querySelector('encoded')?.textContent ?? '';
    const imgMatch = encoded.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];

    return null;
}

/** Parse a single RSS feed and return items */
export async function parseFeed(source: RssSource): Promise<RssItem[]> {
    try {
        const res = await fetch(source.feedUrl, {
            headers: {
                'User-Agent': 'FilmiFy/1.0 (https://filmify.me; RSS aggregator)',
                'Accept': 'application/rss+xml, application/xml, text/xml',
            },
            next: { revalidate: 0 },
            signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) return [];

        const xml = await res.text();

        // Use DOMParser-compatible parsing via regex for Edge/Node compatibility
        const items = parseXmlItems(xml, source);
        return items;
    } catch (err) {
        console.error(`[rss] Failed to fetch ${source.feedUrl}:`, err);
        return [];
    }
}

/** Lightweight XML item parser (no DOM dependency — works in Node.js) */
function parseXmlItems(xml: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];

    // Extract all <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];

        const title = extractTag(block, 'title');
        const link  = extractTag(block, 'link') || extractTag(block, 'guid');
        if (!title || !link) continue;

        const description = extractTag(block, 'description') || extractTag(block, 'summary') || '';
        const encoded     = extractTag(block, 'content:encoded') || extractTag(block, 'encoded') || '';
        const author      = extractTag(block, 'dc:creator') || extractTag(block, 'author') || null;
        const pubDate     = extractTag(block, 'pubDate') || extractTag(block, 'published') || null;
        const guid        = extractTag(block, 'guid') || link;

        // Image: enclosure, media:content, media:thumbnail, or first img in content
        const imageUrl = extractEnclosureImage(block) || extractMediaImage(block) || extractInlineImage(encoded || description);

        // Excerpt: strip HTML from description, max 200 chars
        const rawExcerpt = stripHtml(description || encoded);
        const excerpt = rawExcerpt.length > 220
            ? rawExcerpt.slice(0, 220).replace(/\s+\S*$/, '') + '…'
            : rawExcerpt;

        let publishedAt: string | null = null;
        if (pubDate) {
            try { publishedAt = new Date(pubDate).toISOString(); } catch { /* ignore */ }
        }

        items.push({
            guid,
            title: stripHtml(title),
            excerpt,
            image_url: imageUrl,
            source_name: source.name,
            source_url: source.url,
            author: author ? stripHtml(author) : null,
            original_url: link,
            category: source.category,
            published_at: publishedAt,
        });
    }

    return items;
}

function extractTag(xml: string, tag: string): string {
    // Handle CDATA: <tag><![CDATA[...]]></tag>
    const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRe);
    if (cdataMatch) return cdataMatch[1].trim();

    // Plain text: <tag>...</tag>
    const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const plainMatch = xml.match(plainRe);
    if (plainMatch) return plainMatch[1].trim();

    // Self-closing with href/url attr (for atom:link)
    const attrRe = new RegExp(`<${tag}[^>]+href=["']([^"']+)["'][^>]*\\/?>`, 'i');
    const attrMatch = xml.match(attrRe);
    if (attrMatch) return attrMatch[1].trim();

    return '';
}

function extractEnclosureImage(block: string): string | null {
    const m = block.match(/<enclosure[^>]+type=["']image\/[^"']*["'][^>]+url=["']([^"']+)["']/i)
           || block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\/[^"']*["']/i);
    return m ? m[1] : null;
}

function extractMediaImage(block: string): string | null {
    const m = block.match(/<media:content[^>]+url=["']([^"']+)["']/i)
           || block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
    return m ? m[1] : null;
}

function extractInlineImage(html: string): string | null {
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m ? m[1] : null;
}

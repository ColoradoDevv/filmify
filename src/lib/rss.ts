/**
 * RSS / Atom feed parser — fetches and parses cinema news feeds.
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

// ── Fuentes RSS ──────────────────────────────────────────────────────────────

export const RSS_SOURCES: RssSource[] = [
    // Noticias generales de cine
    { name: 'Screen Rant', url: 'https://screenrant.com', feedUrl: 'https://screenrant.com/feed/movies/', category: 'noticias' },
    { name: 'MovieWeb', url: 'https://movieweb.com', feedUrl: 'https://movieweb.com/feed/', category: 'noticias' },
    { name: 'FirstShowing', url: 'https://www.firstshowing.net', feedUrl: 'https://www.firstshowing.net/feed/', category: 'noticias' },
    { name: 'The Playlist', url: 'https://theplaylist.net', feedUrl: 'https://theplaylist.net/feed/', category: 'noticias' },
    { name: 'Film School Rejects', url: 'https://filmschoolrejects.com', feedUrl: 'https://filmschoolrejects.com/feed/', category: 'noticias' },
    // Series
    { name: 'Screen Rant TV', url: 'https://screenrant.com', feedUrl: 'https://screenrant.com/feed/tv/', category: 'series' },
    { name: 'TV Line', url: 'https://tvline.com', feedUrl: 'https://tvline.com/feed/', category: 'series' },
    { name: 'Den of Geek TV', url: 'https://www.denofgeek.com', feedUrl: 'https://www.denofgeek.com/tv/feed/', category: 'series' },
    // Streaming
    { name: "What's on Netflix", url: 'https://www.whats-on-netflix.com', feedUrl: 'https://www.whats-on-netflix.com/feed/', category: 'streaming' },
    { name: 'Decider', url: 'https://decider.com', feedUrl: 'https://decider.com/feed/', category: 'streaming' },
    // Reseñas / Películas
    { name: 'Roger Ebert', url: 'https://www.rogerebert.com', feedUrl: 'https://www.rogerebert.com/feed', category: 'peliculas' },
    { name: 'Den of Geek', url: 'https://www.denofgeek.com', feedUrl: 'https://www.denofgeek.com/movies/feed/', category: 'peliculas' },
    // Premios
    { name: 'Gold Derby', url: 'https://www.goldderby.com', feedUrl: 'https://www.goldderby.com/feed/', category: 'premios' },
    { name: 'Awards Watch', url: 'https://awardswatch.com', feedUrl: 'https://awardswatch.com/feed/', category: 'premios' },
];

// ── Constantes ────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_SECONDS = 900; // 15 minutos
const MAX_ITEMS_PER_SOURCE = 20;
const MAX_EXCERPT_LENGTH = 200;

// ── Utilidades ─────────────────────────────────────────────────────────────────

/** Elimina HTML y entidades comunes */
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

/** Trunca un texto a una longitud máxima, sin cortar palabras. */
function truncateExcerpt(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    const cut = text.slice(0, maxLen).replace(/\s+\S*$/, '');
    return cut + '…';
}

/** Intenta parsear una fecha y devolver ISO string, o null. */
function parseDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d.toISOString();
    } catch {
        return null;
    }
}

// ── Extracción de imágenes ────────────────────────────────────────────────────

/** Extrae URL de imagen de un bloque de item (RSS o Atom). */
function extractImageFromBlock(block: string, description: string, encoded: string): string | null {
    // Enclosure con type imagen
    const enclosureMatch = block.match(/<enclosure[^>]+type=["']image\/[^"']*["'][^>]+url=["']([^"']+)["']/i)
        || block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\/[^"']*["']/i);
    if (enclosureMatch) return enclosureMatch[1];

    // media:content o media:thumbnail
    const mediaMatch = block.match(/<(?:media:content|media:thumbnail)[^>]+url=["']([^"']+)["']/i);
    if (mediaMatch) return mediaMatch[1];

    // Primer img en content:encoded o description
    const htmlContent = encoded || description;
    const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
    return imgMatch ? imgMatch[1] : null;
}

// ── Parseo de XML (RSS + Atom) ──────────────────────────────────────────────

/**
 * Parsea un feed XML y devuelve sus items.
 * Soporta RSS 2.0 y Atom 1.0.
 */
function parseFeedXml(xml: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];

    // Detectar si es Atom (contiene <feed> y <entry>)
    const isAtom = /<feed\b/i.test(xml) && /<entry\b/i.test(xml);

    const itemBlocks = extractItemBlocks(xml, isAtom);

    for (const block of itemBlocks) {
        const title = extractTagContent(block, isAtom ? 'title' : 'title');
        const link = extractLink(block, isAtom);
        if (!title || !link) continue;

        const description = extractTagContent(block, isAtom ? 'summary' : 'description');
        const encoded = extractTagContent(block, 'content:encoded') || extractTagContent(block, 'encoded');
        const author = extractTagContent(block, 'author') || extractTagContent(block, 'dc:creator') || null;
        const pubDate = extractTagContent(block, 'published') || extractTagContent(block, 'updated') || extractTagContent(block, 'pubDate');
        const guid = extractTagContent(block, 'id') || extractTagContent(block, 'guid') || link;

        const imageUrl = extractImageFromBlock(block, description || '', encoded || '');

        const rawExcerpt = stripHtml(encoded || description || '');
        const excerpt = truncateExcerpt(rawExcerpt, MAX_EXCERPT_LENGTH);

        const publishedAt = parseDate(pubDate);

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

    // Limitar a los más recientes y ordenar por fecha descendente
    return items
        .sort((a, b) => {
            if (!a.published_at) return 1;
            if (!b.published_at) return -1;
            return b.published_at.localeCompare(a.published_at);
        })
        .slice(0, MAX_ITEMS_PER_SOURCE);
}

/** Extrae bloques de items/entries del XML. */
function extractItemBlocks(xml: string, isAtom: boolean): string[] {
    const blocks: string[] = [];
    const tag = isAtom ? 'entry' : 'item';
    const regex = new RegExp(`<${tag}\\b([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match;
    while ((match = regex.exec(xml)) !== null) {
        blocks.push(match[0]);
    }
    return blocks;
}

/** Extrae el contenido textual de un tag, soportando CDATA y atributos. */
function extractTagContent(block: string, tag: string): string {
    // CDATA
    const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
    const cdataMatch = block.match(cdataRe);
    if (cdataMatch) return cdataMatch[1].trim();

    // Contenido normal
    const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const plainMatch = block.match(plainRe);
    if (plainMatch) return plainMatch[1].trim();

    // Tag con atributo (ej. <link href="..." />)
    const attrRe = new RegExp(`<${tag}[^>]+href=["']([^"']+)["'][^>]*\\/?>`, 'i');
    const attrMatch = block.match(attrRe);
    if (attrMatch) return attrMatch[1].trim();

    return '';
}

/** Extrae el link de un bloque (RSS o Atom). */
function extractLink(block: string, isAtom: boolean): string {
    if (isAtom) {
        // Atom: <link rel="alternate" type="text/html" href="..." />
        const m = block.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i);
        if (m) return m[1];
    }
    // RSS: <link>...</link> o <guid> (fallback)
    return extractTagContent(block, 'link') || extractTagContent(block, 'guid') || '';
}

// ── Fetch de un feed ─────────────────────────────────────────────────────────

/** Obtiene y parsea un único feed RSS/Atom. */
export async function parseFeed(source: RssSource): Promise<RssItem[]> {
    try {
        const res = await fetch(source.feedUrl, {
            headers: {
                'User-Agent': 'FilmiFy/1.0 (https://filmify.me; RSS aggregator)',
                Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
            },
            next: { revalidate: CACHE_TTL_SECONDS },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!res.ok) return [];

        const xml = await res.text();
        return parseFeedXml(xml, source);
    } catch (err) {
        console.error(`[rss] Error fetching ${source.feedUrl}:`, err);
        return [];
    }
}

// ── Función combinada (todas las fuentes) ────────────────────────────────────

/**
 * Obtiene y combina los items de todas las fuentes RSS configuradas.
 * Los ítems se ordenan por fecha de publicación (más recientes primero)
 * y se eliminan duplicados por GUID.
 */
export async function getAllRssItems(): Promise<RssItem[]> {
    const promises = RSS_SOURCES.map(source => parseFeed(source).catch(() => [] as RssItem[]));
    const results = await Promise.all(promises);

    const allItems = results.flat();

    // Eliminar duplicados por GUID
    const seen = new Set<string>();
    const unique = allItems.filter(item => {
        if (seen.has(item.guid)) return false;
        seen.add(item.guid);
        return true;
    });

    // Ordenar por fecha descendente
    unique.sort((a, b) => {
        if (!a.published_at) return 1;
        if (!b.published_at) return -1;
        return b.published_at.localeCompare(a.published_at);
    });

    return unique;
}
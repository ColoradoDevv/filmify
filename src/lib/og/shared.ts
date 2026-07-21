export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/svg+xml';

const DEFAULT_CACHE_CONTROL = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';

export function escapeXml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

export function svgResponse(svg: string): Response {
    return new Response(svg, {
        headers: {
            'Content-Type': `${OG_CONTENT_TYPE}; charset=utf-8`,
            'Cache-Control': DEFAULT_CACHE_CONTROL,
        },
    });
}

export async function fetchRemoteDataUri(
    url: string,
    fallbackContentType = 'image/jpeg',
): Promise<string | null> {
    try {
        const response = await fetch(url, {
            next: { revalidate: 86_400 },
        });

        if (!response.ok) {
            return null;
        }

        const bytes = await response.arrayBuffer();
        if (bytes.byteLength === 0) {
            return null;
        }

        const contentType = response.headers.get('content-type')?.split(';')[0] || fallbackContentType;
        return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
    } catch {
        return null;
    }
}

function normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}

function characterWeight(character: string): number {
    if (character === ' ') return 0.32;
    if ('ijlftI.,:;!|\'`"’‘“”()[]{}'.includes(character)) return 0.34;
    if ('mwMW@#%&'.includes(character)) return 0.92;
    if ('ABCDEFGHKNOPQRSTUVWXYZ0123456789'.includes(character)) return 0.72;
    if ('áéíóúüñÁÉÍÓÚÜÑ'.includes(character)) return 0.67;
    return 0.58;
}

export function estimateTextWidth(text: string, fontSize: number): number {
    const normalized = normalizeText(text);
    const units = Array.from(normalized).reduce((sum, character) => sum + characterWeight(character), 0);
    return units * fontSize;
}

export function truncateText(text: string, maxWidth: number, fontSize: number): string {
    const normalized = normalizeText(text);
    const ellipsis = '…';

    if (estimateTextWidth(normalized, fontSize) <= maxWidth) {
        return normalized;
    }

    let truncated = '';
    for (const character of normalized) {
        const candidate = `${truncated}${character}${ellipsis}`;
        if (estimateTextWidth(candidate, fontSize) > maxWidth) {
            break;
        }
        truncated += character;
    }

    return `${truncated.trimEnd()}${ellipsis}`;
}

export function wrapText(text: string, maxWidth: number, fontSize: number, maxLines: number): string[] {
    const normalized = normalizeText(text);
    const words = normalized.split(' ').filter(Boolean);

    if (words.length === 0) {
        return [''];
    }

    const lines: string[] = [];
    let currentLine = '';

    for (let index = 0; index < words.length; index += 1) {
        const word = words[index];
        const candidate = currentLine ? `${currentLine} ${word}` : word;

        if (estimateTextWidth(candidate, fontSize) <= maxWidth) {
            currentLine = candidate;
            continue;
        }

        if (currentLine) {
            lines.push(currentLine);
        } else {
            lines.push(truncateText(word, maxWidth, fontSize));
        }

        if (lines.length === maxLines - 1) {
            const remainder = [word, ...words.slice(index + 1)].join(' ');
            lines.push(truncateText(remainder, maxWidth, fontSize));
            return lines;
        }

        currentLine = word;
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    if (lines.length <= maxLines) {
        if (lines.length === maxLines) {
            lines[maxLines - 1] = truncateText(lines[maxLines - 1], maxWidth, fontSize);
        }
        return lines;
    }

    const clippedLines = lines.slice(0, maxLines - 1);
    clippedLines.push(truncateText(lines.slice(maxLines - 1).join(' '), maxWidth, fontSize));
    return clippedLines;
}

export function fitText(
    text: string,
    options: {
        maxWidth: number;
        maxLines: number;
        maxFontSize: number;
        minFontSize: number;
    },
): { fontSize: number; lines: string[] } {
    const { maxWidth, maxLines, maxFontSize, minFontSize } = options;
    const normalized = normalizeText(text);

    for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
        const lines = wrapText(normalized, maxWidth, fontSize, maxLines);
        const fits = lines.length <= maxLines && lines.every((line) => estimateTextWidth(line, fontSize) <= maxWidth + 2);

        if (fits) {
            return { fontSize, lines };
        }
    }

    const fontSize = minFontSize;
    return { fontSize, lines: wrapText(normalized, maxWidth, fontSize, maxLines) };
}

export function renderFilmifyLogoMarkup(x: number, y: number, size: number): string {
    const scale = size / 512;

    return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M120 100 H220 V412 H120 V100 Z" fill="#00c2ff"/><circle cx="170" cy="160" r="18" fill="#0b0e11"/><circle cx="170" cy="256" r="18" fill="#0b0e11"/><circle cx="170" cy="352" r="18" fill="#0b0e11"/><path d="M220 100 H392 C403 100 412 109 412 120 V180 H220 V100 Z" fill="#00c2ff"/><path d="M220 236 H340 C351 236 360 245 360 256 V316 H220 V236 Z" fill="#ff0a16"/></g>`;
}

export function renderStarMarkup(x: number, y: number, size: number, fill = '#001f2a'): string {
    const scale = size / 24;

    return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" fill="${fill}"/></g>`;
}

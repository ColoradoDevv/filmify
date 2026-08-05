import { escapeXml, fetchRemoteDataUri, fitText, renderFilmifyLogoMarkup, svgResponse } from './shared';
import { OG_SIZE } from './shared';

export async function renderPageOgImage(title: string, imageUrl?: string): Promise<Response> {
    const safeTitle = (title || 'FilmiFy').trim();

    let imageDataUri: string | null = null;
    if (imageUrl) {
        try {
            // Only accept http(s) URLs
            if (/^https?:\/\//i.test(imageUrl)) {
                imageDataUri = await fetchRemoteDataUri(imageUrl);
            }
        } catch {
            imageDataUri = null;
        }
    }

    const textX = 88;
    const titleFit = fitText(safeTitle, {
        maxWidth: imageDataUri ? 680 : 1040,
        maxLines: 3,
        maxFontSize: 64,
        minFontSize: 36,
    });

    const titleLineHeight = Math.round(titleFit.fontSize * 1.08);
    const titleY = 220;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${OG_SIZE.width}" height="${OG_SIZE.height}" viewBox="0 0 ${OG_SIZE.width} ${OG_SIZE.height}" fill="none">
            <defs>
                <linearGradient id="baseBackground" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#0b0e11" />
                    <stop offset="65%" stop-color="#0f1318" />
                    <stop offset="100%" stop-color="#141b24" />
                </linearGradient>
                <linearGradient id="bottomFade" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stop-color="#0b0e11" stop-opacity="0.86" />
                    <stop offset="55%" stop-color="#0b0e11" stop-opacity="0" />
                </linearGradient>
            </defs>

            <rect width="${OG_SIZE.width}" height="${OG_SIZE.height}" fill="url(#baseBackground)" />

            ${imageDataUri ? `<image href="${escapeXml(imageDataUri)}" x="0" y="0" width="${OG_SIZE.width}" height="${OG_SIZE.height}" preserveAspectRatio="xMidYMid slice" opacity="0.92" />` : ''}

            <rect width="${OG_SIZE.width}" height="${OG_SIZE.height}" fill="url(#baseBackground)" opacity="0.6" />
            <rect width="${OG_SIZE.width}" height="${OG_SIZE.height}" fill="url(#bottomFade)" />

            <g transform="translate(${textX} 116)">
                ${renderFilmifyLogoMarkup(0, 0, 64)}
                <text x="88" y="48" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="800" letter-spacing="-1.2">
                    <tspan fill="#ffffff">Filmi</tspan>
                    <tspan fill="#00c2ff">Fy</tspan>
                </text>
            </g>

            ${titleFit.lines
                .map((line, index) => `
                    <text x="${textX}" y="${titleY + index * titleLineHeight}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${titleFit.fontSize}" font-weight="800" letter-spacing="-1.1">
                        ${escapeXml(line)}
                    </text>
                `)
                .join('')}

            <text x="${textX}" y="${titleY + titleFit.lines.length * titleLineHeight + 48}" fill="#ffffff" fill-opacity="0.7" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600">
                FilmiFy — Dónde ver películas y series online
            </text>
        </svg>
    `;

    return svgResponse(svg);
}

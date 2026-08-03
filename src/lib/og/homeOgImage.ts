import { escapeXml, fetchRemoteDataUri, fitText, renderFilmifyLogoMarkup, svgResponse } from './shared';

interface TrendingPoster {
    poster_path?: string | null;
}

async function fetchTrendingPosterPaths(): Promise<string[]> {
    const key = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!key) return [];

    try {
        const response = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${key}`, {
            next: { revalidate: 86_400 },
        });

        if (!response.ok) {
            return [];
        }

        const payload = await response.json();
        const results = (payload?.results ?? []) as TrendingPoster[];
        return results
            .map((item) => item?.poster_path)
            .filter((posterPath): posterPath is string => Boolean(posterPath))
            .slice(0, 4);
    } catch {
        return [];
    }
}

async function fetchTrendingPosterDataUris(): Promise<string[]> {
    const paths = await fetchTrendingPosterPaths();
    const posters = await Promise.all(
        paths.map((path) => fetchRemoteDataUri(`https://image.tmdb.org/t/p/w342${path}`)),
    );

    return posters.filter((poster): poster is string => Boolean(poster));
}

function renderPosterCard(
    posterDataUri: string | null,
    x: number,
    y: number,
    rotate: number,
    width: number,
    height: number,
    label: string,
    clipId: string,
): string {
    const transform = `translate(${x} ${y}) rotate(${rotate} ${width / 2} ${height / 2})`;

    return `
        <g transform="${transform}" clip-path="url(#${clipId})">
            <rect x="0" y="0" width="${width}" height="${height}" rx="24" fill="#111827" opacity="0.96" />
            <rect x="0" y="0" width="${width}" height="${height}" rx="24" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" />
            ${
                posterDataUri
                    ? `<image href="${escapeXml(posterDataUri)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />`
                    : `
                        <rect x="0" y="0" width="${width}" height="${height}" rx="24" fill="url(#fallbackCard)" />
                        <text x="${width / 2}" y="${height / 2 - 8}" text-anchor="middle" fill="#ffffff" fill-opacity="0.82" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">${escapeXml(label)}</text>
                        <text x="${width / 2}" y="${height / 2 + 26}" text-anchor="middle" fill="#ffffff" fill-opacity="0.55" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="500">FilmiFy</text>
                    `
            }
        </g>
    `;
}

export async function renderHomeOgImage(): Promise<Response> {
    const posters = await fetchTrendingPosterDataUris();
    const title = 'Ver películas y series online';
    const subtitle = 'Catálogo actualizado a diario, gratis y sin registro.';
    const tagline = 'Miles de títulos para descubrir y ver al instante.';

    const posterSize = { width: 154, height: 231 };
    const cardLayouts = [
        { x: 790, y: 120, rotate: -8 },
        { x: 960, y: 88, rotate: 7 },
        { x: 812, y: 334, rotate: 5 },
        { x: 986, y: 300, rotate: -6 },
    ];
    const clipPathDefinitions = cardLayouts
        .map(
            (_, index) => `
                <clipPath id="posterClip-${index}" clipPathUnits="userSpaceOnUse">
                    <rect x="0" y="0" width="${posterSize.width}" height="${posterSize.height}" rx="24" />
                </clipPath>
            `,
        )
        .join('');

    const titleFit = fitText(title, {
        maxWidth: 560,
        maxLines: 2,
        maxFontSize: 50,
        minFontSize: 40,
    });

    const subtitleFit = fitText(subtitle, {
        maxWidth: 560,
        maxLines: 2,
        maxFontSize: 30,
        minFontSize: 24,
    });

    const titleLineHeight = Math.round(titleFit.fontSize * 1.12);
    const subtitleLineHeight = Math.round(subtitleFit.fontSize * 1.18);

    const titleX = 88;
    const titleY = 256;
    const subtitleY = titleY + titleFit.lines.length * titleLineHeight + 26;
    const pillsY = subtitleY + subtitleFit.lines.length * subtitleLineHeight + 34;

    const heroMarkup = cardLayouts
        .map((layout, index) =>
                renderPosterCard(
                    posters[index] ?? null,
                    layout.x,
                    layout.y,
                    layout.rotate,
                    posterSize.width,
                    posterSize.height,
                    `Póster ${index + 1}`,
                    `posterClip-${index}`,
                ),
        )
        .join('');

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
            <defs>
                <linearGradient id="backgroundGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#0b0e11" />
                    <stop offset="62%" stop-color="#0f1319" />
                    <stop offset="100%" stop-color="#111827" />
                </linearGradient>
                <linearGradient id="rightGlow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#00c2ff" stop-opacity="0.22" />
                    <stop offset="100%" stop-color="#00c2ff" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="leftGlow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#ff0a16" stop-opacity="0.16" />
                    <stop offset="100%" stop-color="#ff0a16" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="fallbackCard" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#172033" />
                    <stop offset="100%" stop-color="#0f172a" />
                </linearGradient>
                ${clipPathDefinitions}
            </defs>

            <rect width="1200" height="630" fill="url(#backgroundGradient)" />
            <circle cx="990" cy="118" r="270" fill="url(#rightGlow)" />
            <circle cx="126" cy="540" r="210" fill="url(#leftGlow)" />

            <g opacity="0.16">
                <circle cx="120" cy="88" r="2" fill="#ffffff" />
                <circle cx="180" cy="132" r="2" fill="#ffffff" />
                <circle cx="1020" cy="536" r="2" fill="#ffffff" />
                <circle cx="1092" cy="470" r="2" fill="#ffffff" />
            </g>

            <rect x="0" y="0" width="1200" height="630" fill="url(#backgroundGradient)" opacity="0.26" />
            <g opacity="0.34">
                <rect x="760" y="92" width="392" height="446" rx="40" fill="#0b0e11" />
            </g>

            ${heroMarkup}

            <g transform="translate(${titleX} 116)">
                ${renderFilmifyLogoMarkup(0, 0, 72)}
            <text x="88" y="48" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="800" letter-spacing="-2">
                    <tspan fill="#ffffff">Filmi</tspan>
                    <tspan fill="#00c2ff">Fy</tspan>
                </text>
            </g>

            ${titleFit.lines
                .map(
                    (line, index) => `
                        <text x="${titleX}" y="${titleY + index * titleLineHeight}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${titleFit.fontSize}" font-weight="800" letter-spacing="-1.2">
                            ${escapeXml(line)}
                        </text>
                    `,
                )
                .join('')}

            ${subtitleFit.lines
                .map(
                    (line, index) => `
                        <text x="${titleX}" y="${subtitleY + index * subtitleLineHeight}" fill="#ffffff" fill-opacity="0.78" font-family="Arial, Helvetica, sans-serif" font-size="${subtitleFit.fontSize}" font-weight="500">
                            ${escapeXml(line)}
                        </text>
                    `,
                )
                .join('')}

            <g transform="translate(${titleX} ${pillsY})">
                <rect x="0" y="0" width="132" height="46" rx="9999" fill="#00c2ff" />
                <text x="66" y="31" text-anchor="middle" fill="#001f2a" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800">Gratis</text>

                <rect x="148" y="0" width="194" height="46" rx="9999" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" />
                <text x="245" y="31" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">Sin registro</text>
            </g>

            <text x="${titleX}" y="${pillsY + 100}" fill="#ffffff" fill-opacity="0.62" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="500">
                ${escapeXml(tagline)}
            </text>
        </svg>
    `;

    return svgResponse(svg);
}

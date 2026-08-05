import { escapeXml, fetchRemoteDataUri, fitText, OG_SIZE, renderFilmifyLogoMarkup, renderStarMarkup, svgResponse } from './shared';

export { OG_CONTENT_TYPE, OG_SIZE } from './shared';

interface TitleData {
    title: string;
    year: string | null;
    rating: string | null;
    backdropPath: string | null;
    posterPath: string | null;
    typeLabel: string;
}

async function fetchTitle(mediaType: 'movie' | 'tv', id: string): Promise<TitleData | null> {
    const key = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!key) return null;

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${key}&language=es-MX`,
            { next: { revalidate: 86_400 } },
        );

        if (!response.ok) {
            return null;
        }

        const payload = await response.json();
        const releaseDate: string | undefined = mediaType === 'movie' ? payload.release_date : payload.first_air_date;

        return {
            title: (mediaType === 'movie' ? payload.title : payload.name) ?? 'FilmiFy',
            year: releaseDate ? String(new Date(releaseDate).getFullYear()) : null,
            rating: payload.vote_average ? Number(payload.vote_average).toFixed(1) : null,
            backdropPath: payload.backdrop_path ?? null,
            posterPath: payload.poster_path ?? null,
            typeLabel: mediaType === 'movie' ? 'Película' : 'Serie',
        };
    } catch {
        return null;
    }
}

function renderTitleSvg(options: {
    title: string;
    year: string | null;
    rating: string | null;
    typeLabel: string;
    posterDataUri: string | null;
    backdropDataUri: string | null;
}): string {
    const { title, year, rating, typeLabel, posterDataUri, backdropDataUri } = options;
    const usePoster = Boolean(posterDataUri);
    const textX = usePoster ? 430 : 80;
    const textMaxWidth = usePoster ? 670 : 1040;
    const titleFit = fitText(title, {
        maxWidth: textMaxWidth,
        maxLines: 3,
        maxFontSize: 76,
        minFontSize: 48,
    });
    const titleLineHeight = Math.round(titleFit.fontSize * 1.1);
    const titleTop = 210;
    const titleBaselineOffset = Math.round(titleFit.fontSize * 0.88);
    const metaTop = titleTop + titleFit.lines.length * titleLineHeight + 28;
    const pillTop = metaTop + 72;
    const badgeWidth = rating ? 128 : 0;
    const metaLabel = [typeLabel, year].filter(Boolean).join(' · ');

    return `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${OG_SIZE.width}" height="${OG_SIZE.height}" viewBox="0 0 ${OG_SIZE.width} ${OG_SIZE.height}" fill="none">
            <defs>
                <linearGradient id="baseBackground" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#0b0e11" />
                    <stop offset="65%" stop-color="#0f1318" />
                    <stop offset="100%" stop-color="#141b24" />
                </linearGradient>
                <linearGradient id="darkenLeft" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#0b0e11" stop-opacity="0.96" />
                    <stop offset="52%" stop-color="#0b0e11" stop-opacity="0.8" />
                    <stop offset="100%" stop-color="#0b0e11" stop-opacity="0.56" />
                </linearGradient>
                <linearGradient id="bottomFade" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stop-color="#0b0e11" stop-opacity="0.86" />
                    <stop offset="55%" stop-color="#0b0e11" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="posterFallback" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#182433" />
                    <stop offset="100%" stop-color="#0f172a" />
                </linearGradient>
                <clipPath id="posterClip">
                    <rect x="70" y="90" width="300" height="450" rx="24" />
                </clipPath>
            </defs>

            <rect width="1200" height="630" fill="url(#baseBackground)" />

            ${
                backdropDataUri
                    ? `<image href="${escapeXml(backdropDataUri)}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice" opacity="0.92" />`
                    : ''
            }

            <rect width="1200" height="630" fill="url(#darkenLeft)" />
            <rect width="1200" height="630" fill="url(#bottomFade)" />

            <rect x="70" y="90" width="300" height="450" rx="24" fill="${usePoster ? '#0f172a' : 'url(#posterFallback)'}" opacity="0.95" />

            ${
                usePoster
                    ? `<image href="${escapeXml(posterDataUri ?? '')}" x="70" y="90" width="300" height="450" preserveAspectRatio="xMidYMid slice" clip-path="url(#posterClip)" />`
                    : `
                        <g transform="translate(100 190)">
                            ${renderFilmifyLogoMarkup(0, 0, 120)}
                        <text x="60" y="200" text-anchor="middle" fill="#ffffff" fill-opacity="0.84" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">FilmiFy</text>
                        <text x="60" y="234" text-anchor="middle" fill="#ffffff" fill-opacity="0.6" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="500">Sin póster</text>
                        </g>
                    `
            }

            <rect x="70" y="90" width="300" height="450" rx="24" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" />

            <g transform="translate(${textX} 116)">
                ${renderFilmifyLogoMarkup(0, 0, 72)}
                <text x="88" y="48" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="800" letter-spacing="-2">
                    <tspan fill="#ffffff">Filmi</tspan>
                    <tspan fill="#00c2ff">Fy</tspan>
                </text>
            </g>

            ${titleFit.lines
                .map(
                    (line, index) => `
                        <text x="${textX}" y="${titleTop + index * titleLineHeight + titleBaselineOffset}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${titleFit.fontSize}" font-weight="800" letter-spacing="-1.2">
                            ${escapeXml(line)}
                        </text>
                    `,
                )
                .join('')}

            ${
                rating
                    ? `
                        <g transform="translate(${textX} ${metaTop})">
                            <rect x="0" y="0" width="${badgeWidth}" height="46" rx="12" fill="#00c2ff" />
                            ${renderStarMarkup(14, 11, 24)}
                            <text x="42" y="31" fill="#001f2a" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800">${escapeXml(rating)}</text>
                        </g>
                    `
                    : ''
            }

            <text x="${textX + (rating ? 148 : 0)}" y="${metaTop + 31}" fill="#ffffff" fill-opacity="0.76" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="600">
                ${escapeXml(metaLabel)}
            </text>

            <g transform="translate(${textX} ${pillTop})">
                <rect x="0" y="0" width="220" height="50" rx="12" fill="#ffffff" fill-opacity="0.1" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2" />
                <text x="110" y="33" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">Ver gratis en FilmiFy</text>
            </g>
        </svg>
    `;
}

export async function renderTitleOgImage(mediaType: 'movie' | 'tv', id: string): Promise<Response> {
    const data = await fetchTitle(mediaType, id);
    const posterDataUri = data?.posterPath
        ? await fetchRemoteDataUri(`https://image.tmdb.org/t/p/w342${data.posterPath}`)
        : null;
    const backdropDataUri = data?.backdropPath
        ? await fetchRemoteDataUri(`https://image.tmdb.org/t/p/w780${data.backdropPath}`)
        : null;

    return svgResponse(
        renderTitleSvg({
            title: data?.title ?? 'FilmiFy',
            year: data?.year ?? null,
            rating: data?.rating ?? null,
            typeLabel: data?.typeLabel ?? (mediaType === 'movie' ? 'Película' : 'Serie'),
            posterDataUri,
            backdropDataUri,
        }),
    );
}

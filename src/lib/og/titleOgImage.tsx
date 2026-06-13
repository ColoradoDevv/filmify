import { ImageResponse } from 'next/og';

/**
 * Generador compartido de la imagen Open Graph para fichas de título
 * (película o serie). Lo usan:
 *   - src/app/(platform)/movie/[id]/opengraph-image.tsx
 *   - src/app/(platform)/tv/[id]/opengraph-image.tsx
 *
 * Resultado (1200×630, la "vista rápida" de WhatsApp/Telegram/X):
 *   fondo = backdrop de la película · póster a un lado · título + año + rating
 *   · marca "FilmiFy" con su logo. Todo oscurecido para que el texto se lea.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// Ícono de FilmiFy (solo las formas; el texto "FilmiFy" se renderiza aparte
// con la fuente de satori, ya que resvg no rasteriza <text> sin la fuente).
const LOGO_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M120 100 H220 V412 H120 V100 Z" fill="#00c2ff"/><circle cx="170" cy="160" r="18" fill="#0b0e11"/><circle cx="170" cy="256" r="18" fill="#0b0e11"/><circle cx="170" cy="352" r="18" fill="#0b0e11"/><path d="M220 100 H392 C403 100 412 109 412 120 V180 H220 V100 Z" fill="#00c2ff"/><path d="M220 236 H340 C351 236 360 245 360 256 V316 H220 V236 Z" fill="#ff0a16"/></svg>`;
const LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`;

// Estrella del rating como SVG (no como glifo ★ U+2605): la fuente por defecto
// de satori no incluye ese carácter, así que ImageResponse intentaba
// descargar una fuente dinámica para él y fallaba con "Status: 400", rompiendo
// la imagen OG. Renderizarla como forma vectorial evita cualquier fuente.
const STAR_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" fill="#001f2a"/></svg>`;
const STAR_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(STAR_SVG)}`;

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
        const res = await fetch(
            `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${key}&language=es-MX`,
            { next: { revalidate: 86_400 } },
        );
        if (!res.ok) return null;
        const m = await res.json();
        const date: string | undefined = mediaType === 'movie' ? m.release_date : m.first_air_date;
        return {
            title: (mediaType === 'movie' ? m.title : m.name) ?? 'FilmiFy',
            year: date ? String(new Date(date).getFullYear()) : null,
            rating: m.vote_average ? Number(m.vote_average).toFixed(1) : null,
            backdropPath: m.backdrop_path ?? null,
            posterPath: m.poster_path ?? null,
            typeLabel: mediaType === 'movie' ? 'Película' : 'Serie',
        };
    } catch {
        return null;
    }
}

export async function renderTitleOgImage(mediaType: 'movie' | 'tv', id: string) {
    const data = await fetchTitle(mediaType, id);

    const title = data?.title ?? 'FilmiFy';
    const backdrop = data?.backdropPath
        ? `https://image.tmdb.org/t/p/w1280${data.backdropPath}`
        : null;
    const poster = data?.posterPath
        ? `https://image.tmdb.org/t/p/w342${data.posterPath}`
        : null;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    position: 'relative',
                    background: '#0b0e11',
                }}
            >
                {/* Fondo: backdrop de la película */}
                {backdrop && (
                    <img
                        src={backdrop}
                        width={1200}
                        height={630}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 1200,
                            height: 630,
                            objectFit: 'cover',
                        }}
                        alt=""
                    />
                )}

                {/* Overlays de contraste */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 1200,
                        height: 630,
                        background:
                            'linear-gradient(90deg, rgba(11,14,17,0.96) 0%, rgba(11,14,17,0.8) 52%, rgba(11,14,17,0.55) 100%)',
                        display: 'flex',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 1200,
                        height: 630,
                        background:
                            'linear-gradient(0deg, rgba(11,14,17,0.9) 0%, rgba(11,14,17,0) 55%)',
                        display: 'flex',
                    }}
                />

                {/* Contenido */}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        padding: '0 70px',
                    }}
                >
                    {/* Póster */}
                    {poster && (
                        <img
                            src={poster}
                            width={300}
                            height={450}
                            style={{
                                width: 300,
                                height: 450,
                                borderRadius: 20,
                                objectFit: 'cover',
                                marginRight: 56,
                            }}
                            alt=""
                        />
                    )}

                    {/* Texto */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                        }}
                    >
                        {/* Marca FilmiFy — "Filmi" blanco + "Fy" cian */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 26 }}>
                            <img src={LOGO_DATA_URI} width={52} height={52} alt="FilmiFy" />
                            <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: -1.5, marginLeft: 4 }}>
                                <div style={{ display: 'flex', color: '#ffffff' }}>Filmi</div>
                                <div style={{ display: 'flex', color: '#00c2ff' }}>Fy</div>
                            </div>
                        </div>

                        {/* Título de la película */}
                        <div
                            style={{
                                display: 'flex',
                                fontSize: title.length > 28 ? 56 : 72,
                                fontWeight: 800,
                                color: '#ffffff',
                                lineHeight: 1.05,
                                letterSpacing: -2,
                                marginBottom: 22,
                            }}
                        >
                            {title}
                        </div>

                        {/* Meta: tipo · año · rating */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
                            {data?.rating && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: '#00c2ff',
                                        color: '#001f2a',
                                        fontSize: 26,
                                        fontWeight: 700,
                                        padding: '8px 20px',
                                        borderRadius: 9999,
                                        marginRight: 16,
                                    }}
                                >
                                    <img src={STAR_DATA_URI} width={26} height={26} alt="" style={{ marginRight: 8 }} />
                                    {data.rating}
                                </div>
                            )}
                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: 30,
                                    color: 'rgba(255,255,255,0.75)',
                                }}
                            >
                                {[data?.typeLabel, data?.year].filter(Boolean).join('  ·  ')}
                            </div>
                        </div>

                        {/* CTA */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                alignSelf: 'flex-start',
                                background: 'rgba(255,255,255,0.1)',
                                border: '2px solid rgba(255,255,255,0.2)',
                                color: '#ffffff',
                                fontSize: 28,
                                fontWeight: 600,
                                padding: '12px 30px',
                                borderRadius: 9999,
                            }}
                        >
                            Ver gratis en FilmiFy
                        </div>
                    </div>
                </div>
            </div>
        ),
        { ...OG_SIZE },
    );
}

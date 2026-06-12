import { ImageResponse } from 'next/og';

/**
 * Open Graph image (1200x630 PNG) generada en cada request con next/og.
 * Es la "vista rápida" que muestran WhatsApp, Telegram, Facebook, X, etc.
 *
 * Diseño tipo Netflix: mosaico de pósters reales del catálogo de fondo,
 * oscurecido para contraste, con el logo de FilmiFy y el claim al centro.
 * Los crawlers sociales NO renderizan SVG, por eso se rasteriza a PNG aquí.
 */

export const runtime = 'edge';
export const alt = 'FilmiFy - Ver películas y series online gratis';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Ícono de FilmiFy (solo formas; el texto "FilmiFy" se renderiza aparte).
const LOGO_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M120 100 H220 V412 H120 V100 Z" fill="#00c2ff"/><circle cx="170" cy="160" r="18" fill="#0b0e11"/><circle cx="170" cy="256" r="18" fill="#0b0e11"/><circle cx="170" cy="352" r="18" fill="#0b0e11"/><path d="M220 100 H392 C403 100 412 109 412 120 V180 H220 V100 Z" fill="#00c2ff"/><path d="M220 236 H340 C351 236 360 245 360 256 V316 H220 V236 Z" fill="#ff0a16"/></svg>`;
const LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`;

async function getPosterPaths(): Promise<string[]> {
    const key = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!key) return [];
    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/trending/movie/week?api_key=${key}`,
            { next: { revalidate: 86_400 } },
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results ?? [])
            .map((m: { poster_path?: string }) => m.poster_path)
            .filter(Boolean)
            .slice(0, 14);
    } catch {
        return [];
    }
}

export default async function OpengraphImage() {
    const posters = await getPosterPaths();

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
                {/* ── Fondo: mosaico de pósters ── */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 1200,
                        height: 630,
                        display: 'flex',
                        flexWrap: 'wrap',
                    }}
                >
                    {posters.map((p, i) => (
                        <img
                            key={i}
                            src={`https://image.tmdb.org/t/p/w342${p}`}
                            width={171}
                            height={257}
                            style={{ objectFit: 'cover' }}
                            alt=""
                        />
                    ))}
                </div>

                {/* ── Overlays de contraste ── */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 1200,
                        height: 630,
                        background:
                            'linear-gradient(90deg, rgba(11,14,17,0.97) 0%, rgba(11,14,17,0.82) 50%, rgba(11,14,17,0.6) 100%)',
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
                            'linear-gradient(0deg, rgba(11,14,17,0.85) 0%, rgba(11,14,17,0) 45%)',
                        display: 'flex',
                    }}
                />

                {/* ── Contenido ── */}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        height: '100%',
                        padding: '0 80px',
                        maxWidth: 760,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
                        <img src={LOGO_DATA_URI} width={104} height={104} alt="FilmiFy" />
                        <div style={{ display: 'flex', fontSize: 88, fontWeight: 800, letterSpacing: -3, marginLeft: 8 }}>
                            <div style={{ display: 'flex', color: '#ffffff' }}>Filmi</div>
                            <div style={{ display: 'flex', color: '#00c2ff' }}>Fy</div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            fontSize: 44,
                            fontWeight: 700,
                            color: '#ffffff',
                            lineHeight: 1.15,
                            marginBottom: 22,
                        }}
                    >
                        Ver películas y series online
                    </div>

                    {/* Pills de valor */}
                    <div style={{ display: 'flex' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#00c2ff',
                                color: '#001f2a',
                                fontSize: 28,
                                fontWeight: 700,
                                padding: '12px 28px',
                                borderRadius: 9999,
                                marginRight: 16,
                            }}
                        >
                            Gratis
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.1)',
                                border: '2px solid rgba(255,255,255,0.2)',
                                color: '#ffffff',
                                fontSize: 28,
                                fontWeight: 600,
                                padding: '12px 28px',
                                borderRadius: 9999,
                            }}
                        >
                            Sin registro
                        </div>
                    </div>
                </div>
            </div>
        ),
        { ...size },
    );
}

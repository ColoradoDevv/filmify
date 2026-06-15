import { ImageResponse } from 'next/og';
import { getWorldCupMatches } from '@/services/worldcup';

/**
 * Open Graph (1200×630 PNG) de la portada del Mundial (filmify.me/mundial).
 *
 * Diseño: fondo de césped de estadio con un mosaico de escudos de selecciones
 * (vienen de TheSportsDB vía el servicio worldcup), oscurecido para contraste,
 * con el claim "Mundial 2026 · Partidos en vivo" y la marca FilmiFy al centro.
 *
 * Se eligió mosaico de escudos (en vez de una imagen del trofeo) porque el
 * trofeo y el emblema oficial de la FIFA tienen copyright/marca registrada; los
 * escudos de federación ya los usa el sitio y se cargan de forma fiable.
 */

export const alt = 'Mundial 2026 — Partidos en vivo y gratis en FilmiFy';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const LOGO_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M120 100 H220 V412 H120 V100 Z" fill="#00c2ff"/><circle cx="170" cy="160" r="18" fill="#0b0e11"/><circle cx="170" cy="256" r="18" fill="#0b0e11"/><circle cx="170" cy="352" r="18" fill="#0b0e11"/><path d="M220 100 H392 C403 100 412 109 412 120 V180 H220 V100 Z" fill="#00c2ff"/><path d="M220 236 H340 C351 236 360 245 360 256 V316 H220 V236 Z" fill="#ff0a16"/></svg>`;
const LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`;

/** Toma escudos únicos de los próximos partidos para el mosaico de fondo. */
async function getBadges(): Promise<string[]> {
    try {
        const matches = await getWorldCupMatches();
        const seen = new Set<string>();
        const badges: string[] = [];
        for (const m of matches) {
            for (const b of [m.homeBadge, m.awayBadge]) {
                if (b && !seen.has(b)) {
                    seen.add(b);
                    badges.push(b);
                }
            }
            if (badges.length >= 24) break;
        }
        return badges;
    } catch {
        return [];
    }
}

export default async function Image() {
    const badges = await getBadges();

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    position: 'relative',
                    background:
                        'linear-gradient(160deg, #0a5c2e 0%, #0d7a3c 45%, #0a5c2e 100%)',
                }}
            >
                {/* Bandas de césped */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 1200,
                        height: 630,
                        display: 'flex',
                    }}
                >
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: 100,
                                height: 630,
                                background:
                                    i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
                                display: 'flex',
                            }}
                        />
                    ))}
                </div>

                {/* Mosaico de escudos (fondo) */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 1200,
                        height: 630,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 30,
                        opacity: 0.5,
                    }}
                >
                    {badges.map((b, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={i}
                            src={b}
                            width={150}
                            height={150}
                            style={{ width: 150, height: 150, objectFit: 'contain', margin: 8 }}
                            alt=""
                        />
                    ))}
                </div>

                {/* Viñeta para contraste */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 1200,
                        height: 630,
                        background:
                            'radial-gradient(circle at center, rgba(5,30,15,0.55) 0%, rgba(5,30,15,0.9) 100%)',
                        display: 'flex',
                    }}
                />

                {/* Contenido central */}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                    }}
                >
                    {/* Marca FilmiFy */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={LOGO_DATA_URI} width={64} height={64} alt="FilmiFy" />
                        <div
                            style={{
                                display: 'flex',
                                fontSize: 54,
                                fontWeight: 800,
                                letterSpacing: -2,
                                marginLeft: 6,
                            }}
                        >
                            <div style={{ display: 'flex', color: '#ffffff' }}>Filmi</div>
                            <div style={{ display: 'flex', color: '#00c2ff' }}>Fy</div>
                        </div>
                    </div>

                    {/* Título */}
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 96,
                            fontWeight: 900,
                            color: '#ffffff',
                            letterSpacing: -3,
                            lineHeight: 1,
                            marginBottom: 24,
                        }}
                    >
                        Mundial 2026
                    </div>

                    {/* Claim */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: '#ff0a16',
                            color: '#ffffff',
                            fontSize: 34,
                            fontWeight: 700,
                            padding: '14px 36px',
                            borderRadius: 9999,
                        }}
                    >
                        Todos los partidos en vivo y gratis
                    </div>
                </div>
            </div>
        ),
        { ...size },
    );
}

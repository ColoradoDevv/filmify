import { ImageResponse } from 'next/og';
import { getWorldCupMatchById } from '@/services/worldcup';

/**
 * Generador de la imagen Open Graph (1200×630 PNG) para un partido del Mundial.
 * Lo usa src/app/(platform)/mundial/partido/[id]/opengraph-image.tsx.
 *
 * Diseño "estadio": césped verde con líneas de cancha, los DOS escudos de las
 * selecciones a cada lado con un "VS" central, nombres debajo, y una franja con
 * grupo · estadio · fecha/hora. Marca FilmiFy arriba.
 *
 * Notas (aprendidas en titleOgImage.tsx):
 *  - Nada de glifos especiales (★, emojis): satori intenta bajar fuentes y falla.
 *    Los iconos van como SVG inline / data-URI.
 *  - Los crawlers no renderizan SVG → se rasteriza a PNG aquí.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// Ícono de FilmiFy (solo formas; el texto "FilmiFy" se renderiza aparte).
const LOGO_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M120 100 H220 V412 H120 V100 Z" fill="#00c2ff"/><circle cx="170" cy="160" r="18" fill="#0b0e11"/><circle cx="170" cy="256" r="18" fill="#0b0e11"/><circle cx="170" cy="352" r="18" fill="#0b0e11"/><path d="M220 100 H392 C403 100 412 109 412 120 V180 H220 V100 Z" fill="#00c2ff"/><path d="M220 236 H340 C351 236 360 245 360 256 V316 H220 V236 Z" fill="#ff0a16"/></svg>`;
const LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`;

/** Hora local (Bogotá) + fecha corta para la franja inferior. */
function formatKickoff(kickoffISO: string): string {
    try {
        const d = new Date(kickoffISO);
        const date = d.toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'short',
            timeZone: 'America/Bogota',
        });
        const time = d.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Bogota',
        });
        return `${date} · ${time}`;
    } catch {
        return '';
    }
}

/** Escudo de un equipo en su columna (con su nombre debajo). */
function TeamColumn({ badge, name }: { badge: string; name: string }) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 380,
            }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={badge}
                width={210}
                height={210}
                style={{ width: 210, height: 210, objectFit: 'contain' }}
                alt=""
            />
            <div
                style={{
                    display: 'flex',
                    marginTop: 26,
                    fontSize: name.length > 14 ? 38 : 46,
                    fontWeight: 800,
                    color: '#ffffff',
                    textAlign: 'center',
                    lineHeight: 1.05,
                    letterSpacing: -1,
                    maxWidth: 360,
                    justifyContent: 'center',
                }}
            >
                {name}
            </div>
        </div>
    );
}

export async function renderMatchOgImage(id: string) {
    const match = await getWorldCupMatchById(id).catch(() => null);

    // Si no hay partido, caemos a una imagen genérica del Mundial (no rompemos
    // la previsualización al compartir un link viejo/erróneo).
    const home = match?.homeTeam ?? 'Local';
    const away = match?.awayTeam ?? 'Visitante';
    const homeBadge = match?.homeBadge ?? '';
    const awayBadge = match?.awayBadge ?? '';
    const group = match?.group ?? 'Mundial 2026';
    const stadium = match?.stadium ?? '';
    const when = match ? formatKickoff(match.kickoff) : '';
    const isLive = match?.status === 'LIVE';

    // Franja inferior: grupo · estadio · fecha. EN VIVO sustituye la fecha.
    const metaParts = [group, stadium, isLive ? 'EN VIVO' : when].filter(Boolean);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    // Césped: degradado verde con bandas de cancha.
                    background:
                        'linear-gradient(160deg, #0a5c2e 0%, #0d7a3c 45%, #0a5c2e 100%)',
                }}
            >
                {/* Bandas de césped (líneas verticales sutiles) */}
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

                {/* Círculo central de la cancha */}
                <div
                    style={{
                        position: 'absolute',
                        top: 165,
                        left: 480,
                        width: 240,
                        height: 240,
                        borderRadius: 9999,
                        border: '4px solid rgba(255,255,255,0.12)',
                        display: 'flex',
                    }}
                />

                {/* Viñeta oscura en bordes para contraste del texto */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 1200,
                        height: 630,
                        background:
                            'linear-gradient(0deg, rgba(5,30,15,0.82) 0%, rgba(5,30,15,0) 38%), linear-gradient(180deg, rgba(5,30,15,0.55) 0%, rgba(5,30,15,0) 30%)',
                        display: 'flex',
                    }}
                />

                {/* ── Marca FilmiFy (arriba centrada) ── */}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 44,
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={LOGO_DATA_URI} width={46} height={46} alt="FilmiFy" />
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 36,
                            fontWeight: 800,
                            letterSpacing: -1.5,
                            marginLeft: 4,
                        }}
                    >
                        <div style={{ display: 'flex', color: '#ffffff' }}>Filmi</div>
                        <div style={{ display: 'flex', color: '#00c2ff' }}>Fy</div>
                    </div>
                </div>

                {/* ── Enfrentamiento: escudo · VS · escudo ── */}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 40px',
                    }}
                >
                    {homeBadge && <TeamColumn badge={homeBadge} name={home} />}

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            margin: '0 10px',
                            marginBottom: 70,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                fontSize: 72,
                                fontWeight: 900,
                                color: '#ffffff',
                                letterSpacing: -2,
                            }}
                        >
                            VS
                        </div>
                    </div>

                    {awayBadge && <TeamColumn badge={awayBadge} name={away} />}
                </div>

                {/* ── Franja inferior: grupo · estadio · fecha / EN VIVO ── */}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 92,
                        background: 'rgba(5,20,12,0.55)',
                        borderTop: '2px solid rgba(255,255,255,0.12)',
                    }}
                >
                    {isLive && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#ff0a16',
                                color: '#ffffff',
                                fontSize: 24,
                                fontWeight: 800,
                                padding: '6px 18px',
                                borderRadius: 9999,
                                marginRight: 18,
                                letterSpacing: 1,
                            }}
                        >
                            EN VIVO
                        </div>
                    )}
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 28,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.9)',
                        }}
                    >
                        {/* Si está EN VIVO ya mostramos el pill; usamos grupo·estadio. */}
                        {(isLive ? [group, stadium].filter(Boolean) : metaParts).join('   ·   ')}
                    </div>
                </div>
            </div>
        ),
        { ...OG_SIZE },
    );
}

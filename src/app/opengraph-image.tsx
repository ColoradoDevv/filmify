import { ImageResponse } from 'next/og';

/**
 * Default Open Graph image (1200x630 PNG), generated at request time with
 * next/og. Social crawlers (Facebook, WhatsApp, Twitter/X, Telegram) do not
 * render SVG og:images, so this replaces the previous /logo-icon.svg.
 *
 * File-based metadata overrides the config-based images in layout.tsx.
 * Movie/TV detail pages still use their own TMDB posters (deeper segment
 * config wins over this root file).
 */

export const runtime = 'edge';
export const alt = 'FilmiFy - Dónde ver películas y series online';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0b0e11 0%, #101722 55%, #0b1c2e 100%)',
                    position: 'relative',
                }}
            >
                {/* Accent glow */}
                <div
                    style={{
                        position: 'absolute',
                        top: -150,
                        right: -100,
                        width: 500,
                        height: 500,
                        borderRadius: 9999,
                        background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0) 70%)',
                        display: 'flex',
                    }}
                />
                {/* Play badge */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 110,
                        height: 110,
                        borderRadius: 28,
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        marginBottom: 36,
                        boxShadow: '0 20px 60px rgba(37,99,235,0.45)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            width: 0,
                            height: 0,
                            borderTop: '26px solid transparent',
                            borderBottom: '26px solid transparent',
                            borderLeft: '42px solid #ffffff',
                            marginLeft: 10,
                        }}
                    />
                </div>
                <div
                    style={{
                        display: 'flex',
                        fontSize: 96,
                        fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: -3,
                    }}
                >
                    FilmiFy
                </div>
                <div
                    style={{
                        display: 'flex',
                        fontSize: 34,
                        color: 'rgba(255,255,255,0.65)',
                        marginTop: 18,
                        textAlign: 'center',
                    }}
                >
                    Dónde ver películas y series online
                </div>
            </div>
        ),
        { ...size }
    );
}

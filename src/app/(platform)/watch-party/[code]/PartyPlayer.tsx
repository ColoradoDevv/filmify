'use client';

/**
 * Reproductor de Watch Party — máquina de estados visual.
 *
 * idle      → póster + "esperando al host" (host ve el botón Iniciar fuera).
 * countdown → cuenta atrás grande sincronizada (todos montan el iframe a la vez).
 * playing   → iframe de Vimeus con autoplay.
 * paused    → telón: el iframe SE DESMONTA en todos (garantiza pausa real)
 *             y se muestra el póster con aviso. Al reanudar, Vimeus suele
 *             recordar la posición localmente.
 *
 * Incluye overlay de reacciones flotantes (estilo Rave) y pantalla completa.
 */
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Loader2, Pause, Clock, Maximize, Minimize, Film } from 'lucide-react';
import { buildVimeusUrl } from '@/lib/vimeus-embed';
import type { PlaybackPhase } from '@/lib/watch-party-sync';

export interface ReactionBubble {
    id: number;
    emoji: string;
    username: string;
    /** posición horizontal en % */
    left: number;
}

interface Props {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    season: number;
    episode: number;
    title: string;
    posterPath: string | null;
    phase: PlaybackPhase;
    countdownEndsAt: number | null;
    isHost: boolean;
    reactions: ReactionBubble[];
    /** El host confirma 'playing' cuando su cuenta atrás llega a cero. */
    onCountdownEnd?: () => void;
}

function CountdownOverlay({ endsAt, onEnd }: { endsAt: number; onEnd?: () => void }) {
    const [remaining, setRemaining] = useState(Math.max(0, endsAt - Date.now()));
    const firedRef = useRef(false);

    useEffect(() => {
        firedRef.current = false;
        const tick = () => {
            const r = Math.max(0, endsAt - Date.now());
            setRemaining(r);
            if (r <= 0 && !firedRef.current) {
                firedRef.current = true;
                onEnd?.();
            }
        };
        tick();
        const id = setInterval(tick, 100);
        return () => clearInterval(id);
    }, [endsAt, onEnd]);

    const seconds = Math.ceil(remaining / 1000);
    return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-sm">
            <p className="md3-label-large text-white/60 uppercase tracking-widest">La función empieza en</p>
            <p
                key={seconds}
                className="text-8xl font-black text-white tabular-nums"
                style={{ animation: 'wp-pop 0.9s ease-out' }}
            >
                {seconds > 0 ? seconds : '🎬'}
            </p>
        </div>
    );
}

export default function PartyPlayer({
    tmdbId, mediaType, season, episode, title, posterPath,
    phase, countdownEndsAt, isHost, reactions, onCountdownEnd,
}: Props) {
    const [iframeLoading, setIframeLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // El iframe vive en 'playing'. Cambiar de episodio/película cambia la key
    // → remontaje limpio.
    const embedUrl = buildVimeusUrl(tmdbId, mediaType, season, episode);
    const showIframe = phase === 'playing';

    useEffect(() => {
        if (showIframe) setIframeLoading(true);
    }, [showIframe, embedUrl]);

    // Track de fullscreen (el usuario puede salir con Esc).
    useEffect(() => {
        const onFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFs);
        return () => document.removeEventListener('fullscreenchange', onFs);
    }, []);

    const toggleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        } else {
            el.requestFullscreen?.().catch(() => {});
        }
    };

    const poster = posterPath
        ? `https://image.tmdb.org/t/p/w780${posterPath}`
        : null;

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video bg-black rounded-[var(--radius-xl)] overflow-hidden border border-outline-variant"
        >
            {/* keyframes de las animaciones del player */}
            <style>{`
                @keyframes wp-float {
                    0%   { transform: translateY(0) scale(0.8); opacity: 0; }
                    10%  { opacity: 1; transform: translateY(-10%) scale(1.1); }
                    100% { transform: translateY(-420%) scale(1); opacity: 0; }
                }
                @keyframes wp-pop {
                    0%   { transform: scale(1.6); opacity: 0.2; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>

            {/* ── Fondo (póster) para estados sin video ── */}
            {!showIframe && (
                <div className="absolute inset-0">
                    {poster ? (
                        <>
                            <Image src={poster} alt={title} fill className="object-cover opacity-25 blur-[2px] scale-105" sizes="100vw" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-surface-container-lowest" />
                    )}
                </div>
            )}

            {/* ── idle ── */}
            {phase === 'idle' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    {poster && (
                        <Image src={`https://image.tmdb.org/t/p/w342${posterPath}`} alt={title}
                            width={110} height={165} className="rounded-[var(--radius-lg)] shadow-[var(--shadow-4)] mb-1" />
                    )}
                    <p className="md3-title-medium text-white">{title}</p>
                    {mediaType === 'tv' && (
                        <p className="md3-body-small text-white/50">Temporada {season} · Episodio {episode}</p>
                    )}
                    <p className="md3-body-small text-white/60 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {isHost ? 'Pulsa "Iniciar función" cuando estén listos' : 'Esperando a que el host inicie la función...'}
                    </p>
                </div>
            )}

            {/* ── countdown ── */}
            {phase === 'countdown' && countdownEndsAt && (
                <CountdownOverlay endsAt={countdownEndsAt} onEnd={onCountdownEnd} />
            )}

            {/* ── paused (telón) ── */}
            {phase === 'paused' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                        <Pause className="w-7 h-7 text-white" />
                    </div>
                    <p className="md3-title-medium text-white">El host pausó la función</p>
                    <p className="md3-body-small text-white/60 max-w-sm">
                        {isHost
                            ? 'Cuando reanudes, todos volverán a la reproducción a la vez.'
                            : 'La reproducción continuará para todos cuando el host reanude.'}
                    </p>
                </div>
            )}

            {/* ── playing (iframe) ── */}
            {showIframe && (
                <>
                    {iframeLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    )}
                    <iframe
                        key={embedUrl}
                        src={embedUrl}
                        title={`Watch Party: ${title}`}
                        className="absolute inset-0 w-full h-full border-0"
                        onLoad={() => setIframeLoading(false)}
                        referrerPolicy="origin"
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share"
                        allowFullScreen
                    />
                </>
            )}

            {/* ── Reacciones flotantes ── */}
            <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
                {reactions.map(r => (
                    <div
                        key={r.id}
                        className="absolute bottom-4 flex flex-col items-center"
                        style={{ left: `${r.left}%`, animation: 'wp-float 3.2s ease-out forwards' }}
                    >
                        <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
                        <span className="text-[9px] font-semibold text-white/80 bg-black/40 rounded-full px-1.5 mt-0.5">
                            {r.username}
                        </span>
                    </div>
                ))}
            </div>

            {/* ── Fullscreen toggle ── */}
            <button
                onClick={toggleFullscreen}
                className="absolute top-3 right-3 z-40 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white transition-colors"
                aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Chip de título en estados sin video */}
            {!showIframe && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-white/10">
                    <Film className="w-3 h-3 text-primary" />
                    <span className="md3-label-small text-white/80 max-w-[200px] truncate">{title}</span>
                </div>
            )}
        </div>
    );
}

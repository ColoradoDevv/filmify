'use client';

/**
 * Reproductor de Watch Party — máquina de estados visual.
 *
 * idle      → póster + CTA: el host ve un botón de play gigante dentro del
 *             player (mucho más intuitivo que buscarlo en la barra externa).
 * countdown → cuenta atrás sincronizada con anillo de progreso.
 * playing   → iframe de Vimeus con autoplay.
 * paused    → telón: el iframe SE DESMONTA en todos (garantiza pausa real)
 *             y se muestra el póster con aviso. Al reanudar, Vimeus suele
 *             recordar la posición localmente.
 *
 * Incluye overlay de reacciones flotantes (estilo Rave) y pantalla completa.
 */
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Loader2, Pause, Clock, Maximize, Minimize, Film, Play, RefreshCw } from 'lucide-react';
import { usePlaybackCascade } from '@/hooks/usePlaybackCascade';
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
    /** El host inicia la función desde el propio player (fase idle). */
    onHostStart?: () => void;
}

function CountdownOverlay({ endsAt, onEnd }: { endsAt: number; onEnd?: () => void }) {
    const [remaining, setRemaining] = useState(Math.max(0, endsAt - Date.now()));
    const firedRef = useRef(false);
    // Duración total fijada al montar — para que el anillo progrese de 0 a 100%.
    const totalRef = useRef(Math.max(1000, endsAt - Date.now()));

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
    const progress = 1 - remaining / totalRef.current;
    const R = 56;
    const CIRC = 2 * Math.PI * R;

    return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm">
            <p className="md3-label-large text-white/60 uppercase tracking-widest">La función empieza en</p>
            <div className="relative w-36 h-36">
                <svg viewBox="0 0 128 128" className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                    <circle
                        cx="64" cy="64" r={R} fill="none"
                        stroke="var(--color-primary)" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={CIRC}
                        strokeDashoffset={CIRC * (1 - progress)}
                        style={{ transition: 'stroke-dashoffset 120ms linear' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span
                        key={seconds}
                        className="text-6xl font-black text-white tabular-nums"
                        style={{ animation: 'wp-pop 0.9s ease-out' }}
                    >
                        {seconds > 0 ? seconds : '🎬'}
                    </span>
                </div>
            </div>
            <p className="md3-body-small text-white/40">Todos comenzarán a la vez</p>
        </div>
    );
}

export default function PartyPlayer({
    tmdbId, mediaType, season, episode, title, posterPath,
    phase, countdownEndsAt, isHost, reactions, onCountdownEnd, onHostStart,
}: Props) {
    const [iframeLoading, setIframeLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [failed, setFailed] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cascada compartida: Vimeus → VidAPI → VidCore → VidSrc → …
    // Todos los clientes resuelven la misma lista ordenada, así que convergen
    // al mismo proveedor sano sin necesidad de sincronizar la elección.
    const cascade = usePlaybackCascade({ tmdbId, mediaType, season, episode });

    // El iframe vive en 'playing'. Cambiar de episodio/película cambia la key
    // → remontaje limpio.
    const embedUrl = cascade.active.url;
    const showIframe = phase === 'playing' && !failed;

    useEffect(() => {
        if (showIframe) {
            setIframeLoading(true);
            setFailed(false);
        }
    }, [showIframe, embedUrl, reloadKey]);

    // Timeout de carga con failover: si el proveedor no carga en 20s, se
    // avanza al siguiente de la cascada en vez de quedarse en negro.
    useEffect(() => {
        if (phase !== 'playing' || failed) return;
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = setTimeout(() => {
            if (cascade.activeIndex < cascade.sources.length - 1) {
                cascade.next();
            } else {
                setFailed(true);
            }
        }, 20_000);
        return () => {
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, failed, embedUrl, reloadKey]);

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
            className="relative w-full aspect-video bg-black rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)] overflow-hidden border border-outline-variant"
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
                @keyframes wp-ring {
                    0%   { transform: scale(1);    opacity: 0.5; }
                    100% { transform: scale(1.55); opacity: 0; }
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
                            width={100} height={150}
                            className="hidden sm:block rounded-[var(--radius-lg)] shadow-[var(--shadow-4)] mb-1" />
                    )}
                    <p className="md3-title-medium text-white">{title}</p>
                    {mediaType === 'tv' && (
                        <p className="md3-body-small text-white/50">Temporada {season} · Episodio {episode}</p>
                    )}

                    {isHost && onHostStart ? (
                        <button
                            onClick={onHostStart}
                            className="relative mt-2 flex items-center justify-center group"
                            aria-label="Iniciar función"
                        >
                            <span className="absolute w-16 h-16 rounded-full bg-primary" style={{ animation: 'wp-ring 1.8s ease-out infinite' }} />
                            <span className="relative w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[var(--shadow-4)] group-hover:scale-105 transition-transform">
                                <Play className="w-7 h-7 fill-current ml-0.5" />
                            </span>
                        </button>
                    ) : (
                        <p className="md3-body-small text-white/60 flex items-center gap-1.5 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            Esperando a que el host inicie la función...
                        </p>
                    )}
                    {isHost && onHostStart && (
                        <p className="md3-body-small text-white/50">Pulsa play cuando todos estén listos</p>
                    )}
                </div>
            )}

            {/* ── countdown ── */}
            {phase === 'countdown' && countdownEndsAt && (
                <CountdownOverlay endsAt={countdownEndsAt} onEnd={onCountdownEnd} />
            )}

            {/* ── paused (telón) ── */}
            {phase === 'paused' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
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

            {/* ── playing (iframe en cascada) ── */}
            {phase === 'playing' && !failed && (
                <>
                    {iframeLoading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="md3-body-small text-white/40">
                                Cargando reproductor ({cascade.probing ? 'detectando servidor…' : cascade.active.label})...
                            </p>
                        </div>
                    )}
                    <iframe
                        key={`${cascade.active.id}-${embedUrl}-${reloadKey}`}
                        src={embedUrl}
                        title={`Watch Party: ${title} (${cascade.active.label})`}
                        className="absolute inset-0 w-full h-full border-0"
                        onLoad={() => {
                            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
                            setIframeLoading(false);
                        }}
                        referrerPolicy="origin"
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share"
                        allowFullScreen
                    />
                    {/* Selector de servidor para el host (los invitados convergen solos) */}
                    {isHost && cascade.sources.length > 1 && (
                        <div className="absolute bottom-3 left-3 z-40 flex items-center gap-1.5">
                            <label htmlFor="wp-server" className="sr-only">Servidor de reproducción</label>
                            <select
                                id="wp-server"
                                value={cascade.activeIndex}
                                onChange={(e) => {
                                    cascade.goTo(Number(e.target.value));
                                    setIframeLoading(true);
                                }}
                                className="h-8 px-2 rounded-lg bg-black/60 border border-white/15 text-white text-xs font-semibold backdrop-blur-sm cursor-pointer"
                            >
                                {cascade.sources.map((s, idx) => (
                                    <option key={s.id} value={idx} className="bg-surface text-white">
                                        {s.label} · {s.lang}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </>
            )}

            {/* ── error: cascada agotada ── */}
            {phase === 'playing' && failed && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center bg-black">
                    <p className="md3-title-medium text-white">Ningún servidor responde</p>
                    <p className="md3-body-small text-white/60 max-w-sm">
                        Todos los proveedores están caídos en este momento. Inténtalo de nuevo en unos minutos.
                    </p>
                    <button
                        onClick={() => {
                            cascade.reset();
                            setFailed(false);
                            setIframeLoading(true);
                            setReloadKey((k) => k + 1);
                        }}
                        className="flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-on-primary text-sm font-bold"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                </div>
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

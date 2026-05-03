'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Volume2, VolumeX, AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Tv } from 'lucide-react';
import type { LiveChannel } from '@/services/liveTV';

interface LiveTVPlayerProps {
    channel: LiveChannel;
    relatedChannels?: LiveChannel[];
    hasPrev?: boolean;
    hasNext?: boolean;
    onPrev?: () => void;
    onNext?: () => void;
    onSelectChannel?: (ch: LiveChannel) => void;
    onClose: () => void;
}

export default function LiveTVPlayer({
    channel,
    relatedChannels = [],
    hasPrev = false,
    hasNext = false,
    onPrev,
    onNext,
    onSelectChannel,
    onClose,
}: LiveTVPlayerProps) {
    const videoRef      = useRef<HTMLVideoElement>(null);
    const containerRef  = useRef<HTMLDivElement>(null);
    const hlsRef        = useRef<any>(null);
    const isMountedRef  = useRef(false);
    const retryRef      = useRef(0);
    const controlsTimer = useRef<NodeJS.Timeout | null>(null);

    const [isPlaying,     setIsPlaying]     = useState(false);
    const [isMuted,       setIsMuted]       = useState(false);
    const [error,         setError]         = useState<string | null>(null);
    const [isLoading,     setIsLoading]     = useState(true);
    const [showControls,  setShowControls]  = useState(true);

    const MAX_RETRIES = 3;

    // ── Lock body scroll ────────────────────────────────────────────────────
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // ── Keyboard shortcuts ──────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape')      { onClose(); return; }
            if (e.key === 'ArrowLeft')   { onPrev?.(); return; }
            if (e.key === 'ArrowRight')  { onNext?.(); return; }
            if (e.key === 'm' || e.key === 'M') toggleMute();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, onPrev, onNext]);

    // ── Auto-hide controls ──────────────────────────────────────────────────
    const showControlsFor = useCallback(() => {
        setShowControls(true);
        if (controlsTimer.current) clearTimeout(controlsTimer.current);
        controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('mousemove', showControlsFor);
        el.addEventListener('touchstart', showControlsFor);
        return () => {
            el.removeEventListener('mousemove', showControlsFor);
            el.removeEventListener('touchstart', showControlsFor);
            if (controlsTimer.current) clearTimeout(controlsTimer.current);
        };
    }, [showControlsFor]);

    // ── Load stream ─────────────────────────────────────────────────────────
    const loadStream = useCallback(async () => {
        const video = videoRef.current;
        if (!video || !isMountedRef.current) return;

        // Destroy previous HLS instance
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

        setIsLoading(true);
        setError(null);
        retryRef.current = 0;

        try {
            const Hls = (await import('hls.js')).default;

            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false,
                    backBufferLength: 60,
                    maxBufferLength: 20,
                    manifestLoadingTimeOut: 15000,
                    manifestLoadingMaxRetry: 3,
                    levelLoadingTimeOut: 15000,
                    fragLoadingTimeOut: 20000,
                    fragLoadingMaxRetry: 4,
                });
                hlsRef.current = hls;

                const proxyUrl = `/api/stream?url=${encodeURIComponent(channel.streamUrl)}`;
                hls.loadSource(proxyUrl);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (!isMountedRef.current) return;
                    retryRef.current = 0;
                    setIsLoading(false);
                    video.play().catch(() => setIsPlaying(false));
                    setIsPlaying(true);
                    showControlsFor();
                });

                hls.on(Hls.Events.ERROR, (_: unknown, data: any) => {
                    if (!data.fatal) return;

                    const code = data.response?.code;

                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        // 4xx → stream is dead/geo-blocked, no point retrying
                        if (code && code >= 400) {
                            hls.destroy();
                            if (isMountedRef.current) {
                                setError(code === 403
                                    ? 'Canal bloqueado por restricción geográfica (403).'
                                    : `Canal no disponible (${code}). El stream puede haber cambiado de URL.`
                                );
                                setIsLoading(false);
                            }
                            return;
                        }

                        // Transient network error — retry up to MAX_RETRIES
                        retryRef.current += 1;
                        if (retryRef.current <= MAX_RETRIES) {
                            setTimeout(() => { if (isMountedRef.current) hls.startLoad(); }, 1500);
                        } else {
                            hls.destroy();
                            if (isMountedRef.current) {
                                setError('No se pudo conectar al stream. Puede estar temporalmente fuera de servicio.');
                                setIsLoading(false);
                            }
                        }
                        return;
                    }

                    if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                        return;
                    }

                    hls.destroy();
                    if (isMountedRef.current) {
                        setError('Stream no disponible. Prueba con otro canal.');
                        setIsLoading(false);
                    }
                });

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS
                video.src = channel.streamUrl;
                video.addEventListener('loadedmetadata', () => {
                    if (!isMountedRef.current) return;
                    setIsLoading(false);
                    video.play();
                    setIsPlaying(true);
                    showControlsFor();
                }, { once: true });
                video.addEventListener('error', () => {
                    if (!isMountedRef.current) return;
                    setError('No se pudo reproducir el stream en Safari.');
                    setIsLoading(false);
                }, { once: true });
            } else {
                setError('Tu navegador no soporta streaming HLS.');
                setIsLoading(false);
            }
        } catch {
            if (isMountedRef.current) {
                setError('Error inesperado al cargar el stream.');
                setIsLoading(false);
            }
        }
    }, [channel.streamUrl, showControlsFor]);

    useEffect(() => {
        isMountedRef.current = true;
        loadStream();
        return () => {
            isMountedRef.current = false;
            hlsRef.current?.destroy();
        };
    }, [loadStream]);

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(v => !v);
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) { videoRef.current.pause(); } else { videoRef.current.play(); }
        setIsPlaying(v => !v);
        showControlsFor();
    };

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
            style={{ height: '100dvh' }}
        >
            {/* ── Top bar ── */}
            <div className={`absolute top-0 inset-x-0 z-20 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-3 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Channel info */}
                <div className="flex items-center gap-2 min-w-0">
                    {channel.logo ? (
                        <img src={channel.logo} alt="" className="w-7 h-7 rounded object-contain bg-white/10 p-0.5 shrink-0" />
                    ) : (
                        <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center shrink-0">
                            <Tv className="w-3.5 h-3.5 text-white/60" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="md3-label-large text-white truncate">{channel.name}</p>
                        <p className="md3-label-small text-white/60 truncate">
                            {channel.category}{channel.country && ` · ${channel.country.toUpperCase()}`}
                        </p>
                    </div>
                </div>

                {/* Prev / Next channel */}
                <div className="ml-auto flex items-center gap-1">
                    <button
                        onClick={onPrev}
                        disabled={!hasPrev}
                        aria-label="Canal anterior"
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onNext}
                        disabled={!hasNext}
                        aria-label="Canal siguiente"
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Video ── */}
            <div className="flex-1 flex items-center justify-center relative bg-black" onClick={togglePlay}>
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    playsInline
                    onClick={e => e.stopPropagation()}
                />

                {/* Loading */}
                {isLoading && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 gap-3">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="md3-label-medium text-white/70">Cargando señal…</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20 p-4">
                        <div className="w-full max-w-md">
                            {/* Error card */}
                            <div className="bg-surface-container rounded-[var(--radius-xl)] p-5 border border-outline-variant mb-4">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-full bg-error-container flex items-center justify-center shrink-0">
                                        <AlertCircle className="w-4 h-4 text-on-error-container" />
                                    </div>
                                    <div>
                                        <p className="md3-title-small text-on-surface mb-0.5">Señal no disponible</p>
                                        <p className="md3-body-small text-on-surface-variant">{error}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); loadStream(); }}
                                        className="flex-1 h-9 rounded-full bg-secondary-container text-on-secondary-container md3-label-large flex items-center justify-center gap-1.5 hover:shadow-[var(--shadow-1)] transition-shadow"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Reintentar
                                    </button>
                                    {hasNext && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                                            className="flex-1 h-9 rounded-full bg-primary text-on-primary md3-label-large flex items-center justify-center gap-1.5 hover:shadow-[var(--shadow-1)] transition-shadow"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                            Siguiente canal
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                                        className="h-9 px-4 rounded-full border border-outline-variant text-on-surface-variant md3-label-large hover:bg-on-surface/8 transition-colors"
                                    >
                                        Volver
                                    </button>
                                </div>
                            </div>

                            {/* Related channels */}
                            {relatedChannels.length > 0 && (
                                <div>
                                    <p className="md3-label-medium text-white/50 mb-2 px-1">
                                        Canales similares en {channel.category}
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {relatedChannels.map(ch => (
                                            <button
                                                key={ch.id}
                                                onClick={(e) => { e.stopPropagation(); onSelectChannel?.(ch); }}
                                                className="bg-surface-container rounded-[var(--radius-lg)] p-2.5 border border-outline-variant hover:border-primary/50 hover:bg-surface-container-high transition-all text-left group"
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    {ch.logo ? (
                                                        <img src={ch.logo} alt="" className="w-6 h-6 rounded object-contain bg-white/5 shrink-0" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center shrink-0">
                                                            <Tv className="w-3 h-3 text-white/40" />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="md3-label-small text-on-surface truncate group-hover:text-primary transition-colors">
                                                    {ch.name}
                                                </p>
                                                {ch.country && (
                                                    <p className="md3-label-small text-on-surface-variant/60 truncate">
                                                        {ch.country.toUpperCase()}
                                                    </p>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Bottom controls ── */}
            <div className={`absolute bottom-0 inset-x-0 z-20 px-4 py-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-3 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Play/Pause */}
                <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                    {isPlaying ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    )}
                </button>

                {/* Mute */}
                <button
                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Live badge */}
                <div className="ml-auto flex items-center gap-1.5 px-2.5 h-6 rounded-full bg-red-500/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="md3-label-small text-white font-semibold">EN VIVO</span>
                </div>
            </div>
        </div>
    );
}

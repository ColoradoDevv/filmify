'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/lib/store/useStore';
import { buildVimeusUrl } from '@/lib/vimeus-embed';
import type { Movie, TVShow } from '@/types/tmdb';

interface VideoPlayerProps {
    mediaId: number;
    mediaType: 'movie' | 'tv';
    season?: number;
    episode?: number;
    onClose: () => void;
    title: string;
}

const LOAD_TIMEOUT_MS = 15_000;

// Lista de eventos usada para mostrar los controles, fuera del componente para evitar recrearla
const INTERACTION_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'pointermove'];

export default function VideoPlayer({
    mediaId,
    mediaType,
    season = 1,
    episode = 1,
    onClose,
    title,
}: VideoPlayerProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [hasSavedWatched, setHasSaved] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [reloadKey, setReloadKey] = useState(0); // fuerza remontaje del iframe en reintentos

    const isWatched = useStore((s) => s.isWatched(mediaId));
    const addWatched = useStore((s) => s.addWatched);
    const supabase = createClient();

    // Referencias para timers y estado de montaje
    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMounted = useRef(true);
    const timeoutFired = useRef(false); // evita que onLoad sobrescriba el estado de error después del timeout
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // -- Request fullscreen on mount (suppresses "VER EN PANTALLA GRANDE") --
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const req =
            el.requestFullscreen?.bind(el) ||
            (el as any).webkitRequestFullscreen?.bind(el) ||
            (el as any).mozRequestFullScreen?.bind(el) ||
            (el as any).msRequestFullscreen?.bind(el);
        req?.().catch(() => {
            // Fullscreen may be blocked by browser policy -- silently ignore.
        });
        return () => {
            const exit =
                document.exitFullscreen?.bind(document) ||
                (document as any).webkitExitFullscreen?.bind(document) ||
                (document as any).mozCancelFullScreen?.bind(document) ||
                (document as any).msExitFullscreen?.bind(document);
            if (document.fullscreenElement) exit?.().catch(() => {});
        };
    }, []);

    // -- Mover foco al botón de cerrar al montar (accesibilidad) --
    useEffect(() => {
        closeButtonRef.current?.focus();
    }, []);

    // -- Mostrar controles brevemente y luego auto-ocultar --
    const showControls = useCallback(() => {
        setControlsVisible(true);
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        hideControlsTimer.current = setTimeout(() => {
            if (isMounted.current) setControlsVisible(false);
        }, 3000);
    }, []);

    // Al terminar la carga (sin error), mostrar controles inicialmente
    useEffect(() => {
        if (!isLoading && !error) {
            showControls();
        }
        // Limpiar timer de ocultación al desmontar
        return () => {
            if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        };
    }, [isLoading, error, showControls]);

    // Mostrar controles con cualquier interacción del usuario
    useEffect(() => {
        INTERACTION_EVENTS.forEach(e => window.addEventListener(e, showControls, { passive: true }));
        return () => {
            INTERACTION_EVENTS.forEach(e => window.removeEventListener(e, showControls));
        };
    }, [showControls]);

    const embedUrl = buildVimeusUrl(mediaId, mediaType, season, episode);

    // -- Lock body scroll --
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    // -- Escape key (dependencia correcta: onClose) --
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // -- Load timeout con bandera para evitar que onLoad la pise --
    useEffect(() => {
        isMounted.current = true;
        timeoutFired.current = false; // reiniciar al montar / cambiar de fuente
        setIsLoading(true);
        setError(false);

        loadTimeoutRef.current = setTimeout(() => {
            if (isMounted.current) {
                timeoutFired.current = true; // marcar que el timeout se disparó
                setIsLoading(false);
                setError(true);
            }
        }, LOAD_TIMEOUT_MS);

        return () => {
            isMounted.current = false;
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        };
    }, [embedUrl, reloadKey]);

    // -- Marcar como visto después de 5s --
    useEffect(() => {
        if (isLoading || error || isWatched || hasSavedWatched) return;
        const t = window.setTimeout(() => {
            const item = mediaType === 'movie'
                ? ({
                    id: mediaId, title, poster_path: null, backdrop_path: null,
                    vote_average: 0, vote_count: 0, release_date: '', overview: '',
                    genre_ids: [], adult: false, original_language: 'es',
                    original_title: title, popularity: 0, video: false,
                } as Movie)
                : ({
                    id: mediaId, name: title, original_name: title, poster_path: null,
                    backdrop_path: null, vote_average: 0, vote_count: 0, first_air_date: '',
                    overview: '', genre_ids: [], adult: false, original_language: 'es',
                    popularity: 0, origin_country: [],
                } as TVShow);
            addWatched(item);
            setHasSaved(true);
        }, 5000);
        return () => window.clearTimeout(t);
    }, [isLoading, error, isWatched, hasSavedWatched, mediaId, mediaType, title, addWatched]);

    // Solo procesamos onLoad si el timeout no se disparó antes
    const handleLoad = useCallback(() => {
        if (timeoutFired.current) return; // ignorar carga tardía si ya mostramos error
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        setIsLoading(false);
        setError(false);
    }, []);

    const handleRetry = () => {
        // Reiniciamos todo para el nuevo intento
        timeoutFired.current = false;
        setIsLoading(true);
        setError(false);
        setReloadKey((k) => k + 1);
    };

    return (
        <div ref={containerRef} className="fixed inset-0 z-[200] bg-black flex flex-col">
            {/* Top bar -- auto-hides during playback, reappears on any interaction */}
            <div
                className={`absolute top-0 inset-x-0 z-30 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-3 transition-opacity duration-500 ${
                    controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            >
                <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    aria-label="Cerrar reproductor"
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{title}</p>
                    {mediaType === 'tv' && (
                        <p className="text-xs text-white/50">T{season} · E{episode}</p>
                    )}
                </div>
            </div>

            {/* Player area */}
            <div className="flex-1 relative flex items-center justify-center bg-black">
                {/* Loading */}
                {isLoading && !error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-xs text-white/40 uppercase tracking-widest">Cargando...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-on-error-container" />
                        </div>
                        <div>
                            <p className="text-white font-medium mb-1">No se pudo cargar el reproductor</p>
                            <p className="text-white/40 text-sm max-w-xs">
                                El contenido puede no estar disponible en este momento.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleRetry}
                                className="flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-on-primary text-sm font-medium hover:shadow-[var(--shadow-1)] transition-shadow"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Reintentar
                            </button>
                            <button
                                onClick={onClose}
                                className="h-9 px-5 rounded-full border border-outline-variant text-on-surface-variant text-sm hover:bg-on-surface/8 transition-colors"
                            >
                                Volver
                            </button>
                        </div>
                    </div>
                )}

                {/* Iframe (key incluye reloadKey para forzar remontaje en retry) */}
                <iframe
                    ref={iframeRef}
                    key={`${embedUrl}#${reloadKey}`}
                    src={embedUrl}
                    title={`Reproductor: ${title}`}
                    className="w-full h-full border-0"
                    onLoad={handleLoad}
                    referrerPolicy="origin"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share"
                    allowFullScreen
                />
            </div>
        </div>
    );
}
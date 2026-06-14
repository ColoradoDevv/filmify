'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Play, Loader2, AlertCircle, RefreshCw, Clapperboard, Youtube, Maximize } from 'lucide-react';
import { trackPlay, trackTrailer } from '@/lib/analytics';

interface MoviePlayerProps {
    tmdbId: number;
    title: string;
    backdropUrl?: string | null;
    trailerKey?: string | null;
}

const VIMEUS_VIEW_KEY = process.env.NEXT_PUBLIC_VIMEUS_VIEW_KEY ?? '';
const VIMEUS_STYLE = 'title=Filmify&theme=vimeus&primary_color=00c2ff&fs=1&autoplay=1';
const LOAD_TIMEOUT_MS = 20_000;

type Mode = 'idle' | 'movie' | 'trailer';

/**
 * Player inline al estilo Cuevana/LaMovie.
 * Mejoras:
 * - Timeout de carga para el tráiler (no solo para la película).
 * - Un único overlay de error que funciona para ambos modos.
 * - Botón de reintento contextual según el modo actual.
 * - Diseño más accesible y mejor manejo del foco.
 * - Transiciones y estados visuales más coherentes.
 */
export default function MoviePlayer({ tmdbId, title, backdropUrl, trailerKey }: MoviePlayerProps) {
    const [mode, setMode] = useState<Mode>('idle');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0); // fuerza remontaje de iframes

    const containerRef = useRef<HTMLDivElement>(null);
    const playButtonRef = useRef<HTMLButtonElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // URLs
    const embedUrl = `https://vimeus.com/e/movie?tmdb=${tmdbId}&view_key=${VIMEUS_VIEW_KEY}&${VIMEUS_STYLE}`;
    const trailerUrl = trailerKey
        ? `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`
        : null;

    // Inicia la reproducción de la película
    const startMovie = useCallback(() => {
        setMode('movie');
        setIsLoading(true);
        setError(false);
        setReloadKey((k) => k + 1);
        trackPlay({ mediaType: 'movie', tmdbId, title });
    }, [tmdbId, title]);

    // Inicia el tráiler (si está disponible)
    const startTrailer = useCallback(() => {
        if (!trailerUrl) return;
        trackTrailer({ mediaType: 'movie', tmdbId, title });
        setMode('trailer');
        setIsLoading(true);
        setError(false);
        setReloadKey((k) => k + 1);
    }, [trailerUrl]);

    // Reintento contextual según el modo actual
    const retryCurrent = useCallback(() => {
        if (mode === 'movie') {
            startMovie();
        } else if (mode === 'trailer') {
            startTrailer();
        }
    }, [mode, startMovie, startTrailer]);

    // Timeout unificado para cualquier modo de carga (película o tráiler)
    useEffect(() => {
        if (!isLoading) return;

        timeoutRef.current = setTimeout(() => {
            // Solo marcar error si seguimos cargando después del timeout
            setError(true);
            setIsLoading(false);
        }, LOAD_TIMEOUT_MS);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isLoading, reloadKey]); // reloadKey reinicia el timer en cada reintento

    // Limpieza final del timeout al desmontar
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Manejo exitoso de la carga del iframe
    const handleLoad = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsLoading(false);
        setError(false);
    }, []);

    // Pantalla completa
    const handleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        const req =
            el.requestFullscreen?.bind(el) ||
            (el as any).webkitRequestFullscreen?.bind(el);
        req?.().catch(() => { /* bloqueado por política del navegador */ });
    };

    // Foco inicial en el botón de reproducción para accesibilidad con teclado
    useEffect(() => {
        if (mode === 'idle') {
            playButtonRef.current?.focus();
        }
    }, [mode]);

    return (
        <div className="w-full">
            {/* Banner de advertencia */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/15 border border-orange-500/30 rounded-lg mb-2 text-sm text-orange-300">
                <span className="shrink-0">⚠️</span>
                <span>Algunos reproductores pueden mostrar publicidad externa. Si aparece una ventana emergente, simplemente ciérrala y el video continuará sin problemas.</span>
            </div>
            {/* Barra de pestañas y controles */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-surface-container-low border border-outline-variant border-b-0 rounded-t-xl overflow-x-auto">
                <button
                    onClick={startMovie}
                    className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                        mode === 'movie'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Clapperboard className="w-4 h-4" />
                    Ver Película
                </button>
                {trailerUrl && (
                    <button
                        onClick={startTrailer}
                        className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                            mode === 'trailer'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-text-secondary hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Youtube className="w-4 h-4" />
                        Tráiler
                    </button>
                )}
                <div className="flex-1" />
                <button
                    onClick={handleFullscreen}
                    className="flex items-center justify-center w-9 h-9 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                    aria-label="Pantalla completa"
                    title="Pantalla completa"
                >
                    <Maximize className="w-4 h-4" />
                </button>
            </div>

            {/* Superficie del reproductor (16:9) */}
            <div
                ref={containerRef}
                className="relative w-full aspect-video bg-black rounded-b-xl overflow-hidden border border-outline-variant border-t-0"
            >
                {/* === Estado IDLE: póster + botón de reproducción === */}
                {mode === 'idle' && (
                    <button
                        ref={playButtonRef}
                        onClick={startMovie}
                        className="group absolute inset-0 w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-b-xl"
                        aria-label={`Reproducir ${title}`}
                    >
                        {backdropUrl && (
                            <Image
                                src={backdropUrl}
                                alt={title}
                                fill
                                className="object-cover opacity-50 group-hover:opacity-40 transition-opacity duration-300"
                                sizes="(max-width: 1024px) 100vw, 960px"
                                priority
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-primary shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform duration-300">
                                <Play className="w-9 h-9 text-white fill-white ml-1" />
                            </span>
                            <span className="text-white font-bold text-lg drop-shadow-lg">
                                Ver ahora
                            </span>
                            <span className="text-white/50 text-xs uppercase tracking-widest">
                                Haz clic para reproducir
                            </span>
                        </div>
                    </button>
                )}

                {/* === Cargando === */}
                {mode !== 'idle' && isLoading && !error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black">
                        <Loader2 className="w-9 h-9 text-primary animate-spin" />
                        <p className="text-xs text-white/40 uppercase tracking-widest">
                            Cargando…
                        </p>
                    </div>
                )}

                {/* === Error (funciona tanto para película como para tráiler) === */}
                {error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-on-error-container" />
                        </div>
                        <div>
                            <p className="text-white font-medium mb-1">
                                No se pudo cargar {mode === 'trailer' ? 'el tráiler' : 'la película'}
                            </p>
                            <p className="text-white/40 text-sm max-w-xs">
                                Revisa tu conexión e inténtalo de nuevo.
                            </p>
                        </div>
                        <button
                            onClick={retryCurrent}
                            className="flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-white text-sm font-medium hover:shadow-lg transition-shadow"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reintentar
                        </button>
                    </div>
                )}

                {/* === Iframe de la película === */}
                {mode === 'movie' && !error && (
                    <iframe
                        key={`movie-${reloadKey}`}
                        src={embedUrl}
                        title={`Reproductor: ${title}`}
                        className="absolute inset-0 w-full h-full border-0"
                        onLoad={handleLoad}
                        referrerPolicy="origin"
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share"
                        allowFullScreen
                    />
                )}

                {/* === Iframe del tráiler === */}
                {mode === 'trailer' && trailerUrl && !error && (
                    <iframe
                        key={`trailer-${reloadKey}`}
                        src={trailerUrl}
                        title={`Tráiler: ${title}`}
                        className="absolute inset-0 w-full h-full border-0"
                        onLoad={handleLoad}
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                        allowFullScreen
                    />
                )}
            </div>
        </div>
    );
}
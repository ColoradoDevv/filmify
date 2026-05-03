'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/lib/store/useStore';
import type { Movie, TVShow } from '@/types/tmdb';

interface VideoPlayerProps {
    mediaId: number;
    mediaType: 'movie' | 'tv';
    season?: number;
    episode?: number;
    onClose: () => void;
    title: string;
}

const VIMEUS_VIEW_KEY = process.env.NEXT_PUBLIC_VIMEUS_VIEW_KEY ?? '';
const LOAD_TIMEOUT_MS = 15_000;

function buildVimeusUrl(mediaId: number, mediaType: 'movie' | 'tv', season: number, episode: number): string {
    const base = 'https://vimeus.com/e';
    const vk = `view_key=${VIMEUS_VIEW_KEY}`;
    if (mediaType === 'movie') {
        return `${base}/movie?tmdb=${mediaId}&${vk}`;
    }
    return `${base}/serie?tmdb=${mediaId}&se=${season}&ep=${episode}&${vk}`;
}

export default function VideoPlayer({
    mediaId,
    mediaType,
    season = 1,
    episode = 1,
    onClose,
    title,
}: VideoPlayerProps) {
    const [isLoading, setIsLoading]       = useState(true);
    const [error, setError]               = useState(false);
    const [hasSavedWatched, setHasSaved]  = useState(false);

    const isWatched  = useStore((s) => s.isWatched(mediaId));
    const addWatched = useStore((s) => s.addWatched);
    const supabase   = createClient();

    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMounted      = useRef(true);

    const embedUrl = buildVimeusUrl(mediaId, mediaType, season, episode);

    // ── Lock body scroll ────────────────────────────────────────────────────
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    // ── Escape key ──────────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // ── Load timeout ────────────────────────────────────────────────────────
    useEffect(() => {
        isMounted.current = true;
        setIsLoading(true);
        setError(false);

        loadTimeoutRef.current = setTimeout(() => {
            if (isMounted.current) {
                setIsLoading(false);
                setError(true);
            }
        }, LOAD_TIMEOUT_MS);

        return () => {
            isMounted.current = false;
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        };
    }, [embedUrl]);

    // ── Mark as watched after 5s ────────────────────────────────────────────
    useEffect(() => {
        if (isLoading || error || isWatched || hasSavedWatched) return;
        const t = window.setTimeout(() => {
            const item = mediaType === 'movie'
                ? ({ id: mediaId, title, poster_path: null, backdrop_path: null, vote_average: 0, vote_count: 0, release_date: '', overview: '', genre_ids: [], adult: false, original_language: 'es', original_title: title, popularity: 0, video: false } as Movie)
                : ({ id: mediaId, name: title, original_name: title, poster_path: null, backdrop_path: null, vote_average: 0, vote_count: 0, first_air_date: '', overview: '', genre_ids: [], adult: false, original_language: 'es', popularity: 0, origin_country: [] } as TVShow);
            addWatched(item);
            setHasSaved(true);
        }, 5000);
        return () => window.clearTimeout(t);
    }, [isLoading, error, isWatched, hasSavedWatched, mediaId, mediaType, title, addWatched]);

    const handleLoad = useCallback(() => {
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        setIsLoading(false);
        setError(false);
    }, []);

    const handleRetry = () => {
        setIsLoading(true);
        setError(false);
        // Re-arm timeout
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = setTimeout(() => {
            if (isMounted.current) { setIsLoading(false); setError(true); }
        }, LOAD_TIMEOUT_MS);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">

            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 z-30 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-3">
                <button
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

                {/* Iframe */}
                <iframe
                    key={embedUrl}
                    src={embedUrl}
                    title={`Reproductor: ${title}`}
                    className="w-full h-full border-0"
                    onLoad={handleLoad}
                    referrerPolicy="origin"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                />
            </div>
        </div>
    );
}

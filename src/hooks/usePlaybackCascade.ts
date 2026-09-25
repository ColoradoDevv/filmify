'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    buildPlaybackSources,
    type PlaybackMediaType,
    type PlaybackSource,
} from '@/lib/playback-providers';
import { resolveAvailableProvider } from '@/app/actions/playback';

const VIMEUS_VIEW_KEY = process.env.NEXT_PUBLIC_VIMEUS_VIEW_KEY ?? '';

interface UsePlaybackCascadeOptions {
    tmdbId: number;
    mediaType: PlaybackMediaType;
    season?: number;
    episode?: number;
}

export interface PlaybackCascade {
    sources: PlaybackSource[];
    active: PlaybackSource;
    activeIndex: number;
    /** true mientras la sonda inicial decide el punto de partida. */
    probing: boolean;
    /** true si la sonda no encontró proveedor sano (fail-open). */
    degraded: boolean;
    hasNext: boolean;
    /** Avanza al siguiente proveedor. Devuelve false si ya era el último. */
    next: () => boolean;
    goTo: (index: number) => void;
    /** Vuelve al inicio de la cascada (reintento completo). */
    reset: () => void;
}

/**
 * Cascada de reproducción compartida por todos los players.
 *
 * - Punto de partida: Vimeus (índice 0). La sonda del servidor
 *   (`resolveAvailableProvider`) lo confirma o salta directo al primer
 *   proveedor sano (VidAPI → VidCore → VidSrc → …).
 * - Si el iframe falla o expira el timeout, el player llama a `next()`
 *   en lugar de mostrar error, hasta agotar la lista.
 */
export function usePlaybackCascade({
    tmdbId,
    mediaType,
    season = 1,
    episode = 1,
}: UsePlaybackCascadeOptions): PlaybackCascade {
    const sources = useMemo<PlaybackSource[]>(
        () =>
            buildPlaybackSources({
                tmdbId,
                mediaType,
                season,
                episode,
                viewKey: VIMEUS_VIEW_KEY,
            }),
        [tmdbId, mediaType, season, episode],
    );

    const [activeIndex, setActiveIndex] = useState(0);
    const [probing, setProbing] = useState(true);
    const [degraded, setDegraded] = useState(false);
    // Si el usuario elige servidor manualmente, la sonda tardía no lo pisa.
    const manualRef = useRef(false);
    const requestRef = useRef(0);

    // Identidad del título: al cambiar, reinicia la cascada y re-sondea.
    // Cambios solo de temporada/episodio conservan el proveedor elegido.
    const titleKey = `${tmdbId}:${mediaType}`;

    useEffect(() => {
        manualRef.current = false;
        setActiveIndex(0);
        setProbing(true);
        setDegraded(false);
        const requestId = ++requestRef.current;
        resolveAvailableProvider({
            tmdbId,
            mediaType,
            season,
            episode,
            viewKey: VIMEUS_VIEW_KEY,
        })
            .then((resolved) => {
                if (requestRef.current !== requestId || manualRef.current) return;
                const idx = sources.findIndex((s) => s.id === resolved.providerId);
                if (idx > 0) setActiveIndex(idx);
                setDegraded(resolved.degraded);
            })
            .catch(() => {
                // Sin sonda: fail-open en Vimeus, el timeout del iframe manda.
                if (requestRef.current !== requestId) return;
                setDegraded(true);
            })
            .finally(() => {
                if (requestRef.current === requestId) setProbing(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [titleKey]);

    const next = useCallback(() => {
        let advanced = false;
        setActiveIndex((prev) => {
            if (prev < sources.length - 1) {
                advanced = true;
                return prev + 1;
            }
            return prev;
        });
        if (advanced) manualRef.current = true;
        return advanced;
    }, [sources.length]);

    const goTo = useCallback(
        (index: number) => {
            if (index < 0 || index >= sources.length || index === activeIndex) return;
            manualRef.current = true;
            setActiveIndex(index);
        },
        [sources.length, activeIndex],
    );

    const reset = useCallback(() => {
        manualRef.current = false;
        setActiveIndex(0);
        setDegraded(false);
    }, []);

    const safeIndex = Math.min(activeIndex, Math.max(0, sources.length - 1));
    const active = sources[safeIndex] ?? sources[0];

    return {
        sources,
        active,
        activeIndex: safeIndex,
        probing,
        degraded,
        hasNext: safeIndex < sources.length - 1,
        next,
        goTo,
        reset,
    };
}

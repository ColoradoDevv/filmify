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
    /**
     * Marca que el proveedor actual ya cargó y reproduce: a partir de aquí
     * la sonda tardía NO cambia el índice (evita remontar el iframe a mitad
     * de visionado si el usuario dio play antes de que resolviera).
     * Los fallos posteriores siguen avanzando vía `next()`.
     */
    markSettled: () => void;
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
    // La sonda se lanza con el episodio vigente al dispararse, no con el del
    // closure del primer render (el efecto solo se re-dispara por título).
    const seasonRef = useRef(season);
    const episodeRef = useRef(episode);
    seasonRef.current = season;
    episodeRef.current = episode;
    // Ver `markSettled`: una vez que el iframe cargó, la sonda no reubica.
    const settledRef = useRef(false);
    // Espejo del índice en ref: `next()` debe decidir Y devolver el resultado
    // de forma síncrona. Leerlo del estado no sirve (el updater de setState
    // corre en el re-render, así que el flag siempre llegaría a `false` y el
    // player mostraría error en vez de avanzar).
    const indexRef = useRef(0);
    const setIndex = useCallback((i: number) => {
        indexRef.current = i;
        setActiveIndex(i);
    }, []);

    // Identidad del título: al cambiar, reinicia la cascada y re-sondea.
    // Cambios solo de temporada/episodio conservan el proveedor elegido.
    const titleKey = `${tmdbId}:${mediaType}`;

    useEffect(() => {
        manualRef.current = false;
        settledRef.current = false;
        setIndex(0);
        setProbing(true);
        setDegraded(false);
        const requestId = ++requestRef.current;
        resolveAvailableProvider({
            tmdbId,
            mediaType,
            season: seasonRef.current,
            episode: episodeRef.current,
            viewKey: VIMEUS_VIEW_KEY,
        })
            .then((resolved) => {
                if (requestRef.current !== requestId) return;
                // No reubicar si el usuario eligió servidor, si ya cambió de
                // proveedor por su cuenta, o si el actual ya está reproduciendo.
                if (manualRef.current || settledRef.current || indexRef.current !== 0) return;
                const idx = sources.findIndex((s) => s.id === resolved.providerId);
                if (idx > 0) setIndex(idx);
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
        const cur = indexRef.current;
        if (cur < sources.length - 1) {
            manualRef.current = true;
            setIndex(cur + 1);
            return true;
        }
        return false;
    }, [sources.length, setIndex]);

    const goTo = useCallback(
        (index: number) => {
            if (index < 0 || index >= sources.length || index === indexRef.current) return;
            manualRef.current = true;
            setIndex(index);
        },
        [sources.length, setIndex],
    );

    const reset = useCallback(() => {
        manualRef.current = false;
        settledRef.current = false;
        setIndex(0);
        setDegraded(false);
    }, [setIndex]);

    const markSettled = useCallback(() => {
        settledRef.current = true;
    }, []);

    const safeIndex = Math.min(activeIndex, Math.max(0, sources.length - 1));
    const active = sources[safeIndex] ?? sources[0];

    // Objeto estable: sin esto, cada render del player recreaba callbacks y
    // reiniciaba los timers de carga que dependen de ellos.
    return useMemo<PlaybackCascade>(
        () => ({
            sources,
            active,
            activeIndex: safeIndex,
            probing,
            degraded,
            hasNext: safeIndex < sources.length - 1,
            next,
            goTo,
            reset,
            markSettled,
        }),
        [sources, active, safeIndex, probing, degraded, next, goTo, reset, markSettled],
    );
}

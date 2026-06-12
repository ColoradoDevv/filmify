'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import {
    Play, Loader2, AlertCircle, RefreshCw, Tv, Youtube, Maximize,
    ChevronLeft, ChevronRight, Layers, X,
} from 'lucide-react';
import { trackPlay, trackTrailer } from '@/lib/analytics';

export interface SeasonEpisodes {
    season: number;
    episodes: number[];
}

interface SeriesPlayerProps {
    tmdbId: number;
    title: string;
    backdropUrl?: string | null;
    trailerKey?: string | null;
    /**
     * Episodes actually available (from the Vimeus listing), grouped by
     * season. When empty, the embed plays the full series and handles
     * episode navigation internally.
     */
    seasons: SeasonEpisodes[];
}

const VIMEUS_VIEW_KEY = process.env.NEXT_PUBLIC_VIMEUS_VIEW_KEY ?? '';
// Player customization (per Vimeus docs): theme + brand color (FilmiFy cyan).
const VIMEUS_STYLE = 'title=Filmify&theme=vimeus&primary_color=00c2ff&fs=1&autoplay=1';
const LOAD_TIMEOUT_MS = 20_000;
const NEXT_UP_SECONDS = 5;

type Mode = 'idle' | 'serie' | 'trailer';

/**
 * Inline series player, Cuevana-style: embedded in the page, no login.
 * Season/episode pickers reload the embed at the exact episode.
 */
export default function SeriesPlayer({ tmdbId, title, backdropUrl, trailerKey, seasons }: SeriesPlayerProps) {
    const [mode, setMode] = useState<Mode>('idle');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [season, setSeason] = useState<number>(seasons[0]?.season ?? 1);
    const [episode, setEpisode] = useState<number>(seasons[0]?.episodes[0] ?? 1);

    // "Siguiente episodio" — cuenta atrás al terminar el episodio actual.
    const [showNextUp, setShowNextUp] = useState(false);
    const [countdown, setCountdown] = useState(NEXT_UP_SECONDS);

    const containerRef = useRef<HTMLDivElement>(null);
    const playButtonRef = useRef<HTMLButtonElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const currentSeason = useMemo(
        () => seasons.find((s) => s.season === season),
        [seasons, season],
    );
    const episodeOptions = useMemo(() => currentSeason?.episodes ?? [], [currentSeason]);

    // Próximo / anterior episodio (puede caer en la temporada siguiente/anterior).
    const nextEpisode = useMemo(() => {
        if (seasons.length === 0) return null;
        const idx = episodeOptions.indexOf(episode);
        if (idx !== -1 && idx + 1 < episodeOptions.length) {
            return { season, episode: episodeOptions[idx + 1] };
        }
        const seasonIdx = seasons.findIndex((s) => s.season === season);
        const next = seasons[seasonIdx + 1];
        if (next && next.episodes.length > 0) {
            return { season: next.season, episode: next.episodes[0] };
        }
        return null;
    }, [seasons, season, episode, episodeOptions]);

    const prevEpisode = useMemo(() => {
        if (seasons.length === 0) return null;
        const idx = episodeOptions.indexOf(episode);
        if (idx > 0) {
            return { season, episode: episodeOptions[idx - 1] };
        }
        const seasonIdx = seasons.findIndex((s) => s.season === season);
        const prev = seasons[seasonIdx - 1];
        if (prev && prev.episodes.length > 0) {
            return { season: prev.season, episode: prev.episodes[prev.episodes.length - 1] };
        }
        return null;
    }, [seasons, season, episode, episodeOptions]);

    // Keep selection valid if the seasons prop changes.
    useEffect(() => {
        if (seasons.length === 0) return;
        if (!seasons.some((s) => s.season === season)) {
            setSeason(seasons[0].season);
            setEpisode(seasons[0].episodes[0] ?? 1);
        }
    }, [seasons, season]);

    const embedUrl = useMemo(() => {
        const base = `https://vimeus.com/e/serie?tmdb=${tmdbId}&view_key=${VIMEUS_VIEW_KEY}&${VIMEUS_STYLE}`;
        // With known episodes we deep-link to the selected one; otherwise the
        // embed shows the whole series with its internal episode picker.
        return seasons.length > 0 ? `${base}&se=${season}&ep=${episode}` : base;
    }, [tmdbId, seasons.length, season, episode]);

    const trailerUrl = trailerKey
        ? `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`
        : null;

    // Carga (o recarga) el reproductor en la temporada/episodio indicado.
    const loadSerie = useCallback((s: number, e: number) => {
        setSeason(s);
        setEpisode(e);
        setMode('serie');
        setIsLoading(true);
        setError(false);
        setShowNextUp(false);
        setReloadKey((k) => k + 1);
        trackPlay({ mediaType: 'serie', tmdbId, title, season: s, episode: e });
    }, [tmdbId, title]);

    const startSerie = useCallback(() => loadSerie(season, episode), [loadSerie, season, episode]);

    const startTrailer = useCallback(() => {
        if (!trailerUrl) return;
        trackTrailer({ mediaType: 'serie', tmdbId, title });
        setMode('trailer');
        setIsLoading(true);
        setError(false);
        setShowNextUp(false);
        setReloadKey((k) => k + 1);
    }, [trailerUrl, tmdbId, title]);

    // Cambiar de temporada/episodio desde los selectores: si ya se está
    // reproduciendo, recarga el embed; si no, solo actualiza la selección.
    const changeSeason = (s: number) => {
        const target = seasons.find((x) => x.season === s);
        const firstEp = target?.episodes[0] ?? 1;
        if (mode === 'serie') loadSerie(s, firstEp);
        else { setSeason(s); setEpisode(firstEp); }
    };
    const changeEpisode = (e: number) => {
        if (mode === 'serie') loadSerie(season, e);
        else setEpisode(e);
    };

    // Episodios del navegador inferior: seleccionar uno siempre reproduce.
    const playEpisode = useCallback((e: number) => loadSerie(season, e), [loadSerie, season]);
    const playNext = useCallback(() => {
        if (nextEpisode) loadSerie(nextEpisode.season, nextEpisode.episode);
    }, [nextEpisode, loadSerie]);
    const playPrev = useCallback(() => {
        if (prevEpisode) loadSerie(prevEpisode.season, prevEpisode.episode);
    }, [prevEpisode, loadSerie]);

    // Reintento contextual según el modo actual (serie o tráiler).
    const retryCurrent = useCallback(() => {
        if (mode === 'serie') startSerie();
        else if (mode === 'trailer') startTrailer();
    }, [mode, startSerie, startTrailer]);

    // Timeout unificado para cualquier modo de carga (serie o tráiler).
    useEffect(() => {
        if (!isLoading) return;
        timeoutRef.current = setTimeout(() => {
            setError(true);
            setIsLoading(false);
        }, LOAD_TIMEOUT_MS);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [isLoading, reloadKey]);

    // Limpieza del timeout al desmontar.
    useEffect(() => {
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, []);

    const handleLoad = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsLoading(false);
        setError(false);
    }, []);

    const handleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        const req =
            el.requestFullscreen?.bind(el) ||
            (el as any).webkitRequestFullscreen?.bind(el);
        req?.().catch(() => { /* blocked by browser policy — ignore */ });
    };

    // Foco inicial en el botón de reproducción (accesibilidad con teclado).
    useEffect(() => {
        if (mode === 'idle') playButtonRef.current?.focus();
    }, [mode]);

    // Detecta el fin del episodio vía postMessage del embed (best-effort:
    // depende de que Vimeus emita un evento de tipo "ended"/"finish").
    useEffect(() => {
        if (mode !== 'serie' || !nextEpisode) return;
        const handler = (e: MessageEvent) => {
            if (!e.origin.includes('vimeus.com')) return;
            const data = e.data;
            const signal = typeof data === 'string'
                ? data
                : String((data as Record<string, unknown>)?.event ?? (data as Record<string, unknown>)?.type ?? (data as Record<string, unknown>)?.action ?? (data as Record<string, unknown>)?.state ?? '');
            if (/ended|finish|complete/i.test(signal)) {
                setShowNextUp(true);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [mode, nextEpisode]);

    // Reinicia la cuenta atrás cada vez que aparece el aviso.
    useEffect(() => {
        if (showNextUp) setCountdown(NEXT_UP_SECONDS);
    }, [showNextUp]);

    // Cuenta atrás: al llegar a 0, avanza automáticamente al siguiente episodio.
    useEffect(() => {
        if (!showNextUp) return;
        if (countdown <= 0) {
            playNext();
            return;
        }
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [showNextUp, countdown, playNext]);

    const selectCls =
        'h-9 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold ' +
        'hover:bg-white/10 focus:outline-none focus:border-primary/60 transition-all cursor-pointer';

    return (
        <div className="w-full">
            {/* Barra de pestañas y controles */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-surface-container-low border border-outline-variant border-b-0 rounded-t-xl overflow-x-auto">
                <button
                    onClick={startSerie}
                    className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                        mode !== 'trailer'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Tv className="w-4 h-4" />
                    Ver Serie
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
                    className="flex items-center justify-center w-9 h-9 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors shrink-0"
                    aria-label="Pantalla completa"
                    title="Pantalla completa"
                >
                    <Maximize className="w-4 h-4" />
                </button>
            </div>

            {/* Player surface — 16:9 */}
            <div
                ref={containerRef}
                className="relative w-full aspect-video bg-black rounded-b-xl overflow-hidden border border-outline-variant border-t-0"
            >
                {/* === Estado IDLE: backdrop + botón de reproducción === */}
                {mode === 'idle' && (
                    <button
                        ref={playButtonRef}
                        onClick={startSerie}
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
                                {seasons.length > 0 ? `Ver T${season} · E${episode}` : 'Ver ahora'}
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
                        <p className="text-xs text-white/40 uppercase tracking-widest">Cargando…</p>
                    </div>
                )}

                {/* === Error (funciona para serie y tráiler) === */}
                {error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-on-error-container" />
                        </div>
                        <div>
                            <p className="text-white font-medium mb-1">
                                No se pudo cargar {mode === 'trailer' ? 'el tráiler' : 'la serie'}
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

                {/* === Iframe de la serie === */}
                {mode === 'serie' && !error && (
                    <iframe
                        key={`serie-${reloadKey}`}
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

                {/* === Aviso de "siguiente episodio" con cuenta atrás === */}
                {showNextUp && nextEpisode && (
                    <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-full sm:w-80 bg-surface-container border border-outline-variant rounded-xl p-4 shadow-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs uppercase tracking-widest text-white/50 font-bold">
                                    Siguiente episodio
                                </p>
                                <button
                                    onClick={() => setShowNextUp(false)}
                                    className="text-white/40 hover:text-white transition-colors"
                                    aria-label="Cancelar reproducción automática"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-white font-bold mb-3">
                                Continuar con Episodio {nextEpisode.episode}
                                {nextEpisode.season !== season && ` · Temporada ${nextEpisode.season}`}
                            </p>
                            <button
                                onClick={playNext}
                                className="relative w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-primary text-white font-bold overflow-hidden hover:bg-primary-hover transition-colors"
                            >
                                <span
                                    className="absolute inset-0 bg-white/20 transition-[width] duration-1000 ease-linear"
                                    style={{ width: `${(countdown / NEXT_UP_SECONDS) * 100}%` }}
                                    aria-hidden
                                />
                                <Play className="w-4 h-4 fill-current relative" />
                                <span className="relative">Reproducir ahora ({countdown})</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* === Navegador de episodios — entre el reproductor y las reseñas === */}
            {seasons.length > 0 && (
                <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-low/60 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                            <Layers className="w-4 h-4 text-primary" />
                            Episodios
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={playPrev}
                                disabled={!prevEpisode}
                                className="flex items-center gap-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                
                            </button>
                            <label className="sr-only" htmlFor="episodes-season">Temporada</label>
                            <select
                                id="episodes-season"
                                value={season}
                                onChange={(e) => changeSeason(Number(e.target.value))}
                                className={selectCls}
                            >
                                {seasons.map((s) => (
                                    <option key={s.season} value={s.season} className="bg-surface text-white">
                                        Temporada {s.season}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={playNext}
                                disabled={!nextEpisode}
                                className="flex items-center gap-1 h-9 px-3 rounded-lg bg-primary/20 border border-primary/30 text-sm font-semibold text-primary hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {episodeOptions.map((ep) => {
                            const active = ep === episode;
                            return (
                                <button
                                    key={ep}
                                    onClick={() => playEpisode(ep)}
                                    aria-current={active ? 'true' : undefined}
                                    className={`min-w-[3rem] h-10 px-3 rounded-lg text-sm font-bold transition-colors ${
                                        active
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-white/5 border border-white/10 text-text-secondary hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {ep}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

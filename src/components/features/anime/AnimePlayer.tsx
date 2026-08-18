'use client';

/**
 * Reproductor de anime — propio del módulo, sin pasar por el de series.
 *
 * Diferencias con `SeriesPlayer` (y por qué no se reutiliza):
 *  - Se identifica por id de AniList, no por tmdb_id.
 *  - El anime no tiene temporadas aquí: AniList ya publica cada temporada como
 *    una entrada propia, así que solo hace falta un selector de episodio.
 *  - Tiene selector de SERVIDOR: varias fuentes de varios proveedores, con la
 *    pista de audio/subtítulo etiquetada (Latino / Sub español / Dub).
 *  - Sabe reproducir dos cosas: un iframe de proveedor o un HLS propio
 *    (agregador self-hosted) con hls.js a través de /api/stream.
 *
 * Si una fuente no carga en LOAD_TIMEOUT_MS, salta automáticamente a la
 * siguiente: con varios proveedores en juego, un servidor caído no debe
 * costarle al usuario ni un clic.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
    Play, Loader2, AlertCircle, RefreshCw, Maximize, Server,
    ChevronLeft, ChevronRight, Layers, Languages, Check,
} from 'lucide-react';
import { getAnimeSourcesAction } from '@/app/actions/anime';
import type { AnimePlayback, AnimeSource } from '@/server/services/anime';
import { trackPlay } from '@/lib/analytics';

interface AnimePlayerProps {
    anilistId: number;
    title: string;
    bannerUrl?: string | null;
    episodeCount: number;
    titles: { english: string | null; romaji: string | null };
    year: number | null;
    /** Fuentes del primer episodio, resueltas en servidor (sin spinner inicial). */
    initialPlayback: AnimePlayback;
}

const LOAD_TIMEOUT_MS = 20_000;

/** Etiqueta corta de la pista, para el chip junto al nombre del servidor. */
const AUDIO_LABEL: Record<AnimeSource['audio'], string> = {
    latino: 'Latino',
    sub: 'Sub',
    dub: 'Dub',
};

export default function AnimePlayer({
    anilistId,
    title,
    bannerUrl,
    episodeCount,
    titles,
    year,
    initialPlayback,
}: AnimePlayerProps) {
    const [episode, setEpisode] = useState(1);
    const [playback, setPlayback] = useState<AnimePlayback>(initialPlayback);
    const [activeIdx, setActiveIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [loadingSources, setLoadingSources] = useState(false);
    const [loadingFrame, setLoadingFrame] = useState(false);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<{ destroy: () => void } | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const seqRef = useRef(0);

    const sources = playback.sources;
    const active: AnimeSource | undefined = sources[activeIdx];
    const hasNext = episode < episodeCount;
    const hasPrev = episode > 1;

    // ── Carga de fuentes al cambiar de episodio ──────────────────────────────
    const loadEpisode = useCallback(async (ep: number, autoplay: boolean) => {
        const seq = ++seqRef.current;
        setEpisode(ep);
        setLoadingSources(true);
        setError(false);
        try {
            const next = await getAnimeSourcesAction(anilistId, ep, titles, year);
            if (seq !== seqRef.current) return; // respuesta obsoleta
            setPlayback(next);
            setActiveIdx(0);
            if (autoplay && next.sources.length > 0) {
                setPlaying(true);
                setLoadingFrame(true);
                setReloadKey((k) => k + 1);
                trackPlay({ mediaType: 'serie', tmdbId: anilistId, title, episode: ep });
            }
        } catch {
            if (seq === seqRef.current) setError(true);
        } finally {
            if (seq === seqRef.current) setLoadingSources(false);
        }
    }, [anilistId, titles, year, title]);

    const start = useCallback(() => {
        if (sources.length === 0) return;
        setPlaying(true);
        setError(false);
        setLoadingFrame(true);
        setReloadKey((k) => k + 1);
        trackPlay({ mediaType: 'serie', tmdbId: anilistId, title, episode });
    }, [sources.length, anilistId, title, episode]);

    const selectSource = useCallback((idx: number) => {
        setActiveIdx(idx);
        setError(false);
        setLoadingFrame(true);
        setReloadKey((k) => k + 1);
        if (!playing) setPlaying(true);
    }, [playing]);

    /** Salta al siguiente servidor disponible; marca error si no quedan. */
    const failoverToNext = useCallback(() => {
        setActiveIdx((idx) => {
            if (idx + 1 < sources.length) {
                setLoadingFrame(true);
                setError(false);
                setReloadKey((k) => k + 1);
                return idx + 1;
            }
            setError(true);
            setLoadingFrame(false);
            return idx;
        });
    }, [sources.length]);

    // ── Timeout de carga → failover automático ───────────────────────────────
    useEffect(() => {
        if (!playing || !loadingFrame) return;
        timeoutRef.current = setTimeout(failoverToNext, LOAD_TIMEOUT_MS);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [playing, loadingFrame, reloadKey, failoverToNext]);

    useEffect(() => {
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, []);

    const handleFrameLoad = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setLoadingFrame(false);
        setError(false);
    }, []);

    // ── Reproducción HLS propia (agregador self-hosted) ──────────────────────
    useEffect(() => {
        if (!playing || active?.kind !== 'hls') return;
        const video = videoRef.current;
        if (!video) return;

        let cancelled = false;
        (async () => {
            if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
            // El manifiesto va por nuestro proxy: aplica el SSRF guard y
            // reescribe los segmentos (mismo camino que la TV en vivo).
            const proxied = `/api/stream?url=${encodeURIComponent(active.url)}`;
            const Hls = (await import('hls.js')).default;
            if (cancelled) return;

            if (Hls.isSupported()) {
                const hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
                hlsRef.current = hls;
                hls.loadSource(proxied);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (cancelled) return;
                    handleFrameLoad();
                    video.play().catch(() => { /* política de autoplay */ });
                });
                hls.on(Hls.Events.ERROR, (_e, data) => {
                    if (!cancelled && data?.fatal) failoverToNext();
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari reproduce HLS de forma nativa.
                video.src = proxied;
                video.addEventListener('loadedmetadata', handleFrameLoad, { once: true });
                video.addEventListener('error', failoverToNext, { once: true });
            } else {
                failoverToNext();
            }
        })();

        return () => {
            cancelled = true;
            if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        };
    }, [playing, active, reloadKey, handleFrameLoad, failoverToNext]);

    const handleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        const req =
            el.requestFullscreen?.bind(el) ||
            (el as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> })
                .webkitRequestFullscreen?.bind(el);
        req?.().catch(() => { /* bloqueado por el navegador */ });
    };

    // ── Sin ninguna fuente ───────────────────────────────────────────────────
    if (sources.length === 0 && !loadingSources) {
        return (
            <div className="w-full rounded-xl border border-outline-variant bg-surface-container p-6 text-center">
                <AlertCircle className="w-6 h-6 text-on-surface-variant mx-auto mb-2" />
                <p className="md3-title-small text-on-surface mb-1">
                    Este anime aún no está disponible para reproducir
                </p>
                <p className="md3-body-small text-on-surface-variant">
                    Ninguno de nuestros servidores lo tiene todavía. Vuelve a intentarlo más adelante.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Aviso de publicidad de terceros — igual que en series */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/15 border border-orange-500/30 rounded-lg mb-2 text-sm text-orange-300">
                <span className="shrink-0">⚠️</span>
                <span>Algunos reproductores pueden mostrar publicidad externa. Si aparece una ventana emergente, ciérrala y el vídeo continuará.</span>
            </div>

            {/* ── Selector de servidor ── */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-surface-container-low border border-outline-variant border-b-0 rounded-t-xl overflow-x-auto">
                <span className="flex items-center gap-1.5 px-2 text-xs uppercase tracking-wider text-on-surface-variant shrink-0">
                    <Server className="w-3.5 h-3.5" /> Servidor
                </span>
                {sources.map((s, i) => (
                    <button
                        key={`${s.provider}-${s.label}-${i}`}
                        onClick={() => selectSource(i)}
                        title={s.verified ? 'Disponibilidad confirmada' : 'Disponibilidad sin confirmar'}
                        className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                            i === activeIdx
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {s.verified && <Check className="w-3.5 h-3.5" />}
                        {s.label}
                        {s.spanishSubs && s.audio !== 'latino' && (
                            <Languages className="w-3.5 h-3.5 opacity-70" />
                        )}
                    </button>
                ))}

                <div className="flex-1" />

                <button
                    onClick={handleFullscreen}
                    className="flex items-center justify-center w-9 h-9 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors shrink-0"
                    aria-label="Pantalla completa"
                >
                    <Maximize className="w-4 h-4" />
                </button>
            </div>

            {/* ── Superficie del reproductor ── */}
            <div
                ref={containerRef}
                className="relative w-full aspect-video bg-black rounded-b-xl overflow-hidden border border-outline-variant border-t-0"
            >
                {!playing && (
                    <button
                        onClick={start}
                        className="group absolute inset-0 w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Reproducir ${title} episodio ${episode}`}
                    >
                        {bannerUrl && (
                            <Image
                                src={bannerUrl}
                                alt={title}
                                fill
                                priority
                                className="object-cover opacity-50 group-hover:opacity-40 transition-opacity"
                                sizes="(max-width: 1024px) 100vw, 960px"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-primary shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform">
                                <Play className="w-9 h-9 text-white fill-white ml-1" />
                            </span>
                            <span className="text-white font-bold text-lg drop-shadow-lg">
                                Ver episodio {episode}
                            </span>
                            {active && (
                                <span className="text-white/60 text-xs uppercase tracking-widest">
                                    {active.label} · {AUDIO_LABEL[active.audio]}
                                </span>
                            )}
                        </div>
                    </button>
                )}

                {(loadingSources || (playing && loadingFrame)) && !error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black">
                        <Loader2 className="w-9 h-9 text-primary animate-spin" />
                        <p className="text-xs text-white/40 uppercase tracking-widest">
                            {loadingSources ? 'Buscando servidores…' : 'Cargando…'}
                        </p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-on-error-container" />
                        </div>
                        <div>
                            <p className="text-white font-medium mb-1">Ningún servidor respondió</p>
                            <p className="text-white/40 text-sm max-w-xs">
                                Probamos {sources.length} {sources.length === 1 ? 'fuente' : 'fuentes'} para este episodio.
                            </p>
                        </div>
                        <button
                            onClick={() => { setActiveIdx(0); setError(false); setLoadingFrame(true); setReloadKey((k) => k + 1); }}
                            className="flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-white text-sm font-medium"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
                        </button>
                    </div>
                )}

                {/* Fuente de proveedor (iframe) */}
                {playing && active?.kind === 'iframe' && !error && (
                    <iframe
                        key={`frame-${reloadKey}`}
                        src={active.url}
                        title={`Reproductor: ${title} episodio ${episode}`}
                        className="absolute inset-0 w-full h-full border-0"
                        onLoad={handleFrameLoad}
                        // MegaPlay exige que llegue un Referer: con "origin" el
                        // navegador manda https://filmify.me y el embed carga.
                        // Con "no-referrer" devolvería su página de error.
                        referrerPolicy="origin"
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share"
                        allowFullScreen
                    />
                )}

                {/* Fuente HLS propia (agregador self-hosted) */}
                {playing && active?.kind === 'hls' && !error && (
                    <video
                        key={`hls-${reloadKey}`}
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full"
                        controls
                        playsInline
                    />
                )}
            </div>

            {/* ── Navegador de episodios ── */}
            {episodeCount > 1 && (
                <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-low/60 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                            <Layers className="w-4 h-4 text-primary" />
                            Episodios <span className="text-on-surface-variant font-normal">({episodeCount})</span>
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => loadEpisode(episode - 1, playing)}
                                disabled={!hasPrev || loadingSources}
                                className="flex items-center gap-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                aria-label="Episodio anterior"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="md3-label-medium text-on-surface-variant px-1">
                                Ep. {episode}
                            </span>
                            <button
                                onClick={() => loadEpisode(episode + 1, playing)}
                                disabled={!hasNext || loadingSources}
                                className="flex items-center gap-1 h-9 px-3 rounded-lg bg-primary/20 border border-primary/30 text-sm font-semibold text-primary hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                aria-label="Episodio siguiente"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                        {Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => (
                            <button
                                key={ep}
                                onClick={() => loadEpisode(ep, true)}
                                aria-current={ep === episode ? 'true' : undefined}
                                className={`min-w-[3rem] h-10 px-3 rounded-lg text-sm font-bold transition-colors ${
                                    ep === episode
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-white/5 border border-white/10 text-on-surface-variant hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {ep}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

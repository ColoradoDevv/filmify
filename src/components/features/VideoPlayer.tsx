'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Loader2, AlertCircle, Globe, Settings, ChevronDown, Check, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface DynamicResult {
    url: string;
    server: string;
    lang: 'es' | 'en' | 'lat';
    quality?: string;
}

type Server = {
    id: string;
    name: string;
    baseUrl: string;
    lang: 'es' | 'en';
    type: 'latino' | 'castellano' | 'multi';
};

// Module-level constants — no point recomputing on every render.
// Ordered with Latino-defaulting providers first.
const SERVERS: Server[] = [
    {
        id: 'cuevana-dynamic',
        name: 'Auto (Mejor Latino)',
        baseUrl: '/api/scrape',
        lang: 'es',
        type: 'multi',
    },
    {
        id: 'unlimplay',
        name: 'UnLimPlay (Latino)',
        baseUrl: 'https://unlimplay.com/play/embed',
        lang: 'es',
        type: 'latino',
    },
    {
        id: 'superembed',
        name: 'SuperEmbed Latino',
        baseUrl: 'https://multiembed.mov',
        lang: 'es',
        type: 'latino',
    },
    {
        id: 'vidsrc-xyz',
        name: 'VidSrc XYZ',
        baseUrl: 'https://vidsrc.xyz/embed',
        lang: 'es',
        type: 'multi',
    },
    {
        id: 'vidsrc-to',
        name: 'VidSrc.to (Subs ES)',
        baseUrl: 'https://vidsrc.to/embed',
        lang: 'es',
        type: 'multi',
    },
    {
        id: 'vidlink',
        name: 'VidLink Pro',
        baseUrl: 'https://vidlink.pro',
        lang: 'es',
        type: 'multi',
    },
    {
        id: 'embed-su',
        name: 'Embed.su',
        baseUrl: 'https://embed.su/embed',
        lang: 'es',
        type: 'multi',
    },
    {
        id: 'rivestream',
        name: 'Rivestream',
        baseUrl: 'https://watch.rivestream.app/embed',
        lang: 'es',
        type: 'multi',
    },
];

const PREFERRED_SERVER_KEY = 'filmify:preferred-server';
const LOAD_TIMEOUT_MS = 10_000;

const SCRAPING_STEPS = [
    'Verificando UnLimPlay (Latino)...',
    'Verificando SuperEmbed Latino...',
    'Verificando VidSrc XYZ...',
    'Verificando VidSrc.to (Subs ES)...',
    'Verificando VidLink Pro...',
    'Verificando Embed.su...',
    'Verificando 2Embed y Rivestream...',
    'Seleccionando el mejor servidor disponible...',
];

function buildEmbedUrl(server: Server, mediaId: number, mediaType: 'movie' | 'tv', season: number, episode: number): string {
    const isMovie = mediaType === 'movie';

    switch (server.id) {
        case 'unlimplay':
            // unlimplay.com defaults to Latino, falls back to Español, then English subs.
            return isMovie
                ? `${server.baseUrl}/movie/${mediaId}`
                : `${server.baseUrl}/tv/${mediaId}/${season}/${episode}`;

        case 'vidsrc-xyz':
            return isMovie
                ? `${server.baseUrl}/movie/${mediaId}`
                : `${server.baseUrl}/tv/${mediaId}/${season}-${episode}`;

        case 'vidsrc-to':
            // ds_lang=es makes Spanish the preferred subtitle/audio in the player.
            return isMovie
                ? `${server.baseUrl}/movie/${mediaId}?ds_lang=es`
                : `${server.baseUrl}/tv/${mediaId}/${season}/${episode}?ds_lang=es`;

        case 'superembed':
            // multiembed.mov supports &lang=es to bias toward Spanish/Latino.
            return isMovie
                ? `${server.baseUrl}/?video_id=${mediaId}&tmdb=1&lang=es`
                : `${server.baseUrl}/?video_id=${mediaId}&tmdb=1&s=${season}&e=${episode}&lang=es`;

        case 'vidlink':
            return isMovie
                ? `${server.baseUrl}/movie/${mediaId}`
                : `${server.baseUrl}/tv/${mediaId}/${season}/${episode}`;

        case 'embed-su':
            return isMovie
                ? `${server.baseUrl}/movie/${mediaId}`
                : `${server.baseUrl}/tv/${mediaId}/${season}/${episode}`;

        case 'rivestream':
            return isMovie
                ? `${server.baseUrl}?type=movie&id=${mediaId}`
                : `${server.baseUrl}?type=tv&id=${mediaId}&season=${season}&episode=${episode}`;

        case 'cuevana-dynamic': {
            // Internal scraper endpoint — probes all providers and picks the best.
            const params = new URLSearchParams({
                tmdbId: mediaId.toString(),
                mediaType,
                ...(season ? { season: season.toString() } : {}),
                ...(episode ? { episode: episode.toString() } : {}),
            });
            return `${server.baseUrl}?${params.toString()}`;
        }

        default:
            return `${server.baseUrl}/${isMovie ? 'movie' : 'tv'}/${mediaId}`;
    }
}

export default function VideoPlayer({
    mediaId,
    mediaType,
    season = 1,
    episode = 1,
    onClose,
    title,
}: VideoPlayerProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasSavedWatched, setHasSavedWatched] = useState(false);
    const isWatched = useStore((state) => state.isWatched(mediaId));
    const addWatched = useStore((state) => state.addWatched);
    const [error, setError] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeServer, setActiveServer] = useState<Server>(SERVERS[0]);
    const [dynamicUrl, setDynamicUrl] = useState<string | null>(null);
    const [scrapingStep, setScrapingStep] = useState(0);

    // Auto-fallback chain: when the dynamic scraper returns N alive providers,
    // we walk through them on iframe-load failure instead of giving up after
    // the first one. The user can also manually skip to the next.
    const [availableResults, setAvailableResults] = useState<DynamicResult[]>([]);
    const [currentResultIdx, setCurrentResultIdx] = useState(0);

    const menuRef = useRef<HTMLDivElement>(null);
    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fetchAbortRef = useRef<AbortController | null>(null);

    // Restore the user's preferred server on mount.
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const saved = localStorage.getItem(PREFERRED_SERVER_KEY);
            if (saved) {
                const found = SERVERS.find((s) => s.id === saved);
                if (found) setActiveServer(found);
            }
        } catch {
            // localStorage may be unavailable (private mode, etc.) — fine.
        }
    }, []);

    // Persist server preference whenever it changes.
    useEffect(() => {
        try {
            localStorage.setItem(PREFERRED_SERVER_KEY, activeServer.id);
        } catch {
            // ignore
        }
    }, [activeServer]);

    const embedUrl = useMemo(
        () => buildEmbedUrl(activeServer, mediaId, mediaType, season, episode),
        [activeServer, mediaId, mediaType, season, episode]
    );

    // Fetch dynamic URL if server is a scraper. Cancellable so rapid server
    // switching doesn't write stale results into state.
    useEffect(() => {
        if (activeServer.id !== 'cuevana-dynamic') {
            setDynamicUrl(null);
            setAvailableResults([]);
            setCurrentResultIdx(0);
            setScrapingStep(0);
            return;
        }

        const ctrl = new AbortController();
        fetchAbortRef.current?.abort();
        fetchAbortRef.current = ctrl;

        setIsLoading(true);
        setError(false);
        setDynamicUrl(null);
        setAvailableResults([]);
        setCurrentResultIdx(0);
        setScrapingStep(0);

        // Pure visual: advance steps every ~600ms while we wait for the probe
        // results. Real progress comes from the server response, not this.
        const stepInterval = setInterval(() => {
            setScrapingStep((prev) => (prev < SCRAPING_STEPS.length - 1 ? prev + 1 : prev));
        }, 600);

        (async () => {
            try {
                const res = await fetch(embedUrl, { signal: ctrl.signal });
                const data = await res.json();
                if (ctrl.signal.aborted) return;

                clearInterval(stepInterval);
                setScrapingStep(SCRAPING_STEPS.length - 1);

                if (!data.success || !Array.isArray(data.results) || data.results.length === 0) {
                    throw new Error('No streams found');
                }

                // Store the full chain so we can auto-advance on iframe failure.
                setAvailableResults(data.results as DynamicResult[]);
                setCurrentResultIdx(0);
                setDynamicUrl(data.results[0].url);
            } catch (err) {
                if (ctrl.signal.aborted) return;
                clearInterval(stepInterval);
                console.error('[VideoPlayer] dynamic fetch error', err);
                setError(true);
                setIsLoading(false);
            }
        })();

        return () => {
            ctrl.abort();
            clearInterval(stepInterval);
        };
    }, [activeServer.id, embedUrl]);

    // Compute the URL the iframe will actually load. For the dynamic server,
    // this is null until the scraper resolves — and we MUST NOT render the
    // iframe with the /api/scrape URL as src (it would try to render JSON).
    const isDynamicServer = activeServer.id === 'cuevana-dynamic';
    const playableUrl: string | null = isDynamicServer ? dynamicUrl : embedUrl;
    const hasMoreInChain = isDynamicServer && currentResultIdx < availableResults.length - 1;
    const currentDynamicResult = isDynamicServer ? availableResults[currentResultIdx] : null;

    // Try the next provider in the chain. Used both by the auto-advance
    // timeout and the manual "siguiente" button.
    const tryNextServer = useCallback(() => {
        setCurrentResultIdx((idx) => {
            const next = idx + 1;
            if (next >= availableResults.length) return idx; // out of options
            const nextResult = availableResults[next];
            setDynamicUrl(nextResult.url);
            setIsLoading(true);
            setError(false);
            return next;
        });
    }, [availableResults]);

    // Reset loading + arm the load-failure timeout whenever the iframe URL
    // changes. We arm a timeout because cross-origin iframes do NOT fire
    // onError reliably (X-Frame-Options denials, DNS failures, ad-blockers
    // all silently fail).
    //
    // For the dynamic server, on timeout we automatically advance to the next
    // candidate in the chain instead of giving up.
    useEffect(() => {
        if (!playableUrl) return;

        setIsLoading(true);
        setError(false);
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = setTimeout(() => {
            setIsLoading((stillLoading) => {
                if (!stillLoading) return stillLoading;
                if (hasMoreInChain) {
                    // Don't show error — silently move on to the next provider.
                    tryNextServer();
                    return true;
                }
                setError(true);
                return false;
            });
        }, LOAD_TIMEOUT_MS);

        return () => {
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        };
    }, [playableUrl, hasMoreInChain, tryNextServer]);

    // Lock body scroll while the player is open. Save & restore the original
    // overflow value instead of setting it to 'unset' so we don't clobber
    // whatever ancestor was managing it.
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    // Escape key closes the player.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isMenuOpen) {
                    setIsMenuOpen(false);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, isMenuOpen]);

    // Click-outside closes the server dropdown.
    useEffect(() => {
        if (!isMenuOpen) return;
        const onClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [isMenuOpen]);

    const handleIframeLoad = useCallback(() => {
        setIsLoading(false);
        if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!playableUrl || isLoading || error || isWatched || hasSavedWatched) {
            return;
        }

        const watchTimer = window.setTimeout(() => {
            const watchedItem = mediaType === 'movie'
                ? ({
                    id: mediaId,
                    title,
                    poster_path: null,
                    backdrop_path: null,
                    vote_average: 0,
                    vote_count: 0,
                    release_date: '',
                    overview: '',
                    genre_ids: [],
                    adult: false,
                    original_language: 'es',
                    original_title: title,
                    popularity: 0,
                    video: false,
                } as Movie)
                : ({
                    id: mediaId,
                    name: title,
                    original_name: title,
                    poster_path: null,
                    backdrop_path: null,
                    vote_average: 0,
                    vote_count: 0,
                    first_air_date: '',
                    overview: '',
                    genre_ids: [],
                    adult: false,
                    original_language: 'es',
                    popularity: 0,
                    origin_country: [],
                } as TVShow);

            addWatched(watchedItem);
            setHasSavedWatched(true);
        }, 5000);

        return () => window.clearTimeout(watchTimer);
    }, [playableUrl, isLoading, error, isWatched, hasSavedWatched, mediaId, mediaType, title, addWatched]);

    const handleSelectServer = useCallback((server: Server) => {
        if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
        }
        if (fetchAbortRef.current) {
            fetchAbortRef.current.abort();
            fetchAbortRef.current = null;
        }
        setActiveServer(server);
        setIsMenuOpen(false);
    }, []);

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-500">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 md:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                    <button
                        onClick={onClose}
                        aria-label="Cerrar reproductor"
                        className="p-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all group"
                    >
                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                    <div className="hidden md:block">
                        <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                {activeServer.type === 'latino'
                                    ? 'Audio: Latino'
                                    : activeServer.type === 'multi'
                                        ? 'Audio: Multi/Esp'
                                        : 'Audio: Castellano'}
                            </span>
                            {mediaType === 'tv' && (
                                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">
                                    T{season} • E{episode}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Server Selector */}
                <div ref={menuRef} className="relative pointer-events-auto">
                    <button
                        onClick={() => setIsMenuOpen((open) => !open)}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all text-xs font-bold uppercase tracking-wider"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Servidor: {activeServer.name}</span>
                        <ChevronDown className={cn('w-4 h-4 transition-transform', isMenuOpen && 'rotate-180')} />
                    </button>

                    {isMenuOpen && (
                        <div
                            role="menu"
                            className="absolute top-full right-0 mt-2 w-64 rounded-2xl bg-surface/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-200"
                        >
                            <div className="px-3 py-2 text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-white/5 mb-1">
                                Seleccionar Servidor / Idioma
                            </div>
                            {SERVERS.map((server) => (
                                <button
                                    key={server.id}
                                    role="menuitemradio"
                                    aria-checked={activeServer.id === server.id}
                                    onClick={() => handleSelectServer(server)}
                                    className={cn(
                                        'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs transition-all',
                                        activeServer.id === server.id
                                            ? 'bg-primary/15 text-primary border border-primary/20'
                                            : 'text-text-secondary hover:bg-white/5 hover:text-white border border-transparent'
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <Globe className={cn('w-3.5 h-3.5', server.lang === 'es' ? 'text-primary' : 'text-text-muted')} />
                                        <div className="flex flex-col text-left">
                                            <span className="font-bold">{server.name}</span>
                                            <span className="text-[8px] uppercase tracking-tighter opacity-50">
                                                {server.type === 'latino'
                                                    ? 'Español Latino'
                                                    : server.type === 'multi'
                                                        ? 'Múltiples Audios'
                                                        : 'Castellano'}
                                            </span>
                                        </div>
                                    </div>
                                    {activeServer.id === server.id && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Video Container */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
                {isLoading && !error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-black">
                        <div className="relative">
                            <Loader2 className="w-16 h-16 text-primary animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Globe className="w-6 h-6 text-primary/40" />
                            </div>
                        </div>
                        
                        <div className="space-y-4 text-center max-w-md px-6">
                            <div className="space-y-1">
                                <p className="text-text-secondary text-xs font-black uppercase tracking-[0.3em] animate-pulse">
                                    {isDynamicServer ? 'Verificando servidores disponibles' : `Conectando con ${activeServer.name}...`}
                                </p>
                                <p className="text-text-muted text-[10px] uppercase tracking-widest">
                                    Audio en Español (cambiable dentro del reproductor)
                                </p>
                            </div>

                            {isDynamicServer && (
                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    {SCRAPING_STEPS.map((step, idx) => (
                                        <div 
                                            key={idx}
                                            className={cn(
                                                "flex items-center gap-3 text-[10px] transition-all duration-500",
                                                idx === scrapingStep ? "text-primary font-bold opacity-100 translate-x-1" : 
                                                idx < scrapingStep ? "text-green-500/60 opacity-60" : "text-white/10 opacity-20"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-1 h-1 rounded-full",
                                                idx === scrapingStep ? "bg-primary animate-ping" : 
                                                idx < scrapingStep ? "bg-green-500" : "bg-white/10"
                                            )} />
                                            <span className="uppercase tracking-wider">{step}</span>
                                            {idx < scrapingStep && <Check className="w-3 h-3" />}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="text-text-muted text-[8px] uppercase tracking-widest pt-4">
                                Si tarda demasiado, prueba con otro servidor en el menú superior
                            </p>
                        </div>
                    </div>
                )}

                {error ? (
                    <div className="flex flex-col items-center gap-4 text-center p-8">
                        <AlertCircle className="w-16 h-16 text-red-500 opacity-50" />
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">No se pudo cargar el servidor</h3>
                            <p className="text-text-secondary text-sm max-w-md">
                                {activeServer.name} no respondió a tiempo. Puede estar caído, o tu bloqueador de
                                anuncios está bloqueando el dominio. Prueba con otro servidor.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsMenuOpen(true)}
                                className="px-8 py-3 bg-primary text-black font-black rounded-full text-xs hover:bg-primary-hover transition-all"
                            >
                                CAMBIAR SERVIDOR
                            </button>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-white/10 text-white font-black rounded-full text-xs hover:bg-white/20 transition-all border border-white/10"
                            >
                                VOLVER
                            </button>
                        </div>
                    </div>
                ) : playableUrl ? (
                    <iframe
                        // Re-mount on URL change so onLoad fires and the timeout resets cleanly.
                        key={playableUrl}
                        src={playableUrl}
                        title={`Reproductor: ${title}`}
                        className="w-full h-full border-0"
                        onLoad={handleIframeLoad}
                        referrerPolicy="no-referrer"
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    />
                ) : null}
            </div>

            {/* Bottom Controls Hint */}
            <div className="absolute bottom-6 left-6 z-30 pointer-events-none hidden md:block">
                <div className="flex flex-col gap-1 opacity-40">
                    <p className="text-[8px] text-white font-black uppercase tracking-[0.2em]">
                        TIP: Pulsa <kbd>Esc</kbd> para cerrar. Si el audio está en inglés, busca la opción de
                        idioma dentro del reproductor del servidor.
                    </p>
                </div>
            </div>
        </div>
    );
}

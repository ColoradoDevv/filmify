'use client';

import { useEffect, useState, useRef } from 'react';

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}
import { Party } from '@/types/watch-party';
import { Play, Pause, Square, LogOut, Volume2, VolumeX, Home, Film, Youtube, Maximize, Minimize, AlertTriangle, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getMovieDetails, getTVDetails } from '@/lib/tmdb/service';
import { getYouTubeTrailerId } from '@/lib/ai';
import { getWorkingStream, SOURCES } from '@/services/streamingSources';

interface PartyPlayerProps {
    party: Party;
    isHost: boolean;
    onEndParty: () => void;
    onControl: (action: 'play' | 'pause' | 'seek', value?: number) => void;
    onSync: (time: number, isPlaying: boolean) => void;
    onSetPlaying: () => void;
    lastControlAction: {
        action: 'play' | 'pause' | 'seek';
        value?: number;
        timestamp: number;
    } | null;
    syncData: {
        time: number;
        isPlaying: boolean;
    } | null;
    memberJoinedAt: number | null;
    onUpdateLanguage: (lang: 'es' | 'en') => void;
    onUpdateSource: (source: string | null) => void;
}

export const PartyPlayer = ({ party, isHost, onEndParty, onControl, onSync, onSetPlaying, lastControlAction, syncData, memberJoinedAt, onUpdateLanguage, onUpdateSource }: PartyPlayerProps) => {
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [videoKey, setVideoKey] = useState<string | null>(null);
    const [playerMode, setPlayerMode] = useState<'trailer' | 'movie'>('trailer');
    const [stream, setStream] = useState<{ url: string; source: string; hasSubs?: boolean; isAnime?: boolean } | null>(null);
    const [imdbId, setImdbId] = useState<string | null>(null);
    const [isLoadingEmbed, setIsLoadingEmbed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showEndConfirmation, setShowEndConfirmation] = useState(false);
    const [failedSources, setFailedSources] = useState<string[]>([]);
    const [showSourceSelector, setShowSourceSelector] = useState(false);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    console.log('PartyPlayer rendering', { partyId: party.id, status: party.status, playerMode, source: party.source });

    // Countdown Logic
    useEffect(() => {
        if (party.status === 'counting' && countdown === null) {
            setCountdown(5);
        }

        if (countdown !== null && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            if (isHost) {
                onSetPlaying();
            }
        }
    }, [party.status, countdown, isHost, onSetPlaying]);

    // Reset countdown if status changes to playing
    useEffect(() => {
        if (party.status === 'playing') {
            setCountdown(null);
        }
    }, [party.status]);

    // Fetch YouTube trailer
    useEffect(() => {
        const fetchStream = async () => {
            try {
                let trailer;
                let year = '';
                let productionCompany = '';

                if (party.media_type === 'tv') {
                    const details = await getTVDetails(party.tmdb_id);
                    trailer = details.videos?.results.find(
                        (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
                    );
                    year = details.first_air_date?.split('-')[0] || '';
                } else {
                    const details = await getMovieDetails(party.tmdb_id);
                    trailer = details.videos?.results.find(
                        (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
                    );
                    year = details.release_date?.split('-')[0] || '';
                    productionCompany = details.production_companies?.[0]?.name || '';
                }

                // If no IMDB ID in party, fetch it
                let id = party.imdb_id;
                if (!id) {
                    if (party.media_type === 'tv') {
                        const details = await getTVDetails(party.tmdb_id);
                        id = details.external_ids?.imdb_id || null;
                    } else {
                        const details = await getMovieDetails(party.tmdb_id);
                        id = details.imdb_id || null;
                    }
                }

                setImdbId(id);

                if (id) {
                    // If a specific source is forced by host
                    if (party.source) {
                        const selectedSource = SOURCES.find(s => s.name === party.source);
                        if (selectedSource) {
                            const url = party.media_type === 'tv'
                                ? selectedSource.getEpisodeUrl(id, party.season!, party.episode!, party.language || 'es')
                                : selectedSource.getMovieUrl(id, party.language || 'es');

                            setStream({ url, source: `${selectedSource.name} (Manual)` });
                            setIsLoadingEmbed(false);
                            return;
                        }
                    }

                    // Auto mode (find working stream)
                    const result = await getWorkingStream(
                        id,
                        party.language || 'es',
                        party.media_type !== 'tv',
                        party.season,
                        party.episode,
                        party.tmdb_id, // NUEVO: para detección anime
                        undefined, // Override si necesitas
                        failedSources // Pass excluded sources
                    );
                    setStream(result);
                } else {
                    setStream(null);
                }

            } catch (error) {
                console.error('Error fetching stream:', error);
                setStream(null);
            } finally {
                setIsLoadingEmbed(false);
            }
        };

        fetchStream();
    }, [party.tmdb_id, party.imdb_id, party.media_type, party.season, party.episode, party.language, party.source, failedSources]);

    // YT API Loader
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }
    }, []);

    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const playerRef = useRef<any>(null);

    useEffect(() => {
        if (!videoKey || !window.YT) return;

        const initPlayer = () => {
            // @ts-ignore
            playerRef.current = new window.YT.Player('yt-player-frame', {
                events: {
                    'onReady': (event: any) => {
                        setIsPlayerReady(true);
                        if (isMuted) event.target.mute();
                        if (isPlaying) event.target.playVideo();
                    },
                    'onStateChange': (event: any) => {
                        // Optional: sync state changes from player UI
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            // @ts-ignore
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            playerRef.current = null;
            setIsPlayerReady(false);
        };
    }, [videoKey]);

    // Handle Sync Request (Host only)
    useEffect(() => {
        if (!isHost || !memberJoinedAt || !playerRef.current || !isPlayerReady) return;

        try {
            if (typeof playerRef.current.getCurrentTime !== 'function') return;

            const currentTime = playerRef.current.getCurrentTime();
            const playerState = playerRef.current.getPlayerState();
            const isPlayingNow = playerState === 1; // 1 is playing

            console.log('Syncing new member to:', currentTime);
            onSync(currentTime, isPlayingNow);
        } catch (e) {
            console.error('Error getting time for sync:', e);
        }
    }, [memberJoinedAt, isHost, onSync, isPlayerReady]);

    // Handle Incoming Sync (Guest)
    useEffect(() => {
        if (isHost || !syncData || !playerRef.current || !isPlayerReady) return;

        const { time, isPlaying: shouldPlay } = syncData;
        const player = playerRef.current;

        if (typeof player.getCurrentTime !== 'function' || typeof player.seekTo !== 'function') return;

        // Only sync if difference is significant (> 2 seconds) to avoid jitter
        const currentTime = player.getCurrentTime();
        if (Math.abs(currentTime - time) > 2) {
            player.seekTo(time, true);
        }

        if (shouldPlay) {
            player.playVideo();
            setIsPlaying(true);
        } else {
            player.pauseVideo();
            setIsPlaying(false);
        }
    }, [syncData, isHost, isPlayerReady]);

    // Handle Remote Controls
    useEffect(() => {
        if (!lastControlAction || !playerRef.current || !isPlayerReady) return;

        const { action } = lastControlAction;
        const player = playerRef.current;

        if (typeof player.playVideo !== 'function') return;

        if (action === 'play') {
            player.playVideo();
            setIsPlaying(true);
        } else if (action === 'pause') {
            player.pauseVideo();
            setIsPlaying(false);
        }
    }, [lastControlAction, isPlayerReady]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        setIsMuted(newVolume === 0);

        if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
            playerRef.current.setVolume(newVolume * 100);
        }
    };

    const handlePlayPause = () => {
        const action = isPlaying ? 'pause' : 'play';

        // Try to control Vidsrc iframe via postMessage (Best Effort)
        if (playerMode === 'movie' && iframeRef.current?.contentWindow) {
            const msg = action === 'play' ? 'play' : 'pause';
            iframeRef.current.contentWindow.postMessage({ type: msg }, '*');
            iframeRef.current.contentWindow.postMessage({ event: 'command', func: msg }, '*');
            iframeRef.current.contentWindow.postMessage(msg, '*');
        }

        onControl(action);
    };

    const handleLeave = () => {
        router.push('/rooms');
    };

    const handleReportBroken = () => {
        if (!stream) return;
        // Extract source name from "vidsrc.me (ES)" format
        const sourceName = stream.source.split(' ')[0];
        setFailedSources(prev => [...prev, sourceName]);
        // This will trigger the useEffect to re-fetch excluding this source
    };

    if (party.status === 'waiting') return null;

    if (party.status === 'finished') {
        return (
            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
                {/* Background Poster */}
                {party.poster_path && (
                    <div
                        className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110"
                        style={{
                            backgroundImage: `url(https://image.tmdb.org/t/p/original${party.poster_path})`,
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-2xl animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 shadow-xl">
                        <Film size={40} className="text-white" />
                    </div>

                    <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
                        Fin de la Función
                    </h1>

                    <p className="text-xl text-gray-300 mb-2 font-medium">
                        {party.title}
                    </p>

                    <p className="text-gray-400 mb-10 max-w-md mx-auto">
                        Gracias por compartir este momento con nosotros. ¡Esperamos que hayas disfrutado la película!
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleLeave}
                            className="px-8 py-4 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-all transform hover:scale-105 flex items-center gap-3 shadow-lg shadow-white/10"
                        >
                            <Home size={20} />
                            Volver a Salas
                        </button>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-4 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all border border-white/10 backdrop-blur-md flex items-center gap-3"
                        >
                            <LogOut size={20} />
                            Salir
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full bg-black flex flex-col">
            {/* Video Container */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group">
                {/* Disclaimer Banner (shown in movie mode) */}
                {playerMode === 'movie' && (
                    <div className="absolute top-0 left-0 right-0 z-30 bg-yellow-500/10 backdrop-blur-sm border-b border-yellow-500/20 px-4 py-2 flex justify-between items-center">
                        <p className="text-xs text-yellow-200 text-center flex-1">
                            <strong>Aviso:</strong> Contenido externo. La sincronización automática puede no funcionar.
                        </p>
                    </div>
                )}

                {/* Manual Sync Overlay (when Host is paused in Movie mode) */}
                {playerMode === 'movie' && !isPlaying && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/80 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10 text-center animate-in fade-in zoom-in duration-200">
                            <Pause size={48} className="mx-auto mb-2 text-white" />
                            <h3 className="text-xl font-bold text-white mb-1">Pausado por el Anfitrión</h3>
                            <p className="text-sm text-gray-300">Por favor, pausa el video manualmente.</p>
                        </div>
                    </div>
                )}

                {/* Movie Player */}
                <div className="w-full h-full flex items-center justify-center relative">
                    {party.status === 'playing' ? (
                        <div className="w-full h-full bg-black">
                            {playerMode === 'trailer' ? (
                                // YouTube Trailer Mode
                                videoKey ? (
                                    <iframe
                                        id="yt-player-frame"
                                        ref={iframeRef}
                                        className="w-full h-full pointer-events-none"
                                        src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&controls=0&mute=${isMuted ? 1 : 0}&enablejsapi=1&rel=0&modestbranding=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                                        title={party.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        style={{ pointerEvents: isHost ? 'auto' : 'none' }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-white">
                                        <p>No se encontró el tráiler para esta película.</p>
                                    </div>
                                )
                            ) : (
                                // Full Movie Mode (Multi-Source)
                                isLoadingEmbed ? (
                                    <div className="flex items-center justify-center h-full text-white">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p>Buscando mejor fuente...</p>
                                        </div>
                                    </div>
                                ) : stream ? (
                                    <div className="w-full h-full flex flex-col">
                                        <div className="flex-1 relative">
                                            <iframe
                                                src={stream.url}
                                                className="w-full h-full border-0"
                                                allowFullScreen
                                                allow="autoplay; fullscreen; picture-in-picture"
                                                title={`${party.title} - Película Completa`}
                                            />
                                        </div>
                                        <div className="bg-black/90 text-white/50 text-xs py-1 text-center flex items-center justify-center gap-4">
                                            <span>
                                                Reproduciendo desde: <strong className="text-white/80">{stream.source}</strong>
                                                {stream.hasSubs && ' • Subs disponibles'}
                                                {stream.isAnime && ' • (Modo Anime)'}
                                            </span>

                                            {/* Report Broken Link Button */}
                                            <button
                                                onClick={handleReportBroken}
                                                className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-red-500/10 px-2 py-0.5 rounded hover:bg-red-500/20 transition-colors"
                                                title="Reportar que este video no funciona"
                                            >
                                                <AlertTriangle size={12} />
                                                Reportar enlace roto
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-white px-6">
                                        <div className="text-center max-w-md">
                                            <Film size={64} className="mx-auto mb-4 text-gray-500" />
                                            <h3 className="text-xl font-bold mb-2">Película no disponible</h3>
                                            <p className="text-gray-400 text-sm">
                                                Esta película aún no está disponible para streaming.
                                                {imdbId && <span className="block mt-2 text-xs text-gray-500">IMDB: {imdbId}</span>}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-4">
                                                Intenta con el modo tráiler o revisa en unos días.
                                            </p>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* Overlay for controls visibility (only for trailer mode with YT API) */}
                            {playerMode === 'trailer' && (
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                                    {isHost && (
                                        <button
                                            onClick={handlePlayPause}
                                            className="p-4 rounded-full bg-white/20 backdrop-blur-md text-white hover:scale-110 transition-transform pointer-events-auto"
                                        >
                                            {isPlaying ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" />}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-[200px] font-bold text-white animate-pulse">
                                {countdown}
                            </span>
                        </div>
                    )}
                </div>

                {/* Fullscreen Button (Overlay) */}
                <button
                    onClick={toggleFullscreen}
                    className="absolute bottom-4 right-4 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-all z-40 opacity-0 group-hover:opacity-100"
                >
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
            </div>

            {/* Control Bar (Outside Video) */}
            <div className="h-20 bg-gray-900 border-t border-white/10 px-6 flex items-center justify-between z-50">
                {isHost ? (
                    <>
                        <button
                            onClick={handlePlayPause}
                            className="p-3 rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>

                        {/* Player Mode Toggle */}
                        <div className="flex items-center gap-2 bg-white/10 rounded-full p-1 border border-white/20">
                            <button
                                onClick={() => setPlayerMode('trailer')}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${playerMode === 'trailer'
                                    ? 'bg-white text-black'
                                    : 'text-white/70 hover:text-white'
                                    }`}
                            >
                                <Youtube size={16} />
                                Tráiler
                            </button>
                            <button
                                onClick={() => setPlayerMode('movie')}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${playerMode === 'movie'
                                    ? 'bg-white text-black'
                                    : 'text-white/70 hover:text-white'
                                    }`}
                                disabled={isLoadingEmbed}
                            >
                                <Film size={16} />
                                Película
                                {!stream && !isLoadingEmbed && (
                                    <span className="text-xs opacity-60">(N/D)</span>
                                )}
                            </button>
                        </div>

                        {/* Language Toggle */}
                        <button
                            onClick={() => onUpdateLanguage(party.language === 'en' ? 'es' : 'en')}
                            className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs font-bold text-white hover:bg-white/20 transition-colors uppercase tracking-wider"
                            title="Cambiar idioma de audio"
                        >
                            {party.language || 'ES'}
                        </button>

                        {/* Source Selector (Host Only) */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSourceSelector(!showSourceSelector)}
                                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                                title="Seleccionar fuente manualmente"
                            >
                                <Settings size={20} />
                            </button>

                            {showSourceSelector && (
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1a1d21] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                                    <div className="p-2 border-b border-white/10">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fuente de Video</p>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        <button
                                            onClick={() => {
                                                onUpdateSource(null); // Auto
                                                setShowSourceSelector(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${!party.source ? 'text-purple-400 font-bold' : 'text-white'}`}
                                        >
                                            Automático (Recomendado)
                                        </button>
                                        {SOURCES.map((src) => (
                                            <button
                                                key={src.name}
                                                onClick={() => {
                                                    onUpdateSource(src.name);
                                                    setShowSourceSelector(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${party.source === src.name ? 'text-purple-400 font-bold' : 'text-white'}`}
                                            >
                                                {src.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowEndConfirmation(true)}
                            className="px-4 py-2 rounded-lg bg-red-600/80 text-white font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                        >
                            <Square size={16} fill="currentColor" /> Terminar
                        </button>

                        {/* BOTÓN MÁGICO - SOLO HOST */}
                        {
                            playerMode === 'movie' && (
                                <button
                                    onClick={() => {
                                        const iframe = iframeRef.current;
                                        if (!iframe) return;

                                        // Inyecta script que cambia el audio a español latino
                                        const script = `
                                            (function() {
                                            setTimeout(() => {
                                                // vidsrc.me
                                                document.querySelector('[data-value="es"]')?.click();
                                                document.querySelector('[title="Spanish"]')?.click();
                                                // autoembed / 2embed
                                                document.querySelector('button[title="Audio"]')?.click();
                                                setTimeout(() => {
                                                document.querySelectorAll('li').forEach(li => {
                                                    if (li.textContent.includes('Spanish') || li.textContent.includes('Latino') || li.textContent.includes('Español')) {
                                                    li.click();
                                                    }
                                                });
                                                }, 500);
                                            }, 3000);
                                            })();
                                        `;
                                        try {
                                            const scriptEl = iframe.contentDocument?.createElement('script');
                                            if (scriptEl) {
                                                scriptEl.textContent = script;
                                                iframe.contentDocument?.body.appendChild(scriptEl);
                                                alert('Script inyectado. Si no funciona, es por seguridad del navegador.');
                                            } else {
                                                alert('No se pudo acceder al iframe (bloqueo de seguridad). Intenta usar las fuentes "Latino" automáticas.');
                                            }
                                        } catch (e) {
                                            console.error('Error inyectando script:', e);
                                            alert('No se pudo forzar el audio automáticamente debido a restricciones de seguridad del navegador.');
                                        }
                                    }}
                                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                                    title="Intentar forzar audio Latino (Experimental)"
                                >
                                    <AlertTriangle size={16} />
                                    Forzar Latino
                                </button>
                            )
                        }
                    </>
                ) : (
                    <span className="text-white/70 text-sm">Controles del Anfitrión</span>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Volume Control - Only for Trailer Mode */}
                {playerMode === 'trailer' && (
                    <div className="flex items-center gap-2 group/volume">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-2 text-white/80 hover:text-white transition-colors"
                        >
                            {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-0 group-hover/volume:w-24 transition-all duration-300 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                        />
                    </div>
                )}

                <button
                    onClick={handleLeave}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/10"
                >
                    <LogOut size={16} /> Salir
                </button>
            </div>

            {/* End Party Confirmation Modal */}
            {showEndConfirmation && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1d21] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-white mb-2">¿Terminar la función?</h3>
                        <p className="text-gray-400 mb-6">
                            Esto finalizará la sesión para todos los participantes. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowEndConfirmation(false)}
                                className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onEndParty}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                            >
                                Sí, terminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

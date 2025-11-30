'use client';

import { useEffect, useState, useRef } from 'react';

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}
import { Party } from '@/types/watch-party';
import { Play, Pause, Square, LogOut, Volume2, VolumeX, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getMovieDetails } from '@/lib/tmdb/service';
import { getYouTubeTrailerId } from '@/lib/ai';

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
        timestamp: number;
    } | null;
    memberJoinedAt: number | null;
}

export const PartyPlayer = ({ party, isHost, onEndParty, onControl, onSync, onSetPlaying, lastControlAction, syncData, memberJoinedAt }: PartyPlayerProps) => {
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [videoKey, setVideoKey] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const router = useRouter();

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
            // Keep at 0 or null? If we set to null, it might flicker if status hasn't changed yet.
            // But status change should be fast.
            // Let's wait for status to change to 'playing' before removing countdown UI?
            // Actually, if we set countdown to null, the render logic below checks party.status.
            // If party.status is still 'counting' and countdown is null, it might re-trigger 5.
            // So we should only set countdown to null if party.status is NOT 'counting'.
        }
    }, [party.status, countdown, isHost, onSetPlaying]);

    // Reset countdown if status changes to playing
    useEffect(() => {
        if (party.status === 'playing') {
            setCountdown(null);
        }
    }, [party.status]);

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const details = await getMovieDetails(party.tmdb_id);
                const trailer = details.videos?.results.find(
                    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
                );

                if (trailer) {
                    setVideoKey(trailer.key);
                } else {
                    // AI Fallback
                    const aiTrailerId = await getYouTubeTrailerId(party.title, details.production_companies?.[0]?.name);
                    if (aiTrailerId) {
                        setVideoKey(aiTrailerId);
                    }
                }
            } catch (error) {
                console.error('Error fetching video:', error);
            }
        };

        fetchVideo();
    }, [party.tmdb_id, party.title]);

    // Handle Sync Request (Host only)
    useEffect(() => {
        if (!isHost || !memberJoinedAt || !iframeRef.current) return;

        // Give a small delay to ensure the new member is ready to receive? 
        // Actually, send immediately.
        const iframeWindow = iframeRef.current.contentWindow;
        if (iframeWindow) {
            // We need to get current time. The YouTube IFrame API is tricky with postMessage for getting values.
            // We can't easily "get" time via postMessage without a callback setup which is complex in React without the wrapper library.
            // However, we are tracking `isPlaying`.
            // Ideally we should use the `youtube-player` npm package or similar wrapper for easier control, 
            // but we are using raw iframe.
            // Wait, raw iframe postMessage doesn't return values.
            // We need to use the actual YouTube IFrame API object if we want to read state.
            // Since we are using raw iframe src, we can't read `getCurrentTime()`.

            // CRITICAL: To read time, we MUST use the YT.Player constructor.
            // But we are using a simple iframe.
            // To fix "desface", we need to know the time.
            // If we can't read time, we can't sync.

            // Alternative: We can't fix sync without refactoring to use `react-youtube` or loading the YT API script.
            // Given the constraints and existing code, I should probably switch to `react-youtube` or similar if possible, 
            // OR just inject the script.

            // Let's try to inject the script and init the player on the existing iframe.
            // Or just use `window.YT`.
        }
    }, [memberJoinedAt, isHost]);

    // ... wait, I need to refactor to use YT API to get time.
    // For now, let's keep the existing structure but I'll add the YT API loader logic.

    useEffect(() => {
        // Load YT API
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
            // We don't destroy to avoid removing the iframe managed by React
            // But we reset the ref and ready state
            playerRef.current = null;
            setIsPlayerReady(false);
        };
    }, [videoKey]);

    // Handle Sync Request (Host only) - REAL IMPLEMENTATION
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

    const handlePlayPause = () => {
        const action = isPlaying ? 'pause' : 'play';
        // We don't set local state here immediately, we wait for the broadcast/optimistic update from hook
        // But for better responsiveness we can set it, hook will confirm it.
        // Actually, hook optimistic update will trigger the useEffect above.
        onControl(action);
    };

    const handleLeave = () => {
        router.push('/rooms');
    };

    if (party.status === 'waiting') return null;

    if (party.status === 'finished') {
        return (
            <div className="w-full h-full bg-black flex flex-col items-center justify-center space-y-6">
                <h1 className="text-4xl font-bold text-white">La función ha terminado</h1>
                <p className="text-gray-400">Gracias por ver la película con nosotros.</p>
                <button
                    onClick={handleLeave}
                    className="px-6 py-3 rounded-full bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                    <Home size={20} /> Volver a Salas
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden group">
            {/* Movie Player */}
            <div className="w-full h-full flex items-center justify-center relative">
                {party.status === 'playing' ? (
                    <div className="w-full h-full bg-black">
                        {videoKey ? (
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
                                <p>No se encontró el video para esta película.</p>
                            </div>
                        )}

                        {/* Overlay for controls visibility */}
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
                    </div>
                ) : (
                    <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-[200px] font-bold text-white animate-pulse">
                            {countdown}
                        </span>
                    </div>
                )}
            </div>

            {/* Control Bar (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-4">
                        {isHost ? (
                            <>
                                <button
                                    onClick={handlePlayPause}
                                    className="p-3 rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
                                >
                                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                </button>
                                <button
                                    onClick={onEndParty}
                                    className="px-4 py-2 rounded-lg bg-red-600/80 text-white font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                                >
                                    <Square size={16} fill="currentColor" /> Terminar Función
                                </button>
                            </>
                        ) : (
                            <span className="text-white/70 text-sm">Controles del Anfitrión</span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-2 text-white/80 hover:text-white transition-colors"
                        >
                            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                        <button
                            onClick={handleLeave}
                            className="px-4 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/10"
                        >
                            <LogOut size={16} /> Salir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

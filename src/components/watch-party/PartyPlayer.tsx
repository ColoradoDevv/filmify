import { useEffect, useState, useRef } from 'react';
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
    lastControlAction: {
        action: 'play' | 'pause' | 'seek';
        value?: number;
        timestamp: number;
    } | null;
}

export const PartyPlayer = ({ party, isHost, onEndParty, onControl, lastControlAction }: PartyPlayerProps) => {
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [videoKey, setVideoKey] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const router = useRouter();
    // Fetch Video
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
                    // Fallback to AI
                    console.log('No TMDB trailer found, trying AI fallback...');
                    const year = details.release_date ? new Date(details.release_date).getFullYear().toString() : '';
                    const productionCompany = details.production_companies?.[0]?.name;
                    const aiTrailerId = await getYouTubeTrailerId(party.title, year, 'movie', productionCompany);
                    if (aiTrailerId) {
                        console.log('AI found trailer:', aiTrailerId);
                        setVideoKey(aiTrailerId);
                    } else {
                        console.log('AI could not find trailer.');
                    }
                }
            } catch (error) {
                console.error('Error fetching video:', error);
            }
        };

        if (party.tmdb_id) {
            fetchVideo();
        }
    }, [party.tmdb_id, party.title]);

    // Handle Countdown
    useEffect(() => {
        if (party.status === 'counting') {
            setCountdown(5);
            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev === null || prev <= 1) {
                        clearInterval(interval);
                        return null;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [party.status]);

    // Handle Remote Controls
    useEffect(() => {
        if (!lastControlAction || !iframeRef.current) return;

        const { action } = lastControlAction;
        const iframeWindow = iframeRef.current.contentWindow;

        if (!iframeWindow) return;

        if (action === 'play') {
            iframeWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            setIsPlaying(true);
        } else if (action === 'pause') {
            iframeWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            setIsPlaying(false);
        }
    }, [lastControlAction]);

    const handlePlayPause = () => {
        const action = isPlaying ? 'pause' : 'play';
        // We don't set local state here immediately, we wait for the broadcast/optimistic update from hook
        // But for better responsiveness we can set it, hook will confirm it.
        // Actually, hook optimistic update will trigger the useEffect above.
        onControl(action);
    };

    const handleLeave = () => {
        router.push('/');
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
                    <Home size={20} /> Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden group">
            {/* Movie Player */}
            <div className="w-full h-full flex items-center justify-center relative">
                {party.status === 'playing' || (party.status === 'counting' && countdown === null) ? (
                    <div className="w-full h-full bg-black">
                        {videoKey ? (
                            <iframe
                                ref={iframeRef}
                                className="w-full h-full pointer-events-none"
                                src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&controls=0&mute=${isMuted ? 1 : 0}&enablejsapi=1&rel=0&modestbranding=1`}
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

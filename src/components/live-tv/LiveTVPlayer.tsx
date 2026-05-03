'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Volume2, VolumeX, Maximize, Minimize, AlertCircle } from 'lucide-react';
import type { LiveChannel } from '@/services/liveTV';

interface LiveTVPlayerProps {
    channel: LiveChannel;
    onClose: () => void;
}

export default function LiveTVPlayer({ channel, onClose }: LiveTVPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hlsRef = useRef<any>(null);
    const retryCountRef = useRef(0);
    const isMountedRef = useRef(false);

    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Auto-hide controls
    const resetControlsTimeout = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 3000);
    };

    useEffect(() => {
        const handleMouseMove = () => resetControlsTimeout();
        const container = containerRef.current;
        if (container) {
            container.addEventListener('mousemove', handleMouseMove);
            container.addEventListener('touchstart', handleMouseMove);
            container.addEventListener('click', handleMouseMove);
        }
        return () => {
            if (container) {
                container.removeEventListener('mousemove', handleMouseMove);
                container.removeEventListener('touchstart', handleMouseMove);
                container.removeEventListener('click', handleMouseMove);
            }
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [isPlaying]);

    useEffect(() => {
        isMountedRef.current = true;

        const video = videoRef.current;
        if (!video) return;

        const loadStream = async () => {
            if (isMountedRef.current) {
                setIsLoading(true);
                setError(null);
                setRetryCount(0);
            }
            retryCountRef.current = 0;

            try {
                // Dynamically import hls.js
                const Hls = (await import('hls.js')).default;

                if (Hls.isSupported()) {
                    const hls = new Hls({
                        enableWorker: true,
                        lowLatencyMode: false, // Disable for better stability with IPTV
                        backBufferLength: 90,
                        maxBufferLength: 30,
                        maxMaxBufferLength: 60,
                        manifestLoadingTimeOut: 20000, // 20 seconds
                        manifestLoadingMaxRetry: 4,
                        manifestLoadingRetryDelay: 1000,
                        levelLoadingTimeOut: 20000,
                        levelLoadingMaxRetry: 4,
                        levelLoadingRetryDelay: 1000,
                        fragLoadingTimeOut: 30000, // 30 seconds for fragments
                        fragLoadingMaxRetry: 6, // More retries for fragments
                        fragLoadingRetryDelay: 1000,
                        xhrSetup: function (xhr: XMLHttpRequest, url: string) {
                            // Add custom headers if needed
                            xhr.withCredentials = false;
                        }
                    });

                    hlsRef.current = hls;

                    // Use proxy API route to bypass CORS
                    const proxyUrl = `/api/stream?url=${encodeURIComponent(channel.streamUrl)}`;
                    hls.loadSource(proxyUrl);
                    hls.attachMedia(video);

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        retryCountRef.current = 0;
                        if (!isMountedRef.current) return;
                        setIsLoading(false);
                        setRetryCount(0); // Reset retries on successful load
                        video.play().catch(e => {
                            console.error('Autoplay failed:', e);
                            if (isMountedRef.current) {
                                setIsPlaying(false);
                            }
                        });
                        setIsPlaying(true);
                        resetControlsTimeout();
                    });

                    hls.on(Hls.Events.ERROR, (event, data) => {
                        console.error('HLS error:', data.type, data.details, data);

                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    if (data.details === 'manifestLoadError') {
                                        // Check for 404/403 which means stream is dead/forbidden
                                        const responseCode = data.response?.code;
                                                                if (responseCode && responseCode >= 400) {
                                            console.error('Stream not found or forbidden:', responseCode);
                                            hls.destroy();
                                            if (isMountedRef.current) {
                                                setError(`Este canal no está disponible (Error ${responseCode}). Muchos canales gratuitos cambian frecuentemente. Intenta con otro canal.`);
                                                setIsLoading(false);
                                            }
                                            return;
                                        }
                                        // Manifest load error without response code (likely CORS or network issue)
                                        console.error('Manifest load error:', data);
                                        hls.destroy();
                                        if (isMountedRef.current) {
                                            setError('No se pudo cargar el stream. El canal puede estar offline o bloqueado por restricciones geográficas.');
                                            setIsLoading(false);
                                        }
                                        return;
                                    }

                                    if (data.details === 'levelLoadError') {
                                        // Level/segment loading error - retry with limit
                                        console.error('Level load error:', data);
                                        const newCount = retryCountRef.current + 1;
                                        retryCountRef.current = newCount;
                                        if (newCount <= MAX_RETRIES) {
                                            if (isMountedRef.current) {
                                                setRetryCount(newCount);
                                            }
                                            console.log(`Level load error, retrying (${newCount}/${MAX_RETRIES})...`);
                                            hls.startLoad();
                                        } else {
                                            console.error('Max retries reached for level loading.');
                                            hls.destroy();
                                            if (isMountedRef.current) {
                                                setRetryCount(newCount);
                                                setError('No se pudieron cargar los segmentos de video. El stream puede estar corrupto o bloqueado.');
                                                setIsLoading(false);
                                            }
                                        }
                                        return;
                                    }

                                    if (data.details === 'fragLoadError') {
                                        // Fragment loading error - this is common with IPTV streams
                                        console.warn('Fragment load error, attempting recovery...', data);
                                        // Don't destroy immediately, let HLS.js try to recover
                                        const newCount = retryCountRef.current + 1;
                                        retryCountRef.current = newCount;
                                        if (newCount <= MAX_RETRIES) {
                                            if (isMountedRef.current) {
                                                setRetryCount(newCount);
                                            }
                                            console.log(`Fragment error, retrying (${newCount}/${MAX_RETRIES})...`);
                                            setTimeout(() => {
                                                if (isMountedRef.current) {
                                                    hls.startLoad();
                                                }
                                            }, 1000);
                                        } else {
                                            console.error('Too many fragment errors, giving up.');
                                            hls.destroy();
                                            if (isMountedRef.current) {
                                                setRetryCount(newCount);
                                                setError('El stream es demasiado inestable. Intenta con otro canal o verifica tu conexión a internet.');
                                                setIsLoading(false);
                                            }
                                        }
                                        return;
                                    }

                                    // Handle generic network errors with retry limit
                                    {
                                        const newCount = retryCountRef.current + 1;
                                        retryCountRef.current = newCount;
                                        if (newCount <= MAX_RETRIES) {
                                            if (isMountedRef.current) {
                                                setRetryCount(newCount);
                                            }
                                            console.log(`Network error, retrying (${newCount}/${MAX_RETRIES})...`);
                                            hls.startLoad();
                                        } else {
                                            console.error('Max retries reached, giving up.');
                                            hls.destroy();
                                            if (isMountedRef.current) {
                                                setRetryCount(newCount);
                                                setError('Problemas de conexión persistentes. El canal puede estar temporalmente fuera de servicio.');
                                                setIsLoading(false);
                                            }
                                        }
                                    }
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    console.log('Fatal media error encountered, trying to recover...');
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    console.error('Fatal error, cannot recover');
                                    hls.destroy();
                                    if (isMountedRef.current) {
                                        setError('Stream no disponible. Intenta con otro canal.');
                                        setIsLoading(false);
                                    }
                                    break;
                            }
                        }
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    // Native HLS support (Safari)
                    video.src = channel.streamUrl;
                    video.addEventListener('loadedmetadata', () => {
                        if (!isMountedRef.current) return;
                        setIsLoading(false);
                        video.play();
                        setIsPlaying(true);
                        resetControlsTimeout();
                    });
                } else {
                    if (isMountedRef.current) {
                        setError('Tu navegador no soporta streaming HLS');
                        setIsLoading(false);
                    }
                }
            } catch (err) {
                console.error('Error loading stream:', err);
                if (isMountedRef.current) {
                    setError('Error al cargar el stream');
                    setIsLoading(false);
                }
            }
        };

        loadStream();

        return () => {
            isMountedRef.current = false;
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [channel.streamUrl]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
        resetControlsTimeout();
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
        resetControlsTimeout();
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
        resetControlsTimeout();
    };

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[100] bg-black flex flex-col h-[100dvh] overflow-hidden group"
        >
            {/* Header */}
            <div className={`absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                        >
                            <X size={24} />
                        </button>
                        <div className="flex items-center gap-3">
                            {channel.logo && (
                                <img
                                    src={channel.logo}
                                    alt={channel.name}
                                    className="w-10 h-10 object-contain rounded bg-white/10 p-1"
                                />
                            )}
                            <div>
                                <h2 className="text-white font-bold text-lg leading-tight">{channel.name}</h2>
                                <p className="text-white/70 text-xs font-medium">
                                    {channel.category} {channel.country && `• ${channel.country.toUpperCase()}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Player */}
            <div
                className="flex-1 flex items-center justify-center relative bg-black w-full h-full"
                onDoubleClick={toggleFullscreen}
                onClick={togglePlay}
            >
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    playsInline
                    onClick={(e) => e.stopPropagation()} // Prevent togglePlay on single click if needed, or allow it.
                />

                {/* Loading State */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-white font-medium">Cargando señal...</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                        <div className="text-center max-w-md p-8 bg-surface border border-surface-light rounded-2xl mx-4">
                            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h3 className="text-white text-xl font-bold mb-2">Señal no disponible</h3>
                            <p className="text-text-secondary mb-6">{error}</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/80 transition-colors font-medium w-full"
                            >
                                Regresar a la guía
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className={`absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                        >
                            {isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            )}
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                        >
                            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

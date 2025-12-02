'use client';

import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Square, LogOut, Volume2, VolumeX, Home, Film, Youtube, Maximize, Minimize, AlertTriangle, Settings, X } from 'lucide-react';
import { getWorkingStream, SOURCES } from '@/services/streamingSources';

interface StreamingPlayerProps {
    imdbId: string;
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    season?: number;
    episode?: number;
    title: string;
    posterPath?: string;
    onClose: () => void;
    initialLanguage?: 'es' | 'en';
    mode?: 'modal' | 'inline';
    className?: string;
    showCloseButton?: boolean;
}

export const StreamingPlayer = ({
    imdbId,
    tmdbId,
    mediaType,
    season = 1,
    episode = 1,
    title,
    posterPath,
    onClose,
    initialLanguage = 'es',
    mode = 'modal',
    className = '',
    showCloseButton = true
}: StreamingPlayerProps) => {
    const [stream, setStream] = useState<{ url: string; source: string } | null>(null);
    const [isLoadingEmbed, setIsLoadingEmbed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [failedSources, setFailedSources] = useState<string[]>([]);
    const [showSourceSelector, setShowSourceSelector] = useState(false);
    const [language, setLanguage] = useState<'es' | 'en'>(initialLanguage);
    const [manualSource, setManualSource] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Fetch Stream URL
    useEffect(() => {
        const fetchStream = async () => {
            setIsLoadingEmbed(true);
            try {
                // If a specific source is forced manually
                if (manualSource) {
                    const selectedSource = SOURCES.find(s => s.name === manualSource);
                    if (selectedSource) {
                        const url = mediaType === 'tv'
                            ? selectedSource.getEpisodeUrl(imdbId, season, episode, language)
                            : selectedSource.getMovieUrl(imdbId, language);

                        setStream({ url, source: `${selectedSource.name} (Manual)` });
                        setIsLoadingEmbed(false);
                        return;
                    }
                }

                // 1. Try Latino Sources First (if language is Spanish and not forced manual)
                if (language === 'es') {
                    const { getBestLatinoStream } = await import('@/services/latinoStream');
                    const latinoStream = await getBestLatinoStream(imdbId, mediaType !== 'tv', season, episode);

                    if (latinoStream) {
                        setStream(latinoStream);
                        setIsLoadingEmbed(false);
                        return;
                    }
                }

                // 2. Auto mode (find working stream - fallback to international)
                const result = await getWorkingStream(
                    imdbId,
                    language,
                    mediaType !== 'tv',
                    season,
                    episode,
                    tmdbId,
                    undefined, // isAnimeOverride
                    failedSources // excludedSources
                );
                setStream(result);

            } catch (error) {
                console.error('Error fetching stream:', error);
                setStream(null);
            } finally {
                setIsLoadingEmbed(false);
            }
        };

        fetchStream();
    }, [imdbId, mediaType, season, episode, language, manualSource, failedSources]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleReportBroken = () => {
        if (!stream) return;
        const sourceName = stream.source.split(' ')[0];
        setFailedSources(prev => [...prev, sourceName]);
    };

    const handleForceLatino = () => {
        const iframe = iframeRef.current;
        if (!iframe) return;

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
    };

    const baseClasses = mode === 'modal'
        ? "fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in zoom-in duration-300"
        : `relative w-full aspect-video bg-black flex flex-col rounded-xl overflow-hidden border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 ${className}`;

    return (
        <div ref={containerRef} className={baseClasses}>
            {/* Header / Close Button */}
            {mode === 'modal' && (
                <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                    <div className="pointer-events-auto">
                        <h2 className="text-white font-bold text-lg shadow-black drop-shadow-md">{title}</h2>
                        <p className="text-white/70 text-sm shadow-black drop-shadow-md">
                            {mediaType === 'tv' ? `T${season}:E${episode}` : 'Película'} • {language === 'es' ? 'Español' : 'Inglés'}
                        </p>
                    </div>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="pointer-events-auto p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors backdrop-blur-md"
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>
            )}

            {/* Inline Close Button */}
            {mode === 'inline' && showCloseButton && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors backdrop-blur-md"
                >
                    <X size={20} />
                </button>
            )}

            {/* Video Container */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group">
                {isLoadingEmbed ? (
                    <div className="flex flex-col items-center gap-4 text-white">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <p>Buscando mejor fuente...</p>
                    </div>
                ) : stream ? (
                    <div className="w-full h-full flex flex-col">
                        <div className="flex-1 relative">
                            <iframe
                                ref={iframeRef}
                                src={stream.url}
                                className="w-full h-full border-0"
                                allowFullScreen
                                allow="autoplay; fullscreen; picture-in-picture"
                                title={`${title} - Player`}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-center max-w-md text-white px-6">
                        <Film size={64} className="mx-auto mb-4 text-gray-500" />
                        <h3 className="text-xl font-bold mb-2">Contenido no disponible</h3>
                        <p className="text-gray-400 text-sm">
                            No se encontraron fuentes de streaming para este título.
                        </p>
                    </div>
                )}

                {/* Fullscreen Button */}
                <button
                    onClick={toggleFullscreen}
                    className="absolute bottom-24 right-4 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-all z-40 opacity-0 group-hover:opacity-100"
                >
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
            </div>

            {/* Control Bar */}
            <div className="h-20 bg-gray-900 border-t border-white/10 px-6 flex items-center justify-between z-50">
                <div className="flex items-center gap-4">
                    {/* Language Toggle */}
                    <button
                        onClick={() => setLanguage(prev => prev === 'en' ? 'es' : 'en')}
                        className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs font-bold text-white hover:bg-white/20 transition-colors uppercase tracking-wider"
                        title="Cambiar idioma de audio"
                    >
                        Audio: {language}
                    </button>

                    {/* Source Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSourceSelector(!showSourceSelector)}
                            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-2"
                            title="Seleccionar fuente manualmente"
                        >
                            <Settings size={20} />
                            <span className="text-xs hidden sm:inline">
                                {stream ? stream.source.split(' ')[0] : 'Fuente'}
                            </span>
                        </button>

                        {showSourceSelector && (
                            <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1a1d21] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                                <div className="p-2 border-b border-white/10">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fuente de Video</p>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    <button
                                        onClick={() => {
                                            setManualSource(null);
                                            setShowSourceSelector(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${!manualSource ? 'text-purple-400 font-bold' : 'text-white'}`}
                                    >
                                        Automático (Recomendado)
                                    </button>
                                    {SOURCES.map((src) => (
                                        <button
                                            key={src.name}
                                            onClick={() => {
                                                setManualSource(src.name);
                                                setShowSourceSelector(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${manualSource === src.name ? 'text-purple-400 font-bold' : 'text-white'}`}
                                        >
                                            {src.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Report Broken */}
                    {stream && (
                        <button
                            onClick={handleReportBroken}
                            className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-red-500/10 px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                            title="Reportar que este video no funciona"
                        >
                            <AlertTriangle size={12} />
                            <span className="hidden sm:inline">Reportar Error</span>
                        </button>
                    )}

                    {/* Magic Button */}
                    <button
                        onClick={handleForceLatino}
                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title="Intentar forzar audio Latino (Experimental)"
                    >
                        <AlertTriangle size={14} />
                        <span className="hidden sm:inline">Forzar Latino</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

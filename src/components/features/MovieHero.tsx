'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Play, Star, Clock, Calendar, Heart,
    Volume2, VolumeX, X, ArrowLeft, Users, Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getBackdropUrl } from '@/lib/tmdb/helpers';
import { useStore } from '@/lib/store/useStore';
import { saveFavoritesToSupabase } from '@/lib/supabase/favorites';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { MovieDetails, Video, Season, Movie } from '@/types/tmdb';
import VideoPlayer from './VideoPlayer';

interface MovieHeroProps {
    movie: MovieDetails;
    trailer?: Video;
    mediaType?: 'movie' | 'tv';
    seasons?: Season[];
}

// ── YouTube API helper ────────────────────────────────────────────────
declare global {
    interface Window {
        onYouTubeIframeAPIReady?: () => void;
        YT?: any;
    }
}

const YOUTUBE_API_URL = 'https://www.youtube.com/iframe_api';

function loadYouTubeAPI(): Promise<void> {
    return new Promise((resolve) => {
        if (window.YT?.Player) {
            resolve();
            return;
        }
        if (document.querySelector('script[src*="www.youtube.com/iframe_api"]')) {
            const original = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                original?.();
                resolve();
            };
            return;
        }
        const tag = document.createElement('script');
        tag.src = YOUTUBE_API_URL;
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode?.insertBefore(tag, firstScript);
        window.onYouTubeIframeAPIReady = () => resolve();
    });
}

export default function MovieHero({
    movie,
    trailer,
    mediaType = 'movie',
    seasons = [],
}: MovieHeroProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [showVideo, setShowVideo] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const router = useRouter();
    const playerRef = useRef<any>(null);
    const playerContainerId = useRef(`yt-player-${movie.id}`).current;

    // Seasons jugables (excluye especiales)
    const playableSeasons = useMemo(
        () => seasons.filter((s) => s.season_number > 0 && s.episode_count > 0),
        [seasons]
    );

    const [selectedSeason, setSelectedSeason] = useState<number>(
        () => playableSeasons[0]?.season_number ?? 1
    );
    const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

    // Sincronizar temporada seleccionada si cambian los datos
    useEffect(() => {
        if (mediaType !== 'tv' || playableSeasons.length === 0) return;
        if (!playableSeasons.some((s) => s.season_number === selectedSeason)) {
            setSelectedSeason(playableSeasons[0].season_number);
            setSelectedEpisode(1);
        }
    }, [mediaType, playableSeasons, selectedSeason]);

    const currentSeason = useMemo(
        () => playableSeasons.find((s) => s.season_number === selectedSeason),
        [playableSeasons, selectedSeason]
    );
    const episodeCount = currentSeason?.episode_count ?? 0;

    const backdropUrl = getBackdropUrl(movie.backdrop_path);

    // Formatear duración
    const totalMinutes = movie.runtime || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const runtime = totalMinutes > 0 ? `${hours}h ${minutes}m` : '';

    const releaseYear = movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : null;
    const voteAverage = movie.vote_average ? movie.vote_average.toFixed(1) : 'NR';

    // Favoritos
    const isFavorite = useStore((state) =>
        state.user.favorites.some((fav) => fav.id === movie.id)
    );
    const addFavorite = useStore((state) => state.addFavorite);
    const removeFavorite = useStore((state) => state.removeFavorite);

    const toggleFavorite = useCallback(async () => {
        if (favLoading) return;

        // Favoritos es una función solo para usuarios registrados.
        const { data: { user } } = await createClient().auth.getUser();
        if (!user) {
            toast.info('Inicia sesión para guardar favoritos');
            router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
            return;
        }

        setFavLoading(true);
        const currentFavorites = useStore.getState().user.favorites;
        const isCurrentlyFav = currentFavorites.some((fav) => fav.id === movie.id);
        const nextFavorites = isCurrentlyFav
            ? currentFavorites.filter((fav) => fav.id !== movie.id)
            : [...currentFavorites, movie as Movie];

        // Actualización optimista
        if (isCurrentlyFav) {
            removeFavorite(movie.id);
        } else {
            addFavorite(movie);
        }

        try {
            await saveFavoritesToSupabase(nextFavorites);
        } catch {
            // Rollback
            if (isCurrentlyFav) {
                addFavorite(movie);
            } else {
                removeFavorite(movie.id);
            }
        } finally {
            setFavLoading(false);
        }
    }, [movie, addFavorite, removeFavorite, favLoading]);

    // Reproducción del tráiler con API de YouTube
    const initPlayer = useCallback(async () => {
        if (!trailer) return;
        setShowVideo(true);
        await loadYouTubeAPI();
        if (playerRef.current) return; // ya inicializado

        playerRef.current = new window.YT.Player(playerContainerId, {
            videoId: trailer.key,
            events: {
                onReady: () => {
                    playerRef.current.mute();
                    playerRef.current.playVideo();
                    setIsMuted(true);
                },
            },
            playerVars: {
                autoplay: 1,
                controls: 0,
                showinfo: 0,
                rel: 0,
                loop: 1,
                playlist: trailer.key,
                mute: 1,
            },
        });
    }, [trailer, playerContainerId]);

    const toggleMute = useCallback(() => {
        if (playerRef.current) {
            if (isMuted) {
                playerRef.current.unMute();
                setIsMuted(false);
            } else {
                playerRef.current.mute();
                setIsMuted(true);
            }
        }
    }, [isMuted]);

    // Limpiar reproductor al desmontar
    useEffect(() => {
        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, []);

    // Autoplay opcional
    useEffect(() => {
        try {
            const saved = localStorage.getItem('filmify_preferences');
            if (!saved) return;
            const { autoplay } = JSON.parse(saved);
            if (autoplay && trailer && !showVideo) {
                initPlayer();
            }
        } catch { /* ignore */ }
    }, [trailer, showVideo, initPlayer]);

    return (
        <div className="relative w-full group overflow-visible">
            <div className="relative min-h-[70vh] md:min-h-[80vh] w-full flex items-center">
                {/* Fondo */}
                <div className="absolute inset-0 overflow-hidden">
                    {showVideo && trailer ? (
                        <div
                            id={playerContainerId}
                            className="absolute top-1/2 left-1/2 w-[115%] h-[115%] -translate-x-1/2 -translate-y-1/2"
                        />
                    ) : backdropUrl ? (
                        <Image
                            src={backdropUrl}
                            alt={`Fondo de ${movie.title}`}
                            fill
                            className="object-cover transition-all duration-700"
                            priority
                            sizes="100vw"
                        />
                    ) : (
                        <div className="w-full h-full bg-surface" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent" />
                </div>

                {/* Contenido */}
                <div className="container mx-auto px-4 md:px-8 relative z-10 pt-20 pb-12">
                    <div className="max-w-4xl space-y-6 md:space-y-8">
                        {/* Título */}
                        <div className="space-y-3 animate-fade-in-up">
                            <h1 className="text-4xl md:text-7xl font-black text-white leading-[1.1] tracking-tight drop-shadow-2xl">
                                {movie.title}
                            </h1>
                            {movie.tagline && (
                                <p className="text-lg md:text-2xl text-text-secondary font-medium">
                                    {movie.tagline}
                                </p>
                            )}
                        </div>

                        {/* Metadatos */}
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-base font-semibold animate-fade-in-up delay-100">
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                                <Star className="w-4 h-4 fill-primary" />
                                {voteAverage}
                            </span>
                            {runtime && (
                                <span className="flex items-center gap-1.5 text-text-secondary">
                                    <Clock className="w-4 h-4" />
                                    {runtime}
                                </span>
                            )}
                            {releaseYear && !isNaN(releaseYear) && (
                                <span className="flex items-center gap-1.5 text-text-secondary">
                                    <Calendar className="w-4 h-4" />
                                    {releaseYear}
                                </span>
                            )}
                        </div>

                        {/* Descripción */}
                        <p className="text-text-secondary text-lg md:text-xl leading-relaxed max-w-2xl line-clamp-3 md:line-clamp-none animate-fade-in-up delay-200">
                            {movie.overview}
                        </p>

                        {/* Selectores de serie */}
                        {mediaType === 'tv' && playableSeasons.length > 0 && (
                            <div className="flex flex-wrap items-center gap-4 animate-fade-in-up delay-200">
                                <div>
                                    <label htmlFor="season-select" className="text-xs text-text-muted uppercase tracking-widest font-bold">
                                        Temporada
                                    </label>
                                    <select
                                        id="season-select"
                                        value={selectedSeason}
                                        onChange={(e) => {
                                            setSelectedSeason(Number(e.target.value));
                                            setSelectedEpisode(1);
                                        }}
                                        className="mt-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm backdrop-blur-md hover:bg-white/10 focus:outline-none focus:border-primary/60 transition"
                                    >
                                        {playableSeasons.map((s) => (
                                            <option key={s.id} value={s.season_number} className="bg-surface text-white">
                                                {s.name || `Temporada ${s.season_number}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {episodeCount > 0 && (
                                    <div>
                                        <label htmlFor="episode-select" className="text-xs text-text-muted uppercase tracking-widest font-bold">
                                            Episodio
                                        </label>
                                        <select
                                            id="episode-select"
                                            value={selectedEpisode}
                                            onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                                            className="mt-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm backdrop-blur-md hover:bg-white/10 focus:outline-none focus:border-primary/60 transition"
                                        >
                                            {Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => (
                                                <option key={ep} value={ep} className="bg-surface text-white">
                                                    Episodio {ep}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Acciones */}
                        <div className="flex flex-wrap items-center gap-4 pt-4 animate-fade-in-up delay-300">
                            <button
                                onClick={() => setShowPlayer(true)}
                                className="px-10 py-4 rounded-full bg-primary text-black font-black text-base hover:bg-primary-hover hover:scale-105 transition-all duration-300 shadow-2xl shadow-primary/40 flex items-center gap-3"
                            >
                                <Play className="w-5 h-5 fill-black" />
                                {mediaType === 'tv'
                                    ? `VER T${selectedSeason} • E${selectedEpisode}`
                                    : 'VER AHORA'}
                            </button>

                            <WatchPartyButton
                                tmdbId={movie.id}
                                title={movie.title}
                                posterPath={movie.poster_path}
                                mediaType={mediaType}
                                season={selectedSeason}
                                episode={selectedEpisode}
                            />

                            {trailer && !showVideo && (
                                <button
                                    onClick={initPlayer}
                                    className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold text-base hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md"
                                >
                                    TRÁILER
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={toggleFavorite}
                                disabled={favLoading}
                                className={`px-4 py-3 rounded-full border transition-all duration-300 backdrop-blur-md flex items-center gap-2 ${
                                    isFavorite
                                        ? 'bg-red-500/15 border-red-500/40 text-red-200 hover:bg-red-500/20'
                                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                                } disabled:opacity-50 disabled:cursor-wait`}
                                aria-pressed={isFavorite}
                            >
                                {favLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                                )}
                                {isFavorite ? 'En Favoritos' : 'Añadir a Favoritos'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Controles inferiores */}
                <div className="absolute bottom-6 right-6 z-20 flex flex-wrap items-center gap-3 animate-fade-in">
                    {showVideo && (
                        <button
                            onClick={toggleMute}
                            className="p-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all duration-300 shadow-2xl"
                            aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    )}
                    <Link
                        href="/browse"
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-black/70 text-white hover:bg-white/10 border border-white/10 transition-all duration-300 shadow-2xl"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </Link>
                </div>
            </div>

            {/* Modal del reproductor */}
            {showPlayer && (
                <VideoPlayer
                    mediaId={movie.id}
                    mediaType={mediaType}
                    season={selectedSeason}
                    episode={selectedEpisode}
                    onClose={() => setShowPlayer(false)}
                    title={movie.title}
                />
            )}
        </div>
    );
}

// ── Watch Party Button con manejo de errores ────────────────────────

interface WatchPartyButtonProps {
    tmdbId: number;
    title: string;
    posterPath: string | null;
    mediaType: 'movie' | 'tv';
    season?: number;
    episode?: number;
}

function WatchPartyButton({ tmdbId, title, posterPath, mediaType, season, episode }: WatchPartyButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tmdb_id: tmdbId,
                    title,
                    poster_path: posterPath,
                    media_type: mediaType,
                    season: season ?? null,
                    episode: episode ?? null,
                    name: `Sala de ${title}`,
                    is_private: false,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al crear la sala');
            }
            router.push(`/watch-party/${data.party.room_code}`);
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleCreate}
                disabled={loading}
                className="px-6 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold text-base hover:bg-white/10 hover:border-primary/40 transition-all duration-300 backdrop-blur-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Users className="w-4 h-4" />
                )}
                {loading ? 'Creando...' : 'Watch Party'}
            </button>
            {error && (
                <p className="absolute top-full mt-2 left-0 text-sm text-red-400 bg-black/80 px-3 py-1 rounded-lg whitespace-nowrap">
                    {error}
                </p>
            )}
        </div>
    );
}
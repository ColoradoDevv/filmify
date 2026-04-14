'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Star, Clock, Calendar, Heart, Share2, Volume2, VolumeX, X } from 'lucide-react';
import { getBackdropUrl } from '@/lib/tmdb/helpers';
import type { MovieDetails, Video, Season } from '@/types/tmdb';
import VideoPlayer from './VideoPlayer';

interface MovieHeroProps {
    movie: MovieDetails;
    trailer?: Video;
    mediaType?: 'movie' | 'tv';
    seasons?: Season[];
}

export default function MovieHero({ movie, trailer, mediaType = 'movie', seasons = [] }: MovieHeroProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [showVideo, setShowVideo] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);

    // Hide "Specials" (season 0) — embed providers index against numbered
    // seasons and the user expects S1 as the entry point.
    const playableSeasons = useMemo(
        () => seasons.filter((s) => s.season_number > 0 && s.episode_count > 0),
        [seasons]
    );

    const [selectedSeason, setSelectedSeason] = useState<number>(
        () => playableSeasons[0]?.season_number ?? 1
    );
    const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

    // If the seasons prop arrives async / changes, snap selection back to a
    // valid value instead of leaving the user on a phantom season.
    useEffect(() => {
        if (mediaType !== 'tv') return;
        if (playableSeasons.length === 0) return;
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

    // Format runtime
    const totalMinutes = movie.runtime || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const runtime = totalMinutes > 0 ? `${hours}h ${minutes}m` : '';

    useEffect(() => {
        // Check auto-play preference
        const savedSettings = localStorage.getItem('filmify_preferences');
        if (!savedSettings) return;
        try {
            const { autoplay } = JSON.parse(savedSettings);
            if (autoplay && trailer) {
                setShowVideo(true);
                setIsMuted(false);
            }
        } catch {
            // Corrupt prefs — ignore.
        }
    }, [trailer]);

    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
    const voteAverage = movie.vote_average ? movie.vote_average.toFixed(1) : 'NR';

    return (
        <div className="relative w-full group overflow-visible">
            <div className="relative min-h-[90vh] md:min-h-[80vh] w-full flex items-center">
                {/* Background (Video or Image) */}
                <div className="absolute inset-0 overflow-hidden">
                    {showVideo && trailer ? (
                        <div className="relative w-full h-full">
                            <iframe
                                id="yt-player"
                                title={trailer.name}
                                src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailer.key}&mute=${isMuted ? 1 : 0}`}
                                className="absolute top-1/2 left-1/2 w-[115%] h-[115%] -translate-x-1/2 -translate-y-1/2 object-cover pointer-events-none scale-110"
                                allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        <>
                            {backdropUrl ? (
                                <Image
                                    src={backdropUrl}
                                    alt={movie.title}
                                    fill
                                    className="object-cover scale-105"
                                    priority
                                    sizes="100vw"
                                />
                            ) : (
                                <div className="w-full h-full bg-surface" />
                            )}
                        </>
                    )}

                    {/* Sophisticated Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent" />
                </div>

                {/* Content Container */}
                <div className="container mx-auto px-4 md:px-8 relative z-10 pt-20">
                    <div className="max-w-4xl space-y-6 md:space-y-8">
                        {/* Title and Tagline */}
                        <div className="space-y-3 animate-fade-in-up">
                            <h1 className="text-4xl md:text-7xl font-black text-white leading-[1.1] tracking-tight drop-shadow-2xl">
                                {movie.title}
                            </h1>
                            {movie.tagline && (
                                <p className="text-lg md:text-2xl text-text-secondary font-medium tracking-tight">
                                    {movie.tagline}
                                </p>
                            )}
                        </div>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm md:text-base font-semibold animate-fade-in-up delay-100">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                                <Star className="w-4 h-4 fill-primary" />
                                <span>{voteAverage}</span>
                            </div>
                            {runtime && (
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <Clock className="w-4 h-4" />
                                    <span>{runtime}</span>
                                </div>
                            )}
                            {releaseYear && !isNaN(releaseYear) && (
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <Calendar className="w-4 h-4" />
                                    <span>{releaseYear}</span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <p className="text-text-secondary text-lg md:text-xl leading-relaxed max-w-2xl line-clamp-3 md:line-clamp-none animate-fade-in-up delay-200">
                            {movie.overview}
                        </p>

                        {/* TV Season / Episode Selector */}
                        {mediaType === 'tv' && playableSeasons.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3 pt-2 animate-fade-in-up delay-200">
                                <div className="flex flex-col gap-1">
                                    <label
                                        htmlFor="season-select"
                                        className="text-[10px] text-text-muted font-black uppercase tracking-widest"
                                    >
                                        Temporada
                                    </label>
                                    <select
                                        id="season-select"
                                        value={selectedSeason}
                                        onChange={(e) => {
                                            setSelectedSeason(Number(e.target.value));
                                            setSelectedEpisode(1);
                                        }}
                                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm backdrop-blur-md hover:bg-white/10 hover:border-white/20 focus:outline-none focus:border-primary/60 transition-all cursor-pointer min-w-[10rem]"
                                    >
                                        {playableSeasons.map((s) => (
                                            <option key={s.id} value={s.season_number} className="bg-surface text-white">
                                                {s.name || `Temporada ${s.season_number}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {episodeCount > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <label
                                            htmlFor="episode-select"
                                            className="text-[10px] text-text-muted font-black uppercase tracking-widest"
                                        >
                                            Episodio
                                        </label>
                                        <select
                                            id="episode-select"
                                            value={selectedEpisode}
                                            onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                                            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm backdrop-blur-md hover:bg-white/10 hover:border-white/20 focus:outline-none focus:border-primary/60 transition-all cursor-pointer min-w-[8rem]"
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

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-4 pt-4 animate-fade-in-up delay-300">
                            <button
                                onClick={() => setShowPlayer(true)}
                                className="px-10 py-4 rounded-full bg-primary text-black font-black text-base hover:bg-primary-hover hover:scale-105 transition-all duration-300 shadow-2xl shadow-primary/40 flex items-center gap-3"
                            >
                                <Play className="w-5 h-5 fill-black" />
                                {mediaType === 'tv' ? `VER T${selectedSeason} • E${selectedEpisode}` : 'VER AHORA'}
                            </button>

                            {trailer && !showVideo && (
                                <button
                                    onClick={() => {
                                        setShowVideo(true);
                                        setIsMuted(false);
                                    }}
                                    className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold text-base hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md"
                                >
                                    TRÁILER
                                </button>
                            )}

                            <div className="flex items-center gap-2">
                                <button className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md group">
                                    <Heart className="w-5 h-5 group-hover:scale-110 group-hover:fill-accent group-hover:text-accent transition-all" />
                                </button>
                                <button className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md group">
                                    <Share2 className="w-5 h-5 group-hover:scale-110 transition-all" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Controls Bar */}
                <div className="absolute bottom-8 right-8 z-20 flex items-center gap-4 animate-fade-in">
                    {showVideo && (
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all duration-300 shadow-2xl"
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    )}
                    <Link
                        href="/browse"
                        className="p-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all duration-300 shadow-2xl group"
                    >
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    </Link>
                </div>
            </div>

            {/* Video Player Modal */}
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

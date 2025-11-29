'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Star, Clock, Calendar, Heart, Share2, ChevronLeft, Volume2, VolumeX, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getBackdropUrl, getPosterUrl } from '@/lib/tmdb/service';
import type { MovieDetails, Video } from '@/types/tmdb';

interface MovieHeroProps {
    movie: MovieDetails;
    trailer?: Video;
}

export default function MovieHero({ movie, trailer }: MovieHeroProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [showVideo, setShowVideo] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleCreateParty = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data, error } = await supabase
            .from('parties')
            .insert({
                tmdb_id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                host_id: user.id,
                status: 'waiting'
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating party:', JSON.stringify(error, null, 2));
            return;
        }

        router.push(`/party/${data.id}`);
    };

    const backdropUrl = getBackdropUrl(movie.backdrop_path);
    const posterUrl = getPosterUrl(movie.poster_path);

    console.log('🎬 MovieHero Debug:', {
        movieId: movie.id,
        title: movie.title,
        hasTrailer: !!trailer,
        trailerKey: trailer?.key,
        showVideo
    });

    // Format runtime
    const totalMinutes = movie.runtime || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const runtime = totalMinutes > 0 ? `${hours}h ${minutes}m` : '';

    useEffect(() => {
        // Check auto-play preference
        const savedSettings = localStorage.getItem('filmify_preferences');
        if (savedSettings) {
            const { autoplay } = JSON.parse(savedSettings);
            if (autoplay && trailer) {
                setShowVideo(true);
                setIsPlaying(true);
            }
        }
    }, [trailer]);

    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
    const voteAverage = movie.vote_average ? movie.vote_average.toFixed(1) : 'NR';

    return (
        <div className="relative h-[70vh] w-full group">
            {/* Background (Video or Image) */}
            <div className="absolute inset-0 overflow-hidden">
                {showVideo && trailer ? (
                    <div className="relative w-full h-full">
                        <iframe
                            id="yt-player"
                            title={trailer.name}
                            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailer.key}&mute=${isMuted ? 1 : 0}`}
                            className="absolute top-1/2 left-1/2 w-[120%] h-[120%] -translate-x-1/2 -translate-y-1/2 object-cover pointer-events-none"
                            allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                        <div className="absolute inset-0 bg-black/20" />
                    </div>
                ) : (
                    <>
                        {backdropUrl ? (
                            <Image
                                src={backdropUrl}
                                alt={movie.title}
                                fill
                                className="object-cover"
                                priority
                                sizes="100vw"
                            />
                        ) : (
                            <div className="w-full h-full bg-surface-light" />
                        )}
                    </>
                )}

                {/* Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex items-end">
                <div className="container mx-auto px-4 pb-12">
                    <Link
                        href="/browse"
                        className="absolute top-24 left-4 p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white shadow-lg hover:bg-primary hover:border-primary hover:scale-110 transition-all duration-300 z-20 group/back"
                    >
                        <ChevronLeft className="w-6 h-6 group-hover/back:-translate-x-1 transition-transform" />
                    </Link>

                    {/* Video Controls (Only if video is showing) */}
                    {showVideo && (
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="absolute top-24 right-4 p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-colors z-20"
                        >
                            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                        </button>
                    )}

                    <div className="flex flex-col md:flex-row gap-8 items-end relative z-10">
                        {/* Poster */}
                        <div className="hidden md:block relative w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
                            {posterUrl && (
                                <Image
                                    src={posterUrl}
                                    alt={movie.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 256px"
                                    priority
                                />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                                    {movie.title}
                                </h1>
                                {movie.tagline && (
                                    <p className="text-xl text-gray-300 italic font-light">
                                        "{movie.tagline}"
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-gray-300">
                                <div className="flex items-center gap-1 text-yellow-400">
                                    <Star className="w-5 h-5 fill-current" />
                                    <span className="font-bold text-white">{voteAverage}</span>
                                </div>
                                {runtime && (
                                    <>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{runtime}</span>
                                        </div>
                                    </>
                                )}
                                {releaseYear && !isNaN(releaseYear) && (
                                    <>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>{releaseYear}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {movie.genres.map((genre) => (
                                    <span
                                        key={genre.id}
                                        className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-sm text-white"
                                    >
                                        {genre.name}
                                    </span>
                                ))}
                            </div>

                            <p className="text-gray-300 text-lg leading-relaxed max-w-3xl line-clamp-4 md:line-clamp-none">
                                {movie.overview}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 pt-4">
                                {trailer && !showVideo && (
                                    <button
                                        onClick={() => {
                                            setShowVideo(true);
                                            setIsPlaying(true);
                                            setIsMuted(false);
                                        }}
                                        className="px-8 py-3 rounded-full bg-primary text-white font-bold flex items-center gap-2 hover:bg-primary/90 transition-transform hover:scale-105 shadow-lg shadow-primary/25"
                                    >
                                        <Play className="w-5 h-5 fill-current" />
                                        Ver Tráiler
                                    </button>
                                )}
                                {showVideo && (
                                    <button
                                        onClick={() => setShowVideo(false)}
                                        className="px-8 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white font-bold flex items-center gap-2 hover:bg-white/20 transition-colors"
                                    >
                                        Detener
                                    </button>
                                )}
                                <button
                                    onClick={handleCreateParty}
                                    className="px-6 py-3 rounded-full bg-purple-600 text-white font-bold flex items-center gap-2 hover:bg-purple-700 transition-transform hover:scale-105 shadow-lg shadow-purple-600/25"
                                >
                                    <Users className="w-5 h-5" />
                                    Watch Party
                                </button>
                                <button className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-colors">
                                    <Heart className="w-6 h-6" />
                                </button>
                                <button className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-colors">
                                    <Share2 className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

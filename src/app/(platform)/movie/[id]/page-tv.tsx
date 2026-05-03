'use client';

import { useState } from 'react';
import { getBackdropUrl, getPosterUrl, getProfileUrl } from '@/lib/tmdb/service';
import Image from 'next/image';
import { Play, Star, Clock, Calendar, Heart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import HorizontalRow from '@/components/features/HorizontalRow';
import VideoPlayer from '@/components/features/VideoPlayer';

interface MovieDetailsPageTVProps {
    movie: any;
    trailer: any;
    cast: any[];
    certification: string;
    director: any;
}

export default function MovieDetailsPageTV({ movie, trailer, cast, certification, director }: MovieDetailsPageTVProps) {
    const [showPlayer, setShowPlayer] = useState(false);

    const backdropUrl = getBackdropUrl(movie.backdrop_path);
    const posterUrl = getPosterUrl(movie.poster_path);

    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;
    const runtime = `${hours}h ${minutes}m`;
    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';

    return (
        <div className="min-h-screen relative overflow-x-hidden">
            {/* Video Player */}
            {showPlayer && (
                <VideoPlayer
                    mediaId={movie.id}
                    mediaType="movie"
                    title={movie.title}
                    onClose={() => setShowPlayer(false)}
                />
            )}

            {/* Full Screen Backdrop */}
            <div className="absolute inset-0 w-full h-[80vh]">
                {backdropUrl && (
                    <Image
                        src={backdropUrl}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        priority
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
            </div>

            <div className="relative z-10 pt-12 px-12 pb-20">
                {/* Back Button */}
                <Link
                    href="/browse"
                    className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 tv-focusable px-4 py-2 rounded-lg focus:bg-white/10 transition-colors"
                    tabIndex={0}
                    data-focusable="true"
                >
                    <ArrowLeft className="w-6 h-6" />
                    <span className="text-lg">Volver</span>
                </Link>

                <div className="flex gap-12 items-start">
                    {/* Poster */}
                    <div className="w-[300px] flex-shrink-0 rounded-xl overflow-hidden shadow-2xl border border-white/10 hidden lg:block">
                        {posterUrl && (
                            <Image
                                src={posterUrl}
                                alt={movie.title}
                                width={300}
                                height={450}
                                className="object-cover"
                            />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 max-w-4xl space-y-6">
                        <h1 className="text-6xl font-bold text-white leading-tight">
                            {movie.title}
                        </h1>

                        <div className="flex items-center gap-6 text-lg text-text-secondary">
                            {certification && (
                                <span className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white font-bold">
                                    {certification}
                                </span>
                            )}
                            <span className="flex items-center gap-2 text-yellow-400">
                                <Star className="w-5 h-5 fill-current" />
                                <span className="font-bold text-white">{movie.vote_average.toFixed(1)}</span>
                            </span>
                            <span className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                {releaseYear}
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                {runtime}
                            </span>
                            {director && (
                                <span className="text-white/70">
                                    Dir. <span className="text-white">{director.name}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {movie.genres?.map((g: any) => (
                                <span key={g.id} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                                    {g.name}
                                </span>
                            ))}
                        </div>

                        <p className="text-xl text-gray-300 leading-relaxed max-w-3xl line-clamp-4">
                            {movie.overview}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-4 pt-4">
                            <button
                                onClick={() => setShowPlayer(true)}
                                tabIndex={0}
                                data-focusable="true"
                                className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-xl font-bold text-xl hover:bg-primary-hover transition-all tv-focusable focus:scale-105 focus:shadow-[0_0_0_4px_rgba(0,194,255,0.4)]"
                            >
                                <Play className="w-6 h-6 fill-current" />
                                Reproducir
                            </button>

                            {trailer && (
                                <a
                                    href={`https://www.youtube.com/watch?v=${trailer.key}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    tabIndex={0}
                                    data-focusable="true"
                                    className="flex items-center gap-3 px-8 py-4 bg-white/10 text-white rounded-xl font-bold text-xl hover:bg-white/20 transition-all tv-focusable focus:scale-105 border border-white/10"
                                >
                                    <Play className="w-6 h-6" />
                                    Trailer
                                </a>
                            )}

                            <button
                                tabIndex={0}
                                data-focusable="true"
                                className="p-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all tv-focusable focus:scale-105 border border-white/10"
                                aria-label="Agregar a favoritos"
                            >
                                <Heart className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cast Row */}
                {cast.length > 0 && (
                    <div className="mt-16">
                        <h2 className="text-2xl font-bold text-white mb-6">Reparto</h2>
                        <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide px-2 -mx-2">
                            {cast.map((person) => (
                                <div key={person.id} className="w-40 flex-shrink-0 tv-focusable rounded-xl focus:scale-105 transition-transform" tabIndex={0} data-focusable="true">
                                    <div className="aspect-[2/3] relative rounded-xl overflow-hidden bg-surface-light mb-3">
                                        {person.profile_path ? (
                                            <Image
                                                src={getProfileUrl(person.profile_path) || ''}
                                                alt={person.name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                Sin Imagen
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-white font-medium truncate">{person.name}</p>
                                    <p className="text-sm text-gray-400 truncate">{person.character}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                {movie.recommendations?.results?.length > 0 && (
                    <div className="mt-8">
                        <HorizontalRow
                            title="Recomendaciones"
                            items={movie.recommendations.results}
                            mediaType="movie"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { getBackdropUrl, getPosterUrl, getProfileUrl } from '@/lib/tmdb/service';
import Image from 'next/image';
import { Play, Star, Calendar, Heart, ArrowLeft, Layers } from 'lucide-react';
import Link from 'next/link';
import HorizontalRow from '@/components/features/HorizontalRow';
import VideoPlayer from '@/components/features/VideoPlayer';

interface TVDetailsPageTVProps {
    tvShow: any;
    trailer: any;
    cast: any[];
    creator: any;
}

export default function TVDetailsPageTV({ tvShow, trailer, cast, creator }: TVDetailsPageTVProps) {
    const [showPlayer, setShowPlayer] = useState(false);
    const [season, setSeason] = useState(1);
    const [episode, setEpisode] = useState(1);

    const backdropUrl = getBackdropUrl(tvShow.backdrop_path);
    const posterUrl = getPosterUrl(tvShow.poster_path);
    const releaseYear = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : '';

    const handlePlay = (s = 1, e = 1) => {
        setSeason(s);
        setEpisode(e);
        setShowPlayer(true);
    };

    return (
        <div className="min-h-screen relative overflow-x-hidden">
            {/* Video Player */}
            {showPlayer && (
                <VideoPlayer
                    mediaId={tvShow.id}
                    mediaType="tv"
                    season={season}
                    episode={episode}
                    title={tvShow.name}
                    onClose={() => setShowPlayer(false)}
                />
            )}

            {/* Full Screen Backdrop */}
            <div className="absolute inset-0 w-full h-[80vh]">
                {backdropUrl && (
                    <Image
                        src={backdropUrl}
                        alt={tvShow.name}
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
                    href="/browse?category=tv"
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
                                alt={tvShow.name}
                                width={300}
                                height={450}
                                className="object-cover"
                            />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 max-w-4xl space-y-6">
                        <h1 className="text-6xl font-bold text-white leading-tight">
                            {tvShow.name}
                        </h1>

                        <div className="flex items-center gap-6 text-lg text-text-secondary">
                            <span className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white font-bold">
                                {tvShow.status}
                            </span>
                            <span className="flex items-center gap-2 text-yellow-400">
                                <Star className="w-5 h-5 fill-current" />
                                <span className="font-bold text-white">{tvShow.vote_average.toFixed(1)}</span>
                            </span>
                            <span className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                {releaseYear}
                            </span>
                            <span className="flex items-center gap-2">
                                <Layers className="w-5 h-5" />
                                {tvShow.number_of_seasons} Temporadas
                            </span>
                            {creator && (
                                <span className="text-white/70">
                                    Creador <span className="text-white">{creator.name}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {tvShow.genres?.map((g: any) => (
                                <span key={g.id} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                                    {g.name}
                                </span>
                            ))}
                        </div>

                        <p className="text-xl text-gray-300 leading-relaxed max-w-3xl line-clamp-4">
                            {tvShow.overview}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-4 pt-4">
                            <button
                                onClick={() => handlePlay(1, 1)}
                                tabIndex={0}
                                data-focusable="true"
                                className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-xl font-bold text-xl hover:bg-primary-hover transition-all tv-focusable focus:scale-105 focus:shadow-[0_0_0_4px_rgba(0,194,255,0.4)]"
                            >
                                <Play className="w-6 h-6 fill-current" />
                                Ver Ahora
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

                        {/* Season/Episode selector — quick access for TV */}
                        {tvShow.number_of_seasons > 0 && (
                            <div className="pt-2">
                                <p className="text-sm text-white/40 mb-3">Ir a episodio:</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white/50 text-sm">T</span>
                                        <select
                                            value={season}
                                            onChange={(e) => setSeason(Number(e.target.value))}
                                            className="bg-surface-container border border-outline-variant text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:border-primary tv-focusable"
                                            tabIndex={0}
                                        >
                                            {Array.from({ length: tvShow.number_of_seasons }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white/50 text-sm">E</span>
                                        <select
                                            value={episode}
                                            onChange={(e) => setEpisode(Number(e.target.value))}
                                            className="bg-surface-container border border-outline-variant text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:border-primary tv-focusable"
                                            tabIndex={0}
                                        >
                                            {Array.from({ length: 30 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => handlePlay(season, episode)}
                                        tabIndex={0}
                                        data-focusable="true"
                                        className="px-5 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg font-medium hover:bg-primary/30 transition-colors tv-focusable focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <Play className="w-4 h-4 fill-current inline mr-1" />
                                        Reproducir
                                    </button>
                                </div>
                            </div>
                        )}
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
                {tvShow.recommendations?.results?.length > 0 && (
                    <div className="mt-8">
                        <HorizontalRow
                            title="Series Similares"
                            items={tvShow.recommendations.results}
                            mediaType="tv"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

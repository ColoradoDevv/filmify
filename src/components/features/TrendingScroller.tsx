'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Movie } from '@/types/tmdb';
import { getPosterUrl } from '@/lib/tmdb/service';
import { Star } from 'lucide-react';

interface TrendingScrollerProps {
    movies: Movie[];
}

export default function TrendingScroller({ movies }: TrendingScrollerProps) {
    // Duplicate movies array for seamless infinite scroll
    const duplicatedMovies = [...movies, ...movies];

    return (
        <section className="py-16 bg-gradient-to-b from-background via-surface/20 to-background relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-4xl font-bold mb-2">
                            En <span className="text-gradient-premium">Tendencia</span> Hoy
                        </h2>
                        <p className="text-text-secondary">Las películas más populares del momento</p>
                    </div>
                    <Link
                        href="/browse"
                        className="text-primary hover:text-accent transition-colors font-semibold flex items-center gap-2 group"
                    >
                        Ver todas
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                </div>
            </div>

            <div className="relative">
                {/* Enhanced gradient overlays for fade effect */}
                <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

                {/* Scrolling container */}
                <div className="flex gap-6 animate-scroll hover:pause">
                    {duplicatedMovies.map((movie, index) => {
                        const posterUrl = getPosterUrl(movie.poster_path);
                        const rating = movie.vote_average.toFixed(1);
                        const year = new Date(movie.release_date).getFullYear();

                        return (
                            <Link
                                key={`${movie.id}-${index}`}
                                href={`/movie/${movie.id}`}
                                className="flex-shrink-0 group relative"
                            >
                                <div className="relative w-48 h-72 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:shadow-primary/30 group-hover:z-20">
                                    {/* Movie Poster */}
                                    {posterUrl ? (
                                        <Image
                                            src={posterUrl}
                                            alt={movie.title}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            sizes="192px"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-surface to-surface-light flex items-center justify-center">
                                            <span className="text-text-muted text-sm text-center px-4 font-medium">
                                                {movie.title}
                                            </span>
                                        </div>
                                    )}

                                    {/* Rating Badge */}
                                    <div className="absolute top-3 right-3 glass-effect px-2 py-1 rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                        <span className="text-xs font-bold text-white">{rating}</span>
                                    </div>

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

                                    {/* Movie Info Overlay */}
                                    <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                        <h3 className="text-sm font-bold line-clamp-2 mb-2 text-white drop-shadow-lg">
                                            {movie.title}
                                        </h3>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-text-secondary font-medium">{year}</span>
                                            <div className="flex items-center gap-1 glass-effect px-2 py-0.5 rounded">
                                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                <span className="text-white font-semibold">{rating}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shimmer effect on hover */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

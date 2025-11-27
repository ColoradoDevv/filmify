'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Movie } from '@/types/tmdb';
import { getPosterUrl } from '@/lib/tmdb/service';

interface TrendingScrollerProps {
    movies: Movie[];
}

export default function TrendingScroller({ movies }: TrendingScrollerProps) {
    // Duplicate movies array for seamless infinite scroll
    const duplicatedMovies = [...movies, ...movies];

    return (
        <section className="py-12 bg-background overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                <h2 className="text-3xl font-bold">
                    En <span className="text-gradient">Tendencia</span> Hoy
                </h2>
            </div>

            <div className="relative">
                {/* Gradient overlays for fade effect */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                {/* Scrolling container */}
                <div className="flex gap-4 animate-scroll hover:pause">
                    {duplicatedMovies.map((movie, index) => {
                        const posterUrl = getPosterUrl(movie.poster_path);

                        return (
                            <Link
                                key={`${movie.id}-${index}`}
                                href={`/movie/${movie.id}`}
                                className="flex-shrink-0 group"
                            >
                                <div className="relative w-40 h-60 rounded-lg overflow-hidden shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-primary/20">
                                    {posterUrl ? (
                                        <Image
                                            src={posterUrl}
                                            alt={movie.title}
                                            fill
                                            className="object-cover"
                                            sizes="160px"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-surface flex items-center justify-center">
                                            <span className="text-text-muted text-sm text-center px-4">
                                                {movie.title}
                                            </span>
                                        </div>
                                    )}

                                    {/* Hover overlay with movie info */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                        <h3 className="text-sm font-semibold line-clamp-2 mb-1">
                                            {movie.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                                            <span className="flex items-center gap-1">
                                                ⭐ {movie.vote_average.toFixed(1)}
                                            </span>
                                            <span>
                                                {new Date(movie.release_date).getFullYear()}
                                            </span>
                                        </div>
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

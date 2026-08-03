'use client';

import Image from 'next/image';
import type { Movie } from '@/types/tmdb';
import { getPosterUrl } from '@/lib/tmdb/helpers';
import { Star } from 'lucide-react';
import Link from 'next/link';

interface TrendingScrollerProps {
    movies: Movie[];
}

/**
 * PUBLIC: every card links straight to the movie page — no login required.
 */
export default function TrendingScroller({ movies }: TrendingScrollerProps) {
    // Duplicate movies array for seamless infinite scroll
    const duplicatedMovies = [...movies, ...movies];

    return (
        <section className="py-10 relative overflow-hidden">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/10 to-background" />

            {/* Section Header */}
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
                <div className="flex items-center justify-between gap-6">
                    <div className="text-left">
                        <div className="inline-flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                                Tendencias
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white">
                            Lo Más <span className="text-gradient-premium">Popular</span>
                        </h2>
                    </div>
                    <Link
                        href="/browse"
                        className="hidden md:flex items-center justify-center gap-2 px-5 py-2.5 bg-surface/50 hover:bg-surface border border-surface-light/50 hover:border-primary/50 rounded-xl font-semibold transition-all duration-300 group text-white text-sm"
                    >
                        Explorar Todo
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                </div>
            </div>

            {/* Scrolling Movies Container */}
            <div className="relative overflow-hidden group/scroller">
                {/* Gradient fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                {/* Movie cards scroll — compact Cuevana-style cards */}
                <div className="flex gap-3 animate-scroll py-3 group-hover/scroller:[animation-play-state:paused] will-change-transform">
                    {duplicatedMovies.map((movie, index) => {
                        const posterUrl = getPosterUrl(movie.poster_path);
                        const rating = movie.vote_average.toFixed(1);
                        const year = new Date(movie.release_date).getFullYear();

                        return (
                            <Link
                                key={`${movie.id}-${index}`}
                                href={`/movie/${movie.id}`}
                                className="flex-shrink-0 group relative cursor-pointer"
                            >
                                {/* Movie Card — compact */}
                                <div className="relative w-36 h-56 rounded-xl overflow-hidden bg-surface border border-surface-light/30 transition-all duration-300 group-hover:scale-105 group-hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/20">
                                    {/* Poster Image */}
                                    {posterUrl ? (
                                        <Image
                                            src={posterUrl}
                                            alt={movie.title}
                                            fill
                                            className="object-cover"
                                            sizes="144px"
                                            quality={85}
                                            priority={index < 6}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-surface to-surface-light flex items-center justify-center">
                                            <span className="text-text-muted text-xs text-center px-3 font-medium">
                                                {movie.title}
                                            </span>
                                        </div>
                                    )}

                                    {/* Rating chip */}
                                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-white/10">
                                        <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                                        <span className="text-[11px] font-bold text-white">{rating}</span>
                                    </div>

                                    {/* Bottom overlay with title */}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-8 pb-2 px-2">
                                        <h3 className="text-xs font-bold line-clamp-2 text-white group-hover:text-primary transition-colors leading-tight">
                                            {movie.title}
                                        </h3>
                                        <span className="text-[10px] text-text-secondary font-medium">
                                            {Number.isNaN(year) ? '' : year}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Mobile "Ver todo" button */}
            <div className="md:hidden relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                <Link
                    href="/browse"
                    className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-surface/50 hover:bg-surface border border-surface-light/50 hover:border-primary/50 rounded-xl font-semibold transition-all duration-300 text-white"
                >
                    Explorar Todo
                    <span>→</span>
                </Link>
            </div>
        </section>
    );
}

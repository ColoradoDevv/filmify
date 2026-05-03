'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Movie } from '@/types/tmdb';
import { getPosterUrl } from '@/lib/tmdb/helpers';
import { Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface TrendingScrollerProps {
    movies: Movie[];
}

export default function TrendingScroller({ movies }: TrendingScrollerProps) {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            setIsLoggedIn(!!data.user);
        });
    }, []);

    const handleMovieClick = (e: React.MouseEvent, movieId: number) => {
        e.preventDefault();
        if (isLoggedIn) {
            router.push(`/movie/${movieId}`);
        } else {
            router.push(`/login?next=/movie/${movieId}`);
        }
    };

    // Duplicate movies array for seamless infinite scroll
    const duplicatedMovies = [...movies, ...movies];

    return (
        <section className="py-20 relative overflow-hidden">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/10 to-background" />

            {/* Section Header */}
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-3">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                                Tendencias
                            </span>
                        </div>
                        <h2 className="text-5xl font-bold mb-2 text-white">
                            Lo Más <span className="text-gradient-premium">Popular</span>
                        </h2>
                        <p className="text-gray-300 text-lg">
                            Las películas que todos están viendo ahora
                        </p>
                    </div>
                    <Link
                        href="/login?next=/browse"
                        className="hidden md:flex items-center gap-2 px-6 py-3 bg-surface/50 hover:bg-surface border border-surface-light/50 hover:border-primary/50 rounded-xl font-semibold transition-all duration-300 group text-white"
                    >
                        Explorar Todo
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                </div>
            </div>

            {/* Scrolling Movies Container */}
            <div className="relative">
                {/* Gradient fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                {/* Movie cards scroll */}
                <div className="flex gap-6 animate-scroll hover:pause">
                    {duplicatedMovies.map((movie, index) => {
                        const posterUrl = getPosterUrl(movie.poster_path);
                        const rating = movie.vote_average.toFixed(1);
                        const year = new Date(movie.release_date).getFullYear();

                        return (
                            <a
                                key={`${movie.id}-${index}`}
                                href={isLoggedIn ? `/movie/${movie.id}` : `/login?next=/movie/${movie.id}`}
                                onClick={(e) => handleMovieClick(e, movie.id)}
                                className="flex-shrink-0 group relative cursor-pointer"
                            >
                                {/* Movie Card */}
                                <div className="relative w-52 h-80 rounded-2xl overflow-hidden bg-surface border border-surface-light/30 transition-all duration-300 group-hover:scale-105 group-hover:border-primary/50 group-hover:shadow-2xl group-hover:shadow-primary/20">
                                    {/* Poster Image */}
                                    {posterUrl ? (
                                        <Image
                                            src={posterUrl}
                                            alt={movie.title}
                                            fill
                                            className="object-cover"
                                            sizes="208px"
                                            quality={95}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-surface to-surface-light flex items-center justify-center">
                                            <span className="text-text-muted text-sm text-center px-4 font-medium">
                                                {movie.title}
                                            </span>
                                        </div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    {/* Movie Info */}
                                    <div className="absolute inset-x-0 bottom-0 p-5 transition-transform duration-300">
                                        <h3 className="text-base font-bold line-clamp-2 mb-3 text-white group-hover:text-primary transition-colors">
                                            {movie.title}
                                        </h3>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-text-secondary font-medium">
                                                {year}
                                            </span>
                                            <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-surface-light/30">
                                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                                <span className="text-sm font-bold text-white">{rating}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shine effect */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>
            </div>

            {/* Mobile "Ver todo" button */}
            <div className="md:hidden relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <Link
                    href="/login?next=/browse"
                    className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-surface/50 hover:bg-surface border border-surface-light/50 hover:border-primary/50 rounded-xl font-semibold transition-all duration-300 text-white"
                >
                    Explorar Todo
                    <span>→</span>
                </Link>
            </div>
        </section>
    );
}

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getTrending } from '@/lib/tmdb/client';
import { getBackdropUrl } from '@/lib/tmdb/helpers';
import type { Movie } from '@/types/tmdb';
import { Loader2 } from 'lucide-react';

export default function AuthBackground() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [isFirstAuthVisit, setIsFirstAuthVisit] = useState(true);

    // Check if this is the first visit to auth pages in this session
    useEffect(() => {
        const hasVisitedAuth = sessionStorage.getItem('hasVisitedAuth');
        if (hasVisitedAuth === 'true') {
            setIsFirstAuthVisit(false);
        } else {
            sessionStorage.setItem('hasVisitedAuth', 'true');
        }
    }, []);

    // Fetch movies on mount
    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const data = await getTrending('movie', 'week');
                // Get 2 random movies for the split background
                const shuffled = [...(data.results as Movie[])].sort(() => 0.5 - Math.random());
                setMovies(shuffled.slice(0, 2));
                setLoading(false);
            } catch (error) {
                console.error('Error fetching movies:', error);
                setLoading(false);
            }
        };

        fetchMovies();
    }, []);

    // Track when both images have loaded (only on first visit)
    useEffect(() => {
        if (!loading && movies.length >= 2) {
            if (isFirstAuthVisit) {
                // Small delay to ensure images are actually rendered
                const timer = setTimeout(() => {
                    setImagesLoaded(true);
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                // If not first visit, show images immediately
                setImagesLoaded(true);
            }
        }
    }, [loading, movies, isFirstAuthVisit]);

    const leftBackdrop = getBackdropUrl(movies[0]?.backdrop_path);
    const rightBackdrop = getBackdropUrl(movies[1]?.backdrop_path);

    // Only show loader on first auth visit
    const showLoader = isFirstAuthVisit && (loading || !imagesLoaded);

    return (
        <>
            {/* Loading Screen - Only on first visit */}
            <div
                className={`absolute inset-0 bg-background flex items-center justify-center z-50 transition-opacity duration-500 ${showLoader ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            >
                <div className="flex flex-col items-center gap-6">
                    {/* Logo */}
                    <img
                        src="/logo-full.svg"
                        alt="FilmiFy"
                        className="h-16 w-auto animate-pulse"
                    />
                    {/* Spinner */}
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </div>

            {/* Background Images */}
            <div className={`absolute inset-0 transition-opacity duration-500 ${showLoader ? 'opacity-0' : 'opacity-100'
                }`}>
                {/* Left side image */}
                {leftBackdrop && (
                    <div className="absolute inset-y-0 left-0 right-1/2">
                        <Image
                            src={leftBackdrop}
                            alt={movies[0]?.title || 'Movie backdrop'}
                            fill
                            className="object-cover"
                            quality={100}
                            unoptimized
                            priority
                        />
                        {/* Gradient overlay - fade to center */}
                        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-background/60 to-background" />
                    </div>
                )}

                {/* Right side image */}
                {rightBackdrop && (
                    <div className="absolute inset-y-0 right-0 left-1/2">
                        <Image
                            src={rightBackdrop}
                            alt={movies[1]?.title || 'Movie backdrop'}
                            fill
                            className="object-cover"
                            quality={100}
                            unoptimized
                            priority
                        />
                        {/* Gradient overlay - fade to center */}
                        <div className="absolute inset-0 bg-gradient-to-l from-background/20 via-background/60 to-background" />
                    </div>
                )}

                {/* Center overlay for better card visibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/40" />

                {/* Additional center fade */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full max-w-2xl h-full bg-gradient-to-r from-transparent via-background/80 to-transparent" />
                </div>
            </div>
        </>
    );
}

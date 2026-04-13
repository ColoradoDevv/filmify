'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Heart, Play, Star, Info, Film } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { getPosterUrl } from '@/lib/tmdb/service';
import type { Movie, TVShow } from '@/types/tmdb';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTVDetection } from '@/hooks/useTVDetection';

interface MovieCardProps {
    movie: Movie | TVShow;
    mediaType?: 'movie' | 'tv';
}

export default function MovieCard({ movie, mediaType = 'movie' }: MovieCardProps) {
    const router = useRouter();
    const { isTV } = useTVDetection();
    const cardRef = useRef<HTMLDivElement>(null);

    // Subscribe directly to the specific movie's favorite status to ensure reactivity
    const isFavorite = useStore((state) => state.user.favorites.some((fav) => fav.id === movie.id));
    const addFavorite = useStore((state) => state.addFavorite);
    const removeFavorite = useStore((state) => state.removeFavorite);

    const [isFocused, setIsFocused] = useState(false);

    const handleToggleFavorite = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isFavorite) {
            removeFavorite(movie.id);
        } else {
            addFavorite(movie as Movie);
        }
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'Enter':
            case ' ':
                // Navigate to detail page
                e.preventDefault();
                router.push(linkHref);
                break;
            case 'f':
            case 'F':
                // Toggle favorite with 'F' key
                e.preventDefault();
                handleToggleFavorite(e);
                break;
        }
    };

    // Scroll into view when focused
    useEffect(() => {
        if (isFocused && cardRef.current) {
            cardRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }, [isFocused]);

    const posterUrl = getPosterUrl(movie.poster_path);
    const isLiked = mounted ? isFavorite : false;
    const linkHref = mediaType === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`;

    // Normalize data
    const title = 'title' in movie ? movie.title : movie.name;
    const date = 'release_date' in movie ? movie.release_date : movie.first_air_date;
    const year = date ? new Date(date).getFullYear() : 'N/A';
    const originalLanguage = movie.original_language.toUpperCase();

    return (
        <div
            ref={cardRef}
            onClick={() => router.push(linkHref)}
            className="group relative rounded-2xl overflow-hidden bg-surface border border-white/5 transition-all duration-500 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-2 h-full tv-focusable tv-card-focus focus:outline-none cursor-pointer"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            data-focusable="true"
            aria-label={`${title} - ${year}`}
        >
            {/* Movie Poster */}
            <div className="relative aspect-[2/3] overflow-hidden">
                {posterUrl ? (
                    <Image
                        src={posterUrl}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-110 group-focus:scale-110"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-surface-light text-text-muted">
                        <Film className="w-12 h-12 opacity-20" strokeWidth={1} aria-hidden />
                        <span className="text-[10px] uppercase tracking-widest opacity-30">No Image</span>
                    </div>
                )}

                {/* Subtle Overlay for Legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Rating Badge (Top Left) */}
                <div className="absolute top-3 left-3 z-20">
                    <div className="px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-1.5 group-hover:bg-primary/20 group-hover:border-primary/30 transition-colors duration-300">
                        <Star className="w-3 h-3 text-primary fill-primary" />
                        <span className="text-[11px] font-bold text-white tracking-tight">{movie.vote_average.toFixed(1)}</span>
                    </div>
                </div>

                {/* Quick Info (Bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="font-bold text-white text-base leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors duration-300">
                        {title}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] font-medium text-text-secondary uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                        <span>{year}</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span>{mediaType === 'tv' ? 'Series' : 'Movie'}</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span>{originalLanguage}</span>
                    </div>
                </div>

                {/* Minimalist Play Indicator (Center) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-20">
                    <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-500">
                        <Play className="w-6 h-6 text-white fill-white ml-1" />
                    </div>
                </div>
            </div>

            {/* TV Navigation Hint */}
            {isFocused && isTV && (
                <div className="absolute top-2 right-2 bg-primary/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-black z-30 shadow-xl animate-fade-in">
                    ENTER PARA VER
                </div>
            )}
        </div>
    );
}

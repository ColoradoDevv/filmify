'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Heart, Play, Star, Info } from 'lucide-react';
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
            className="group relative rounded-xl overflow-hidden bg-surface-light/20 border border-white/5 shadow-lg transition-all duration-500 hover:shadow-primary/20 hover:scale-[1.02] hover:-translate-y-1 h-full tv-focusable tv-card-focus focus:outline-none"
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
                        className="object-cover transition-transform duration-700 group-hover:scale-110 group-focus:scale-110"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-light text-text-muted">
                        <span className="text-4xl">🎬</span>
                    </div>
                )}

                {/* Gradient Overlay (Always visible but subtle, stronger on hover/focus) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-90 group-focus:opacity-90 transition-opacity duration-300" />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20">
                    <div className="flex gap-2">
                        {movie.adult && (
                            <span className="px-2 py-1 rounded bg-red-600/90 text-white text-[10px] font-bold border border-red-500/50 backdrop-blur-md">
                                +18
                            </span>
                        )}
                        <span className="px-2 py-1 rounded bg-black/60 text-white text-[10px] font-bold border border-white/10 backdrop-blur-md uppercase">
                            {originalLanguage}
                        </span>
                    </div>

                    <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-bold text-white">{movie.vote_average.toFixed(1)}</span>
                    </div>
                </div>

                {/* Hover/Focus Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-300 z-20 translate-y-4 group-hover:translate-y-0 group-focus:translate-y-0 pointer-events-none">
                    <p className="text-gray-300 text-xs line-clamp-3 mb-4 leading-relaxed">
                        {movie.overview || "Sin descripción disponible."}
                    </p>

                    <div className="flex gap-2 items-center pointer-events-auto">
                        <Link
                            href={linkHref}
                            className="flex-1 h-10 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors tv-button-focus"
                            tabIndex={-1}
                        >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Ver</span>
                        </Link>

                        <button
                            onClick={handleToggleFavorite}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleToggleFavorite(e);
                                }
                            }}
                            className={`h-10 w-10 rounded-full flex items-center justify-center border transition-colors tv-button-focus ${isLiked
                                ? 'bg-accent border-accent text-white'
                                : 'bg-black/40 border-white/20 text-white hover:bg-white hover:text-black'
                                }`}
                            tabIndex={-1}
                            aria-label={isLiked ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        >
                            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Always Visible Info (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 transition-transform duration-300 group-hover:-translate-y-full group-hover:opacity-0 group-focus:-translate-y-full group-focus:opacity-0">
                <h3 className="font-bold text-white text-lg leading-tight line-clamp-1 mb-1 drop-shadow-md">
                    {title}
                </h3>
                <div className="flex items-center justify-between text-xs text-gray-300">
                    <span>{year}</span>
                    <span className="px-2 py-0.5 rounded border border-white/20 bg-white/5 uppercase text-[10px]">
                        {mediaType === 'tv' ? 'TV' : 'Movie'}
                    </span>
                </div>
            </div>

            {/* TV Navigation Hint (only visible when focused AND in TV mode) */}
            {isFocused && isTV && (
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white/80 z-30">
                    Enter: Ver | F: Favorito
                </div>
            )}
        </div>
    );
}

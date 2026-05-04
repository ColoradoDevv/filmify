'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Heart, Play, Star, Film } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { saveFavoritesToSupabase } from '@/lib/supabase/favorites';
import { getPosterUrl } from '@/lib/tmdb/helpers';
import type { Movie, TVShow } from '@/types/tmdb';
import { useRouter } from 'next/navigation';
import { useTVDetection } from '@/hooks/useTVDetection';

interface MovieCardProps {
    movie: Movie | TVShow;
    mediaType?: 'movie' | 'tv';
    priority?: boolean;
}

export default function MovieCard({ movie, mediaType = 'movie', priority = false }: MovieCardProps) {
    const router   = useRouter();
    const { isTV } = useTVDetection();
    const cardRef  = useRef<HTMLDivElement>(null);

    const currentFavorites = useStore((state) => state.user.favorites);
    const isFavorite       = currentFavorites.some((fav) => fav.id === movie.id);
    const addFavorite      = useStore((state) => state.addFavorite);
    const removeFavorite   = useStore((state) => state.removeFavorite);
    const [isFocused, setIsFocused] = useState(false);
    const [mounted,   setMounted]   = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const handleToggleFavorite = async (e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const nextFavorites = isFavorite
            ? currentFavorites.filter((fav) => fav.id !== movie.id)
            : [...currentFavorites, movie as Movie];
        if (isFavorite) { removeFavorite(movie.id); } else { addFavorite(movie as Movie); }
        await saveFavoritesToSupabase(nextFavorites);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(linkHref); }
        if (e.key === 'f' || e.key === 'F')     { e.preventDefault(); handleToggleFavorite(e); }
    };

    useEffect(() => {
        if (isFocused && cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }, [isFocused]);

    const posterUrl = getPosterUrl(movie.poster_path);
    const isLiked   = mounted ? isFavorite : false;
    const linkHref  = mediaType === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`;
    const title     = 'title' in movie ? movie.title : movie.name;
    const date      = 'release_date' in movie ? movie.release_date : movie.first_air_date;
    const year      = date ? new Date(date).getFullYear() : 'N/A';

    return (
        /* MD3 Card — filled variant, compact */
        <div
            ref={cardRef}
            onClick={() => router.push(linkHref)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            tabIndex={0}
            data-focusable="true"
            aria-label={`${title} — ${year}`}
            className={[
                'group relative rounded-[var(--radius-lg)] overflow-hidden cursor-pointer',
                'bg-surface-container transition-all duration-200',
                'hover:shadow-[var(--shadow-3)] hover:-translate-y-0.5',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                'tv-focusable tv-card-focus',
            ].join(' ')}
        >
            {/* Poster — 2:3 aspect ratio */}
            <div className="relative aspect-[2/3] overflow-hidden">
                {posterUrl ? (
                    <Image
                        src={posterUrl}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 480px) 45vw, (max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
                        priority={priority}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-surface-container-high text-on-surface-variant">
                        <Film className="w-8 h-8 opacity-20" strokeWidth={1} aria-hidden />
                        <span className="md3-label-small opacity-30 uppercase tracking-widest">Sin imagen</span>
                    </div>
                )}

                {/* Scrim for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

                {/* Rating chip — MD3 assist chip style */}
                <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
                    <Star className="w-2.5 h-2.5 text-primary fill-primary" aria-hidden />
                    <span className="md3-label-small text-white">{movie.vote_average.toFixed(1)}</span>
                </div>

                {/* Favorite button — siempre visible en móvil, hover en desktop */}
                <button
                    onClick={handleToggleFavorite}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleFavorite(e); }}
                    className={[
                        'absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center',
                        // Mobile: always visible if liked, otherwise subtle. Desktop: show on hover
                        isLiked
                            ? 'opacity-100 bg-primary/90 text-on-primary'
                            : 'opacity-60 sm:opacity-0 group-hover:opacity-100 bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80',
                        'transition-all duration-200 focus:outline-none focus-visible:opacity-100',
                    ].join(' ')}
                    aria-label={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    aria-pressed={isLiked}
                >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                </button>

                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" aria-hidden />
                    </div>
                </div>

                {/* Title overlay — always visible on mobile */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 z-20 sm:translate-y-1 sm:group-hover:translate-y-0 transition-transform duration-300">
                    <p className="md3-label-large text-white line-clamp-2 leading-tight font-bold">
                        {title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                        <span className="md3-label-small text-white/70">{year}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                        <span className="md3-label-small text-white/70">{mediaType === 'tv' ? 'Serie' : 'Película'}</span>
                    </div>
                </div>
            </div>

            {/* TV focus hint */}
            {isFocused && isTV && (
                <div className="absolute top-2 right-2 bg-primary px-2 py-0.5 rounded-full md3-label-small text-on-primary z-30 animate-fade-in">
                    ENTER
                </div>
            )}
        </div>
    );
}

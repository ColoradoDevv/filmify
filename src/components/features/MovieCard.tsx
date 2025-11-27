'use client';

import Image from 'next/image';
import { Heart } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { getPosterUrl } from '@/lib/tmdb/service';
import type { Movie } from '@/types/tmdb';

interface MovieCardProps {
    movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
    const isFavorite = useStore((state) => state.isFavorite);
    const addFavorite = useStore((state) => state.addFavorite);
    const removeFavorite = useStore((state) => state.removeFavorite);

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isFavorite(movie.id)) {
            removeFavorite(movie.id);
        } else {
            addFavorite(movie);
        }
    };

    const posterUrl = getPosterUrl(movie.poster_path);
    const isLiked = isFavorite(movie.id);

    return (
        <div className="group relative card card-hover cursor-pointer overflow-hidden">
            {/* Movie Poster */}
            <div className="relative aspect-[2/3] bg-surface-light overflow-hidden">
                {posterUrl ? (
                    <Image
                        src={posterUrl}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <span className="text-4xl">🎬</span>
                    </div>
                )}

                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Favorite Button */}
                <button
                    onClick={handleToggleFavorite}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/60 backdrop-blur-sm transition-all duration-300 hover:bg-black/80 hover:scale-110 z-10"
                    aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <Heart
                        className={`w-5 h-5 transition-colors ${isLiked
                                ? 'fill-accent text-accent'
                                : 'text-white/70 hover:text-white'
                            }`}
                    />
                </button>
            </div>

            {/* Movie Info */}
            <div className="p-3">
                <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {movie.title}
                </h3>

                <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                        <span className="text-warning">⭐</span>
                        <span className="text-text-secondary font-medium">
                            {movie.vote_average.toFixed(1)}
                        </span>
                    </div>

                    {movie.release_date && (
                        <>
                            <span className="text-text-muted">•</span>
                            <span className="text-text-muted">
                                {new Date(movie.release_date).getFullYear()}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

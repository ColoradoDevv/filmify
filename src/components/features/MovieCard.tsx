'use client';

import Image from 'next/image';
import { Heart, Play, Star, Info } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { getPosterUrl } from '@/lib/tmdb/service';
import type { Movie } from '@/types/tmdb';
import Link from 'next/link';

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
        <div className="group relative rounded-2xl overflow-hidden bg-surface-light/20 border border-white/5 shadow-lg transition-all duration-500 hover:shadow-primary/20 hover:scale-[1.02] hover:-translate-y-1">
            <Link href={`/movie/${movie.id}`} className="absolute inset-0 z-10" aria-label={`View details for ${movie.title}`} />

            {/* Movie Poster */}
            <div className="relative aspect-[2/3] overflow-hidden">
                {posterUrl ? (
                    <Image
                        src={posterUrl}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-light text-text-muted">
                        <span className="text-4xl">🎬</span>
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

                {/* Hover Actions Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 gap-4 bg-black/40 backdrop-blur-[2px]">
                    <div className="w-14 h-14 rounded-full bg-primary/90 text-white flex items-center justify-center transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-lg shadow-primary/30">
                        <Play className="w-6 h-6 ml-1 fill-current" />
                    </div>

                    <div className="flex gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75 relative z-20">
                        <button
                            onClick={handleToggleFavorite}
                            className={`p-3 rounded-full backdrop-blur-md border border-white/20 transition-all duration-300 hover:scale-110 ${isLiked
                                ? 'bg-accent text-white border-accent'
                                : 'bg-black/40 text-white hover:bg-white hover:text-black'
                                }`}
                        >
                            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                        </button>
                        <div className="p-3 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 transition-all duration-300">
                            <Info className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Top Right Badge (Rating) */}
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold text-white">{movie.vote_average.toFixed(1)}</span>
                </div>
            </div>

            {/* Movie Info (Minimalist) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="font-bold text-white text-lg leading-tight line-clamp-1 mb-1 drop-shadow-md">
                    {movie.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-gray-300">
                    <span>{movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</span>
                    <span className="px-2 py-0.5 rounded border border-white/20 bg-white/5 uppercase text-[10px]">HD</span>
                </div>
            </div>
        </div>
    );
}

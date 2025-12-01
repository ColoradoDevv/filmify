'use client';

import { useRef } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/lib/store/useStore';
import MovieCard from '@/components/features/MovieCard';
import { useTVDetection } from '@/hooks/useTVDetection';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';

export default function FavoritesPage() {
    const favorites = useFavorites();
    const { isTV } = useTVDetection();
    const containerRef = useRef<HTMLDivElement>(null);

    useSpatialNavigation(containerRef, {
        enabled: isTV,
        focusOnMount: true
    });

    return (
        <div className="space-y-8" ref={containerRef}>
            {/* Header */}
            <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 text-accent" />
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold">Mis Favoritos</h1>
                    <p className="text-text-secondary mt-1">
                        {favorites.length} {favorites.length === 1 ? 'película' : 'películas'} guardadas
                    </p>
                </div>
            </div>

            {/* Favorites Grid */}
            {favorites.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                    {favorites.map((movie) => (
                        <div key={movie.id} className="tv-focusable rounded-xl transition-transform focus:scale-105">
                            <MovieCard movie={movie} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-surface rounded-full mb-4">
                        <Heart className="w-10 h-10 text-text-muted" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No tienes favoritos aún</h3>
                    <p className="text-text-secondary mb-6">
                        Explora películas y guarda tus favoritas aquí
                    </p>
                    <a
                        href="/browse"
                        className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
                    >
                        Explorar Películas
                    </a>
                </div>
            )}
        </div>
    );
}

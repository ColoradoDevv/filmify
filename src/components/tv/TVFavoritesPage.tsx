'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Heart, Search } from 'lucide-react';
import { useFavorites } from '@/lib/store/useStore';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import MovieCard from '@/components/features/MovieCard';

export default function TVFavoritesPage() {
    const favorites = useFavorites();
    const containerRef = useRef<HTMLDivElement>(null);

    useSpatialNavigation(containerRef, {
        enabled: true,
        focusOnMount: true,
    });

    return (
        <div ref={containerRef} className="min-h-screen p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-accent" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Mis Favoritos</h1>
                    <p className="text-white/40 text-sm mt-0.5">
                        {favorites.length} {favorites.length === 1 ? 'título guardado' : 'títulos guardados'}
                    </p>
                </div>
            </div>

            {favorites.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                    {favorites.map((movie) => (
                        <div key={movie.id} className="tv-row-item">
                            <MovieCard movie={movie} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-white/30">
                    <div className="w-24 h-24 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center mb-6">
                        <Heart className="w-12 h-12 opacity-20" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white/50 mb-2">Sin favoritos aún</h2>
                    <p className="text-base text-center max-w-sm mb-8">
                        Explora el catálogo y guarda tus películas y series favoritas
                    </p>
                    <Link
                        href="/browse"
                        className="flex items-center gap-3 px-8 py-4 bg-primary text-on-primary rounded-xl font-bold text-lg hover:bg-primary-hover transition-all tv-focusable focus:outline-none focus:ring-2 focus:ring-primary focus:scale-105"
                        tabIndex={0}
                        data-focusable="true"
                    >
                        <Search className="w-5 h-5" />
                        Explorar Catálogo
                    </Link>
                </div>
            )}

            {/* Hint */}
            <div className="mt-8 flex items-center justify-center gap-6 text-white/20 text-xs">
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑↓←→</kbd>
                    Navegar
                </span>
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">OK</kbd>
                    Ver detalles
                </span>
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">F</kbd>
                    Quitar favorito
                </span>
            </div>
        </div>
    );
}

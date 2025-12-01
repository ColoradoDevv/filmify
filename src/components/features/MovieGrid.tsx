'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import MovieCard from '@/components/features/MovieCard';
import { getTrending, discoverMovies, discoverTV } from '@/lib/tmdb/service';
import type { Movie, TVShow } from '@/types/tmdb';

interface MovieGridProps {
    initialMovies: (Movie | TVShow)[];
    mediaType?: 'movie' | 'tv';
}

export default function MovieGrid({ initialMovies, mediaType = 'movie' }: MovieGridProps) {
    const searchParams = useSearchParams();
    const genre = searchParams.get('genre');
    const year = searchParams.get('year');
    const sortBy = searchParams.get('sort_by');

    const [movies, setMovies] = useState<(Movie | TVShow)[]>(initialMovies);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Reset state when filters or mediaType change
    useEffect(() => {
        setMovies(initialMovies);
        setPage(1);
    }, [initialMovies, mediaType]);

    const handleLoadMore = async () => {
        setLoading(true);
        try {
            const nextPage = page + 1;
            let data;

            if (genre || sortBy || year) {
                const filters = {
                    genre: genre ? Number(genre) : undefined,
                    year: year ? Number(year) : undefined,
                    sortBy: (sortBy as any) || undefined,
                    page: nextPage
                };

                data = mediaType === 'tv'
                    ? await discoverTV(filters)
                    : await discoverMovies(filters);
            } else {
                data = await getTrending(mediaType, 'week', nextPage);
            }

            // Filter out duplicates just in case
            const newMovies = data.results.filter(
                newMovie => !movies.some(existingMovie => existingMovie.id === newMovie.id)
            );

            setMovies(prev => [...prev, ...newMovies]);
            setPage(nextPage);
        } catch (error) {
            console.error('Error loading more movies:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12">
            {/* Movies Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
                {movies.map((movie, index) => (
                    <div
                        key={`${movie.id}-${index}`}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${(index % 20) * 50}ms` }}
                    >
                        <MovieCard movie={movie} mediaType={mediaType} />
                    </div>
                ))}
            </div>

            {/* Load More Button */}
            <div className="text-center pt-4">
                <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="group relative px-8 py-4 bg-surface hover:bg-surface-hover border border-surface-light rounded-2xl font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/10 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 flex items-center gap-2">
                        {loading ? (
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4 text-primary" />
                        )}
                        {loading ? 'Cargando...' : `Cargar más ${mediaType === 'tv' ? 'series' : 'películas'}`}
                    </span>
                </button>
            </div>
        </div>
    );
}

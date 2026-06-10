'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Loader2, Film, Tv, Plus, AlertCircle } from 'lucide-react';
import MovieCard from '@/components/features/MovieCard';
import { MovieCardSkeleton } from '@/components/features/MovieCardSkeleton';
import { loadMoreMovies, LoadMoreOptions } from '@/app/actions/catalog';
import type { Movie, TVShow } from '@/types/tmdb';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';

interface MovieGridProps {
    initialMovies: (Movie | TVShow)[];
    mediaType?: 'movie' | 'tv';
    /** Fija el género para "Cargar más" (p. ej. en /genero/[slug], donde no
     *  viene como query param). Tiene prioridad sobre ?genre=. */
    fixedGenre?: number;
}

export default function MovieGrid({ initialMovies, mediaType = 'movie', fixedGenre }: MovieGridProps) {
    const searchParams = useSearchParams();
    const genre = fixedGenre != null ? String(fixedGenre) : searchParams.get('genre');
    const year = searchParams.get('year');
    const sortBy = searchParams.get('sort_by');

    const [movies, setMovies] = useState<(Movie | TVShow)[]>(initialMovies);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true); // Detener carga cuando no hay más
    const [error, setError] = useState<string | null>(null);

    const gridRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLButtonElement>(null);

    // Habilitar navegación espacial
    useSpatialNavigation(gridRef, {
        enabled: true,
        focusOnMount: false,
    });

    // Reiniciar cuando cambien los filtros o el tipo de contenido
    useEffect(() => {
        setMovies(initialMovies);
        setPage(1);
        setHasMore(true);
        setError(null);
    }, [initialMovies, mediaType, genre, year, sortBy]);

    const handleLoadMore = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        setError(null);

        try {
            const nextPage = page + 1;

            const results = await loadMoreMovies({
                page: nextPage,
                mediaType,
                genre: genre ? Number(genre) : undefined,
                year: year ? Number(year) : undefined,
                sortBy: (sortBy as LoadMoreOptions['sortBy']) || undefined,
            });

            // Si no llegan resultados, deshabilitar carga
            if (!results || results.length === 0) {
                setHasMore(false);
                setLoading(false);
                return;
            }

            // Evitar duplicados
            const existingIds = new Set(movies.map(m => m.id));
            const newMovies = results.filter(m => !existingIds.has(m.id));

            if (newMovies.length === 0) {
                setHasMore(false);
            } else {
                setMovies(prev => [...prev, ...newMovies]);
                setPage(nextPage);

                // Mover foco al primer elemento nuevo (accesibilidad TV)
                setTimeout(() => {
                    if (gridRef.current) {
                        const cards = gridRef.current.querySelectorAll('[data-focusable="true"]');
                        const firstNewIndex = movies.length;
                        if (cards[firstNewIndex]) {
                            (cards[firstNewIndex] as HTMLElement).focus();
                        }
                    }
                }, 150);
            }
        } catch (err) {
            console.error('Error loading more content:', err);
            setError('No se pudieron cargar más títulos. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, page, genre, year, sortBy, mediaType, movies]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLoadMore();
        }
    };

    const Icon = mediaType === 'tv' ? Tv : Film;

    // Estado sin resultados
    if (movies.length === 0 && !loading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-surface/40 px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                    <Icon className="h-8 w-8 text-text-muted" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">No hay resultados</h3>
                <p className="text-sm text-text-secondary max-w-md mx-auto">
                    No encontramos títulos con los filtros actuales. Prueba a quitar año o género, o revisa que la API de TMDB esté configurada en el servidor.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* Grid de tarjetas */}
            <div
                ref={gridRef}
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3 tv-grid tv-grid-movies"
                role="list"
                aria-label={`${mediaType === 'tv' ? 'Series' : 'Películas'} disponibles`}
            >
                {movies.map((movie, index) => (
                    <div
                        key={`${movie.id}-${index}`}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${(index % 20) * 50}ms` }}
                        role="listitem"
                    >
                        <MovieCard
                            movie={movie}
                            mediaType={mediaType}
                            priority={index < 10}
                        />
                    </div>
                ))}

                {/* Esqueletos durante carga */}
                {loading && Array.from({ length: 8 }).map((_, i) => (
                    <div key={`skeleton-${i}`} role="gridcell" aria-hidden="true">
                        <MovieCardSkeleton />
                    </div>
                ))}
            </div>

            {/* Mensaje de error */}
            {error && (
                <div className="flex items-center justify-center gap-2 text-error text-sm bg-error/5 rounded-lg p-3 mx-auto max-w-md">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Botón de cargar más o mensaje de fin */}
            <div className="text-center pt-4">
                {hasMore ? (
                    <button
                        ref={loadMoreRef}
                        onClick={handleLoadMore}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        className="group relative px-8 py-4 bg-surface hover:bg-surface-hover border border-surface-light rounded-2xl font-medium transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed tv-focusable tv-button-focus focus:outline-none text-white"
                        tabIndex={0}
                        data-focusable="true"
                        aria-label={`Cargar más ${mediaType === 'tv' ? 'series' : 'películas'}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" />
                        <span className="relative z-10 flex items-center gap-2 justify-center">
                            {loading ? (
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 text-primary" />
                            )}
                            {loading ? 'Cargando...' : `Cargar más ${mediaType === 'tv' ? 'series' : 'películas'}`}
                        </span>
                    </button>
                ) : movies.length > 0 ? (
                    <p className="text-text-muted text-sm flex items-center justify-center gap-1">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Has llegado al final del catálogo
                    </p>
                ) : null}
            </div>
        </div>
    );
}
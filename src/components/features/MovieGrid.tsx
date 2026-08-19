'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Film, Tv } from 'lucide-react';
import MovieCard from '@/components/features/MovieCard';
import { MovieCardSkeleton } from '@/components/features/MovieCardSkeleton';
import { loadMoreMovies, LoadMoreOptions } from '@/app/actions/catalog';
import type { Movie, TVShow } from '@/types/tmdb';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import { CATALOG_GRID_CLASS, cardAnimationDelay } from '@/components/features/gridClasses';
import LoadMoreButton from '@/components/features/LoadMoreButton';

interface MovieGridProps {
    initialMovies: (Movie | TVShow)[];
    mediaType?: 'movie' | 'tv';
    /** Fija el género para "Cargar más" (p. ej. en /genero/[slug], donde no
     *  viene como query param). Tiene prioridad sobre ?genre=. */
    fixedGenre?: number;
    /** Página TMDB desde la que continuar al pulsar "Cargar más". El SSR
     *  inicial suele consumir varias páginas de TMDB para juntar 20+ títulos
     *  disponibles, así que el cliente debe continuar desde donde quedó. */
    initialNextPage?: number;
    /** Mapa tmdb_id → quality del listing de Vimeus. Objeto plano (serializable
     *  Server→Client). Solo cubre los ítems del SSR inicial. */
    qualityMap?: Record<string, string>;
}

export default function MovieGrid({
    initialMovies,
    mediaType = 'movie',
    fixedGenre,
    initialNextPage = 2,
    qualityMap,
}: MovieGridProps) {
    const searchParams = useSearchParams();
    const genre = fixedGenre != null ? String(fixedGenre) : searchParams.get('genre');
    const year = searchParams.get('year');
    const sortBy = searchParams.get('sort_by');

    const [movies, setMovies] = useState<(Movie | TVShow)[]>(initialMovies);
    const [nextPage, setNextPage] = useState(initialNextPage);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true); // Detener carga cuando no hay más
    const [error, setError] = useState<string | null>(null);

    const gridRef = useRef<HTMLDivElement>(null);

    // Habilitar navegación espacial
    useSpatialNavigation(gridRef, {
        enabled: true,
        focusOnMount: false,
    });

    // Reiniciar cuando cambien los filtros o el tipo de contenido
    useEffect(() => {
        setMovies(initialMovies);
        setNextPage(initialNextPage);
        setHasMore(true);
        setError(null);
    }, [initialMovies, initialNextPage, mediaType, genre, year, sortBy]);

    const handleLoadMore = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        setError(null);

        try {
            const { items, nextPage: newNextPage, hasMore: more } = await loadMoreMovies({
                page: nextPage,
                mediaType,
                genre: genre ? Number(genre) : undefined,
                year: year ? Number(year) : undefined,
                sortBy: (sortBy as LoadMoreOptions['sortBy']) || undefined,
            });

            setNextPage(newNextPage);
            setHasMore(more);

            // Evitar duplicados con lo ya cargado
            const existingIds = new Set(movies.map((m) => m.id));
            const newMovies = items.filter((m) => !existingIds.has(m.id));

            if (newMovies.length > 0) {
                setMovies((prev) => [...prev, ...newMovies]);

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
            } else if (!more) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Error loading more content:', err);
            setError('No se pudieron cargar más títulos. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, genre, year, sortBy, mediaType, movies]);

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
        <div className="space-y-8 sm:space-y-12">
            {/* Grid de tarjetas */}
            <div
                ref={gridRef}
                className={`${CATALOG_GRID_CLASS} tv-grid tv-grid-movies`}
                role="list"
                aria-label={`${mediaType === 'tv' ? 'Series' : 'Películas'} disponibles`}
            >
                {movies.map((movie, index) => (
                    <div
                        key={`${movie.id}-${index}`}
                        className="animate-fade-in-up"
                        style={{ animationDelay: cardAnimationDelay(index) }}
                        role="listitem"
                    >
                        <MovieCard
                            movie={movie}
                            mediaType={mediaType}
                            priority={index < 10}
                            quality={qualityMap?.[movie.id]}
                        />
                    </div>
                ))}

                {/* Esqueletos durante carga */}
                {loading &&
                    Array.from({ length: 8 }).map((_, i) => (
                        <div key={`skeleton-${i}`} role="gridcell" aria-hidden="true">
                            <MovieCardSkeleton />
                        </div>
                    ))}
            </div>

            <LoadMoreButton
                onLoadMore={handleLoadMore}
                loading={loading}
                hasMore={hasMore}
                hasItems={movies.length > 0}
                label={mediaType === 'tv' ? 'series' : 'películas'}
                error={error}
            />
        </div>
    );
}


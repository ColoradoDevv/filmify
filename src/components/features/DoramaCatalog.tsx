'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import MovieCard from '@/components/features/MovieCard';
import { MovieCardSkeleton } from '@/components/features/MovieCardSkeleton';
import LoadMoreButton from '@/components/features/LoadMoreButton';
import { CATALOG_GRID_CLASS, cardAnimationDelay } from '@/components/features/gridClasses';
import { doramaCatalogAction } from '@/app/actions/doramas';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import type { TVShow } from '@/types/tmdb';

interface DoramaCatalogProps {
    initialItems: TVShow[];
    /** Región activa (`?region=`), o null para "Todos". */
    region: string | null;
    /** Página de TMDB por la que continuar al pulsar "Cargar más". */
    initialNextPage: number;
    initialHasMore: boolean;
}

/**
 * Grilla paginada de doramas.
 *
 * Misma mecánica que `MovieGrid` en /browse: el servidor pinta la primera
 * tanda y el cliente va pidiendo más. Las fichas apuntan a /tv/[id] porque un
 * dorama es una serie de TMDB.
 */
export default function DoramaCatalog({
    initialItems,
    region,
    initialNextPage,
    initialHasMore,
}: DoramaCatalogProps) {
    const [items, setItems] = useState(initialItems);
    const [nextPage, setNextPage] = useState(initialNextPage);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const gridRef = useRef<HTMLDivElement>(null);
    useSpatialNavigation(gridRef, { enabled: true, focusOnMount: false });

    // Cambiar de región es una navegación del servidor: reiniciamos el estado
    // con lo que llega en las props.
    useEffect(() => {
        setItems(initialItems);
        setNextPage(initialNextPage);
        setHasMore(initialHasMore);
        setError(null);
    }, [initialItems, initialNextPage, initialHasMore, region]);

    const handleLoadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        setError(null);
        try {
            const res = await doramaCatalogAction({ region, page: nextPage });
            setNextPage(res.nextPage);
            setHasMore(res.hasMore);
            setItems((prev) => {
                const seen = new Set(prev.map((s) => s.id));
                return [...prev, ...res.items.filter((s) => !seen.has(s.id))];
            });
        } catch (err) {
            console.error('[DoramaCatalog] error al cargar más:', err);
            setError('No se pudieron cargar más doramas. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, nextPage, region]);

    return (
        <div className="space-y-8 sm:space-y-12">
            <div
                ref={gridRef}
                className={CATALOG_GRID_CLASS}
                role="list"
                aria-label="Doramas disponibles"
            >
                {items.map((show, i) => (
                    <div
                        key={show.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: cardAnimationDelay(i) }}
                        role="listitem"
                    >
                        <MovieCard movie={show} mediaType="tv" priority={i < 10} />
                    </div>
                ))}

                {loading &&
                    Array.from({ length: 8 }).map((_, i) => (
                        <div key={`skeleton-${i}`} aria-hidden="true">
                            <MovieCardSkeleton />
                        </div>
                    ))}
            </div>

            <LoadMoreButton
                onLoadMore={handleLoadMore}
                loading={loading}
                hasMore={hasMore}
                hasItems={items.length > 0}
                label="doramas"
                error={error}
            />
        </div>
    );
}

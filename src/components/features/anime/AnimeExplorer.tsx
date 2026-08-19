'use client';

/**
 * Explorador de anime — cliente.
 *
 * Recibe del servidor la primera tanda del catálogo (ya filtrada a lo
 * reproducible) y encima añade:
 *  - Búsqueda en vivo (debounce) contra AniList.
 *  - Filtro por género (chips).
 *  - Paginación con "Cargar más", igual que /browse.
 *
 * Los tres modos —catálogo, búsqueda y género— comparten la misma acción de
 * servidor y la misma grilla plana que usan películas y series; no hay
 * carruseles por categoría.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Sparkles, X } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { MovieCardSkeleton } from '@/components/features/MovieCardSkeleton';
import LoadMoreButton from '@/components/features/LoadMoreButton';
import { CATALOG_GRID_CLASS, cardAnimationDelay } from '@/components/features/gridClasses';
import { animeCatalogAction } from '@/app/actions/anime';
import type { AnimeCard as AnimeCardData } from '@/lib/anilist/types';

interface AnimeExplorerProps {
    initialItems: AnimeCardData[];
    /** Página de AniList por la que continuar al pulsar "Cargar más". */
    initialNextPage: number;
    initialHasMore: boolean;
    genres: string[];
}

// Géneros más buscados primero; el resto viene del servidor.
const PRIORITY_GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Mystery', 'Horror'];
const GENRE_ES: Record<string, string> = {
    Action: 'Acción', Adventure: 'Aventura', Comedy: 'Comedia', Drama: 'Drama',
    Fantasy: 'Fantasía', Romance: 'Romance', 'Sci-Fi': 'Ciencia ficción',
    'Slice of Life': 'Recuentos de la vida', Sports: 'Deportes',
    Supernatural: 'Sobrenatural', Mystery: 'Misterio', Horror: 'Terror',
    Psychological: 'Psicológico', Thriller: 'Suspenso', Music: 'Música',
    Mecha: 'Mecha', Ecchi: 'Ecchi',
};

export default function AnimeExplorer({
    initialItems,
    initialNextPage,
    initialHasMore,
    genres,
}: AnimeExplorerProps) {
    const [query, setQuery] = useState('');
    const [genre, setGenre] = useState<string | null>(null);

    const [items, setItems] = useState(initialItems);
    const [nextPage, setNextPage] = useState(initialNextPage);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const seqRef = useRef(0);

    const orderedGenres = [
        ...PRIORITY_GENRES.filter((g) => genres.includes(g)),
        ...genres.filter((g) => !PRIORITY_GENRES.includes(g)),
    ];

    const filtering = Boolean(query.trim() || genre);

    /** Vuelve al catálogo que pintó el servidor, sin pedir nada. */
    const resetToCatalog = useCallback(() => {
        seqRef.current++; // invalida cualquier búsqueda en vuelo
        setItems(initialItems);
        setNextPage(initialNextPage);
        setHasMore(initialHasMore);
        setLoading(false);
        setError(null);
    }, [initialItems, initialNextPage, initialHasMore]);

    /** Primera página de un filtro (búsqueda o género): sustituye la grilla. */
    const runFilter = useCallback(async (q: string, g: string | null) => {
        const seq = ++seqRef.current;
        setLoading(true);
        setError(null);
        try {
            const res = await animeCatalogAction({ page: 1, query: q, genre: g });
            if (seq !== seqRef.current) return; // respuesta obsoleta
            setItems(res.items);
            setNextPage(res.nextPage);
            setHasMore(res.hasMore);
        } catch (err) {
            console.error('[AnimeExplorer] error al filtrar:', err);
            if (seq !== seqRef.current) return;
            setItems([]);
            setHasMore(false);
            setError('No se pudo consultar el catálogo. Intenta de nuevo.');
        } finally {
            if (seq === seqRef.current) setLoading(false);
        }
    }, []);

    // Búsqueda con debounce cuando cambia el texto.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) {
            // Sin texto: si hay género activo, su grilla; si no, el catálogo.
            if (genre) void runFilter('', genre);
            else resetToCatalog();
            return;
        }
        debounceRef.current = setTimeout(() => { void runFilter(query, null); }, 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, genre, runFilter, resetToCatalog]);

    const pickGenre = (g: string) => {
        setQuery('');
        setGenre(genre === g ? null : g);
    };

    const clearAll = () => {
        setQuery('');
        setGenre(null);
    };

    const handleLoadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        const seq = seqRef.current;
        setLoading(true);
        setError(null);
        try {
            const res = await animeCatalogAction({
                page: nextPage,
                query: query.trim() || null,
                genre: query.trim() ? null : genre,
            });
            if (seq !== seqRef.current) return; // cambió el filtro mientras cargaba
            setNextPage(res.nextPage);
            setHasMore(res.hasMore);
            setItems((prev) => {
                const seen = new Set(prev.map((a) => a.id));
                return [...prev, ...res.items.filter((a) => !seen.has(a.id))];
            });
        } catch (err) {
            console.error('[AnimeExplorer] error al cargar más:', err);
            if (seq === seqRef.current) setError('No se pudo cargar más anime. Intenta de nuevo.');
        } finally {
            if (seq === seqRef.current) setLoading(false);
        }
    }, [loading, hasMore, nextPage, query, genre]);

    const filterLabel = query.trim()
        ? `Resultados para "${query.trim()}"`
        : genre
        ? `Anime de ${GENRE_ES[genre] ?? genre}`
        : 'Anime disponible';

    // Solo se vacía la grilla mientras se filtra; el catálogo inicial nunca
    // deja la pantalla en blanco.
    const showEmptyState = filtering && !loading && items.length === 0;

    return (
        <div className="space-y-6">
            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-on-surface-variant pointer-events-none" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Busca cualquier anime — Naruto, Jujutsu Kaisen, One Piece..."
                    className="w-full h-12 pl-11 pr-11 rounded-full bg-surface-container border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
                {(query || genre) && (
                    <button
                        onClick={clearAll}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-on-surface/8 flex items-center justify-center text-on-surface-variant"
                        aria-label="Limpiar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Chips de género */}
            {orderedGenres.length > 0 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-1">
                    {orderedGenres.map((g) => {
                        const active = genre === g;
                        return (
                            <button
                                key={g}
                                onClick={() => pickGenre(g)}
                                className={`shrink-0 px-3.5 h-8 rounded-full md3-label-medium border transition-colors ${
                                    active
                                        ? 'bg-primary text-on-primary border-primary'
                                        : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/40'
                                }`}
                            >
                                {GENRE_ES[g] ?? g}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Título solo cuando hay un filtro activo: sin filtros es el catálogo */}
            {filtering && (
                <h2 className="md3-title-medium text-on-surface flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> {filterLabel}
                </h2>
            )}

            {showEmptyState ? (
                <div className="text-center py-16 bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant">
                    <p className="md3-title-small text-on-surface mb-1">Sin resultados</p>
                    <p className="md3-body-small text-on-surface-variant">Prueba con otro término o género</p>
                </div>
            ) : (
                <div className="space-y-8 sm:space-y-12">
                    <div className={CATALOG_GRID_CLASS} role="list" aria-label={filterLabel}>
                        {items.map((a, i) => (
                            <div
                                key={a.id}
                                className="animate-fade-in-up"
                                style={{ animationDelay: cardAnimationDelay(i) }}
                                role="listitem"
                            >
                                <AnimeCard anime={a} priority={i < 10} />
                            </div>
                        ))}

                        {loading &&
                            Array.from({ length: 8 }).map((_, i) => (
                                <div key={`skeleton-${i}`} aria-hidden="true">
                                    <MovieCardSkeleton />
                                </div>
                            ))}
                    </div>

                    {items.length === 0 && loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <LoadMoreButton
                            onLoadMore={handleLoadMore}
                            loading={loading}
                            hasMore={hasMore}
                            hasItems={items.length > 0}
                            label="anime"
                            error={error}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

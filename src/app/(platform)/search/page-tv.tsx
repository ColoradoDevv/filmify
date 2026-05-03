'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import TVKeyboard from '@/components/tv/TVKeyboard';
import MovieCard from '@/components/features/MovieCard';
import type { Movie } from '@/types/tmdb';

interface SearchPageTVProps {
    initialQuery: string;
    initialResults: Movie[];
}

export default function SearchPageTV({ initialQuery, initialResults }: SearchPageTVProps) {
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<Movie[]>(initialResults);
    const [showKeyboard, setShowKeyboard] = useState(!initialQuery);
    const [isSearching, setIsSearching] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    useSpatialNavigation(containerRef, { enabled: true });

    const handleSearch = useCallback(async (q: string) => {
        if (!q.trim()) return;
        setIsSearching(true);
        setShowKeyboard(false);
        router.push(`/search?q=${encodeURIComponent(q)}`);
    }, [router]);

    const handleQueryChange = (val: string) => {
        setQuery(val);
    };

    const handleKeyboardSubmit = () => {
        handleSearch(query);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (showKeyboard) {
                setShowKeyboard(false);
            } else {
                router.back();
            }
        }
    };

    return (
        <div
            ref={containerRef}
            className="min-h-screen p-6 lg:p-8"
            onKeyDown={handleKeyDown}
        >
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                        <Search className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Buscar</h1>
                        <p className="text-white/40 text-sm mt-0.5">Películas, series y más</p>
                    </div>
                </div>

                {/* Search bar — acts as keyboard toggle */}
                <button
                    onClick={() => setShowKeyboard(true)}
                    className={[
                        'w-full max-w-2xl flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all text-left',
                        'tv-focusable focus:outline-none',
                        showKeyboard
                            ? 'border-primary bg-primary/10 shadow-[0_0_0_4px_rgba(0,194,255,0.15)]'
                            : 'border-outline-variant bg-surface-container hover:border-primary/50 focus:border-primary focus:bg-primary/5',
                    ].join(' ')}
                    tabIndex={0}
                    data-focusable="true"
                    aria-label="Abrir teclado de búsqueda"
                    aria-expanded={showKeyboard}
                >
                    <Search className="w-5 h-5 text-white/40 flex-shrink-0" />
                    <span className={`text-xl flex-1 ${query ? 'text-white' : 'text-white/30'}`}>
                        {query || 'Toca para buscar...'}
                    </span>
                    {query && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setQuery(''); setResults([]); }}
                            className="p-1 rounded-full hover:bg-white/10 transition-colors tv-focusable focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Limpiar búsqueda"
                            tabIndex={0}
                            data-focusable="true"
                        >
                            <X className="w-5 h-5 text-white/50" />
                        </button>
                    )}
                </button>
            </div>

            {/* Virtual keyboard */}
            {showKeyboard && (
                <div className="mb-8 max-w-2xl">
                    <TVKeyboard
                        value={query}
                        onChange={handleQueryChange}
                        onSubmit={handleKeyboardSubmit}
                        onClose={() => setShowKeyboard(false)}
                    />
                </div>
            )}

            {/* Results */}
            {isSearching ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4 text-white/40">
                        <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-lg">Buscando...</p>
                    </div>
                </div>
            ) : results.length > 0 ? (
                <div ref={resultsRef}>
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-xl font-semibold text-white">
                            Resultados
                        </h2>
                        <span className="px-2.5 py-0.5 bg-primary/15 text-primary text-sm font-medium rounded-full border border-primary/20">
                            {results.length}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                        {results.map((movie) => (
                            <div
                                key={movie.id}
                                className="tv-row-item"
                            >
                                <MovieCard movie={movie} mediaType="movie" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : query && !showKeyboard ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/30">
                    <Search className="w-20 h-20 mb-4 opacity-20" />
                    <p className="text-2xl font-medium mb-2">Sin resultados</p>
                    <p className="text-base">No encontramos nada para "{query}"</p>
                    <button
                        onClick={() => setShowKeyboard(true)}
                        className="mt-6 px-6 py-3 bg-primary/15 text-primary border border-primary/20 rounded-xl font-medium hover:bg-primary/25 transition-colors tv-focusable focus:outline-none focus:ring-2 focus:ring-primary"
                        tabIndex={0}
                        data-focusable="true"
                    >
                        Intentar de nuevo
                    </button>
                </div>
            ) : !query ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/20">
                    <Search className="w-24 h-24 mb-6 opacity-10" />
                    <p className="text-2xl font-medium">Empieza a escribir</p>
                    <p className="text-base mt-2">Usa el teclado para buscar contenido</p>
                </div>
            ) : null}
        </div>
    );
}

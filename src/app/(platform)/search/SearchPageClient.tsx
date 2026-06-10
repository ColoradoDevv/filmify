'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, Sparkles, Frown } from 'lucide-react';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import TVKeyboard from '@/components/tv/TVKeyboard';
import MovieCard from '@/components/features/MovieCard';
import { searchMovies } from '@/lib/tmdb/service';
import { filterAvailableMovies } from '@/server/services/vimeus';
import { getSearchCorrection } from '@/lib/ai';
import type { Movie } from '@/types/tmdb';

interface SearchPageClientProps {
    initialQuery: string;
    initialResults: Movie[];
}

export default function SearchPageClient({
    initialQuery,
    initialResults,
}: SearchPageClientProps) {
    const router = useRouter();

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<Movie[]>(initialResults);
    const [showKeyboard, setShowKeyboard] = useState(!initialQuery);
    const [isSearching, startTransition] = useTransition();
    const [aiCorrection, setAiCorrection] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchBarRef = useRef<HTMLDivElement>(null);

    useSpatialNavigation(containerRef, { enabled: true });

    const performSearch = useCallback(
        (searchQuery: string) => {
            const trimmed = searchQuery.trim();
            if (!trimmed) {
                setResults([]);
                setAiCorrection(null);
                return;
            }

            startTransition(async () => {
                try {
                    const data = await searchMovies(trimmed);
                    const filtered = await filterAvailableMovies(data.results as Movie[]);
                    setResults(filtered);

                    if (filtered.length === 0) {
                        try {
                            const correction = await getSearchCorrection(trimmed);
                            setAiCorrection(correction);
                        } catch {
                            setAiCorrection(null);
                        }
                    } else {
                        setAiCorrection(null);
                    }
                } catch (error) {
                    console.error('Error buscando:', error);
                    setResults([]);
                    setAiCorrection(null);
                }
            });
        },
        []
    );

    useEffect(() => {
        setQuery(initialQuery);
        setResults(initialResults);
        setShowKeyboard(!initialQuery);
        setAiCorrection(null);
    }, [initialQuery, initialResults]);

    const handleKeyboardSubmit = useCallback(() => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setShowKeyboard(false);
        performSearch(trimmed);
        router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
    }, [query, performSearch, router]);

    const handleClear = useCallback(() => {
        setQuery('');
        setResults([]);
        setAiCorrection(null);
        setShowKeyboard(true);
        router.replace('/search');
        searchBarRef.current?.focus();
    }, [router]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (showKeyboard) {
                setShowKeyboard(false);
            } else {
                router.back();
            }
        }
    };

    const searchPlaceholder = query || 'Buscar películas y series...';

    return (
        <div
            ref={containerRef}
            className="min-h-screen p-6 lg:p-8"
            onKeyDown={handleKeyDown}
        >
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                        <Search className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Buscar</h1>
                        <p className="text-white/40 text-sm mt-0.5">
                            Películas, series y más
                        </p>
                    </div>
                </div>

                <div className="relative w-full max-w-2xl">
                    <div
                        ref={searchBarRef}
                        onClick={() => setShowKeyboard(true)}
                        role="button"
                        tabIndex={0}
                        data-focusable="true"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setShowKeyboard(true);
                            }
                        }}
                        className={`
                            w-full flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all
                            cursor-pointer text-left tv-focusable focus:outline-none
                            ${showKeyboard
                                ? 'border-primary bg-primary/10 shadow-[0_0_0_4px_rgba(0,194,255,0.15)]'
                                : 'border-outline-variant bg-surface-container hover:border-primary/50 focus:border-primary focus:bg-primary/5'
                            }
                        `}
                        aria-label="Abrir teclado de búsqueda"
                        aria-expanded={showKeyboard}
                    >
                        <Search className="w-5 h-5 text-white/40 flex-shrink-0" />
                        <span
                            className={`text-xl flex-1 truncate pr-8 ${
                                query ? 'text-white' : 'text-white/30'
                            }`}
                        >
                            {searchPlaceholder}
                        </span>

                        {isSearching && (
                            <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                        )}
                    </div>

                    {query && !isSearching && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClear();
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors tv-focusable focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Limpiar búsqueda"
                            tabIndex={0}
                            data-focusable="true"
                        >
                            <X className="w-5 h-5 text-white/50" />
                        </button>
                    )}
                </div>
            </div>

            {showKeyboard && (
                <div className="mb-8 max-w-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <TVKeyboard
                        value={query}
                        onChange={setQuery}
                        onSubmit={handleKeyboardSubmit}
                        onClose={() => setShowKeyboard(false)}
                    />
                </div>
            )}

            <div className="mt-8">
                {isSearching ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-4 text-white/40">
                            <div className="w-14 h-14 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-lg">Buscando...</p>
                        </div>
                    </div>
                ) : results.length > 0 ? (
                    <>
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
                                <div key={movie.id} className="tv-row-item">
                                    <MovieCard movie={movie} mediaType="movie" />
                                </div>
                            ))}
                        </div>
                    </>
                ) : query && !showKeyboard ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/30">
                        <Frown className="w-20 h-20 mb-4 opacity-20" />
                        <p className="text-2xl font-medium mb-2">Sin resultados</p>
                        <p className="text-base mb-6">
                            No encontramos nada para &quot;{query}&quot;
                        </p>

                        {aiCorrection && (
                            <div className="flex items-center gap-2 bg-primary/10 px-5 py-3 rounded-xl border border-primary/20 animate-fade-in shadow-lg shadow-primary/5 mb-6">
                                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                                <span className="text-white/70">
                                    Quizás quisiste decir{' '}
                                </span>
                                <button
                                    onClick={() => {
                                        setQuery(aiCorrection);
                                        performSearch(aiCorrection);
                                        router.replace(`/search?q=${encodeURIComponent(aiCorrection)}`);
                                    }}
                                    className="text-primary font-bold hover:underline tv-focusable focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                                    data-focusable="true"
                                >
                                    {aiCorrection}
                                </button>
                                <span className="text-white/70">?</span>
                            </div>
                        )}

                        <button
                            onClick={() => setShowKeyboard(true)}
                            className="mt-4 px-6 py-3 bg-primary/15 text-primary border border-primary/20 rounded-xl font-medium hover:bg-primary/25 transition-colors tv-focusable focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            tabIndex={0}
                            data-focusable="true"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-white/20">
                        <Search className="w-24 h-24 mb-6 opacity-10" />
                        <p className="text-2xl font-medium">Empieza a escribir</p>
                        <p className="text-base mt-2">
                            Usa el teclado para buscar contenido
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
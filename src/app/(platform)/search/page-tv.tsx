'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Delete, ArrowLeft } from 'lucide-react';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import MovieCard from '@/components/features/MovieCard';
import { Movie, TVShow, MultiSearchResult } from '@/types/tmdb';

interface SearchPageTVProps {
    initialQuery: string;
    initialResults: MultiSearchResult[];
}

export default function SearchPageTV({ initialQuery, initialResults }: SearchPageTVProps) {
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<MultiSearchResult[]>(initialResults);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Enable spatial navigation
    useSpatialNavigation(containerRef, {
        enabled: true,
        focusOnMount: true
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query)}&tv=true`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && query.length > 0 && document.activeElement !== inputRef.current) {
            setQuery(prev => prev.slice(0, -1));
            inputRef.current?.focus();
        }
    };

    // Filter and map results for display
    const filteredResults = results
        .filter((item: MultiSearchResult) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: MultiSearchResult) => {
            if (item.media_type === 'tv') {
                const tv = item as TVShow;
                return {
                    ...tv,
                    title: tv.name,
                    original_title: tv.original_name,
                    release_date: tv.first_air_date,
                    media_type: 'tv',
                } as unknown as Movie;
            }
            return item as Movie;
        });

    return (
        <div
            ref={containerRef}
            className="min-h-screen p-8"
            onKeyDown={handleKeyDown}
        >
            {/* Search Header */}
            <div className="mb-12">
                <div className="flex items-center gap-4 mb-8">
                    <Search className="w-10 h-10 text-primary" />
                    <h1 className="text-4xl font-bold text-white">Buscar</h1>
                </div>

                <form onSubmit={handleSearch} className="relative max-w-3xl">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Escribe el título de una película o serie..."
                        className="w-full bg-white/10 border-2 border-white/10 text-white text-2xl px-8 py-6 rounded-2xl focus:outline-none focus:border-primary focus:bg-white/20 transition-all placeholder:text-white/30 tv-focusable"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors tv-focusable"
                    >
                        <Search className="w-6 h-6" />
                    </button>
                </form>

                <div className="mt-4 flex gap-4 text-text-secondary text-sm">
                    <span className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-white/10 rounded border border-white/10">Enter</kbd>
                        Buscar
                    </span>
                    <span className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-white/10 rounded border border-white/10">Esc</kbd>
                        Volver
                    </span>
                </div>
            </div>

            {/* Results Grid */}
            {filteredResults.length > 0 ? (
                <div>
                    <h2 className="text-2xl font-semibold text-white mb-6">
                        Resultados ({filteredResults.length})
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                        {filteredResults.map((movie) => (
                            <div key={movie.id} className="transform transition-transform duration-300 hover:scale-105">
                                <MovieCard
                                    movie={movie}
                                    mediaType={(movie as any).media_type === 'tv' ? 'tv' : 'movie'}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : query ? (
                <div className="flex flex-col items-center justify-center py-20 text-text-secondary opacity-50">
                    <Search className="w-24 h-24 mb-6" />
                    <p className="text-2xl">No se encontraron resultados para "{query}"</p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-text-secondary opacity-50">
                    <Search className="w-24 h-24 mb-6" />
                    <p className="text-2xl">Empieza a escribir para buscar</p>
                </div>
            )}
        </div>
    );
}

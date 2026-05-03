'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Film, Tv, User, Loader2, Clock, X } from 'lucide-react';
import { getPosterUrl, getProfileUrl } from '@/lib/tmdb/service';
import { MultiSearchResult, Movie, TVShow, Person } from '@/types/tmdb';
import { addToHistory, getHistory, clearHistory, SearchHistoryItem } from '@/lib/supabase/history';
import Image from 'next/image';

interface SearchInputProps {
    className?: string;
    placeholder?: string;
}

export default function SearchInput({ className = '', placeholder = 'Buscar...' }: SearchInputProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<MultiSearchResult[]>([]);
    const [history, setHistory] = useState<SearchHistoryItem[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Load history on mount
    useEffect(() => {
        const loadHistory = async () => {
            const data = await getHistory();
            setHistory(data);
        };
        loadHistory();
    }, []);

    // Clear search on page change
    useEffect(() => {
        setQuery('');
        setShowSuggestions(false);
    }, [pathname]);

    // Debounce search with AbortController so stale requests don't overwrite
    // results from a newer query that resolved faster.
    useEffect(() => {
        if (query.trim().length < 2) {
            setSuggestions([]);
            setShowSuggestions(query.trim().length === 0);
            return;
        }

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `/api/tmdb/search?query=${encodeURIComponent(query)}`,
                    { signal: controller.signal }
                );
                const data = await response.json();
                const filtered = (data.results ?? [])
                    .filter((item: MultiSearchResult) =>
                        item.media_type === 'movie' ||
                        item.media_type === 'tv' ||
                        item.media_type === 'person'
                    )
                    .slice(0, 5);
                setSuggestions(filtered);
                setShowSuggestions(true);
            } catch (e: any) {
                if (e.name !== 'AbortError') console.error('Search error:', e);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const trimmedQuery = query.trim();
            if (trimmedQuery) {
                await addToHistory(trimmedQuery);
                const newHistory = await getHistory();
                setHistory(newHistory);
                router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
                setShowSuggestions(false);
            }
        }
    };

    const handleHistoryClick = (historyQuery: string) => {
        router.push(`/search?q=${encodeURIComponent(historyQuery)}`);
        setShowSuggestions(false);
        setQuery('');
    };

    const handleClearHistory = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await clearHistory();
        setHistory([]);
    };

    const handleSuggestionClick = async (item: MultiSearchResult) => {
        if (item.media_type === 'movie') {
            router.push(`/movie/${item.id}`);
        } else if (item.media_type === 'tv') {
            router.push(`/tv/${item.id}`);
        } else if (item.media_type === 'person') {
            router.push(`/search?q=${encodeURIComponent((item as Person).name)}`);
        }
        setShowSuggestions(false);
        setQuery('');
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'movie': return <Film className="w-4 h-4" />;
            case 'tv': return <Tv className="w-4 h-4" />;
            case 'person': return <User className="w-4 h-4" />;
            default: return <Search className="w-4 h-4" />;
        }
    };

    const getImage = (item: MultiSearchResult) => {
        if (item.media_type === 'person') {
            return getProfileUrl((item as Person).profile_path);
        }
        return getPosterUrl((item as Movie | TVShow).poster_path);
    };

    const getTitle = (item: MultiSearchResult) => {
        if (item.media_type === 'movie') return (item as Movie).title;
        if (item.media_type === 'tv') return (item as TVShow).name;
        if (item.media_type === 'person') return (item as Person).name;
        return '';
    };

    const getYear = (item: MultiSearchResult) => {
        if (item.media_type === 'movie') return (item as Movie).release_date?.split('-')[0];
        if (item.media_type === 'tv') return (item as TVShow).first_air_date?.split('-')[0];
        return '';
    };

    return (
        <div ref={wrapperRef} className={`relative group ${className}`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {loading ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                    <Search className="h-4 w-4 text-text-secondary group-focus-within:text-primary transition-colors" />
                )}
            </div>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearch}
                onFocus={() => setShowSuggestions(true)}
                placeholder={placeholder}
                className="w-full bg-surface-light/30 border border-surface-light/50 text-text-primary text-sm rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary block pl-10 p-2.5 transition-all placeholder:text-text-muted hover:bg-surface-light/50 focus:bg-surface-light/50 outline-none tv-focusable"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && (query.length >= 2 || history.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-surface-light rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-2">
                        {/* History Section */}
                        {query.length < 2 && history.length > 0 && (
                            <div className="mb-2">
                                <div className="px-4 py-2 flex items-center justify-between text-xs text-text-muted uppercase font-semibold tracking-wider">
                                    <span>Recientes</span>
                                    <button onClick={handleClearHistory} className="hover:text-red-400 transition-colors">
                                        Borrar
                                    </button>
                                </div>
                                {history.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleHistoryClick(item.query)}
                                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-surface-light/50 transition-colors text-left group/item tv-focusable focus:bg-surface-light/80 focus:outline-none"
                                    >
                                        <Clock className="w-4 h-4 text-text-secondary" />
                                        <span className="text-sm text-text-primary group-hover/item:text-primary transition-colors">
                                            {item.query}
                                        </span>
                                    </button>
                                ))}
                                <div className="h-px bg-surface-light/50 my-2" />
                            </div>
                        )}

                        {/* Search Results */}
                        {suggestions.length > 0 && (
                            <>
                                {query.length >= 2 && (
                                    <div className="px-4 py-2 text-xs text-text-muted uppercase font-semibold tracking-wider">
                                        Sugerencias
                                    </div>
                                )}
                                {suggestions.map((item) => (
                                    <button
                                        key={`${item.media_type}-${item.id}`}
                                        onClick={() => handleSuggestionClick(item)}
                                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-surface-light/50 transition-colors text-left group/item tv-focusable focus:bg-surface-light/80 focus:outline-none"
                                    >
                                        <div className="relative w-8 h-12 flex-shrink-0 rounded overflow-hidden bg-surface-light">
                                            {getImage(item) ? (
                                                <Image
                                                    src={getImage(item)!}
                                                    alt={getTitle(item)}
                                                    fill
                                                    className="object-cover"
                                                    sizes="32px"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-text-muted">
                                                    {getIcon(item.media_type)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate group-hover/item:text-primary transition-colors">
                                                {getTitle(item)}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                                                <span className="capitalize flex items-center gap-1">
                                                    {getIcon(item.media_type)}
                                                    {item.media_type === 'movie' ? 'Película' : item.media_type === 'tv' ? 'Serie' : 'Persona'}
                                                </span>
                                                {getYear(item) && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{getYear(item)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}

                        {query.length >= 2 && suggestions.length === 0 && !loading && (
                            <div className="px-4 py-3 text-center text-text-muted text-sm">
                                No se encontraron resultados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

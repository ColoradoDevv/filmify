'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { trackSearch } from '@/lib/analytics';
import Image from 'next/image';
import {
    Search, Film, Tv, User, Loader2, Clock, X, CornerDownLeft,
} from 'lucide-react';
import { getPosterUrl, getProfileUrl } from '@/lib/tmdb/service';
import type { MultiSearchResult, Movie, TVShow, Person } from '@/types/tmdb';
import { searchTitles, type SearchResultItem } from '@/app/actions/search';
import {
    addToHistory, getHistory, clearHistory, SearchHistoryItem,
} from '@/lib/supabase/history';

// ── Helpers externos ─────────────────────────────────────────────────
const getIcon = (type: string) => {
    switch (type) {
        case 'movie':  return <Film className="w-4 h-4" />;
        case 'tv':     return <Tv className="w-4 h-4" />;
        case 'anime':  return <Tv className="w-4 h-4" />;
        case 'person': return <User className="w-4 h-4" />;
        default:       return <Search className="w-4 h-4" />;
    }
};

const getImage = (item: SearchResultItem | MultiSearchResult): string | null => {
    if (item.media_type === 'person') return getProfileUrl((item as Person).profile_path);
    return getPosterUrl((item as Movie | TVShow).poster_path);
};

const getTitle = (item: SearchResultItem | MultiSearchResult): string => {
    if (item.media_type === 'movie')  return (item as Movie).title;
    if (item.media_type === 'tv' || item.media_type === 'anime') return (item as TVShow).name;
    if (item.media_type === 'person') return (item as Person).name;
    return '';
};

const getYear = (item: SearchResultItem | MultiSearchResult): string => {
    if (item.media_type === 'movie')  return (item as Movie).release_date?.split('-')[0] ?? '';
    if (item.media_type === 'tv' || item.media_type === 'anime') return (item as TVShow).first_air_date?.split('-')[0] ?? '';
    return '';
};

// ── Tipos para el dropdown ────────────────────────────────────────────
type DropdownItem =
    | { type: 'history'; item: SearchHistoryItem }
    | { type: 'suggestion'; item: SearchResultItem };

interface SearchInputProps {
    className?: string;
    placeholder?: string;
}

export default function SearchInput({
    className = '',
    placeholder = 'Buscar películas, series, personas...',
}: SearchInputProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
    const [history, setHistory] = useState<SearchHistoryItem[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const isMounted = useRef(true);

    // Cargar historial
    useEffect(() => {
        isMounted.current = true;
        getHistory()
            .then(setHistory)
            .catch(() => setHistory([]));
        return () => { isMounted.current = false; };
    }, []);

    // Limpiar búsqueda al cambiar de página
    useEffect(() => {
        setQuery('');
        setShowSuggestions(false);
        setActiveIndex(-1);
    }, [pathname]);

    // Debounced search con AbortController
    useEffect(() => {
        if (query.trim().length < 2) {
            setSuggestions([]);
            setActiveIndex(-1);
            return;
        }

        // Usa el mismo server action que la página de búsqueda: solo devuelve
        // títulos reproducibles (películas + series), sin personas ni títulos
        // no disponibles en el proveedor.
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const items = await searchTitles(query.trim());
                if (cancelled || !isMounted.current) return;
                setSuggestions(items.slice(0, 6));
                setActiveIndex(-1);
            } catch (e) {
                if (!cancelled) console.error('Search error:', e);
            } finally {
                if (!cancelled && isMounted.current) setLoading(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query]);

    // Clic fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
                setActiveIndex(-1);
                inputRef.current?.blur();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Funciones de navegación ────────────────────────────────────
    const goToSearch = useCallback(
        async (searchQuery: string) => {
            const trimmed = searchQuery.trim();
            if (!trimmed) return;
            trackSearch(trimmed);
            try {
                await addToHistory(trimmed);
                const updated = await getHistory();
                if (isMounted.current) setHistory(updated);
            } catch {}
            router.push(`/search?q=${encodeURIComponent(trimmed)}`);
            setShowSuggestions(false);
            setActiveIndex(-1);
            setQuery('');
            inputRef.current?.blur();
        },
        [router]
    );

    const goToItem = useCallback(
        async (item: SearchResultItem | MultiSearchResult) => {
            const name = getTitle(item);
            if (name) {
                try { await addToHistory(name); } catch {}
            }

            if (item.media_type === 'movie') router.push(`/movie/${item.id}`);
            else if (item.media_type === 'tv' || item.media_type === 'anime') router.push(`/tv/${item.id}`);
            else if (item.media_type === 'person') router.push(`/search?q=${encodeURIComponent(name)}`);

            setShowSuggestions(false);
            setActiveIndex(-1);
            setQuery('');
            inputRef.current?.blur();
        },
        [router]
    );

    // ── Manejadores de eventos ─────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setShowSuggestions(true);
        setActiveIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions) return;

        const allItems: DropdownItem[] = [
            ...history.map((h) => ({ type: 'history' as const, item: h })),
            ...suggestions.map((s) => ({ type: 'suggestion' as const, item: s })),
        ];
        const totalItems = allItems.length;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < totalItems) {
                const selected = allItems[activeIndex];
                if (selected.type === 'history') {
                    goToSearch(selected.item.query);
                } else {
                    goToItem(selected.item);
                }
            } else if (query.trim()) {
                goToSearch(query);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setActiveIndex(-1);
            inputRef.current?.blur();
        }
    };

    const handleClear = () => {
        setQuery('');
        setSuggestions([]);
        setActiveIndex(-1);
    };

    const showDropdown = showSuggestions && (query.trim().length >= 2 || history.length > 0);

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            {/* Contenedor del input con botón de limpiar y buscar */}
            <div className="relative flex items-center group">
                {/* Icono de búsqueda / loader */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {loading ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 text-text-secondary group-focus-within:text-primary transition-colors" />
                    )}
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={placeholder}
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    aria-controls="search-suggestions"
                    className="w-full bg-surface-light/30 border border-surface-light/50 text-text-primary text-sm rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary block pl-10 pr-20 py-2.5 transition-all placeholder:text-text-muted hover:bg-surface-light/50 focus:bg-surface-light/50 outline-none tv-focusable"
                />

                {/* Acciones a la derecha */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {query && (
                        <button
                            onClick={handleClear}
                            className="p-1 rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => goToSearch(query)}
                        disabled={!query.trim()}
                        className="p-1 rounded-full bg-primary/20 hover:bg-primary/40 text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Buscar"
                    >

                        <CornerDownLeft className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Dropdown de sugerencias */}
            {showDropdown && (
                <ul
                    id="search-suggestions"
                    ref={listRef}
                    className="absolute top-full left-0 right-0 mt-2 py-2 bg-surface border border-surface-light rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
                    role="listbox"
                    aria-label="Sugerencias de búsqueda"
                >
                        {/* Sección de historial */}
                        {query.trim().length < 2 && history.length > 0 && (
                            <li role="presentation">
                                <div className="px-4 py-2 flex items-center justify-between">
                                    <span className="text-xs text-text-muted uppercase font-semibold tracking-wider">
                                        Recientes
                                    </span>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            await clearHistory();
                                            if (isMounted.current) setHistory([]);
                                        }}
                                        className="text-xs text-text-muted hover:text-red-400 transition-colors"
                                    >
                                        Borrar
                                    </button>
                                </div>
                            </li>
                        )}
                        {query.trim().length < 2 && history.length > 0 &&
                            history.map((item, idx) => (
                                <li
                                    key={item.id}
                                    role="option"
                                    aria-selected={activeIndex === idx}
                                    onClick={() => goToSearch(item.query)}
                                    className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-surface-light/50 transition-colors text-left cursor-pointer tv-focusable focus:bg-surface-light/80 focus:outline-none ${
                                        activeIndex === idx ? 'bg-surface-light/80 ring-1 ring-primary/30' : ''
                                    }`}
                                >
                                    <Clock className="w-4 h-4 text-text-secondary" />
                                    <span className="text-sm text-text-primary">
                                        {item.query}
                                    </span>
                                </li>
                            ))}

                        {/* Sección de sugerencias */}
                        {query.trim().length >= 2 && suggestions.length > 0 && (
                            <li role="presentation">
                                <div className="px-4 py-2 text-xs text-text-muted uppercase font-semibold tracking-wider">
                                    Sugerencias
                                </div>
                            </li>
                        )}
                        {query.trim().length >= 2 && suggestions.length > 0 &&
                            suggestions.map((item, idx) => {
                                    const globalIdx = history.length + idx;
                                    return (
                                        <li
                                            key={`${item.media_type}-${item.id}`}
                                            role="option"
                                            aria-selected={activeIndex === globalIdx}
                                            onClick={() => goToItem(item)}
                                            className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-surface-light/50 transition-colors text-left cursor-pointer tv-focusable focus:bg-surface-light/80 focus:outline-none ${
                                                activeIndex === globalIdx ? 'bg-surface-light/80 ring-1 ring-primary/30' : ''
                                            }`}
                                        >
                                            <div className="relative w-10 h-14 flex-shrink-0 rounded bg-surface-light overflow-hidden shadow-md">
                                                {getImage(item) ? (
                                                    <Image
                                                        src={getImage(item)!}
                                                        alt={getTitle(item)}
                                                        fill
                                                        className="object-cover"
                                                        sizes="40px"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {getIcon(item.media_type)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-text-primary font-medium truncate">
                                                        {getTitle(item)}
                                                    </span>
                                                    <span className="text-xs text-text-muted flex-shrink-0">
                                                        {getYear(item)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                                                    {getIcon(item.media_type)}
                                                    <span className="capitalize">
                                                        {item.media_type === 'tv' ? 'Serie' : item.media_type === 'movie' ? 'Película' : 'Persona'}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}

                        {/* Sin resultados */}
                        {query.trim().length >= 2 && suggestions.length === 0 && !loading && (
                            <li className="px-4 py-8 text-center text-text-muted" role="presentation">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No se encontraron resultados</p>
                            </li>
                        )}
                </ul>
            )}
        </div>
    );
}
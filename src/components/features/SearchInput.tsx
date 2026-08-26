'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { trackSearch } from '@/lib/analytics';
import Image from 'next/image';
import {
    Search, Film, Tv, User, Loader2, Clock, X, CornerDownLeft, ArrowLeft,
} from 'lucide-react';
import { getPosterUrl, getProfileUrl } from '@/server/services/tmdb';
import type { MultiSearchResult, Movie, TVShow, Person } from '@/types/tmdb';
import { suggestTitles, type SearchResultItem } from '@/app/actions/search';
import {
    addToHistory, getHistory, clearHistory, removeFromHistory, SearchHistoryItem,
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

/**
 * Resalta en negrita el trozo que coincide con lo tecleado.
 *
 * Es lo que hace que el desplegable de Google o YouTube se lea de un vistazo:
 * el ojo salta a la diferencia en vez de leer cada fila entera.
 */
function Highlight({ text, match }: { text: string; match: string }) {
    const needle = match.trim();
    if (!needle) return <>{text}</>;

    const at = text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
    if (at === -1) return <>{text}</>;

    return (
        <>
            {text.slice(0, at)}
            <mark className="bg-transparent text-primary font-semibold">
                {text.slice(at, at + needle.length)}
            </mark>
            {text.slice(at + needle.length)}
        </>
    );
}

/** Búsquedas recientes que encajan con lo tecleado. */
const MAX_HISTORY_WHILE_TYPING = 3;

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
    const searchParams = useSearchParams();

    // Se inicializa ya con la consulta activa, no en un efecto: si no, el
    // servidor pintaría la caja vacía y se rellenaría al hidratar, con parpadeo.
    const [query, setQuery] = useState(
        () => (pathname === '/search' ? (searchParams.get('q') ?? '') : ''),
    );
    const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
    const [history, setHistory] = useState<SearchHistoryItem[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    /**
     * Buscador a pantalla completa, solo por debajo de `lg`.
     *
     * En móvil el desplegable vivía dentro de una cabecera de 56 px: con seis
     * sugerencias con póster no cabía nada. Google y YouTube toman la pantalla
     * entera al enfocar, y aquí se hace igual. En escritorio no cambia nada.
     */
    const [expanded, setExpanded] = useState(false);

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

    // Al cambiar de página se limpia la caja... salvo en /search, donde esta
    // barra ES el buscador de la pantalla: allí muestra la consulta activa para
    // que se pueda corregir sin volver a escribirla entera.
    useEffect(() => {
        setQuery(pathname === '/search' ? (searchParams.get('q') ?? '') : '');
        setShowSuggestions(false);
        setActiveIndex(-1);
    }, [pathname, searchParams]);

    // Debounced search con AbortController
    useEffect(() => {
        if (query.trim().length < 2) {
            setSuggestions([]);
            setActiveIndex(-1);
            return;
        }

        // `suggestTitles` y no `searchTitles`: el segundo sondea el proveedor
        // título a título y tarda entre 0,7 y 1,6 s (medido). Para un desplegable
        // que se refresca al teclear eso es inaceptable — el filtro de
        // disponibilidad se aplica al aterrizar en /search.
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const items = await suggestTitles(query.trim());
                if (cancelled || !isMounted.current) return;
                setSuggestions(items);
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

    /** ¿Estamos en escritorio? El breakpoint `lg` de Tailwind son 1024 px. */
    const isDesktop = useCallback(
        () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
        [],
    );

    const closeExpanded = useCallback(() => {
        setExpanded(false);
        setShowSuggestions(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
    }, []);

    // Con la capa abierta, el fondo no debe desplazarse.
    useEffect(() => {
        if (!expanded) return;
        const previo = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previo; };
    }, [expanded]);

    // Al pasar a escritorio con la capa abierta hay que cerrarla, o el layout
    // se queda con un `fixed` que allí no pinta nada.
    useEffect(() => {
        if (!expanded) return;
        const mql = window.matchMedia('(min-width: 1024px)');
        const onChange = () => { if (mql.matches) setExpanded(false); };
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [expanded]);

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
            setExpanded(false);
            setShowSuggestions(false);
            setActiveIndex(-1);
            // No se vacía la caja: en /search el efecto de arriba la sincroniza
            // con `?q=`, y limpiarla aquí provocaría un parpadeo.
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

            if (item.media_type === 'movie') {
                router.push(`/movie/${item.id}`);
            } else if (item.media_type === 'anime') {
                // Módulo de anime propio. Si no tenemos el id de AniList,
                // /tv/[tmdbId] redirige al mismo sitio.
                const anilistId = (item as SearchResultItem).anilist_id;
                router.push(anilistId ? `/anime/${anilistId}` : `/tv/${item.id}`);
            } else if (item.media_type === 'tv') {
                router.push(`/tv/${item.id}`);
            } else if (item.media_type === 'person') {
                router.push(`/search?q=${encodeURIComponent(name)}`);
            }

            setExpanded(false);
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

        // Sobre `visibleHistory`, no sobre `history`: al teclear solo se pintan
        // las recientes que coinciden, y usar la lista completa desplazaba el
        // índice —la flecha abajo seleccionaba filas que no estaban en pantalla.
        const allItems: DropdownItem[] = [
            ...visibleHistory.map((h) => ({ type: 'history' as const, item: h })),
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
            // Cierra también la capa de móvil, no solo el desplegable.
            closeExpanded();
        }
    };

    const handleClear = () => {
        setQuery('');
        setSuggestions([]);
        setActiveIndex(-1);
    };

    /**
     * Recientes que se muestran.
     *
     * Antes el desplegable era excluyente: historial con menos de 2 caracteres,
     * sugerencias a partir de ahí. Al empezar a escribir desaparecían tus
     * búsquedas anteriores, justo cuando más sirven. Google y YouTube las
     * mantienen arriba filtradas por lo tecleado, y es lo que se hace aquí.
     */
    const visibleHistory = (() => {
        const q = query.trim().toLocaleLowerCase();
        if (q.length < 2) return history;
        return history
            .filter((h) => h.query.toLocaleLowerCase().includes(q) && h.query.toLocaleLowerCase() !== q)
            .slice(0, MAX_HISTORY_WHILE_TYPING);
    })();

    const showDropdown = showSuggestions && (query.trim().length >= 2 || visibleHistory.length > 0);

    return (
        <div
            ref={wrapperRef}
            className={
                expanded
                    // Capa a pantalla completa — solo por debajo de lg. A partir de
                    // ahí las utilidades `lg:` devuelven el componente a su sitio en
                    // la cabecera, así que en escritorio el estado es inocuo.
                    ? 'fixed inset-0 z-[60] flex flex-col bg-background p-3 lg:static lg:z-auto lg:block lg:bg-transparent lg:p-0'
                    : `relative ${className}`
            }
        >
            {/* Contenedor del input con botón de limpiar y buscar */}
            <div className="relative flex items-center group">
                {/* Volver — solo con la capa abierta */}
                {expanded && (
                    <button
                        type="button"
                        onClick={closeExpanded}
                        aria-label="Cerrar búsqueda"
                        className="shrink-0 mr-1 p-2 rounded-full text-text-secondary hover:text-white hover:bg-white/10 transition-colors lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                {/* Icono de búsqueda / loader */}
                <div className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${expanded ? 'left-[52px] lg:left-3' : 'left-3'}`}>
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
                    onFocus={() => {
                        setShowSuggestions(true);
                        if (!isDesktop()) setExpanded(true);
                    }}
                    placeholder={placeholder}
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    aria-controls="search-suggestions"
                    className={`w-full bg-surface-light/30 border border-surface-light/50 text-text-primary text-sm rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary block pr-20 py-2.5 transition-all placeholder:text-text-muted hover:bg-surface-light/50 focus:bg-surface-light/50 outline-none tv-focusable ${
                        expanded ? 'pl-11 lg:pl-10' : 'pl-10'
                    }`}
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
                    className={
                        expanded
                            // En la capa ocupa el alto que queda y hace scroll
                            // solo; en escritorio vuelve a flotar bajo el input.
                            ? 'flex-1 min-h-0 overflow-y-auto mt-2 py-2 bg-transparent lg:absolute lg:top-full lg:left-0 lg:right-0 lg:flex-none lg:max-h-none lg:bg-surface lg:border lg:border-surface-light lg:rounded-xl lg:shadow-xl lg:z-50'
                            : 'absolute top-full left-0 right-0 mt-2 py-2 bg-surface border border-surface-light rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200'
                    }
                    role="listbox"
                    aria-label="Sugerencias de búsqueda"
                >
                        {/* Sección de historial — también mientras se teclea, filtrada */}
                        {visibleHistory.length > 0 && (
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
                        {visibleHistory.map((item, idx) => (
                            <li
                                key={item.id}
                                role="option"
                                aria-selected={activeIndex === idx}
                                onClick={() => goToSearch(item.query)}
                                className={`group/hist w-full px-4 py-2.5 flex items-center gap-3 hover:bg-surface-light/50 transition-colors text-left cursor-pointer tv-focusable focus:bg-surface-light/80 focus:outline-none ${
                                    activeIndex === idx ? 'bg-surface-light/80 ring-1 ring-primary/30' : ''
                                }`}
                            >
                                <Clock className="w-4 h-4 text-text-secondary shrink-0" />
                                <span className="flex-1 text-sm text-text-primary truncate">
                                    <Highlight text={item.query} match={query} />
                                </span>
                                {/* Quitar solo esta. Antes era todo o nada, así que
                                    borrar una búsqueda incómoda costaba perder el resto. */}
                                <button
                                    type="button"
                                    aria-label={`Quitar "${item.query}" de recientes`}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        setHistory((prev) => prev.filter((h) => h.id !== item.id));
                                        try {
                                            await removeFromHistory(item.id);
                                        } catch {
                                            // Si falla, se recupera del servidor en vez de
                                            // dejar la lista mintiendo.
                                            const fresh = await getHistory().catch(() => null);
                                            if (fresh && isMounted.current) setHistory(fresh);
                                        }
                                    }}
                                    className="shrink-0 p-1 rounded-full text-text-muted opacity-0 group-hover/hist:opacity-100 focus:opacity-100 hover:text-red-400 hover:bg-white/5 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
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
                                    const globalIdx = visibleHistory.length + idx;
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
                                                        <Highlight text={getTitle(item)} match={query} />
                                                    </span>
                                                    <span className="text-xs text-text-muted flex-shrink-0">
                                                        {getYear(item)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                                                    {getIcon(item.media_type)}
                                                    <span className="capitalize">
                                                        {item.media_type === 'tv'
                                                            ? 'Serie'
                                                            : item.media_type === 'anime'
                                                            ? 'Anime'
                                                            : item.media_type === 'movie'
                                                            ? 'Película'
                                                            : 'Persona'}
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

                        {/* Buscar el texto literal.
                            Pulsar Enter ya hacía esto, pero no se veía por ningún
                            lado: quien no lo sabía se quedaba encerrado en las
                            sugerencias. Google y YouTube ofrecen siempre esta
                            salida, y aquí importa más porque las sugerencias no
                            comprueban disponibilidad — es /search quien filtra. */}
                        {query.trim().length >= 2 && (
                            <li
                                role="option"
                                aria-selected={false}
                                onClick={() => goToSearch(query)}
                                className="w-full px-4 py-2.5 flex items-center gap-3 border-t border-surface-light/60 hover:bg-surface-light/50 transition-colors cursor-pointer focus:outline-none"
                            >
                                <Search className="w-4 h-4 text-primary shrink-0" />
                                <span className="flex-1 text-sm text-text-primary truncate">
                                    Buscar <span className="font-semibold">«{query.trim()}»</span>
                                </span>
                                <CornerDownLeft className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            </li>
                        )}
                </ul>
            )}
        </div>
    );
}
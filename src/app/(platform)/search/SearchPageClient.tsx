'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, Sparkles, Frown } from 'lucide-react';
import MovieCard from '@/components/features/MovieCard';
import { searchTitles, type SearchResultItem } from '@/app/actions/search';
import { getSearchCorrection } from '@/lib/ai';
import AdBanner2 from '@/components/ads/AdBanner2';

interface SearchPageClientProps {
    initialQuery: string;
    initialResults: SearchResultItem[];
}

const DEBOUNCE_MS = 350;

export default function SearchPageClient({
    initialQuery,
    initialResults,
}: SearchPageClientProps) {
    const router = useRouter();

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResultItem[]>(initialResults);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(Boolean(initialQuery));
    const [aiCorrection, setAiCorrection] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Token para descartar respuestas de búsquedas obsoletas (race conditions).
    const reqRef = useRef(0);

    const runSearch = useCallback(async (raw: string) => {
        const q = raw.trim();
        if (!q) {
            setResults([]);
            setAiCorrection(null);
            setHasSearched(false);
            setIsSearching(false);
            return;
        }

        const token = ++reqRef.current;
        setIsSearching(true);
        setAiCorrection(null);

        try {
            const items = await searchTitles(q);
            if (token !== reqRef.current) return; // llegó una búsqueda más nueva
            setResults(items);
            setHasSearched(true);

            if (items.length === 0) {
                // Sugerencia de la IA solo cuando no hay resultados.
                try {
                    const correction = await getSearchCorrection(q);
                    if (token === reqRef.current) setAiCorrection(correction);
                } catch {
                    /* IA opcional — si falla, sin sugerencia */
                }
            }
        } catch (error) {
            console.error('[search] error:', error);
            if (token === reqRef.current) setResults([]);
        } finally {
            if (token === reqRef.current) setIsSearching(false);
        }
    }, []);

    // Búsqueda con debounce al teclear.
    const onChange = useCallback((value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            runSearch(value);
            // Mantener la URL en sync (compartible, atrás/adelante).
            const q = value.trim();
            router.replace(q ? `/search?q=${encodeURIComponent(q)}` : '/search', { scroll: false });
        }, DEBOUNCE_MS);
    }, [runSearch, router]);

    const handleClear = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setQuery('');
        setResults([]);
        setAiCorrection(null);
        setHasSearched(false);
        router.replace('/search', { scroll: false });
        inputRef.current?.focus();
    }, [router]);

    // Sincroniza con la query inicial (navegación directa / atrás-adelante).
    useEffect(() => {
        setQuery(initialQuery);
        setResults(initialResults);
        setHasSearched(Boolean(initialQuery));
        setAiCorrection(null);
    }, [initialQuery, initialResults]);

    // Evitar forzar foco en móvil.
    // El teclado nativo se abre con el foco automático del input.
    // El usuario podrá tocar el input para escribir.
    // (Mantener el comportamiento en desktop puede ser útil,
    // pero aquí se desactiva para que no aparezca el teclado.)
    // useEffect(() => {
    //     inputRef.current?.focus();
    // }, []);


    const applyCorrection = (text: string) => {
        setQuery(text);
        runSearch(text);
        router.replace(`/search?q=${encodeURIComponent(text)}`, { scroll: false });
    };

    return (
        <div className="min-h-screen sm:p-2 lg:p-8">
            {/* ── Encabezado ── */}
            <div className="mb-6 sm:mb-8">
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Buscar</h1>
                    <p className="text-white/40 text-sm mt-0.5">Películas, series y anime disponibles</p>
                </div>

                {/* ── Input nativo de búsqueda ── */}
                <div className="relative w-full max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="search"
                        inputMode="search"
                        autoComplete="off"
                        enterKeyHint="search"
                        value={query}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Buscar películas, series y anime…"
                        aria-label="Buscar películas, series y anime"
                        className="w-full h-12 sm:h-14 pl-12 pr-12 rounded-2xl bg-surface-container border-2 border-outline-variant text-white text-base sm:text-lg placeholder:text-white/30 focus:outline-none focus:border-primary focus:bg-primary/5 transition-all"
                    />
                    {isSearching ? (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
                    ) : query ? (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="w-5 h-5 text-white/50" />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* ── Resultados ── */}
            <div className="mt-6">
                {isSearching && results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/40">
                        <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p>Buscando…</p>
                    </div>
                ) : results.length > 0 ? (
                    <>
                        <div className="flex items-center gap-3 mb-5">
                            <h2 className="text-lg sm:text-xl font-semibold text-white">Resultados</h2>
                            <span className="px-2.5 py-0.5 bg-primary/15 text-primary text-sm font-medium rounded-full border border-primary/20">
                                {results.length}
                            </span>
                        </div>

                        {/* 📢 Banner publicitario — discreto, entre header y grilla */}
                        <div className="mb-6 opacity-90 hover:opacity-100 transition-opacity">
                            <AdBanner2 />
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                            {results.map((item) => (
                                <MovieCard
                                    key={`${item.media_type}-${item.id}`}
                                    movie={item}
                                    mediaType={item.media_type === 'movie' ? 'movie' : 'tv'}
                                />
                            ))}
                        </div>
                    </>
                ) : hasSearched && query.trim() ? (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-white/40 text-center px-4">
                        <Frown className="w-16 h-16 sm:w-20 sm:h-20 mb-4 opacity-20" />
                        <p className="text-xl sm:text-2xl font-medium mb-2">Sin resultados disponibles</p>
                        <p className="text-sm sm:text-base mb-2 max-w-md">
                            No encontramos películas, series ni anime reproducibles para &quot;{query.trim()}&quot;.
                        </p>

                        {aiCorrection && (
                            <div className="flex flex-wrap items-center justify-center gap-1.5 bg-primary/10 px-5 py-3 rounded-xl border border-primary/20 mt-4">
                                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                                <span className="text-white/70">¿Quisiste decir</span>
                                <button
                                    onClick={() => applyCorrection(aiCorrection)}
                                    className="text-primary font-bold hover:underline"
                                >
                                    {aiCorrection}
                                </button>
                                <span className="text-white/70">?</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-white/25 text-center px-4">
                        <Search className="w-20 h-20 sm:w-24 sm:h-24 mb-5 opacity-10" />
                        <p className="text-xl sm:text-2xl font-medium">Empieza a escribir</p>
                        <p className="text-sm sm:text-base mt-2">Encuentra películas, series y anime para ver al instante</p>
                    </div>
                )}
            </div>
        </div>
    );
}

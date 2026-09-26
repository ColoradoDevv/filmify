'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Sparkles, Frown } from 'lucide-react';
import MovieCard from '@/components/features/MovieCard';
import { type SearchResultItem } from '@/app/actions/search';
import { getSearchCorrection } from '@/lib/ai';
import { AdSlot } from '@/components/ads';

interface SearchPageClientProps {
    initialQuery: string;
    initialResults: SearchResultItem[];
}

/**
 * Resultados de búsqueda.
 *
 * Esta pantalla NO tiene barra de búsqueda propia. La consulta llega siempre
 * por `?q=`, escrita en la única barra del sitio, la del navbar.
 *
 * Antes había dos a la vista y no se sabía cuál era cuál: la del navbar guarda
 * historial y sugiere mientras escribes; la de aquí solo buscaba. Encima el
 * input de esta usaba `type="search"`, así que Chromium pintaba su X nativa
 * junto a la del componente y salían dos aspas para lo mismo.
 *
 * Lo único que sobrevive de la lógica de esta pantalla es la corrección por IA
 * («¿quisiste decir…?»), que solo tiene sentido cuando ya no hay resultados.
 */
export default function SearchPageClient({
    initialQuery,
    initialResults,
}: SearchPageClientProps) {
    const router = useRouter();

    const [results, setResults] = useState<SearchResultItem[]>(initialResults);
    const [navigating, setNavigating] = useState(false);
    const [aiCorrection, setAiCorrection] = useState<string | null>(null);

    // Descarta respuestas de la IA que lleguen tarde, tras otra búsqueda.
    const reqRef = useRef(0);

    const hasSearched = Boolean(initialQuery);

    const pedirCorreccion = useCallback(async (q: string, items: SearchResultItem[]) => {
        if (items.length > 0) return;
        const token = reqRef.current;
        try {
            const correction = await getSearchCorrection(q);
            if (token === reqRef.current) setAiCorrection(correction);
        } catch {
            /* La IA es opcional: si falla, simplemente no hay sugerencia. */
        }
    }, []);

    // El servidor ya resolvió la búsqueda; esto sincroniza al navegar
    // (atrás/adelante, o una consulta nueva escrita en el navbar).
    useEffect(() => {
        reqRef.current++;
        setResults(initialResults);
        setAiCorrection(null);
        setNavigating(false);
        if (initialQuery) void pedirCorreccion(initialQuery, initialResults);
    }, [initialQuery, initialResults, pedirCorreccion]);

    const applyCorrection = (text: string) => {
        // Misma consulta: no hay navegación y el spinner se quedaría colgado.
        if (text === initialQuery) return;
        setNavigating(true);
        router.push(`/search?q=${encodeURIComponent(text)}`);
    };

    return (
        <div className="min-h-screen sm:p-2 lg:p-8">
            {/* ── Encabezado ── */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {initialQuery ? `Resultados para «${initialQuery}»` : 'Buscar'}
                </h1>
                <p className="text-white/40 text-sm mt-0.5">
                    {initialQuery
                        ? 'Películas, series y anime disponibles'
                        : 'Usa la barra de búsqueda de arriba para empezar'}
                </p>
            </div>

            {/* ── Resultados ── */}
            <div className="mt-6">
                {navigating ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/40">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
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
                        <AdSlot className="mt-0 mb-6" />

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                            {results.map((item) => (
                                <MovieCard
                                    key={`${item.media_type}-${item.id}`}
                                    movie={item}
                                    mediaType={item.media_type}
                                    // El anime tiene ficha propia en /anime/[anilistId];
                                    // sin id de AniList cae a /tv, que redirige igual.
                                    // Se pasa el id, no la URL: la ruta la compone
                                    // la tarjeta a partir de un entero.
                                    anilistId={
                                        item.media_type === 'anime' ? item.anilist_id : undefined
                                    }
                                />
                            ))}
                        </div>
                    </>
                ) : hasSearched ? (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-white/40 text-center px-4">
                        <Frown className="w-16 h-16 sm:w-20 sm:h-20 mb-4 opacity-20" />
                        <p className="text-xl sm:text-2xl font-medium mb-2">Sin resultados disponibles</p>
                        <p className="text-sm sm:text-base mb-2 max-w-md">
                            No encontramos películas, series ni anime reproducibles para &quot;{initialQuery}&quot;.
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
                        <p className="text-sm sm:text-base mt-2">
                            Busca películas, series y anime desde la barra de arriba
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

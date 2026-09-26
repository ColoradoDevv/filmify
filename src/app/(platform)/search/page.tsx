import type { Metadata } from 'next';
import { Suspense } from 'react';
import { searchTitles, type SearchResultItem } from '@/app/actions/search';
import SearchPageClient from './SearchPageClient';

export const metadata: Metadata = {
    title: { absolute: 'Buscar películas y series | FilmiFy' },
    description:
        'Busca cualquier película o serie disponible para ver online gratis en FilmiFy.',
    alternates: { canonical: '/search' },
};

type SearchPageProps = {
    searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const resolved = await searchParams;
    const rawQuery = resolved.q;
    const query = Array.isArray(rawQuery) ? rawQuery[0] ?? '' : rawQuery ?? '';
    const trimmed = query.trim();

    // El shell (layout + encabezado) se sirve al instante y los resultados
    // hacen streaming cuando resuelven: antes el TTFB esperaba las sondas
    // (0,7-1,6 s+) sin pintar nada.
    return (
        <Suspense key={trimmed} fallback={<SearchSkeleton query={trimmed} />}>
            <SearchLoader query={trimmed} />
        </Suspense>
    );
}

/** Búsqueda multi filtrada por disponibilidad (cara: sondas por ítem). */
async function SearchLoader({ query }: { query: string }) {
    let initialResults: SearchResultItem[] = [];
    if (query) {
        initialResults = await searchTitles(query);
    }
    return (
        <SearchPageClient
            initialQuery={query}
            initialResults={initialResults}
        />
    );
}

/** Esqueleto mientras los resultados hacen streaming. */
function SearchSkeleton({ query }: { query: string }) {
    return (
        <div className="min-h-screen sm:p-2 lg:p-8" aria-busy="true" aria-live="polite">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {query ? `Resultados para «${query}»` : 'Buscar'}
                </h1>
                <p className="text-white/40 text-sm mt-0.5">Buscando…</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                {Array.from({ length: 14 }).map((_, i) => (
                    <div
                        key={i}
                        className="aspect-[2/3] rounded-lg bg-white/5 border border-white/5 animate-pulse"
                    />
                ))}
            </div>
        </div>
    );
}
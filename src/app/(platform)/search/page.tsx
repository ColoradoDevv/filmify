import { searchMovies } from '@/lib/tmdb/service';
import MovieCard from '@/components/features/MovieCard';
import type { Movie } from '@/types/tmdb';
import { Search, Frown, Sparkles } from 'lucide-react';
import { getSearchCorrection } from '@/lib/ai';
import Link from 'next/link';
import { isTVDevice } from '@/lib/device-detection';
import SearchPageTV from './page-tv';
import TVLayoutWrapper from '@/components/layout/TVLayoutWrapper';
import TVSidebar from '@/components/layout/TVSidebar';

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q: string; tv?: string }>;
}) {
    const { q, tv } = await searchParams;
    const query = q || '';
    const { results } = await searchMovies(query);

    const filteredResults = results as Movie[];

    const isGlobalTV = await isTVDevice();
    const isManualTV = tv === 'true';

    if (isGlobalTV) {
        return <SearchPageTV initialQuery={query} initialResults={filteredResults} />;
    }

    if (isManualTV) {
        return (
            <TVLayoutWrapper
                forceTVMode={true}
                tvLayout={
                    <>
                        <TVSidebar />
                        <main className="ml-16 lg:ml-24 p-4 lg:p-8 min-h-screen overflow-x-hidden">
                            <SearchPageTV initialQuery={query} initialResults={filteredResults} />
                        </main>
                    </>
                }>
                <div />
            </TVLayoutWrapper>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Search className="w-8 h-8 text-primary" />
                    Resultados de búsqueda: <span className="text-primary">"{query}"</span>
                </h1>
                <p className="text-text-secondary">
                    Encontramos {filteredResults.length} coincidencias para tu búsqueda
                </p>
            </div>

            {filteredResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {filteredResults.map((movie: Movie) => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            mediaType="movie"
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                    <Frown className="w-20 h-20 mb-4 opacity-20" />
                    <h2 className="text-2xl font-semibold mb-2">No encontramos nada</h2>
                    <p className="mb-6">Intenta con otros términos de búsqueda</p>

                    {/* AI Correction */}
                    {await (async () => {
                        const correction = await getSearchCorrection(query);
                        if (correction) {
                            return (
                                <div className="flex items-center gap-2 bg-primary/10 px-4 py-3 rounded-xl border border-primary/20 animate-fade-in">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span>¿Quisiste decir </span>
                                    <Link href={`/search?q=${encodeURIComponent(correction)}`} className="text-primary font-bold hover:underline">
                                        {correction}
                                    </Link>
                                    <span>?</span>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            )}
        </div>
    );
}

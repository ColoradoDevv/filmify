import { searchMulti } from '@/lib/tmdb/service';
import MovieCard from '@/components/features/MovieCard';
import { Movie, TVShow, MultiSearchResult } from '@/types/tmdb';
import { Search, Frown, Sparkles } from 'lucide-react';
import { getSearchCorrection } from '@/lib/ai';
import Link from 'next/link';

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q: string }>;
}) {
    const { q } = await searchParams;
    const query = q || '';
    const { results } = await searchMulti(query);

    // Filter and map results
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
                    {filteredResults.map((movie) => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            mediaType={(movie as any).media_type === 'tv' ? 'tv' : 'movie'}
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

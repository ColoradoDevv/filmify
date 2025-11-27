import { getTrending } from '@/lib/tmdb/service';
import MovieCard from '@/components/features/MovieCard';
import { Sparkles } from 'lucide-react';

export default async function BrowsePage() {
    // Fetch trending movies on the server
    const trendingData = await getTrending('movie', 'week', 1);
    const movies = trendingData.results;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold">Tendencias de la Semana</h1>
                    <p className="text-text-secondary mt-1">
                        Las películas más populares del momento
                    </p>
                </div>
            </div>

            {/* Movies Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {movies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>

            {/* Load More Section */}
            <div className="text-center py-8">
                <button className="px-6 py-3 bg-surface hover:bg-surface-hover border border-surface-light rounded-lg font-medium transition-colors">
                    Cargar más películas
                </button>
            </div>
        </div>
    );
}

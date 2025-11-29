import { getTrending } from '@/lib/tmdb/service';
import MovieCard from '@/components/features/MovieCard';
import FilterBar from '@/components/features/FilterBar';
import AIRecommendations from '@/components/features/AIRecommendations';
import { TrendingUp, Filter, Sparkles } from 'lucide-react';

export default async function BrowsePage() {
    // Fetch trending movies on the server
    const trendingData = await getTrending('movie', 'week', 1);
    const movies = trendingData.results;

    return (
        <div className="space-y-8 pb-20">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden mb-12 border border-white/5 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-surface to-accent/10 opacity-50" />
                <div className="absolute inset-0 backdrop-blur-3xl" />
                
                <div className="relative z-10 p-8 sm:p-12">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 animate-fade-in-up">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-white/90">Actualizado semanalmente</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                            Tendencias <span className="text-gradient-premium">Globales</span>
                        </h1>
                        <p className="text-text-secondary text-lg">
                            Explora las películas que están definiendo la conversación cinematográfica esta semana.
                        </p>
                    </div>
                </div>
            </div>

            {/* AI Recommendations */}
            <AIRecommendations />

            {/* Filters */}
            <FilterBar />

            {/* Movies Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
                {movies.map((movie, index) => (
                    <div 
                        key={movie.id} 
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <MovieCard movie={movie} />
                    </div>
                ))}
            </div>

            {/* Load More Section */}
            <div className="text-center pt-12">
                <button className="group relative px-8 py-4 bg-surface hover:bg-surface-hover border border-surface-light rounded-2xl font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Cargar más películas
                    </span>
                </button>
            </div>
        </div>
    );
}

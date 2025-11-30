import { getTrending, discoverMovies, getGenres } from '@/lib/tmdb/service';
import FilterBar from '@/components/features/FilterBar';
import AIRecommendations from '@/components/features/AIRecommendations';
import MovieGrid from '@/components/features/MovieGrid';
import { AdBannerWrapper } from '@/components/ads';
import { TrendingUp } from 'lucide-react';

interface BrowsePageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
    const params = await searchParams;
    const genre = params.genre ? Number(params.genre) : undefined;
    const year = params.year ? Number(params.year) : undefined;
    const sortBy = params.sort_by as "popularity.desc" | "vote_average.desc" | "primary_release_date.desc" | undefined;

    let movies;

    if (genre || sortBy || year) {
        const data = await discoverMovies({ genre, year, sortBy, page: 1 });
        movies = data.results;
    } else {
        // Fetch trending movies on the server
        const trendingData = await getTrending('movie', 'week', 1);
        movies = trendingData.results;
    }

    // Fetch genres
    const { genres } = await getGenres();

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

            {/* Ad Banner - Only visible to free users */}
            <div className="my-8">
                <AdBannerWrapper position="hero" />
            </div>

            {/* AI Recommendations */}
            <AIRecommendations />

            {/* Filters */}
            <FilterBar genres={genres} />

            {/* Movies Grid with Load More */}
            <MovieGrid initialMovies={movies} />
        </div>
    );
}

import { getTrending, discoverMovies, getGenres, discoverTV, getTVGenres } from '@/lib/tmdb/service';
import FilterBar from '@/components/features/FilterBar';
import AIRecommendations from '@/components/features/AIRecommendations';
import MovieGrid from '@/components/features/MovieGrid';
import ComingSoon from '@/components/features/ComingSoon';
import { AdBannerWrapper } from '@/components/ads';
import { TrendingUp, Tv, Film } from 'lucide-react';

interface BrowsePageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
    const params = await searchParams;
    const category = typeof params.category === 'string' ? params.category : 'movie';
    const genre = params.genre ? Number(params.genre) : undefined;
    const year = params.year ? Number(params.year) : undefined;
    const sortBy = params.sort_by as "popularity.desc" | "vote_average.desc" | "primary_release_date.desc" | undefined;

    // Handle unsupported categories
    if (['novelas', 'anime', 'live-tv'].includes(category)) {
        const titles: Record<string, string> = {
            novelas: 'Telenovelas',
            anime: 'Anime',
            'live-tv': 'TV en Vivo'
        };

        return (
            <ComingSoon
                title={titles[category]}
                description="Estamos trabajando para traerte el mejor contenido de esta categoría. ¡Vuelve pronto!"
            />
        );
    }

    const isTV = category === 'tv';
    let content;

    if (genre || sortBy || year) {
        const data = isTV
            ? await discoverTV({ genre, year, sortBy, page: 1 })
            : await discoverMovies({ genre, year, sortBy, page: 1 });
        content = data.results;
    } else {
        // Fetch trending content on the server
        if (isTV) {
            const trendingData = await getTrending('tv', 'week', 1);
            content = trendingData.results;
        } else {
            const trendingData = await getTrending('movie', 'week', 1);
            content = trendingData.results;
        }
    }

    // Fetch genres based on category
    const { genres } = isTV ? await getTVGenres() : await getGenres();

    return (
        <div className="space-y-8 pb-20">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden mb-12 border border-white/5 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-surface to-accent/10 opacity-50" />
                <div className="absolute inset-0 backdrop-blur-3xl" />

                <div className="relative z-10 p-8 sm:p-12">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 animate-fade-in-up">
                            {isTV ? <Tv className="w-4 h-4 text-primary" /> : <TrendingUp className="w-4 h-4 text-primary" />}
                            <span className="text-xs font-medium text-white/90">
                                {isTV ? 'Series Destacadas' : 'Películas en Tendencia'}
                            </span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                            Explora <span className="text-gradient-premium">{isTV ? 'Series' : 'Películas'}</span>
                        </h1>
                        <p className="text-text-secondary text-lg">
                            {isTV
                                ? 'Descubre las series más populares y aclamadas del momento.'
                                : 'Explora las películas que están definiendo la conversación cinematográfica.'}
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
            <MovieGrid initialMovies={content} mediaType={isTV ? 'tv' : 'movie'} />
        </div>
    );
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTrending, discoverMovies, getGenres, discoverTV, getTVGenres } from '@/lib/tmdb/service';
import FilterBar from '@/components/features/FilterBar';
// import AIRecommendations from '@/components/features/AIRecommendations'; // stand-by
import MovieGrid from '@/components/features/MovieGrid';
import ComingSoon from '@/components/features/ComingSoon';
import { TrendingUp, Tv } from 'lucide-react';
import BrowsePageTV from './page-tv';
import TVLayoutWrapper from '@/components/layout/TVLayoutWrapper';
import TVSidebar from '@/components/layout/TVSidebar';
import { isTVDevice } from '@/lib/device-detection';

interface BrowsePageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata: Metadata = {
    title: 'FilmiFy - Explora dónde ver películas y series online',
    description: 'FilmiFy es la plataforma para buscar dónde ver películas y series online. Explora streaming, alquiler, compra y las mejores opciones de cine en un solo lugar.',
    keywords: [
        'FilmiFy',
        'filmify',
        'dónde ver películas',
        'ver películas online',
        'dónde ver series',
        'streaming películas',
        'alquilar películas',
        'comprar películas',
        'películas online',
        'series online',
        'cine online'
    ],
    openGraph: {
        title: 'FilmiFy - Explora dónde ver películas y series online',
        description: 'FilmiFy es la plataforma para buscar dónde ver películas y series online. Explora streaming, alquiler, compra y las mejores opciones de cine en un solo lugar.',
        type: 'website'
    },
    twitter: {
        card: 'summary_large_image',
        title: 'FilmiFy - Explora dónde ver películas y series online',
        description: 'FilmiFy es la plataforma para buscar dónde ver películas y series online. Explora streaming, alquiler, compra y las mejores opciones de cine en un solo lugar.',
    }
};

// ...

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
    const params = await searchParams;

    // Check for TV mode via server-side detection or search params
    const isGlobalTV = await isTVDevice();
    const isManualTV = params.tv === 'true';

    if (isGlobalTV) {
        // PlatformLayout already handles the shell
        return <BrowsePageTV searchParams={searchParams} />;
    }

    if (isManualTV) {
        return (
            <TVLayoutWrapper
                forceTVMode={true}
                tvLayout={
                    <div className="flex min-h-screen bg-background text-white">
                        <TVSidebar />
                        <main className="flex-1 ml-0 lg:ml-24 p-8 overflow-x-hidden">
                            <BrowsePageTV searchParams={searchParams} />
                        </main>
                    </div>
                }>
                <div />
            </TVLayoutWrapper>
        );
    }

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
                        <h1 className="text-4xl sm:text-5xl text-white font-bold tracking-tight">
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

            {/* AI Recommendations — stand-by, desactivado temporalmente */}
            {/* <AIRecommendations /> */}

            <Suspense
                fallback={
                    <div className="space-y-8">
                        <div className="h-12 w-full max-w-3xl rounded-full bg-white/5 animate-pulse" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    </div>
                }
            >
                <FilterBar genres={genres} />
                <MovieGrid initialMovies={content} mediaType={isTV ? 'tv' : 'movie'} />
            </Suspense>
        </div>
    );
}

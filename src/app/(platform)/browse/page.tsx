import type { Metadata } from 'next';
import { getTrending, discoverMovies, getGenres, discoverTV, getTVGenres } from '@/lib/tmdb/service';
import { filterAvailableMovies, filterAvailableSeries } from '@/server/services/vimeus';
import type { Movie } from '@/types/tmdb';
import type { TVShow } from '@/types/tmdb';
import FilterBar from '@/components/features/FilterBar';
import MovieGrid from '@/components/features/MovieGrid';
import ComingSoon from '@/components/features/ComingSoon';
import AdBanner2 from '@/components/ads/AdBanner2';
import { TrendingUp, Tv, Film } from 'lucide-react';
import BrowsePageTV from './page-tv';
import TVLayoutWrapper from '@/components/layout/TVLayoutWrapper';
import TVSidebar from '@/components/layout/TVSidebar';
import { isTVDevice } from '@/lib/device-detection';
import { headers } from 'next/headers';

interface BrowsePageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata: Metadata = {
    alternates: { canonical: '/browse' },
    title: 'Explora películas y series online | FilmiFy',
    description:
        'Descubre dónde ver películas y series online. Explora streaming, alquiler, compra y las mejores recomendaciones en un solo lugar.',
    keywords: [
        'FilmiFy',
        'ver películas online',
        'ver series online',
        'streaming películas',
        'alquiler películas',
        'dónde ver películas',
        'dónde ver series',
        'cine online',
    ],
    openGraph: {
        title: 'Explora películas y series online | FilmiFy',
        description:
            'Descubre dónde ver películas y series online. Explora streaming, alquiler, compra y las mejores recomendaciones en un solo lugar.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Explora películas y series online | FilmiFy',
        description:
            'Descubre dónde ver películas y series online. Explora streaming, alquiler, compra y las mejores recomendaciones en un solo lugar.',
    },
};

// ── Helpers ───────────────────────────────────────────────────────
async function fetchContent(
    isTV: boolean,
    genre?: number,
    year?: number,
    sortBy?: string
) {
    if (genre || sortBy || year) {
        return isTV
            ? discoverTV({ genre, year, sortBy: sortBy as any, page: 1 })
            : discoverMovies({ genre, year, sortBy: sortBy as any, page: 1 });
    }
    return isTV
        ? getTrending('tv', 'week', 1)
        : getTrending('movie', 'week', 1);
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
    const userAgent = (await headers()).get('user-agent') || '';

    const params = await searchParams;

    // TV mode detection
    const isGlobalTV = await isTVDevice();
    const isManualTV = params.tv === 'true';

    if (isGlobalTV) {
        return <BrowsePageTV searchParams={searchParams} />;
    }

    if (isManualTV) {
        return (
            <TVLayoutWrapper
                forceTVMode={true}
                tvLayout={
                    <>
                        <TVSidebar />
                        <main className="ml-16 lg:ml-24 p-4 lg:p-8 min-h-screen overflow-x-hidden">
                            <BrowsePageTV searchParams={searchParams} />
                        </main>
                    </>
                }
            >
                <div />
            </TVLayoutWrapper>
        );
    }

    // Parse filters
    const category = typeof params.category === 'string' ? params.category : 'movie';
    const genre = params.genre ? Number(params.genre) : undefined;
    const year = params.year ? Number(params.year) : undefined;
    const sortBy = params.sort_by as
        | 'popularity.desc'
        | 'vote_average.desc'
        | 'primary_release_date.desc'
        | undefined;

    // Handle unsupported categories
    const unsupportedTitles: Record<string, string> = {
        novelas: 'Telenovelas',
        anime: 'Anime',
        'live-tv': 'TV en Vivo',
    };
    if (category in unsupportedTitles) {
        return (
            <ComingSoon
                title={unsupportedTitles[category]}
                description="Estamos trabajando para traerte el mejor contenido de esta categoría. ¡Vuelve pronto!"
            />
        );
    }

    const isTV = category === 'tv';

    // Fetch data with error handling
    let content: (Movie | TVShow)[] = [];
    let genres: any[] = [];

    try {
        const [contentData, genresData] = await Promise.all([
            fetchContent(isTV, genre, year, sortBy).catch((err) => {
                console.error('Error fetching content:', err);
                return { results: [] };
            }),
            isTV ? getTVGenres().catch(() => ({ genres: [] })) : getGenres().catch(() => ({ genres: [] })),
        ]);

        // Filtrar solo títulos disponibles, con fallback seguro
        try {
            content = isTV
                ? await filterAvailableSeries(contentData.results as TVShow[])
                : await filterAvailableMovies(contentData.results as Movie[]);
        } catch {
            // Si falla el filtro de disponibilidad, devolvemos la lista completa (mejor que página vacía)
            content = contentData.results || [];
        }

        genres = genresData.genres || [];
    } catch (error) {
        // Fallback general: página con contenido vacío pero funcional
        console.error('Error crítico en BrowsePage:', error);
        content = [];
        genres = [];
    }

    return (
        <div className="space-y-8 pb-20">
            {/* ── Hero Section ────────────────────────────────── */}
            <div className="relative rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                {/* Fondo con gradiente y desenfoque */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-surface to-accent/10" />
                <div className="absolute inset-0 backdrop-blur-3xl" />

                <div className="relative z-10 p-8 sm:p-12">
                    <div className="max-w-2xl">
                        {/* Etiqueta de categoría */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-4">
                            {isTV ? (
                                <Tv className="w-4 h-4 text-primary" />
                            ) : (
                                <TrendingUp className="w-4 h-4 text-primary" />
                            )}
                            <span className="text-xs font-medium text-white/90">
                                {isTV ? 'Series Destacadas' : 'Películas en Tendencia'}
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
                            Explora{' '}
                            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                {isTV ? 'Series' : 'Películas'}
                            </span>
                        </h1>
                        <p className="text-text-secondary text-lg leading-relaxed">
                            {isTV
                                ? 'Descubre las series más populares y aclamadas del momento.'
                                : 'Explora las películas que están definiendo la conversación cinematográfica.'}
                        </p>
                    </div>
                </div>

                {/* Decoración sutil */}
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mb-32 pointer-events-none" />
            </div>

            {/* Filtros y contenido */}
            <FilterBar genres={genres} />
            <MovieGrid initialMovies={content} mediaType={isTV ? 'tv' : 'movie'} />

            {/* Publicidad — al final del grid, nunca interrumpe la exploración */}
            <div className="hidden md:block">
                <AdBanner2 />
            </div>
        </div>
    );
}
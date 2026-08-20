import type { Metadata } from 'next';
import { getTrending, discoverMovies, getGenres, discoverTV, getTVGenres } from '@/server/services/tmdb';
import { filterAvailableMovies, filterAvailableSeries, filterAvailableAnimes, getQualityMap, getVimeusAnimeCatalog } from '@/server/services/vimeus';
import type { Movie } from '@/types/tmdb';
import type { TVShow } from '@/types/tmdb';
import FilterBar from '@/components/features/FilterBar';
import MovieGrid from '@/components/features/MovieGrid';
import ComingSoon from '@/components/features/ComingSoon';
import ModuleHero from '@/components/features/ModuleHero';
import { TrendingUp, Tv, Film, Swords } from 'lucide-react';
import BrowsePageTV from './page-tv';
import TVLayoutWrapper from '@/components/layout/TVLayoutWrapper';
import TVSidebar from '@/components/layout/TVSidebar';
import { isTVDevice } from '@/lib/device-detection';
import { headers } from 'next/headers';
import { AdSlot } from '@/components/ads';



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
        images: [{ url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/opengraph-image?type=page&title=${encodeURIComponent('Explora películas y series online | FilmiFy')}` }],
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

    const isTV    = category === 'tv';
    const isAnime = category === 'anime';

    // Fetch data with error handling
    let content: (Movie | TVShow)[] = [];
    let genres: any[] = [];
    let qualityRecord: Record<string, string> = {};

    if (isAnime) {
        // Anime: datos del listing de Vimeus, pero SOLO los que reproducen de
        // verdad. Antes se mostraba el listado crudo (200 títulos) y muchos no
        // tenían fuentes → fichas muertas y mala reputación. Ahora sondeamos el
        // embed (filterAvailableAnimes, cacheado 2h por ítem) y ocultamos lo no
        // reproducible. Pedimos de más (80) y recortamos a los disponibles.
        try {
            const animes = await getVimeusAnimeCatalog(80).catch(() => []);
            const asShows = animes.map((a) => ({
                id: a.tmdb_id,
                name: a.title ?? '',
                original_name: a.title ?? '',
                poster_path: a.poster ?? null,
                backdrop_path: a.backdrop ?? null,
                vote_average: 0,
                vote_count: 0,
                first_air_date: '',
                overview: '',
                genre_ids: [],
                adult: false,
                original_language: 'ja',
                popularity: 0,
                origin_country: ['JP'],
            } as TVShow));
            // Solo títulos con fuentes reales (fail-open si el filtro peta).
            content = await filterAvailableAnimes(asShows).catch(() => asShows);
        } catch (error) {
            console.error('Error crítico en BrowsePage (anime):', error);
            content = [];
        }
        genres = [];
    } else {
        try {
            const [contentData, genresData, qMap] = await Promise.all([
                fetchContent(isTV, genre, year, sortBy).catch((err) => {
                    console.error('Error fetching content:', err);
                    return { results: [] };
                }),
                isTV ? getTVGenres().catch(() => ({ genres: [] })) : getGenres().catch(() => ({ genres: [] })),
                getQualityMap(isTV ? 'serie' : 'movie', 4).catch(() => new Map<number, string>()),
            ]);
            qualityRecord = Object.fromEntries(qMap);

            // Filtrar solo títulos disponibles, con fallback seguro
            try {
                content = isTV
                    ? await filterAvailableSeries(contentData.results as TVShow[])
                    : await filterAvailableMovies(contentData.results as Movie[]);
            } catch {
                content = contentData.results || [];
            }

            genres = genresData.genres || [];
        } catch (error) {
            console.error('Error crítico en BrowsePage:', error);
            content = [];
            genres = [];
        }
    }

    return (
        <div className="space-y-6 sm:space-y-8 pb-20">
            {/* ── Hero Section ────────────────────────────────── */}
            <ModuleHero
                posters={content.map((m) => m.poster_path)}
                icon={isAnime ? Swords : isTV ? Tv : TrendingUp}
                iconClassName={isAnime ? 'text-orange-400' : 'text-primary'}
                badgeLabel={isAnime ? 'Catálogo de Anime' : isTV ? 'Series Destacadas' : 'Películas en Tendencia'}
                titlePrefix="Explora "
                titleHighlight={isAnime ? 'Anime' : isTV ? 'Series' : 'Películas'}
                description={
                    isAnime
                        ? 'Catálogo completo de anime disponible para ver online, actualizado a diario.'
                        : isTV
                            ? 'Descubre las series más populares y aclamadas del momento.'
                            : 'Explora las películas que están definiendo la conversación cinematográfica.'
                }
            />

            {/* Filtros y contenido */}
            <FilterBar genres={genres} />

            {/* 📢 Banner publicitario — discreto, entre filtros y grilla */}
            <AdSlot className="my-8" />

            <MovieGrid initialMovies={content} mediaType={isAnime || isTV ? 'tv' : 'movie'} qualityMap={qualityRecord} />

        </div>
    );
}
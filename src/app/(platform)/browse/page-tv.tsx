import { getTrending, discoverMovies, getGenres, discoverTV, getTVGenres } from '@/lib/tmdb/service';
import HorizontalRow from '@/components/features/HorizontalRow';
import { TrendingUp, Tv, Film, Star, Flame, PlayCircle, Clock, Sparkles } from 'lucide-react';

interface BrowsePageTVProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BrowsePageTV({ searchParams }: BrowsePageTVProps) {
    const params = await searchParams;
    const category = typeof params.category === 'string' ? params.category : 'movie';

    // Fetch multiple categories for horizontal rows
    const [
        trendingMovies,
        trendingTV,
        popularMovies,
        topRatedMovies,
        upcomingMovies,
        actionMovies,
        comedyMovies
    ] = await Promise.all([
        getTrending('movie', 'week', 1),
        getTrending('tv', 'week', 1),
        discoverMovies({ sortBy: 'popularity.desc', page: 1 }),
        discoverMovies({ sortBy: 'vote_average.desc', page: 1 }),
        discoverMovies({ sortBy: 'primary_release_date.desc', page: 1 }),
        discoverMovies({ genre: 28, page: 1 }), // Action
        discoverMovies({ genre: 35, page: 1 })  // Comedy
    ]);

    return (
        <div className="min-h-screen pb-32">
            {/* Hero Section - Featured Content */}
            <div className="relative h-[60vh] mb-12 overflow-hidden">
                {/* Background with gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

                <div className="relative z-10 h-full flex flex-col justify-end p-8 lg:p-16">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 backdrop-blur-md rounded-full border border-primary/30 mb-4">
                            <Flame className="w-5 h-5 text-primary" />
                            <span className="text-sm font-bold text-white uppercase tracking-wide">
                                Destacado
                            </span>
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-bold text-white mb-4 tv-text-2xl">
                            Explora el Mejor Contenido
                        </h1>

                        <p className="text-xl text-text-secondary mb-6 tv-text-lg">
                            Navega con las flechas del control remoto. Presiona Enter para ver detalles.
                        </p>

                        <div className="flex items-center gap-4 text-text-secondary">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                                    <span className="text-xs font-bold">↑↓</span>
                                </div>
                                <span className="text-sm">Navegar</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                                    <span className="text-xs font-bold">←→</span>
                                </div>
                                <span className="text-sm">Desplazar</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">OK</span>
                                </div>
                                <span className="text-sm">Seleccionar</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Horizontal Content Rows */}
            <div className="space-y-12">
                <HorizontalRow
                    title="Películas en Tendencia"
                    icon={Flame}
                    items={trendingMovies.results}
                    mediaType="movie"
                />

                <HorizontalRow
                    title="Series Populares"
                    icon={Tv}
                    items={trendingTV.results}
                    mediaType="tv"
                />

                <HorizontalRow
                    title="Mejor Valoradas"
                    icon={Star}
                    items={topRatedMovies.results}
                    mediaType="movie"
                />

                <HorizontalRow
                    title="Acción y Aventura"
                    icon={PlayCircle}
                    items={actionMovies.results}
                    mediaType="movie"
                />

                <HorizontalRow
                    title="Comedias"
                    icon={Sparkles}
                    items={comedyMovies.results}
                    mediaType="movie"
                />

                <HorizontalRow
                    title="Próximos Estrenos"
                    icon={Clock}
                    items={upcomingMovies.results}
                    mediaType="movie"
                />

                <HorizontalRow
                    title="Populares Ahora"
                    icon={TrendingUp}
                    items={popularMovies.results}
                    mediaType="movie"
                />
            </div>
        </div>
    );
}

import { getTrending, discoverMovies, discoverTV } from '@/lib/tmdb/service';
import TVHero from '@/components/tv/TVHero';
import TVRow from '@/components/tv/TVRow';

interface BrowsePageTVProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BrowsePageTV({ searchParams }: BrowsePageTVProps) {
    const [
        trendingMovies,
        trendingTV,
        popularMovies,
        topRatedMovies,
        upcomingMovies,
        actionMovies,
        comedyMovies,
        dramaTV,
    ] = await Promise.all([
        getTrending('movie', 'week', 1),
        getTrending('tv', 'week', 1),
        discoverMovies({ sortBy: 'popularity.desc', page: 1 }),
        discoverMovies({ sortBy: 'vote_average.desc', page: 1 }),
        discoverMovies({ sortBy: 'primary_release_date.desc', page: 1 }),
        discoverMovies({ genre: 28, page: 1 }),   // Acción
        discoverMovies({ genre: 35, page: 1 }),   // Comedia
        discoverTV({ genre: 18, page: 1 }),        // Drama TV
    ]);

    const heroItems = trendingMovies.results.filter(m => m.backdrop_path).slice(0, 6);

    return (
        <div className="min-h-screen pb-16 space-y-2">
            {/* Hero destacado */}
            <TVHero items={heroItems} mediaType="movie" />

            {/* Filas de contenido — iconName es un string serializable */}
            <div className="space-y-10">
                <TVRow
                    title="Películas en Tendencia"
                    iconName="Flame"
                    items={trendingMovies.results}
                    mediaType="movie"
                />
                <TVRow
                    title="Series Populares"
                    iconName="Tv"
                    items={trendingTV.results}
                    mediaType="tv"
                />
                <TVRow
                    title="Mejor Valoradas"
                    iconName="Star"
                    items={topRatedMovies.results}
                    mediaType="movie"
                />
                <TVRow
                    title="Acción y Aventura"
                    iconName="PlayCircle"
                    items={actionMovies.results}
                    mediaType="movie"
                />
                <TVRow
                    title="Series de Drama"
                    iconName="Film"
                    items={dramaTV.results}
                    mediaType="tv"
                />
                <TVRow
                    title="Comedias"
                    iconName="Sparkles"
                    items={comedyMovies.results}
                    mediaType="movie"
                />
                <TVRow
                    title="Próximos Estrenos"
                    iconName="Clock"
                    items={upcomingMovies.results}
                    mediaType="movie"
                />
                <TVRow
                    title="Populares Ahora"
                    iconName="TrendingUp"
                    items={popularMovies.results}
                    mediaType="movie"
                />
            </div>

            {/* Hint de navegación */}
            <div className="tv-nav-hint" aria-hidden="true">
                <span className="flex items-center gap-4 text-sm">
                    <span>↑↓ Cambiar fila</span>
                    <span>←→ Desplazar</span>
                    <span>OK Seleccionar</span>
                </span>
            </div>
        </div>
    );
}

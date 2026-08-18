import type { Metadata } from 'next';
import { Swords } from 'lucide-react';
import {
    getTrendingAnime, getPopularAnime, getTopRatedAnime,
    getSeasonalAnime, getAnimeGenres, currentSeason,
} from '@/server/services/anilist';
import { filterPlayableAnimeCards } from '@/server/services/anime';
import AnimeExplorer from '@/components/features/anime/AnimeExplorer';
import { AdSlot } from '@/components/ads';

export const metadata: Metadata = {
    title: 'Anime — FilmiFy',
    description:
        'Descubre anime en tendencia, de temporada, populares y mejor valorados. Busca y filtra por género — catálogo impulsado por AniList.',
    alternates: { canonical: '/anime' },
};

// Datos de AniList: cacheados 30 min en el Data Cache. Revalidamos la página
// cada 30 min para mantener trending/temporada frescos sin coste por request.
export const revalidate = 1800;

const SEASON_ES: Record<string, string> = {
    WINTER: 'invierno', SPRING: 'primavera', SUMMER: 'verano', FALL: 'otoño',
};

export default async function AnimePage() {
    const { season, year } = currentSeason();

    // Pedimos DE MÁS (50 por rail) porque a continuación filtramos a solo los
    // animes reproducibles en FilmiFy — así el rail no queda ralo tras filtrar.
    const [trending, seasonal, popular, topRated, genres] = await Promise.all([
        getTrendingAnime(50).catch(() => []),
        getSeasonalAnime(50).catch(() => []),
        getPopularAnime(50).catch(() => []),
        getTopRatedAnime(50).catch(() => []),
        getAnimeGenres().catch(() => []),
    ]);

    // Ocultar del catálogo lo que NO se puede ver. La comprobación va contra el
    // registro de proveedores usando el id de AniList (una sonda cacheada 2 h),
    // no contra el listing de Vimeus: así el catálogo deja de estar limitado a
    // lo que tenga un único proveedor. Cada rail se recorta a 24 tras filtrar.
    const [fTrending, fSeasonal, fPopular, fTopRated] = await Promise.all([
        filterPlayableAnimeCards(trending).then((a) => a.slice(0, 24)).catch(() => []),
        filterPlayableAnimeCards(seasonal).then((a) => a.slice(0, 24)).catch(() => []),
        filterPlayableAnimeCards(popular).then((a) => a.slice(0, 24)).catch(() => []),
        filterPlayableAnimeCards(topRated).then((a) => a.slice(0, 24)).catch(() => []),
    ]);

    const rails = [
        { key: 'trending', title: 'En tendencia ahora', icon: 'trending' as const, items: fTrending },
        { key: 'seasonal', title: `Temporada de ${SEASON_ES[season]} ${year}`, icon: 'seasonal' as const, items: fSeasonal },
        { key: 'popular', title: 'Más populares de todos los tiempos', icon: 'popular' as const, items: fPopular },
        { key: 'top', title: 'Mejor valorados', icon: 'top' as const, items: fTopRated },
    ].filter((r) => r.items.length > 0);

    const empty = rails.length === 0;

    return (
        <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 space-y-6">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-outline-variant bg-surface-container">
                <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="relative p-5 sm:p-7 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-primary-container flex items-center justify-center shrink-0">
                        <Swords className="w-6 h-6 text-on-primary-container" />
                    </div>
                    <div>
                        <h1 className="md3-headline-small font-semibold text-on-surface">Anime</h1>
                        <p className="md3-body-medium text-on-surface-variant mt-0.5 max-w-xl">
                            Tendencias, estrenos de temporada y clásicos — busca y filtra por género.
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-1">
                <AdSlot className="my-0" />
            </div>

            {empty ? (
                <div className="text-center py-20 bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant">
                    <p className="md3-title-small text-on-surface mb-1">No pudimos cargar el catálogo de anime</p>
                    <p className="md3-body-small text-on-surface-variant">Vuelve a intentarlo en unos minutos.</p>
                </div>
            ) : (
                <AnimeExplorer rails={rails} genres={genres} />
            )}
        </div>
    );
}

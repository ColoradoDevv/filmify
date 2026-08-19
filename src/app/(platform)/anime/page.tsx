import type { Metadata } from 'next';
import { Swords } from 'lucide-react';
import { getAnimeGenres } from '@/server/services/anilist';
import { loadAnimeCatalog } from '@/server/services/anime';
import AnimeExplorer from '@/components/features/anime/AnimeExplorer';
import ModuleHero from '@/components/features/ModuleHero';
import { AdSlot } from '@/components/ads';

export const metadata: Metadata = {
    title: 'Anime — FilmiFy',
    description:
        'Catálogo de anime online ordenado por popularidad: busca cualquier título y filtra por género — datos de AniList.',
    alternates: { canonical: '/anime' },
};

// Datos de AniList: cacheados 30 min en el Data Cache. Revalidamos la página
// cada 30 min para que el catálogo siga fresco sin coste por request.
export const revalidate = 1800;

export default async function AnimePage() {
    // La primera tanda se pinta en servidor (SEO + primer render); el resto lo
    // pide el cliente con "Cargar más", igual que /browse. AniList tiene miles
    // de títulos y la sonda de disponibilidad va uno a uno, así que traerlo
    // todo de golpe no es opción.
    const [catalog, genres] = await Promise.all([
        loadAnimeCatalog({ page: 1 }).catch(() => ({ items: [], nextPage: 2, hasMore: false })),
        getAnimeGenres().catch(() => []),
    ]);

    const { items, nextPage, hasMore } = catalog;

    return (
        <div className="space-y-6 sm:space-y-8 pb-20">
            {/* Hero */}
            <ModuleHero
                posters={items.map((a) => a.coverImage)}
                icon={Swords}
                iconClassName="text-orange-400"
                badgeLabel="Catálogo de Anime"
                titlePrefix="Explora "
                titleHighlight="Anime"
                description="Miles de títulos, de los clásicos a lo último de la temporada — busca y filtra por género."
            />

            <AdSlot className="my-0" />

            {items.length === 0 ? (
                <div className="text-center py-20 bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant">
                    <p className="md3-title-small text-on-surface mb-1">No pudimos cargar el catálogo de anime</p>
                    <p className="md3-body-small text-on-surface-variant">Vuelve a intentarlo en unos minutos.</p>
                </div>
            ) : (
                <AnimeExplorer
                    initialItems={items}
                    initialNextPage={nextPage}
                    initialHasMore={hasMore}
                    genres={genres}
                />
            )}
        </div>
    );
}

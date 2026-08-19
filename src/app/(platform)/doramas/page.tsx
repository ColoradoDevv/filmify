import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heart } from 'lucide-react';
import {
    DORAMA_REGIONS,
    loadDoramaCatalog,
    type DoramaRegionId,
} from '@/server/services/dorama';
import DoramaCatalog from '@/components/features/DoramaCatalog';
import ModuleHero from '@/components/features/ModuleHero';
import { AdSlot } from '@/components/ads';
import { isDoramasEnabled } from '@/lib/env';

/**
 * Lobby de doramas — capa de DESCUBRIMIENTO.
 *
 * La ficha de cada título sigue viviendo en /tv/[id]: los doramas son series
 * de TMDB y comparten su espacio de ids, así que duplicarlas en una ruta
 * propia solo generaría contenido repetido. Aquí aportamos lo que /browse no
 * da: un catálogo acotado a series asiáticas y ya filtrado a lo reproducible.
 *
 * La presentación es la misma grilla plana de /browse (nada de carruseles por
 * categoría): la región es un filtro, no una sección. Se resuelve en servidor
 * vía `?region=`, para que cada combinación sea una URL indexable y no
 * dependa de JavaScript.
 */

export const metadata: Metadata = {
    title: 'Doramas — Ver series coreanas, chinas, japonesas y tailandesas | FilmiFy',
    description:
        'Catálogo de doramas online: K-dramas coreanos, C-dramas chinos, J-dramas japoneses y series tailandesas, con subtítulos en español.',
    alternates: { canonical: '/doramas' },
};

// Los listados de TMDB cambian poco a lo largo del día.
export const revalidate = 3600;

interface Props {
    searchParams: Promise<{ region?: string }>;
}

const REGION_IDS = Object.keys(DORAMA_REGIONS) as DoramaRegionId[];

function isRegionId(v: string | undefined): v is DoramaRegionId {
    return !!v && (REGION_IDS as string[]).includes(v);
}

export default async function DoramasPage({ searchParams }: Props) {
    // Módulo cerrado en producción — ver `isDoramasEnabled`. Devolvemos 404 en
    // lugar de una página "próximamente" porque /doramas nunca llegó a estar
    // publicada: una URL nueva que solo dice "vuelve pronto" es una soft-404
    // que Google indexaría para una sección que no existe.
    if (!isDoramasEnabled()) notFound();

    const { region: rawRegion } = await searchParams;
    const region = isRegionId(rawRegion) ? rawRegion : null;

    // La primera tanda se pinta en servidor (SEO + primer render). El resto lo
    // pide el cliente con "Cargar más", como en /browse: el catálogo de TMDB
    // tiene decenas de miles de series asiáticas, así que no se puede traer de
    // una vez.
    const { items, nextPage, hasMore } = await loadDoramaCatalog({ region, page: 1 })
        .catch(() => ({ items: [], nextPage: 2, hasMore: false }));

    return (
        <div className="space-y-6 sm:space-y-8 pb-20">
            {/* Hero */}
            <ModuleHero
                posters={items.map((s) => s.poster_path)}
                icon={Heart}
                iconClassName="text-pink-400"
                badgeLabel="Doramas"
                titlePrefix="Explora "
                titleHighlight="Doramas"
                description="Series coreanas, chinas, japonesas y tailandesas — con subtítulos en español."
            />

            {/* Chips de región: cada una es una URL propia, indexable y sin JS */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-1">
                <Link
                    href="/doramas"
                    className={`shrink-0 px-3.5 h-8 flex items-center rounded-full md3-label-medium border transition-colors ${
                        !region
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/40'
                    }`}
                >
                    Todos
                </Link>
                {REGION_IDS.map((id) => (
                    <Link
                        key={id}
                        href={`/doramas?region=${id}`}
                        className={`shrink-0 px-3.5 h-8 flex items-center rounded-full md3-label-medium border transition-colors ${
                            region === id
                                ? 'bg-primary text-on-primary border-primary'
                                : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/40'
                        }`}
                    >
                        {DORAMA_REGIONS[id].label}
                    </Link>
                ))}
            </div>

            <AdSlot className="my-0" />

            {items.length === 0 ? (
                <div className="text-center py-20 bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant">
                    <p className="md3-title-small text-on-surface mb-1">No pudimos cargar el catálogo de doramas</p>
                    <p className="md3-body-small text-on-surface-variant">Vuelve a intentarlo en unos minutos.</p>
                </div>
            ) : (
                <DoramaCatalog
                    initialItems={items}
                    region={region}
                    initialNextPage={nextPage}
                    initialHasMore={hasMore}
                />
            )}
        </div>
    );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clapperboard } from 'lucide-react';
import { discoverMovies } from '@/server/services/tmdb';
import { filterAvailableMovies } from '@/server/services/vimeus';
import { GENRE_PAGES, getGenreBySlug } from '@/lib/genres';
import { getOptionalApiKeys } from '@/lib/env';
import MovieGrid from '@/components/features/MovieGrid';
import ModuleHero from '@/components/features/ModuleHero';
import { AdSlot } from '@/components/ads';
import type { Movie } from '@/types/tmdb';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return GENRE_PAGES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const genre = getGenreBySlug(slug);
    // noindex explícito si el género no existe → evita soft-404.
    if (!genre) {
        return { title: 'Género no encontrado - FilmiFy', robots: { index: false, follow: false } };
    }

    return {
        title: genre.title,
        description: genre.description,
        alternates: { canonical: `/genero/${genre.slug}` },
        openGraph: {
            title: genre.title,
            description: genre.description,
            url: `/genero/${genre.slug}`,
            type: 'website',
            images: [{ url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/opengraph-image?type=page&title=${encodeURIComponent(genre.title)}` }],
        },
        twitter: {
            card: 'summary_large_image',
            title: genre.title,
            description: genre.description,
        },
    };
}

/**
 * Landing page de género — página permanente, indexable y con contenido
 * único, pensada para búsquedas long-tail ("películas de acción online").
 */
export default async function GenrePage({ params }: PageProps) {
    const { slug } = await params;
    const genre = getGenreBySlug(slug);
    if (!genre) notFound();

    // Películas populares del género, solo las reproducibles.
    let movies: Movie[] = [];
    try {
        const data = await discoverMovies({ genre: genre.tmdbId, page: 1 });
        movies = await filterAvailableMovies(data.results as Movie[]);
    } catch (error) {
        console.error(`[genero/${slug}] Error fetching:`, error);
    }

    const appUrl = getOptionalApiKeys().appUrl;
    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: genre.title,
            description: genre.description,
            url: `${appUrl}/genero/${genre.slug}`,
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Inicio', item: appUrl },
                { '@type': 'ListItem', position: 2, name: 'Películas', item: `${appUrl}/browse` },
                { '@type': 'ListItem', position: 3, name: genre.name, item: `${appUrl}/genero/${genre.slug}` },
            ],
        },
    ];

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
            />

            <div className="space-y-6 sm:space-y-8 pb-20">
                {/* Hero del género */}
                <ModuleHero
                    posters={movies.map((m) => m.poster_path)}
                    icon={Clapperboard}
                    badgeLabel="Género"
                    titlePrefix="Películas de "
                    titleHighlight={genre.name}
                    description={genre.description}
                    maxWidthClassName="max-w-3xl"
                />

                {/* 📢 Banner publicitario — entre el hero y la grilla */}
                <AdSlot className="my-0" />

                {/* Grid del género (solo títulos reproducibles) */}
                <MovieGrid initialMovies={movies} mediaType="movie" fixedGenre={genre.tmdbId} />

                {/* 📢 Segundo banner — antes del enlazado de otros géneros */}
                <AdSlot className="my-0" />

                {/* Enlazado interno: otros géneros */}
                <nav aria-label="Otros géneros" className="pt-4">
                    <h2 className="text-lg font-bold text-white mb-3">Explora otros géneros</h2>
                    <div className="flex flex-wrap gap-2">
                        {GENRE_PAGES.filter((g) => g.slug !== genre.slug).map((g) => (
                            <Link
                                key={g.slug}
                                href={`/genero/${g.slug}`}
                                className="px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant text-sm font-medium text-text-secondary hover:text-white hover:border-primary/40 transition-colors"
                            >
                                {g.name}
                            </Link>
                        ))}
                    </div>
                </nav>
            </div>
        </>
    );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clapperboard } from 'lucide-react';
import { discoverMovies } from '@/lib/tmdb/service';
import { filterAvailableMovies } from '@/server/services/vimeus';
import { GENRE_PAGES, getGenreBySlug } from '@/lib/genres';
import { getOptionalApiKeys } from '@/lib/env';
import MovieGrid from '@/components/features/MovieGrid';
import HeroPosterCollage from '@/components/features/HeroPosterCollage';
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
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 shadow-2xl min-h-[200px] sm:min-h-[260px] flex items-center">
                    {/* Fondo: mosaico de pósters del género (estilo Netflix) */}
                    <HeroPosterCollage posters={movies.map((m) => m.poster_path)} />
                    <div className="relative z-10 p-5 sm:p-12 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 mb-3 sm:mb-4">
                            <Clapperboard className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-white/90">Género</span>
                        </div>
                        <h1 className="text-2xl sm:text-5xl font-bold text-white tracking-tight mb-2 sm:mb-3 drop-shadow-lg">
                            Películas de{' '}
                            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                {genre.name}
                            </span>
                        </h1>
                        <p className="text-white/80 text-sm sm:text-lg leading-relaxed drop-shadow">
                            {genre.description}
                        </p>
                    </div>
                </div>

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

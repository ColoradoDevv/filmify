// src/app/(platform)/search/page.tsx
import type { Metadata } from 'next';
import { searchMovies } from '@/lib/tmdb/service';
import { filterAvailableMovies } from '@/server/services/vimeus';
import SearchPageClient from './SearchPageClient';
import type { Movie } from '@/types/tmdb';

export const metadata: Metadata = {
    title: 'Buscar películas y series | FilmiFy',
    description:
        'Busca cualquier película o serie y descubre dónde verla online: streaming, alquiler o compra, con tráilers y reseñas.',
    alternates: { canonical: '/search' },
};

interface Props {
    searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
    const { q } = await searchParams;
    const query = q?.trim() || '';

    let initialResults: Movie[] = [];
    if (query) {
        try {
            const data = await searchMovies(query);
            initialResults = await filterAvailableMovies(data.results as Movie[]);
        } catch (error) {
            console.error('Error fetching initial search:', error);
        }
    }

    return (
        <SearchPageClient
            initialQuery={query}
            initialResults={initialResults}
        />
    );
}
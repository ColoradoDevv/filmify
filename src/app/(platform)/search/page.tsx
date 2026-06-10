import type { Metadata } from 'next';
import { searchMovies } from '@/lib/tmdb/service';
import { filterAvailableMovies } from '@/server/services/vimeus';
import type { Movie } from '@/types/tmdb';
import SearchPageClient from './SearchPageClient';

export const metadata: Metadata = {
    title: 'Buscar películas y series | FilmiFy',
    description:
        'Busca cualquier película o serie y descubre dónde verla online: streaming, alquiler o compra, con tráilers y reseñas.',
    alternates: { canonical: '/search' },
};

type SearchPageProps = {
    searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const resolved = await searchParams;
    const rawQuery = resolved.q;
    const query = Array.isArray(rawQuery) ? rawQuery[0] ?? '' : rawQuery ?? '';
    const trimmed = query.trim();

    let initialResults: Movie[] = [];

    if (trimmed) {
        try {
            const data = await searchMovies(trimmed);
            initialResults = await filterAvailableMovies(data.results as Movie[]);
        } catch (error) {
            console.error('Error fetching initial search:', error);
        }
    }

    return (
        <SearchPageClient
            initialQuery={trimmed}
            initialResults={initialResults}
        />
    );
}
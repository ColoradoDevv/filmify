import type { Metadata } from 'next';
import { searchTitles, type SearchResultItem } from '@/app/actions/search';
import SearchPageClient from './SearchPageClient';

export const metadata: Metadata = {
    title: 'Buscar películas y series | FilmiFy',
    description:
        'Busca cualquier película o serie disponible para ver online gratis en FilmiFy.',
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

    // Búsqueda multi (películas + series) filtrada por disponibilidad, igual
    // que en el cliente, para que el SSR coincida con lo que verá el usuario.
    let initialResults: SearchResultItem[] = [];
    if (trimmed) {
        initialResults = await searchTitles(trimmed);
    }

    return (
        <SearchPageClient
            initialQuery={trimmed}
            initialResults={initialResults}
        />
    );
}
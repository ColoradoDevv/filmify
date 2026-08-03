'use client';

/**
 * Explorador de anime — cliente.
 *
 * Recibe los carruseles iniciales (trending / temporada / popular / mejor
 * puntuados) renderizados en el servidor con AniList, y añade encima:
 *  - Búsqueda en vivo (debounce) contra AniList.
 *  - Filtro por género (chips).
 * Al buscar o filtrar, se cambia a una grilla de resultados; sin filtro se
 * muestran los carruseles de descubrimiento.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Sparkles, X, TrendingUp, Star, CalendarDays, Flame } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { searchAnimeAction, animeByGenreAction } from '@/app/actions/anime';
import type { AnimeCard as AnimeCardData } from '@/lib/anilist/types';

interface Rail {
    key: string;
    title: string;
    icon: 'trending' | 'seasonal' | 'popular' | 'top';
    items: AnimeCardData[];
}

const RAIL_ICON = {
    trending: TrendingUp,
    seasonal: CalendarDays,
    popular: Flame,
    top: Star,
} as const;

// Géneros más buscados primero; el resto viene del servidor.
const PRIORITY_GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Mystery', 'Horror'];
const GENRE_ES: Record<string, string> = {
    Action: 'Acción', Adventure: 'Aventura', Comedy: 'Comedia', Drama: 'Drama',
    Fantasy: 'Fantasía', Romance: 'Romance', 'Sci-Fi': 'Ciencia ficción',
    'Slice of Life': 'Recuentos de la vida', Sports: 'Deportes',
    Supernatural: 'Sobrenatural', Mystery: 'Misterio', Horror: 'Terror',
    Psychological: 'Psicológico', Thriller: 'Suspenso', Music: 'Música',
    Mecha: 'Mecha', Ecchi: 'Ecchi',
};

function HorizontalRail({ rail }: { rail: Rail }) {
    const Icon = RAIL_ICON[rail.icon];
    if (rail.items.length === 0) return null;
    return (
        <section className="space-y-3">
            <h2 className="md3-title-medium text-on-surface flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" /> {rail.title}
            </h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1 snap-x">
                {rail.items.map((a, i) => (
                    <div key={a.id} className="w-[140px] sm:w-[160px] shrink-0 snap-start">
                        <AnimeCard anime={a} priority={i < 6} />
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function AnimeExplorer({ rails, genres }: { rails: Rail[]; genres: string[] }) {
    const [query, setQuery] = useState('');
    const [genre, setGenre] = useState<string | null>(null);
    const [results, setResults] = useState<AnimeCardData[] | null>(null);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const seqRef = useRef(0);

    const orderedGenres = [
        ...PRIORITY_GENRES.filter((g) => genres.includes(g)),
        ...genres.filter((g) => !PRIORITY_GENRES.includes(g)),
    ];

    const runSearch = useCallback(async (q: string, g: string | null) => {
        const seq = ++seqRef.current;
        setLoading(true);
        try {
            const items = q.trim()
                ? await searchAnimeAction(q)
                : g
                ? await animeByGenreAction(g)
                : [];
            if (seq !== seqRef.current) return; // respuesta obsoleta
            setResults(items);
        } finally {
            if (seq === seqRef.current) setLoading(false);
        }
    }, []);

    // Búsqueda con debounce cuando cambia el texto.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) {
            // Sin texto: si hay género activo, mostrar su grilla; si no, carruseles.
            if (genre) void runSearch('', genre);
            else { setResults(null); setLoading(false); }
            return;
        }
        debounceRef.current = setTimeout(() => { void runSearch(query, null); }, 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, genre, runSearch]);

    const pickGenre = (g: string) => {
        setQuery('');
        const next = genre === g ? null : g;
        setGenre(next);
        if (next) void runSearch('', next);
        else setResults(null);
    };

    const clearAll = () => {
        setQuery('');
        setGenre(null);
        setResults(null);
    };

    const showingResults = results !== null || loading;
    const resultsLabel = query.trim()
        ? `Resultados para "${query.trim()}"`
        : genre
        ? `Anime de ${GENRE_ES[genre] ?? genre}`
        : 'Resultados';

    return (
        <div className="space-y-6">
            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-on-surface-variant pointer-events-none" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Busca cualquier anime — Naruto, Jujutsu Kaisen, One Piece..."
                    className="w-full h-12 pl-11 pr-11 rounded-full bg-surface-container border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
                {(query || genre) && (
                    <button
                        onClick={clearAll}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-on-surface/8 flex items-center justify-center text-on-surface-variant"
                        aria-label="Limpiar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Chips de género */}
            {orderedGenres.length > 0 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
                    {orderedGenres.map((g) => {
                        const active = genre === g;
                        return (
                            <button
                                key={g}
                                onClick={() => pickGenre(g)}
                                className={`shrink-0 px-3.5 h-8 rounded-full md3-label-medium border transition-colors ${
                                    active
                                        ? 'bg-primary text-on-primary border-primary'
                                        : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/40'
                                }`}
                            >
                                {GENRE_ES[g] ?? g}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Resultados o carruseles */}
            {showingResults ? (
                <div className="space-y-4 min-h-[40vh]">
                    <h2 className="md3-title-medium text-on-surface flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" /> {resultsLabel}
                    </h2>
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : results && results.length > 0 ? (
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                            {results.map((a, i) => (
                                <AnimeCard key={a.id} anime={a} priority={i < 6} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant">
                            <p className="md3-title-small text-on-surface mb-1">Sin resultados</p>
                            <p className="md3-body-small text-on-surface-variant">Prueba con otro término o género</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    {rails.map((rail) => (
                        <HorizontalRail key={rail.key} rail={rail} />
                    ))}
                </div>
            )}
        </div>
    );
}

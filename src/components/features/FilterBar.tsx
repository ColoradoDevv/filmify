'use client';

import { useState } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';

const GENRES = [
    { id: 28, name: 'Acción' },
    { id: 12, name: 'Aventura' },
    { id: 35, name: 'Comedia' },
    { id: 18, name: 'Drama' },
    { id: 878, name: 'Ciencia Ficción' },
    { id: 27, name: 'Terror' },
];

const SORT_OPTIONS = [
    { id: 'popularity.desc', name: 'Más Populares' },
    { id: 'vote_average.desc', name: 'Mejor Valorados' },
    { id: 'primary_release_date.desc', name: 'Más Recientes' },
];

export default function FilterBar() {
    const [activeGenre, setActiveGenre] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].id);
    const [isGenreOpen, setIsGenreOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    return (
        <div className="flex flex-wrap items-center gap-4 mb-8">
            {/* Genre Filter */}
            <div className="relative">
                <button
                    onClick={() => setIsGenreOpen(!isGenreOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${activeGenre
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-surface border-surface-light text-text-secondary hover:border-primary/50'
                        }`}
                >
                    <Filter className="w-4 h-4" />
                    <span>Género</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isGenreOpen ? 'rotate-180' : ''}`} />
                </button>

                {isGenreOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-surface-light rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
                        <div className="p-2">
                            <button
                                onClick={() => { setActiveGenre(null); setIsGenreOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!activeGenre ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-light'
                                    }`}
                            >
                                Todos
                            </button>
                            {GENRES.map((genre) => (
                                <button
                                    key={genre.id}
                                    onClick={() => { setActiveGenre(genre.id); setIsGenreOpen(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${activeGenre === genre.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-text-secondary hover:bg-surface-light'
                                        }`}
                                >
                                    {genre.name}
                                    {activeGenre === genre.id && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sort Filter */}
            <div className="relative">
                <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-surface-light text-text-secondary hover:border-primary/50 transition-all"
                >
                    <span>Ordenar por: <span className="text-white font-medium">{SORT_OPTIONS.find(o => o.id === sortBy)?.name}</span></span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSortOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-surface border border-surface-light rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
                        <div className="p-2">
                            {SORT_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => { setSortBy(option.id); setIsSortOpen(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${sortBy === option.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-text-secondary hover:bg-surface-light'
                                        }`}
                                >
                                    {option.name}
                                    {sortBy === option.id && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Active Filters (Mock) */}
            {activeGenre && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary animate-fade-in">
                    <span>{GENRES.find(g => g.id === activeGenre)?.name}</span>
                    <button onClick={() => setActiveGenre(null)} className="hover:text-white">×</button>
                </div>
            )}
        </div>
    );
}

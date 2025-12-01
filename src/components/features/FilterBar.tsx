
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, ChevronDown, Check, Calendar, Clapperboard, Tv, Heart, Sparkles, LayoutGrid } from 'lucide-react';

interface FilterBarProps {
    genres: { id: number; name: string }[];
}

const SORT_OPTIONS = [
    { id: 'popularity.desc', name: 'Más Populares' },
    { id: 'vote_average.desc', name: 'Mejor Valorados' },
    { id: 'primary_release_date.desc', name: 'Más Recientes' },
];

const CATEGORIES = [
    { id: 'movie', name: 'Películas', icon: Clapperboard, color: 'text-primary' },
    { id: 'tv', name: 'Series', icon: Tv, color: 'text-primary' },
    { id: 'novelas', name: 'Novelas', icon: Heart, color: 'text-pink-500' },
    { id: 'anime', name: 'Anime', icon: Sparkles, color: 'text-yellow-500' },
    { id: 'live-tv', name: 'TV en Vivo', icon: Tv, color: 'text-red-500' },
];

const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);

export default function FilterBar({ genres }: FilterBarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeCategory = searchParams.get('category') || 'movie';
    const activeGenre = searchParams.get('genre') ? Number(searchParams.get('genre')) : null;
    const activeYear = searchParams.get('year') ? Number(searchParams.get('year')) : null;
    const sortBy = searchParams.get('sort_by') || SORT_OPTIONS[0].id;

    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isGenreOpen, setIsGenreOpen] = useState(false);
    const [isYearOpen, setIsYearOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    const updateFilter = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }

        // Reset genre when changing category as genres are specific to media type
        if (key === 'category') {
            params.delete('genre');
        }

        router.push(`?${params.toString()}`);
    };

    const currentCategory = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
    const CategoryIcon = currentCategory.icon;

    return (
        <div className="flex flex-wrap items-center gap-4 mb-8">
            {/* Category Filter */}
            <div className="relative">
                <button
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-surface-light text-text-secondary hover:border-primary/50 transition-all"
                >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Categoría: <span className={`${currentCategory.color} font-medium flex items-center gap-1 inline-flex`}>
                        <CategoryIcon className="w-3 h-3" />
                        {currentCategory.name}
                    </span></span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCategoryOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-surface-light rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
                        <div className="p-2 flex flex-col gap-1">
                            {CATEGORIES.map((category) => {
                                const Icon = category.icon;
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => { updateFilter('category', category.id); setIsCategoryOpen(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${activeCategory === category.id
                                            ? 'bg-primary/10 text-white'
                                            : 'text-text-secondary hover:bg-surface-light hover:text-white'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 ${category.color}`} />
                                        <span>{category.name}</span>
                                        {activeCategory === category.id && <Check className="w-3 h-3 ml-auto" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

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
                        <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                            <button
                                onClick={() => { updateFilter('genre', null); setIsGenreOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!activeGenre ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-light'
                                    }`}
                            >
                                Todos
                            </button>
                            {genres.map((genre) => (
                                <button
                                    key={genre.id}
                                    onClick={() => { updateFilter('genre', String(genre.id)); setIsGenreOpen(false); }}
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

            {/* Year Filter */}
            <div className="relative">
                <button
                    onClick={() => setIsYearOpen(!isYearOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${activeYear
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-surface border-surface-light text-text-secondary hover:border-primary/50'
                        }`}
                >
                    <Calendar className="w-4 h-4" />
                    <span>Año</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isYearOpen ? 'rotate-180' : ''}`} />
                </button>

                {isYearOpen && (
                    <div className="absolute top-full left-0 mt-2 w-32 bg-surface border border-surface-light rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
                        <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                            <button
                                onClick={() => { updateFilter('year', null); setIsYearOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!activeYear ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-light'
                                    }`}
                            >
                                Todos
                            </button>
                            {YEARS.map((year) => (
                                <button
                                    key={year}
                                    onClick={() => { updateFilter('year', String(year)); setIsYearOpen(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${activeYear === year
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-text-secondary hover:bg-surface-light'
                                        }`}
                                >
                                    {year}
                                    {activeYear === year && <Check className="w-3 h-3" />}
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
                                    onClick={() => { updateFilter('sort_by', option.id); setIsSortOpen(false); }}
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
            {(activeGenre || activeYear) && (
                <div className="flex items-center gap-2 animate-fade-in">
                    {activeGenre && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary">
                            <span>{genres.find(g => g.id === activeGenre)?.name}</span>
                            <button onClick={() => updateFilter('genre', null)} className="hover:text-white">×</button>
                        </div>
                    )}
                    {activeYear && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary">
                            <span>{activeYear}</span>
                            <button onClick={() => updateFilter('year', null)} className="hover:text-white">×</button>
                        </div>
                    )}
                    <button
                        onClick={() => router.push('?')}
                        className="text-xs text-text-secondary hover:text-white transition-colors"
                    >
                        Limpiar todo
                    </button>
                </div>
            )}
        </div>
    );
}

'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
    Filter,
    ChevronDown,
    Check,
    Calendar,
    Film,
    Tv,
    LibraryBig,
    Palette,
    Radio,
    ArrowDownWideNarrow,
    X,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FilterBarProps {
    genres: { id: number; name: string }[];
}

const SORT_OPTIONS = [
    { id: 'popularity.desc', name: 'Más Populares' },
    { id: 'vote_average.desc', name: 'Mejor Valorados' },
    { id: 'primary_release_date.desc', name: 'Más Recientes' },
];

const CATEGORIES = [
    { id: 'movie', name: 'Películas', icon: Film, color: 'text-sky-400' },
    { id: 'tv', name: 'Series', icon: Tv, color: 'text-violet-400' },
    { id: 'novelas', name: 'Novelas', icon: LibraryBig, color: 'text-rose-400' },
    { id: 'anime', name: 'Anime', icon: Palette, color: 'text-amber-400' },
    { id: 'live-tv', name: 'TV en Vivo', icon: Radio, color: 'text-red-400' },
];

const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);

export default function FilterBar({ genres }: FilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const basePath = pathname || '/browse';

    const activeCategory = searchParams.get('category') || 'movie';
    const activeGenre = searchParams.get('genre') ? Number(searchParams.get('genre')) : null;
    const activeYear = searchParams.get('year') ? Number(searchParams.get('year')) : null;
    const sortBy = searchParams.get('sort_by') || SORT_OPTIONS[0].id;

    const navigateWithParams = (params: URLSearchParams) => {
        const qs = params.toString();
        router.push(qs ? `${basePath}?${qs}` : basePath);
    };

    const updateFilter = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }

        if (key === 'category') {
            params.delete('genre');
        }

        navigateWithParams(params);
    };

    const currentCategory = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
    const CategoryIcon = currentCategory.icon;

    const pillBase =
        'inline-flex items-center gap-2 shrink-0 px-5 py-2.5 rounded-full border border-white/5 text-sm font-semibold transition-all hover:bg-white/5 hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50';

    const dropdownContentClass =
        'min-w-[14rem] rounded-2xl border border-white/10 bg-surface/95 backdrop-blur-2xl shadow-2xl shadow-black/60 z-[100] overflow-hidden p-1.5';

    return (
        <div className="flex flex-nowrap overflow-x-auto pb-2 md:pb-0 md:flex-wrap items-center gap-3 mb-10 custom-scrollbar scroll-smooth">
            {/* Category Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            pillBase,
                            'bg-surface/80 border-white/10 text-text-secondary hover:border-primary/40 hover:bg-surface data-[state=open]:border-primary/40 data-[state=open]:bg-surface'
                        )}
                    >
                        <CategoryIcon className={cn('w-4 h-4', currentCategory.color)} aria-hidden />
                        <span className="text-text-secondary whitespace-nowrap">
                            Categoría{' '}
                            <span className="text-text-primary font-semibold inline-flex items-center gap-1.5">
                                {currentCategory.name}
                            </span>
                        </span>
                        <ChevronDown className="w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className={cn(dropdownContentClass, 'w-56')}>
                    <div className="flex flex-col gap-0.5">
                        {CATEGORIES.map((category) => {
                            const Icon = category.icon;
                            return (
                                <DropdownMenuItem
                                    key={category.id}
                                    onClick={() => updateFilter('category', category.id)}
                                    className={cn(
                                        'w-full cursor-pointer px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-3 outline-none focus:bg-white/5',
                                        activeCategory === category.id
                                            ? 'bg-primary/15 text-white border border-primary/25'
                                            : 'text-text-secondary hover:bg-white/5 hover:text-text-primary border border-transparent'
                                    )}
                                >
                                    <Icon className={cn('w-4 h-4 shrink-0', category.color)} aria-hidden />
                                    <span className="font-medium">{category.name}</span>
                                    {activeCategory === category.id && <Check className="w-4 h-4 ml-auto text-primary" aria-hidden />}
                                </DropdownMenuItem>
                            );
                        })}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Genre Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            pillBase,
                            activeGenre
                                ? 'bg-primary/15 border-primary/50 text-primary'
                                : 'bg-surface/80 border-white/10 text-text-secondary hover:border-primary/40',
                            'data-[state=open]:border-primary/40'
                        )}
                    >
                        <Filter className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
                        <span className="whitespace-nowrap">Género</span>
                        <ChevronDown className="w-4 h-4 shrink-0 opacity-70 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className={cn(dropdownContentClass, 'w-56')}>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                        <DropdownMenuItem
                            onClick={() => updateFilter('genre', null)}
                            className={cn(
                                'w-full cursor-pointer px-3 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none focus:bg-white/5',
                                !activeGenre
                                    ? 'bg-primary/15 text-primary border border-primary/20'
                                    : 'text-text-secondary hover:bg-white/5 hover:text-text-primary border border-transparent'
                            )}
                        >
                            Todos los géneros
                        </DropdownMenuItem>
                        {genres.map((genre) => (
                            <DropdownMenuItem
                                key={genre.id}
                                onClick={() => updateFilter('genre', String(genre.id))}
                                className={cn(
                                    'w-full cursor-pointer px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between gap-2 outline-none focus:bg-white/5',
                                    activeGenre === genre.id
                                        ? 'bg-primary/15 text-primary border border-primary/20'
                                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary border border-transparent'
                                )}
                            >
                                <span className="truncate">{genre.name}</span>
                                {activeGenre === genre.id && <Check className="w-4 h-4 shrink-0 text-primary" aria-hidden />}
                            </DropdownMenuItem>
                        ))}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Year Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            pillBase,
                            activeYear
                                ? 'bg-primary/15 border-primary/50 text-primary'
                                : 'bg-surface/80 border-white/10 text-text-secondary hover:border-primary/40',
                            'data-[state=open]:border-primary/40'
                        )}
                    >
                        <Calendar className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
                        <span className="whitespace-nowrap">Año</span>
                        <ChevronDown className="w-4 h-4 shrink-0 opacity-70 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className={cn(dropdownContentClass, 'w-36')}>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                        <DropdownMenuItem
                            onClick={() => updateFilter('year', null)}
                            className={cn(
                                'w-full cursor-pointer px-3 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none focus:bg-white/5',
                                !activeYear
                                    ? 'bg-primary/15 text-primary border border-primary/20'
                                    : 'text-text-secondary hover:bg-white/5 hover:text-text-primary border border-transparent'
                            )}
                        >
                            Cualquiera
                        </DropdownMenuItem>
                        {YEARS.map((year) => (
                            <DropdownMenuItem
                                key={year}
                                onClick={() => updateFilter('year', String(year))}
                                className={cn(
                                    'w-full cursor-pointer px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between outline-none focus:bg-white/5',
                                    activeYear === year
                                        ? 'bg-primary/15 text-primary border border-primary/20'
                                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary border border-transparent'
                                )}
                            >
                                {year}
                                {activeYear === year && <Check className="w-4 h-4 shrink-0 text-primary" aria-hidden />}
                            </DropdownMenuItem>
                        ))}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            pillBase,
                            'bg-surface/80 border-white/10 text-text-secondary hover:border-primary/40 data-[state=open]:border-primary/40 data-[state=open]:bg-surface'
                        )}
                    >
                        <ArrowDownWideNarrow className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
                        <span className="text-text-secondary whitespace-nowrap">
                            Ordenar{' '}
                            <span className="text-text-primary font-semibold">
                                {SORT_OPTIONS.find(o => o.id === sortBy)?.name}
                            </span>
                        </span>
                        <ChevronDown className="w-4 h-4 shrink-0 text-text-muted transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className={cn(dropdownContentClass, 'w-60')}>
                    <div className="flex flex-col gap-0.5">
                        {SORT_OPTIONS.map((option) => (
                            <DropdownMenuItem
                                key={option.id}
                                onClick={() => updateFilter('sort_by', option.id)}
                                className={cn(
                                    'w-full cursor-pointer px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between gap-2 outline-none focus:bg-white/5',
                                    sortBy === option.id
                                        ? 'bg-primary/15 text-primary border border-primary/20'
                                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary border border-transparent'
                                )}
                            >
                                <span className="font-medium">{option.name}</span>
                                {sortBy === option.id && <Check className="w-4 h-4 shrink-0 text-primary" aria-hidden />}
                            </DropdownMenuItem>
                        ))}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {(activeGenre || activeYear) && (
                <div className="flex flex-wrap items-center gap-2 pl-1 animate-fade-in">
                    {activeGenre && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-medium text-primary">
                            <span className="max-w-[10rem] truncate">{genres.find(g => g.id === activeGenre)?.name}</span>
                            <button
                                type="button"
                                onClick={() => updateFilter('genre', null)}
                                className="rounded-full p-0.5 hover:bg-primary/20 tv-focusable focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                aria-label="Quitar filtro de género"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    {activeYear && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-medium text-primary">
                            <span>{activeYear}</span>
                            <button
                                type="button"
                                onClick={() => updateFilter('year', null)}
                                className="rounded-full p-0.5 hover:bg-primary/20 tv-focusable focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                aria-label="Quitar filtro de año"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => router.push(basePath)}
                        className="text-xs font-medium text-text-muted hover:text-text-primary underline-offset-2 hover:underline tv-focusable focus:outline-none focus-visible:text-text-primary"
                    >
                        Limpiar filtros
                    </button>
                </div>
            )}
        </div>
    );
}

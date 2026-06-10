'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
    Filter, ChevronDown, Check, Calendar,
    Film, Tv, Radio,
    ArrowDownWideNarrow, X,
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuTrigger,
    DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FilterBarProps {
    genres: { id: number; name: string }[];
}

const SORT_OPTIONS = [
    { id: 'popularity.desc',            name: 'Más Populares'  },
    { id: 'vote_average.desc',          name: 'Mejor Valorados' },
    { id: 'primary_release_date.desc',  name: 'Más Recientes'  },
];

const CATEGORIES = [
    { id: 'movie',   name: 'Películas',  icon: Film,  color: 'text-sky-400'    },
    { id: 'tv',      name: 'Series',     icon: Tv,    color: 'text-violet-400' },
    { id: 'live-tv', name: 'TV en Vivo', icon: Radio, color: 'text-red-400'    },
];

// Fuera del componente para no regenerar el array en cada render
const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);

export default function FilterBar({ genres }: FilterBarProps) {
    const router       = useRouter();
    const pathname     = usePathname();
    const searchParams = useSearchParams();
    const basePath     = pathname || '/browse';

    const activeCategory = searchParams.get('category') || 'movie';
    const activeGenre    = searchParams.get('genre') ? Number(searchParams.get('genre')) : null;
    const activeYear     = searchParams.get('year')  ? Number(searchParams.get('year'))  : null;
    const sortBy         = searchParams.get('sort_by') || SORT_OPTIONS[0].id;

    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Detectar si hay overflow para mostrar indicadores de sombra
    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        checkScroll();
        el.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', checkScroll);
        return () => {
            el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [checkScroll, genres]); // Re-evaluar si cambian los géneros o la categoría

    const navigateWithParams = useCallback((params: URLSearchParams) => {
        const qs = params.toString();
        router.push(qs ? `${basePath}?${qs}` : basePath);
    }, [router, basePath]);

    const updateFilter = useCallback((key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) { params.set(key, value); } else { params.delete(key); }
        if (key === 'category') params.delete('genre');
        navigateWithParams(params);
    }, [searchParams, navigateWithParams]);

    const currentCategory = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
    const CategoryIcon    = currentCategory.icon;

    /* ── Clases reutilizables ── */
    const chip = useMemo(() =>
        'inline-flex items-center gap-1.5 shrink-0 px-3 h-8 rounded-full border ' +
        'text-[0.75rem] leading-[1rem] tracking-[0.03125rem] font-medium ' +
        'transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
    []);

    const menu = useMemo(() =>
        'rounded-[var(--radius-lg)] border border-outline-variant bg-surface-container ' +
        'shadow-[var(--shadow-3)] z-[100] overflow-hidden p-1',
    []);

    const menuItem = useCallback((active: boolean) => cn(
        'w-full cursor-pointer px-3 py-2 rounded-[var(--radius-md)] md3-label-large',
        'transition-colors flex items-center gap-2.5 outline-none',
        active
            ? 'bg-secondary-container text-on-secondary-container'
            : 'text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface'
    ), []);

    return (
        <div className="relative mb-6">
            {/* Indicadores de scroll lateral en móviles */}
            {canScrollLeft && (
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none" />
            )}
            {canScrollRight && (
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none" />
            )}

            <div
                ref={scrollRef}
                className="flex flex-nowrap overflow-x-auto pb-1 md:pb-0 md:flex-wrap items-center gap-2 scrollbar-hide"
            >
                {/* ── Category ── */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className={cn(chip,
                            'bg-surface-container border-outline-variant text-on-surface-variant',
                            'hover:bg-on-surface/8 hover:text-on-surface',
                            'data-[state=open]:bg-secondary-container data-[state=open]:border-secondary-container data-[state=open]:text-on-secondary-container'
                        )}>
                            <CategoryIcon className={cn('w-3.5 h-3.5', currentCategory.color)} aria-hidden />
                            <span className="whitespace-nowrap">{currentCategory.name}</span>
                            <ChevronDown className="w-3 h-3 opacity-60 transition-transform [[data-state=open]_&]:rotate-180" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className={cn(menu, 'w-52')}>
                        {CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <DropdownMenuItem
                                    key={cat.id}
                                    onClick={() => updateFilter('category', cat.id)}
                                    className={menuItem(activeCategory === cat.id)}
                                >
                                    <Icon className={cn('w-3.5 h-3.5 shrink-0', cat.color)} aria-hidden />
                                    <span>{cat.name}</span>
                                    {activeCategory === cat.id && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* ── Genre ── */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className={cn(chip,
                            activeGenre
                                ? 'bg-secondary-container border-secondary-container text-on-secondary-container'
                                : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-on-surface/8',
                            'data-[state=open]:bg-secondary-container data-[state=open]:border-secondary-container'
                        )}>
                            <Filter className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            <span className="whitespace-nowrap">Género</span>
                            <ChevronDown className="w-3 h-3 opacity-60 transition-transform [[data-state=open]_&]:rotate-180" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className={cn(menu, 'w-52')}>
                        <div className="max-h-56 overflow-y-auto scrollbar-hide flex flex-col gap-0.5">
                            <DropdownMenuItem onClick={() => updateFilter('genre', null)} className={menuItem(!activeGenre)}>
                                Todos los géneros
                            </DropdownMenuItem>
                            {genres.map((g) => (
                                <DropdownMenuItem
                                    key={g.id}
                                    onClick={() => updateFilter('genre', String(g.id))}
                                    className={cn(menuItem(activeGenre === g.id), 'justify-between')}
                                >
                                    <span className="truncate">{g.name}</span>
                                    {activeGenre === g.id && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                                </DropdownMenuItem>
                            ))}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* ── Year ── */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className={cn(chip,
                            activeYear
                                ? 'bg-secondary-container border-secondary-container text-on-secondary-container'
                                : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-on-surface/8',
                            'data-[state=open]:bg-secondary-container data-[state=open]:border-secondary-container'
                        )}>
                            <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            <span className="whitespace-nowrap">Año</span>
                            <ChevronDown className="w-3 h-3 opacity-60 transition-transform [[data-state=open]_&]:rotate-180" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className={cn(menu, 'w-32')}>
                        <div className="max-h-56 overflow-y-auto scrollbar-hide flex flex-col gap-0.5">
                            <DropdownMenuItem onClick={() => updateFilter('year', null)} className={menuItem(!activeYear)}>
                                Cualquiera
                            </DropdownMenuItem>
                            {YEARS.map((y) => (
                                <DropdownMenuItem
                                    key={y}
                                    onClick={() => updateFilter('year', String(y))}
                                    className={cn(menuItem(activeYear === y), 'justify-between')}
                                >
                                    {y}
                                    {activeYear === y && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                                </DropdownMenuItem>
                            ))}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* ── Sort ── */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className={cn(chip,
                            'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-on-surface/8',
                            'data-[state=open]:bg-secondary-container data-[state=open]:border-secondary-container data-[state=open]:text-on-secondary-container'
                        )}>
                            <ArrowDownWideNarrow className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            <span className="whitespace-nowrap">{SORT_OPTIONS.find(o => o.id === sortBy)?.name}</span>
                            <ChevronDown className="w-3 h-3 opacity-60 transition-transform [[data-state=open]_&]:rotate-180" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className={cn(menu, 'w-52')}>
                        {SORT_OPTIONS.map((opt) => (
                            <DropdownMenuItem
                                key={opt.id}
                                onClick={() => updateFilter('sort_by', opt.id)}
                                className={cn(menuItem(sortBy === opt.id), 'justify-between')}
                            >
                                <span>{opt.name}</span>
                                {sortBy === opt.id && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* ── Active filter chips ── */}
                {(activeGenre || activeYear) && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-1">
                        {activeGenre && (
                            <span className="flex items-center gap-1 px-2.5 h-7 rounded-full bg-primary-container border border-primary/30 md3-label-small text-on-primary-container">
                                <span className="max-w-[8rem] truncate">
                                    {genres.find(g => g.id === activeGenre)?.name || activeGenre}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => updateFilter('genre', null)}
                                    className="rounded-full hover:bg-primary/20 p-0.5 focus:outline-none"
                                    aria-label={`Quitar género ${genres.find(g => g.id === activeGenre)?.name}`}
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </span>
                        )}
                        {activeYear && (
                            <span className="flex items-center gap-1 px-2.5 h-7 rounded-full bg-primary-container border border-primary/30 md3-label-small text-on-primary-container">
                                <span>{activeYear}</span>
                                <button
                                    type="button"
                                    onClick={() => updateFilter('year', null)}
                                    className="rounded-full hover:bg-primary/20 p-0.5 focus:outline-none"
                                    aria-label={`Quitar año ${activeYear}`}
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => router.push(basePath)}
                            className="md3-label-small text-on-surface-variant hover:text-on-surface underline-offset-2 hover:underline focus:outline-none"
                        >
                            Limpiar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
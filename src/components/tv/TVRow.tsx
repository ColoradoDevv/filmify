'use client';

import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, Tv, Film, Star, Flame, PlayCircle, Clock, Sparkles, Radio, Heart, type LucideIcon } from 'lucide-react';
import MovieCard from '@/components/features/MovieCard';
import type { Movie, TVShow } from '@/types/tmdb';

// Icon registry — resolves string names to Lucide components
// so Server Components can pass a plain string instead of a function
const ICON_MAP: Record<string, LucideIcon> = {
    TrendingUp, Tv, Film, Star, Flame, PlayCircle, Clock, Sparkles, Radio, Heart,
};

interface TVRowProps {
    title: string;
    items: (Movie | TVShow)[];
    mediaType?: 'movie' | 'tv';
    /** Name of a Lucide icon from the ICON_MAP above */
    iconName?: string;
    /** Called when focus enters this row — used by parent to track active row */
    onRowFocus?: () => void;
}

export default function TVRow({ title, items, mediaType = 'movie', iconName, onRowFocus }: TVRowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const rowRef = useRef<HTMLDivElement>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(true);

    const Icon = iconName ? ICON_MAP[iconName] : undefined;

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (el) {
            el.addEventListener('scroll', checkScroll, { passive: true });
            return () => el.removeEventListener('scroll', checkScroll);
        }
    }, [items]);

    const scrollBy = (dir: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const amount = el.clientWidth * 0.7;
        el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    };

    const handleCardKeyDown = (e: React.KeyboardEvent, index: number) => {
        const el = scrollRef.current;
        if (!el) return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            e.stopPropagation();
            if (index > 0) {
                const prev = el.children[index - 1] as HTMLElement;
                const focusable = prev.querySelector<HTMLElement>('[tabindex="0"], [data-focusable="true"]');
                focusable?.focus();
                // Scroll into view
                prev.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            e.stopPropagation();
            if (index < items.length - 1) {
                const next = el.children[index + 1] as HTMLElement;
                const focusable = next.querySelector<HTMLElement>('[tabindex="0"], [data-focusable="true"]');
                focusable?.focus();
                next.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
        }
        // ArrowUp / ArrowDown bubble up to parent for row navigation
    };

    return (
        <div
            ref={rowRef}
            className="tv-row group/row"
            onFocus={onRowFocus}
        >
            {/* Row header */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2.5">
                    {Icon && <Icon className="w-5 h-5 text-primary" />}
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <span className="text-sm text-white/30 font-normal">({items.length})</span>
                </div>

                {/* Scroll buttons — visible on row focus */}
                <div className="flex gap-2 opacity-0 group-focus-within/row:opacity-100 transition-opacity">
                    <button
                        onClick={() => scrollBy('left')}
                        disabled={!canLeft}
                        className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-20 hover:bg-white/20 transition-colors tv-focusable focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Desplazar izquierda"
                        tabIndex={-1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => scrollBy('right')}
                        disabled={!canRight}
                        className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white disabled:opacity-20 hover:bg-white/20 transition-colors tv-focusable focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Desplazar derecha"
                        tabIndex={-1}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Scroll container */}
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-1 px-1"
                style={{ scrollSnapType: 'x mandatory' }}
            >
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="flex-shrink-0 w-[160px] lg:w-[180px] xl:w-[200px] tv-row-item"
                        style={{ scrollSnapAlign: 'start' }}
                        onKeyDown={(e) => handleCardKeyDown(e, index)}
                    >
                        <MovieCard
                            movie={item}
                            mediaType={mediaType}
                        />
                    </div>
                ))}
            </div>

            {/* Fade edges */}
            {canLeft && (
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
            )}
            {canRight && (
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
            )}
        </div>
    );
}

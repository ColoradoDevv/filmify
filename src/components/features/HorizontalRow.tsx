'use client';

import { useRef, useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import MovieCard from './MovieCard';
import type { Movie, TVShow } from '@/types/tmdb';

interface HorizontalRowProps {
    title: string;
    items: (Movie | TVShow)[];
    mediaType?: 'movie' | 'tv';
    onFocus?: () => void;
    icon?: LucideIcon;
}

export default function HorizontalRow({ title, items, mediaType = 'movie', onFocus, icon: Icon }: HorizontalRowProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft,  setCanScrollLeft]  = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScrollButtons = () => {
        if (!scrollContainerRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    useEffect(() => {
        checkScrollButtons();
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScrollButtons);
            return () => container.removeEventListener('scroll', checkScrollButtons);
        }
    }, [items]);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;
        const amount = scrollContainerRef.current.clientWidth * 0.75;
        scrollContainerRef.current.scrollTo({
            left: scrollContainerRef.current.scrollLeft + (direction === 'left' ? -amount : amount),
            behavior: 'smooth',
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        const container = scrollContainerRef.current;
        if (!container) return;
        if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            const prev = container.children[index - 1] as HTMLElement;
            (prev.querySelector('[tabindex="0"]') as HTMLElement)?.focus();
            if (prev.offsetLeft < container.scrollLeft) scroll('left');
        }
        if (e.key === 'ArrowRight' && index < items.length - 1) {
            e.preventDefault();
            const next = container.children[index + 1] as HTMLElement;
            (next.querySelector('[tabindex="0"]') as HTMLElement)?.focus();
            const cardRight = next.offsetLeft + next.offsetWidth;
            if (cardRight > container.scrollLeft + container.clientWidth) scroll('right');
        }
    };

    return (
        <div className="mb-8 tv-row" onFocus={onFocus}>
            {/* Row header */}
            <div className="flex items-center justify-between mb-3 px-4 sm:px-5">
                <div className="flex items-center gap-2">
                    {Icon && (
                        /* MD3 icon in a tonal container */
                        <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 text-on-secondary-container" strokeWidth={2} />
                        </div>
                    )}
                    <h2 className="md3-title-large text-on-surface">{title}</h2>
                </div>

                {/* MD3 icon buttons for scroll */}
                <div className="hidden lg:flex gap-1">
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        aria-label="Anterior"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        aria-label="Siguiente"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Scroll container */}
            <div className="relative px-4 sm:px-5">
                <div
                    ref={scrollContainerRef}
                    className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    role="list"
                    aria-label={title}
                >
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            /* MD3 card widths: smaller than before */
                            className="flex-shrink-0 w-[130px] sm:w-[155px] lg:w-[175px] tv-row-item"
                            role="listitem"
                            onKeyDown={(e) => handleKeyDown(e, index)}
                        >
                            <MovieCard movie={item} mediaType={mediaType} />
                        </div>
                    ))}
                </div>

                {/* Edge fade overlays */}
                {canScrollLeft && (
                    <div className="absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
                )}
                {canScrollRight && (
                    <div className="absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                )}
            </div>
        </div>
    );
}

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
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [focusedIndex, setFocusedIndex] = useState(-1);

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

        const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
        const newScrollLeft = direction === 'left'
            ? scrollContainerRef.current.scrollLeft - scrollAmount
            : scrollContainerRef.current.scrollLeft + scrollAmount;

        scrollContainerRef.current.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth'
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        switch (e.key) {
            case 'ArrowLeft':
                if (index > 0) {
                    e.preventDefault();
                    const prevCard = container.children[index - 1] as HTMLElement;
                    const focusable = prevCard.querySelector('[tabindex="0"]') as HTMLElement;
                    focusable?.focus();

                    // Auto-scroll if needed
                    if (prevCard.offsetLeft < container.scrollLeft) {
                        scroll('left');
                    }
                }
                break;
            case 'ArrowRight':
                if (index < items.length - 1) {
                    e.preventDefault();
                    const nextCard = container.children[index + 1] as HTMLElement;
                    const focusable = nextCard.querySelector('[tabindex="0"]') as HTMLElement;
                    focusable?.focus();

                    // Auto-scroll if needed
                    const cardRight = nextCard.offsetLeft + nextCard.offsetWidth;
                    const containerRight = container.scrollLeft + container.clientWidth;
                    if (cardRight > containerRight) {
                        scroll('right');
                    }
                }
                break;
        }
    };

    return (
        <div className="mb-12 tv-row" onFocus={onFocus}>
            {/* Row Title */}
            <div className="flex items-center justify-between mb-6 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    {Icon && (
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={2.5} />
                        </div>
                    )}
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {title}
                    </h2>
                </div>

                {/* Scroll Buttons (visible on hover/focus) */}
                <div className="hidden lg:flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className="w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed tv-focusable"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className="w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed tv-focusable"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Horizontal Scrolling Container */}
            <div className="relative group px-4 sm:px-6 lg:px-8">
                <div
                    ref={scrollContainerRef}
                    className="flex gap-4 sm:gap-6 overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth pb-4"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                    role="list"
                    aria-label={title}
                >
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className="flex-shrink-0 w-[160px] sm:w-[200px] lg:w-[240px] tv-row-item"
                            role="listitem"
                            onFocus={() => setFocusedIndex(index)}
                            onBlur={() => setFocusedIndex(-1)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                        >
                            <MovieCard movie={item} mediaType={mediaType} />
                        </div>
                    ))}
                </div>

                {/* Gradient Overlays for scroll indication */}
                {canScrollLeft && (
                    <div className="absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none" />
                )}
                {canScrollRight && (
                    <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                )}
            </div>
        </div>
    );
}

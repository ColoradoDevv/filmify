'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Play, Info, Star, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getBackdropUrl } from '@/lib/tmdb/helpers';
import type { Movie, TVShow } from '@/types/tmdb';

interface TVHeroProps {
    items: (Movie | TVShow)[];
    mediaType?: 'movie' | 'tv';
    onFocusChange?: (focused: boolean) => void;
}

export default function TVHero({ items, mediaType = 'movie', onFocusChange }: TVHeroProps) {
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const playBtnRef = useRef<HTMLButtonElement>(null);
    const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const featured = items.slice(0, 5);
    const current = featured[activeIndex];

    const title = current
        ? ('title' in current ? current.title : current.name)
        : '';
    const date = current
        ? ('release_date' in current ? current.release_date : current.first_air_date)
        : '';
    const year = date ? new Date(date).getFullYear() : '';
    const backdropUrl = current ? getBackdropUrl(current.backdrop_path) : null;

    const goTo = useCallback((index: number) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveIndex(index);
            setIsTransitioning(false);
        }, 300);
    }, [isTransitioning]);

    const goNext = useCallback(() => {
        goTo((activeIndex + 1) % featured.length);
    }, [activeIndex, featured.length, goTo]);

    const goPrev = useCallback(() => {
        goTo((activeIndex - 1 + featured.length) % featured.length);
    }, [activeIndex, featured.length, goTo]);

    // Auto-rotate every 8 seconds
    useEffect(() => {
        autoPlayRef.current = setInterval(goNext, 8000);
        return () => {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        };
    }, [goNext]);

    // Pause auto-rotate on focus
    const pauseAutoPlay = () => {
        if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        onFocusChange?.(true);
    };
    const resumeAutoPlay = () => {
        autoPlayRef.current = setInterval(goNext, 8000);
        onFocusChange?.(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                e.stopPropagation();
                goPrev();
                break;
            case 'ArrowRight':
                e.preventDefault();
                e.stopPropagation();
                goNext();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (current) {
                    router.push(`/${mediaType}/${current.id}`);
                }
                break;
        }
    };

    const handlePlayClick = () => {
        if (current) router.push(`/${mediaType}/${current.id}`);
    };

    const handleInfoClick = () => {
        if (current) router.push(`/${mediaType}/${current.id}`);
    };

    if (!current) return null;

    return (
        <div
            ref={containerRef}
            className="relative w-full h-[55vh] min-h-[400px] overflow-hidden rounded-2xl mb-8 group"
            onFocus={pauseAutoPlay}
            onBlur={resumeAutoPlay}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            aria-label={`Contenido destacado: ${title}`}
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
            >
                {backdropUrl ? (
                    <Image
                        src={backdropUrl}
                        alt={title}
                        fill
                        className="object-cover"
                        priority
                        sizes="100vw"
                    />
                ) : (
                    <div className="w-full h-full bg-surface-container-high" />
                )}
            </div>

            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

            {/* Content */}
            <div
                className={`absolute bottom-0 left-0 right-0 p-8 lg:p-12 transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
            >
                <div className="max-w-2xl">
                    {/* Meta */}
                    <div className="flex items-center gap-4 mb-3 text-sm text-white/70">
                        <span className="flex items-center gap-1.5 text-yellow-400">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-bold text-white">{current.vote_average.toFixed(1)}</span>
                        </span>
                        {year && (
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {year}
                            </span>
                        )}
                        {current.genre_ids?.slice(0, 2).map((id) => (
                            <span key={id} className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
                                {mediaType === 'tv' ? 'Serie' : 'Película'}
                            </span>
                        ))}
                    </div>

                    {/* Title */}
                    <h2 className="text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight line-clamp-2">
                        {title}
                    </h2>

                    {/* Overview */}
                    <p className="text-white/70 text-base lg:text-lg leading-relaxed line-clamp-2 mb-6 max-w-xl">
                        {current.overview}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <button
                            ref={playBtnRef}
                            onClick={handlePlayClick}
                            className="flex items-center gap-3 px-7 py-3.5 bg-primary text-on-primary rounded-xl font-bold text-lg hover:bg-primary-hover transition-all tv-focusable focus:scale-105 focus:shadow-[0_0_0_4px_rgba(0,194,255,0.4)]"
                            tabIndex={0}
                            data-focusable="true"
                            aria-label={`Ver ${title}`}
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Ver Ahora
                        </button>

                        <button
                            onClick={handleInfoClick}
                            className="flex items-center gap-3 px-7 py-3.5 bg-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all tv-focusable focus:scale-105 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.2)] border border-white/10 backdrop-blur-sm"
                            tabIndex={0}
                            data-focusable="true"
                            aria-label={`Más información sobre ${title}`}
                        >
                            <Info className="w-5 h-5" />
                            Más Info
                        </button>
                    </div>
                </div>
            </div>

            {/* Slide indicators */}
            <div className="absolute bottom-6 right-8 flex items-center gap-2">
                {featured.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goTo(i)}
                        className={`transition-all duration-300 rounded-full tv-focusable focus:outline-none focus:ring-2 focus:ring-primary ${
                            i === activeIndex
                                ? 'w-8 h-2 bg-primary'
                                : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                        }`}
                        aria-label={`Ir al elemento ${i + 1}`}
                        tabIndex={0}
                        data-focusable="true"
                    />
                ))}
            </div>

            {/* Prev/Next arrows — visible on focus */}
            <button
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-focus-within:opacity-100 hover:opacity-100 transition-opacity tv-focusable focus:opacity-100 focus:ring-2 focus:ring-primary"
                aria-label="Anterior"
                tabIndex={0}
                data-focusable="true"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-focus-within:opacity-100 hover:opacity-100 transition-opacity tv-focusable focus:opacity-100 focus:ring-2 focus:ring-primary"
                aria-label="Siguiente"
                tabIndex={0}
                data-focusable="true"
            >
                <ChevronRight className="w-6 h-6" />
            </button>
        </div>
    );
}

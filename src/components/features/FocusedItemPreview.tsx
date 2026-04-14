'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Play, Info, Star, Calendar, Clock } from 'lucide-react';
import { getPosterUrl, getBackdropUrl } from '@/lib/tmdb/helpers';
import type { Movie, TVShow } from '@/types/tmdb';
import Link from 'next/link';

interface FocusedItemPreviewProps {
    item: Movie | TVShow | null;
    mediaType?: 'movie' | 'tv';
}

export default function FocusedItemPreview({ item, mediaType = 'movie' }: FocusedItemPreviewProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (item) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [item]);

    if (!item) return null;

    const title = 'title' in item ? item.title : item.name;
    const date = 'release_date' in item ? item.release_date : item.first_air_date;
    const year = date ? new Date(date).getFullYear() : 'N/A';
    const backdropUrl = getBackdropUrl(item.backdrop_path);
    const linkHref = mediaType === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`;

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 lg:left-80 h-[40vh] bg-gradient-to-t from-background via-background/95 to-transparent border-t border-white/10 backdrop-blur-xl z-40 transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                }`}
        >
            <div className="relative h-full">
                {/* Background Image */}
                {backdropUrl && (
                    <div className="absolute inset-0 overflow-hidden">
                        <Image
                            src={backdropUrl}
                            alt={title}
                            fill
                            className="object-cover opacity-20"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
                    </div>
                )}

                {/* Content */}
                <div className="relative h-full flex flex-col justify-end p-8 lg:p-12">
                    <div className="max-w-3xl">
                        {/* Title */}
                        <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4 line-clamp-2 tv-text-2xl">
                            {title}
                        </h2>

                        {/* Metadata */}
                        <div className="flex items-center gap-6 mb-4 text-text-secondary">
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                <span className="text-lg font-semibold text-white">
                                    {item.vote_average.toFixed(1)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                <span className="text-lg">{year}</span>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium uppercase">
                                {mediaType === 'tv' ? 'Serie' : 'Película'}
                            </span>
                        </div>

                        {/* Description */}
                        <p className="text-text-secondary text-lg leading-relaxed mb-6 line-clamp-3">
                            {item.overview || 'Sin descripción disponible.'}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <Link
                                href={linkHref}
                                className="px-8 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl flex items-center gap-3 transition-all hover:scale-105 shadow-lg shadow-primary/20 tv-button-focus focus:outline-none"
                                tabIndex={-1}
                            >
                                <Play className="w-6 h-6 fill-current" />
                                <span className="text-lg">Ver Ahora</span>
                            </Link>
                            <Link
                                href={linkHref}
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center gap-3 transition-all hover:scale-105 backdrop-blur-md border border-white/20 tv-button-focus focus:outline-none"
                                tabIndex={-1}
                            >
                                <Info className="w-6 h-6" />
                                <span className="text-lg">Más Info</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

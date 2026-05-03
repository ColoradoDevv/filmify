'use client';

import { useState, useEffect, useCallback } from 'react';
import { TvMinimalPlay, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LiveChannel } from '@/services/liveTV';
import ChannelCard from './ChannelCard';
import LiveTVPlayer from './LiveTVPlayer';

const PAGE_SIZE = 48;

interface LiveTVGridProps {
    channels: LiveChannel[];
}

export default function LiveTVGrid({ channels }: LiveTVGridProps) {
    const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
    const [page, setPage] = useState(0);

    useEffect(() => { setPage(0); }, [channels]);

    const totalPages   = Math.ceil(channels.length / PAGE_SIZE);
    const pageChannels = channels.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const goTo = (p: number) => {
        setPage(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Navigate to prev/next channel within the full filtered list
    const currentIndex = selectedChannel
        ? channels.findIndex(c => c.id === selectedChannel.id)
        : -1;

    const goToPrevChannel = useCallback(() => {
        if (currentIndex > 0) setSelectedChannel(channels[currentIndex - 1]);
    }, [channels, currentIndex]);

    const goToNextChannel = useCallback(() => {
        if (currentIndex < channels.length - 1) setSelectedChannel(channels[currentIndex + 1]);
    }, [channels, currentIndex]);

    // Channels in the same category (excluding current) for suggestions
    const relatedChannels = selectedChannel
        ? channels
            .filter(c => c.category === selectedChannel.category && c.id !== selectedChannel.id)
            .slice(0, 6)
        : [];

    if (channels.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="inline-flex p-5 bg-surface-container rounded-full border border-outline-variant mb-4">
                    <TvMinimalPlay className="w-12 h-12 text-on-surface-variant" strokeWidth={1.5} />
                </div>
                <h3 className="md3-title-large text-on-surface mb-1">No se encontraron canales</h3>
                <p className="md3-body-medium text-on-surface-variant">Intenta ajustar los filtros de búsqueda</p>
            </div>
        );
    }

    return (
        <>
            <p className="md3-label-medium text-on-surface-variant mb-3">
                {channels.length.toLocaleString()} canales
                {totalPages > 1 && ` · página ${page + 1} de ${totalPages}`}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {pageChannels.map((channel) => (
                    <ChannelCard
                        key={channel.id}
                        channel={channel}
                        onClick={() => setSelectedChannel(channel)}
                    />
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                        onClick={() => goTo(page - 1)}
                        disabled={page === 0}
                        aria-label="Página anterior"
                        className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i)
                        .filter(i => {
                            if (totalPages <= 7) return true;
                            if (i === 0 || i === totalPages - 1) return true;
                            if (Math.abs(i - page) <= 2) return true;
                            return false;
                        })
                        .reduce<(number | 'ellipsis')[]>((acc, i, idx, arr) => {
                            if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                            acc.push(i);
                            return acc;
                        }, [])
                        .map((item, idx) =>
                            item === 'ellipsis' ? (
                                <span key={`e-${idx}`} className="w-9 h-9 flex items-center justify-center md3-label-medium text-on-surface-variant">…</span>
                            ) : (
                                <button
                                    key={item}
                                    onClick={() => goTo(item as number)}
                                    aria-label={`Página ${(item as number) + 1}`}
                                    aria-current={item === page ? 'page' : undefined}
                                    className={[
                                        'w-9 h-9 rounded-full md3-label-large transition-colors',
                                        item === page
                                            ? 'bg-primary text-on-primary'
                                            : 'text-on-surface-variant hover:bg-on-surface/8',
                                    ].join(' ')}
                                >
                                    {(item as number) + 1}
                                </button>
                            )
                        )
                    }

                    <button
                        onClick={() => goTo(page + 1)}
                        disabled={page === totalPages - 1}
                        aria-label="Página siguiente"
                        className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {selectedChannel && (
                <LiveTVPlayer
                    channel={selectedChannel}
                    relatedChannels={relatedChannels}
                    hasPrev={currentIndex > 0}
                    hasNext={currentIndex < channels.length - 1}
                    onPrev={goToPrevChannel}
                    onNext={goToNextChannel}
                    onSelectChannel={setSelectedChannel}
                    onClose={() => setSelectedChannel(null)}
                />
            )}
        </>
    );
}

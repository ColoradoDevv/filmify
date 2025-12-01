'use client';

import { useState } from 'react';
import { TvMinimalPlay } from 'lucide-react';
import type { LiveChannel } from '@/services/liveTV';
import ChannelCard from './ChannelCard';
import LiveTVPlayer from './LiveTVPlayer';

interface LiveTVGridProps {
    channels: LiveChannel[];
}

export default function LiveTVGrid({ channels }: LiveTVGridProps) {
    const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);

    if (channels.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="inline-flex p-6 bg-surface/50 rounded-full border border-surface-light mb-6">
                    <TvMinimalPlay className="w-16 h-16 text-text-secondary" strokeWidth={1.5} />
                </div>
                <h3 className="text-white text-xl font-bold mb-2">No se encontraron canales</h3>
                <p className="text-text-secondary">Intenta ajustar los filtros de búsqueda</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {channels.map((channel) => (
                    <ChannelCard
                        key={channel.id}
                        channel={channel}
                        onClick={() => setSelectedChannel(channel)}
                    />
                ))}
            </div>

            {/* Player Modal */}
            {selectedChannel && (
                <LiveTVPlayer
                    channel={selectedChannel}
                    onClose={() => setSelectedChannel(null)}
                />
            )}
        </>
    );
}

'use client';

import { Play, Tv2 } from 'lucide-react';
import type { LiveChannel } from '@/services/liveTV';

interface ChannelCardProps {
    channel: LiveChannel;
    onClick: () => void;
}

export default function ChannelCard({ channel, onClick }: ChannelCardProps) {
    return (
        <button
            onClick={onClick}
            className="group relative bg-surface border border-surface-light rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10"
        >
            {/* Channel Logo/Thumbnail */}
            <div className="aspect-video bg-gradient-to-br from-surface-light via-surface to-surface-light flex items-center justify-center relative overflow-hidden">
                {channel.logo ? (
                    <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="p-4">
                        <Tv2 className="w-16 h-16 text-white/20" strokeWidth={1.5} />
                    </div>
                )}

                {/* Play Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg">
                        <Play size={28} className="text-white ml-1" fill="currentColor" />
                    </div>
                </div>

                {/* Category Badge */}
                <div className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10">
                    <span className="text-xs text-white font-semibold">{channel.category}</span>
                </div>

                {/* Country Badge */}
                {channel.country && (
                    <div className="absolute top-2 left-2 px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10">
                        <span className="text-xs text-white font-semibold uppercase">{channel.country}</span>
                    </div>
                )}

                {/* Live Indicator */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/90 backdrop-blur-sm">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    <span className="text-xs text-white font-bold">EN VIVO</span>
                </div>
            </div>

            {/* Channel Info */}
            <div className="p-4 bg-gradient-to-b from-surface to-surface-light">
                <h3 className="text-white font-semibold text-sm line-clamp-2 text-left group-hover:text-primary transition-colors mb-1">
                    {channel.name}
                </h3>
                <p className="text-text-secondary text-xs text-left">
                    {channel.source}
                </p>
            </div>
        </button>
    );
}

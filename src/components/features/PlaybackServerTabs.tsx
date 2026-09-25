'use client';

import { Server } from 'lucide-react';
import type { PlaybackSource } from '@/lib/playback-providers';
import { cn } from '@/lib/utils';

interface PlaybackServerTabsProps {
    sources: PlaybackSource[];
    activeIndex: number;
    probing: boolean;
    degraded: boolean;
    onSelect: (index: number) => void;
}

/**
 * Selector de servidor de la cascada (Vimeus → VidAPI → VidCore → …).
 * El punto verde marca el servidor en uso; el resto son un toque para
 * cambiar manualmente si el automático falla.
 */
export default function PlaybackServerTabs({
    sources,
    activeIndex,
    probing,
    degraded,
    onSelect,
}: PlaybackServerTabsProps) {
    if (sources.length <= 1) return null;
    return (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-container-low border border-outline-variant border-b-0 overflow-x-auto">
            <span className="flex items-center gap-1.5 pl-1 pr-2 text-[11px] font-bold uppercase tracking-widest text-text-secondary whitespace-nowrap shrink-0">
                <Server className="w-3.5 h-3.5" />
                Servidor
                {probing && <span className="text-primary animate-pulse">…</span>}
            </span>
            {sources.map((source, idx) => {
                const isActive = idx === activeIndex;
                return (
                    <button
                        key={source.id}
                        onClick={() => onSelect(idx)}
                        aria-pressed={isActive}
                        title={`${source.label} (${source.lang === 'lat' ? 'Latino' : source.lang === 'es' ? 'Español' : 'Inglés'})`}
                        className={cn(
                            'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0',
                            isActive
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-text-secondary hover:text-white hover:bg-white/5',
                        )}
                    >
                        <span
                            className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                isActive ? 'bg-white' : 'bg-white/25',
                            )}
                            aria-hidden
                        />
                        {source.label}
                        <span
                            className={cn(
                                'text-[10px] font-semibold uppercase',
                                isActive ? 'text-white/80' : 'text-white/30',
                            )}
                        >
                            {source.lang}
                        </span>
                    </button>
                );
            })}
            {degraded && !probing && (
                <span className="ml-1 text-[11px] text-orange-300/80 whitespace-nowrap shrink-0">
                    Modo respaldo
                </span>
            )}
        </div>
    );
}

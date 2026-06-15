'use client';

import { Tv, Wifi, Globe } from 'lucide-react';
import type { StreamSource } from '@/services/worldcup';

/**
 * Selector de servidores de transmisión (como futbollibre/rojadirecta): lista
 * los embeds disponibles para el partido con su idioma, calidad y audiencia.
 */
export default function ServerSelector({
    sources,
    activeId,
    onSelect,
}: {
    sources: StreamSource[];
    activeId: string;
    onSelect: (source: StreamSource) => void;
}) {
    if (sources.length === 0) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Tv className="w-4 h-4 shrink-0" />
                <span>Servidores disponibles</span>
                <span className="text-xs text-text-secondary/70">
                    · si uno falla, prueba el siguiente
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {sources.map((src) => {
                    const active = src.id === activeId;
                    return (
                        <button
                            key={src.id}
                            onClick={() => onSelect(src)}
                            className={[
                                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border',
                                active
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-surface-container text-text-secondary border-outline-variant hover:text-white hover:bg-surface-container-high hover:border-primary/40',
                            ].join(' ')}
                        >
                            <Globe className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            <span className="max-w-[160px] truncate">{src.language}</span>
                            {src.hd && (
                                <span className={[
                                    'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                    active ? 'bg-white/20' : 'bg-green-500/15 text-green-400',
                                ].join(' ')}>
                                    HD
                                </span>
                            )}
                            {src.viewers > 0 && (
                                <span className="flex items-center gap-1 text-[11px] opacity-70">
                                    <Wifi className="w-3 h-3" />
                                    {formatViewers(src.viewers)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function formatViewers(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

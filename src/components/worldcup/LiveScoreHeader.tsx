'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import type { WorldCupMatch } from '@/services/worldcup';

/**
 * Cabecera de un partido (página /mundial/partido/[id]): escudos, marcador en
 * vivo, minuto/estado, grupo y sede. Diseño con vibras mundialistas (verde +
 * dorado FIFA) sobre los tokens Material 3 del proyecto.
 */
export default function LiveScoreHeader({ match }: { match: WorldCupMatch }) {
    const showScore = match.status !== 'SCHEDULED' && match.homeScore !== null;

    // Hora local del navegador (fallback a la pre-formateada del servidor).
    const [localTime, setLocalTime] = useState(match.time);
    useEffect(() => {
        if (!match.kickoff) return;
        setLocalTime(
            new Date(match.kickoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        );
    }, [match.kickoff]);

    return (
        <div className="relative overflow-hidden rounded-2xl bg-cover bg-center sm:p-6"
            style={{ backgroundImage: 'url(/matchhero.png)' }}>
            {/* Etiqueta superior: grupo + estado */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-400/90">
                    {match.group}
                </span>
                {match.status === 'LIVE' ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        EN VIVO{match.minute ? ` · ${match.minute}'` : ''}
                    </span>
                ) : match.status === 'FINISHED' ? (
                    <span className="px-2.5 py-1 rounded-full bg-white/5 text-text-secondary text-xs font-medium border border-white/10">
                        Finalizado
                    </span>
                ) : (
                    <span className="px-2.5 py-1 rounded-full bg-black/50 text-blue-400 text-xs font-medium border border-blue-500/20">
                        Hoy · {localTime}
                    </span>
                )}
            </div>

            {/* Marcador */}
            <div className="flex items-center justify-center gap-4 sm:gap-8">
                <TeamSide name={match.homeTeam} badge={match.homeBadge} />

                <div className="flex items-center gap-3 shrink-0">
                    {showScore ? (
                        <>
                            <span className="text-6xl sm:text-7xl font-black tabular-nums">{match.homeScore}</span>
                            <span className="text-2xl text-text-secondary font-light">–</span>
                            <span className="text-6xl sm:text-7xl font-black tabular-nums">{match.awayScore}</span>
                        </>
                    ) : (
                        <span className="text-2xl sm:text-3xl font-bold text-text-primary">vs</span>
                    )}
                </div>

                <TeamSide name={match.awayTeam} badge={match.awayBadge} />
            </div>

            {/* Sede */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-text-primary mt-5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{match.stadium}</span>
            </div>
        </div>
    );
}

function TeamSide({ name, badge }: { name: string; badge: string }) {
    return (
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={badge}
                alt={name}
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow"
                onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
            />
            <span className="text-sm sm:text-base font-semibold text-center leading-tight">{name}</span>
        </div>
    );
}

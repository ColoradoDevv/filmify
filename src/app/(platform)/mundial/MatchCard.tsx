'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Play } from 'lucide-react';
import type { WorldCupMatch } from '@/services/worldcup';
import { RemindButton } from './RemindButton';

/**
 * Hora local del navegador desde el kickoff ISO. Se calcula en el cliente (tras
 * montar) para usar la zona del usuario; antes de eso usa el `fallback` que vino
 * del servidor, evitando un mismatch de hidratación.
 */
function useLocalTime(kickoffISO: string, fallback: string): string {
    const [time, setTime] = useState(fallback);
    useEffect(() => {
        if (!kickoffISO) return;
        setTime(
            new Date(kickoffISO).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            }),
        );
    }, [kickoffISO]);
    return time;
}

/** Fecha local del navegador (día + mes corto) desde el kickoff ISO. */
function useLocalDate(kickoffISO: string): string {
    // Fallback inicial: fecha en Bogotá (server) para que SSR y primer render coincidan.
    const [date, setDate] = useState(() =>
        kickoffISO
            ? new Date(kickoffISO).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'America/Bogota',
              })
            : '',
    );
    useEffect(() => {
        if (!kickoffISO) return;
        setDate(
            new Date(kickoffISO).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
            }),
        );
    }, [kickoffISO]);
    return date;
}

// El tipo de partido ahora vive en el servicio (combina openfootball +
// TheSportsDB + SportSRC). Se reexporta para los consumidores existentes.
export type Match = WorldCupMatch;

function StatusBadge({ match, localTime }: { match: Match; localTime: string }) {
    if (match.status === 'LIVE') {
        return (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                EN VIVO {match.minute ? `${match.minute}'` : ''}
            </span>
        );
    }
    if (match.status === 'FINISHED') {
        return (
            <span className="px-2.5 py-1 rounded-full bg-white/5 text-text-secondary text-xs font-medium border border-white/10">
                Finalizado
            </span>
        );
    }
    return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
            <Clock className="w-3 h-3" />
            {localTime}
        </span>
    );
}

export function MatchCard({
    match,
    reminded = false,
    onReminderChange,
}: {
    match: Match;
    reminded?: boolean;
    onReminderChange?: (matchId: string, active: boolean) => void;
}) {
    const isClickable = match.status === 'LIVE' || match.status === 'SCHEDULED';
    // Hora local del navegador (con la hora pre-formateada del servidor como fallback).
    const localTime = useLocalTime(match.kickoff, match.time);
    const localDate = useLocalDate(match.kickoff);

    const inner = (
        <>
            {match.status === 'LIVE' && (
                <div className="absolute inset-0 rounded-2xl bg-red-500/5 animate-pulse pointer-events-none" />
            )}

            <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary font-medium">{match.group}</span>
                <StatusBadge match={match} localTime={localTime} />
            </div>

            <div className="flex items-center justify-between gap-3">
                <TeamColumn name={match.homeTeam} badge={match.homeBadge} />

                <div className="flex items-center gap-2 px-4">
                    {match.homeScore !== null ? (
                        <>
                            <span className="text-3xl font-black tabular-nums">{match.homeScore}</span>
                            <span className="text-xl text-text-secondary font-light">–</span>
                            <span className="text-3xl font-black tabular-nums">{match.awayScore}</span>
                        </>
                    ) : (
                        <span className="text-xl font-bold text-text-secondary">vs</span>
                    )}
                </div>

                <TeamColumn name={match.awayTeam} badge={match.awayBadge} />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{match.stadium}</span>
                {localDate && (
                    <span className="ml-auto shrink-0">{localDate}</span>
                )}
            </div>

            {match.status === 'LIVE' && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-colors bg-red-500/20 text-red-400 group-hover:bg-red-500/30">
                    <Play className="w-3.5 h-3.5" fill="currentColor" /> Ver en vivo
                </div>
            )}
            {match.status === 'SCHEDULED' && (
                <RemindButton
                    match={match}
                    initialSaved={reminded}
                    onChange={onReminderChange}
                />
            )}
        </>
    );

    const baseClass = [
        'group relative flex flex-col gap-4 p-5 rounded-2xl border transition-all duration-200',
        match.status === 'LIVE'
            ? 'bg-red-950/20 border-red-500/30 hover:border-red-500/60 hover:bg-red-950/30'
            : match.status === 'SCHEDULED'
            ? 'bg-surface-container border-outline-variant hover:border-primary/40 hover:bg-surface-container-high'
            : 'bg-surface-container/50 border-outline-variant/50 opacity-70',
    ].join(' ');

    if (isClickable) {
        return (
            <Link href={`/mundial/partido/${match.id}`} className={baseClass}>
                {inner}
            </Link>
        );
    }

    return <div className={baseClass}>{inner}</div>;
}

function TeamColumn({ name, badge }: { name: string; badge: string }) {
    return (
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={badge}
                alt={name}
                className="w-12 h-12 object-contain drop-shadow"
                onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
            />
            <span className="text-sm font-semibold text-center leading-tight">{name}</span>
        </div>
    );
}

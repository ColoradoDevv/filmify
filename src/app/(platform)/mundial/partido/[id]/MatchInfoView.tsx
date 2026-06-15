'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, BarChart3, History, Trophy } from 'lucide-react';
import type { WorldCupMatch, MatchInfo, FormMatch, PlayerInfo } from '@/services/worldcup';
import LiveScoreHeader from '@/components/worldcup/LiveScoreHeader';

const STATUS_POLL_MS = 45_000;

/**
 * Vista informativa de un partido. Se usa para:
 *  - SCHEDULED (preview): tabla del grupo + forma + plantillas → para predecir.
 *  - FINISHED (resultado): marcador + estadísticas reales del partido + plantillas.
 * No tiene reproductor (no hay/ya no hay señal).
 */
export default function MatchInfoView({
    match,
    info,
}: {
    match: WorldCupMatch;
    info: MatchInfo;
}) {
    const finished = match.status === 'FINISHED';
    const router = useRouter();

    // Si el partido aún no termina (SCHEDULED), vigilamos su estado: cuando pase
    // a LIVE, refrescamos la página para que el server renderice el reproductor.
    useEffect(() => {
        if (finished) return;
        const tick = async () => {
            if (document.hidden) return;
            try {
                const res = await fetch('/api/worldcup', { cache: 'no-store' });
                const data = await res.json();
                const updated = (data.matches as WorldCupMatch[] | undefined)?.find(
                    (m) => m.id === match.id,
                );
                if (updated && updated.status !== match.status) {
                    router.refresh(); // re-render server → cambia a reproductor/resultado
                }
            } catch { /* reintenta en el próximo tick */ }
        };
        const timer = setInterval(tick, STATUS_POLL_MS);
        return () => clearInterval(timer);
    }, [finished, match.id, match.status, router]);


    return (
        <div className="max-w-5xl mx-auto space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-3">
                <Link
                    href="/mundial"
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Mundial 2026
                </Link>
                <span className="text-outline-variant">/</span>
                <span className="text-sm font-medium truncate">
                    {match.homeTeam} vs {match.awayTeam}
                </span>
            </div>

            {/* Cabecera con escudos y marcador (o vs) */}
            <LiveScoreHeader match={match} />

            {/* Estadísticas reales (solo FINISHED y si TheSportsDB las tiene) */}
            {finished && info.stats.length > 0 && (
                <Section icon={BarChart3} title="Estadísticas del partido">
                    <div className="space-y-3">
                        {info.stats.map((s) => (
                            <StatBar key={s.label} label={s.label} home={s.home} away={s.away} />
                        ))}
                    </div>
                </Section>
            )}

            {/* Tabla del grupo (solo fase de grupos) */}
            {info.standings.length > 0 && (
                <Section icon={Trophy} title={`Tabla — ${match.group}`}>
                    <StandingsTable
                        rows={info.standings}
                        highlight={[match.homeTeam, match.awayTeam]}
                    />
                </Section>
            )}

            {/* Forma reciente de ambos equipos */}
            {(info.homeForm.length > 0 || info.awayForm.length > 0) && (
                <Section icon={History} title="Partidos recientes">
                    <div className="grid sm:grid-cols-3 gap-5 justify-beetween">
                        <FormColumn team={info.home.name} badge={info.home.badge} form={info.homeForm} />
                        <span className="justify-self-center text-primary text-2xl font-bold">vs</span>
                        <div className="justify-self-end">
                            <FormColumn team={info.away.name} badge={info.away.badge} form={info.awayForm} />
                        </div>
                    </div>
                </Section>
            )}

            {/* Plantillas */}
            {(info.homePlayers.length > 0 || info.awayPlayers.length > 0) && (
                <Section icon={Users} title="Plantillas">
                    <div className="grid sm:grid-cols-2 gap-5">
                        <Squad team={info.home.name} players={info.homePlayers} />
                        <Squad team={info.away.name} players={info.awayPlayers} />
                    </div>
                </Section>
            )}

            {/* Descripción de los equipos (apodo, estadio, etc.) */}
            <div className="grid sm:grid-cols-2 gap-5">
                <TeamCard info={info.home} />
                <TeamCard info={info.away} />
            </div>

            {!finished && (
                <p className="text-center text-xs text-text-secondary px-4">
                    El reproductor se activará automáticamente cuando el partido comience.
                </p>
            )}
        </div>
    );
}

// ── Bloques ─────────────────────────────────────────────────────────────────

function Section({
    icon: Icon,
    title,
    children,
}: {
    icon: typeof Users;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-outline-variant bg-surface-container p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-text-secondary mb-4">
                <Icon className="w-4 h-4 text-primary" />
                {title}
            </h2>
            {children}
        </section>
    );
}

function StatBar({ label, home, away }: { label: string; home: number; away: number }) {
    const total = home + away || 1;
    const homePct = Math.round((home / total) * 100);
    return (
        <div>
            <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-bold tabular-nums">{home}</span>
                <span className="text-xs text-text-secondary">{label}</span>
                <span className="font-bold tabular-nums">{away}</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
                <div className="bg-green-500" style={{ width: `${homePct}%` }} />
                <div className="bg-blue-500" style={{ width: `${100 - homePct}%` }} />
            </div>
        </div>
    );
}

function StandingsTable({ rows, highlight }: { rows: import('@/services/worldcup').StandingRow[]; highlight: string[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-text-secondary border-b border-outline-variant">
                        <th className="text-left font-medium py-2 pr-2">Equipo</th>
                        <th className="font-medium px-1.5">PJ</th>
                        <th className="font-medium px-1.5">G</th>
                        <th className="font-medium px-1.5">E</th>
                        <th className="font-medium px-1.5">P</th>
                        <th className="font-medium px-1.5">DG</th>
                        <th className="font-medium pl-1.5 pr-1">Pts</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const on = highlight.includes(r.team);
                        return (
                            <tr
                                key={r.team}
                                className={`border-b border-outline-variant/50 ${on ? 'bg-primary/10 font-semibold' : ''}`}
                            >
                                <td className="text-left py-2 pr-2 truncate max-w-[140px]">{r.team}</td>
                                <td className="text-center px-1.5 tabular-nums">{r.played}</td>
                                <td className="text-center px-1.5 tabular-nums">{r.won}</td>
                                <td className="text-center px-1.5 tabular-nums">{r.drawn}</td>
                                <td className="text-center px-1.5 tabular-nums">{r.lost}</td>
                                <td className="text-center px-1.5 tabular-nums">{r.goalsFor - r.goalsAgainst > 0 ? '+' : ''}{r.goalsFor - r.goalsAgainst}</td>
                                <td className="text-center pl-1.5 pr-1 tabular-nums font-bold">{r.points}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function FormColumn({ team, badge, form }: { team: string; badge: string; form: FormMatch[] }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badge} alt={team} className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                <span className="font-semibold text-sm">{team}</span>
            </div>
            {form.length === 0 ? (
                <p className="text-xs text-text-secondary">Sin partidos recientes.</p>
            ) : (
                <ul className="space-y-1.5">
                    {form.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                            <ResultDot result={f.result} />
                            <span className="text-text-secondary text-xs tabular-nums">
                                {f.wasHome ? f.homeScore : f.awayScore}–{f.wasHome ? f.awayScore : f.homeScore}
                            </span>
                            <span className="truncate">{f.wasHome ? 'vs' : '@'} {f.opponent}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ResultDot({ result }: { result: FormMatch['result'] }) {
    const map = {
        W: 'bg-green-500 text-white',
        D: 'bg-yellow-500 text-black',
        L: 'bg-red-500 text-white',
    };
    const label = result ?? '–';
    return (
        <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${result ? map[result] : 'bg-white/10 text-text-secondary'}`}>
            {label}
        </span>
    );
}

function Squad({ team, players }: { team: string; players: PlayerInfo[] }) {
    if (players.length === 0) {
        return (
            <div>
                <h3 className="font-semibold text-sm mb-2">{team}</h3>
                <p className="text-xs text-text-secondary">Plantilla no disponible.</p>
            </div>
        );
    }
    return (
        <div>
            <h3 className="font-semibold text-sm mb-2">{team}</h3>
            <ul className="space-y-1">
                {players.map((p, i) => (
                    <li key={i} className="flex items-center justify-between text-sm gap-2">
                        <span className="truncate">{p.name}</span>
                        {p.position && (
                            <span className="text-[11px] text-text-secondary shrink-0">{p.position}</span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function TeamCard({ info }: { info: import('@/services/worldcup').TeamInfo }) {
    return (
        <div className="rounded-2xl border border-outline-variant bg-surface-container p-5">
            <div className="flex items-center gap-3 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={info.badge} alt={info.name} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                <div>
                    <p className="font-bold leading-tight">{info.name}</p>
                    {info.nickname && <p className="text-xs text-yellow-400">{info.nickname}</p>}
                </div>
            </div>
            <dl className="text-xs text-text-secondary space-y-1 mb-3">
                {info.foundedYear && <div className="flex gap-2"><dt className="text-white/60">Fundación:</dt><dd>{info.foundedYear}</dd></div>}
                {info.stadium && <div className="flex gap-2"><dt className="text-white/60">Estadio:</dt><dd className="truncate">{info.stadium}</dd></div>}
            </dl>
            {info.description && (
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-5">{info.description}</p>
            )}
        </div>
    );
}

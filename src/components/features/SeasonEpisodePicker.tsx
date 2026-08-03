'use client';

/**
 * Selector de temporada y episodio para series en Watch Party.
 * Carga las temporadas reales desde TMDB (vía el proxy /api/tmdb).
 */
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface SeasonInfo {
    season_number: number;
    episode_count: number;
    name: string;
}

export default function SeasonEpisodePicker({
    tmdbId,
    season,
    episode,
    onChange,
}: {
    tmdbId: number;
    season: number;
    episode: number;
    onChange: (season: number, episode: number) => void;
}) {
    const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch(`/api/tmdb?action=details&mediaType=tv&id=${tmdbId}`);
                const data = await res.json();
                if (cancelled) return;
                const list: SeasonInfo[] = (data.seasons ?? [])
                    .filter((s: SeasonInfo) => s.season_number > 0 && s.episode_count > 0);
                setSeasons(list);
                // Si la selección actual no existe, normalizar a la primera temporada.
                if (list.length > 0 && !list.some((s) => s.season_number === season)) {
                    onChange(list[0].season_number, 1);
                }
            } catch {
                if (!cancelled) setSeasons([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tmdbId]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-3 text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="md3-body-small">Cargando temporadas...</span>
            </div>
        );
    }

    const current = seasons.find(s => s.season_number === season);
    const episodeCount = current?.episode_count ?? 1;
    const selectCls = 'h-10 rounded-[var(--radius-md)] px-3 bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface focus:outline-none focus:border-primary';

    return (
        <div className="flex gap-3">
            <label className="flex-1 flex flex-col gap-1">
                <span className="md3-label-small text-on-surface-variant">Temporada</span>
                <select
                    value={season}
                    onChange={e => onChange(Number(e.target.value), 1)}
                    className={selectCls}
                >
                    {seasons.map(s => (
                        <option key={s.season_number} value={s.season_number}>
                            T{s.season_number} — {s.name} ({s.episode_count} ep.)
                        </option>
                    ))}
                    {seasons.length === 0 && <option value={season}>T{season}</option>}
                </select>
            </label>
            <label className="flex-1 flex flex-col gap-1">
                <span className="md3-label-small text-on-surface-variant">Episodio</span>
                <select
                    value={episode}
                    onChange={e => onChange(season, Number(e.target.value))}
                    className={selectCls}
                >
                    {Array.from({ length: episodeCount }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>Episodio {n}</option>
                    ))}
                </select>
            </label>
        </div>
    );
}

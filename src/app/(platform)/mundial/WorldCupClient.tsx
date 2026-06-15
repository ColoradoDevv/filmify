'use client';

import { useState, useEffect, useMemo } from 'react';
// Imagen tomada desde la carpeta pública (public/)
// Para usarla en CSS background no hace falta importarla.

import { Radio, Trophy } from 'lucide-react';
import { MatchCard } from './MatchCard';
import type { WorldCupMatch } from '@/services/worldcup';

const POLL_INTERVAL_MS = 45_000;

export default function WorldCupClient({
  initialMatches,
}: {
  initialMatches: WorldCupMatch[];
}) {
  const [matches, setMatches] = useState<WorldCupMatch[]>(initialMatches);
  const [groupFilter, setGroupFilter] = useState<string>('');
  // match_id con recordatorio activo del usuario (se carga del backend al montar).
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  // Al montar, traemos los recordatorios ya guardados para que las tarjetas
  // muestren "Recordatorio activo" tras recargar la página.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/worldcup/reminder', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.matchIds)) {
          setRemindedIds(new Set<string>(data.matchIds));
        }
      } catch {
        // silencioso — sin recordatorios precargados
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Mantiene el set en sync cuando el usuario activa/cancela desde una tarjeta.
  const handleReminderChange = (matchId: string, active: boolean) => {
    setRemindedIds((prev) => {
      const next = new Set(prev);
      if (active) next.add(matchId);
      else next.delete(matchId);
      return next;
    });
  };

  // Refresco en vivo: re-consulta la API para actualizar marcador/estado sin
  // recargar la página. El servicio cachea las fuentes (60s), así que esto es
  // barato. Solo corre mientras la pestaña está visible.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/worldcup', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.matches) && data.matches.length > 0) {
          setMatches(data.matches);
        }
      } catch {
        // silencioso — mantenemos los datos previos
      }
    };

    timer = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const live = matches.filter((m) => m.status === 'LIVE');
  const scheduled = matches.filter((m) => m.status === 'SCHEDULED');
  const finished = matches.filter((m) => m.status === 'FINISHED');

  // Grupos disponibles (para el filtro) tomados de los partidos en vivo o próximos.
  // Ahora depende solo de "matches" para evitar recálculos innecesarios.
  const groups = useMemo(() => {
    const set = new Set<string>();
    matches
      .filter((m) => m.status === 'LIVE' || m.status === 'SCHEDULED')
      .forEach((m) => set.add(m.group));
    return Array.from(set).sort();
  }, [matches]);

  const applyFilter = (list: WorldCupMatch[]) =>
    groupFilter ? list.filter((m) => m.group === groupFilter) : list;

  return (
    <div className="max-w-8xl mx-auto space-y-6 py-8">
      {/* Hero mundialista */}
      <div className="relative overflow-hidden rounded-3xl min-h-[140px] sm:min-h-[300px] flex items-end p-6 sm:p-8">
        {/* Imagen de fondo del Mundial */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/mundialhero.png)' }}
        />
        {/* Overlay degradado para que el texto sea legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

        <div className="relative flex items-end w-full gap-4">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black text-white drop-shadow-lg">
              Mundial <span className="text-green-500">2</span><span className="text-white-500">0</span><span className="text-red-500">2</span><span className="text-blue-500">6</span>
            </h1>
            <p className="text-white/80 mt-1 drop-shadow">
              EE.UU. · México · Canadá — Jun 11 – Jul 19, 2026
            </p>
          </div>
          <div className="ml-auto hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-sm font-bold text-red-400">
                {live.length} en vivo
              </span>
            </div>
            <span className="text-xs text-white/70">
              {scheduled.length} próximos
            </span>
          </div>
        </div>
      </div>

      {/* Filtro por grupo */}
      {groups.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setGroupFilter('')}
            className={[
              'px-3.5 py-1.5 rounded-full text-sm cursor-pointer font-medium transition-all border',
              groupFilter === ''
                ? 'bg-primary text-white cursor-pointer border-primary'
                : 'bg-surface-container cursor-pointer text-text-secondary border-outline-variant hover:text-white',
            ].join(' ')}
          >
            Todos
          </button>
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              className={[
                'px-3.5 py-1.5 rounded-full cursor-pointer text-sm font-medium transition-all border',
                groupFilter === g
                  ? 'bg-primary text-white cursor-pointer border-primary'
                  : 'bg-surface-container cursor-pointer text-text-secondary border-outline-variant hover:text-white',
              ].join(' ')}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* En vivo */}
      {applyFilter(live).length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            <h2 className="text-lg font-bold">En vivo ahora</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {applyFilter(live).map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Próximos */}
      {applyFilter(scheduled).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-text-secondary">
            Próximos partidos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {applyFilter(scheduled)
              .slice(0, 12)
              .map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  reminded={remindedIds.has(m.id)}
                  onReminderChange={handleReminderChange}
                />
              ))}
          </div>
        </section>
      )}

      {/* Finalizados */}
      {applyFilter(finished).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-text-secondary">
            Resultados recientes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {applyFilter(finished)
              .slice(0, 9)
              .map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
          </div>
        </section>
      )}

      {/* Estado vacío total (todas las fuentes caídas) */}
      {matches.length === 0 && (
        <div className="text-center py-16 text-text-secondary">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium text-white mb-1">
            No pudimos cargar los partidos
          </p>
          <p className="text-sm">Inténtalo de nuevo en unos minutos.</p>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import type { Match } from './MatchCard';

type State = 'idle' | 'loading' | 'saved' | 'error';

export function RemindButton({
    match,
    initialSaved = false,
    onChange,
}: {
    match: Match;
    initialSaved?: boolean;
    onChange?: (matchId: string, active: boolean) => void;
}) {
    const [state, setState] = useState<State>('idle');
    const [saved, setSaved] = useState(initialSaved);
    const [message, setMessage] = useState('');

    // El estado real se carga async en el padre (GET /reminder). Cuando llega,
    // sincronizamos para reflejar "Recordatorio activo" tras recargar la página.
    useEffect(() => {
        setSaved(initialSaved);
    }, [initialSaved]);

    async function toggle(e: React.MouseEvent) {
        e.preventDefault();  // evita navegar si está dentro de un Link
        e.stopPropagation(); // evita que el click burbujee al Link de la tarjeta
        setState('loading');
        setMessage('');

        try {
            const res = await fetch('/api/worldcup/reminder', {
                method: saved ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    match_id: match.id,
                    kickoff: match.kickoff,
                    home_team: match.homeTeam,
                    away_team: match.awayTeam,
                    // Zona horaria del navegador → el email del recordatorio usa la
                    // hora local del usuario (ej. "America/Mexico_City").
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                }),
            });

            if (res.status === 401) {
                setState('error');
                setMessage('Inicia sesión para activar recordatorios');
                return;
            }
            if (!res.ok) {
                const data = await res.json();
                setState('error');
                setMessage(data.error ?? 'Error al guardar');
                return;
            }

            const next = !saved;
            setSaved(next);
            onChange?.(match.id, next);
            setState('saved');
            setMessage(next ? '¡Recordatorio guardado! Te avisaremos 30 min antes' : 'Recordatorio cancelado');
        } catch {
            setState('error');
            setMessage('Error de conexión');
        } finally {
            setTimeout(() => setState('idle'), 3000);
        }
    }

    return (
        <div className="flex flex-col gap-1.5">
            <button
                onClick={toggle}
                disabled={state === 'loading'}
                className={[
                    'flex cursor-pointer items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-colors w-full',
                    saved
                        ? 'bg-green-500/20 cursor-pointer text-green-400 hover:bg-red-500/10 hover:text-red-400'
                        : 'bg-primary/10 cursor-pointer text-primary hover:bg-primary/20',
                    state === 'loading' ? 'opacity-60 cursor-not-allowed' : '',
                ].join(' ')}
            >
                {state === 'loading' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saved ? (
                    <><BellOff className="w-3.5 h-3.5" /> Recordatorio activo</>
                ) : (
                    <><Bell className="w-3.5 h-3.5" /> Notificarme</>
                )}
            </button>

            {message && (
                <p className={[
                    'text-xs text-center px-1',
                    state === 'error' ? 'text-red-400' : 'text-green-400',
                ].join(' ')}>
                    {message}
                </p>
            )}
        </div>
    );
}

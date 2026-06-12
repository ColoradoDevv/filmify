'use client';

/**
 * Modal del host para cambiar la película/serie de la sala (o el episodio).
 * Usa el buscador con filtro de disponibilidad del catálogo y valida también
 * server-side antes de aplicar el cambio.
 */
import { useState } from 'react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import TitleSearchPicker, { type PickedTitle } from '@/components/features/TitleSearchPicker';
import SeasonEpisodePicker from '@/components/features/SeasonEpisodePicker';
import type { MediaChange } from '@/lib/watch-party-sync';

interface Props {
    code: string;
    /** Título actual (para el modo "cambiar episodio" sin re-buscar). */
    current: { tmdb_id: number; title: string; poster_path: string | null; media_type: 'movie' | 'tv'; season: number; episode: number };
    mode: 'title' | 'episode';
    onClose: () => void;
    /** Se llama con el cambio aplicado (ya persistido) para emitir el broadcast. */
    onApplied: (media: MediaChange) => void;
}

export default function ChangeMediaModal({ code, current, mode, onClose, onApplied }: Props) {
    const [picked, setPicked] = useState<PickedTitle | null>(
        mode === 'episode'
            ? { id: current.tmdb_id, title: current.title, poster_path: current.poster_path, media_type: 'tv', year: '' }
            : null
    );
    const [season, setSeason] = useState(mode === 'episode' ? current.season : 1);
    const [episode, setEpisode] = useState(mode === 'episode' ? current.episode : 1);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState('');

    const apply = async () => {
        if (!picked) return;
        setApplying(true);
        setError('');
        try {
            const payload: MediaChange = {
                tmdb_id: picked.id,
                title: picked.title,
                poster_path: picked.poster_path,
                media_type: picked.media_type,
                season: picked.media_type === 'tv' ? season : null,
                episode: picked.media_type === 'tv' ? episode : null,
            };
            const res = await fetch(`/api/watch-party/${code}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'media', ...payload }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'No se pudo aplicar el cambio'); return; }
            onApplied(payload);
            onClose();
        } catch {
            setError('Error de conexión');
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-surface rounded-[var(--radius-xl)] shadow-[var(--shadow-5)] flex flex-col overflow-hidden max-h-[85vh]">
                <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-outline-variant shrink-0">
                    <p className="md3-title-medium text-on-surface flex-1">
                        {mode === 'episode' ? 'Cambiar episodio' : 'Cambiar película o serie'}
                    </p>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-on-surface/8 flex items-center justify-center text-on-surface-variant transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-4 overflow-y-auto space-y-4">
                    {mode === 'title' && (
                        <TitleSearchPicker
                            selectedId={picked?.id ?? null}
                            onSelect={(m) => { setPicked(m); setSeason(1); setEpisode(1); }}
                        />
                    )}

                    {picked?.media_type === 'tv' && (
                        <SeasonEpisodePicker
                            tmdbId={picked.id}
                            season={season}
                            episode={episode}
                            onChange={(s, e) => { setSeason(s); setEpisode(e); }}
                        />
                    )}

                    {error && <p className="md3-body-small text-error">{error}</p>}
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-outline-variant shrink-0">
                    <p className="md3-body-small text-on-surface-variant mb-2">
                        Al aplicar, la reproducción se detiene para todos y deberás iniciar la función de nuevo.
                    </p>
                    <button
                        onClick={apply}
                        disabled={!picked || applying}
                        className="w-full h-10 rounded-full bg-primary text-on-primary md3-label-large flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[var(--shadow-1)] transition-all"
                    >
                        {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Aplicar cambio <ArrowRight className="w-4 h-4" /></>}
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

/**
 * Botón "Ver ahora" de la ficha de anime.
 *
 * AniList no da tmdb_id, así que al montar resolvemos (en el servidor, vía
 * action) el título contra TMDB + catálogo de anime de Vimeus. Según el
 * resultado:
 *  - match confirmado en el catálogo de anime → CTA primario a /tv|/movie/[id].
 *  - match no confirmado (serie/película TMDB pero no en el catálogo) → CTA
 *    secundario "Puede no estar disponible".
 *  - sin match → aviso de que aún no está en el catálogo reproducible.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Loader2, Info } from 'lucide-react';
import { resolveAnimeWatchHref } from '@/app/actions/anime';

interface Props {
    anilistId: number;
    english: string | null;
    romaji: string | null;
    year: number | null;
}

type State =
    | { status: 'loading' }
    | { status: 'found'; href: string; confirmed: boolean }
    | { status: 'none' };

export default function AnimeWatchButton({ anilistId, english, romaji, year }: Props) {
    const router = useRouter();
    const [state, setState] = useState<State>({ status: 'loading' });

    useEffect(() => {
        let alive = true;
        setState({ status: 'loading' });
        resolveAnimeWatchHref(anilistId, english, romaji, year)
            .then((res) => {
                if (!alive) return;
                setState(res ? { status: 'found', href: res.href, confirmed: res.confirmed } : { status: 'none' });
            })
            .catch(() => { if (alive) setState({ status: 'none' }); });
        return () => { alive = false; };
    }, [anilistId, english, romaji, year]);

    if (state.status === 'loading') {
        return (
            <button disabled className="flex items-center gap-2 h-11 px-6 rounded-full bg-primary/60 text-on-primary md3-label-large cursor-wait">
                <Loader2 className="w-4 h-4 animate-spin" /> Buscando dónde verlo...
            </button>
        );
    }

    if (state.status === 'none') {
        return (
            <div className="flex items-center gap-2 h-11 px-4 rounded-full bg-surface-container-high border border-outline-variant md3-body-small text-on-surface-variant">
                <Info className="w-4 h-4 shrink-0" />
                Aún no disponible para reproducir en el catálogo
            </div>
        );
    }

    return (
        <button
            onClick={() => router.push(state.href)}
            className={`flex items-center gap-2 h-11 px-6 rounded-full md3-label-large transition-all ${
                state.confirmed
                    ? 'bg-primary text-on-primary hover:shadow-[var(--shadow-2)]'
                    : 'bg-surface-container-high border border-outline-variant text-on-surface hover:bg-on-surface/8'
            }`}
            title={state.confirmed ? undefined : 'Coincidencia por título — la disponibilidad se confirma en la ficha'}
        >
            <Play className="w-4 h-4 fill-current" />
            {state.confirmed ? 'Ver ahora' : 'Ver (buscar disponibilidad)'}
        </button>
    );
}

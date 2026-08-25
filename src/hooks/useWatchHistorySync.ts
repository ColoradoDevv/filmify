'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/lib/store/useStore';
import { recordWatched, type WatchedInput } from '@/app/actions/watch-history';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { Movie, TVShow } from '@/types/tmdb';

/** El store guarda el objeto de TMDB entero; la tabla solo necesita esto. */
function toInput(item: Movie | TVShow): WatchedInput | null {
    if (!item || typeof item.id !== 'number') return null;
    const isTV = 'name' in item && !('title' in item);
    return {
        tmdbId: item.id,
        mediaType: isTV ? 'tv' : 'movie',
        title: (isTV ? (item as TVShow).name : (item as Movie).title) ?? '',
    };
}

/**
 * Sube a Supabase lo que el usuario ha marcado como visto.
 *
 * `VideoPlayer` marca en el store de Zustand, que persiste en localStorage y
 * nunca salía del navegador. Este hook es el puente: sin él, el interruptor
 * «Mostrar lo que he visto» de /settings seguiría gobernando un dato que no
 * existe en el servidor.
 *
 * Sube la lista entera en vez de ir título a título porque `recordWatched` hace
 * upsert sobre la clave primaria —reenviar lo ya guardado no duplica ni vuelve
 * a pedir el póster— y así una sesión que empezó anónima queda sincronizada de
 * una sola vez al iniciar sesión.
 *
 * No baja nada: el store local es la copia de trabajo y el servidor está para
 * que lo vean OTROS en el perfil. Mezclar en ambos sentidos reabriría la
 * carrera que se acaba de cerrar en los favoritos.
 */
export default function useWatchHistorySync() {
    const watched = useStore((state) => state.user.watched);

    // Firma de lo último enviado: sin esto, cada render con el mismo contenido
    // dispararía otra escritura.
    const lastSent = useRef<string>('');

    useEffect(() => {
        const supabase = createClient();
        let cancelled = false;

        const push = async () => {
            const items = watched.map(toInput).filter((i): i is WatchedInput => i !== null);
            if (items.length === 0) return;

            const signature = items.map((i) => `${i.mediaType}:${i.tmdbId}`).sort().join(',');
            if (signature === lastSent.current) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            const { ok } = await recordWatched(items);
            // Solo se recuerda la firma si de verdad se guardó; si no, el
            // próximo cambio lo reintenta en vez de darlo por hecho.
            if (ok && !cancelled) lastSent.current = signature;
        };

        void push();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            if (session?.user) {
                // Sesión nueva: el destino cambia, así que la firma anterior ya
                // no dice nada sobre lo que hay guardado en esta cuenta.
                lastSent.current = '';
                void push();
            }
        });

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, [watched]);
}

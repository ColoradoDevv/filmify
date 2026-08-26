'use server';

/**
 * Server Actions del historial de visionado.
 *
 * Hasta ahora «visto» solo existía en el localStorage de cada navegador
 * (`user.watched` en `@/lib/store/useStore`). Eso hacía que el interruptor
 * «Mostrar lo que he visto» de /settings no pudiera hacer nada: no había un
 * dato en el servidor que enseñar u ocultar.
 *
 * La tabla `watch_history` (20260825_privacy_gated_content.sql) lleva su propia
 * RLS: el dueño la gestiona entera, y un tercero solo puede leerla si
 * `can_view_profile_section(user_id, 'showWatchHistory')` lo permite. Por eso
 * la lectura de abajo no comprueba nada: quien no tenga permiso recibe cero
 * filas de la propia base de datos.
 */

import { createSupabaseServerClient } from '@/server/repositories/supabase';
import { getMovieDetails, getTVDetails } from '@/server/services/tmdb';

export interface WatchHistoryEntry {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath: string | null;
    watchedAt: string;
}

/** Lo que el cliente puede pedir que se registre. */
export interface WatchedInput {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
}

/** Tope de lo que se sincroniza de una vez, por si el store local viene lleno. */
const MAX_SYNC = 60;

function isValid(item: WatchedInput): boolean {
    return Number.isInteger(item?.tmdbId)
        && item.tmdbId > 0
        && (item.mediaType === 'movie' || item.mediaType === 'tv');
}

/**
 * Póster de un título, o null si TMDB no responde.
 *
 * Se resuelve al escribir y se guarda en la fila — ver la nota de la migración:
 * al leer serían N peticiones por cada visita a un perfil.
 */
async function resolvePoster(item: WatchedInput): Promise<string | null> {
    try {
        const details = item.mediaType === 'movie'
            ? await getMovieDetails(item.tmdbId)
            : await getTVDetails(item.tmdbId);
        return details?.poster_path ?? null;
    } catch {
        return null;
    }
}

/**
 * Registra títulos como vistos, sin duplicar.
 *
 * `onConflict` sobre la clave primaria: volver a ver algo actualiza la fecha en
 * vez de crear otra fila. Solo se busca el póster de los títulos que aún no
 * están guardados, para que resincronizar el historial completo al iniciar
 * sesión no dispare una petición a TMDB por cada uno.
 */
export async function recordWatched(items: WatchedInput[]): Promise<{ ok: boolean }> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const clean = (items ?? []).filter(isValid).slice(0, MAX_SYNC);
    if (clean.length === 0) return { ok: true };

    const { data: existing } = await supabase
        .from('watch_history')
        .select('tmdb_id, media_type, poster_path')
        .eq('user_id', user.id);

    const known = new Map(
        (existing ?? []).map((r: { tmdb_id: number; media_type: string; poster_path: string | null }) =>
            [`${r.media_type}:${r.tmdb_id}`, r.poster_path]),
    );

    const rows = await Promise.all(clean.map(async (item) => {
        const key = `${item.mediaType}:${item.tmdbId}`;
        const posterPath = known.has(key) ? known.get(key) ?? null : await resolvePoster(item);
        return {
            user_id: user.id,
            tmdb_id: item.tmdbId,
            media_type: item.mediaType,
            title: item.title?.slice(0, 300) ?? '',
            poster_path: posterPath,
        };
    }));

    const { error } = await supabase
        .from('watch_history')
        .upsert(rows, { onConflict: 'user_id,media_type,tmdb_id' });

    return { ok: !error };
}

/**
 * Historial de un usuario, más reciente primero.
 *
 * Devuelve vacío tanto si el usuario no existe como si su privacidad lo tapa:
 * la RLS filtra filas, no da error, y desde fuera las dos situaciones tienen
 * que ser indistinguibles — si no, la ausencia de resultados delataría que ahí
 * hay algo escondido.
 */
export async function getWatchHistory(ownerId: string, limit = 8): Promise<WatchHistoryEntry[]> {
    if (!ownerId) return [];

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('watch_history')
        .select('tmdb_id, media_type, title, poster_path, watched_at')
        .eq('user_id', ownerId)
        .order('watched_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 24));

    if (error || !data) return [];

    return data.map((row: {
        tmdb_id: number; media_type: string; title: string;
        poster_path: string | null; watched_at: string;
    }) => ({
        tmdbId: row.tmdb_id,
        mediaType: row.media_type === 'tv' ? 'tv' as const : 'movie' as const,
        title: row.title,
        posterPath: row.poster_path,
        watchedAt: row.watched_at,
    }));
}

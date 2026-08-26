'use server';

/**
 * Server Actions de favoritos.
 *
 * Los favoritos viven en `profiles.preferences.favorites`, la misma columna
 * jsonb que guarda los ajustes y las amistades. Guardarlos era, hasta ahora, un
 * leer-fusionar-guardar hecho desde el navegador
 * (`saveFavoritesToSupabase`): dos pestañas abiertas leían el mismo estado de
 * partida y la última en escribir revertía lo que la otra acababa de añadir.
 *
 * Aquí la fusión la hace `merge_my_preferences()` dentro de una transacción con
 * la fila bloqueada (20260825_privacy_gated_content.sql), que es lo mismo que
 * `friend_action` hizo con las amistades por el mismo motivo. Y tiene que pasar
 * por servidor de todas formas: la columna está revocada para `authenticated`
 * desde 20260826_close_profiles_read.sql.
 */

import { createSupabaseServerClient } from '@/server/repositories/supabase';
import type { Movie } from '@/types/tmdb';

export interface FavoritesResult {
    ok: boolean;
    favorites: Movie[];
    error?: string;
}

/** Se queda con lo que al menos tiene `id` numérico, y sin repetidos. */
function sanitize(value: unknown): Movie[] {
    if (!Array.isArray(value)) return [];
    const byId = new Map<number, Movie>();
    for (const item of value) {
        if (item && typeof item === 'object' && typeof (item as Movie).id === 'number') {
            byId.set((item as Movie).id, item as Movie);
        }
    }
    return Array.from(byId.values());
}

/** Favoritos del usuario en sesión. Anónimo → lista vacía, sin error. */
export async function getFavorites(): Promise<FavoritesResult> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: true, favorites: [] };

    const { data, error } = await supabase.rpc('get_my_preferences');
    if (error) return { ok: false, favorites: [], error: 'No se pudieron leer tus favoritos' };

    return { ok: true, favorites: sanitize((data as Record<string, unknown> | null)?.favorites) };
}

/**
 * Sustituye la lista completa de favoritos.
 *
 * Recibe la lista entera y no un «añade este» porque el cliente ya mantiene su
 * propia copia en el store de Zustand y la sincroniza al iniciar sesión; el
 * parche solo toca la clave `favorites`, así que el resto de la columna
 * —ajustes, amistades— se conserva pase lo que pase.
 */
export async function saveFavorites(favorites: Movie[]): Promise<FavoritesResult> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, favorites: [], error: 'Sesión no iniciada' };

    const clean = sanitize(favorites);

    const { data, error } = await supabase
        .rpc('merge_my_preferences', { p_patch: { favorites: clean } });

    if (error) return { ok: false, favorites: [], error: 'No se pudieron guardar tus favoritos' };

    return { ok: true, favorites: sanitize((data as Record<string, unknown> | null)?.favorites) };
}

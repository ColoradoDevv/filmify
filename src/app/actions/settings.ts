'use server';

/**
 * Server Actions de los ajustes de cuenta.
 *
 * La lectura y la escritura de `profiles.preferences` viven aquí, en servidor,
 * por dos motivos:
 *
 *  1. La escritura es un leer-fusionar-guardar. Hacerlo desde el cliente abría
 *     una ventana en la que dos pestañas podían pisarse; y sobre todo, cada
 *     pantalla se traía su propia versión de la fusión — una de ellas la hacía
 *     mal y borraba favoritos y amistades (ver `lib/user-preferences.ts`).
 *  2. El identificador de usuario sale de la sesión, nunca del cliente, así que
 *     nadie puede escribir las preferencias de otro.
 *
 * Ninguna de las dos toca la columna directamente: van por
 * `get_my_preferences()` y `merge_my_preferences()`
 * (20260825_privacy_gated_content.sql). `preferences` está revocada para
 * `authenticated` porque servía los favoritos y el grafo social de todo el
 * mundo a cualquier petición anónima. La fusión, además, ocurre ahora dentro
 * de una transacción con la fila bloqueada, así que la carrera entre pestañas
 * está cerrada de verdad y no solo estrechada.
 */

import { createSupabaseServerClient } from '@/server/repositories/supabase';
import {
    DEFAULT_PREFERENCES,
    buildPreferencesPatch,
    normalizePreferences,
    type PreferencesPatch,
    type UserPreferences,
} from '@/lib/user-preferences';

export interface PreferencesResult {
    ok: boolean;
    preferences: UserPreferences;
    error?: string;
}

/** Preferencias del usuario en sesión, ya normalizadas y con defaults. */
export async function getUserPreferences(): Promise<PreferencesResult> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, preferences: DEFAULT_PREFERENCES, error: 'Sesión no iniciada' };

    const { data, error } = await supabase.rpc('get_my_preferences');

    if (error) {
        return { ok: false, preferences: DEFAULT_PREFERENCES, error: 'No se pudieron leer tus ajustes' };
    }

    return { ok: true, preferences: normalizePreferences(data) };
}

/**
 * Aplica un parche parcial conservando el resto de la columna.
 *
 * Devuelve el estado resultante para que la interfaz se sincronice con lo que
 * de verdad quedó guardado, en vez de asumir que su optimismo acertó.
 */
export async function patchUserPreferences(patch: PreferencesPatch): Promise<PreferencesResult> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, preferences: DEFAULT_PREFERENCES, error: 'Sesión no iniciada' };

    const { data: current, error: readError } = await supabase.rpc('get_my_preferences');

    if (readError) {
        return { ok: false, preferences: DEFAULT_PREFERENCES, error: 'No se pudieron leer tus ajustes' };
    }

    // Solo los grupos que cambian. `merge_my_preferences` fusiona a primer
    // nivel dentro de su transacción, así que lo que no viaja no se toca —ni
    // los favoritos, ni las amistades, ni lo que otra pestaña acabe de guardar.
    const payload = buildPreferencesPatch(current, patch);

    const { data: saved, error: writeError } = await supabase
        .rpc('merge_my_preferences', { p_patch: payload });

    if (writeError) {
        return {
            ok: false,
            preferences: normalizePreferences(current),
            error: 'No se pudieron guardar tus ajustes',
        };
    }

    // Se devuelve lo que quedó guardado de verdad, no lo que se pidió: si otra
    // pestaña cambió otro grupo en medio, la interfaz se entera aquí.
    return { ok: true, preferences: normalizePreferences(saved) };
}

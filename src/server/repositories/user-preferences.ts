/**
 * Lectura de las preferencias del usuario en sesión.
 *
 * Único punto de lectura de `profiles.preferences` desde el servidor. Existe
 * porque la misma consulta —auth.getUser() + select por clave primaria +
 * `normalizePreferences`— hacía falta en cuatro sitios (los ajustes, la
 * búsqueda y los dos endpoints de TMDB) y cada copia degradaba a su manera
 * cuando fallaba.
 *
 * La escritura NO vive aquí: es un leer-fusionar-guardar y está en
 * `@/app/actions/settings`, que además es un Server Action y no puede exportar
 * nada que no sea una función async.
 */

import { createSupabaseServerClient } from './supabase';
import {
    DEFAULT_PREFERENCES,
    normalizePreferences,
    type UserPreferences,
} from '@/lib/user-preferences';

/**
 * Preferencias del visitante actual, ya normalizadas.
 *
 * Degrada a los valores por defecto —nunca lanza— porque todos sus llamadores
 * están en el camino crítico de una búsqueda o de una página pública: un fallo
 * leyendo el perfil no puede tumbar la respuesta. Anónimo también recibe los
 * defaults, que son la opción restrictiva.
 */
export async function readUserPreferences(): Promise<UserPreferences> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return DEFAULT_PREFERENCES;

        // `get_my_preferences()` y no `select('preferences')`: la columna está
        // revocada para `authenticated` (ver 20260826_close_profiles_read.sql)
        // porque exponía los favoritos y las amistades de todo el mundo a
        // cualquier petición anónima. La función resuelve el usuario con
        // auth.uid(), así que tampoco hace falta pasarle el identificador.
        const { data, error } = await supabase.rpc('get_my_preferences');

        if (error) return DEFAULT_PREFERENCES;
        return normalizePreferences(data);
    } catch {
        return DEFAULT_PREFERENCES;
    }
}

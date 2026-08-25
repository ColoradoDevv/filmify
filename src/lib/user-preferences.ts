/**
 * Preferencias de usuario: forma, valores por defecto y fusión segura.
 *
 * `profiles.preferences` es una sola columna JSONB donde conviven cosas muy
 * distintas: los ajustes de esta pantalla, pero también `favorites` (ver
 * `lib/supabase/favorites.ts`) y `friends` (ver las migraciones de amistades).
 *
 * Por eso NADIE debe escribir esa columna entera. La pantalla de preferencias
 * lo hacía —`update({ preferences: newSettings })`— y cada vez que alguien
 * tocaba un interruptor se llevaba por delante favoritos, amistades,
 * notificaciones y privacidad. Este módulo existe para que esa escritura pase
 * siempre por una fusión que conserva las claves que no conoce.
 */

/**
 * Solo hay interruptor para lo que el sistema envía de verdad. El cron de
 * /api/cron/notifications produce exactamente dos tipos —`newRelease` y el
 * resumen semanal `news`— y no hay ningún otro productor de notificaciones en
 * el proyecto, así que ofrecer «actividad de amigos» u «ofertas» sería una
 * casilla sin nada detrás.
 */
export interface NotificationPreferences {
    /** Estrenos y próximos lanzamientos (tipo `newRelease`). */
    newReleases: boolean;
    /** Resumen semanal de tendencias (tipo `news`). */
    recommendations: boolean;
}

/**
 * Los cuatro se aplican en la base de datos, no en la interfaz: `profiles` se
 * servía sin sesión con la columna `preferences` entera, así que filtrar en el
 * componente no ocultaba nada. Ver `can_view_profile_section()` y
 * `get_public_profile()` en 20260825_privacy_gated_content.sql.
 */
export interface PrivacyPreferences {
    /** Perfil visible para cualquiera; apagado, solo para sus amistades. */
    publicProfile: boolean;
    /** Deja ver `watch_history` en el perfil. */
    showWatchHistory: boolean;
    /** Deja ver `preferences.favorites` en el perfil. */
    showWatchlist: boolean;
    /** Lo comprueba `friend_action` (20260702) antes de aceptar una solicitud. */
    allowFriendRequests: boolean;
}

export interface PlaybackPreferences {
    /** Apaga animaciones y transiciones en toda la interfaz. */
    reducedMotion: boolean;
    /** Incluye resultados marcados como adultos en la búsqueda de TMDB. */
    adultContent: boolean;
}

export interface UserPreferences {
    notifications: NotificationPreferences;
    privacy: PrivacyPreferences;
    playback: PlaybackPreferences;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
    notifications: {
        newReleases: true,
        recommendations: true,
    },
    privacy: {
        publicProfile: true,
        showWatchHistory: true,
        showWatchlist: true,
        allowFriendRequests: true,
    },
    playback: {
        reducedMotion: false,
        adultContent: false,
    },
};

/** Parche parcial: solo las claves que cambian, por grupo. */
export type PreferencesPatch = {
    [K in keyof UserPreferences]?: Partial<UserPreferences[K]>;
};

type Json = Record<string, unknown>;

function isPlainObject(v: unknown): v is Json {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** `T` debe tener todas sus propiedades booleanas, sin exigir índice de string. */
function pickBooleans<T extends { [K in keyof T]: boolean }>(defaults: T, raw: unknown): T {
    if (!isPlainObject(raw)) return { ...defaults };
    const out = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
        const value = raw[key as string];
        if (typeof value === 'boolean') out[key] = value as T[keyof T];
    }
    return out;
}

/**
 * Normaliza el JSON crudo a `UserPreferences`, ignorando lo que no reconozca.
 *
 * Tolera la forma antigua, en la que `reducedMotion` y `adultContent` colgaban
 * de la raíz en lugar de vivir bajo `playback`, para que nadie pierda sus
 * ajustes al desplegar.
 */
export function normalizePreferences(raw: unknown): UserPreferences {
    const source = isPlainObject(raw) ? raw : {};
    const legacyPlayback = {
        reducedMotion: source.reducedMotion,
        adultContent: source.adultContent,
    };

    return {
        notifications: pickBooleans(DEFAULT_PREFERENCES.notifications, source.notifications),
        privacy: pickBooleans(DEFAULT_PREFERENCES.privacy, source.privacy),
        playback: pickBooleans(
            DEFAULT_PREFERENCES.playback,
            isPlainObject(source.playback) ? source.playback : legacyPlayback,
        ),
    };
}

/**
 * Construye el parche que se manda a `merge_my_preferences()`.
 *
 * Devuelve SOLO los grupos que el parche toca, cada uno ya completo y
 * normalizado. Es deliberado que no devuelva el objeto entero: la función de
 * base de datos fusiona a primer nivel con `||` bajo un `FOR UPDATE`, así que
 * mandar solo `{ privacy: {...} }` deja intactas las claves que no aparecen
 * —`favorites`, `friends`, los otros grupos— aunque otra pestaña las haya
 * cambiado un instante antes.
 *
 * Mandar el objeto completo anularía ese bloqueo: la fusión se habría hecho
 * aquí, contra una lectura vieja, y el guardado pisaría lo que hubiera llegado
 * en medio. Lo único que se puede perder ahora es un cambio simultáneo al
 * MISMO grupo, que es el mínimo irreducible.
 *
 * Las claves sueltas de la forma antigua (`reducedMotion`, `adultContent` en la
 * raíz) las retira la propia función SQL, porque un merge no puede borrar.
 */
export function buildPreferencesPatch(raw: unknown, patch: PreferencesPatch): Json {
    const current = normalizePreferences(raw);
    const payload: Json = {};

    if (patch.notifications) {
        payload.notifications = { ...current.notifications, ...patch.notifications };
    }
    if (patch.privacy) {
        payload.privacy = { ...current.privacy, ...patch.privacy };
    }
    if (patch.playback) {
        payload.playback = { ...current.playback, ...patch.playback };
    }

    return payload;
}

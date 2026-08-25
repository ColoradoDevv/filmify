'use client';

import { useEffect } from 'react';
import { applyReducedMotion, readStoredReducedMotion } from '@/lib/reduced-motion';

/** Ajustes que la pantalla vieja guardaba en el navegador y que ya nadie lee. */
const RETIRED_KEY = 'filmify_preferences';

/**
 * Restaura el ajuste de «reducir movimiento» al cargar cualquier página.
 *
 * Lee el espejo de localStorage en vez de consultar Supabase: el ajuste tiene
 * que estar puesto cuanto antes, y una petición de red llegaría tarde. La
 * fuente de verdad sigue siendo `profiles.preferences.playback.reducedMotion`,
 * que /settings vuelca aquí cada vez que se guarda.
 *
 * De paso retira `filmify_preferences`. Aprovecha que este componente es el
 * único que se monta en todas las rutas y que ya toca el almacenamiento: la
 * clave la escribía la pantalla de ajustes anterior y quedaría ahí para
 * siempre, con una copia desactualizada de los ajustes, en el navegador de
 * quien ya la tuviera.
 *
 * No pinta nada.
 */
export default function ReducedMotionBoot() {
    useEffect(() => {
        applyReducedMotion(readStoredReducedMotion());
        try {
            localStorage.removeItem(RETIRED_KEY);
        } catch {
            // Modo privado: no hay nada que limpiar.
        }
    }, []);

    return null;
}

/**
 * Movimiento reducido: clase en <html> + espejo en localStorage.
 *
 * La preferencia vive en `profiles.preferences.playback.reducedMotion`, pero
 * leerla exige una ida y vuelta a Supabase. Para que el ajuste esté puesto ya en
 * el primer pintado —que es justo cuando arrancan las animaciones de entrada—
 * se guarda también en localStorage y se aplica al montar.
 *
 * El apagado real lo hace `.reduce-motion` en globals.css.
 */

export const REDUCED_MOTION_KEY = 'filmify_reduced_motion';
export const REDUCED_MOTION_CLASS = 'reduce-motion';

/** Aplica (o quita) la clase y deja constancia para el próximo arranque. */
export function applyReducedMotion(enabled: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle(REDUCED_MOTION_CLASS, enabled);
    try {
        localStorage.setItem(REDUCED_MOTION_KEY, enabled ? '1' : '0');
    } catch {
        // Modo privado o almacenamiento lleno: la clase ya está puesta, que es
        // lo que importa en esta sesión.
    }
}

/** Lo último que se guardó en este navegador. */
export function readStoredReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return localStorage.getItem(REDUCED_MOTION_KEY) === '1';
    } catch {
        return false;
    }
}

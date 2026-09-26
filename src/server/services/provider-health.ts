/**
 * Circuit breaker por host para las sondas a proveedores de reproducción.
 *
 * Problema: cuando un proveedor se cae (p. ej. Vimeus), cada sonda quema su
 * timeout completo (segundos) y los fallos de red NO se cachean en el Next
 * Data Cache. Una página de detalle o una fila del catálogo dispara decenas
 * de sondas → 10-30 s de TTFB y clics que parecen muertos.
 *
 * Con el circuito abierto, las sondas a ese host se saltan al instante
 * (fail-open: se muestra el título y la cascada de reproducción decide el
 * proveedor sano). Tras el cooldown se deja pasar una sonda de prueba
 * (half-open): si responde, el circuito se cierra solo.
 *
 * Solo los errores de RED (timeout, DNS, socket) y los HTTP 5xx cuentan como
 * fallo del host. Un 4xx o una respuesta "sin contenido" significa que el
 * host está vivo → cuenta como éxito.
 */

interface BreakerState {
    consecutiveFailures: number;
    /** Cuándo se abrió por última vez (0 = nunca). */
    openedAt: number;
}

const _breakers = new Map<string, BreakerState>();

/** Fallos de red seguidos antes de abrir el circuito. */
const FAILURE_THRESHOLD = 3;
/** Tiempo que el circuito permanece abierto antes de probar de nuevo. */
const COOLDOWN_MS = 3 * 60 * 1000;

function getState(host: string): BreakerState {
    let state = _breakers.get(host);
    if (!state) {
        state = { consecutiveFailures: 0, openedAt: 0 };
        _breakers.set(host, state);
    }
    return state;
}

/** true si hay que saltarse la sonda a este host (fallar rápido). */
export function isCircuitOpen(host: string): boolean {
    const state = _breakers.get(host);
    if (!state || state.consecutiveFailures < FAILURE_THRESHOLD) return false;
    // Cooldown vencido → half-open: se permite una sonda de prueba.
    if (Date.now() - state.openedAt >= COOLDOWN_MS) return false;
    return true;
}

/** El host respondió (aunque sea "sin contenido"): está vivo. */
export function recordProviderSuccess(host: string): void {
    _breakers.delete(host);
}

/** Error de red o HTTP 5xx: acerca el circuito a abrirse. */
export function recordProviderFailure(host: string): void {
    const state = getState(host);
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
        state.openedAt = Date.now();
    }
}

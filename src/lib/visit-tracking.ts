/**
 * Cuenta cuántas VISITAS distintas ha hecho alguien a FilmiFy.
 *
 * «Visita» es una sesión de navegador, no una carga de página: sin esa
 * distinción, recargar tres veces contaría como tres visitas y cualquiera
 * pasaría a ser "recurrente" en el primer minuto. La marca de sesión vive en
 * `sessionStorage`, que se vacía al cerrar la pestaña; el total, en
 * `localStorage`.
 *
 * Se guarda en el navegador y no en la cuenta a propósito: el sitio es público y
 * la mayoría de quienes entran no han iniciado sesión. El precio es que el
 * contador es por dispositivo y se pierde al borrar los datos del navegador —
 * asumible para decidir si enseñar unas notas de versión.
 */

const VISITS_KEY = 'filmify_visits';
const SESSION_FLAG = 'filmify_visit_counted';

/** Lecturas y escrituras de storage envueltas: en modo privado pueden lanzar. */
function readNumber(key: string): number {
    try {
        const raw = localStorage.getItem(key);
        const n = Number(raw);
        return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    } catch {
        return 0;
    }
}

/**
 * Suma esta sesión al total si no se había contado, y devuelve el total.
 *
 * Idempotente dentro de la misma sesión: llamarla en cada montaje no infla la
 * cuenta.
 */
export function registerVisit(): number {
    if (typeof window === 'undefined') return 0;

    try {
        if (sessionStorage.getItem(SESSION_FLAG) === '1') {
            return readNumber(VISITS_KEY);
        }
        const total = readNumber(VISITS_KEY) + 1;
        localStorage.setItem(VISITS_KEY, String(total));
        sessionStorage.setItem(SESSION_FLAG, '1');
        return total;
    } catch {
        // Sin almacenamiento no hay forma de saberlo. Se devuelve 0, que hace
        // que quien pregunte trate a esta persona como recién llegada y no le
        // enseñe nada — el lado discreto.
        return 0;
    }
}

/** Total de visitas registradas, sin contar la actual. */
export function getVisitCount(): number {
    if (typeof window === 'undefined') return 0;
    return readNumber(VISITS_KEY);
}

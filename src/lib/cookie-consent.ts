'use client';

/**
 * Estado de consentimiento de cookies — fuente única de verdad para los
 * componentes que cargan terceros (anuncios, analítica).
 *
 * El banner (CookieConsent.tsx) persiste `cookie_consent` como JSON
 * { analytics: boolean, marketing: boolean } en localStorage + cookie, y emite
 * un evento `cookie-consent-changed` al guardar. Los consumidores leen el
 * estado y se suscriben a los cambios para cargar/descargar terceros en vivo.
 */

export type ConsentState = {
    analytics: boolean;
    marketing: boolean;
};

export const CONSENT_EVENT = 'cookie-consent-changed';

/** Estado inicial en el régimen estricto (EEE/UK/CH): nada hasta que elija. */
const DEFAULT_STRICT: ConsentState = { analytics: false, marketing: false };

/** Estado inicial fuera del EEE: modelo de exclusión, activo hasta que rechace. */
const DEFAULT_OPT_OUT: ConsentState = { analytics: true, marketing: true };

/**
 * ¿Este visitante necesita dar consentimiento PREVIO?
 *
 * Antes lo decidía el middleware por geo (`cf-ipcountry`) y lo publicaba en
 * el atributo `data-consent-required` del <html>, leído en el layout raíz
 * con `headers()`. Esa llamada por sí sola bastaba para que Next marcara
 * CUALQUIER página como dinámica (nada de ISR), justo lo que le impedía a
 * Cloudflare cachear cualquier ruta (ver CLAUDE.md, fix de rendimiento
 * sep-2026). Ahora se resuelve aquí, en cliente, contra `/api/consent-region`
 * (siempre dinámica, no afecta al resto de páginas).
 */
let strictRegion: boolean | null = null;
let pending: Promise<boolean> | null = null;

function fetchRegion(): Promise<boolean> {
    if (strictRegion !== null) return Promise.resolve(strictRegion);
    if (pending) return pending;
    pending = fetch('/api/consent-region', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => !!d.required)
        .catch(() => true) // fallo de red: lado seguro (EEE)
        .then((required) => {
            strictRegion = required;
            pending = null;
            return required;
        });
    return pending;
}

/**
 * Resuelve si el visitante necesita consentimiento previo. Lanza y memoiza
 * la consulta a `/api/consent-region` la primera vez que se llama.
 */
export async function resolveConsentRequired(): Promise<boolean> {
    if (typeof document === 'undefined') return true;
    return fetchRegion();
}

/**
 * Versión sincrónica para lecturas que no pueden esperar (`getConsent`,
 * suscriptores en vivo). Antes de resolver asume el lado estricto (EEE) y
 * lanza la resolución en segundo plano; si el resultado difiere y todavía no
 * hay una decisión guardada, avisa a los suscriptores de `onConsentChange`.
 */
export function isConsentRequired(): boolean {
    if (typeof document === 'undefined') return true;
    if (strictRegion !== null) return strictRegion;
    fetchRegion().then((required) => {
        if (!required && !hasDecided()) emitConsentChange();
    });
    return true;
}

/** Estado inicial aplicable a este visitante mientras no haya decidido. */
function defaultState(): ConsentState {
    return isConsentRequired() ? DEFAULT_STRICT : DEFAULT_OPT_OUT;
}

function parse(raw: string | null): ConsentState | null {
    if (!raw) return null;
    try {
        const p = JSON.parse(raw);
        if (typeof p === 'string') {
            // Formato legado: 'granted' / 'denied' para todo.
            const granted = p === 'granted';
            return { analytics: granted, marketing: granted };
        }
        return { analytics: !!p.analytics, marketing: !!p.marketing };
    } catch {
        return null;
    }
}

/** Lee el consentimiento actual.
 *
 *  Si el usuario aún no decidió, el valor por defecto depende de su región:
 *  denegado en el EEE/UK/CH, concedido (con opción de rechazo) fuera. */
export function getConsent(): ConsentState {
    if (typeof window === 'undefined') return DEFAULT_STRICT;
    return parse(localStorage.getItem('cookie_consent')) ?? defaultState();
}

/** ¿El usuario ya tomó una decisión (aceptar/rechazar/personalizar)? */
export function hasDecided(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('cookie_consent') !== null;
}

/** Suscribe a cambios de consentimiento (banner guardado u otra pestaña).
 *  Devuelve la función de limpieza. */
export function onConsentChange(cb: (state: ConsentState) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = () => cb(getConsent());
    window.addEventListener(CONSENT_EVENT, handler);
    window.addEventListener('storage', handler); // sincroniza entre pestañas
    return () => {
        window.removeEventListener(CONSENT_EVENT, handler);
        window.removeEventListener('storage', handler);
    };
}

/** Notifica a los consumidores que el consentimiento cambió (lo llama el banner). */
export function emitConsentChange(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(CONSENT_EVENT));
}

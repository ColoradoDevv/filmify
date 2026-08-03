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

const DEFAULT: ConsentState = { analytics: false, marketing: false };

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

/** Lee el consentimiento actual. Si el usuario aún no decidió, todo es false
 *  (nada de terceros no esenciales hasta que haya una elección explícita). */
export function getConsent(): ConsentState {
    if (typeof window === 'undefined') return DEFAULT;
    return parse(localStorage.getItem('cookie_consent')) ?? DEFAULT;
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

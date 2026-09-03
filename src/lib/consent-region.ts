/**
 * Países donde el consentimiento PREVIO es obligatorio: EEE (UE + Islandia,
 * Liechtenstein y Noruega), Reino Unido y Suiza.
 *
 * Fuera de esa lista el sitio usa un modelo de exclusión: la analítica y los
 * anuncios cargan por defecto y el visitante puede rechazarlos desde el mismo
 * banner. Antes el estado inicial era "todo denegado" en el mundo entero, así
 * que quien ignoraba el banner —la mayoría— no veía anuncios nunca.
 *
 * Vive en su propio módulo (y no en middleware.ts) porque ahora lo consulta
 * también `/api/consent-region` — ver ese route handler para el porqué.
 */
export const CONSENT_REQUIRED_COUNTRIES = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
    'SI', 'ES', 'SE',
    'IS', 'LI', 'NO',
    'GB', 'CH',
]);

/**
 * ¿Hay que pedir consentimiento previo a un visitante de este país?
 *
 * `cf-ipcountry` la inyecta Cloudflare y SOLO existe si el dominio está
 * proxeado (nube naranja). Sin cabecera no se adivina: se asume que sí hace
 * falta, que es el lado seguro.
 */
export function isConsentRequiredForCountry(country: string | null | undefined): boolean {
    const c = country?.toUpperCase();
    if (!c || c === 'XX' || c === 'T1') return true;
    return CONSENT_REQUIRED_COUNTRIES.has(c);
}

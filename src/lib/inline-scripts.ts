/**
 * Contenido EXACTO de los `<script>` inline que renderiza el layout raíz.
 *
 * Antes el CSP los permitía con un nonce generado por petición en el
 * middleware — pero para leerlo, el layout tenía que llamar a `headers()`, y
 * esa sola llamada basta para que Next marque CUALQUIER página como
 * dinámica (nada de ISR), que es justo lo que le impedía a Cloudflare
 * cachear cualquier ruta (ver CLAUDE.md, fix de rendimiento sep-2026).
 *
 * Estos scripts no dependen de nada por petición (el consentimiento por
 * defecto se fija siempre a 'denied'; ver `@/lib/cookie-consent` para cómo
 * se corrige en cliente según la región), así que el CSP los puede permitir
 * por hash SHA-256 en vez de por nonce — misma barrera contra inyección (un
 * atacante no puede fabricar contenido que hashee igual a uno de estos), sin
 * depender de una API dinámica.
 *
 * Este módulo es la ÚNICA fuente de verdad de su contenido: el layout los
 * renderiza literalmente y `middleware.ts` hashea estas mismas constantes
 * para el CSP. Si hay que editar uno, tocarlo aquí basta para que ambos
 * sigan de acuerdo — no dupliques el texto en otro sitio.
 */

/** Analítica de Google. `gaId` es `NEXT_PUBLIC_GA_ID`, fijo por despliegue. */
export function buildGaInitScript(gaId: string): string {
    return `
          window['dataLayer'] = window['dataLayer'] || [];
          function gtag(){window['dataLayer'].push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');`;
}

/**
 * Estado por defecto de Consent Mode ANTES de que el visitante decida.
 * Siempre 'denied' — el lado seguro en cualquier región — porque este script
 * ya no puede variar por `cf-ipcountry` (eso exigiría `headers()` en el
 * layout). El ajuste fino por región ("fuera del EEE, concedido salvo
 * rechazo") lo aplica `CookieConsent` en cliente, milisegundos después,
 * contra `/api/consent-region`.
 */
export const CONSENT_MODE_DEFAULT_SCRIPT = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'denied'
            });
          `;

/** Registro del service worker (PWA). Contenido fijo, sin datos de petición. */
export const REGISTER_SW_SCRIPT = `
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service worker registered:', reg.scope))
                .catch(err => console.warn('SW registration failed:', err));
            }
          `;

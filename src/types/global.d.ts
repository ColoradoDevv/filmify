export {};

declare global {
    interface Window {
        /**
         * gtag.js (Google Analytics / Consent Mode). Se carga vía `<Script>`
         * en el layout raíz (ver @/lib/inline-scripts) — no siempre está
         * definido (bloqueadores de anuncios, script aún no cargado), así que
         * cada llamada debe usar `?.`.
         */
        gtag?: (...args: unknown[]) => void;
    }
}

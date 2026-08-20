/**
 * Environment variables validation utility
 *
 * Design goals:
 *  - NEVER throw at module eval time (breaks Next.js static analysis / build).
 *  - Provide a single source of truth for required/optional env vars.
 *  - Allow callers to handle missing vars gracefully via try/catch.
 */

// NOTE: In Next.js, NEXT_PUBLIC_* env vars are inlined at build time.
// We deliberately read them via `process.env.<NAME>` (not dynamic keys) so the
// compiler can replace them in the client bundle.

function logMissingEnv(key: string): void {
    const message = `[env] Missing required environment variable: ${key}`;
    // Use warn instead of error to avoid tripping up build-time error scanners.
    console.warn(message);
}

/**
 * Supabase configuration (all optional — app degrades gracefully if absent).
 *
 * Supabase is transitioning naming conventions — we accept both:
 *   - Legacy: NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
 *   - New:    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY
 *
 * NOTE: process.env reads must be literal strings (not computed) so Next.js
 * can inline NEXT_PUBLIC_* values in the client bundle at build time.
 */
export function getSupabaseConfig() {
    return {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        anonKey:
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ?? '',
        serviceRoleKey:
            process.env.SUPABASE_SECRET_KEY
            ?? process.env.SUPABASE_SERVICE_ROLE_KEY
            ?? '',
    };
}

/**
 * TMDB API key — required for most content features.
 * Throws only when explicitly requested by calling code (so callers can catch).
 */
export function getTmdbApiKey(): string {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
        logMissingEnv('TMDB_API_KEY');
        throw new Error('TMDB_API_KEY is not configured');
    }
    return key;
}

/**
 * Safe variant: returns empty string instead of throwing.
 * Use for code paths that must not crash the build.
 */
export function getTmdbApiKeyOptional(): string {
    return process.env.TMDB_API_KEY ?? '';
}

/**
 * Get optional API keys (for features that can work without them)
 */
export function getOptionalApiKeys() {
    return {
        groqApiKey: process.env.GROQ_API_KEY ?? '',
        resendApiKey: process.env.RESEND_API_KEY ?? '',
        cronSecret: process.env.CRON_SECRET ?? '',
        gaId: process.env.NEXT_PUBLIC_GA_ID ?? '',
        contactEmail: process.env.CONTACT_EMAIL ?? '',
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        hcaptchaSiteKey: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '',
    };
}

/**
 * Returns true if the critical runtime dependencies are configured.
 * Useful to early-return in API routes / server components.
 * Acepta cualquiera de las dos variantes de la clave TMDB — el cliente TMDB
 * ya usa la pública como fallback, así que el sitemap no debe ser más
 * estricto que las páginas.
 */
export function hasRequiredEnv(): boolean {
    return Boolean(process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY);
}

/**
 * Secret used to derive STB device passwords via HMAC.
 * Must be set in production — falls back to a build-time warning if absent.
 */
export function getPortalDeviceSecret(): string {
    const secret = process.env.PORTAL_DEVICE_SECRET;
    if (!secret) {
        logMissingEnv('PORTAL_DEVICE_SECRET');
    }
    return secret ?? '';
}

/**
 * ¿Está abierto el módulo de doramas (/doramas y sus enlaces de navegación)?
 *
 * Cerrado temporalmente en producción (2026-08-18): APIPlayer, el proveedor
 * que daba la mitad de la cobertura, empezó a exigir verificación antibot a
 * todas las peticiones — comprobado también desde el EC2 — y sin él el
 * catálogo se queda en lo que tenga Vimeus (11-17 títulos por región). Se
 * reabre cuando haya una fuente de disponibilidad decente, ya sea porque
 * APIPlayer vuelva o porque se añada otra señal.
 *
 * En desarrollo sigue abierto para poder seguir trabajando en él. El override
 * por entorno permite abrirlo en producción sin desplegar código
 * (NEXT_PUBLIC_DORAMAS_ENABLED=1) o cerrarlo en local (=0).
 *
 * OJO: esto solo apaga el CATÁLOGO. La capa `@/server/services/dorama` sigue
 * activa y es la que resuelve la reproducción de TODAS las series en
 * /tv/[id] — apagarla dejaría el sitio sin proveedores de series.
 */
export function isDoramasEnabled(): boolean {
    const flag = process.env.NEXT_PUBLIC_DORAMAS_ENABLED;
    if (flag === '1' || flag === 'true') return true;
    if (flag === '0' || flag === 'false') return false;
    return process.env.NODE_ENV !== 'production';
}

/**
 * Claves de las zonas publicitarias de Adsterra.
 *
 * Cada zona ("ad unit") del panel de Adsterra tiene su propia clave y solo
 * sirve el tamaño con el que fue creada: reutilizar la del 728x90 para un
 * hueco de 320x50 no lo rellena, devuelve vacío. Por eso hay una variable por
 * formato y el slot correspondiente simplemente no se renderiza si falta.
 *
 * Son claves PÚBLICAS (viajan en el HTML como cualquier tag publicitario), no
 * secretos — no aplica SEC-017.
 *
 * Las tres zonas de banner llevan su clave real como valor por defecto: se
 * leen en tiempo de build, así que dejarlas vacías obligaría a editar el
 * `.env.local` del host y redesplegar solo para encender un hueco. Las
 * variables siguen mandando cuando existen, que es lo que permite rotar una
 * zona sin tocar código.
 */
export function getAdsConfig() {
    return {
        // Banners "iframe sync": se inyectan vía atOptions + invoke.js.
        leaderboardKey: process.env.NEXT_PUBLIC_ADSTERRA_KEY_728X90 ?? '7deb51e34387a0c43737578eb16dfe23',
        rectangleKey:   process.env.NEXT_PUBLIC_ADSTERRA_KEY_300X250 ?? 'ce6550c9d52abc55fc5d11ca46514dc1',
        mobileKey:      process.env.NEXT_PUBLIC_ADSTERRA_KEY_320X50 ?? '9b1015654b33c71d45a8ff4989d0654d',
        // Native Banner: script async + <div> contenedor con id propio.
        //
        // ⚠️ DESACTIVADO A PROPÓSITO — no le pongas valor por defecto.
        //
        // Este formato no puede correr dentro del iframe con sandbox, así que
        // su script se ejecuta en el documento principal con privilegios
        // completos sobre la página. En junio de 2026 eso dejó el sitio
        // inservible en móvil: el primer toque en cualquier parte redirigía a
        // una página de anuncios. Se desactivó el 13/06 (AdBanner1), cuando
        // era el único script publicitario suelto en la página — el 728x90 ya
        // corría entonces dentro del iframe y nunca dio ese problema, porque
        // un sandbox sin `allow-top-navigation` ni `allow-popups` no puede
        // navegar la ventana principal.
        //
        // Para reactivarlo hay que servirlo antes desde un iframe aislado
        // (ver docs/ADSTERRA_SETUP.md), no basta con rellenar estas variables.
        nativeSrc:         process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_SRC ?? '',
        nativeContainerId: process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_CONTAINER_ID ?? '',
        // Origen desde el que servir /ads/frame. Vacío = el mismo del sitio,
        // que obliga a sandbox de origen opaco y por tanto a shimear cookie y
        // storage. Apuntándolo a un subdominio propio (p. ej.
        // https://ads.filmify.me, mismo servidor) el frame conserva SU origen
        // real —cookies de verdad, sin shim— y sigue siendo ajeno al de la
        // página, así que no puede tocarla. Es la configuración correcta;
        // requiere DNS + proxy en el host.
        frameOrigin: (process.env.NEXT_PUBLIC_ADS_FRAME_ORIGIN ?? '').replace(/\/$/, ''),
    };
}

// Back-compat helpers (discouraged — prefer the typed accessors above).
export function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        logMissingEnv(key);
        throw new Error(`${key} is not configured`);
    }
    return value;
}

export function getOptionalEnv(key: string, defaultValue: string = ''): string {
    return process.env[key] ?? defaultValue;
}

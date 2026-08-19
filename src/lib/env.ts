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

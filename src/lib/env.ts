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
    const key = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!key) {
        logMissingEnv('NEXT_PUBLIC_TMDB_API_KEY');
        throw new Error('NEXT_PUBLIC_TMDB_API_KEY is not configured');
    }
    return key;
}

/**
 * Safe variant: returns empty string instead of throwing.
 * Use for code paths that must not crash the build.
 */
export function getTmdbApiKeyOptional(): string {
    return process.env.NEXT_PUBLIC_TMDB_API_KEY ?? '';
}

/**
 * Get optional API keys (for features that can work without them)
 */
export function getOptionalApiKeys() {
    return {
        groqApiKey: process.env.GROQ_API_KEY ?? '',
        resendApiKey: process.env.RESEND_API_KEY ?? '',
        cronSecret: process.env.CRON_SECRET ?? '',
        hcaptchaSiteKey: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '',
        gaId: process.env.NEXT_PUBLIC_GA_ID ?? '',
        adsenseClientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? '',
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    };
}

/**
 * Returns true if the critical runtime dependencies are configured.
 * Useful to early-return in API routes / server components.
 */
export function hasRequiredEnv(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_TMDB_API_KEY);
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

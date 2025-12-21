/**
 * Environment variables validation utility
 * Provides safe access to environment variables with proper error handling
 */

/**
 * Validate required environment variable
 * 
 * IMPORTANT: In Next.js, environment variables are loaded at build/start time.
 * If you modify .env.local, you MUST restart the dev server for changes to take effect.
 */
function validateEnv(key: string, value: string | undefined): string {
    if (!value) {
        const isClient = typeof window !== 'undefined';
        const errorMessage = isClient
            ? `Missing required environment variable: ${key}. Please check your .env.local file and ensure ${key} is set. Make sure to restart the dev server after creating/updating .env.local`
            : `Missing required environment variable: ${key}. Please add ${key} to your .env.local file and restart the dev server.`;

        console.error('❌', errorMessage);
        console.error('\n🔍 Debug info:');
        console.error('   - Variable buscada:', key);
        console.error('   - NODE_ENV:', process.env.NODE_ENV);
        // Cannot list all env vars on client side due to replacing mechanism, 
        // but we can check if any relevant ones are showing up if needed.

        // En desarrollo, dar instrucciones más claras
        if (process.env.NODE_ENV === 'development') {
            console.error('\n💡 Solución:');
            console.error('   1. Verifica que el archivo .env.local existe en la raíz del proyecto');
            console.error('   2. Verifica que la variable se llama exactamente: ' + key);
            console.error('   3. ⚠️  IMPORTANTE: Reinicia el servidor de desarrollo:');
            console.error('      - Presiona Ctrl+C para detener el servidor');
            console.error('      - Ejecuta: npm run dev');
            console.error('   4. Ejecuta: npm run check-env para verificar la configuración\n');
        }

        throw new Error(errorMessage);
    }
    return value;
}

/**
 * Get optional environment variable with default value
 */
function getOptionalEnvValue(value: string | undefined, defaultValue: string = ''): string {
    return value || defaultValue;
}

/**
 * Validate Supabase environment variables
 */
export function getSupabaseConfig() {
    return {
        url: getOptionalEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
        anonKey: getOptionalEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        serviceRoleKey: getOptionalEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
    };
}

/**
 * Validate TMDB API key
 */
export function getTmdbApiKey(): string {
    return validateEnv('NEXT_PUBLIC_TMDB_API_KEY', process.env.NEXT_PUBLIC_TMDB_API_KEY);
}

/**
 * Get optional API keys (for features that can work without them)
 */
export function getOptionalApiKeys() {
    return {
        groqApiKey: getOptionalEnvValue(process.env.GROQ_API_KEY),
        resendApiKey: getOptionalEnvValue(process.env.RESEND_API_KEY),
        cronSecret: getOptionalEnvValue(process.env.CRON_SECRET),
        hcaptchaSiteKey: getOptionalEnvValue(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY),
        gaId: getOptionalEnvValue(process.env.NEXT_PUBLIC_GA_ID),
        adsenseClientId: getOptionalEnvValue(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID),
        appUrl: getOptionalEnvValue(process.env.NEXT_PUBLIC_APP_URL, 'http://localhost:3000'),
    };
}

// Deprecated: These generic accessors do not work client-side with Next.js 
// but are kept for server-side compatibility if needed (though discouraged).
// Creating wrappers that assume server-side or hope for the best if used elsewhere.
// Since we verified they were only used in this file, we can safely remove them 
// or implement them knowing they might fail client-side if used with non-inlined keys.
export function getRequiredEnv(key: string): string {
    return validateEnv(key, process.env[key]);
}

export function getOptionalEnv(key: string, defaultValue: string = ''): string {
    return getOptionalEnvValue(process.env[key], defaultValue);
}


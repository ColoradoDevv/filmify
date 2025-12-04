/**
 * Environment variables validation utility
 * Provides safe access to environment variables with proper error handling
 */

/**
 * Get required environment variable or throw error
 * 
 * IMPORTANT: In Next.js, environment variables are loaded at build/start time.
 * If you modify .env.local, you MUST restart the dev server for changes to take effect.
 */
export function getRequiredEnv(key: string): string {
    // Next.js carga automáticamente las variables de .env.local
    // Las variables con prefijo NEXT_PUBLIC_ están disponibles en cliente y servidor
    const value = process.env[key];
    
    if (!value) {
        const isClient = typeof window !== 'undefined';
        const errorMessage = isClient
            ? `Missing required environment variable: ${key}. Please check your .env.local file and ensure ${key} is set. Make sure to restart the dev server after creating/updating .env.local`
            : `Missing required environment variable: ${key}. Please add ${key} to your .env.local file and restart the dev server.`;
        
        console.error('❌', errorMessage);
        console.error('\n🔍 Debug info:');
        console.error('   - Variable buscada:', key);
        console.error('   - NODE_ENV:', process.env.NODE_ENV);
        console.error('   - Variables disponibles:', Object.keys(process.env)
            .filter(k => k.includes('SUPABASE') || k.includes('TMDB') || k.includes('NEXT_PUBLIC'))
            .map(k => `     • ${k}`)
            .join('\n') || '     (ninguna encontrada)');
        
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
export function getOptionalEnv(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
}

/**
 * Validate Supabase environment variables
 */
export function getSupabaseConfig() {
    return {
        url: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
        anonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
        serviceRoleKey: getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY'),
    };
}

/**
 * Validate TMDB API key
 */
export function getTmdbApiKey(): string {
    return getRequiredEnv('NEXT_PUBLIC_TMDB_API_KEY');
}

/**
 * Get optional API keys (for features that can work without them)
 */
export function getOptionalApiKeys() {
    return {
        groqApiKey: getOptionalEnv('GROQ_API_KEY'),
        resendApiKey: getOptionalEnv('RESEND_API_KEY'),
        cronSecret: getOptionalEnv('CRON_SECRET'),
        hcaptchaSiteKey: getOptionalEnv('NEXT_PUBLIC_HCAPTCHA_SITE_KEY'),
        gaId: getOptionalEnv('NEXT_PUBLIC_GA_ID'),
        adsenseClientId: getOptionalEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID'),
        appUrl: getOptionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    };
}


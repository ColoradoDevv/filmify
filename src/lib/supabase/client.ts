import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from '@/lib/env';

export function createClient() {
    try {
        const { url, anonKey } = getSupabaseConfig();
        return createBrowserClient(url, anonKey);
    } catch (error) {
        // Fallback para desarrollo - usar valores dummy si no están configurados
        if (process.env.NODE_ENV === 'development') {
            console.warn('Supabase not configured. Using dummy client. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
            return createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
            );
        }
        // En producción, re-lanzar el error
        throw error;
    }
}

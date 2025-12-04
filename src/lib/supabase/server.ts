import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from '@/lib/env';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function createClient() {
    const cookieStore = await cookies();
    const { url, anonKey } = getSupabaseConfig();

    return createServerClient(
        url,
        anonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );

}

export async function createAdminClient() {
    const cookieStore = await cookies();
    const { url, serviceRoleKey } = getSupabaseConfig();

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
    }

    return createServerClient(
        url,
        serviceRoleKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}

export function createServiceRoleClient() {
    const { url, serviceRoleKey } = getSupabaseConfig();

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service role operations');
    }

    return createSupabaseClient(
        url,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

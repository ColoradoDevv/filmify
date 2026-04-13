import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from '@/lib/env';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function createClient() {
    const cookieStore = await cookies();
    const { url, anonKey } = getSupabaseConfig();

    if (!url || !anonKey) {
        // Return a dummy client that always returns null/error
        // This prevents crashes when Supabase is not configured
        const createDummyBuilder = () => {
            const builder = {
                select: () => builder,
                insert: () => builder,
                update: () => builder,
                delete: () => builder,
                eq: () => builder,
                neq: () => builder,
                gt: () => builder,
                gte: () => builder,
                lt: () => builder,
                lte: () => builder,
                in: () => builder,
                is: () => builder,
                like: () => builder,
                ilike: () => builder,
                contains: () => builder,
                order: () => builder,
                limit: () => builder,
                single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured', name: 'SupabaseNotConfigured' } }),
                maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured', name: 'SupabaseNotConfigured' } }),
                then: (resolve: any) => resolve({ data: null, error: { message: 'Supabase not configured', name: 'SupabaseNotConfigured' } }),
            };
            return builder;
        };

        const notConfigured = () => ({ message: 'Supabase not configured', name: 'SupabaseNotConfigured' });
        return {
            auth: {
                getUser: async () => ({ data: { user: null }, error: notConfigured() }),
                getSession: async () => ({ data: { session: null }, error: notConfigured() }),
                signInWithPassword: async () => ({ data: { user: null, session: null }, error: notConfigured() }),
                signInWithOtp: async () => ({ data: { user: null, session: null }, error: notConfigured() }),
                signInWithOAuth: async () => ({ data: { url: null, provider: null }, error: notConfigured() }),
                signUp: async () => ({ data: { user: null, session: null }, error: notConfigured() }),
                signOut: async () => ({ error: notConfigured() }),
                resetPasswordForEmail: async () => ({ data: null, error: notConfigured() }),
                updateUser: async () => ({ data: { user: null }, error: notConfigured() }),
                verifyOtp: async () => ({ data: { user: null, session: null }, error: notConfigured() }),
                refreshSession: async () => ({ data: { user: null, session: null }, error: notConfigured() }),
                exchangeCodeForSession: async () => ({ data: { user: null, session: null }, error: notConfigured() }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                admin: {
                    getUserById: async () => ({ data: { user: null }, error: notConfigured() }),
                    listUsers: async () => ({ data: { users: [] }, error: notConfigured() }),
                    createUser: async () => ({ data: { user: null }, error: notConfigured() }),
                    deleteUser: async () => ({ data: null, error: notConfigured() }),
                    updateUserById: async () => ({ data: { user: null }, error: notConfigured() }),
                },
            },
            from: () => createDummyBuilder(),
            rpc: () => Promise.resolve({ data: null, error: notConfigured() }),
            channel: () => ({
                on: () => ({ subscribe: () => { } }),
                subscribe: () => { },
                unsubscribe: () => { },
            }),
            removeChannel: () => { },
        } as any;
    }

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

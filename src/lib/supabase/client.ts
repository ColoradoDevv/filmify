import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from '@/lib/env';

export function createClient() {
    try {
        const { url, anonKey } = getSupabaseConfig();

        if (!url || !anonKey) {
            console.warn('Supabase not configured. Using dummy client.');

            const notConfigured = () => ({ message: 'Supabase not configured', name: 'SupabaseNotConfigured' });

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
                    single: () => Promise.resolve({ data: null, error: notConfigured() }),
                    maybeSingle: () => Promise.resolve({ data: null, error: notConfigured() }),
                    then: (resolve: any) => resolve({ data: null, error: notConfigured() }),
                };
                return builder;
            };

            return {
                auth: {
                    getUser: async () => ({ data: { user: null }, error: notConfigured() }),
                    getSession: async () => ({ data: { session: null }, error: notConfigured() }),
                    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                    signInWithPassword: async () => ({ data: { user: null, session: null }, error: notConfigured() }),
                    signUp: async () => ({ data: { user: null, session: null }, error: notConfigured() }),
                    signOut: async () => ({ error: notConfigured() }),
                },
                from: () => createDummyBuilder(),
                channel: () => ({
                    on: () => ({ subscribe: () => { } }),
                    subscribe: () => { },
                    removeChannel: () => { },
                    unsubscribe: () => { },
                }),
                removeChannel: () => { },
            } as any;
        }

        return createBrowserClient(url, anonKey);
    } catch (error) {
        console.error('Error creating Supabase client:', error);
        throw error;
    }
}

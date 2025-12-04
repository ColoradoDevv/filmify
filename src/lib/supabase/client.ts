import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from '@/lib/env';

export function createClient() {
    try {
        const { url, anonKey } = getSupabaseConfig();

        if (!url || !anonKey) {
            console.warn('Supabase not configured. Using dummy client.');

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
                    single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
                    maybeSingle: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
                    then: (resolve: any) => resolve({ data: null, error: new Error('Supabase not configured') }),
                };
                return builder;
            };

            return {
                auth: {
                    getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
                    getSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') }),
                    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
                    signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
                    signOut: async () => ({ error: new Error('Supabase not configured') }),
                },
                from: () => createDummyBuilder(),
                channel: () => ({
                    on: () => ({ subscribe: () => { } }),
                    subscribe: () => { },
                    removeChannel: () => { },
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

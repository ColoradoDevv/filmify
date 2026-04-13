import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/env';

export function createAdminClient() {
    const { url, serviceRoleKey } = getSupabaseConfig();

    if (!url) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for admin operations');
    }

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
    }

    return createClient(
        url,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

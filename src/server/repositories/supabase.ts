/**
 * Supabase repository — the only place in the codebase that should construct
 * Supabase clients. Everything else goes through these helpers so we can swap
 * the persistence layer without touching business logic.
 *
 * - `createSupabaseServerClient()` — cookie-aware server client used in
 *   Server Components and Server Actions.
 * - `createSupabaseAdminClient()` — admin-capable server client (also cookie
 *   aware) used by the `/admin` surface.
 * - `createSupabaseServiceRoleClient()` — stateless service-role client for
 *   cron jobs, webhooks, or any context without a user session.
 * - `createSupabaseStatelessAdminClient()` — service-role client built
 *   directly with `@supabase/supabase-js` (no cookie plumbing, synchronous).
 *   Distinct from `createSupabaseAdminClient` — kept separate rather than
 *   merged so call sites keep their existing (non-cookie-aware) behavior.
 */
export {
    createClient as createSupabaseServerClient,
    createAdminClient as createSupabaseAdminClient,
    createServiceRoleClient as createSupabaseServiceRoleClient,
} from '@/lib/supabase/server';
export { createAdminClient as createSupabaseStatelessAdminClient } from '@/lib/supabase/admin';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2026-08-26 · Paso B — cerrar las columnas sensibles de `public.profiles`
--
-- ⚠️  NO APLICAR ANTES DE QUE ESTÉ DESPLEGADO EL CÓDIGO DEL PASO A.
--
-- Esta es la mitad que sí rompe. A partir de aquí, `anon` y `authenticated`
-- dejan de poder leer cuatro columnas de `profiles`, incluida la fila propia:
--
--   preferences  favoritos, amistades y ajustes de privacidad de todo el mundo
--   birthdate    fecha de nacimiento
--   role         'user' | 'admin' | 'super_admin'
--   is_banned    estado de moderación
--
-- Por qué por columna y no cerrando la fila: `ReviewsSection` embebe el perfil
-- del autor (`select('*, profiles:user_id (full_name, username, avatar_url)')`)
-- y un embed respeta la RLS de la tabla embebida — con una política de "solo
-- la fila propia" las reseñas se habrían quedado sin autor. Los permisos por
-- columna no tocan ese embed, que solo pide columnas públicas, ni a Watch
-- Party, que pide username y avatar_url.
--
-- ── Requisito: el código ya NO puede tocar esas columnas por PostgREST ──────
-- Todo acceso a `preferences` tiene que ir por las funciones del paso A. Al
-- cierre de esta migración, en el repo son:
--
--   src/server/repositories/user-preferences.ts   → get_my_preferences()
--   src/app/actions/settings.ts                   → get_my_preferences()
--                                                   merge_my_preferences()
--   src/lib/supabase/favorites.ts                 → idem (vía server action)
--   src/app/(platform)/settings/sections/PrivacySection.tsx
--        el export de datos hacía `select('*')`, que se expande a TODAS las
--        columnas y ahora fallaría entero: pasa a lista explícita.
--   src/app/(platform)/profile/page.tsx           → get_my_preferences()
--   src/app/(platform)/profile/[username]/page.tsx→ get_public_profile()
--
-- El panel /admin, el middleware y los cron no se ven afectados: usan la clave
-- service-role (`src/lib/supabase/admin.ts`), o leen columnas públicas.
--
-- ── Comprobación ────────────────────────────────────────────────────────────
-- Con la clave anónima, sin sesión:
--   GET /rest/v1/profiles?select=id,preferences   antes → 200 con 561 filas
--                                                 ahora → 403 permission denied
--   GET /rest/v1/profiles?select=id,username      sigue → 200  (no ha cambiado)
--
-- Para revertir, el bloque `grant` comentado al final.
-- ═══════════════════════════════════════════════════════════════════════════

revoke select (preferences, birthdate, role, is_banned)
    on public.profiles from anon, authenticated;

-- UPDATE también: sin esto, `authenticated` podría seguir escribiendo su
-- columna `preferences` a mano y saltarse la fusión de `merge_my_preferences`,
-- que es lo que evita que un guardado se lleve por delante favoritos y
-- amistades. `role` e `is_banned` ya tenían un trigger que los protege
-- (20251130_security_hardening.sql); esto lo refuerza en la capa de permisos.
revoke update (preferences, birthdate, role, is_banned)
    on public.profiles from anon, authenticated;

-- El dueño sigue editando su perfil visible con la política de siempre.
grant update (username, full_name, avatar_url, bio, updated_at)
    on public.profiles to authenticated;


-- ── Rollback (pegar y ejecutar si algo se rompe) ────────────────────────────
--
-- grant select (preferences, birthdate, role, is_banned)
--     on public.profiles to anon, authenticated;
-- grant update (preferences, birthdate)
--     on public.profiles to authenticated;

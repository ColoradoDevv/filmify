-- ═══════════════════════════════════════════════════════════════════════════
-- 2026-08-26 · Paso B — cerrar las columnas sensibles de `public.profiles`
--
-- ⚠️  NO APLICAR ANTES DE QUE ESTÉ DESPLEGADO EL CÓDIGO DEL PASO A
--     (20260825_privacy_gated_content.sql y el código que llama a sus RPC).
--
-- Esta es la mitad que sí rompe. A partir de aquí, `anon` y `authenticated`
-- dejan de poder leer dos columnas de `profiles`, incluida la fila propia:
--
--   preferences  favoritos, amistades y ajustes de privacidad de todo el mundo
--   birthdate    fecha de nacimiento
--
-- Por qué por columna y no cerrando la fila: `ReviewsSection` embebe el perfil
-- del autor (`select('*, profiles:user_id (full_name, username, avatar_url)')`)
-- y un embed respeta la RLS de la tabla embebida — con una política de "solo
-- la fila propia" las reseñas se habrían quedado sin autor. Los permisos por
-- columna no tocan ese embed, que solo pide columnas públicas, ni a Watch
-- Party, que pide username y avatar_url.
--
-- ── Requisito: el código ya NO puede tocar `preferences` por PostgREST ──────
-- Todo acceso pasa por las funciones del paso A. Al cierre de esta migración,
-- en el repo son:
--
--   src/server/repositories/user-preferences.ts   → get_my_preferences()
--   src/app/actions/settings.ts                   → get_my_preferences()
--                                                   merge_my_preferences()
--   src/lib/supabase/favorites.ts                 → idem (vía server action)
--   src/app/(platform)/profile/page.tsx           → get_my_preferences()
--   src/app/(platform)/profile/[username]/page.tsx→ get_public_profile()
--
-- ── Por qué `role` e `is_banned` NO se revocan ──────────────────────────────
-- La versión anterior de este archivo también los revocaba, dando por hecho
-- que "/admin y el middleware usan la clave service-role". No es cierto:
--
--   src/middleware.ts (~línea 298)   createServerClient + sesión → select('role')
--   src/app/admin/layout.tsx (~l. 28) createSupabaseServerClient → select('role')
--
-- Ambos corren como `authenticated`. Revocar la columna hace fallar el select,
-- y los dos sitios degradan cerrado: redirigen a /browse. Es decir, aplicarlo
-- habría dejado FUERA DE /admin a todo el mundo, super_admin incluido, sin
-- forma de entrar a arreglarlo desde la propia aplicación.
--
-- Esas dos columnas ya están protegidas contra escalada por el trigger de
-- 20251130_security_hardening.sql, que es lo que de verdad importa. Que se
-- pueda leer quién es admin no es la fuga que esta migración viene a cerrar
-- —esa es `preferences`, con los favoritos y las amistades de 561 perfiles—.
--
-- Si más adelante se quieren cerrar igualmente, hay que hacerlo junto a una
-- función `get_my_role()` SECURITY DEFINER y cambiar esos dos llamadores; no
-- basta con revocar.
--
-- ── Comprobación ────────────────────────────────────────────────────────────
-- Con la clave anónima, sin sesión:
--   GET /rest/v1/profiles?select=id,preferences   antes → 200 con 561 filas
--                                                 ahora → 403 permission denied
--   GET /rest/v1/profiles?select=id,username      sigue → 200  (no ha cambiado)
--
-- Y con sesión de admin, /admin tiene que seguir abriéndose.
--
-- Para revertir, el bloque `grant` comentado al final.
-- ═══════════════════════════════════════════════════════════════════════════

revoke select (preferences, birthdate)
    on public.profiles from anon, authenticated;

-- UPDATE de `preferences` también: sin esto, `authenticated` podría seguir
-- escribiendo la columna a mano y saltarse la fusión de
-- `merge_my_preferences`, que es lo que evita que un guardado se lleve por
-- delante favoritos y amistades.
revoke update (preferences)
    on public.profiles from anon, authenticated;

-- El dueño sigue editando su perfil visible con la política de siempre.
--
-- `birthdate` entra en la lista aunque no se pueda leer: la pantalla de
-- ajustes la escribe (ProfileSection → saveSimple('birthdate', …)) y sin este
-- grant guardarla fallaría. Que solo se pueda fijar una vez es hoy una regla
-- de la interfaz; si se quiere garantizar en la base de datos hace falta un
-- trigger, no un permiso.
grant update (username, full_name, avatar_url, bio, birthdate, updated_at)
    on public.profiles to authenticated;


-- ── Rollback (pegar y ejecutar si algo se rompe) ────────────────────────────
--
-- grant select (preferences, birthdate)
--     on public.profiles to anon, authenticated;
-- grant update (preferences)
--     on public.profiles to authenticated;

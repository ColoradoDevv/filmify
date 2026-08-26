-- ═══════════════════════════════════════════════════════════════════════════
-- 2026-08-26 · Paso B — cerrar las columnas sensibles de `public.profiles`
--
-- ⚠️  NO APLICAR ANTES DE QUE ESTÉ DESPLEGADO EL CÓDIGO DEL PASO A
--     (20260825_privacy_gated_content.sql y el código que llama a sus RPC).
--
-- `public.profiles` era legible sin sesión. Comprobado contra la BD con la
-- clave anónima, que viaja en el bundle del navegador y por tanto es pública:
--
--   GET /rest/v1/profiles?select=id,preferences  →  200 con las preferencias
--                                                   de todos los perfiles
--
-- Eso expone, de cualquier usuario: sus favoritos, su grafo social completo
-- (friends, incomingFriendRequests, outgoingFriendRequests) y sus propios
-- ajustes de privacidad. La tabla además expone `birthdate`.
--
-- ── Por qué un `revoke` por columna NO sirve ────────────────────────────────
--
-- La primera versión de este archivo hacía:
--
--   revoke select (preferences, birthdate) on public.profiles from anon, ...;
--
-- y Postgres la aceptó sin error… sin hacer nada. `anon` y `authenticated`
-- tenían SELECT y UPDATE a nivel de TABLA, y un permiso de tabla no se puede
-- recortar columna a columna: la revocación se ignora en silencio. Tras
-- aplicarla, la consulta anónima de arriba seguía devolviendo 200 filas.
--
-- La forma correcta es quitar el permiso de tabla y volver a concederlo columna
-- a columna, que es lo que hace este archivo. Si alguna vez hay que añadir una
-- columna a `profiles`, recordar que NO será legible hasta que se añada al
-- `grant select` de abajo.
--
-- Solo se tocan SELECT y UPDATE. INSERT y DELETE se dejan intactos para no
-- romper el alta de usuarios ni el borrado de cuenta.
--
-- ── Por qué `role` e `is_banned` SÍ se conceden ─────────────────────────────
--
--   src/middleware.ts (~línea 298)    createServerClient + sesión → select('role')
--   src/app/admin/layout.tsx (~l. 28) createSupabaseServerClient → select('role')
--
-- Ambos corren como `authenticated` y degradan CERRADO: si el select falla,
-- redirigen a /browse. Dejarlos fuera del grant deja a todo el mundo fuera de
-- /admin, super_admin incluido, y sin forma de arreglarlo desde la aplicación.
-- La escalada de privilegios ya la bloquea el trigger de
-- 20251130_security_hardening.sql, que es lo que de verdad importa.
--
-- ── Comprobación ────────────────────────────────────────────────────────────
-- Con la clave anónima, sin sesión:
--   GET /rest/v1/profiles?select=id,preferences   → 42501 permission denied
--   GET /rest/v1/profiles?select=id,birthdate     → 42501 permission denied
--   GET /rest/v1/profiles?select=id,username      → 200  (no ha cambiado)
--   GET /rest/v1/profiles?select=id,role          → 200  (lo necesita /admin)
--
-- Y con sesión de admin, /admin tiene que seguir abriéndose.
-- ═══════════════════════════════════════════════════════════════════════════

revoke select, update on public.profiles from anon, authenticated;

-- Lectura: todo menos `preferences` y `birthdate`.
grant select (id, username, full_name, avatar_url, bio, role, is_banned, is_stb, updated_at)
    on public.profiles to anon, authenticated;

-- Escritura: solo el perfil visible, y solo con sesión.
--
-- `preferences` queda fuera a propósito: toda escritura pasa por
-- `merge_my_preferences()`, que fusiona dentro de una transacción y evita que
-- guardar un ajuste se lleve por delante favoritos y amistades.
--
-- `birthdate` entra aunque no se pueda leer: la pantalla de ajustes la escribe
-- (ProfileSection → saveSimple('birthdate', …)). Que solo se pueda fijar una vez
-- es hoy una regla de la interfaz; garantizarlo en la base de datos requeriría
-- un trigger, no un permiso.
grant update (username, full_name, avatar_url, bio, birthdate, updated_at)
    on public.profiles to authenticated;


-- ── Rollback (pegar y ejecutar si algo se rompe) ────────────────────────────
--
-- grant select, update on public.profiles to anon, authenticated;

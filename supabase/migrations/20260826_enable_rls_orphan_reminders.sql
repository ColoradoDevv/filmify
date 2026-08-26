-- ═══════════════════════════════════════════════════════════════════════════
-- 2026-08-26 · RLS en `public.reminders` (tabla huérfana)
--
-- El linter de Supabase la marcó como "RLS Disabled in Public / Critical": está
-- expuesta por PostgREST sin RLS, así que cualquiera con la clave anónima —que
-- viaja en el bundle del navegador y por tanto es pública— podía leerla y
-- escribirla.
--
-- ── No pertenece a FilmiFy ──────────────────────────────────────────────────
--
--   · Ninguna migración de este repositorio la crea.
--   · Su `user_id` es `bigint`; las 7 tablas del proyecto que referencian a un
--     usuario usan `uuid`, porque así son los ids de `auth.users`.
--   · Cero referencias en `src/`.
--   · 0 filas, y `pg_stat` no registra ni una inserción histórica.
--
-- Lo más probable es que venga de una plantilla o de otro proyecto que compartió
-- la base de datos. No confundir con `public.match_reminders`, que sí fue del
-- Mundial 2026 y tiene su propia migración de limpieza.
--
-- ── Por qué activar RLS y no borrarla ───────────────────────────────────────
--
-- Con RLS habilitada y NINGUNA política, Postgres deniega todo a `anon` y
-- `authenticated`: cierra el agujero por completo y es reversible. Borrar la
-- tabla sería lo correcto a medio plazo, pero es irreversible y esa decisión es
-- del dueño de la base de datos, no de una migración de endurecimiento.
--
-- ── Comprobación ────────────────────────────────────────────────────────────
-- Con la clave anónima, sin sesión:
--   GET  /rest/v1/reminders   → []      (RLS sin políticas no deja ver nada)
--   POST /rest/v1/reminders   → 42501   new row violates row-level security
--
-- El guardado con `to_regclass` permite ejecutarla en entornos donde la tabla
-- no existe (cualquiera creado desde este repositorio) sin que falle.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
    if to_regclass('public.reminders') is not null then
        execute 'alter table public.reminders enable row level security';
    end if;
end
$$;


-- ── Rollback (pegar y ejecutar si algo se rompe) ────────────────────────────
--
-- alter table public.reminders disable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2026-07-02: Endurecer delete_user_and_related contra IDOR.
--
-- Problema (crítico): la función es SECURITY DEFINER (ignora RLS) y borra los
-- datos del `user_id` que se le pase por parámetro, SIN comprobar que coincida
-- con el usuario autenticado. Como Postgres concede EXECUTE a PUBLIC por
-- defecto, cualquier cliente (incluso anónimo) podía llamar por PostgREST:
--     supabase.rpc('delete_user_and_related', { user_id: '<uuid-víctima>' })
-- y borrar reseñas, salas, historial, notificaciones y el PERFIL de otra
-- persona.
--
-- Fix:
--   1. Guard dentro de la función: solo el propio usuario (auth.uid()) o un
--      llamador con rol service_role (panel de admin, service-role key) puede
--      borrar. El resto recibe una excepción 42501 (insufficient_privilege).
--   2. Defensa en profundidad: revocar EXECUTE de PUBLIC/anon y concederlo solo
--      a authenticated + service_role.
--
-- El cuerpo de borrado se mantiene idéntico al de 20260613 (versión en
-- producción y verificada) para no alterar el comportamiento funcional.
--
-- NOTA: la versión antigua (20260414) creó la función con el parámetro llamado
-- `p_user_id`. CREATE OR REPLACE no puede renombrar un parámetro de entrada
-- (error 42P13), así que primero eliminamos CUALQUIER firma existente. DROP
-- FUNCTION solo borra la DEFINICIÓN de la función — NO toca ningún dato ni
-- ninguna tabla. Es seguro en producción.
-- ═══════════════════════════════════════════════════════════════════════════

-- Eliminar ambas variantes de nombre de parámetro que pudieran existir.
drop function if exists public.delete_user_and_related(uuid);

create or replace function public.delete_user_and_related(user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Autorización: solo el dueño de la cuenta o un llamador service_role.
  -- auth.uid()  → uuid del usuario autenticado (NULL con service-role key).
  -- auth.jwt()  → claims del JWT; role = 'service_role' para el panel de admin.
  if auth.uid() is distinct from delete_user_and_related.user_id
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'No autorizado para borrar este usuario'
      using errcode = '42501';
  end if;

  delete from public.reviews        where reviews.user_id         = delete_user_and_related.user_id;
  delete from public.party_members  where party_members.user_id   = delete_user_and_related.user_id;
  delete from public.party_messages where party_messages.user_id  = delete_user_and_related.user_id;
  delete from public.parties        where parties.host_id         = delete_user_and_related.user_id;
  delete from public.search_history where search_history.user_id  = delete_user_and_related.user_id;
  delete from public.notifications  where notifications.user_id   = delete_user_and_related.user_id;
  delete from public.profiles       where profiles.id             = delete_user_and_related.user_id;
end;
$$;

-- Quitar el EXECUTE implícito a PUBLIC (incluye anon) y conceder solo a los
-- roles que legítimamente lo usan.
revoke all on function public.delete_user_and_related(uuid) from public;
grant execute on function public.delete_user_and_related(uuid) to authenticated, service_role;

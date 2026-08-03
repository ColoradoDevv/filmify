-- ═══════════════════════════════════════════════════════════════════════════
-- 2026-07-02: friend_action atómico — corrige la race condition de /api/friends.
--
-- Problema: los handlers POST/PATCH hacían read-modify-write del array JSON
-- `preferences` sobre DOS filas de profiles (solicitante + objetivo) con reads
-- y writes separados vía service role. Dos peticiones concurrentes (p. ej. dos
-- personas agregándose a la vez, o accept/cancel rápidos) podían pisarse y
-- perder actualizaciones (lost update).
--
-- Fix: una función SECURITY DEFINER que hace TODO dentro de una sola
-- transacción (cada RPC de PostgREST es su propia transacción), bloqueando
-- ambas filas con SELECT ... FOR UPDATE en orden de uuid determinista
-- (evita deadlocks) antes de leer/escribir.
--
-- Identidad: el solicitante SIEMPRE es auth.uid() (nunca se confía en un
-- parámetro), replicando la semántica del route. La lógica de autorización y
-- las mutaciones son un calco 1:1 de la versión TypeScript.
--
-- Mejora incluida: se conservan las demás claves de `preferences` (tema,
-- privacidad, etc.) usando jsonb_set sobre las claves de amistad, en vez del
-- overwrite del objeto completo que hacía el código anterior (que borraba
-- silenciosamente cualquier otra preferencia).
--
-- NOTA DE DISEÑO — jsonb vs tabla `friendships`:
-- Una tabla dedicada (friendships con constraints únicos) sería un modelo más
-- limpio y con integridad referencial nativa, PERO `preferences.friends` /
-- incoming / outgoing se leen en múltiples páginas de perfil
-- (src/app/(platform)/profile/**). Migrar el modelo obligaría a reescribir a
-- todos esos lectores. Se mantiene el modelo jsonb y se resuelve la atomicidad
-- en la BD, que es el cambio de menor superficie. Reconsiderar la tabla si el
-- grafo social crece.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Helpers de arrays de strings en jsonb ────────────────────────────────────

create or replace function public._jsonb_str_array_add(arr jsonb, val text)
returns jsonb language sql immutable as $$
  select case
    when coalesce(arr, '[]'::jsonb) ? val then coalesce(arr, '[]'::jsonb)
    else coalesce(arr, '[]'::jsonb) || to_jsonb(val)
  end;
$$;

create or replace function public._jsonb_str_array_remove(arr jsonb, val text)
returns jsonb language sql immutable as $$
  select coalesce(
    (
      select jsonb_agg(e)
      from jsonb_array_elements_text(coalesce(arr, '[]'::jsonb)) e
      where e <> val
    ),
    '[]'::jsonb
  );
$$;

-- ── Acción de amistad atómica ────────────────────────────────────────────────
-- p_action ∈ 'send' | 'accept' | 'reject' | 'cancel' | 'remove'
-- Devuelve jsonb { status, message? }. El route mapea status → código HTTP.

create or replace function public.friend_action(p_action text, p_target uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester      uuid := auth.uid();
  v_requester_txt  text;
  v_target_txt     text := p_target::text;
  v_req_prefs      jsonb;
  v_tgt_prefs      jsonb;
  v_allow          boolean;
  v_has_incoming   boolean;
  v_has_outgoing   boolean;
  v_are_friends    boolean;
begin
  -- 1. Identidad: siempre el usuario autenticado.
  if v_requester is null then
    return jsonb_build_object('status', 'not_authenticated');
  end if;
  if p_target is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if v_requester = p_target then
    return jsonb_build_object('status', 'self');
  end if;
  if p_action not in ('send', 'accept', 'reject', 'cancel', 'remove') then
    return jsonb_build_object('status', 'invalid_action');
  end if;

  v_requester_txt := v_requester::text;

  -- 2. Bloqueo de ambas filas en orden de uuid (evita deadlocks entre dos
  --    transacciones que toquen el mismo par en asignaciones opuestas).
  if v_requester < p_target then
    perform 1 from public.profiles where id = v_requester for update;
    perform 1 from public.profiles where id = p_target    for update;
  else
    perform 1 from public.profiles where id = p_target    for update;
    perform 1 from public.profiles where id = v_requester for update;
  end if;

  -- 3. Leer preferencias (ya bloqueadas).
  select coalesce(preferences, '{}'::jsonb) into v_req_prefs
    from public.profiles where id = v_requester;
  if not found then
    return jsonb_build_object('status', 'requester_missing');
  end if;

  select coalesce(preferences, '{}'::jsonb) into v_tgt_prefs
    from public.profiles where id = p_target;
  if not found then
    return jsonb_build_object('status', 'target_missing');
  end if;

  -- Estado de la relación (mismos checks que la versión TS).
  v_has_incoming := coalesce(v_tgt_prefs -> 'incomingFriendRequests', '[]'::jsonb) ? v_requester_txt;
  v_has_outgoing := coalesce(v_req_prefs -> 'outgoingFriendRequests', '[]'::jsonb) ? v_target_txt;
  v_are_friends  := (coalesce(v_tgt_prefs -> 'friends', '[]'::jsonb) ? v_requester_txt)
                 or (coalesce(v_req_prefs -> 'friends', '[]'::jsonb) ? v_target_txt);

  -- 4. Ejecutar la acción.
  if p_action = 'send' then
    v_allow := coalesce((v_tgt_prefs #>> '{privacy,allowFriendRequests}')::boolean, true);
    if not v_allow then
      return jsonb_build_object('status', 'requests_disabled');
    end if;
    if v_are_friends then
      return jsonb_build_object('status', 'already_friends');
    end if;
    if v_has_incoming or v_has_outgoing then
      return jsonb_build_object('status', 'already_sent');
    end if;

    v_tgt_prefs := jsonb_set(v_tgt_prefs, '{incomingFriendRequests}',
      public._jsonb_str_array_add(v_tgt_prefs -> 'incomingFriendRequests', v_requester_txt), true);
    v_req_prefs := jsonb_set(v_req_prefs, '{outgoingFriendRequests}',
      public._jsonb_str_array_add(v_req_prefs -> 'outgoingFriendRequests', v_target_txt), true);

  elsif p_action = 'accept' then
    if not v_has_incoming then
      return jsonb_build_object('status', 'no_incoming');
    end if;
    v_tgt_prefs := jsonb_set(v_tgt_prefs, '{incomingFriendRequests}',
      public._jsonb_str_array_remove(v_tgt_prefs -> 'incomingFriendRequests', v_requester_txt), true);
    v_req_prefs := jsonb_set(v_req_prefs, '{outgoingFriendRequests}',
      public._jsonb_str_array_remove(v_req_prefs -> 'outgoingFriendRequests', v_target_txt), true);
    v_tgt_prefs := jsonb_set(v_tgt_prefs, '{friends}',
      public._jsonb_str_array_add(v_tgt_prefs -> 'friends', v_requester_txt), true);
    v_req_prefs := jsonb_set(v_req_prefs, '{friends}',
      public._jsonb_str_array_add(v_req_prefs -> 'friends', v_target_txt), true);

  elsif p_action = 'reject' then
    if not v_has_incoming then
      return jsonb_build_object('status', 'no_incoming');
    end if;
    v_tgt_prefs := jsonb_set(v_tgt_prefs, '{incomingFriendRequests}',
      public._jsonb_str_array_remove(v_tgt_prefs -> 'incomingFriendRequests', v_requester_txt), true);
    v_req_prefs := jsonb_set(v_req_prefs, '{outgoingFriendRequests}',
      public._jsonb_str_array_remove(v_req_prefs -> 'outgoingFriendRequests', v_target_txt), true);

  elsif p_action = 'cancel' then
    if not v_has_outgoing then
      return jsonb_build_object('status', 'no_outgoing');
    end if;
    v_tgt_prefs := jsonb_set(v_tgt_prefs, '{incomingFriendRequests}',
      public._jsonb_str_array_remove(v_tgt_prefs -> 'incomingFriendRequests', v_requester_txt), true);
    v_req_prefs := jsonb_set(v_req_prefs, '{outgoingFriendRequests}',
      public._jsonb_str_array_remove(v_req_prefs -> 'outgoingFriendRequests', v_target_txt), true);

  elsif p_action = 'remove' then
    v_tgt_prefs := jsonb_set(v_tgt_prefs, '{friends}',
      public._jsonb_str_array_remove(v_tgt_prefs -> 'friends', v_requester_txt), true);
    v_req_prefs := jsonb_set(v_req_prefs, '{friends}',
      public._jsonb_str_array_remove(v_req_prefs -> 'friends', v_target_txt), true);
    v_tgt_prefs := jsonb_set(v_tgt_prefs, '{incomingFriendRequests}',
      public._jsonb_str_array_remove(v_tgt_prefs -> 'incomingFriendRequests', v_requester_txt), true);
    v_req_prefs := jsonb_set(v_req_prefs, '{incomingFriendRequests}',
      public._jsonb_str_array_remove(v_req_prefs -> 'incomingFriendRequests', v_target_txt), true);
    v_tgt_prefs := jsonb_set(v_tgt_prefs, '{outgoingFriendRequests}',
      public._jsonb_str_array_remove(v_tgt_prefs -> 'outgoingFriendRequests', v_requester_txt), true);
    v_req_prefs := jsonb_set(v_req_prefs, '{outgoingFriendRequests}',
      public._jsonb_str_array_remove(v_req_prefs -> 'outgoingFriendRequests', v_target_txt), true);
  end if;

  -- 5. Persistir ambas filas (misma transacción, filas ya bloqueadas).
  update public.profiles set preferences = v_req_prefs where id = v_requester;
  update public.profiles set preferences = v_tgt_prefs where id = p_target;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- Defensa en profundidad: quitar el EXECUTE implícito a PUBLIC (incluye anon).
revoke all on function public.friend_action(text, uuid) from public;
grant execute on function public.friend_action(text, uuid) to authenticated, service_role;

-- Los helpers son internos; no exponerlos por PostgREST a anon.
revoke all on function public._jsonb_str_array_add(jsonb, text) from public;
revoke all on function public._jsonb_str_array_remove(jsonb, text) from public;
grant execute on function public._jsonb_str_array_add(jsonb, text) to authenticated, service_role;
grant execute on function public._jsonb_str_array_remove(jsonb, text) to authenticated, service_role;

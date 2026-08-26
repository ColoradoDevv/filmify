-- ═══════════════════════════════════════════════════════════════════════════
-- 2026-08-25 · Paso A — contenido de perfil con privacidad real (ADITIVA)
--
-- Problema: `public.profiles` es legible sin sesión. Comprobado contra la BD
-- con la clave anónima (que viaja en el bundle del navegador, es pública):
--
--   GET /rest/v1/profiles?select=id,username,preferences  →  200, 561 filas
--
-- Devuelve `preferences` entera, así que cualquiera puede leer, de cualquier
-- usuario: sus favoritos, su grafo social completo (friends,
-- incomingFriendRequests, outgoingFriendRequests) y sus propios ajustes de
-- privacidad. Se verificó al menos un perfil con `publicProfile: false`
-- sirviendo su lista de favoritos a peticiones anónimas. La tabla además
-- expone `birthdate`, `role` e `is_banned`.
--
-- Consecuencia de diseño: los interruptores `showWatchlist` y
-- `showWatchHistory` de /settings NO se pueden implementar en la interfaz.
-- Cualquier filtro en el componente es decorativo mientras el dato salga por
-- PostgREST. El control tiene que vivir aquí.
--
-- ── Esta migración NO rompe nada ───────────────────────────────────────────
-- Solo añade: un helper, una tabla y cuatro funciones. Los permisos de
-- `profiles` se dejan como están; los cierra el paso B, una vez que el código
-- desplegado ya lee de lo que se crea aquí. Así el despliegue no tiene que ser
-- simultáneo y el paso A por sí solo es inocuo.
--
-- El paso B revoca SELECT/UPDATE sobre las COLUMNAS sensibles (`preferences`,
-- `birthdate`, `role`, `is_banned`), no sobre la fila. Se descartó cerrar la
-- tabla a "solo el dueño" porque habría dejado sin autor a las reseñas: el
-- `select('*, profiles:user_id (...)')` de ReviewsSection embebe perfiles
-- ajenos, y un embed respeta la RLS de la tabla embebida. Con permisos por
-- columna ese embed —que solo pide full_name/username/avatar_url— sigue
-- funcionando igual, y Watch Party también.
--
-- Modelo de datos — por qué los favoritos NO se mueven a una tabla:
-- viven en `preferences.favorites` junto a las amistades, y la nota de diseño
-- de 20260702_atomic_friend_action.sql ya decidió conservar el modelo jsonb
-- para no reescribir a todos sus lectores. Una vez cerrada la tabla en el paso
-- B, nadie más que el dueño puede leer esa columna, así que el gate de
-- `showWatchlist` lo aplica `get_public_favorites()` y es real. El historial
-- sí necesita tabla propia: hoy no existe en el servidor, vive únicamente en
-- el localStorage de cada navegador (Zustand).
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Helper de visibilidad ────────────────────────────────────────────────
--
-- Un único sitio donde se decide "¿puede este visitante ver esta sección del
-- perfil de aquel?", para que la tabla del historial, los favoritos y la
-- página de perfil no puedan responder cosas distintas.
--
-- SECURITY DEFINER porque tiene que leer `profiles` de OTRO usuario, que es
-- justo lo que el paso B prohíbe al llamante.

create or replace function public.can_view_profile_section(
    p_owner uuid,
    p_key   text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_viewer  uuid := auth.uid();
    v_prefs   jsonb;
    v_section boolean;
    v_public  boolean;
begin
    if p_owner is null then
        return false;
    end if;

    -- El dueño se ve siempre a sí mismo, con los interruptores como estén.
    if v_viewer is not null and v_viewer = p_owner then
        return true;
    end if;

    -- Solo se aceptan las claves que existen en la interfaz. Un nombre mal
    -- escrito caería en el `coalesce(..., true)` de abajo y abriría la sección
    -- en vez de cerrarla; mejor que reviente aquí.
    if p_key not in ('showWatchlist', 'showWatchHistory') then
        raise exception 'clave de privacidad desconocida: %', p_key;
    end if;

    select coalesce(preferences, '{}'::jsonb)
      into v_prefs
      from public.profiles
     where id = p_owner;

    if not found then
        return false;
    end if;

    -- Ausente = activado: es el valor por defecto de DEFAULT_PREFERENCES en
    -- `src/lib/user-preferences.ts`, y quien nunca abrió /settings no tiene la
    -- clave escrita.
    v_section := coalesce((v_prefs #>> array['privacy', p_key])::boolean, true);
    if not v_section then
        return false;
    end if;

    v_public := coalesce((v_prefs #>> '{privacy,publicProfile}')::boolean, true);
    if v_public then
        return true;
    end if;

    -- Perfil privado: solo amistades. Anónimo no llega aquí nunca.
    if v_viewer is null then
        return false;
    end if;

    return coalesce(v_prefs -> 'friends', '[]'::jsonb) ? v_viewer::text;
end;
$$;

revoke all on function public.can_view_profile_section(uuid, text) from public;
grant execute on function public.can_view_profile_section(uuid, text) to anon, authenticated;


-- ── 2. Historial de visionado ───────────────────────────────────────────────
--
-- Hasta ahora `watched` solo existía en el localStorage de cada navegador
-- (`src/lib/store/useStore.ts`), así que `showWatchHistory` era un interruptor
-- sobre un dato que jamás salía del equipo del usuario.
--
-- `poster_path` se guarda aquí aunque sea denormalizar: `VideoPlayer` sintetiza
-- el item con `poster_path: null` al marcar como visto, así que el arte hay que
-- buscarlo en TMDB de todas formas. Resolverlo al ESCRIBIR es una consulta por
-- título nuevo; resolverlo al leer serían N por cada visita a un perfil, y el
-- Data Cache de Next no se poda solo (ya llenó 11 GB de disco en agosto).
-- Un póster que cambie en TMDB queda viejo aquí: es un precio asumible.

create table if not exists public.watch_history (
    user_id     uuid        not null references auth.users(id) on delete cascade,
    tmdb_id     integer     not null,
    media_type  text        not null check (media_type in ('movie', 'tv')),
    title       text        not null default '',
    poster_path text,
    watched_at  timestamptz not null default now(),
    primary key (user_id, media_type, tmdb_id)
);

-- El único acceso real es "lo último de este usuario".
create index if not exists watch_history_user_recent_idx
    on public.watch_history (user_id, watched_at desc);

alter table public.watch_history enable row level security;

drop policy if exists "watch_history: el dueño lo gestiona" on public.watch_history;
create policy "watch_history: el dueño lo gestiona"
    on public.watch_history
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "watch_history: visible según privacidad" on public.watch_history;
create policy "watch_history: visible según privacidad"
    on public.watch_history
    for select
    using (public.can_view_profile_section(user_id, 'showWatchHistory'));


-- ── 3. Perfil público, ya filtrado ──────────────────────────────────────────
--
-- Devuelve la vista que le corresponde a QUIEN pregunta, calculada en
-- servidor. Sustituye al `select *` que hacía la página, que se traía
-- `preferences` en crudo al navegador y desde ahí decidía qué enseñar — con el
-- objeto completo ya en las manos del visitante.

create or replace function public.get_public_profile(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_viewer   uuid := auth.uid();
    v_row      public.profiles%rowtype;
    v_prefs    jsonb;
    v_own      boolean;
    v_friend   boolean;
    v_public   boolean;
    v_visible  boolean;
begin
    select * into v_row from public.profiles where username = p_username limit 1;
    if not found then
        return null;
    end if;

    v_prefs := coalesce(v_row.preferences, '{}'::jsonb);
    v_own   := v_viewer is not null and v_viewer = v_row.id;

    -- La amistad se comprueba en los dos sentidos: el array puede haber
    -- quedado escrito solo en un lado por las escrituras previas a
    -- `friend_action`.
    v_friend := v_viewer is not null and (
        (coalesce(v_prefs -> 'friends', '[]'::jsonb) ? v_viewer::text)
        or exists (
            select 1 from public.profiles p
             where p.id = v_viewer
               and coalesce(p.preferences -> 'friends', '[]'::jsonb) ? v_row.id::text
        )
    );

    v_public  := coalesce((v_prefs #>> '{privacy,publicProfile}')::boolean, true);
    v_visible := v_own or v_public or v_friend;

    return jsonb_build_object(
        'id',                    v_row.id,
        'username',              v_row.username,
        'full_name',             v_row.full_name,
        'avatar_url',            v_row.avatar_url,
        -- La biografía es contenido del perfil: si está privado, no se enseña.
        'bio',                   case when v_visible then v_row.bio else null end,
        'is_own',                v_own,
        'is_friend',             v_friend,
        'public_profile',        v_public,
        'visible',               v_visible,
        'allow_friend_requests', coalesce((v_prefs #>> '{privacy,allowFriendRequests}')::boolean, true),
        'show_watchlist',        coalesce((v_prefs #>> '{privacy,showWatchlist}')::boolean, true),
        'show_watch_history',    coalesce((v_prefs #>> '{privacy,showWatchHistory}')::boolean, true),
        'has_incoming_request',  v_viewer is not null
                                 and (coalesce(v_prefs -> 'incomingFriendRequests', '[]'::jsonb) ? v_viewer::text),
        'has_outgoing_request',  v_viewer is not null and exists (
            select 1 from public.profiles p
             where p.id = v_viewer
               and coalesce(p.preferences -> 'outgoingFriendRequests', '[]'::jsonb) ? v_row.id::text
        )
    );
end;
$$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;


-- ── 4. Favoritos de otro usuario, con el gate de showWatchlist ──────────────
--
-- Único camino por el que los favoritos de un tercero pueden salir de la base
-- de datos una vez cerrada `profiles`. Devuelve la forma mínima que necesita
-- una tarjeta; el resto del objeto de TMDB que hay guardado en el jsonb
-- (credits, videos, budget…) no tiene por qué viajar.

create or replace function public.get_public_favorites(
    p_owner uuid,
    p_limit integer default 12
)
returns table (
    tmdb_id     integer,
    title       text,
    poster_path text,
    media_type  text
)
language sql
stable
security definer
set search_path = public
as $$
    select fav_id, fav_title, fav_poster, fav_media
      from (
          select
              -- CASE y no un cast a secas: el WHERE de fuera no está garantizado
              -- que se evalúe antes, y un `id` no numérico tumbaría la consulta.
              case when (elem ->> 'id') ~ '^[0-9]+$'
                   then (elem ->> 'id')::integer end            as fav_id,
              coalesce(elem ->> 'title', elem ->> 'name', '')   as fav_title,
              elem ->> 'poster_path'                            as fav_poster,
              -- El jsonb guarda objetos de TMDB tal cual: las series traen
              -- `name` y las películas `title`.
              case when (elem ? 'name') and not (elem ? 'title')
                   then 'tv' else 'movie' end                   as fav_media
            from public.profiles p
            cross join lateral jsonb_array_elements(
                case when jsonb_typeof(p.preferences -> 'favorites') = 'array'
                     then p.preferences -> 'favorites'
                     else '[]'::jsonb end
            ) as elem
           where p.id = p_owner
             and public.can_view_profile_section(p_owner, 'showWatchlist')
      ) as fav
     where fav_id is not null
     limit greatest(1, least(coalesce(p_limit, 12), 60));
$$;

revoke all on function public.get_public_favorites(uuid, integer) from public;
grant execute on function public.get_public_favorites(uuid, integer) to anon, authenticated;


-- ── 5. Preferencias propias, sin tocar la columna directamente ──────────────
--
-- El paso B revoca SELECT y UPDATE sobre `profiles.preferences` para `anon` y
-- `authenticated`. Los permisos por columna son del ROL, no de la fila, así
-- que revocarlos también deja fuera al dueño: estas dos funciones son el
-- camino que le queda.
--
-- La escritura es un leer-fusionar-guardar y se hace aquí dentro, en una sola
-- transacción y con la fila bloqueada. Antes vivía en TypeScript
-- (`patchUserPreferences`, y antes aún repartida por cada sección de ajustes)
-- y dos pestañas abiertas podían pisarse: la última en guardar revertía lo que
-- la otra acababa de cambiar. Mismo problema, y misma solución, que
-- `friend_action` en 20260702.

create or replace function public.get_my_preferences()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(preferences, '{}'::jsonb)
      from public.profiles
     where id = auth.uid();
$$;

revoke all on function public.get_my_preferences() from public;
grant execute on function public.get_my_preferences() to authenticated;


-- `p_patch` se fusiona a primer nivel: las claves que trae sustituyen a las
-- suyas, y las que NO trae se conservan. Es lo que impide que guardar un
-- interruptor de /settings se lleve por delante `favorites` o `friends`, que
-- viven en esta misma columna.
create or replace function public.merge_my_preferences(p_patch jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
    v_user  uuid := auth.uid();
    v_prefs jsonb;
begin
    if v_user is null then
        raise exception 'sesión no iniciada';
    end if;

    if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
        raise exception 'el parche tiene que ser un objeto';
    end if;

    -- FOR UPDATE: sin el bloqueo, dos guardados simultáneos leerían el mismo
    -- estado de partida y el segundo escribiría encima del primero.
    select coalesce(preferences, '{}'::jsonb)
      into v_prefs
      from public.profiles
     where id = v_user
       for update;

    if not found then
        raise exception 'el perfil no existe';
    end if;

    -- Fusión a primer nivel: las claves de `p_patch` sustituyen a las suyas y
    -- las que no vienen se quedan como están. Quien llama manda SOLO los grupos
    -- que toca, justamente para que esto no pise nada más.
    v_prefs := v_prefs || p_patch;

    -- `reducedMotion` y `adultContent` colgaban de la raíz antes de que
    -- existiera el grupo `playback`. `normalizePreferences` los sigue leyendo de
    -- ahí para que nadie pierda su ajuste al desplegar, pero una vez migrados
    -- sobran: un `||` no borra claves, así que se quitan aquí. Sin esto habría
    -- dos sitios donde mirar el mismo ajuste, y el viejo ganaría en cuanto
    -- alguien leyera de él por error.
    v_prefs := v_prefs - 'reducedMotion' - 'adultContent';

    update public.profiles
       set preferences = v_prefs,
           updated_at  = now()
     where id = v_user;

    return v_prefs;
end;
$$;

revoke all on function public.merge_my_preferences(jsonb) from public;
grant execute on function public.merge_my_preferences(jsonb) to authenticated;

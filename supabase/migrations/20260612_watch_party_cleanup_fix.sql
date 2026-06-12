-- ═══════════════════════════════════════════════════════════════════════════
-- Watch Party — limpieza robusta de salas muertas y miembros fantasma.
--
-- Problema observado (2026-06-12): salas de 12h seguían apareciendo "En vivo"
-- con miembros "fantasma" — filas de party_members de gente que cerró la
-- pestaña sin pulsar "Salir". La función antigua solo borraba salas SIN filas
-- de miembros, cosa que nunca ocurría, así que nada se limpiaba nunca.
--
-- Nueva lógica, basada en actividad real (online_at = heartbeat):
--   1. Purga miembros cuyo último heartbeat es > PRESENCE_TIMEOUT (2 min):
--      están desconectados aunque su fila siga ahí.
--   2. Finaliza salas sin ningún miembro activo y con cierta antigüedad.
--   3. Borra salas finalizadas viejas y salas vacías huérfanas.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_inactive_parties()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1) Purgar miembros fantasma: sin heartbeat en los últimos 2 minutos.
    --    El cliente late cada 20s; 2 min tolera reconexiones y latencia.
    DELETE FROM public.party_members
    WHERE online_at IS NULL
       OR online_at < (now() - interval '2 minutes');

    -- 2) Finalizar salas que se quedaron sin miembros activos.
    --    Se da un margen de 1 min desde la creación para no matar una sala
    --    recién creada cuyo host aún no ha enviado su primer heartbeat.
    UPDATE public.parties p
    SET status = 'finished',
        ended_at = now()
    WHERE p.status <> 'finished'
      AND p.created_at < (now() - interval '1 minute')
      AND NOT EXISTS (
          SELECT 1 FROM public.party_members pm WHERE pm.party_id = p.id
      );

    -- 3) Borrar salas finalizadas con más de 1 hora (libera código de sala).
    DELETE FROM public.parties
    WHERE status = 'finished'
      AND COALESCE(ended_at, created_at) < (now() - interval '1 hour');

    -- 4) Red de seguridad: borrar cualquier sala sin miembros con > 2h de vida,
    --    aunque su status quedara inconsistente.
    DELETE FROM public.parties p
    WHERE p.created_at < (now() - interval '2 hours')
      AND NOT EXISTS (
          SELECT 1 FROM public.party_members pm WHERE pm.party_id = p.id
      );
END;
$$;

-- Permitir que el cliente anónimo/autenticado dispare la limpieza al abrir el
-- lobby (la función es SECURITY DEFINER, así que corre con permisos elevados
-- pero solo hace su trabajo acotado).
GRANT EXECUTE ON FUNCTION cleanup_inactive_parties() TO anon, authenticated;

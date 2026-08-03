-- ═══════════════════════════════════════════════════════════════════════════
-- Watch Party — endurecimiento OPCIONAL (el código actual funciona sin esto).
-- Ejecutar en el SQL Editor de Supabase cuando se pueda.
--
-- Contexto: la implementación 2026-06 usa Realtime Broadcast+Presence (no
-- requiere DDL) y persiste el estado de reproducción en parties.embed_url.
-- Este script corrige deudas detectadas empíricamente:
--   1. El hash de contraseña de salas privadas es legible por cualquier
--      cliente vía REST (RLS permite SELECT de todas las columnas).
--   2. parties no está en la publicación de Realtime (postgres_changes no
--      emite; por eso el código usa broadcast — esto lo deja arreglado para
--      el futuro de todas formas).
--   3. party_members no tiene política UPDATE (heartbeat va por API con
--      service role; esto permitiría volver al update directo).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Ocultar el hash de contraseña a los clientes (revoca el SELECT de esas
--    columnas para anon/authenticated; el service role no se ve afectado).
REVOKE SELECT (password) ON public.parties FROM anon, authenticated;
-- Columnas legadas de hash, si existen:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'parties' AND column_name = 'password_hash') THEN
        REVOKE SELECT (password_hash) ON public.parties FROM anon, authenticated;
    END IF;
END $$;

-- 2) Reincorporar parties a la publicación de Realtime (hoy no emite eventos).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'parties'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
    END IF;
END $$;

-- 3) Política UPDATE para que cada miembro pueda actualizar su propia fila
--    (heartbeat / is_ready) sin pasar por la API.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'party_members'
          AND policyname = 'Users can update themselves'
    ) THEN
        CREATE POLICY "Users can update themselves"
            ON public.party_members FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 4) Estado 'paused' en el constraint de status, por si en el futuro se
--    quiere mapear la pausa al ciclo de vida visible de la sala.
ALTER TABLE public.parties DROP CONSTRAINT IF EXISTS parties_status_check;
ALTER TABLE public.parties ADD CONSTRAINT parties_status_check
    CHECK (status IN ('waiting', 'counting', 'playing', 'paused', 'finished'));

-- Asegurar que Realtime está habilitado para party_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'party_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.party_members;
  END IF;
END
$$;

-- Configurar REPLICA IDENTITY a FULL para recibir todos los datos en eventos DELETE
ALTER TABLE public.party_members REPLICA IDENTITY FULL;

-- Add columns for SuperEmbed integration
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS imdb_id text;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS player_mode text DEFAULT 'trailer' CHECK (player_mode IN ('trailer', 'movie'));
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS embed_url text;

-- Ensure other columns exist (in case previous migrations were not run)
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS name text DEFAULT 'Sala de Cine';
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS room_code text;

-- Add unique constraint to room_code if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parties_room_code_key') THEN
        ALTER TABLE public.parties ADD CONSTRAINT parties_room_code_key UNIQUE (room_code);
    END IF;
END $$;

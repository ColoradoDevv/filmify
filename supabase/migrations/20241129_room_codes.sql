-- Add room_code column to parties table
ALTER TABLE public.parties ADD COLUMN room_code TEXT UNIQUE;

-- Update existing rows with a random code (using id hash for simplicity)
UPDATE public.parties 
SET room_code = upper(substring(md5(id::text) from 1 for 6)) 
WHERE room_code IS NULL;

-- Make it not null
ALTER TABLE public.parties ALTER COLUMN room_code SET NOT NULL;

-- Drop the existing check constraint
ALTER TABLE public.parties DROP CONSTRAINT IF EXISTS parties_status_check;

-- Add the new check constraint with 'finished' status
ALTER TABLE public.parties ADD CONSTRAINT parties_status_check 
  CHECK (status IN ('waiting', 'counting', 'playing', 'finished'));

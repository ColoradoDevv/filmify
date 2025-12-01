-- Add language column for Vidsrc integration
ALTER TABLE parties 
ADD COLUMN IF NOT EXISTS language text DEFAULT 'es';

-- Add comment
COMMENT ON COLUMN parties.language IS 'Audio language preference: es or en';

-- Add columns for Vidsrc integration
ALTER TABLE parties 
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'movie',
ADD COLUMN IF NOT EXISTS imdb_id text,
ADD COLUMN IF NOT EXISTS season integer,
ADD COLUMN IF NOT EXISTS episode integer;

-- Add comment
COMMENT ON COLUMN parties.media_type IS 'Type of media: movie or tv';
COMMENT ON COLUMN parties.imdb_id IS 'IMDB ID for Vidsrc integration';
COMMENT ON COLUMN parties.season IS 'Current season number for TV shows';
COMMENT ON COLUMN parties.episode IS 'Current episode number for TV shows';

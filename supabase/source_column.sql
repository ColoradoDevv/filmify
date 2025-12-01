-- Add source column to parties table
ALTER TABLE parties 
ADD COLUMN IF NOT EXISTS source text;

-- Comment on column
COMMENT ON COLUMN parties.source IS 'The specific streaming source selected by the host (e.g., vidsrc.me, autoembed.cc)';

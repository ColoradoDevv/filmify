-- Add new columns to parties table
ALTER TABLE public.parties 
ADD COLUMN name text NOT NULL DEFAULT 'Sala de Cine',
ADD COLUMN is_private boolean NOT NULL DEFAULT false,
ADD COLUMN password text NULL;

-- Update the default value for name to be dynamic based on user is tricky in SQL default, 
-- so we'll handle the "Sala de [User]" logic in the application layer or a trigger if needed.
-- For now, a generic default is fine, or we can leave it without default if we always supply it.
-- Let's stick to a safe default.

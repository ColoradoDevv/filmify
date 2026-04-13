-- SQL to add missing columns to the profiles table
-- Run this in your Supabase SQL Editor

-- Add bio column if it doesn't exist
alter table public.profiles add column if not exists bio text;

-- Add birthdate column if it doesn't exist
alter table public.profiles add column if not exists birthdate text;

-- Add preferences column if it doesn't exist
alter table public.profiles add column if not exists preferences jsonb default '{}'::jsonb;

-- Notify PostgREST to reload schema cache (optional, usually happens automatically)
notify pgrst, 'reload schema';

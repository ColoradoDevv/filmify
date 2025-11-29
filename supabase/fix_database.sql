-- 1. Create profiles table if it doesn't exist
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  website text,
  constraint username_length check (char_length(username) >= 3)
);

-- 1.1 Ensure columns exist (in case table existed but was different)
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;

-- 2. Enable RLS on profiles
alter table public.profiles enable row level security;

-- 3. Create policies for profiles
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Public profiles are viewable by everyone.') then
    create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can insert their own profile.') then
    create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can update own profile.') then
    create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);
  end if;
end $$;

-- 4. Create function and trigger for new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update
  set full_name = excluded.full_name,
      avatar_url = excluded.avatar_url;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger first to avoid error if it exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =================================================================
-- NEW STEP: Backfill profiles from existing auth.users
-- This fixes the "violates foreign key constraint" error by ensuring
-- all current users have a profile before we link reviews to them.
-- =================================================================
insert into public.profiles (id, full_name, avatar_url)
select 
  id, 
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do update
set full_name = excluded.full_name,
    avatar_url = excluded.avatar_url;

-- 5. Create reviews table if it doesn't exist
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  rating integer not null check (rating >= 1 and rating <= 10),
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Ensure reviews references profiles (fix for existing table)
do $$
begin
  -- Check if the constraint exists or if we need to add it.
  
  if exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'reviews_user_id_fkey' and table_name = 'reviews'
  ) then
    -- If it exists, we drop it to recreate it correctly pointing to profiles
    alter table public.reviews drop constraint reviews_user_id_fkey;
  end if;

  -- CRITICAL: Delete orphaned reviews that point to users who don't exist in profiles
  -- (This handles cases where a user might have been deleted from auth.users but their reviews remained)
  delete from public.reviews 
  where user_id not in (select id from public.profiles);

  -- Add the constraint
  alter table public.reviews
  add constraint reviews_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;
end $$;

-- 7. Enable RLS on reviews
alter table public.reviews enable row level security;

-- 8. Create policies for reviews
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'reviews' and policyname = 'Reviews are viewable by everyone.') then
    create policy "Reviews are viewable by everyone." on public.reviews for select using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'reviews' and policyname = 'Users can insert their own reviews.') then
    create policy "Users can insert their own reviews." on public.reviews for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'reviews' and policyname = 'Users can update their own reviews.') then
    create policy "Users can update their own reviews." on public.reviews for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'reviews' and policyname = 'Users can delete their own reviews.') then
    create policy "Users can delete their own reviews." on public.reviews for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 9. Create indexes
create index if not exists reviews_media_id_type_idx on public.reviews (media_id, media_type);
create index if not exists reviews_user_id_idx on public.reviews (user_id);

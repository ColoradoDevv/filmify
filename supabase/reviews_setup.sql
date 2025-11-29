-- Create reviews table
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  media_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  rating integer not null check (rating >= 1 and rating <= 10),
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.reviews enable row level security;

-- Create policies
create policy "Reviews are viewable by everyone."
  on public.reviews for select
  using ( true );

create policy "Users can insert their own reviews."
  on public.reviews for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own reviews."
  on public.reviews for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own reviews."
  on public.reviews for delete
  using ( auth.uid() = user_id );

-- Create indexes for faster queries
create index if not exists reviews_media_id_type_idx on public.reviews (media_id, media_type);
create index if not exists reviews_user_id_idx on public.reviews (user_id);

-- Add profile information helper view (optional but helpful for joining)
-- We'll handle the join in the frontend query for now to keep it simple

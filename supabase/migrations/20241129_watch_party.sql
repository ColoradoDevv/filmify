-- Create the parties table
create table public.parties (
  id uuid not null default gen_random_uuid (),
  tmdb_id integer not null,
  title text not null,
  poster_path text null,
  host_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'waiting'::text check (status in ('waiting', 'counting', 'playing')),
  created_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone null,
  constraint parties_pkey primary key (id)
);

-- Enable Row Level Security
alter table public.parties enable row level security;

-- Create policies
-- Allow anyone to read parties (so they can join)
create policy "Anyone can view parties" on public.parties
  for select
  using (true);

-- Allow authenticated users to create parties
create policy "Authenticated users can create parties" on public.parties
  for insert
  to authenticated
  with check (auth.uid() = host_id);

-- Allow the host to update their party (e.g., change status)
create policy "Host can update their party" on public.parties
  for update
  using (auth.uid() = host_id);

-- Enable Realtime for the parties table
alter publication supabase_realtime add table public.parties;

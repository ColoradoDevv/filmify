-- Create party_members table to track active members
create table public.party_members (
  id uuid not null default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (id),
  unique(party_id, user_id)
);

-- Enable RLS
alter table public.party_members enable row level security;

-- Policies
create policy "Anyone can view party members"
  on public.party_members for select
  using (true);

create policy "Users can insert themselves"
  on public.party_members for insert
  with check (auth.uid() = user_id);

create policy "Users can delete themselves"
  on public.party_members for delete
  using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table public.party_members;

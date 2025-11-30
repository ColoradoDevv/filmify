create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  message text not null,
  start_at timestamptz default now(),
  end_at timestamptz,
  is_active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.announcements enable row level security;

-- Policies
create policy "Public read access"
  on public.announcements for select
  using (true);

create policy "Admins can insert"
  on public.announcements for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can update"
  on public.announcements for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

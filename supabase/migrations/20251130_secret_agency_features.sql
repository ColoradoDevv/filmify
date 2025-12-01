-- Audit Logs Table
create table if not exists admin_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references auth.users(id) not null,
  action text not null,
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Content Blacklist Table
create table if not exists content_blacklist (
  id uuid default gen_random_uuid() primary key,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tmdb_id, media_type)
);

-- IP Bans Table
create table if not exists ip_bans (
  id uuid default gen_random_uuid() primary key,
  ip_address text not null unique,
  reason text,
  banned_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies

-- Admin Logs
alter table admin_logs enable row level security;

create policy "Admins can view all logs"
  on admin_logs for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Admins can insert logs"
  on admin_logs for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

-- Content Blacklist
alter table content_blacklist enable row level security;

create policy "Anyone can read blacklist"
  on content_blacklist for select
  using (true);

create policy "Admins can manage blacklist"
  on content_blacklist for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

-- IP Bans
alter table ip_bans enable row level security;

create policy "Admins can view ip bans"
  on ip_bans for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Admins can manage ip bans"
  on ip_bans for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

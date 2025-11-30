-- Secure Profiles RLS
-- Prevent users from updating their own role or other sensitive fields

-- 1. Drop existing update policy
drop policy if exists "Users can update own profile." on public.profiles;

-- 2. Create stricter update policy
-- Only allow updating specific columns: full_name, avatar_url, website, username
create policy "Users can update own profile details"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Note: Supabase/Postgres RLS 'with check' applies to the new row state.
    -- However, standard RLS doesn't easily filter COLUMNS without triggers or separate roles.
    -- BUT, we can use a Trigger to enforce column immutability for 'role'.
  );

-- 3. Create a trigger to protect the 'role' column
create or replace function public.protect_role_column()
returns trigger as $$
begin
  -- If the role is being changed
  if new.role is distinct from old.role then
    -- Allow if the user is a service_role (admin) - checking via current_setting or similar if possible,
    -- but for now, let's just say ONLY admins can change roles via a separate function or if they are super_admin.
    -- Actually, simpler: Regular users (authenticated) should NEVER be able to change role via direct update.
    if auth.role() = 'authenticated' then
        -- Check if the user is trying to change their own role
        if new.role <> old.role then
            raise exception 'You are not allowed to change your role.';
        end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row
  execute procedure public.protect_role_column();

-- 4. Ensure 'role' column exists and defaults to 'user'
alter table public.profiles add column if not exists role text default 'user';

-- 5. Secure Admin Logs (Append Only)
-- Ensure no one can UPDATE or DELETE logs, only INSERT (by system/admin actions) and SELECT (by admins)
drop policy if exists "Admins can insert logs" on admin_logs;
drop policy if exists "Admins can view all logs" on admin_logs;

create policy "Admins can view all logs"
  on admin_logs for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

-- Only allow inserts, NO updates or deletes for anyone via API
create policy "System/Admins can insert logs"
  on admin_logs for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

-- Explicitly deny update/delete (implicit in RLS if no policy exists, but good to be sure)
-- No update/delete policies created = denied by default.

-- 6. Rate Limiting Table
create table if not exists rate_limits (
  id uuid default gen_random_uuid() primary key,
  ip_address text not null,
  endpoint text not null,
  requests_count integer default 1,
  window_start timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists rate_limits_ip_endpoint_idx on rate_limits (ip_address, endpoint);

-- Cleanup function for rate limits (can be called via cron)
create or replace function cleanup_rate_limits()
returns void as $$
begin
  delete from rate_limits
  where window_start < now() - interval '1 hour';
end;
$$ language plpgsql;

-- Enable RLS on rate_limits (Implicitly denies all public access)
alter table rate_limits enable row level security;
-- No policies added means only Service Role can access it.

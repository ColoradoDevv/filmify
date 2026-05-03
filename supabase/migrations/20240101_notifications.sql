-- Notifications table
-- Run this in your Supabase SQL editor or as a migration.

create table if not exists public.notifications (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    type        text not null check (type in ('newRelease', 'recommendation', 'news', 'system')),
    title       text not null,
    message     text not null default '',
    read        boolean not null default false,
    metadata    jsonb,
    created_at  timestamptz not null default now()
);

-- Index for fast per-user queries (ordered by newest first)
create index if not exists notifications_user_id_created_at_idx
    on public.notifications (user_id, created_at desc);

-- Index for unread count queries
create index if not exists notifications_user_id_read_idx
    on public.notifications (user_id, read)
    where read = false;

-- Auto-expire: delete notifications older than 30 days
-- (run via pg_cron or the cleanup cron job)
-- create extension if not exists pg_cron;
-- select cron.schedule('delete-old-notifications', '0 3 * * *',
--   $$delete from public.notifications where created_at < now() - interval '30 days'$$);

-- Row Level Security
alter table public.notifications enable row level security;

-- Users can only read their own notifications
create policy "Users can read own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
create policy "Users can update own notifications"
    on public.notifications for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Only service role can insert (cron job uses service role key)
-- No INSERT policy for authenticated users — notifications are system-generated.

-- Enable Realtime for this table (run once in Supabase dashboard or here)
alter publication supabase_realtime add table public.notifications;

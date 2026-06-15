-- Match reminders table
create table if not exists public.match_reminders (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users(id) on delete cascade,
    match_id   text not null,
    kickoff    timestamptz not null,
    home_team  text not null,
    away_team  text not null,
    sent       boolean not null default false,
    created_at timestamptz not null default now(),
    unique (user_id, match_id)
);

create index if not exists match_reminders_kickoff_idx
    on public.match_reminders (kickoff) where sent = false;

alter table public.match_reminders enable row level security;

create policy "Users manage own reminders"
    on public.match_reminders for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Allow service role to update sent flag (for cron)
-- Service role bypasses RLS by default — no extra policy needed.

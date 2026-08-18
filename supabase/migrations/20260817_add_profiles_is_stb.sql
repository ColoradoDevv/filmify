-- profiles.is_stb was referenced by the app (portal STB device registration
-- cap, and the /api/cron/notifications daily job) but was never actually
-- added to the schema. The notifications cron has been failing with
-- "column profiles.is_stb does not exist" on every run since 2026-07-27.
--
-- Default false: existing profiles are treated as regular (non-STB)
-- accounts, matching current behavior everywhere except the portal's STB
-- registration cap.
alter table public.profiles
  add column if not exists is_stb boolean not null default false;

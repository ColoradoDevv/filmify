-- The World Cup ("Mundial 2026") feature was removed from the app (its
-- routes/components were deleted earlier, in commit c8eeb9a). This finishes
-- the cleanup on the database side.
--
-- public.match_reminders backed the per-match "remind me" button. Nothing
-- ever wrote to it after that UI was removed, and no cron job reads it
-- (/api/cron/notifications only ever handled newRelease/trending) — it's
-- fully orphaned.
drop table if exists public.match_reminders;

-- Drop any leftover 'matchReminder' notifications (the feature never had a
-- working sender, so this is expected to be a no-op) before tightening the
-- type check back down.
delete from public.notifications where type = 'matchReminder';

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('newRelease', 'recommendation', 'news', 'system'));

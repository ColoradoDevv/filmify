-- Allow 'matchReminder' in the notifications type column
alter table public.notifications
    drop constraint if exists notifications_type_check;

alter table public.notifications
    add constraint notifications_type_check
    check (type in ('newRelease', 'recommendation', 'news', 'system', 'matchReminder'));

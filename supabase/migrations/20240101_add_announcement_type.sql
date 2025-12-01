alter table public.announcements 
add column if not exists type text default 'info';

-- Update existing records to have 'info' type
update public.announcements set type = 'info' where type is null;

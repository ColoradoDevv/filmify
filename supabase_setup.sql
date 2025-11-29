-- Create a new storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Set up access controls for storage.
-- Ensure RLS is enabled on objects (usually is by default, but good to check if you were doing table RLS)
-- Storage policies:

-- 1. Public access to view avatars
create policy "Avatar images are publicly accessible." on storage.objects
  for select using ( bucket_id = 'avatars' );

-- 2. Authenticated users can upload avatars
create policy "Authenticated users can upload an avatar." on storage.objects
  for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- 3. Users can update their own avatars
create policy "Users can update their own avatar." on storage.objects
  for update using ( auth.uid() = owner ) with check ( bucket_id = 'avatars' );

-- 4. Users can delete their own avatars
create policy "Users can delete their own avatar." on storage.objects
  for delete using ( auth.uid() = owner and bucket_id = 'avatars' );

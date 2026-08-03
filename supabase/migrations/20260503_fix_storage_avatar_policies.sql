-- SEC-014: Fix avatar storage policies — restrict operations to the owner's folder.
-- Previously any authenticated user could upload/update/delete any path in the
-- avatars bucket, allowing one user to overwrite another user's avatar.

-- Drop the overly-permissive policies
drop policy if exists "Users can upload their own avatar."  on storage.objects;
drop policy if exists "Users can update their own avatar."  on storage.objects;
drop policy if exists "Users can delete their own avatar."  on storage.objects;

-- Re-create with path enforcement: the first folder segment must equal the user's UUID.
-- Expected path format: <user_id>/<filename>  e.g. "abc123/avatar.jpg"

create policy "Users can upload their own avatar."
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar."
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar."
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

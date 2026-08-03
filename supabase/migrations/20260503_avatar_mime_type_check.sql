-- SEC-033: restrict avatar uploads to safe image MIME types.
-- Without this check, users could upload HTML, SVG with scripts, or
-- executable files disguised as avatars.
-- Supabase Storage exposes the MIME type via storage.objects.metadata->>'mimetype'.

-- Drop and recreate the insert policy with MIME type enforcement.
drop policy if exists "Users can upload their own avatar." on storage.objects;

create policy "Users can upload their own avatar."
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      -- Allow only safe raster image types; explicitly exclude SVG (can contain scripts)
      lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'gif', 'webp', 'avif')
      OR (metadata->>'mimetype') in (
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'
      )
    )
  );

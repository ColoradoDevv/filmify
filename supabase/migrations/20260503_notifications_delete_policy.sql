-- SEC-031: add explicit DELETE policy on notifications table.
-- Without it, if RLS is ever misconfigured or a permissive policy is added
-- by mistake, there is no explicit guard against bulk deletion.
-- Users may only delete their own notifications.

create policy "Users can delete their own notifications."
  on public.notifications for delete
  using ( auth.uid() = user_id );

-- 2026-04-14: Add server-side helper to delete a user and related public records safely.
create or replace function public.delete_user_and_related(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Remove known dependent records that may not be fully covered by FK cascade.
  delete from public.reviews where user_id = p_user_id;
  delete from public.party_members where user_id = p_user_id;
  delete from public.party_messages where user_id = p_user_id;
  delete from public.parties where host_id = p_user_id;
  delete from public.search_history where user_id = p_user_id;
  delete from public.announcements where created_by = p_user_id;
  delete from public.admin_logs where admin_id = p_user_id;
  delete from public.ip_bans where banned_by = p_user_id;

  -- Delete the profile record. If this profile has additional cascades configured,
  -- they will also be handled by Postgres.
  delete from public.profiles where id = p_user_id;
end;
$$;

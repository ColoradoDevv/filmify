-- Crea/actualiza la función con el nombre de parámetro que usa el cliente (user_id, no p_user_id).
create or replace function public.delete_user_and_related(user_id uuid)
returns void language plpgsql security definer as $$
begin
  delete from public.reviews       where reviews.user_id        = delete_user_and_related.user_id;
  delete from public.party_members where party_members.user_id  = delete_user_and_related.user_id;
  delete from public.party_messages where party_messages.user_id = delete_user_and_related.user_id;
  delete from public.parties       where parties.host_id        = delete_user_and_related.user_id;
  delete from public.search_history where search_history.user_id = delete_user_and_related.user_id;
  delete from public.notifications  where notifications.user_id  = delete_user_and_related.user_id;
  delete from public.profiles      where profiles.id            = delete_user_and_related.user_id;
end;
$$;

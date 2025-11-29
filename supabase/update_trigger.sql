-- Update handle_new_user to include username
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'username'
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      avatar_url = excluded.avatar_url,
      username = excluded.username;
  return new;
end;
$$ language plpgsql security definer;

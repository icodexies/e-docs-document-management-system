-- Profile photos: preset artwork or an uploaded image, with a default fallback.
alter table public.profiles
  add column if not exists avatar_url text
  check (avatar_url is null or char_length(avatar_url) <= 1000);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "edocs avatars: manage own folder" on storage.objects;
create policy "edocs avatars: manage own folder"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.is_active_user()
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.is_active_user()
  );

create or replace function public.set_my_avatar(p_url text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint := app_private.my_profile_id();
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
begin
  if v_profile_id is null then
    raise exception 'No E-Docs profile is linked to this account.' using errcode = '42501';
  end if;
  if v_url is not null
     and v_url not like '/images/profiles/%'
     and v_url not like '%/object/public/avatars/%' then
    raise exception 'That image address is not allowed.';
  end if;

  update public.profiles
  set avatar_url = v_url
  where id = v_profile_id;

  return jsonb_build_object('avatar_url', v_url);
end $$;

revoke all on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;

notify pgrst, 'reload schema';

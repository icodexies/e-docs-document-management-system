-- Record when a signer opens a request so the uploader can see who has viewed
-- the document, not just whether the signatory is still pending.
alter table public.document_signatories
  add column if not exists viewed_at timestamptz;

create or replace function public.mark_document_viewed(p_signatory_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sig public.document_signatories;
  v_profile_id bigint := app_private.my_profile_id();
  v_actor_name text;
begin
  if not app_private.is_active_user() then
    raise exception 'Your account is inactive.' using errcode = '42501';
  end if;

  select full_name into v_actor_name
  from public.profiles
  where id = v_profile_id;

  select * into v_sig
  from public.document_signatories
  where id = p_signatory_id
  for update;

  if not found then
    raise exception 'Signature request not found.';
  end if;
  if v_sig.profile_id <> v_profile_id then
    raise exception 'This request is not yours.' using errcode = '42501';
  end if;

  if v_sig.status = 'pending' then
    update public.document_signatories
    set status = 'viewed',
        viewed_at = coalesce(viewed_at, now()),
        updated_at = now()
    where id = v_sig.id;

    insert into public.document_events (document_id, actor_profile_id, actor_name, action)
    values (v_sig.document_id, v_profile_id, coalesce(v_actor_name, ''), 'viewed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', case when v_sig.status = 'pending' then 'viewed' else v_sig.status end
  );
end $$;

revoke all on function public.mark_document_viewed(uuid) from public, anon;
grant execute on function public.mark_document_viewed(uuid) to authenticated;

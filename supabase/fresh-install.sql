-- ============================================================================
-- E-Docs — one-paste fresh install
--
-- WARNING: DESTRUCTIVE. This drops the previous failed build's public tables
-- and text-matching extensions, then creates the E-Docs schema and reinstalls
-- the extensions in `extensions`. Run it once in the Supabase SQL Editor.
--
-- It does NOT delete auth users or Storage files by default. See reset.sql
-- for the optional blocks.
--
-- Generated from:
--   supabase/reset.sql
--   supabase/migrations/20261027090000_init_edocs.sql
-- ============================================================================
-- ============================================================================
-- E-Docs â€” one-time reset of the failed previous build
--
-- WHAT THIS DOES
--   Drops every table, view, sequence, function and type in `public`, drops
--   the `app_private` helper schema, removes custom storage policies, and
--   removes the three text-matching extensions (the migration installs them
--   in the standard `extensions` schema). It does NOT touch `auth.users`,
--   `auth` data, or Supabase internals.
--
-- WHEN TO RUN
--   ONCE, in the Supabase dashboard â†’ SQL Editor, before applying the new
--   migration. This is destructive by design: the previous E-Docs tables are
--   being discarded.
--
-- WHAT IT DOES NOT DO
--   â€¢ It does not delete auth users. If you want a completely blank project,
--     uncomment the optional auth cleanup at the bottom (this deletes every
--     login account).
--   â€¢ It does not remove the old files from Storage. Review Storage in the
--     dashboard and delete the old buckets there if you want a clean slate.
--
-- AFTER RUNNING
--   Apply `supabase/migrations/20261027090000_init_edocs.sql`.
-- ============================================================================
begin;

-- 1) Storage policies from the failed build. The new migration recreates the
--    three policies E-Docs needs; leaving old policies could grant access to
--    paths the new system does not expect.
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- 2) Views and materialized views first: they may depend on tables.
do $$
declare
  r record;
begin
  for r in select schemaname, viewname from pg_views where schemaname = 'public'
  loop
    execute format('drop view if exists %I.%I cascade', r.schemaname, r.viewname);
  end loop;

  for r in select schemaname, matviewname from pg_matviews where schemaname = 'public'
  loop
    execute format('drop materialized view if exists %I.%I cascade', r.schemaname, r.matviewname);
  end loop;
end $$;

-- 3) Tables (ordinary and partitioned). `spatial_ref_sys` and extension-owned
--    relations are left alone so PostGIS/extension data is not damaged.
do $$
declare
  r record;
begin
  for r in
    select c.oid, n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname <> 'spatial_ref_sys'
      and not exists (
        select 1 from pg_depend d
        where d.objid = c.oid and d.deptype = 'e'
      )
  loop
    execute format('drop table if exists %I.%I cascade', r.nspname, r.relname);
  end loop;
end $$;

-- 4) Standalone sequences left behind by dropped tables.
do $$
declare
  r record;
begin
  for r in
    select c.oid, n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
      and not exists (
        select 1 from pg_depend d
        where d.objid = c.oid and d.deptype = 'e'
      )
  loop
    execute format('drop sequence if exists %I.%I cascade', r.nspname, r.relname);
  end loop;
end $$;

-- 5) Functions, procedures and aggregates in public.
do $$
declare
  r record;
  v_args text;
begin
  for r in
    select p.oid, n.nspname, p.proname, p.prokind,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    v_args := coalesce(r.args, '');
    if r.prokind = 'a' then
      execute format('drop aggregate if exists %I.%I(%s) cascade', r.nspname, r.proname, v_args);
    elsif r.prokind = 'p' then
      execute format('drop procedure if exists %I.%I(%s) cascade', r.nspname, r.proname, v_args);
    else
      execute format('drop function if exists %I.%I(%s) cascade', r.nspname, r.proname, v_args);
    end if;
  end loop;
end $$;

-- 6) Enums, composites and domains. Table row types are gone with the tables.
do $$
declare
  r record;
begin
  for r in
    select t.oid, n.nspname, t.typname, t.typtype
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype in ('e', 'c', 'd')
      and (t.typrelid = 0 or t.typtype = 'd')
      and not exists (
        select 1 from pg_depend d
        where d.objid = t.oid and d.deptype = 'e'
      )
  loop
    if r.typtype = 'd' then
      execute format('drop domain if exists %I.%I cascade', r.nspname, r.typname);
    else
      execute format('drop type if exists %I.%I cascade', r.nspname, r.typname);
    end if;
  end loop;
end $$;

-- 7) The old private helper schema (and anything still attached to it).
drop schema if exists app_private cascade;

-- 8) Remove the text-matching extensions so the migration can install them in
--    the `extensions` schema. Supabase projects normally keep them there; this
--    also handles a failed build that installed them in `public`.
drop extension if exists unaccent cascade;
drop extension if exists pg_trgm cascade;
drop extension if exists fuzzystrmatch cascade;

-- 9) OPTIONAL â€” delete every auth user from the failed build.
--    This removes every login account and cascades to profiles. Uncomment
--    only if you want a completely blank project. You will need to recreate
--    your own account in Authentication â†’ Users.
--
-- delete from auth.users;

-- 10) OPTIONAL â€” remove old Storage buckets from the failed build.
--     Review the bucket list first in Storage. This deletes bucket metadata;
--     if the dashboard still shows files, delete the buckets there as well.
--
-- delete from storage.buckets;

-- 11) Tell PostgREST to forget the old schema.
notify pgrst, 'reload schema';

commit;


-- ============================================================================
-- E-Docs â€” initial schema
--
-- Apply AFTER `supabase/reset.sql` has removed the previous failed build.
--
-- What this file creates:
--   1. Extensions + private helpers (name normalization, roles, access checks)
--   2. profiles          one row per auth user, with a private signature path
--   3. documents         uploaded PDFs and their lifecycle
--   4. document_signatories  detected name + matched account + signature box
--   5. document_versions signed PDF copies (immutable history)
--   6. document_events   append-only audit trail
--   7. Storage buckets   documents / signatures / signed-documents (all private)
--   8. RPCs              matching, finalize, sign-claim, decline, void, admin
--
-- Name matching (the core rule):
--   A detected printed name is compared with every active profile using
--   Levenshtein distance on the normalized name, Levenshtein distance on the
--   token-sorted name, trigram similarity, and the same comparisons with
--   single-letter middle initials removed. The best score wins. A match is
--   only eligible when the score is >= 0.90.
--
-- The frontend may propose a score, but `finalize_document()` recomputes it
-- server-side and refuses to send below 90%.
-- ============================================================================
begin;

set local search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1) Extensions and private schema
-- ---------------------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;

-- Fail with a useful message if the previous build installed these extensions
-- in another schema. The reset script removes them so this migration can
-- install them in `extensions`.
do $$
begin
  if to_regprocedure('extensions.unaccent(text)') is null
     or to_regprocedure('extensions.similarity(text, text)') is null
     or to_regprocedure('extensions.levenshtein(text, text)') is null then
    raise exception 'E-Docs needs unaccent, pg_trgm and fuzzystrmatch in the extensions schema. Run supabase/reset.sql first, then this migration.';
  end if;
end $$;

create schema if not exists app_private;

-- ---------------------------------------------------------------------------
-- 2) profiles
--    user_id is nullable so a person record could exist before an account,
--    but only rows with a user_id and is_active = true participate in matching.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id bigint generated always as identity primary key,
  user_id uuid unique references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) between 1 and 160),
  name_normalized text not null default '',
  name_sorted text not null default '',
  name_core text not null default '',
  name_core_sorted text not null default '',
  role text not null default 'member' check (role in ('member', 'admin')),
  department text not null default '' check (char_length(department) <= 120),
  "position" text not null default '' check (char_length("position") <= 120),
  signature_path text check (signature_path is null or char_length(signature_path) <= 300),
  signature_updated_at timestamptz,
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_name_trgm_idx
  on public.profiles using gin (name_normalized gin_trgm_ops);
create index profiles_name_core_trgm_idx
  on public.profiles using gin (name_core gin_trgm_ops);
create index profiles_active_name_idx
  on public.profiles (is_active, full_name);

-- Normalize for matching: uppercase, remove accents, punctuation -> spaces.
create or replace function app_private.normalize_name(p_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        upper(extensions.unaccent(coalesce(p_name, ''))),
        '[^[:alnum:]]+', ' ', 'g'
      ),
      '[[:space:]]+', ' ', 'g'
    )
  )
$$;

-- Remove single-letter tokens (middle initials) after normalization.
create or replace function app_private.name_core(p_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        app_private.normalize_name(p_name),
        '\m[A-Z]\M', '', 'g'
      ),
      '[[:space:]]+', ' ', 'g'
    )
  )
$$;

-- Alphabetically sorted tokens, so "Dela Cruz, Juan" and "Juan Dela Cruz"
-- produce the same string.
create or replace function app_private.sort_name_tokens(p_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(string_agg(token, ' ' order by token), '')
  from unnest(string_to_array(app_private.normalize_name(p_name), ' ')) as token
  where token <> ''
$$;

create or replace function app_private.sort_core_tokens(p_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(string_agg(token, ' ' order by token), '')
  from unnest(string_to_array(app_private.name_core(p_name), ' ')) as token
  where token <> ''
$$;

-- Keep the derived name columns correct on every insert/update.
create or replace function app_private.sync_profile_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.full_name := btrim(coalesce(new.full_name, ''));
  if new.full_name = '' then
    new.full_name := 'Unnamed user';
  end if;
  new.name_normalized := app_private.normalize_name(new.full_name);
  new.name_sorted := app_private.sort_name_tokens(new.full_name);
  new.name_core := app_private.name_core(new.full_name);
  new.name_core_sorted := app_private.sort_core_tokens(new.full_name);
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_sync_name
  before insert or update on public.profiles
  for each row execute function app_private.sync_profile_name();

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Auth trigger: every new auth user gets a profile.
--    The email prefix ("juan.dela.cruz") is a useful first guess; the admin or
--    the user can correct the full name later.
-- ---------------------------------------------------------------------------
create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'display_name',
    ''
  ));
  if v_name = '' then
    v_name := split_part(coalesce(new.email, ''), '@', 1);
  end if;

  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(nullif(v_name, ''), 'Unnamed user'))
  on conflict (user_id) do nothing;

  return new;
end $$;

grant usage on schema app_private to supabase_auth_admin;
grant execute on function app_private.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4) Role / active helpers
-- ---------------------------------------------------------------------------
create or replace function app_private.my_profile_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p where p.user_id = auth.uid()
$$;

create or replace function app_private.my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.is_active then p.role else null end
  from public.profiles p
  where p.user_id = auth.uid()
$$;

create or replace function app_private.has_role(variadic roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select app_private.my_role()) = any(roles), false)
$$;

create or replace function app_private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.is_active from public.profiles p where p.user_id = auth.uid()
  ), false)
$$;

-- ---------------------------------------------------------------------------
-- 5) Match score for one specific profile. Used by finalize_document() so a
--    client cannot claim a score that the database did not verify.
-- ---------------------------------------------------------------------------
create or replace function app_private.name_match_score(p_name text, p_profile_id bigint)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select p.id, p.name_normalized, p.name_sorted, p.name_core, p.name_core_sorted
    from public.profiles p
    where p.id = p_profile_id
      and p.is_active
      and p.user_id is not null
  ),
  input as (
    select
      app_private.normalize_name(p_name) as n,
      app_private.sort_name_tokens(p_name) as s,
      app_private.name_core(p_name) as c,
      app_private.sort_core_tokens(p_name) as cs
  )
  select coalesce((
    select greatest(
      case when length(i.n) = 0 or length(t.name_normalized) = 0 then 0
           else 1 - (extensions.levenshtein(t.name_normalized, i.n)::numeric
                     / greatest(length(t.name_normalized), length(i.n)))
      end,
      case when length(i.s) = 0 or length(t.name_sorted) = 0 then 0
           else 1 - (extensions.levenshtein(t.name_sorted, i.s)::numeric
                     / greatest(length(t.name_sorted), length(i.s)))
      end,
      extensions.similarity(t.name_normalized, i.n)::numeric,
      case when length(i.c) = 0 or length(t.name_core) = 0 then 0
           else 1 - (extensions.levenshtein(t.name_core, i.c)::numeric
                     / greatest(length(t.name_core), length(i.c)))
      end,
      case when length(i.cs) = 0 or length(t.name_core_sorted) = 0 then 0
           else 1 - (extensions.levenshtein(t.name_core_sorted, i.cs)::numeric
                     / greatest(length(t.name_core_sorted), length(i.cs)))
      end,
      extensions.similarity(t.name_core, i.c)::numeric
    )
    from target t, input i
  ), 0)::numeric(5,4)
$$;

-- ---------------------------------------------------------------------------
-- 6) documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  owner_profile_id bigint not null default app_private.my_profile_id()
    references public.profiles (id) on delete cascade,
  owner_name text not null default '' check (char_length(owner_name) <= 160),
  title text not null check (char_length(title) between 1 and 160),
  original_path text check (original_path is null or char_length(original_path) <= 300),
  original_sha256 text check (original_sha256 is null or original_sha256 ~ '^[0-9a-f]{64}$'),
  file_name text check (file_name is null or char_length(file_name) <= 255),
  file_size bigint check (file_size is null or (file_size > 0 and file_size <= 26214400)),
  page_count int check (page_count is null or (page_count between 1 and 200)),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'in_progress', 'completed', 'declined', 'void')),
  signing_mode text not null default 'sequential'
    check (signing_mode in ('sequential', 'parallel')),
  current_version int not null default 0 check (current_version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index documents_owner_created_idx
  on public.documents (owner_id, created_at desc, id desc);
create index documents_status_created_idx
  on public.documents (status, created_at desc);

-- Snapshot the owner's display name so a signer can see who sent the document
-- without being able to read the owner's profile row (profiles RLS is tight).
create or replace function app_private.set_document_owner_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.full_name into new.owner_name
  from public.profiles p
  where p.id = new.owner_profile_id;
  new.owner_name := coalesce(new.owner_name, '');
  return new;
end $$;

create trigger documents_set_owner_name
  before insert on public.documents
  for each row execute function app_private.set_document_owner_name();

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function app_private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 7) document_signatories
--    One field per signer per document. The stored match_score is a claim;
--    finalize_document() recomputes it and updates the row.
-- ---------------------------------------------------------------------------
create table public.document_signatories (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  profile_id bigint not null references public.profiles (id) on delete restrict,
  signer_name text not null check (char_length(signer_name) between 1 and 160),
  signer_department text not null default '' check (char_length(signer_department) <= 120),
  signer_position text not null default '' check (char_length(signer_position) <= 120),
  detected_name text not null check (char_length(detected_name) between 1 and 160),
  match_score numeric(5,4) not null check (match_score >= 0.90 and match_score <= 1),
  page_number int not null check (page_number >= 1),
  x numeric(6,5) not null check (x >= 0 and x <= 1),
  y numeric(6,5) not null check (y >= 0 and y <= 1),
  width numeric(6,5) not null check (width > 0 and width <= 1),
  height numeric(6,5) not null check (height > 0 and height <= 1),
  sign_order int not null check (sign_order >= 1),
  status text not null default 'pending'
    check (status in ('pending', 'viewed', 'signing', 'signed', 'declined')),
  viewed_at timestamptz,
  signing_started_at timestamptz,
  signed_at timestamptz,
  decline_reason text check (decline_reason is null or char_length(decline_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, profile_id),
  unique (document_id, sign_order),
  check (x + width <= 1.00000),
  check (y + height <= 1.00000)
);

create index document_signatories_document_order_idx
  on public.document_signatories (document_id, sign_order);
create index document_signatories_profile_status_idx
  on public.document_signatories (profile_id, status, created_at desc);

create trigger document_signatories_touch_updated_at
  before update on public.document_signatories
  for each row execute function app_private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 8) Signed copies and audit trail
-- ---------------------------------------------------------------------------
create table public.document_versions (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents (id) on delete cascade,
  version_number int not null check (version_number >= 1),
  storage_path text not null check (char_length(storage_path) between 1 and 300),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_by_profile_id bigint references public.profiles (id) on delete set null,
  created_by_name text not null default '' check (char_length(created_by_name) <= 160),
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);

create index document_versions_document_idx
  on public.document_versions (document_id, version_number desc);

create table public.document_events (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents (id) on delete cascade,
  actor_profile_id bigint references public.profiles (id) on delete set null,
  actor_name text not null default '' check (char_length(actor_name) <= 160),
  action text not null
    check (action in ('created', 'sent', 'viewed', 'signed', 'declined', 'voided', 'completed')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index document_events_document_idx
  on public.document_events (document_id, created_at desc);

-- Log the draft creation. The client inserts the row; this trigger records it
-- without giving clients write access to the audit table.
create or replace function app_private.log_document_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.document_events (document_id, actor_profile_id, actor_name, action)
  values (new.id, new.owner_profile_id, new.owner_name, 'created');
  return new;
end $$;

create trigger documents_log_created
  after insert on public.documents
  for each row execute function app_private.log_document_created();

-- ---------------------------------------------------------------------------
-- 9) Access helpers (security definer so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------
create or replace function app_private.can_read_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_active_user()
    and exists (
      select 1
      from public.documents d
      where d.id = p_document_id
        and (
          d.owner_id = auth.uid()
          or app_private.has_role('admin')
          or exists (
            select 1
            from public.document_signatories s
            where s.document_id = d.id
              and s.profile_id = app_private.my_profile_id()
          )
        )
    )
$$;

-- Storage path shape:
--   documents/<owner-uuid>/<document-uuid>/original.pdf
--   signed-documents/<owner-uuid>/<document-uuid>/v<n>.pdf
-- The second path segment is the document id.
create or replace function app_private.can_read_document_object(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_doc uuid;
begin
  begin
    v_doc := split_part(p_name, '/', 2)::uuid;
  exception when others then
    return false;
  end;
  return app_private.can_read_document(v_doc);
end $$;

create or replace function app_private.can_write_document_object(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_doc uuid;
begin
  if not app_private.is_active_user() then
    return false;
  end if;
  begin
    v_doc := split_part(p_name, '/', 2)::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1
    from public.documents d
    where d.id = v_doc
      and d.owner_id = auth.uid()
      and d.status = 'draft'
  );
end $$;

-- ---------------------------------------------------------------------------
-- 10) RLS: profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: read own or admin"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or app_private.has_role('admin'));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 11) RLS: documents
-- ---------------------------------------------------------------------------
alter table public.documents enable row level security;

create policy "documents: read accessible"
  on public.documents for select to authenticated
  using (
    app_private.is_active_user()
    and (
      -- Direct owner check keeps INSERT ... RETURNING working. During the
      -- same command, can_read_document() cannot yet see the new row, which
      -- would otherwise make the insert look like an RLS failure.
      owner_id = (select auth.uid())
      or app_private.can_read_document(id)
    )
  );

create policy "documents: insert own draft"
  on public.documents for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and owner_profile_id = app_private.my_profile_id()
    and status = 'draft'
    and app_private.is_active_user()
  );

create policy "documents: update own draft"
  on public.documents for update to authenticated
  using (
    owner_id = (select auth.uid())
    and status = 'draft'
    and app_private.is_active_user()
  )
  with check (
    owner_id = (select auth.uid())
    and status = 'draft'
    and app_private.is_active_user()
  );

create policy "documents: delete own draft"
  on public.documents for delete to authenticated
  using (
    owner_id = (select auth.uid())
    and status = 'draft'
    and app_private.is_active_user()
  );

revoke all on public.documents from anon;
grant select, delete on public.documents to authenticated;
-- Only the fields the upload flow actually writes. Status, owner and version
-- columns stay server-controlled (RPCs / the Edge Function).
grant insert (title, page_count, signing_mode)
  on public.documents to authenticated;
grant update (title, original_path, original_sha256, file_name, file_size, page_count, signing_mode)
  on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- 12) RLS: document_signatories
-- ---------------------------------------------------------------------------
alter table public.document_signatories enable row level security;

create policy "signatories: read accessible"
  on public.document_signatories for select to authenticated
  using (app_private.can_read_document(document_id));

create policy "signatories: insert own draft"
  on public.document_signatories for insert to authenticated
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and d.owner_id = (select auth.uid())
        and d.status = 'draft'
        and app_private.is_active_user()
    )
  );

revoke all on public.document_signatories from anon;
grant select on public.document_signatories to authenticated;
-- The review screen edits locally and inserts only once. Status, signed_at and
-- decline fields are never client-writable; only RPCs/the Edge Function move
-- a signature through its lifecycle.
grant insert (
  document_id, profile_id, signer_name, signer_department, signer_position,
  detected_name, match_score, page_number, x, y, width, height, sign_order
) on public.document_signatories to authenticated;

-- ---------------------------------------------------------------------------
-- 13) RLS: versions and events are read-only for clients.
--     Only security-definer functions / the Edge Function write them.
-- ---------------------------------------------------------------------------
alter table public.document_versions enable row level security;

create policy "versions: read accessible"
  on public.document_versions for select to authenticated
  using (app_private.can_read_document(document_id));

revoke all on public.document_versions from anon, authenticated;
grant select on public.document_versions to authenticated;

alter table public.document_events enable row level security;

create policy "events: read accessible"
  on public.document_events for select to authenticated
  using (app_private.can_read_document(document_id));

revoke all on public.document_events from anon, authenticated;
grant select on public.document_events to authenticated;

-- ---------------------------------------------------------------------------
-- 14) Public RPC: update my profile
-- ---------------------------------------------------------------------------
create or replace function public.update_my_profile(
  p_full_name text,
  p_department text default '',
  p_position text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_full_name, ''));
  v_dept text := btrim(coalesce(p_department, ''));
  v_pos text := btrim(coalesce(p_position, ''));
begin
  if not app_private.is_active_user() then
    raise exception 'Your account is inactive.' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 160 then
    raise exception 'Enter your full name (2-160 characters).';
  end if;
  if char_length(v_dept) > 120 or char_length(v_pos) > 120 then
    raise exception 'Department and position must be 120 characters or fewer.';
  end if;

  update public.profiles
  set full_name = v_name,
      department = v_dept,
      "position" = v_pos
  where user_id = auth.uid();

  if not found then
    raise exception 'Profile not found.';
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.update_my_profile(text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 15) Public RPC: set my signature path (the file is already in Storage)
-- ---------------------------------------------------------------------------
create or replace function public.set_my_signature(p_path text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_path text := btrim(coalesce(p_path, ''));
begin
  if v_uid is null or not app_private.is_active_user() then
    raise exception 'Your account is inactive or not signed in.' using errcode = '42501';
  end if;
  if v_path = '' or char_length(v_path) > 300 then
    raise exception 'Invalid signature file.';
  end if;
  if v_path !~ ('^' || v_uid::text || '/signature-[a-z0-9._-]+\.png$') then
    raise exception 'Invalid signature path.';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'signatures' and o.name = v_path
  ) then
    raise exception 'Upload the signature image first.';
  end if;

  update public.profiles
  set signature_path = v_path,
      signature_updated_at = now()
  where user_id = v_uid;

  if not found then
    raise exception 'Profile not found.';
  end if;

  return jsonb_build_object('ok', true, 'signature_path', v_path);
end $$;

revoke all on function public.set_my_signature(text) from public, anon;
grant execute on function public.set_my_signature(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 16) Public RPC: name matching (top 5 candidates, only eligible names)
--     Returns 0.75+ candidates so the UI can show near matches; the UI only
--     accepts >= 0.90. finalize_document() enforces the threshold again.
-- ---------------------------------------------------------------------------
create or replace function public.find_signatory_matches(p_name text)
returns table (
  profile_id bigint,
  full_name text,
  department text,
  "position" text,
  score numeric,
  has_signature boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_name text := left(coalesce(p_name, ''), 200);
begin
  if auth.uid() is null or not app_private.is_active_user() then
    raise exception 'Please log in with an active account.' using errcode = '42501';
  end if;
  if char_length(btrim(v_name)) < 2 then
    return;
  end if;

  return query
  with input as (
    select
      app_private.normalize_name(v_name) as n,
      app_private.sort_name_tokens(v_name) as s,
      app_private.name_core(v_name) as c,
      app_private.sort_core_tokens(v_name) as cs
  ),
  scored as (
    select
      p.id,
      p.full_name,
      p.department,
      p."position",
      (p.signature_path is not null) as has_signature,
      greatest(
        case when length(i.n) = 0 or length(p.name_normalized) = 0 then 0
             else 1 - (extensions.levenshtein(p.name_normalized, i.n)::numeric
                       / greatest(length(p.name_normalized), length(i.n)))
        end,
        case when length(i.s) = 0 or length(p.name_sorted) = 0 then 0
             else 1 - (extensions.levenshtein(p.name_sorted, i.s)::numeric
                       / greatest(length(p.name_sorted), length(i.s)))
        end,
        extensions.similarity(p.name_normalized, i.n)::numeric,
        case when length(i.c) = 0 or length(p.name_core) = 0 then 0
             else 1 - (extensions.levenshtein(p.name_core, i.c)::numeric
                       / greatest(length(p.name_core), length(i.c)))
        end,
        case when length(i.cs) = 0 or length(p.name_core_sorted) = 0 then 0
             else 1 - (extensions.levenshtein(p.name_core_sorted, i.cs)::numeric
                       / greatest(length(p.name_core_sorted), length(i.cs)))
        end,
        extensions.similarity(p.name_core, i.c)::numeric
      ) as raw_score
    from public.profiles p, input i
    where p.is_active
      and p.user_id is not null
      and (
        p.name_normalized OPERATOR(extensions.%) i.n
        or p.name_core OPERATOR(extensions.%) i.c
      )
  )
  select
    s.id,
    s.full_name,
    s.department,
    s."position",
    round(s.raw_score, 4),
    s.has_signature
  from scored s
  where s.raw_score >= 0.75
  order by s.raw_score desc, s.full_name
  limit 5;
end $$;

revoke all on function public.find_signatory_matches(text) from public, anon;
grant execute on function public.find_signatory_matches(text) to authenticated;

create or replace function public.find_signatory_matches_batch(p_names text[])
returns table (
  candidate_index int,
  profile_id bigint,
  full_name text,
  department text,
  "position" text,
  score numeric,
  has_signature boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  i int;
  v_count int := coalesce(array_length(p_names, 1), 0);
begin
  if auth.uid() is null or not app_private.is_active_user() then
    raise exception 'Please log in with an active account.' using errcode = '42501';
  end if;
  if v_count < 1 or v_count > 40 then
    raise exception 'Send between 1 and 40 names.';
  end if;

  for i in 1..v_count loop
    return query
    select i, m.profile_id, m.full_name, m.department, m."position", m.score, m.has_signature
    from public.find_signatory_matches(p_names[i]) m;
  end loop;
end $$;

revoke all on function public.find_signatory_matches_batch(text[]) from public, anon;
grant execute on function public.find_signatory_matches_batch(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 17) Public RPC: finalize (send) a draft
--     Re-verifies the 90% rule for every signatory before anything is sent.
-- ---------------------------------------------------------------------------
create or replace function public.finalize_document(p_document_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documents;
  v_sig public.document_signatories;
  v_profile public.profiles;
  v_count int;
  v_score numeric;
begin
  if not app_private.is_active_user() then
    raise exception 'Your account is inactive.' using errcode = '42501';
  end if;

  select * into v_doc from public.documents where id = p_document_id for update;
  if not found then
    raise exception 'Document not found.';
  end if;
  if v_doc.owner_id <> auth.uid() then
    raise exception 'Only the owner can send this document.' using errcode = '42501';
  end if;
  if v_doc.status <> 'draft' then
    raise exception 'This document has already been sent.';
  end if;
  if v_doc.original_path is null
     or v_doc.original_sha256 is null
     or v_doc.page_count is null
     or v_doc.file_size is null then
    raise exception 'Upload the PDF before sending.';
  end if;

  select count(*) into v_count
  from public.document_signatories
  where document_id = v_doc.id;

  if v_count = 0 then
    raise exception 'Add at least one signatory.';
  end if;

  for v_sig in
    select * from public.document_signatories
    where document_id = v_doc.id
    order by sign_order
  loop
    select * into v_profile
    from public.profiles
    where id = v_sig.profile_id
      and is_active
      and user_id is not null;
    if not found then
      raise exception 'A selected signatory is inactive or has no account.';
    end if;

    v_score := app_private.name_match_score(v_sig.detected_name, v_sig.profile_id);
    if v_score < 0.90 then
      raise exception 'The name "%" matches % at only % (90%% required).',
        v_sig.detected_name, v_profile.full_name, round(v_score * 100, 1);
    end if;

    update public.document_signatories
    set match_score = round(v_score, 4),
        signer_name = v_profile.full_name,
        signer_department = v_profile.department,
        signer_position = v_profile."position",
        status = 'pending',
        viewed_at = null,
        signing_started_at = null,
        signed_at = null,
        decline_reason = null
    where id = v_sig.id;

    if v_sig.page_number > v_doc.page_count then
      raise exception 'A signature field is on a page that does not exist.';
    end if;
  end loop;

  if exists (
    select 1
    from generate_series(1, v_count) g
    where not exists (
      select 1 from public.document_signatories s
      where s.document_id = v_doc.id and s.sign_order = g
    )
  ) then
    raise exception 'The signing order is incomplete.';
  end if;

  update public.documents
  set status = 'pending', updated_at = now()
  where id = v_doc.id;

  insert into public.document_events (document_id, actor_profile_id, actor_name, action, detail)
  values (
    v_doc.id,
    v_doc.owner_profile_id,
    v_doc.owner_name,
    'sent',
    jsonb_build_object('signatories', v_count, 'signing_mode', v_doc.signing_mode)
  );

  return jsonb_build_object('ok', true, 'document_id', v_doc.id, 'signatories', v_count);
end $$;

revoke all on function public.finalize_document(uuid) from public, anon;
grant execute on function public.finalize_document(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 18) Public RPCs: viewed / declined / void
-- ---------------------------------------------------------------------------
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

create or replace function public.decline_document(p_signatory_id uuid, p_reason text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sig public.document_signatories;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_profile_id bigint := app_private.my_profile_id();
  v_actor_name text;
begin
  if not app_private.is_active_user() then
    raise exception 'Your account is inactive.' using errcode = '42501';
  end if;
  if char_length(v_reason) > 500 then
    raise exception 'Keep the reason under 500 characters.';
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
  if v_sig.status in ('signed', 'declined') then
    raise exception 'This request is already closed.';
  end if;

  perform 1
  from public.documents
  where id = v_sig.document_id
    and status in ('pending', 'in_progress')
  for update;

  if not found then
    raise exception 'This document is not open for signing.';
  end if;

  update public.document_signatories
  set status = 'declined',
      decline_reason = nullif(v_reason, ''),
      updated_at = now()
  where id = v_sig.id;

  update public.documents
  set status = 'declined', updated_at = now()
  where id = v_sig.document_id;

  insert into public.document_events (document_id, actor_profile_id, actor_name, action, detail)
  values (
    v_sig.document_id,
    v_profile_id,
    coalesce(v_actor_name, ''),
    'declined',
    jsonb_build_object('reason', v_reason)
  );

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.decline_document(uuid, text) from public, anon;
grant execute on function public.decline_document(uuid, text) to authenticated;

create or replace function public.void_document(p_document_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documents;
  v_actor_profile_id bigint := app_private.my_profile_id();
  v_actor_name text;
begin
  if not app_private.is_active_user() then
    raise exception 'Your account is inactive.' using errcode = '42501';
  end if;

  select full_name into v_actor_name
  from public.profiles
  where id = v_actor_profile_id;

  select * into v_doc from public.documents where id = p_document_id for update;
  if not found then
    raise exception 'Document not found.';
  end if;
  if not (v_doc.owner_id = auth.uid() or app_private.has_role('admin')) then
    raise exception 'Only the owner or an admin can void this document.' using errcode = '42501';
  end if;
  if v_doc.status in ('completed', 'void') then
    raise exception 'This document can no longer be voided.';
  end if;

  update public.documents
  set status = 'void', updated_at = now()
  where id = v_doc.id;

  insert into public.document_events (document_id, actor_profile_id, actor_name, action)
  values (v_doc.id, v_actor_profile_id, coalesce(v_actor_name, ''), 'voided');

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.void_document(uuid) from public, anon;
grant execute on function public.void_document(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 19) Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_role(p_profile_id bigint, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles;
  v_active_admins int;
begin
  if not app_private.has_role('admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_role not in ('member', 'admin') then
    raise exception 'Unknown role.';
  end if;

  select * into v_target from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'Profile not found.';
  end if;

  if v_target.role = 'admin' and v_target.is_active and p_role <> 'admin' then
    select count(*) into v_active_admins
    from public.profiles
    where role = 'admin' and is_active;
    if v_active_admins <= 1 then
      raise exception 'Keep at least one active admin.';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_profile_id;
  return jsonb_build_object('ok', true, 'role', p_role);
end $$;

revoke all on function public.admin_set_role(bigint, text) from public, anon;
grant execute on function public.admin_set_role(bigint, text) to authenticated;

create or replace function public.admin_set_active(p_profile_id bigint, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles;
  v_active_admins int;
begin
  if not app_private.has_role('admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'Profile not found.';
  end if;

  if v_target.user_id = auth.uid() and not p_active then
    raise exception 'You cannot deactivate your own account.';
  end if;

  if v_target.role = 'admin' and v_target.is_active and not p_active then
    select count(*) into v_active_admins
    from public.profiles
    where role = 'admin' and is_active;
    if v_active_admins <= 1 then
      raise exception 'Keep at least one active admin.';
    end if;
  end if;

  update public.profiles set is_active = p_active where id = p_profile_id;
  return jsonb_build_object('ok', true, 'is_active', p_active);
end $$;

revoke all on function public.admin_set_active(bigint, boolean) from public, anon;
grant execute on function public.admin_set_active(bigint, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 20) Private claim/release used by the sign-document Edge Function.
--     Public wrappers exist because PostgREST only exposes `public`.
--     They are executable by service_role only.
-- ---------------------------------------------------------------------------
create or replace function app_private.claim_signature(p_signatory_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_sig public.document_signatories;
  v_doc public.documents;
begin
  select * into v_profile
  from public.profiles
  where user_id = p_user_id
    and is_active
    and user_id is not null;

  if not found then
    raise exception 'Profile not found.' using errcode = '42501';
  end if;

  select * into v_sig
  from public.document_signatories
  where id = p_signatory_id
  for update;

  if not found then
    raise exception 'Signature request not found.';
  end if;
  if v_sig.profile_id <> v_profile.id then
    raise exception 'This request is not yours.' using errcode = '42501';
  end if;

  select * into v_doc
  from public.documents
  where id = v_sig.document_id
  for update;

  if not found then
    raise exception 'Document not found.';
  end if;
  if v_doc.status not in ('pending', 'in_progress') then
    raise exception 'This document is not open for signing.';
  end if;
  if v_sig.status = 'signed' then
    raise exception 'You have already signed this document.';
  end if;
  if v_sig.status = 'declined' then
    raise exception 'This request was declined.';
  end if;
  if v_sig.status = 'signing'
     and v_sig.signing_started_at is not null
     and v_sig.signing_started_at > now() - interval '5 minutes' then
    raise exception 'This signature is already being processed.' using errcode = '55000';
  end if;

  if v_doc.signing_mode = 'sequential' and exists (
    select 1
    from public.document_signatories s
    where s.document_id = v_doc.id
      and s.sign_order < v_sig.sign_order
      and s.status <> 'signed'
  ) then
    raise exception 'Waiting for earlier signers.' using errcode = '55000';
  end if;

  if v_profile.signature_path is null then
    raise exception 'Upload your signature before approving.' using errcode = 'ED001';
  end if;

  update public.document_signatories
  set status = 'signing',
      signing_started_at = now(),
      updated_at = now()
  where id = v_sig.id;

  return jsonb_build_object(
    'signatory_id', v_sig.id,
    'document_id', v_doc.id,
    'owner_id', v_doc.owner_id,
    'profile_id', v_profile.id,
    'profile_name', v_profile.full_name,
    'signature_path', v_profile.signature_path,
    'signing_mode', v_doc.signing_mode,
    'remaining', (
      select count(*)
      from public.document_signatories s
      where s.document_id = v_doc.id
        and s.id <> v_sig.id
        and s.status in ('pending', 'viewed', 'signing')
    )
  );
end $$;

revoke all on function app_private.claim_signature(uuid, uuid) from public, anon, authenticated;
grant execute on function app_private.claim_signature(uuid, uuid) to service_role;

create or replace function app_private.release_signature_claim(p_signatory_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.document_signatories
  set status = 'viewed',
      viewed_at = coalesce(viewed_at, now()),
      signing_started_at = null,
      updated_at = now()
  where id = p_signatory_id
    and status = 'signing'
$$;

revoke all on function app_private.release_signature_claim(uuid) from public, anon, authenticated;
grant execute on function app_private.release_signature_claim(uuid) to service_role;

create or replace function public.claim_signature(p_signatory_id uuid, p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.claim_signature(p_signatory_id, p_user_id)
$$;

revoke all on function public.claim_signature(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_signature(uuid, uuid) to service_role;

create or replace function public.release_signature_claim(p_signatory_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select app_private.release_signature_claim(p_signatory_id)
$$;

revoke all on function public.release_signature_claim(uuid) from public, anon, authenticated;
grant execute on function public.release_signature_claim(uuid) to service_role;

-- Atomically records a completed signature after the Edge Function uploaded
-- the stamped PDF. If this fails, the Edge Function deletes the uploaded file
-- and releases the claim, so the database never points at a half-written
-- version.
create or replace function app_private.complete_signature(
  p_signatory_id uuid,
  p_version int,
  p_storage_path text,
  p_sha256 text,
  p_completed boolean,
  p_detail jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sig public.document_signatories;
  v_doc public.documents;
  v_expected_path text;
  v_remaining int;
begin
  select * into v_sig
  from public.document_signatories
  where id = p_signatory_id
  for update;

  if not found then
    raise exception 'Signature request not found.';
  end if;
  if v_sig.status <> 'signing' then
    raise exception 'This signature is not in progress.';
  end if;

  select * into v_doc
  from public.documents
  where id = v_sig.document_id
  for update;

  if not found then
    raise exception 'Document not found.';
  end if;
  if v_doc.status not in ('pending', 'in_progress') then
    raise exception 'This document is not open for signing.';
  end if;
  if p_version <> v_doc.current_version + 1 then
    raise exception 'The document version changed. Try again.';
  end if;
  if p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid file hash.';
  end if;

  v_expected_path := v_doc.owner_id::text || '/' || v_doc.id::text
    || '/v' || p_version::text || '.pdf';
  if p_storage_path <> v_expected_path then
    raise exception 'Invalid signed file path.';
  end if;

  select count(*) into v_remaining
  from public.document_signatories s
  where s.document_id = v_doc.id
    and s.id <> v_sig.id
    and s.status in ('pending', 'viewed', 'signing');

  if p_completed <> (v_remaining = 0) then
    raise exception 'The signature count changed. Try again.';
  end if;

  insert into public.document_versions (
    document_id, version_number, storage_path, sha256, created_by_profile_id, created_by_name
  )
  values (
    v_doc.id, p_version, p_storage_path, p_sha256, v_sig.profile_id, v_sig.signer_name
  );

  update public.document_signatories
  set status = 'signed',
      signed_at = now(),
      signing_started_at = null,
      updated_at = now()
  where id = v_sig.id;

  update public.documents
  set status = case when p_completed then 'completed' else 'in_progress' end,
      current_version = p_version,
      completed_at = case when p_completed then now() else null end,
      updated_at = now()
  where id = v_doc.id;

  insert into public.document_events (document_id, actor_profile_id, actor_name, action, detail)
  values (
    v_doc.id,
    v_sig.profile_id,
    v_sig.signer_name,
    'signed',
    coalesce(p_detail, '{}'::jsonb) || jsonb_build_object(
      'version', p_version,
      'sha256', p_sha256
    )
  );

  if p_completed then
    insert into public.document_events (document_id, actor_profile_id, actor_name, action)
    values (v_doc.id, v_sig.profile_id, v_sig.signer_name, 'completed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'completed', p_completed,
    'version', p_version
  );
end $$;

revoke all on function app_private.complete_signature(uuid, int, text, text, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function app_private.complete_signature(uuid, int, text, text, boolean, jsonb)
  to service_role;

create or replace function public.complete_signature(
  p_signatory_id uuid,
  p_version int,
  p_storage_path text,
  p_sha256 text,
  p_completed boolean,
  p_detail jsonb default '{}'::jsonb
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.complete_signature(
    p_signatory_id, p_version, p_storage_path, p_sha256, p_completed, p_detail
  )
$$;

revoke all on function public.complete_signature(uuid, int, text, text, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_signature(uuid, int, text, text, boolean, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- 21) Storage buckets and policies
--     Documents, signatures and signed copies are private. Profile avatars are
--     public images so the header and profile can render them without signing
--     a URL on every request.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 26214400, array['application/pdf']),
  ('signatures', 'signatures', false, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('signed-documents', 'signed-documents', false, 52428800, array['application/pdf']),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- documents: owner uploads into their own document folder while it is a draft.
create policy "edocs documents: insert own draft"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.can_write_document_object(name)
  );

create policy "edocs documents: read accessible"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and app_private.can_read_document_object(name)
  );

create policy "edocs documents: update own draft"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.can_write_document_object(name)
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.can_write_document_object(name)
  );

create policy "edocs documents: delete own draft"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.can_write_document_object(name)
  );

-- signatures: a user sees and changes only their own signature file.
create policy "edocs signatures: insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.is_active_user()
  );

create policy "edocs signatures: read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.is_active_user()
  );

create policy "edocs signatures: update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.is_active_user()
  )
  with check (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.is_active_user()
  );

create policy "edocs signatures: delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
    and app_private.is_active_user()
  );

-- avatars: public read; an active user manages files in their own folder.
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

-- signed-documents: readable by anyone with document access; written only by
-- the Edge Function (service role bypasses RLS).
create policy "edocs signed-documents: read accessible"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'signed-documents'
    and app_private.can_read_document_object(name)
  );

-- ---------------------------------------------------------------------------
-- 22) Grants for helper functions used by policies / defaults
-- ---------------------------------------------------------------------------
grant usage on schema app_private to authenticated;
grant execute on function app_private.my_profile_id() to authenticated;
grant execute on function app_private.my_role() to authenticated;
grant execute on function app_private.has_role(text[]) to authenticated;
grant execute on function app_private.is_active_user() to authenticated;
grant execute on function app_private.normalize_name(text) to authenticated;
grant execute on function app_private.name_core(text) to authenticated;
grant execute on function app_private.sort_name_tokens(text) to authenticated;
grant execute on function app_private.sort_core_tokens(text) to authenticated;
grant execute on function app_private.name_match_score(text, bigint) to authenticated;
grant execute on function app_private.can_read_document(uuid) to authenticated;
grant execute on function app_private.can_read_document_object(text) to authenticated;
grant execute on function app_private.can_write_document_object(text) to authenticated;

-- The sign-document Edge Function uses the service role to write versions and
-- audit events. RLS is bypassed for service_role, but table/sequence grants
-- are still required.
grant select, insert, update on public.documents to service_role;
grant select, insert, update on public.document_signatories to service_role;
grant select, insert on public.document_versions to service_role;
grant select, insert on public.document_events to service_role;
grant select on public.profiles to service_role;
grant usage, select on sequence public.document_versions_id_seq to service_role;
grant usage, select on sequence public.document_events_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- 23) Backfill profiles for auth users that already existed.
-- ---------------------------------------------------------------------------
insert into public.profiles (user_id, full_name)
select
  u.id,
  coalesce(
    nullif(btrim(coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      u.raw_user_meta_data ->> 'display_name',
      ''
    )), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Unnamed user'
  )
from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 24) Profile avatar selection
-- ---------------------------------------------------------------------------
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

commit;

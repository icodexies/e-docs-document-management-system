-- ============================================================================
-- E-Docs — one-time reset of the failed previous build
--
-- WHAT THIS DOES
--   Drops every table, view, sequence, function and type in `public`, drops
--   the `app_private` helper schema, removes custom storage policies, and
--   removes the three text-matching extensions (the migration installs them
--   in the standard `extensions` schema). It does NOT touch `auth.users`,
--   `auth` data, or Supabase internals.
--
-- WHEN TO RUN
--   ONCE, in the Supabase dashboard → SQL Editor, before applying the new
--   migration. This is destructive by design: the previous E-Docs tables are
--   being discarded.
--
-- WHAT IT DOES NOT DO
--   • It does not delete auth users. If you want a completely blank project,
--     uncomment the optional auth cleanup at the bottom (this deletes every
--     login account).
--   • It does not remove the old files from Storage. Review Storage in the
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

-- 9) OPTIONAL — delete every auth user from the failed build.
--    This removes every login account and cascades to profiles. Uncomment
--    only if you want a completely blank project. You will need to recreate
--    your own account in Authentication → Users.
--
-- delete from auth.users;

-- 10) OPTIONAL — remove old Storage buckets from the failed build.
--     Review the bucket list first in Storage. This deletes bucket metadata;
--     if the dashboard still shows files, delete the buckets there as well.
--
-- delete from storage.buckets;

-- 11) Tell PostgREST to forget the old schema.
notify pgrst, 'reload schema';

commit;

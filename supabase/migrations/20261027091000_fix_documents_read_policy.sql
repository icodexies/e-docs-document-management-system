-- The original SELECT policy called can_read_document(id). That helper checks
-- whether the document exists in public.documents, which cannot see the row
-- being inserted during INSERT ... RETURNING. The insert itself succeeded, but
-- the RETURNING clause saw an invisible row and PostgREST reported:
--
--   new row violates row-level security policy for table "documents"
--
-- Keep the active-user check, but let an owner read their own row directly.
-- This also covers the new row in the same command.
drop policy if exists "documents: read accessible" on public.documents;

create policy "documents: read accessible"
  on public.documents for select to authenticated
  using (
    app_private.is_active_user()
    and (
      owner_id = (select auth.uid())
      or app_private.can_read_document(id)
    )
  );

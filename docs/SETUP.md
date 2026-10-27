# E-Docs setup and verification

This is the operational checklist for the project owner. The frontend only has
the publishable key, so the destructive SQL and the Edge Function deployment are
manual one-time steps.

## 1. Apply the schema

**Supabase → SQL Editor → New query.** Paste all of
`supabase/fresh-install.sql` and run it against a new or disposable project.

What it does:

- Drops every table, view, sequence, function and type in `public` (except
  extension-owned objects and `spatial_ref_sys`).
- Drops the `app_private` helper schema.
- Drops custom storage policies.
- Installs `unaccent`, `pg_trgm` and `fuzzystrmatch` in the standard
  `extensions` schema.
- Creates the E-Docs schema, RLS policies, RPCs and the private buckets.
- Leaves `auth.users` and the contents of Storage intact by default.

If you also want a completely blank project, uncomment these blocks in
`supabase/reset.sql` before running it:

```sql
-- delete from auth.users;
-- delete from storage.buckets;
```

Deleting auth users removes every login and cascades to profiles. Deleting
buckets removes metadata; clear the files in **Storage** in the dashboard too.

If you prefer the two-file route:

1. `supabase/reset.sql`
2. `supabase/migrations/20261027090000_init_edocs.sql`

Do not apply the migration first: the old `profiles` and `documents` tables
would collide with the new ones.

Expected result in **Table Editor**:

```text
profiles
documents
document_signatories
document_versions
document_events
```

Every table has RLS enabled. Do not disable it to "test" something; fix the
policy or the RPC.

## 2. Bootstrap the first admin, then add users in the app

The first admin is the only account created outside E-Docs, exactly like the
LIRC bootstrap. In **Authentication → Users → Add user**:

- Email: the admin's address.
- Password: a temporary password.
- **Auto Confirm User: ON** (otherwise they cannot sign in until they confirm).
- The trigger creates a profile using the email prefix.

Set the real name and promote the first admin:

```sql
update public.profiles
set full_name = 'Your Full Name', role = 'admin'
where user_id = '<auth-user-uuid>';
```

After that, sign in and open **Users → Add user**. The app calls the
`admin-create-user` Edge Function, which:

- creates the Auth user with `email_confirm: true`,
- generates a temporary password when the field is left blank,
- fills the profile name, department, position and role,
- returns the temporary password once so the admin can hand it over.

Keep at least one active admin. The `admin_set_role` and `admin_set_active`
RPCs refuse to remove the last one. The `admin-create-user` function refuses
callers who are not active admins.

## 3. Auth settings (one-time)

- **Authentication → Settings:** **Allow new users to sign up OFF**.
  Accounts are provisioned; there is no public registration form.
- **Authentication → Passwords:** enable **leaked password protection**.
- **Authentication → URL Configuration:** set the Site URL and exact redirect
  URLs. Add `http://localhost:5173` for local development. No wildcards.
- **Authentication → SMTP:** configure it if password reset emails are needed.
  Admin-created users do not need email confirmation when Auto Confirm is on.

## 4. Deploy the two server functions

The signature must be applied by the server. The account provisioning must also
run on the server; the browser never has the service role key.

**Dashboard:** **Edge Functions → Create a function** for each:

| Function | File | JWT |
| --- | --- | --- |
| `sign-document` | `supabase/functions/sign-document/index.ts` | ON |
| `admin-create-user` | `supabase/functions/admin-create-user/index.ts` | ON |

**CLI:**

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy sign-document
supabase functions deploy admin-create-user
```

Both read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the Edge Function
runtime. Do not create a `VITE_` variable for the service key.

The `admin-create-user` function checks that the caller is an active admin, then
creates the Auth user and updates the profile. The first admin still needs the
dashboard bootstrap above.

## 5. Two-account verification (required)

Use two browsers or a normal + incognito window.

### A. Read isolation

1. Account A (member) uploads a PDF and assigns Account B as a signatory.
2. B sees the document under **Awaiting signature**.
3. Create Account C (member, not assigned). C must not see the document in
   **Documents** or **Awaiting**, and pasting the document URL must fail.
4. C calling the REST API directly must get an empty result/403, not the row.

### B. Owner isolation

1. A opens the document; A can see the signatories and timeline.
2. B can open the PDF and see the signature field, but B cannot change the
   signature boxes after sending. The RLS update policy only allows the owner
   while the document is `draft`.
3. A cannot read B's profile row; A sees the signatory **snapshot** instead.

### C. Signature gate

1. B has no signature on file. B opens the document; the Approve button is
   disabled and the page links to **Profile & signature**.
2. Call the Edge Function directly (or use the API) with B's token and the
   signatory id. It must return **409** with
   `"Upload your signature before approving this document."` (`ED001`).
3. B uploads a signature, returns to the document, and approves. The server
   stamps the signature and records version 1.
4. The document status becomes `in_progress`, then `completed` when the last
   signer approves. The final version includes a certificate page.
5. The detail page shows the signed version, the SHA-256 and the timeline.

### D. Sequential order

1. Send a document with two signers in **One at a time** mode.
2. The second signer opens it before the first signs. The Approve button is
   disabled with "Waiting for earlier signers."
3. The first signs; the second can then sign.
4. In **All at once** mode, both can sign in any order.

### E. Inactive accounts

1. Admin deactivates Account B.
2. B's next page load shows the deactivated panel. B's existing JWT cannot read
   documents (`can_read_document` checks `is_active_user()`).
3. Reactivate B to restore access.

### F. Immutability

1. After sending, try to replace the original PDF in Storage from the owner
   account. The storage update policy rejects it because the document is no
   longer a draft.
2. Even if a file were replaced out-of-band, the Edge Function recomputes the
   SHA-256 and refuses to stamp on a mismatch.

## 6. Storage layout

All buckets are private.

```text
documents/<owner-uuid>/<document-uuid>/original.pdf
signed-documents/<owner-uuid>/<document-uuid>/v1.pdf
signed-documents/<owner-uuid>/<document-uuid>/v2.pdf
signatures/<user-uuid>/signature-<timestamp>.png
```

- The owner uploads/updates the original only while the document is `draft`.
- Signers read the original/signed copies only when assigned.
- Signatures are readable only by their owner (and the service role used by the
  Edge Function).
- Old signature files are removed after a replacement.

## 7. Common errors

| Symptom | Meaning / fix |
| --- | --- |
| `relation "profiles" already exists` | The reset was skipped. Run `reset.sql`, then the migration. |
| `function ... does not exist` | The migration was not applied, or PostgREST cache is stale. Re-run the migration/`notify pgrst, 'reload schema'`. |
| `permission denied for table profiles` with the publishable key | Expected: the frontend must be signed in. Use the app, not the raw REST root. |
| Login says "Incorrect email or password" | The account was created in Supabase Auth, not in `profiles`. Check Authentication → Users. |
| "No profile is linked to this account" | The auth trigger did not run. Recreate the user or insert a profile manually. |
| Edge Function returns 404 | `sign-document` or `admin-create-user` is not deployed. |
| Add user returns 403 | The caller is not an active admin. Promote the account first. |
| Edge Function returns 401 | The session expired; sign in again. |
| 409 `ED001` | The approver has no signature. Upload it in Profile & signature. |
| 409 "Waiting for earlier signers." | Sequential order; the earlier signer has not signed. |
| 409 "The document file changed..." | The stored PDF hash does not match. Ask the owner to re-upload. |
| A signature is stuck at "Signing" | The Edge Function failed mid-claim. Wait 5 minutes (the claim can be re-taken) or reset it: `update public.document_signatories set status='viewed', signing_started_at=null where id='<id>';` |
| "Page 1 is rotated..." | Rotate the PDF to 0° in a PDF editor and re-upload. The signature box and the server stamp must share the same coordinate space. |
| Name is not detected | The PDF may be a scan. Add the signatory manually and drag the box. |
| Name score is below 90% | Correct the printed name and press Find account; or ask an admin to fix the account's full name. |

## 8. Do not

- Do not put the `service_role` / `sb_secret_...` key in `.env` or any `VITE_`
  variable.
- Do not disable RLS to make a query work.
- Do not edit an applied migration; add a new one.
- Do not send a document without confirming the detected people and boxes.
- Do not treat this as a CA-issued digital signature; see the legal note in
  `docs/MATCHING.md`.

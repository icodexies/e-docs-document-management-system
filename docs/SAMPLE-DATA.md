# Sample accounts and demo document

These are **fictional test accounts**. Use them only in a local or throwaway
Supabase project, and choose your own passwords. The repository does not ship
any account passwords.

E-Docs uses the same account-provisioning pattern as LIRC:

- **One dashboard bootstrap:** the first admin is created in Supabase Auth.
- **Everything after that:** the admin signs in and uses **Users → Add user**.

## 1. Bootstrap the first admin

**Supabase → Authentication → Users → Add user** with **Auto Confirm User ON**:

```text
Email:    admin@edocs.test
Password: <choose-a-strong-password>
```

Then promote it and set its display name:

```sql
update public.profiles
set full_name = 'E-Docs Administrator', role = 'admin'
where user_id = (select id from auth.users where email = 'admin@edocs.test');
```

This is the only account that needs the dashboard. LIRC required the same
one-time bootstrap.

## 2. Deploy `admin-create-user`

Before using **Add user**, deploy the function:

**Edge Functions → Create function → `admin-create-user`** → paste
`supabase/functions/admin-create-user/index.ts` → JWT verification **ON** →
Deploy.

Or:

```bash
supabase functions deploy admin-create-user
```

It uses the built-in service role key; no secret goes in the browser.

## 3. Create the three members in the app

Sign in as the admin you created, open **Users**, and click **Add user** three
times. The form creates both the login and the profile.

| Email | Full name | Department | Position | Role | Signature |
| --- | --- | --- | --- | --- | --- |
| `juan.delacruz@edocs.test` | Juan Dela Cruz | Finance | Department Head | Member | upload it |
| `maria.santos@edocs.test` | Maria Santos | Human Resources | HR Manager | Member | upload it |
| `pedro.reyes@edocs.test` | Pedro Reyes | Operations | Operations Officer | Member | **leave empty** |

Choose a unique password for each account in the Add user form. If the field is
left blank, the function generates one and shows it once after creation.

The function sets the profile's full name and role directly; no profile SQL is
needed for these three.

If the Add user button returns **404**, the `admin-create-user` function is not
deployed. If it returns **403**, the signed-in account is not an active admin.

## 4. The demo PDF

`public/samples/E-Docs-Sample-Approval.pdf`

- One page, unrotated, with a real text layer.
- Names are printed in 16 pt bold. The generator uses the Windows Garamond
  fonts when present (`GARA.TTF` / `GARABD.TTF`) and falls back to Times
  otherwise.
- Signature lines and `Signature over Printed Name` captions are included.
- Open it locally at:
  `http://127.0.0.1:5173/samples/E-Docs-Sample-Approval.pdf`
- Regenerate it with:

```bash
npm run make:sample
```

> pdf.js reports `serif` in `textContent.styles[...].fontFamily`; that is only
> its generic CSS fallback, not the embedded font name. E-Docs reads the real
> name from the font object (`commonObjs.get(...).name`) and enables
> `fontExtraProperties: true` for pdf.js v6, so the sample's three Garamond
> Bold 16 pt names auto-detect. If a PDF genuinely hides its font metadata, it
> still shows **Manual only** rather than guessing from size.

## 5. Walk the demo

1. Sign in as the admin you created.
2. **Upload document** → choose the sample PDF.
3. The sample should show three detected names with the **Garamond Bold ·
   14–18 pt** chip; confirm the three boxes. If a different PDF genuinely hides
   its font metadata, it shows **Manual only**; use **Add signatory** to add
   names by hand.
4. Choose **One at a time** (to test order) or **All at once** (to test the
   signature gate immediately).
5. Send the document.
6. Sign in as **juan.delacruz@edocs.test**:
   - **Profile & signature** → draw a signature → Save.
   - **Awaiting signature** → open the sample → review → check consent →
     **Approve & sign**.
7. Repeat for **maria.santos@edocs.test**.
8. Sign in as **pedro.reyes@edocs.test**:
   - Open the sample without a signature. The Approve button is disabled and
     the page shows **Upload your signature first**.
   - Open **Profile & signature**, save a signature, return to the document,
     and approve.
9. Sign back in as the admin account → **Documents** → open the sample.
   You should see the signed version, the certificate page, the SHA-256 and the
   activity timeline.

## 6. What to look for

| Result | Where |
| --- | --- |
| Three names detected at 100% | Upload review list |
| Signature boxes above the printed names | PDF editor |
| Pedro blocked without a signature | Sign page + Edge Function `409 ED001` |
| Sequential waiting | Maria/Pedro before the earlier signer |
| Signed PDF version + certificate | Admin document detail |
| Hash + audit timeline | Admin document detail |
| RLS isolation | Sign in as a fourth account that is not assigned; the document is invisible |

## 7. Cleanup

Deactivate the demo accounts in **Administration → Users**, or delete them in
Supabase → Authentication → Users. Never reuse a public/demo password in a
production project.

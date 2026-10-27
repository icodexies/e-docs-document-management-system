# E-Docs — Document Management System

Upload a PDF, confirm the printed names, and route it to the right approvers.
E-Docs matches names to active accounts at **90% or higher**, blocks approval
until the approver has a stored signature, and stamps every signature on the
server with a hash and audit trail.

This is a self-hosted document management and electronic signature project.
Each installation connects to its own Supabase project; no shared database or
account credentials are included in this repository.

The UI/UX decisions and the accessibility checks are documented in
`docs/UI-UX-REVIEW.md`.

## Stack

Vite 8 · React 19 · JavaScript · React Router 7 · Tailwind CSS 4 · Supabase
(Auth, Postgres + RLS, Storage, Edge Functions) · pdf.js · pdf-lib.

## Getting started

Each installation uses its own Supabase project. The repository ships with SQL
migrations, Edge Functions and placeholder environment files — not a live
database connection.

### 1. Create your Supabase project and env files

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL` — your project URL.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — your publishable/anon key.
3. For a production build or Docker, copy `.env.production.example` to
   `.env.production` and fill in the same two values.

Only the publishable/anon key belongs in the browser. Never put a
`service_role` / `sb_secret_...` key in a `VITE_` variable.

### 2. Apply the schema

Use a **new** Supabase project. In **Supabase → SQL Editor**, paste the whole of
`supabase/fresh-install.sql` and run it once.

- It creates the E-Docs schema, RLS policies, RPCs, storage buckets and the
  `app_private` helper schema.
- It is destructive to the `public` schema. Do not run it on a database whose
  data you need to keep.
- Expected tables: `profiles`, `documents`, `document_signatories`,
  `document_versions`, `document_events`, all with RLS enabled.

If you prefer separate files, run `supabase/reset.sql` first and then the
migrations in `supabase/migrations/`. If you are migrating an existing E-Docs
database, apply only the newer migration files; never edit an applied migration.

The project includes these frontend features:

- **Documents:** upload, preview, name detection, signatory assignment, audit
  timeline and signed-version history.
- **Signatures:** server-side stamping with a SHA-256 hash and a certificate
  page.
- **Accounts:** admin-created users, roles, profile photos and stored
  signatures.
- **Workspace:** a single Appearance menu for system/light/dark mode and three
  text sizes on large screens, compact task headers, keyboard-visible focus,
  skip links, numbered pagination and uploader-visible “Viewed” timestamps.

`supabase/functions/sign-document/` performs the signing operation.
`supabase/functions/admin-create-user/` provisions accounts from **Users → Add
user** without exposing the service role to the browser.

### 3. Bootstrap the first admin

The first admin is the only account created outside the app. Create it in
**Supabase → Authentication → Users → Add user** with **Auto Confirm User ON**.
The trigger creates a profile using the email prefix. Set the real name and
promote it:

```sql
update public.profiles
set full_name = 'Your Full Name', role = 'admin'
where user_id = '<auth-user-uuid>';
```

After that, sign in as the admin and use **Users → Add user**. That page calls
the `admin-create-user` Edge Function, which creates the Auth user with the
injected service role and fills the profile (name, department, position, role).
No service key is ever sent to the browser.

### 4. Auth settings

- **Authentication → Settings:** turn **Allow new users to sign up** OFF.
- **Authentication → Passwords:** enable **leaked password protection**.
- **Authentication → URL Configuration:** set the Site URL to your own live
  address and add exact redirect URLs (including `http://localhost:5173` for
  development).
- Configure SMTP if password-reset emails should be delivered.

### 5. Deploy the two server functions

Both functions need the server-side service role; neither receives it from the
browser.

**Dashboard path:** Edge Functions → Create function →

- `sign-document` → paste `supabase/functions/sign-document/index.ts`
- `admin-create-user` → paste `supabase/functions/admin-create-user/index.ts`

Leave JWT verification **ON** for both and deploy.

**CLI path:**

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy sign-document
supabase functions deploy admin-create-user
```

Both functions read the built-in `SUPABASE_SERVICE_ROLE_KEY`; no manual secret
is needed. Never put a service key in the frontend or a `VITE_` variable.

### 6. Run it

```bash
npm install
npm run dev
```

Sign in with the admin account you created, upload a PDF, confirm the names and
boxes, send it, and approve it from an account that has a signature on file.

> Vite prebundles Supabase and pdf.js in `vite.config.js`. Restart the dev server
> once after dependency changes; this prevents the first PDF scan from triggering
> Vite's dependency re-optimization and a full page reload.

## Demo accounts and sample PDF

`docs/SAMPLE-DATA.md` has the first-admin bootstrap, the three sample accounts
you can create with **Users → Add user**, and a one-page sample at
`public/samples/E-Docs-Sample-Approval.pdf`.

The sample uses these fictional addresses:

| Role | Email | Signature |
| --- | --- | --- |
| Admin | `admin@edocs.test` | optional |
| Member | `juan.delacruz@edocs.test` | upload |
| Member | `maria.santos@edocs.test` | upload |
| Member | `pedro.reyes@edocs.test` | leave empty |

Choose a unique password for every account you create. No passwords are
committed to this repository.

The sample PDF prints `JUAN DELA CRUZ`, `MARIA SANTOS` and `PEDRO REYES` in
Garamond Bold 16 pt. Verified with pdf.js: exactly three candidates, all 16 pt,
with no title/footer noise. The three profiles match at 100%.

`tests/fixtures/real-garamond-names.pdf` is the real-world regression fixture:
`Maria Santos` and `Pedro reyes` are Garamond Bold 16 pt, while `Head of the
City college` is CenturyGothic-Bold 11 pt and must be rejected. It is loaded
through real pdf.js in `tests/documents/pdfFontDetection.test.js`.

Create only the first admin in Supabase → Authentication → Users (Auto Confirm
ON), promote it with the SQL in `docs/SAMPLE-DATA.md`, then use **Users → Add
user** in E-Docs for the other three. The Add user function fills the profile
names and roles directly.

Regenerate the PDF with `npm run make:sample`. It uses the locally installed
Windows Garamond fonts and falls back to Times when they are not available.

> `textContent.styles[...].fontFamily` is only pdf.js's generic CSS fallback
> (`serif`/`sans-serif`); it is not the embedded font name. E-Docs reads the
> real name from the font object (`commonObjs.get(...).name`) and enables
> `fontExtraProperties: true` for pdf.js v6. The sample therefore auto-detects
> its Garamond Bold names. If a PDF genuinely hides its font metadata, E-Docs
> still falls back to **Manual only** instead of guessing from size.

## How name matching works

Read `docs/MATCHING.md`. In short:

1. pdf.js reads the PDF text layer and the real font object name (for example
   `Garamond-Bold`), not the generic CSS `serif`/`sans-serif` fallback. The
   detector keeps only **Garamond-like bold, 14–18 pt** name-like lines,
   anywhere on the page. Signature labels are not required. If the PDF hides
   its font metadata, the system shows **Manual only** instead of guessing by
   size.
2. Names are normalized (case, accents, punctuation, spacing).
3. The database compares the detected name to every active profile using
   Levenshtein distance, token-sorted Levenshtein distance, trigram similarity,
   and the same comparisons with single-letter middle initials removed.
4. Only matches at **0.90 or higher** are eligible. Ambiguous matches require a
   human to choose the right person.
5. `finalize_document()` recomputes every score on the server before sending.

The font/size is the **first gate**, not the identity: it decides which lines
become candidates, then the name match decides who signs. Underlining is
allowed and never disqualifies a line. The review screen shows “Garamond Bold ·
14–18 pt” or “Manual only”. See `docs/MATCHING.md` for what happens when a PDF
hides its font metadata.

## What the approver experiences

- The document appears under **Awaiting signature**.
- If no signature is on file, the Approve button is blocked and the page links
  to **Profile & signature**.
- The PDF viewer shows every page and highlights the approver's field.
- Approving calls the Edge Function, which verifies the JWT, the assignment,
  the sequential order, the document hash and the on-file signature, then stamps
  the signature and records a new immutable version.
- The final signature adds a certificate page. The signed PDF and its SHA-256
  are in the audit trail.

## Owner visibility and lists

- When a signer opens a request, `document_signatories.viewed_at` is recorded.
- The owner's document detail shows **“x viewed”**, a **Viewed …** timestamp per
  signatory, and a **Refresh** button.
- Document cards show **“Viewed by N signer(s)”** once someone opens the paper.
- **Documents**, **Awaiting signature**, and **Users** use numbered pagination
  with a page window, previous/next controls, and item counts.
- **Users** uses a dense desktop account table with role and status controls,
  and keeps the card layout for phones and small tablets.
- The document **Activity** timeline pages through six events at a time.
- The dashboard shows a six-month upload bar chart, completion gauge, document
  status mix, and signer-engagement bars instead of repeating recent lists.
- **Profile photos:** upload a PNG/JPG/WebP or choose one of the copied preset
  avatars. The selected image appears in the header and the admin account
  directory; the non-selectable default image is used automatically when no
  photo is chosen.

## Limits

- **PDF only.** Password-protected PDFs are rejected.
- **Scans have no text layer.** Add signatories manually and drag the boxes.
- **Rotated pages are rejected.** Rotate the PDF to 0° in a PDF editor and
  re-upload; this keeps the signature box and the server stamp aligned.
- This is an electronic signature with a hash and audit trail, not a
  CA-backed PAdES signature. For high-stakes legal documents, add a qualified
  digital signature provider.
- The Edge Function must be deployed before approval works.

## Commands

```text
npm run dev       development server
npm run lint      ESLint
npm test          Node test runner
npm run build     production build into dist/
npm run preview   preview the production build
```

## Deployment

- **Docker:** copy `.env.production.example` to `.env.production`, fill in your
  own Supabase values, then run `docker compose up --build` →
  http://localhost:8080.
- **Netlify:** connect the repo, add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` to the Netlify environment variables, or add
  them as GitHub repository variables for the Actions build. Add
  `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` as GitHub repository secrets. CI
  runs lint, tests and build before publishing.
- **Supabase:** the database is deployed separately (`fresh-install.sql` or
  `supabase db push`). The site only carries the publishable key.

## Security notes

- This repository contains no live Supabase URL, anon key, service-role key or
  account passwords. You connect your own project through `.env` and
  `.env.production`.
- Never commit `.env` or `.env.production`; both are ignored by Git.
- Only fake personal data belongs in the sample files. Do not put real signer
  names, emails or signatures into a public repository.

## Project layout

```text
src/pages        route screens (public + private)
src/components   feature UI (documents, signatures, admin) + shared ui/
src/hooks        feature behavior (documents, dashboard, profile, pdf)
src/services     Supabase calls, validation, matching, pdf.js, hashing
src/context      auth, theme and display-size providers
src/routes       roles, guards, the page list
supabase/        reset, migration, Edge Functions
tests/           node:test suites, including real-pdf.js extraction fixtures
docs/            setup, matching, UI/UX review and verification notes
```

## Manual verification still required

The frontend is lint-clean, all tests pass, and the production build succeeds.
Apply the schema to your own Supabase project and deploy both Edge Functions,
then bootstrap the first admin; after that, the Users page can create the rest.
The two-account checks are in `docs/SETUP.md`.

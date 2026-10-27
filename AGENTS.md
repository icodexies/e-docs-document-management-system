# AGENTS.md — instructions for any AI coding agent

> **This is the master instruction file for building any new system from this kit.**
> Base directory (the "kit"):
> `<path-to-your-system-kit>`
>
> If a user points you at that path or asks you to "start a new system using my template",
> these are your standing orders. Read this file completely, then follow the read order below.

---

## 1. What this kit is

A production-tested general template extracted from a real, deployed system
(LIRC — a live React + Supabase application). It gives every new project:

- **Frontend:** Vite 8 + React 19 + JavaScript (`.js` / `.jsx`) + React Router 7 + Tailwind CSS 4
- **Backend:** Supabase (Auth, Postgres with Row Level Security, Edge Functions, Storage)
- **Deployment:** Docker (nginx) + Netlify + GitHub Actions CI/CD
- **Practices:** security rules, folder conventions, testing, design system, checklists

Four parts:

| Path | What it is | When to use |
| --- | --- | --- |
| `template\` | A copy-ready, working starter project | Copy it as the first step of any new system |
| `docs\` | The rules, patterns and checklists | Read the relevant docs before writing code |
| `prompts\` | Ready-to-paste prompts for agents | Use when a user asks for a new project/feature/audit |
| `skills\` | 57 curated Agent Skills for design, animation, workflow and security | Load only the ones matching the task (see below) |

---

## 2. Mandatory read order (do this before writing anything)

> All `docs\…` and `template\…` paths in this file are **inside the kit
> directory above** — not relative to whatever project you are working on.
> If you find this file copied into a project where those folders are missing,
> fall back to the kit's absolute paths.

1. `AGENTS.md` — this file (rules + workflow)
2. `docs\01-START-NEW-PROJECT.md` — if the task is "start a new system"
3. `docs\02-ARCHITECTURE-AND-FOLDERS.md` — how the code must be organized
4. `docs\03-FRONTEND-STANDARDS.md` — before touching any React code
5. `docs\04-BACKEND-SUPABASE.md` — before touching the database or functions
6. `docs\05-SECURITY-PLAYBOOK.md` — **non-negotiable**; applies to every task
7. `docs\06-DESIGN-SYSTEM.md` — before writing any JSX/classes
8. `docs\07-TESTING-AND-DEFINITION-OF-DONE.md` — before claiming work is finished
9. `docs\08-DEPLOYMENT-DOCKER-CICD.md` — when deploying or changing build files

**Skills (expertise packs).** Before implementing, check `skills\README.md` and
load **only** the `SKILL.md` file(s) that match the task — never the whole
library. Skills supply depth (animation craft, design systems, security audits,
planning methodology); they never override this file or the kit's docs. If a
skill conflicts with `docs\05` or the hard rules below, the kit wins — report
the conflict.

For a focused task (one page, one table, one fix) you may read only the docs that
match the files you will touch — but **05 (Security) and 07 (Definition of Done) always apply.**

---

## 3. Hard rules (never break these)

### Secrets
- **NEVER** put a Supabase `service_role` / `sb_secret_...` key, database password,
  or email/SMTP credential in frontend code or any `VITE_` variable. `VITE_` values
  are public in the shipped build. The frontend only ever holds the publishable/anon key.
- Server credentials live **only** in Supabase Edge Function secrets
  (`supabase secrets set ...`) or GitHub repository secrets. Never in the repo.
- Never commit `.env` files with real values. `.env.example` files carry placeholders only.

### Database
- **Every** table in the exposed schema has Row Level Security enabled **and** policies.
  A table without RLS policies is a data leak, not a feature.
- Schema changes happen **only** through new migration files in `supabase\migrations\`.
  Never edit a migration that has already been applied. Add a new one.
- RLS is the security boundary. Frontend route guards and role checks are UX only —
  they do not protect data. Never rely on them for security.

### Verification (a task is not done until all pass)
- `npm run lint` — no warnings or errors
- `npm test` — all tests pass
- `npm run build` — production build succeeds
- For database work: the migration applies cleanly (`supabase db push` or SQL editor), and
  the behavior is verified with two accounts/roles (see `docs\07`).

### Code
- Frontend is **JavaScript** (`.js` plain logic, `.jsx` React). Do not introduce TypeScript
  into the frontend. Supabase Edge Functions stay `.ts` (Deno convention).
- Follow the folder map exactly (`docs\02`). New features are added as a feature chain:
  `pages → components → hooks → services → supabase`, never sideways into another feature.
- No dead code, no commented-out blocks, no TODO graveyard. Delete what is unused.

---

## 4. Standard workflow for ANY task

1. **Understand** — Read the files you will touch. Read the matching docs. If the task
   needs a database change, design the table/policy/function first on paper.
2. **Plan** — List the exact files to create/edit and in what order (migration → service →
   hook → component → page → tests → docs). State security implications explicitly.
3. **Implement** — Small consistent steps. Keep the look, naming and patterns of the
   existing code. Reuse before you create.
4. **Verify** — Run lint, tests, build. For DB/user-visible changes, walk the feature as a
   user would (both happy path and error path). Use two roles when permissions are involved.
5. **Report** — Summarize: what changed, which files, how it was verified, what the user
   must do manually (Supabase dashboard steps, env vars, secrets), and any follow-ups.

Do not skip step 4. "It should work" is not verification.

---

## 5. Task → where to look

| Task | Start here |
| --- | --- |
| Start a new system | `docs\01-START-NEW-PROJECT.md`, then copy `template\` |
| Add a page | `docs\02` (folder map) + `docs\03` (page/hook/service pattern) + `docs\06` (design) |
| Add a database table | `docs\04` (schema + RLS pattern) + migration in `template\supabase\migrations\20261019000000_init_profiles_and_items.sql` as the model |
| Add an admin/staff endpoint | `docs\04` + `template\supabase\functions\staff-endpoint-template\index.ts` |
| Add a public endpoint (no login) | `docs\04` + `template\supabase\functions\public-endpoint-template\index.ts` + `docs\05` public-endpoint checklist |
| Permissions / roles | `template\src\routes\roles.js`, `guards.jsx`, `docs\05` |
| File uploads | `docs\04` "Storage" section + `docs\05` upload rules |
| Build/deploy changes | `docs\08` |
| Review before shipping | `docs\07` Definition of Done + `prompts\03-SECURITY-AUDIT-PROMPT.md` + `skills\security\trailofbits\` |
| UI look and feel | `docs\06` — tokens and patterns; never invent colors |
| New page / visual direction | `skills\design-intelligence\anthropic-frontend-design\SKILL.md` + `ui-ux-pro-max` + `vercel-web-design-guidelines` |
| Animation / motion | `skills\design-animation\emilkowalski\animate\SKILL.md` → `animation-performance` → `review-animations` |
| Complex or long task | `skills\workflow\superpowers\brainstorming\SKILL.md` → `writing-plans` → `executing-plans`; add `skills\workflow\planning-with-files\SKILL.md` for 5+ tool-call sessions |
| Security audit | `skills\security\trailofbits\audit-context-building` → `differential-review` / `sharp-edges` → `supply-chain-risk-auditor` → `fp-check` |
| Browser testing | `skills\engineering\anthropic-webapp-testing\SKILL.md` |

---

## 6. What to never do (quick list)

- Never put secrets in `VITE_` variables or the repo.
- Never disable RLS to "make it work", and never add a "temporary" open policy.
- Never trust the frontend: validate and authorize on the server (RLS / RPC / Edge Function).
- Never download a whole table and filter in the browser. Filter/paginate on the server.
- Never create a modal, button style or color outside the design system (`docs\06`).
- Never edit applied migrations; never rewrite history in the database.
- Never commit `node_modules`, `dist`, or local `.env` files.
- Never mark a task done with failing lint/tests/build.
- Never invent features the user did not ask for. Build what was requested, well.

---

## 7. Keeping this kit alive

When you learn something during a project that will matter to the *next* project
(a security fix, a deployment gotcha, a better pattern), update the matching doc here
at the end of the task and note it in your report. If you add, remove or update a
skill in `skills\`, record its repository, pinned commit and license in
`skills\SOURCES.md`. This kit is only as good as its last update.

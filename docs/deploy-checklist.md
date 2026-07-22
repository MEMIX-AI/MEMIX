# Pre-deploy checklist

This is the runbook for the first real deploy — SQLite → Supabase Postgres,
local `/storage` → Supabase Storage, and the Vercel deploy order. **Nothing
in this doc has been executed.** Deploy only happens on explicit owner
instruction, per CLAUDE.md.

---

## 1. Database: SQLite → Supabase Postgres

The schema was written to stay portable (see CLAUDE.md STACK) — no
SQLite-only features are used, so this is a provider swap, not a rewrite.

1. Create a Supabase project, grab the Postgres connection string
   (`postgresql://...`) from Project Settings → Database. Use the
   **connection pooler** string (port 6543, `?pgbouncer=true`) for the app's
   `DATABASE_URL`, and the **direct** connection string (port 5432) for
   migrations — Prisma's migration engine needs a direct connection.
2. In `prisma/schema.prisma`, change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Double-check the two known SQLite/Postgres portability gaps called out in
   the code before migrating data:
   - `lib/search.ts`'s `searchAssets()` uses Prisma `contains` filters.
     SQLite's `LIKE` is case-insensitive by default; Postgres's isn't — add
     `mode: "insensitive"` to each `contains` filter (title, description,
     tag name) or search will silently become case-sensitive.
   - Everything else (types, enums, relations) is standard Prisma and needs
     no changes.
4. Regenerate migrations against Postgres from a clean state (don't try to
   replay the SQLite migration history against Postgres):
   ```bash
   rm -rf prisma/migrations
   npx prisma migrate dev --name init_postgres
   ```
5. Real user data only exists in whatever `dev.db` you were running locally
   — there is no production dataset to migrate yet. If that changes before
   this checklist is used, add a `pg_dump`/`prisma db seed`-equivalent data
   migration step here first.
6. **Do not** run `prisma/seed.ts` against the Supabase database — it's
   dev-only and throws if `NODE_ENV=production`, but don't rely on that
   guard alone; just never point `npx prisma db seed` at a prod
   `DATABASE_URL`. See §4 below.

## 2. File storage: local `/storage` → Supabase Storage

All file I/O already goes through the one `StorageAdapter` interface in
`lib/storage.ts` (`save` / `getUrl` / `delete`) — nothing else touches `fs`
directly, so this is a one-file swap, not a repo-wide change.

1. Create a Supabase Storage bucket (e.g. `memevault-assets`). Decide public
   vs. signed-URL access — the current local adapter serves everything
   through a public route (`/api/storage/[...key]`) with a status/ban
   visibility check (see below), so a **public bucket** is the closest match
   and avoids re-deriving signed-URL expiry logic.
2. Implement `SupabaseStorageAdapter implements StorageAdapter` next to
   `LocalStorageAdapter` in `lib/storage.ts`:
   - `save()`: upload the buffer to the bucket via
     `@supabase/supabase-js`'s `storage.from(bucket).upload(key, buffer, { contentType })`.
   - `getUrl()`: return the bucket's public URL for that key
     (`storage.from(bucket).getPublicUrl(key)`), not a local `/api/storage/`
     path.
   - `delete()`: `storage.from(bucket).remove([key])`.
3. Swap the exported `storage` singleton to the new adapter (behind an env
   check, e.g. `storage = process.env.SUPABASE_URL ? new SupabaseStorageAdapter() : new LocalStorageAdapter()`).
4. **Carry over the visibility check, don't drop it.** `app/api/storage/[...key]/route.ts`
   currently re-checks that a key's owning `Asset` is `ACTIVE` and its
   uploader isn't banned before serving bytes — added specifically so a
   takedown actually revokes access, not just hides the listing. If Supabase
   Storage URLs are public, that check has to move somewhere it still runs
   on every fetch: either keep serving through a proxy route that does this
   check before redirecting to the Supabase URL, or switch to **signed URLs
   with a short expiry** minted fresh (post-visibility-check) by
   `getUrl()`/a new `getSignedUrl()` method instead of permanent public URLs.
   Don't ship permanent public Supabase URLs without solving this — it's the
   same bug this phase just fixed for local storage, reappearing on the new
   backend.
5. Existing local files in `/storage` (gitignored, dev-only fixtures) don't
   need migrating — there's no real production upload history yet.

## 3. Required environment variables

All of these are read server-side except the one marked `NEXT_PUBLIC_`.
None are committed — `.env` is gitignored; use `.env.example` as the
template and Vercel's Environment Variables UI for the real values.

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres (pooled) connection string post-migration |
| `ADMIN_WALLETS` | yes | Comma-separated wallet addresses — sole source of truth for admin access (CLAUDE.md PERAN & AKSES). Empty means **no admin panel access at all** — set this before the first deploy, not after. |
| `SESSION_SECRET` | yes | Signs session JWTs. Generate a real random value — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — never reuse the local dev value. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | recommended | From cloud.walletconnect.com. Needed for mobile/WalletConnect wallets in ConnectKit; injected wallets (MetaMask extension) work without it. |
| `ANTHROPIC_API_KEY` | optional | Powers The Librarian (`/api/librarian`). Without it, the endpoint returns 503 and the chat widget shows a "not configured" message — everything else on the site works fine without it. |
| `COPYRIGHT_EMAIL` | recommended | Public contact address for formal legal/copyright notices, shown on `/tos`. Without it, the ToS page just says a contact address isn't configured yet — the in-app report system still works regardless. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (or equivalent) | yes, once storage migrates | Whatever `SupabaseStorageAdapter` (§2) ends up needing — name these to match what you actually implement. |

## 4. Pre-deploy safety checks (re-run this list before every prod deploy)

- [ ] `prisma/seed.ts` is never invoked against `DATABASE_URL` pointed at
      production — it's guarded to throw on `NODE_ENV=production`, and it's
      not wired into `build`/`start`/`postinstall` in `package.json`, but
      confirm no CI step calls `prisma migrate dev` (which auto-seeds)
      against prod — only `prisma migrate deploy` (which never seeds)
      should touch the production database.
- [ ] `ADMIN_WALLETS` is set in the Vercel environment **before** the first
      deploy goes live — otherwise there's a window where the deployed app
      has no working admin panel.
- [ ] `SESSION_SECRET` is a freshly generated value, not copied from `.env`.
- [ ] No `.env` file is committed (`git status` should show it untracked;
      `.gitignore` already excludes it — don't remove that entry).
- [ ] `next build` and `next lint` both pass clean.
- [ ] The storage visibility check (§2 step 4) is actually wired up on
      whatever serves files in production — don't deploy with a takedown
      that doesn't actually revoke the file URL.

## 5. Vercel deploy order

1. Push the repo to GitHub (or whatever git remote Vercel will pull from).
2. Create the Supabase project and run the Postgres migration (§1) *before*
   the first deploy — the app has no working DB otherwise.
3. Import the repo into Vercel, framework preset "Next.js" (auto-detected).
4. Set every env var from §3 in Vercel's Project Settings → Environment
   Variables, for the **Production** environment (and Preview, if you want
   preview deploys to work against the same or a separate Supabase
   project — recommend a separate one so preview traffic can't pollute
   prod data).
5. Set the build command to the default (`next build`) — no custom build
   step is needed; `prisma generate` runs automatically via the `postinstall`
   most Prisma+Next templates use, but this project doesn't currently have
   one, so confirm `@prisma/client` is generated at build time (add a
   `"postinstall": "prisma generate"` script to `package.json` if the build
   fails on a missing/stale Prisma client).
6. Deploy. First deploy will run migrations only if you've wired a release
   step to do so (`prisma migrate deploy`) — otherwise run it manually once,
   pointed at the production `DATABASE_URL`, before or right after the first
   deploy.
7. Smoke test immediately after the first deploy: sign in with an
   `ADMIN_WALLETS` wallet, confirm `/admin` loads; upload a test asset as a
   non-admin wallet and confirm it's visible in `/library`; hit
   `/api/v1/trending` with no key and confirm the expected 401.
8. Only after that smoke test passes, announce/link the production URL.

---

**Stop condition, repeated from the phase instructions:** this checklist is
reference material for when the owner explicitly says "deploy." Nothing
above should be executed as part of writing this document.

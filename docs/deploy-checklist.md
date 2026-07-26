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
   **This is not optional/cosmetic**: every single `/api/v1/*` and
   `/api/librarian` request now writes to Postgres on every call (the
   `RateLimitBucket` upsert — see `lib/rate-limit.ts`), and every file
   download writes a `DownloadEvent` row too (see §"Data retention"
   below). Running that request volume against the direct connection
   instead of the pooler is exactly the scenario `pgbouncer` pooling
   exists for — skipping it risks exhausting Postgres's connection limit
   under real traffic, not just a theoretical best practice.
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

   > **Gotcha actually hit doing this (2026-07-26): both `migrate dev` and
   > `db push` hang indefinitely (no error, no timeout) against Supabase's
   > transaction-mode pooler (port 6543, `?pgbouncer=true`).** DDL
   > (`CREATE TABLE` etc.) needs session-level state that PgBouncer's
   > transaction pooling doesn't provide — the underlying protocol
   > exchange just stalls instead of erroring cleanly. Confirmed the
   > pooler and the database itself were both fine the whole time (raw
   > `pg` client connected and queried successfully on both :5432 and
   > :6543 in under a second) — this is specifically a Prisma-CLI
   > DDL-over-pooler limitation, not a network/credentials problem.
   > **Fix**: run schema-changing commands (`db push`, `migrate dev`,
   > `migrate deploy`) with `DATABASE_URL` temporarily pointed at the
   > **direct/session connection (port 5432)** instead of the pooler —
   > e.g. `DATABASE_URL="<the :5432 URL>" npx prisma db push`. Schema
   > `directUrl` (used for `migrate dev`'s shadow database) does **not**
   > cover this — `db push` doesn't use `directUrl` at all, and
   > `migrate dev`'s actual "apply the migration" step still goes through
   > the main `url`. The app's real `.env` `DATABASE_URL` should stay on
   > the pooler (:6543) for normal runtime traffic — only override it
   > for one-off schema commands.
5. Real user data only exists in whatever `dev.db` you were running locally
   — there is no production dataset to migrate yet. If that changes before
   this checklist is used, add a `pg_dump`/`prisma db seed`-equivalent data
   migration step here first.
6. **Do not** run `prisma/seed.ts` against the Supabase database — it's
   dev-only and throws if `NODE_ENV=production`, but don't rely on that
   guard alone; just never point `npx prisma db seed` at a prod
   `DATABASE_URL`. See §4 below.

### Data retention (two tables that grow unbounded if left alone)

- **`RateLimitBucket`** already self-prunes — `lib/rate-limit.ts` opportunistically
  deletes expired-window rows on ~1% of writes. No action needed, but if a
  future change removes that cleanup, this table is the first place to
  look for unexplained row-count growth.
- **`DownloadEvent`** does **not** self-prune yet. It powers the rolling
  7-day trending calculation (see `lib/assets.ts#getTrendingAssets`) — a
  row older than 7 days has no product purpose, but nothing currently
  deletes it. For a genuinely popular library this table grows one row
  per download, forever, which will eventually matter for both storage
  cost and the `groupBy` query's performance. Suggested policy once this
  is worth doing: prune rows older than ~90 days (kept well past the
  7-day window purely as a debugging/analytics safety margin, not because
  any product feature reads data that old) — either a scheduled Vercel
  Cron Job hitting a small `/api/admin/prune-download-events`-style route,
  or the same lazy-cleanup-on-write pattern `RateLimitBucket` already
  uses. Not implemented yet — this is a note to revisit, not a blocker.

## 2. File storage: local `/storage` → Supabase Storage

> ### 🛑 BLOCKER — bucket must be PRIVATE, not public
>
> **Do not create a public Supabase Storage bucket for this project.** A
> public bucket's URL is permanent and unauthenticated — nothing ever
> checks it again after it's handed out. That's exactly the bug this
> project already found and fixed once for local storage (a taken-down
> asset's direct file URL kept working forever, because the URL itself
> never expired and nothing re-checked it). A public Supabase bucket
> reintroduces the identical bug on the new backend, permanently, with no
> code-level fix possible after the fact — the bucket setting itself is
> the vulnerability.
>
> **Mandatory manual verification after this migration, before announcing
> the deploy is done:**
> 1. Take down one asset via the admin panel (any reason).
> 2. Try to fetch that asset's raw file URL directly (not through the
>    app — paste the actual storage URL into a fresh browser tab or curl
>    it with no other requests first).
> 3. It **must be rejected** (403/404, or already-expired if it's a
>    signed URL). If it loads the file, the bucket is misconfigured as
>    public (or something is caching/reusing a stale signed URL) — stop
>    and fix this before considering the deploy live, even if every other
>    smoke test in §5 step 7 passes.

All file I/O already goes through the one `StorageAdapter` interface in
`lib/storage.ts` (`save` / `getUrl` / `delete`) — nothing else touches `fs`
directly, so swapping backends is a small, contained change. The design
below is already written and type-checked in `lib/storage.ts` — see
`SupabaseStorageAdapter` there — this section is about *activating* it,
not designing it from scratch.

1. Create a Supabase Storage bucket (e.g. `memix-assets`) and mark it
   **private**. Do not toggle it public at any point, including
   temporarily for testing — see the blocker above.
2. `SupabaseStorageAdapter` in `lib/storage.ts` is already implemented
   against this assumption:
   - `save()` uploads to the bucket and returns `{ key, size }` — never a
     URL. `Asset.fileUrl`/`Asset.thumbnailUrl` store this bare key, not a
     path — see the long comment at the top of `lib/storage.ts` for why.
   - `getUrl(key)` mints a **60-second signed URL**, fresh, every call —
     never cached, never persisted anywhere. Every caller that needs an
     actual fetchable URL goes through `lib/asset-urls.ts`
     (`resolveAssetUrls`/`resolveAssetUrlsMany`), which is already wired
     into every page and API route that renders or serves a file — you
     shouldn't need to touch those call sites again for this migration.
   - `delete()` removes the object from the bucket.
3. Activate it: set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
   `SUPABASE_STORAGE_BUCKET` (see §3), then change the `storage` export at
   the bottom of `lib/storage.ts` from `new LocalStorageAdapter()` to
   `new SupabaseStorageAdapter()`.
4. **Two call sites still assume local storage and need attention at
   activation time**, both because they use `LocalStorageAdapter`'s extra
   `.read()` method (reading raw bytes off local disk), which has no
   Supabase equivalent and isn't part of the `StorageAdapter` interface:
   - `app/api/assets/[id]/download/route.ts` — currently reads the file
     locally and streams it back with a `Content-Disposition` header so
     the browser downloads it with a clean filename. Against Supabase,
     redirect to `await storage.getUrl(asset.fileUrl)` instead (a 307 to
     the signed URL) — decide first whether losing the clean-filename
     `Content-Disposition` behavior is acceptable, or whether it's worth
     proxy-fetching the bytes through this route instead of redirecting.
   - `app/api/storage/[...key]/route.ts` — this whole route is
     local-storage-specific (it's the thing that makes a "permanent" local
     path safe, by re-checking status on every fetch). It becomes dead
     code once Supabase is active; nothing should link to it anymore.
5. Existing local files in `/storage` (gitignored, dev-only fixtures) don't
   need migrating — there's no real production upload history yet.
6. **Performance note, not yet solved**: pages that render a list of
   assets (e.g. `/library`) resolve one signed URL per asset today via
   `Promise.all` in `lib/asset-urls.ts`. That's fine for local storage
   (near-zero cost) but means N round trips to Supabase per page load
   once that adapter is active. Supabase's storage API supports
   `createSignedUrls` (plural, batched) — worth switching to once this
   adapter is actually live and real page sizes are known, rather than
   guessing at a batching scheme against a bucket that doesn't exist yet.

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
| `SUPABASE_URL` | yes, once storage migrates | Project URL, used by `SupabaseStorageAdapter` (§2, already implemented in `lib/storage.ts`). |
| `SUPABASE_SERVICE_ROLE_KEY` | yes, once storage migrates | **Service role, not anon/public key** — the adapter needs it to upload/delete/sign URLs server-side. Never expose this one to the client. |
| `SUPABASE_STORAGE_BUCKET` | yes, once storage migrates | Name of the **private** bucket (§2) — e.g. `memix-assets`. |

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
- [ ] **BLOCKER**: if storage has migrated to Supabase, the bucket is
      **private**, and the manual takedown-then-fetch verification in §2's
      blocker box has actually been run and passed — not just assumed
      from the code. This is the single most important check on this
      list; a public bucket makes every other item here irrelevant to the
      one legal requirement (CLAUDE.md POSISI LEGAL #4) that takedown
      actually works.
- [ ] The connection string in `DATABASE_URL` is the **pooled** one
      (§1 step 1), not the direct connection — every API request now
      writes to the database (rate limiting, download events).

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
   `/api/v1/trending` with no key and confirm the expected 401; **if
   storage has migrated to Supabase, also run the takedown-then-fetch
   verification from §2's blocker box right now, on this real deploy —
   don't defer it.**
8. Only after that smoke test passes, announce/link the production URL.

---

**Stop condition, repeated from the phase instructions:** this checklist is
reference material for when the owner explicitly says "deploy." Nothing
above should be executed as part of writing this document.

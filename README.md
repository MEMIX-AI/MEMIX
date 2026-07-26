# memix

A free, user-generated meme library — images, video, sound — with an AI
agent librarian ("The Librarian") as its search-and-recommend front door.
Anyone can browse, search, and download without an account, a wallet, or
payment; connecting a wallet is only needed to upload.

See [`CLAUDE.md`](./CLAUDE.md) for the full product brief, legal posture,
and mandatory design system — read it before working on any phase, it
overrides default behavior.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- SQLite via Prisma (local dev — migrates to Postgres/Supabase at deploy,
  see [`docs/deploy-checklist.md`](./docs/deploy-checklist.md))
- Local `/storage` folder for uploaded files (migrates to Supabase Storage
  at deploy)
- wagmi + viem + ConnectKit for wallet identity (Base chain), hand-rolled
  SIWE-style sign-in — wallets are identity-only, no payments in this phase
- `@anthropic-ai/sdk` (Claude) for The Librarian chat agent

## Getting started

```bash
npm install
cp .env.example .env   # fill in at least SESSION_SECRET (see below)
npx prisma migrate dev # creates prisma/dev.db and applies the schema
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Browsing, searching,
and downloading all work immediately with an empty database — you'll just
see empty-library messaging until something's uploaded.

### Environment variables

Copy `.env.example` to `.env` and fill in what you need. Only
`SESSION_SECRET` is required to run the app at all; everything else has a
graceful fallback if left blank:

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | Already defaults to local SQLite (`file:./dev.db`) — no change needed for local dev. |
| `SESSION_SECRET` | **Required.** Signs session cookies. Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_WALLETS` | Comma-separated wallet addresses that get admin panel access (`/admin`). Empty = no admin access for anyone. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Mobile/WalletConnect wallet support in ConnectKit. Injected wallets (MetaMask extension) work without it. |
| `ANTHROPIC_API_KEY` | The Librarian chat widget. Without it, the widget shows a clear "not configured" message — the rest of the site is unaffected. |
| `COPYRIGHT_EMAIL` | Contact address shown on `/tos` for formal legal/copyright notices. Optional — the in-app report system works either way. |

### Seeding fixture data

```bash
npx prisma db seed
```

Populates a handful of fixture assets (images/video/sound) so the library
UI has something to render locally. **Dev-only** — `prisma/seed.ts` refuses
to run if `NODE_ENV=production`, and it's never wired into any build/start
script. Never point it at a real database.

### Database inspection

```bash
npx prisma studio
```

## Testing wallet sign-in locally without a browser extension

The app needs a real wallet signature to sign in, but you don't need
MetaMask installed to test it — sign a message with any EOA private key
(e.g. via `viem/accounts`) against a nonce fetched from `/api/auth/nonce`,
then POST the result to `/api/auth/verify`. See the SIWE flow in
`lib/siwe-message.ts` / `app/api/auth/verify/route.ts` for the exact
message format.

## Folder structure

```
/app
  /api            route handlers — auth, uploads, admin actions, /api/v1/*
  /admin          admin panel pages (reports, assets, users, logs)
  /asset/[id]     public asset detail page
  /library        public browse/search page
  /upload         upload form (wallet-gated)
  /my-uploads     creator's own uploads + API key management
/components       React components (cards, forms, admin widgets, the librarian chat)
/lib              shared logic — prisma client, storage adapter, auth/session,
                  search, upload validation, rate limiting, the librarian's
                  system prompt and tools
/prisma           schema.prisma, migrations, dev-only seed script
/storage          uploaded files (gitignored, local dev only)
/docs             api.md (REST API v1 reference), acp-plan.md (future paid
                  agent-commerce layer — planning only, not implemented),
                  deploy-checklist.md (SQLite→Supabase / Vercel deploy runbook)
```

## Programmatic access

A free, rate-limited (`FREE_DEV`: 100 req/day) REST API exists at
`/api/v1/*` for read-only programmatic access — see
[`docs/api.md`](./docs/api.md) for endpoints and curl examples. Generate a
key at `/my-uploads/api-key` (requires a connected wallet). Paid tiers and
an agent-commerce (ACP) layer are planned but not built — see
[`docs/acp-plan.md`](./docs/acp-plan.md).

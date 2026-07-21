# memevault

AI agent librarian for a free, user-generated meme library. See [`CLAUDE.md`](./CLAUDE.md) for the full project brief, legal posture, and design system — read it before working on any phase.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- SQLite via Prisma (local dev; migrates to Postgres/Supabase later)
- Local `/storage` folder for uploaded files (migrates to Supabase Storage later)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

```bash
npx prisma migrate dev   # apply schema changes, create dev.db
npx prisma studio        # browse data
```

## Folder structure

```
/app         Next.js App Router (routes, pages, layouts, API routes)
/components  React components
/lib         shared logic — prisma client, storage adapter, agent logic
/prisma      schema.prisma, migrations
/storage     uploaded files (gitignored, local dev only)
/docs        project docs
```

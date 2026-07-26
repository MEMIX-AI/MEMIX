import { NextResponse } from "next/server";

// Dead code now that Supabase Storage is the active adapter (see
// lib/storage.ts) — files are served directly via short-lived signed
// URLs from lib/asset-urls.ts, not proxied through this app route
// anymore. This route only ever existed to make LocalStorageAdapter's
// "permanent" local path safe (re-checking the owning Asset's
// visibility on every fetch, since a local path never expires on its
// own) — a private Supabase bucket's signed URL expires by itself
// instead, so nothing should be requesting this path in production.
// Kept as an inert 404 (not deleted) so a future local-dev fallback to
// LocalStorageAdapter has something to restore rather than recreate.
export async function GET() {
  return NextResponse.json({ error: "not found" }, { status: 404 });
}

import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// All file I/O for uploaded assets must go through a StorageAdapter —
// nothing else should touch `fs` directly. This keeps the move to
// Supabase Storage a one-file change (see CLAUDE.md PRINSIP KODE).
//
// IMPORTANT: `save()` returns a storage KEY, never a resolved URL — and
// `Asset.fileUrl` / `Asset.thumbnailUrl` in the database store that same
// bare key, not a path. A URL is only ever produced by `getUrl(key)`,
// computed fresh at the moment something needs to actually be fetched.
// This split exists specifically for SupabaseStorageAdapter below: a
// private bucket's "URL" is a signed link that expires in seconds, so
// persisting one anywhere (a database row, a cached page) would be
// broken almost immediately. Baking a resolved URL into the DB at upload
// time — the way this file used to work — only happens to be safe for
// local storage, because the local serving route independently re-checks
// the owning Asset's visibility on every single fetch (see
// app/api/storage/[...key]/route.ts). A private Supabase bucket has no
// equivalent per-fetch hook once a URL is public, so instead the URL
// itself has to expire — which means it can never be treated as a
// permanent, cacheable value.
//
// Practical consequence for callers: never read `asset.fileUrl` /
// `asset.thumbnailUrl` straight into a rendered `<img>`/`<video>` src or
// an API response. Always resolve it first via `lib/asset-urls.ts`
// (`resolveAssetUrls` / `resolveAssetUrlsMany`), and only ever do that
// resolution after the surrounding code has already confirmed the asset
// is currently visible (ACTIVE, uploader not banned) — resolving a URL is
// "yes, serve this right now," not a plain lookup.

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  /** Optional folder prefix inside the storage root, e.g. "thumbnails". */
  folder?: string;
}

export interface SavedFile {
  key: string;
  size: number;
}

export interface StorageAdapter {
  save(file: UploadInput): Promise<SavedFile>;
  /**
   * Resolves a storage key to an actually-fetchable URL. Async because a
   * private-bucket backend needs a network round trip to mint a signed
   * URL — never persist the return value, call it fresh at serve time.
   *
   * `downloadFilename`, when given, asks the backend to set a
   * Content-Disposition that triggers a download with that filename
   * (used by the human-facing download route) instead of an inline
   * fetch (used when rendering thumbnails/media).
   */
  getUrl(key: string, options?: { downloadFilename?: string }): Promise<string>;
  delete(key: string): Promise<void>;
}

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function resolveKey(key: string): string {
  const resolved = path.join(STORAGE_ROOT, key);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return resolved;
}

function extensionFor(originalName: string): string {
  const ext = path.extname(originalName);
  return ext || "";
}

// Local filesystem implementation, backed by the gitignored /storage
// folder. Files are served back out through /api/storage/[...key], which
// is what actually enforces "a taken-down asset's file stops being
// fetchable" for this adapter — see that route for the visibility check.
export class LocalStorageAdapter implements StorageAdapter {
  async save(file: UploadInput): Promise<SavedFile> {
    const key = path.posix.join(
      file.folder ?? "",
      `${randomUUID()}${extensionFor(file.originalName)}`,
    );
    const filePath = resolveKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.buffer);
    return { key, size: file.buffer.byteLength };
  }

  async getUrl(key: string): Promise<string> {
    // Stable and effectively permanent — safe only because
    // app/api/storage/[...key]/route.ts re-checks the owning Asset's
    // status on every single request. Don't copy this "permanent path"
    // pattern for a private-bucket adapter; see SupabaseStorageAdapter.
    // (downloadFilename is a no-op here — this route was never wired to
    // set Content-Disposition from a query param, and this adapter is
    // no longer the active one now that Supabase Storage is live.)
    return `/api/storage/${key}`;
  }

  async delete(key: string): Promise<void> {
    await unlink(resolveKey(key)).catch(() => undefined);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(resolveKey(key));
  }
}

const SIGNED_URL_EXPIRY_SECONDS = 60;

/**
 * Design target for the Supabase Storage migration (see
 * docs/deploy-checklist.md §2 — it's a BLOCKER item there, not optional
 * polish). Not active yet: the exported `storage` singleton below stays
 * `LocalStorageAdapter` until `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
 * / `SUPABASE_STORAGE_BUCKET` are set AND the two call sites that still
 * use the local-only `.read()` method (the download route and, if it's
 * ever reintroduced, a local proxy route) are updated to redirect to
 * `getUrl()`'s signed URL instead of reading bytes off local disk.
 *
 * ASSUMES A PRIVATE BUCKET — this is the whole point of this class. A
 * public bucket's URL never expires and is never re-checked by anything
 * once handed out, which is exactly the takedown-bypass bug this project
 * already found and fixed once for local storage (see the git history on
 * app/api/storage/[...key]/route.ts). A private bucket has no local
 * per-fetch hook to reuse, so instead `getUrl()` mints a signed URL good
 * for `SIGNED_URL_EXPIRY_SECONDS` — computed fresh on every call, never
 * cached or persisted. As long as callers only ever call this through
 * `lib/asset-urls.ts` (which they should — see the note at the top of
 * this file), the "check status, then resolve" ordering the private
 * bucket needs is already guaranteed by how the app is structured, not by
 * anything inside this class.
 *
 * Known follow-up, not solved by this class alone: a list of N assets
 * (e.g. the /library grid) resolves N signed URLs one at a time today via
 * Promise.all in lib/asset-urls.ts. Supabase's storage API supports
 * `createSignedUrls` (plural) to batch-sign a whole list in one round
 * trip — worth switching to once this adapter is actually live and the
 * per-page URL count is known, rather than guessing at a batching scheme
 * against a bucket that doesn't exist yet.
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  private readonly bucket: string;
  private readonly client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;
    if (!url || !serviceKey || !bucket) {
      throw new Error(
        "SupabaseStorageAdapter needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET set.",
      );
    }
    this.client = createClient(url, serviceKey);
    this.bucket = bucket;
  }

  async save(file: UploadInput): Promise<SavedFile> {
    const key = path.posix.join(
      file.folder ?? "",
      `${randomUUID()}${extensionFor(file.originalName)}`,
    );
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, file.buffer, { contentType: file.mimeType });
    if (error) {
      throw new Error(`Supabase upload failed for ${key}: ${error.message}`);
    }
    return { key, size: file.buffer.byteLength };
  }

  async getUrl(key: string, options?: { downloadFilename?: string }): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(
        key,
        SIGNED_URL_EXPIRY_SECONDS,
        options?.downloadFilename ? { download: options.downloadFilename } : undefined,
      );
    if (error || !data) {
      throw new Error(`Supabase signed URL failed for ${key}: ${error?.message ?? "unknown error"}`);
    }
    return data.signedUrl;
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) {
      throw new Error(`Supabase delete failed for ${key}: ${error.message}`);
    }
  }
}

export const storage: StorageAdapter = new SupabaseStorageAdapter();

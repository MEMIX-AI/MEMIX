import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// All file reads/writes for uploaded assets must go through a
// StorageAdapter — nothing else should touch `fs` directly. This keeps the
// move to Supabase Storage a one-file change (see CLAUDE.md PRINSIP KODE).

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  /** Optional folder prefix inside the storage root, e.g. "thumbnails". */
  folder?: string;
}

export interface SavedFile {
  key: string;
  url: string;
  size: number;
}

export interface StorageAdapter {
  save(file: UploadInput): Promise<SavedFile>;
  getUrl(key: string): string;
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
// folder. Files are served back out through /api/storage/[...key].
//
// TODO: swap to SupabaseStorageAdapter when deploying — same interface,
// `save` uploads to a Supabase Storage bucket and `getUrl` returns the
// bucket's public/signed URL instead of the local API route.
export class LocalStorageAdapter implements StorageAdapter {
  async save(file: UploadInput): Promise<SavedFile> {
    const key = path.posix.join(
      file.folder ?? "",
      `${randomUUID()}${extensionFor(file.originalName)}`,
    );
    const filePath = resolveKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.buffer);
    return { key, url: this.getUrl(key), size: file.buffer.byteLength };
  }

  getUrl(key: string): string {
    return `/api/storage/${key}`;
  }

  async delete(key: string): Promise<void> {
    await unlink(resolveKey(key)).catch(() => undefined);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(resolveKey(key));
  }
}

export const storage: LocalStorageAdapter = new LocalStorageAdapter();

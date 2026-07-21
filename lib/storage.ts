import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

// Local filesystem adapter for /storage. All file reads/writes for uploaded
// assets must go through this module — nothing else should touch `fs`
// directly, so swapping to Supabase Storage later is a one-file change.

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function resolveKey(key: string): string {
  const resolved = path.join(STORAGE_ROOT, key);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return resolved;
}

export async function saveFile(key: string, data: Buffer): Promise<string> {
  const filePath = resolveKey(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return key;
}

export async function readFileByKey(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

export async function deleteFile(key: string): Promise<void> {
  await unlink(resolveKey(key)).catch(() => undefined);
}

// Public URL for a stored file. Local dev serves it through an API route;
// the Supabase adapter will return a public/signed bucket URL instead.
export function getPublicUrl(key: string): string {
  return `/api/storage/${key}`;
}

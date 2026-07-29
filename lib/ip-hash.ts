import { createHash } from "crypto";

// Never store a raw IP anywhere (see UploadDeclaration.ipHash) — only ever
// the hash, and only ever produced through this one function.
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

// Deliberately typed as a bare `.get()` shape rather than `NextRequest`
// specifically — `next/headers`' `headers()` (used by Server Components,
// which have no request object of their own) implements the same shape,
// so this one function covers both a Route Handler's `req.headers` and a
// Server Component's `headers()` call.
export function getClientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const real = headers.get("x-real-ip");
  if (real) return real.trim();

  return "unknown";
}

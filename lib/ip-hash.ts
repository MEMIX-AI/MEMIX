import { createHash } from "crypto";
import type { NextRequest } from "next/server";

// Never store a raw IP anywhere (see UploadDeclaration.ipHash) — only ever
// the hash, and only ever produced through this one function.
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();

  return "unknown";
}

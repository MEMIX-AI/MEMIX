import { createHash, randomBytes } from "crypto";

const KEY_PREFIX = "mxk_";

// Plain SHA-256 (no per-key salt) is the right tool here, unlike password
// hashing — this hashes a high-entropy random token, not a low-entropy
// human secret, so there's no dictionary/rainbow-table risk to guard
// against. Same approach GitHub/Stripe-style API tokens use.
export function generateApiKey(): string {
  return KEY_PREFIX + randomBytes(24).toString("hex");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

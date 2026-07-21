import { SignJWT, jwtVerify } from "jose";

// jose (not a hand-rolled cookie signer) so this stays Edge-safe — the
// admin-route middleware needs to verify sessions without Node's `crypto`
// or any DB access.

export const SESSION_COOKIE_NAME = "mv_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const NONCE_COOKIE_NAME = "mv_nonce";
export const NONCE_MAX_AGE = 60 * 5; // 5 minutes

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET env var is not set.");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  walletAddress: string;
}

export async function createSessionToken(walletAddress: string): Promise<string> {
  return new SignJWT({ walletAddress })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.walletAddress !== "string") return null;
    return { walletAddress: payload.walletAddress };
  } catch {
    return null;
  }
}

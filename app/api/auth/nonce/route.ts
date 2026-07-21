import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { NONCE_COOKIE_NAME, NONCE_MAX_AGE } from "@/lib/session";

export async function GET() {
  const nonce = randomBytes(16).toString("hex");

  const res = NextResponse.json({ nonce });
  res.cookies.set(NONCE_COOKIE_NAME, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: NONCE_MAX_AGE,
  });
  return res;
}

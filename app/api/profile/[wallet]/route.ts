import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/profile";
import { isStorageKey } from "@/lib/asset-urls";
import { storage } from "@/lib/storage";

// Public read — no auth required. Used by the client-side navbar
// (components/WalletButton.tsx can't read a server component's props,
// so it fetches its own connected wallet's username/avatar here to show
// in the dropdown) as well as anything else that wants a profile without
// doing a full page load.
export async function GET(
  _req: NextRequest,
  { params }: { params: { wallet: string } },
) {
  const profile = await getProfile(params.wallet);
  if (!profile) {
    // Not an error — most connected wallets have never touched their
    // profile row's nullable fields. Callers should treat 404 the same
    // as "profile with all fields null."
    return NextResponse.json({ walletAddress: params.wallet.toLowerCase(), username: null, avatarUrl: null, xHandle: null, bio: null });
  }

  const avatarUrl = profile.avatarUrl && isStorageKey(profile.avatarUrl)
    ? await storage.getUrl(profile.avatarUrl).catch(() => null)
    : profile.avatarUrl;

  return NextResponse.json({
    walletAddress: profile.walletAddress,
    username: profile.username,
    avatarUrl,
    xHandle: profile.xHandle,
    bio: profile.bio,
    createdAt: profile.createdAt,
  });
}

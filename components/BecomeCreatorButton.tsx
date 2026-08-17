"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// BecomeCreatorModal pulls in wagmi/connectkit (wallet connect + SIWE) —
// same reason components/marketplace/BuyButtonLoader.tsx and
// components/Navbar.tsx's wallet button are code-split instead of
// imported directly: shipping that bundle to every /creators visitor,
// most of whom never click this button, would undo the bundle-splitting
// the rest of the app already relies on. `ssr: false` needs a Client
// Component boundary, which this file already is. The actual
// WagmiProvider/ConnectKit context it reads comes from the app-wide shell
// (components/providers/AppWalletShell.tsx) — same instance the Navbar
// uses, so an already-connected wallet shows up as connected here too.
const BecomeCreatorModal = dynamic(
  () => import("@/components/BecomeCreatorModal").then((m) => m.BecomeCreatorModal),
  { ssr: false },
);

const VARIANT_CLASS: Record<Variant, string> = {
  hero: "gradient-brand flex items-center gap-2 rounded-[13px] px-[26px] py-[14px] text-[15px] font-semibold text-white shadow-glow transition-transform duration-200 hover:-translate-y-0.5",
  sidebar:
    "flex w-fit items-center gap-2 rounded-[12px] bg-black/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-black/30",
  empty:
    "gradient-brand mt-1 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow",
};

type Variant = "hero" | "sidebar" | "empty";

// Replaces the 3 plain `<Link href="/upload">Become a Creator</Link>`
// spots on app/creators/page.tsx (hero, sidebar CTA, empty state). A
// signed-in wallet that already completed the join flow
// (creatorOnboardedAt set, see app/api/creators/join/route.ts) never sees
// the registration modal again — it goes straight to its own profile.
export function BecomeCreatorButton({
  variant,
  isCreator,
  walletAddress,
}: {
  variant: Variant;
  isCreator: boolean;
  walletAddress: string | null;
}) {
  const [open, setOpen] = useState(false);
  const className = VARIANT_CLASS[variant];

  if (isCreator && walletAddress) {
    return (
      <Link href={`/u/${walletAddress}`} className={className}>
        Go to my profile
        <ArrowRight size={variant === "hero" ? 16 : 15} strokeWidth={1.75} />
      </Link>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        Become a Creator
        <ArrowRight size={variant === "hero" ? 16 : 15} strokeWidth={1.75} />
      </button>
      {open && <BecomeCreatorModal onClose={() => setOpen(false)} />}
    </>
  );
}

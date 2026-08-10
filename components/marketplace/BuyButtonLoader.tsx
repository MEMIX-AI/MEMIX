"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// BuyButton pulls in wagmi's write-contract machinery — same reason
// components/Navbar.tsx code-splits the wallet connect button instead of
// importing it directly: shipping that to every /asset/[id] visitor,
// including the vast majority who'll never see a "for sale" asset, would
// undo the exact bundle-splitting this app already relies on elsewhere.
// `ssr: false` needs a Client Component boundary in the App Router (the
// asset detail page itself is a Server Component), which is the only
// reason this thin wrapper exists.
export const BuyButton = dynamic(() => import("./BuyButton").then((m) => m.BuyButton), {
  ssr: false,
  loading: () => (
    <button
      disabled
      className="gradient-brand flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-soft opacity-70"
    >
      <Loader2 size={17} strokeWidth={1.75} className="animate-spin" />
      loading…
    </button>
  ),
});

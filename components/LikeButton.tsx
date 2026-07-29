"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { likeStore } from "@/lib/asset-stats-store";

const CLIENT_ID_KEY = "mv_client_id";

// No wallet/login required — identity is a random id generated once per
// browser and kept in localStorage, sent as `clientId` to the like route.
// Reused as-is if already present so repeat visits stay 1 browser = 1 like.
function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function LikeButton({
  assetId,
  initialCount,
  size = "sm",
}: {
  assetId: string;
  initialCount: number;
  size?: "sm" | "lg";
}) {
  // Shared across every card/detail-page instance showing this same asset
  // on this same page — toggling from any one of them updates them all
  // instantly, no reload (see lib/asset-stats-store.ts).
  const { liked, count } = likeStore.useValue(assetId, { liked: false, count: initialCount });
  const [pending, setPending] = useState(false);

  // The server can't tell "has this browser liked this" anymore (no
  // wallet/session tied to it) — the browser is the only place that
  // knows, so correct it from localStorage after mount. This means the
  // heart can briefly render unfilled-then-filled on load for a
  // previously liked asset; accepted tradeoff for dropping the wallet
  // requirement, not an oversight.
  useEffect(() => {
    if (localStorage.getItem(`mv_liked:${assetId}`) === "1") {
      const current = likeStore.get(assetId);
      if (current && !current.liked) {
        likeStore.set(assetId, { ...current, liked: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const prev = likeStore.get(assetId) ?? { liked, count };
    const next = {
      liked: !prev.liked,
      count: prev.liked ? prev.count - 1 : prev.count + 1,
    };
    // Optimistic update — every card showing this asset updates instantly;
    // rolled back below if the request fails, so the displayed count
    // never silently drifts from the real one.
    likeStore.set(assetId, next);
    setPending(true);

    try {
      const clientId = getClientId();
      const res = await fetch(`/api/assets/${assetId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) throw new Error("like request failed");
      const data = await res.json();
      likeStore.set(assetId, { liked: data.liked, count: data.likeCount });
      localStorage.setItem(`mv_liked:${assetId}`, data.liked ? "1" : "0");
    } catch {
      likeStore.set(assetId, prev);
    } finally {
      setPending(false);
    }
  }

  const isLg = size === "lg";

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label={liked ? "unlike" : "like"}
      className={`flex items-center gap-1.5 transition-colors duration-150 disabled:opacity-70 ${
        isLg
          ? "rounded-xl border border-line bg-panel px-3.5 py-2 text-sm font-semibold text-text hover:border-accent/40"
          : "text-dim hover:text-accent"
      } ${liked ? "text-[#FF5E7A]" : ""}`}
    >
      <Heart
        size={isLg ? 16 : 13}
        strokeWidth={1.75}
        fill={liked ? "currentColor" : "none"}
        className={liked ? "text-[#FF5E7A]" : ""}
      />
      {count}
    </button>
  );
}

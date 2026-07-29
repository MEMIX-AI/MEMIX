"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

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
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  // The server can't tell "has this browser liked this" anymore (no
  // wallet/session tied to it) — the browser is the only place that
  // knows, so read it from localStorage after mount. This means the
  // heart briefly renders unfilled-then-filled on load for a previously
  // liked asset; that's an accepted tradeoff for dropping the wallet
  // requirement, not an oversight.
  useEffect(() => {
    setLiked(localStorage.getItem(`mv_liked:${assetId}`) === "1");
  }, [assetId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const prevLiked = liked;
    const prevCount = count;
    // Optimistic update — rolled back below if the request fails, so the
    // displayed count never silently drifts from the real one.
    setLiked(!prevLiked);
    setCount(prevLiked ? prevCount - 1 : prevCount + 1);
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
      setLiked(data.liked);
      setCount(data.likeCount);
      localStorage.setItem(`mv_liked:${assetId}`, data.liked ? "1" : "0");
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
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

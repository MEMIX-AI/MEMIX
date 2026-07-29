"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

export function LikeButton({
  assetId,
  initialLiked,
  initialCount,
  signedIn,
  size = "sm",
}: {
  assetId: string;
  initialLiked: boolean;
  initialCount: number;
  signedIn: boolean;
  size?: "sm" | "lg";
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!signedIn) {
      setHint(true);
      setTimeout(() => setHint(false), 2200);
      return;
    }
    if (pending) return;

    const prevLiked = liked;
    const prevCount = count;
    // Optimistic update — rolled back below if the request fails, so the
    // displayed count never silently drifts from the real one.
    setLiked(!prevLiked);
    setCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setPending(true);

    try {
      const res = await fetch(`/api/assets/${assetId}/like`, { method: "POST" });
      if (!res.ok) throw new Error("like request failed");
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.likeCount);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setPending(false);
    }
  }

  const isLg = size === "lg";

  return (
    <span className="relative inline-flex">
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
      {hint && (
        <span className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[rgba(20,50,60,0.85)] px-2.5 py-1.5 text-[11px] font-medium text-white">
          connect wallet to like
        </span>
      )}
    </span>
  );
}

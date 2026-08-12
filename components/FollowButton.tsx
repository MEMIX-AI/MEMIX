"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";

// Real follow/unfollow against the Follow table (app/api/profile/[wallet]/
// follow/route.ts) — unlike LikeButton, this requires an actual signed-in
// wallet (see that route), so an unauthenticated visitor gets a disabled
// state pointing at the wallet button instead of a fake optimistic toggle.
export function FollowButton({
  targetWallet,
  initialFollowing,
  isSignedIn,
}: {
  targetWallet: string;
  initialFollowing: boolean;
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    const next = !following;
    setFollowing(next); // optimistic — reverted below on failure
    try {
      const res = await fetch(`/api/profile/${targetWallet}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setFollowing(!next);
      } else {
        router.refresh(); // real follower count on the page comes from the server
      }
    } catch {
      setFollowing(!next);
    } finally {
      setPending(false);
    }
  }

  if (!isSignedIn) {
    return (
      <div
        title="connect your wallet (top right) to follow"
        className="flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-line bg-panel px-4 py-2.5 text-[13.5px] font-semibold text-dim opacity-70 shadow-soft"
      >
        <UserPlus size={14} strokeWidth={1.75} />
        Follow
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        following
          ? "flex items-center gap-1.5 rounded-xl border border-line bg-panel px-4 py-2.5 text-[13.5px] font-semibold text-text shadow-soft transition-all duration-200 hover:border-warn/40 hover:text-warn disabled:opacity-60"
          : "gradient-brand flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow disabled:opacity-60"
      }
    >
      {pending ? (
        <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
      ) : following ? (
        <UserCheck size={14} strokeWidth={1.75} />
      ) : (
        <UserPlus size={14} strokeWidth={1.75} />
      )}
      {following ? "Following" : "Follow"}
    </button>
  );
}

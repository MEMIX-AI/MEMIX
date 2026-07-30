"use client";

import { useEffect, useState } from "react";

interface Profile {
  username: string | null;
  avatarUrl: string | null;
}

// Fired by EditProfileModal after a successful save — the navbar's
// WalletButton has already mounted and its effect below only re-runs on
// a walletAddress change, so without this its avatar/name would stay
// stale until the next full navigation. Broadcasting a plain window
// event (rather than e.g. a context) keeps the navbar decoupled from the
// modal — it doesn't need to know the modal exists at all.
export const PROFILE_UPDATED_EVENT = "memix:profile-updated";

// Same pattern as useAccountRole — a client component (the navbar's
// WalletButton) has no access to a server component's props, so it asks
// the server for its own connected wallet's profile fields directly.
// GET /api/profile/[wallet] is a public read, so this works for anyone's
// address, not just the signed-in one, but the navbar only ever calls it
// with its own.
export function useProfile(walletAddress: string | undefined): Profile {
  const [profile, setProfile] = useState<Profile>({ username: null, avatarUrl: null });

  useEffect(() => {
    if (!walletAddress) {
      setProfile({ username: null, avatarUrl: null });
      return;
    }

    let cancelled = false;
    function load() {
      fetch(`/api/profile/${walletAddress}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          setProfile({ username: data.username ?? null, avatarUrl: data.avatarUrl ?? null });
        })
        .catch(() => {
          if (!cancelled) setProfile({ username: null, avatarUrl: null });
        });
    }

    load();
    window.addEventListener(PROFILE_UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_UPDATED_EVENT, load);
    };
  }, [walletAddress]);

  return profile;
}

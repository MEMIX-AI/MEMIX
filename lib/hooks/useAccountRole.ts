"use client";

import { useEffect, useState } from "react";

interface AccountRole {
  isAdmin: boolean;
  status: "ACTIVE" | "BANNED" | null;
}

// isAdmin/status aren't part of the SIWE session payload (just address +
// chainId), so once signed in we separately ask the server who we are.
export function useAccountRole(
  walletAddress: string | undefined,
): AccountRole {
  const [role, setRole] = useState<AccountRole>({
    isAdmin: false,
    status: null,
  });

  useEffect(() => {
    if (!walletAddress) {
      setRole({ isAdmin: false, status: null });
      return;
    }

    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setRole({ isAdmin: !!data.isAdmin, status: data.status ?? null });
      })
      .catch(() => {
        if (!cancelled) setRole({ isAdmin: false, status: null });
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  return role;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FeatureToggleButton({
  assetId,
  featured,
}: {
  assetId: string;
  featured: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch(`/api/admin/assets/${assetId}/feature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !featured }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded border px-3 py-1 text-sm disabled:opacity-50 ${
        featured
          ? "border-accent text-accent"
          : "border-line text-dim hover:border-accent"
      }`}
    >
      {featured ? "★ featured" : "☆ feature"}
    </button>
  );
}

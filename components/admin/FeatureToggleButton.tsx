"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

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
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
        featured
          ? "border border-accent/30 bg-accent/10 text-accent"
          : "border border-line bg-panel text-dim shadow-soft hover:border-accent/40"
      }`}
    >
      <Star size={13} strokeWidth={2.25} fill={featured ? "currentColor" : "none"} />
      {featured ? "featured" : "feature"}
    </button>
  );
}

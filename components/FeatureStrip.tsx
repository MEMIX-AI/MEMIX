import { Gavel, Sparkles, Coins, Store } from "lucide-react";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

const FEATURES = [
  {
    icon: Gavel,
    title: "Verdict, not just a file",
    body: "Every catalogued entry carries a real status, works-when, and avoid-when — not just a download link.",
    badge: null,
  },
  {
    icon: Sparkles,
    title: "The Librarian",
    body: "Ask in plain language, get back real search results with their verdicts attached.",
    badge: "Beta",
  },
  {
    icon: Coins,
    title: "Settle in $MIX",
    body: "Creator-shop purchases will settle in $MIX, with a stablecoin option alongside it.",
    badge: "Soon",
  },
  {
    icon: Store,
    title: "Earn as a creator",
    body: "A public profile and storefront for creators with genuinely original work.",
    badge: "Soon",
  },
] as const;

export function FeatureStrip() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f) => (
        <div
          key={f.title}
          className="relative flex flex-col gap-2.5 rounded-2xl border border-line bg-panel p-5 shadow-soft"
        >
          {f.badge && (
            <span className="absolute right-3 top-3">
              <ComingSoonBadge label={f.badge} />
            </span>
          )}
          <span className="gradient-brand flex h-9 w-9 items-center justify-center rounded-full text-white shadow-soft">
            <f.icon size={16} strokeWidth={1.75} />
          </span>
          <p className="font-heading text-sm font-semibold text-text">{f.title}</p>
          <p className="text-xs leading-relaxed text-dim">{f.body}</p>
        </div>
      ))}
    </div>
  );
}

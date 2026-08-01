import { ComingSoonBadge } from "@/components/ComingSoonBadge";

const FEATURES = [
  {
    emoji: "⚖️",
    title: "Verdict, not just a file",
    body: "Every catalogued entry carries a real status, works-when, and avoid-when — not just a download link.",
    badge: null,
  },
  {
    emoji: "🤖",
    title: "The Librarian",
    body: "Ask in plain language, get back real search results with their verdicts attached.",
    badge: "Beta",
  },
  {
    emoji: "🪙",
    title: "Settle in $MIX",
    body: "Creator-shop purchases will settle in $MIX, with a stablecoin option alongside it.",
    badge: "Soon",
  },
  {
    emoji: "📈",
    title: "Earn as a creator",
    body: "A public profile and storefront for creators with genuinely original work.",
    badge: "Soon",
  },
] as const;

export function FeatureStrip() {
  return (
    <div className="glass grid grid-cols-1 gap-[18px] rounded-[24px] border border-line p-[30px] shadow-soft sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f) => (
        <div key={f.title} className="relative flex flex-col gap-2">
          {f.badge && (
            <span className="absolute right-0 top-0">
              <ComingSoonBadge label={f.badge} />
            </span>
          )}
          <span className="mb-1 flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-line bg-white/[0.04] text-[20px]">
            {f.emoji}
          </span>
          <h4 className="font-heading text-[15px] font-semibold text-text">{f.title}</h4>
          <p className="text-[13px] leading-[1.45] text-dim">{f.body}</p>
        </div>
      ))}
    </div>
  );
}

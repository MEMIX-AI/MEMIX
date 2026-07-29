import { ComingSoonBadge } from "@/components/ComingSoonBadge";

const FEATURES = [
  {
    emoji: "⚖️",
    iconBg: "rgba(60,203,127,.14)",
    title: "Verdict, not just a file",
    body: "Every catalogued entry carries a real status, works-when, and avoid-when — not just a download link.",
    badge: null,
  },
  {
    emoji: "🤖",
    iconBg: "rgba(127,231,216,.2)",
    title: "The Librarian",
    body: "Ask in plain language, get back real search results with their verdicts attached.",
    badge: "Beta",
  },
  {
    emoji: "🪙",
    iconBg: "rgba(24,184,216,.14)",
    title: "Settle in $MIX",
    body: "Creator-shop purchases will settle in $MIX, with a stablecoin option alongside it.",
    badge: "Soon",
  },
  {
    emoji: "📈",
    iconBg: "rgba(245,166,35,.16)",
    title: "Earn as a creator",
    body: "A public profile and storefront for creators with genuinely original work.",
    badge: "Soon",
  },
] as const;

export function FeatureStrip() {
  return (
    <div className="grid grid-cols-1 gap-[18px] rounded-[24px] border border-line bg-[rgba(255,255,255,0.55)] p-[30px] shadow-soft sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f) => (
        <div key={f.title} className="relative flex flex-col gap-2">
          {f.badge && (
            <span className="absolute right-0 top-0">
              <ComingSoonBadge label={f.badge} />
            </span>
          )}
          <span
            className="mb-1 flex h-[42px] w-[42px] items-center justify-center rounded-xl text-[20px]"
            style={{ backgroundColor: f.iconBg }}
          >
            {f.emoji}
          </span>
          <h4 className="font-heading text-[15px] font-semibold text-text">{f.title}</h4>
          <p className="text-[13px] leading-[1.45] text-dim">{f.body}</p>
        </div>
      ))}
    </div>
  );
}

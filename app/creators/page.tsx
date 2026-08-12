import Link from "next/link";
import { ArrowRight, Sparkles, Wand2, Coins, Trophy } from "lucide-react";
import { getCreatorSummaries, rankTrending, rankTop, type CreatorSummary } from "@/lib/creators";
import { shortenWallet, formatCompactNumber } from "@/lib/format";

export const metadata = {
  title: "creators — memix",
  description: "Creators building original work on memix, paid out in $MIX.",
};

// Real creator directory + leaderboard — every number here comes from
// lib/creators.ts's real aggregate queries (uploads, confirmed sales,
// $MIX earned, follows). No sample creators, no seeded stats: a brand
// new catalogue with zero creators renders the empty state below, not a
// padded-out row of placeholders — see CLAUDE.md's "no claim without
// receipt".
export default async function CreatorsPage() {
  const creators = await getCreatorSummaries();
  const trending = rankTrending(creators, 8);
  const top = rankTop(creators, 10);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      {/* HERO — static copy only, no numbers, nothing here claims data */}
      <div className="mx-auto mb-20 flex max-w-2xl flex-col items-center text-center">
        <div className="glass mb-6 flex items-center gap-2 rounded-full border border-line px-[15px] py-[7px] text-[13px] font-semibold text-accent shadow-soft">
          <span
            className="h-[7px] w-[7px] rounded-full bg-ok"
            style={{ boxShadow: "0 0 0 4px rgba(109,243,196,.18)" }}
          />
          memix creator hub
        </div>

        <h1 className="text-balance mb-[22px] font-heading text-[clamp(38px,6vw,64px)] font-bold leading-[1.02] tracking-[-0.035em] text-text">
          Create. Share. <span className="gradient-spectrum">Earn.</span>
        </h1>
        <p className="mb-8 max-w-[560px] text-lg leading-[1.55] text-dim">
          Turn original memes, sounds, and clips into real work — discovered
          through the catalogue, collected by whoever wants them, settled
          in $MIX.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/upload"
            className="gradient-brand flex items-center gap-2 rounded-[13px] px-[26px] py-[14px] text-[15px] font-semibold text-white shadow-glow transition-transform duration-200 hover:-translate-y-0.5"
          >
            Become a Creator
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
          <a
            href="#trending"
            className="glass flex items-center gap-2 rounded-[13px] border border-line px-[26px] py-[14px] text-[15px] font-semibold text-text transition-transform duration-200 hover:-translate-y-0.5 hover:border-accent/40"
          >
            Explore Creators
          </a>
        </div>
      </div>

      {/* TRENDING CREATORS */}
      <section id="trending" className="mb-20 scroll-mt-24">
        <SectionHeading
          kicker="discover"
          title="Trending Creators"
          subtitle="Ranked by real sales, follows, and work — not hype."
        />
        {trending.length === 0 ? (
          <EmptyCreatorState />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((creator) => (
              <CreatorCard key={creator.walletAddress} creator={creator} />
            ))}
          </div>
        )}
      </section>

      {/* HOW IT WORKS — static explainer, no data claims */}
      <section className="mb-20">
        <SectionHeading kicker="creator economy" title="How it works" />
        <div className="grid gap-5 sm:grid-cols-3">
          <StepCard
            n="01"
            icon={<Wand2 size={18} strokeWidth={1.75} />}
            title="Create your original"
            body="Upload a meme, sound, GIF, or video that's genuinely your own work — a real rights declaration is required, every time."
          />
          <StepCard
            n="02"
            icon={<Sparkles size={18} strokeWidth={1.75} />}
            title="Set your price"
            body="List it for sale in $MIX from my uploads. Browsing and downloading the rest of the catalogue stays free either way."
          />
          <StepCard
            n="03"
            icon={<Coins size={18} strokeWidth={1.75} />}
            title="Earn $MIX"
            body="Every sale pays straight to your wallet on-chain, platform fee already split out — nothing to withdraw or claim later."
          />
        </div>
      </section>

      {/* TOP CREATORS — hidden entirely, not empty-stated, when there's
          nothing real to rank yet (an empty leaderboard reads as broken;
          no section at all reads as honest). */}
      {top.length > 0 && (
        <section className="mb-20">
          <SectionHeading
            kicker="leaderboard"
            title="Top Creators"
            subtitle="Ranked by real $MIX earned, on-chain and confirmed."
          />
          <div className="glass overflow-hidden rounded-[22px] border border-line shadow-soft">
            {top.map((creator, i) => (
              <LeaderboardRow key={creator.walletAddress} rank={i + 1} creator={creator} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="glass relative overflow-hidden rounded-[28px] border border-line p-10 text-center shadow-soft-lg sm:p-14">
        <Trophy size={22} strokeWidth={1.75} className="mx-auto mb-4 text-accent" />
        <h2 className="mb-3 font-heading text-2xl font-bold text-text sm:text-3xl">
          Ready to become a creator?
        </h2>
        <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-dim">
          Turn your original work into something real people can collect —
          and get paid in $MIX when they do.
        </p>
        <Link
          href="/upload"
          className="gradient-brand inline-flex items-center gap-2 rounded-[13px] px-[26px] py-[14px] text-[15px] font-semibold text-white shadow-glow transition-transform duration-200 hover:-translate-y-0.5"
        >
          Become a Creator
          <ArrowRight size={16} strokeWidth={1.75} />
        </Link>
      </section>
    </main>
  );
}

function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-[26px]">
      <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
        {"// "}
        {kicker}
      </p>
      <h2 className="font-heading text-[26px] font-bold tracking-tight text-text">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm text-dim">{subtitle}</p>}
    </div>
  );
}

function Avatar({ creator, size = 52 }: { creator: CreatorSummary; size?: number }) {
  const initial = (creator.username || creator.walletAddress.slice(2)).charAt(0).toUpperCase();
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border-2 border-panel bg-gradient-to-br from-accent-2 to-accent-3"
      style={{ width: size, height: size }}
    >
      {creator.avatarUrl ? (
        // Arbitrary URL (own storage OR a pasted external link) — same
        // reasoning as app/u/[wallet]/page.tsx and WalletButton.tsx, next/
        // image's remotePatterns allowlist doesn't cover an arbitrary
        // pasted avatar link.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-heading font-bold text-white"
          style={{ fontSize: size * 0.36 }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}

function CreatorCard({ creator }: { creator: CreatorSummary }) {
  const displayName = creator.username || shortenWallet(creator.walletAddress);
  return (
    <Link
      href={`/u/${creator.walletAddress}`}
      className="card-lift glass flex flex-col rounded-[22px] border border-line p-5 shadow-soft"
    >
      <Avatar creator={creator} />

      <p className="mt-4 truncate font-heading text-base font-semibold text-text">{displayName}</p>
      {creator.username && (
        <p className="truncate text-xs text-dim">{shortenWallet(creator.walletAddress)}</p>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-line pt-3.5 text-sm">
        <Stat value={creator.works} label="works" />
        <Stat value={creator.followers} label="followers" />
        <Stat value={creator.sales} label="sales" />
      </div>
    </Link>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-heading font-semibold text-text">{formatCompactNumber(value)}</p>
      <p className="text-[10.5px] uppercase tracking-wide text-faint">{label}</p>
    </div>
  );
}

function StepCard({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[22px] border border-line bg-panel p-6 shadow-soft">
      <p className="font-mono text-[11px] font-semibold tracking-wide text-accent">{n}</p>
      <div className="my-4 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
        {icon}
      </div>
      <h3 className="mb-2 font-heading text-base font-bold text-text">{title}</h3>
      <p className="text-sm leading-relaxed text-dim">{body}</p>
    </div>
  );
}

function LeaderboardRow({ rank, creator }: { rank: number; creator: CreatorSummary }) {
  const displayName = creator.username || shortenWallet(creator.walletAddress);
  return (
    <Link
      href={`/u/${creator.walletAddress}`}
      className="flex items-center gap-4 border-b border-line px-5 py-3.5 text-sm transition-colors last:border-b-0 hover:bg-accent/[0.05]"
    >
      <span className="w-6 shrink-0 font-mono text-xs text-faint">
        {String(rank).padStart(2, "0")}
      </span>
      <Avatar creator={creator} size={34} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text">{displayName}</p>
      </div>
      <span className="hidden w-16 shrink-0 text-right text-dim sm:block">{creator.sales} sales</span>
      <span className="hidden w-20 shrink-0 text-right text-dim md:block">
        {formatCompactNumber(creator.followers)} followers
      </span>
      <span className="w-28 shrink-0 text-right font-semibold text-accent-2">
        {formatCompactNumber(creator.earnedMix)} $MIX
      </span>
    </Link>
  );
}

function EmptyCreatorState() {
  return (
    <div className="glass flex flex-col items-center gap-4 rounded-[22px] border border-line px-6 py-14 text-center shadow-soft">
      <Sparkles size={26} strokeWidth={1.5} className="text-accent" />
      <div>
        <p className="font-heading text-lg font-bold text-text">Be the first creator on memix.</p>
        <p className="mt-1.5 text-sm text-dim">
          No one&apos;s listed an original yet — the shelf is empty and waiting.
        </p>
      </div>
      <Link
        href="/upload"
        className="gradient-brand mt-1 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow"
      >
        Become a Creator
        <ArrowRight size={15} strokeWidth={1.75} />
      </Link>
    </div>
  );
}

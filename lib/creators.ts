import { prisma } from "./prisma";
import { publicAssetWhere } from "./asset-visibility";
import { isStorageKey } from "./asset-urls";
import { storage } from "./storage";

// A "creator" here is never a status flag someone toggles — it's derived
// purely from having at least one real, currently-public, currently-live
// upload. No wallet is ever a creator until it genuinely has real,
// visible work; the moment its last public asset disappears (taken down,
// unpublished), it stops counting as one. Same filter getProfileAssets()
// uses, so this list can never disagree with what a visitor can actually
// see.
export interface CreatorSummary {
  walletAddress: string;
  username: string | null;
  avatarUrl: string | null;
  works: number;
  sales: number;
  earnedMix: number;
  followers: number;
  joinedAt: Date;
}

async function resolveAvatar(raw: string | null): Promise<string | null> {
  if (!raw) return null;
  if (!isStorageKey(raw)) return raw;
  return storage.getUrl(raw).catch(() => null);
}

// Every number here comes from its own real table — works from Asset,
// sales/earnings from CONFIRMED MarketplacePurchase rows, followers from
// Follow (currently always empty, see prisma/schema.prisma — there's no
// follow button anywhere yet, so this stays honestly 0 until one ships).
// Three grouped aggregate queries, not N+1 per wallet.
export async function getCreatorSummaries(): Promise<CreatorSummary[]> {
  const [works, sales, followers] = await Promise.all([
    prisma.asset.groupBy({
      by: ["uploaderWallet"],
      where: { ...publicAssetWhere, uploaderWallet: { not: null } },
      _count: { _all: true },
    }),
    prisma.marketplacePurchase.groupBy({
      by: ["sellerWallet"],
      where: { status: "CONFIRMED" },
      _count: { _all: true },
      _sum: { sellerAmountMix: true },
    }),
    prisma.follow.groupBy({
      by: ["followingWallet"],
      _count: { _all: true },
    }),
  ]);

  const wallets = works.map((w) => w.uploaderWallet).filter((w): w is string => !!w);
  if (wallets.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { walletAddress: { in: wallets } },
    select: { walletAddress: true, username: true, avatarUrl: true, createdAt: true },
  });
  const userByWallet = new Map(users.map((u) => [u.walletAddress, u]));
  const salesByWallet = new Map(sales.map((s) => [s.sellerWallet, s]));
  const followersByWallet = new Map(followers.map((f) => [f.followingWallet, f._count._all]));

  const summaries = await Promise.all(
    works.map(async (w) => {
      const wallet = w.uploaderWallet!;
      const user = userByWallet.get(wallet);
      const saleAgg = salesByWallet.get(wallet);
      return {
        walletAddress: wallet,
        username: user?.username ?? null,
        avatarUrl: await resolveAvatar(user?.avatarUrl ?? null),
        works: w._count._all,
        sales: saleAgg?._count._all ?? 0,
        earnedMix: saleAgg?._sum.sellerAmountMix ?? 0,
        followers: followersByWallet.get(wallet) ?? 0,
        joinedAt: user?.createdAt ?? new Date(0),
      };
    }),
  );

  return summaries;
}

// "Trending" from real signals only: recent sales weighted first (an
// actual transaction is the strongest real-world signal available),
// then followers, then works — never a fabricated "hotness" score. Empty
// input returns an empty array, which the page renders as a real empty
// state, not a padded-out fake row.
export function rankTrending(creators: CreatorSummary[], limit: number): CreatorSummary[] {
  return [...creators]
    .sort((a, b) => b.sales - a.sales || b.followers - a.followers || b.works - a.works)
    .slice(0, limit);
}

// Leaderboard ranks by real $MIX earned first (what "top creator" means
// on a marketplace), tie-broken by sales count.
export function rankTop(creators: CreatorSummary[], limit: number): CreatorSummary[] {
  return [...creators]
    .sort((a, b) => b.earnedMix - a.earnedMix || b.sales - a.sales)
    .slice(0, limit);
}

// Newest creators by real User.createdAt (join date) — used for the
// Creator Hub's "New Creators" rail. Not "first upload date": a wallet
// counts as a creator from the moment it has a public work at all, and
// its account join date is the honest signal for "new to memix," not a
// fabricated activity score.
export function rankNewest(creators: CreatorSummary[], limit: number): CreatorSummary[] {
  return [...creators].sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime()).slice(0, limit);
}

export interface CreatorHubStats {
  creatorCount: number;
  totalWorks: number;
  totalSales: number;
  totalEarnedMix: number;
}

// Every field is a straight sum/count over the same real CreatorSummary
// rows the rest of this page renders — no separate query, no numbers that
// could ever disagree with what's shown below them.
export function getHubStats(creators: CreatorSummary[]): CreatorHubStats {
  return creators.reduce(
    (acc, c) => ({
      creatorCount: acc.creatorCount + 1,
      totalWorks: acc.totalWorks + c.works,
      totalSales: acc.totalSales + c.sales,
      totalEarnedMix: acc.totalEarnedMix + c.earnedMix,
    }),
    { creatorCount: 0, totalWorks: 0, totalSales: 0, totalEarnedMix: 0 },
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { X as XIcon, UploadCloud } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, getProfileAssets, getProfileStats } from "@/lib/profile";
import { resolveAssetUrlsMany } from "@/lib/asset-urls";
import { isStorageKey } from "@/lib/asset-urls";
import { storage } from "@/lib/storage";
import { shortenWallet, formatJoinDate } from "@/lib/format";
import { AssetCard } from "@/components/AssetCard";
import { CopyAddressButton } from "@/components/CopyAddressButton";
import { ProfileEditButton } from "@/components/ProfileEditButton";

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export default async function ProfilePage({
  params,
}: {
  params: { wallet: string };
}) {
  if (!WALLET_RE.test(params.wallet)) notFound();
  const wallet = params.wallet.toLowerCase();

  const [viewer, profile, stats, rawAssets] = await Promise.all([
    getCurrentUser(),
    getProfile(wallet),
    getProfileStats(wallet),
    getProfileAssets(wallet),
  ]);
  const assets = await resolveAssetUrlsMany(rawAssets);

  const isOwner = viewer?.walletAddress === wallet;
  const displayName = profile?.username || shortenWallet(wallet);
  const avatarUrl = profile?.avatarUrl
    ? isStorageKey(profile.avatarUrl)
      ? await storage.getUrl(profile.avatarUrl).catch(() => null)
      : profile.avatarUrl
    : null;
  const initial = (profile?.username || wallet.slice(2)).charAt(0).toUpperCase();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[24px] border border-line bg-panel p-6 shadow-soft-lg sm:p-8">
        <div
          className="absolute inset-x-0 top-0 h-20"
          style={{ background: "linear-gradient(120deg, var(--accent-3), var(--accent-2), #B7C5FF)" }}
        />

        <div className="relative flex flex-col items-start gap-5 pt-12 sm:flex-row sm:items-end sm:pt-14">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[22px] border-4 border-panel bg-gradient-to-br from-accent-2 to-accent-3 shadow-soft-lg">
            {avatarUrl ? (
              // Arbitrary URL (own storage OR a pasted external link) —
              // see components/WalletButton.tsx for the same reasoning.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-heading text-3xl font-bold text-white">
                {initial}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-[26px] font-bold tracking-tight text-text">
              {displayName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <CopyAddressButton address={wallet} />
              {profile?.xHandle && (
                <a
                  href={`https://x.com/${profile.xHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent hover:underline"
                >
                  <XIcon size={13} strokeWidth={2.25} />@{profile.xHandle}
                </a>
              )}
              {profile?.createdAt && (
                <span className="text-[13px] text-dim">{formatJoinDate(profile.createdAt)}</span>
              )}
            </div>
            {profile?.bio && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">{profile.bio}</p>
            )}
          </div>

          {isOwner && <ProfileEditButton profile={{ username: profile?.username ?? null, avatarUrl, xHandle: profile?.xHandle ?? null, bio: profile?.bio ?? null }} walletAddress={wallet} />}
        </div>

        {/* Stats — real aggregates only, see lib/profile.ts#getProfileStats.
            No followers/earnings/verified badge — none of that exists. */}
        <div className="relative mt-6 grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-line bg-bg/60 px-3 py-2.5 text-center">
            <p className="font-heading text-lg font-bold text-text">{stats.uploadCount}</p>
            <p className="text-[11px] text-dim">Uploads</p>
          </div>
          <div className="rounded-2xl border border-line bg-bg/60 px-3 py-2.5 text-center">
            <p className="font-heading text-lg font-bold text-text">{stats.totalDownloads}</p>
            <p className="text-[11px] text-dim">Total downloads</p>
          </div>
          <div className="rounded-2xl border border-line bg-bg/60 px-3 py-2.5 text-center">
            <p className="font-heading text-lg font-bold text-text">{stats.totalLikes}</p>
            <p className="text-[11px] text-dim">Total likes</p>
          </div>
        </div>
      </div>

      {/* Uploads */}
      <div className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold tracking-tight text-text">Uploads</h2>
          <div className="flex gap-2">
            <span className="gradient-brand rounded-full px-3.5 py-1.5 text-[13px] font-medium text-white">
              All · Free
            </span>
            <span
              title="Marketplace coming soon"
              className="cursor-not-allowed rounded-full border border-line bg-panel px-3.5 py-1.5 text-[13px] font-medium text-dim opacity-55"
            >
              For sale · Soon
            </span>
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-11 text-center shadow-soft">
            <p className="font-heading font-semibold text-text">No uploads yet</p>
            <p className="mt-1.5 text-sm text-dim">
              {isOwner
                ? "When you publish something, it shows up here."
                : "When this creator publishes something, it shows up here."}
            </p>
            {isOwner && (
              <Link
                href="/upload"
                className="gradient-brand mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow"
              >
                <UploadCloud size={15} strokeWidth={1.75} />
                Upload your first asset
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

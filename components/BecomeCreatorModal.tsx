"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectKitButton, useSIWE } from "connectkit";
import { X, Wallet, AlertCircle, Upload, Crop, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { AvatarCropper } from "@/components/AvatarCropper";
import { TOS_DECLARATION_TEXT } from "@/lib/declaration";

const AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_RAW_SELECT_SIZE = 20 * 1024 * 1024;

// The registration step behind every "Become a Creator" CTA on
// app/creators/page.tsx. Three states driven entirely by the existing
// global wallet provider (components/providers/AppWalletShell.tsx) — this
// component never creates its own WagmiProvider, it just reads
// useAccount()/useSIWE() the same way components/WalletButton.tsx does:
//   1. not connected      -> open the ConnectKit picker
//   2. connected, no SIWE -> sign in
//   3. signed in          -> the actual registration form
// Submitting POSTs once to /api/creators/join (name + unique handle +
// optional avatar + optional X link + terms checkbox), which is the only
// thing that sets User.creatorOnboardedAt — uploading itself stays
// completely unaffected by any of this (see app/api/upload/route.ts).
export function BecomeCreatorModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { isSignedIn, signIn, isLoading: signingIn } = useSIWE();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [agreesToTerms, setAgreesToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Returning wallet that already has partial profile data (e.g. set a
  // display name/X handle via Edit Profile before ever going through this
  // flow) shouldn't have to retype it — same public read WalletButton's
  // navbar dropdown already relies on.
  useEffect(() => {
    if (!isSignedIn || !address || prefilled) return;
    fetch(`/api/profile/${address}`)
      .then((res) => res.json())
      .then((data) => {
        setPrefilled(true);
        if (data.username) setName(data.username);
        if (data.handle) setHandle(data.handle);
        if (data.xHandle) setXHandle(data.xHandle);
      })
      .catch(() => setPrefilled(true));
  }, [isSignedIn, address, prefilled]);

  function handleFilePicked(selected: File | null) {
    if (!selected) return;
    if (!AVATAR_MIME_TYPES.includes(selected.type)) {
      setAvatarError(`unsupported image type: ${selected.type || "unknown"} (use png/jpeg/webp/gif)`);
      return;
    }
    if (selected.size > MAX_RAW_SELECT_SIZE) {
      setAvatarError(`image is ${(selected.size / 1024 / 1024).toFixed(1)}MB, over the 20MB limit`);
      return;
    }
    setAvatarError(null);
    setRawFile(selected);
    setShowCropper(true);
  }

  function handleCropConfirm(blob: Blob) {
    setShowCropper(false);
    setCroppedBlob(blob);
  }

  useEffect(() => {
    if (!croppedBlob) return;
    const url = URL.createObjectURL(croppedBlob);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [croppedBlob]);

  const canSubmit = name.trim().length > 0 && handle.trim().length > 0 && agreesToTerms && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("username", name.trim());
      formData.append("handle", handle.trim());
      formData.append("xHandle", xHandle.trim());
      formData.append("agreesToTerms", "true");
      if (croppedBlob) {
        formData.append("avatar", new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" }));
      }

      const res = await fetch("/api/creators/join", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "couldn't complete registration, try again.");
        setSubmitting(false);
        return;
      }

      router.push(`/u/${data.walletAddress}`);
      router.refresh();
    } catch {
      setError("couldn't complete registration, try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(20,50,60,0.35)] p-5 backdrop-blur-[6px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-[24px] border border-line bg-panel p-6 shadow-soft-lg"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold text-text">Become a Creator</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-bg text-dim transition-colors hover:text-text"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {!isConnected ? (
          <StepConnect />
        ) : !isSignedIn ? (
          <StepSignIn onSignIn={signIn} loading={signingIn} />
        ) : (
          <div>
            <div className="mb-1 flex items-center gap-4">
              <div className="group relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-accent-2 to-accent-3">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-bold text-white">
                    {(name || address || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                {rawFile && (
                  <button
                    type="button"
                    onClick={() => setShowCropper(true)}
                    title="adjust crop"
                    className="absolute inset-0 flex items-center justify-center bg-[rgba(20,50,60,0.55)] text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Crop size={20} strokeWidth={1.75} />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={AVATAR_MIME_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    handleFilePicked(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/[0.08] px-3.5 py-2 text-[13px] font-semibold text-accent"
                >
                  <Upload size={13} strokeWidth={1.75} />
                  {rawFile ? "Choose a different photo" : "Upload photo"}
                </button>
                <span className="text-[11.5px] text-dim">
                  optional · you&apos;ll crop it to a square next
                </span>
              </div>
            </div>
            {avatarError && (
              <p className="mb-3 mt-2 flex items-center gap-1.5 text-sm text-warn">
                <AlertCircle size={14} strokeWidth={1.75} />
                {avatarError}
              </p>
            )}

            <div className="mb-3.5 mt-4">
              <label className="mb-1.5 block font-heading text-[13px] font-semibold text-text">
                Name <span className="text-warn">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={40}
                className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50"
              />
            </div>

            <div className="mb-3.5">
              <label className="mb-1.5 block font-heading text-[13px] font-semibold text-text">
                Username <span className="text-warn">*</span>
              </label>
              <div className="flex items-center overflow-hidden rounded-xl border border-line bg-bg focus-within:border-accent/50">
                <span className="pl-3.5 pr-1 text-sm text-dim">@</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                  placeholder="yourhandle"
                  maxLength={24}
                  className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-text outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-faint">3-24 characters, lowercase letters/numbers/underscore, must be unique</p>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block font-heading text-[13px] font-semibold text-text">
                X (Twitter) <span className="font-sans font-normal text-dim">(optional)</span>
              </label>
              <div className="flex items-center overflow-hidden rounded-xl border border-line bg-bg focus-within:border-accent/50">
                <span className="pl-3.5 pr-1 text-sm text-dim">@</span>
                <input
                  value={xHandle}
                  onChange={(e) => setXHandle(e.target.value.replace(/^@+/, ""))}
                  placeholder="handle or link"
                  maxLength={30}
                  className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-text outline-none"
                />
              </div>
            </div>

            <label className="mb-4 flex items-start gap-2.5 rounded-xl bg-accent/[0.06] px-3.5 py-3 text-xs text-dim">
              <input
                type="checkbox"
                checked={agreesToTerms}
                onChange={(e) => setAgreesToTerms(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span>
                {TOS_DECLARATION_TEXT}{" "}
                <Link href="/tos" target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">
                  read it here
                </Link>
                .
              </span>
            </label>

            {error && (
              <p className="mb-4 flex items-center gap-1.5 text-sm text-warn">
                <AlertCircle size={14} strokeWidth={1.75} />
                {error}
              </p>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-line bg-bg px-5 py-3 text-sm font-semibold text-text transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="gradient-brand flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} strokeWidth={2} className="animate-spin" />
                    joining…
                  </>
                ) : (
                  <>
                    <Check size={15} strokeWidth={2} />
                    Join as a creator
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {showCropper && rawFile && (
        <div onClick={(e) => e.stopPropagation()}>
          <AvatarCropper file={rawFile} onCancel={() => setShowCropper(false)} onConfirm={handleCropConfirm} />
        </div>
      )}
    </div>
  );
}

function StepConnect() {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <p className="text-sm text-dim">Connect your wallet to start registering as a creator.</p>
      <ConnectKitButton.Custom>
        {({ show }) => (
          <button
            onClick={show}
            className="gradient-brand flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform duration-200 hover:-translate-y-0.5"
          >
            <Wallet size={15} strokeWidth={1.75} />
            Connect Wallet
          </button>
        )}
      </ConnectKitButton.Custom>
    </div>
  );
}

function StepSignIn({ onSignIn, loading }: { onSignIn: () => void; loading: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <p className="text-sm text-dim">Sign a message with your wallet to verify it&apos;s really you.</p>
      <button
        onClick={onSignIn}
        disabled={loading}
        className="gradient-brand flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
      >
        <Wallet size={15} strokeWidth={1.75} />
        {loading ? "signing…" : "Sign in"}
      </button>
    </div>
  );
}

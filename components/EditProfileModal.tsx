"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Lock, Upload, AlertCircle, Crop, Loader2 } from "lucide-react";
import { shortenWallet } from "@/lib/format";
import { PROFILE_UPDATED_EVENT } from "@/lib/hooks/useProfile";
import { AvatarCropper } from "@/components/AvatarCropper";

export interface EditableProfile {
  username: string | null;
  avatarUrl: string | null;
  xHandle: string | null;
  bio: string | null;
}

// Generous — this is just a sanity cap on what we'll try to decode into
// an <img>/canvas client-side, not the real size limit. The actual
// uploaded file is always the cropper's fixed 480×480 JPEG export (tens
// of KB), regardless of how large the source photo was — see
// components/AvatarCropper.tsx. A hard "your photo must be under 2MB"
// requirement, which is what this used to enforce directly on the raw
// picked file, doesn't hold for a typical phone/camera photo (routinely
// 3–15MB) and was the actual cause of avatar uploads failing.
const MAX_RAW_SELECT_SIZE = 20 * 1024 * 1024;
const AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function EditProfileModal({
  profile,
  walletAddress,
  onClose,
}: {
  profile: EditableProfile;
  walletAddress: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // rawFile is the original picked photo, kept around so "adjust crop"
  // can reopen the cropper against the real source image instead of
  // re-cropping an already-uploaded, already-compressed JPEG.
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  // The real, currently-persisted avatar — starts from the server prop,
  // replaced with the fresh resolved URL the moment an upload actually
  // succeeds. Confirming a crop now saves immediately (its own PATCH,
  // right below) instead of waiting for the "Save changes" button:
  // previously the avatar only became real once that separate button was
  // clicked, which is exactly the "picked a photo, nothing happened"
  // gap being fixed here — cropping IS the save action for the avatar.
  const [persistedAvatarUrl, setPersistedAvatarUrl] = useState(profile.avatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [avatarUrlInput, setAvatarUrlInput] = useState(
    // Only prefill the URL field with a pasted external link, never with
    // our own storage-resolved signed URL — that URL expires in ~60s and
    // saving it back verbatim would break shortly after (see
    // lib/storage.ts). A previously-uploaded avatar just shows via
    // previewSrc below instead, with the text field left blank.
    profile.avatarUrl && /^https?:\/\//.test(profile.avatarUrl) ? profile.avatarUrl : "",
  );
  const [username, setUsername] = useState(profile.username ?? "");
  const [xHandle, setXHandle] = useState(profile.xHandle ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleCropConfirm(blob: Blob) {
    setShowCropper(false);
    if (localPreview) URL.revokeObjectURL(localPreview);
    const optimisticUrl = URL.createObjectURL(blob);
    setLocalPreview(optimisticUrl); // instant feedback while the upload below is in flight

    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const cropped = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("avatar", cropped);

      const res = await fetch("/api/profile", { method: "PATCH", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAvatarError(data.error ?? "couldn't upload your photo, try again.");
        setLocalPreview(null);
        URL.revokeObjectURL(optimisticUrl);
        return;
      }

      setPersistedAvatarUrl(data.avatarUrl ?? null);
      // localPreview was only ever a stand-in for the brief moment the
      // upload was in flight — drop it now that persistedAvatarUrl is
      // the real, current source of truth. Left set, it would outrank
      // avatarUrlInput in previewSrc's priority forever after, hiding a
      // URL pasted afterward behind this upload's now-stale blob preview.
      URL.revokeObjectURL(optimisticUrl);
      setLocalPreview(null);
      // A stale pasted-URL value here would otherwise get resent by the
      // main "Save changes" button below and silently overwrite the
      // avatar that was just uploaded.
      setAvatarUrlInput("");
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
      router.refresh();
    } catch {
      setAvatarError("couldn't upload your photo, try again.");
      setLocalPreview(null);
      URL.revokeObjectURL(optimisticUrl);
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleCropCancel() {
    setShowCropper(false);
  }

  const previewSrc = localPreview || avatarUrlInput || persistedAvatarUrl;
  const initial = (username || walletAddress.slice(2)).charAt(0).toUpperCase();

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("xHandle", xHandle.trim());
      formData.append("bio", bio.trim());
      // Avatar is its own save path now (handleCropConfirm above) — only
      // touch avatarUrl here if the creator actually typed a pasted link,
      // never send an empty value that would null out an avatar that was
      // just uploaded via the cropper.
      if (avatarUrlInput.trim()) {
        formData.append("avatarUrl", avatarUrlInput.trim());
      }

      const res = await fetch("/api/profile", { method: "PATCH", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "couldn't save your profile, try again.");
        setSaving(false);
        return;
      }

      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
      router.refresh();
      onClose();
    } catch {
      setError("couldn't save your profile, try again.");
      setSaving(false);
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
          <h3 className="font-heading text-lg font-bold text-text">Edit profile</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-bg text-dim transition-colors hover:text-text"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="mb-1 flex items-center gap-4">
          <div className="group relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-accent-2 to-accent-3">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-bold text-white">
                {initial}
              </div>
            )}
            {avatarUploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(20,50,60,0.55)] text-white">
                <Loader2 size={20} strokeWidth={2} className="animate-spin" />
              </div>
            ) : (
              rawFile && (
                <button
                  type="button"
                  onClick={() => setShowCropper(true)}
                  title="adjust crop"
                  className="absolute inset-0 flex items-center justify-center bg-[rgba(20,50,60,0.55)] text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Crop size={20} strokeWidth={1.75} />
                </button>
              )
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
                // Otherwise re-picking the exact same file (e.g. after
                // cancelling its crop) wouldn't fire onChange again.
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/[0.08] px-3.5 py-2 text-[13px] font-semibold text-accent disabled:opacity-60"
            >
              <Upload size={13} strokeWidth={1.75} />
              {rawFile ? "Choose a different photo" : "Upload photo"}
            </button>
            <span className="text-[11.5px] text-dim">
              {avatarUploading
                ? "uploading…"
                : rawFile
                  ? "hover the preview to re-adjust the crop"
                  : "or paste an image URL below · any photo size, you'll crop it to a square next"}
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
            Avatar URL <span className="font-sans font-normal text-dim">(optional)</span>
          </label>
          <input
            value={avatarUrlInput}
            onChange={(e) => setAvatarUrlInput(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50"
          />
        </div>

        <div className="mb-3.5">
          <label className="mb-1.5 block font-heading text-[13px] font-semibold text-text">Display name</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50"
          />
        </div>

        <div className="mb-3.5">
          <label className="mb-1.5 block font-heading text-[13px] font-semibold text-text">X (Twitter)</label>
          <div className="flex items-center overflow-hidden rounded-xl border border-line bg-bg focus-within:border-accent/50">
            <span className="pl-3.5 pr-1 text-sm text-dim">@</span>
            <input
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value.replace(/^@+/, ""))}
              placeholder="handle"
              maxLength={30}
              className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-text outline-none"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block font-heading text-[13px] font-semibold text-text">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder="Tell people what you make…"
            className="w-full resize-y rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50"
          />
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-xl bg-accent/[0.06] px-3.5 py-2.5 text-xs text-dim">
          <Lock size={13} strokeWidth={1.75} />
          Wallet {shortenWallet(walletAddress)} · can&apos;t be changed
        </div>

        {error && (
          <p className="mb-4 flex items-center gap-1.5 text-sm text-warn">
            <AlertCircle size={14} strokeWidth={1.75} />
            {error}
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-line bg-bg px-5 py-3 text-sm font-semibold text-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="gradient-brand flex-1 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "saving..." : "Save changes"}
          </button>
        </div>
      </div>

      {showCropper && rawFile && (
        <div onClick={(e) => e.stopPropagation()}>
          <AvatarCropper file={rawFile} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
        </div>
      )}
    </div>
  );
}

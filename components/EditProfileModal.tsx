"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Lock, Upload, AlertCircle, Crop } from "lucide-react";
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
  // re-cropping an already-cropped-and-compressed 480×480 JPEG. croppedFile
  // is the actual small export that gets uploaded.
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState(
    // Only prefill the URL field with a pasted external link, never with
    // our own storage-resolved signed URL — that URL expires in ~60s and
    // saving it back verbatim would break shortly after (see
    // lib/storage.ts). A previously-uploaded avatar just shows via
    // previewSrc below instead, with the text field left blank.
    profile.avatarUrl && /^https?:\/\//.test(profile.avatarUrl) ? profile.avatarUrl : "",
  );
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [username, setUsername] = useState(profile.username ?? "");
  const [xHandle, setXHandle] = useState(profile.xHandle ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearAvatarSelection() {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setRawFile(null);
    setCroppedFile(null);
    setLocalPreview(null);
  }

  function handleFilePicked(selected: File | null) {
    if (!selected) return;
    if (!AVATAR_MIME_TYPES.includes(selected.type)) {
      setError(`unsupported image type: ${selected.type || "unknown"} (use png/jpeg/webp/gif)`);
      return;
    }
    if (selected.size > MAX_RAW_SELECT_SIZE) {
      setError(`image is ${(selected.size / 1024 / 1024).toFixed(1)}MB, over the 20MB limit`);
      return;
    }
    setError(null);
    setRawFile(selected);
    setShowCropper(true);
  }

  function handleCropConfirm(blob: Blob) {
    if (localPreview) URL.revokeObjectURL(localPreview);
    const cropped = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    setCroppedFile(cropped);
    setLocalPreview(URL.createObjectURL(blob));
    setShowCropper(false);
  }

  function handleCropCancel() {
    setShowCropper(false);
    // Only discard the source photo if nothing was ever confirmed for
    // it — reopening via "adjust crop" on an already-cropped photo and
    // then cancelling should keep the existing crop, not clear it.
    if (!croppedFile) setRawFile(null);
  }

  const previewSrc = localPreview || avatarUrlInput || profile.avatarUrl;
  const initial = (username || walletAddress.slice(2)).charAt(0).toUpperCase();

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("xHandle", xHandle.trim());
      formData.append("bio", bio.trim());
      if (croppedFile) {
        formData.append("avatar", croppedFile);
      } else {
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

        <div className="mb-4 flex items-center gap-4">
          <div className="group relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-accent-2 to-accent-3">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-bold text-white">
                {initial}
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
                // Otherwise re-picking the exact same file (e.g. after
                // cancelling its crop) wouldn't fire onChange again.
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
              {rawFile
                ? "hover the preview to re-adjust the crop"
                : "or paste an image URL below · any photo size, you'll crop it to a square next"}
            </span>
          </div>
        </div>

        <div className="mb-3.5">
          <label className="mb-1.5 block font-heading text-[13px] font-semibold text-text">
            Avatar URL <span className="font-sans font-normal text-dim">(optional)</span>
          </label>
          <input
            value={avatarUrlInput}
            onChange={(e) => {
              setAvatarUrlInput(e.target.value);
              // A pasted URL overrides a picked file — flip back to
              // "text field wins" the moment the creator types here,
              // rather than silently ignoring it while a crop is queued.
              if (rawFile || croppedFile) clearAvatarSelection();
            }}
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

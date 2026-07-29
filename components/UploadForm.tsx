"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  Music2,
  X,
  AlertCircle,
  Heart,
  Eye,
  Download as DownloadIcon,
  Share2,
} from "lucide-react";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  detectAssetType,
  validateUpload,
} from "@/lib/upload-rules";
import {
  OWNERSHIP_DECLARATION_TEXT,
  TOS_DECLARATION_TEXT,
} from "@/lib/declaration";
import { shortenWallet } from "@/lib/format";

const MAX_TAGS = 8;
const ACCEPT_ATTR = Object.values(ALLOWED_MIME_TYPES).flat().join(",");

export function UploadForm({
  existingTags,
  creatorWallet,
}: {
  existingTags: string[];
  creatorWallet: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isOriginal, setIsOriginal] = useState(false);
  const [ownsRights, setOwnsRights] = useState(false);
  const [agreesToTos, setAgreesToTos] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const detectedType = file ? detectAssetType(file.type) : null;

  function handleFile(selected: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      setFileError(null);
      return;
    }

    const type = detectAssetType(selected.type);
    if (!type) {
      setFile(null);
      setPreviewUrl(null);
      setFileError(`unsupported file type: ${selected.type || "unknown"}`);
      return;
    }

    const result = validateUpload(type, selected.type, selected.size);
    if (!result.ok) {
      setFile(null);
      setPreviewUrl(null);
      setFileError(result.error);
      return;
    }

    setFile(selected);
    setFileError(null);
    setPreviewUrl(
      type === "SOUND" ? null : URL.createObjectURL(selected),
    );
  }

  function addTag(raw: string) {
    const name = raw.trim().toLowerCase();
    if (!name || tags.length >= MAX_TAGS || tags.includes(name)) return;
    setTags([...tags, name]);
    setTagInput("");
  }

  function removeTag(name: string) {
    setTags(tags.filter((t) => t !== name));
  }

  const suggestions = tagInput.trim()
    ? existingTags
        .filter(
          (t) =>
            t.includes(tagInput.trim().toLowerCase()) && !tags.includes(t),
        )
        .slice(0, 6)
    : [];

  const canSubmit =
    !!file && title.trim().length > 0 && ownsRights && agreesToTos && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("isOriginal", String(isOriginal));
      formData.append("ownsRights", String(ownsRights));
      formData.append("agreesToTos", String(agreesToTos));
      tags.forEach((t) => formData.append("tags", t));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(data.error ?? "upload failed, try again.");
        setSubmitting(false);
        return;
      }

      router.push(`/asset/${data.id}`);
    } catch {
      setSubmitError("upload failed, try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-[22px] border border-line bg-panel p-6 shadow-soft-lg">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed bg-panel p-10 text-center transition-all duration-250 ${
            dragOver
              ? "border-accent shadow-glow"
              : "border-line hover:border-accent/50 hover:shadow-soft"
          }`}
        >
          {!file ? (
            <>
              <span className="gradient-brand flex h-12 w-12 items-center justify-center rounded-full text-white">
                <UploadCloud size={22} strokeWidth={1.75} />
              </span>
              <p className="text-sm font-medium text-text">
                drop a file here, or click to browse
              </p>
              <p className="text-xs text-dim">
                images, video, sound — max{" "}
                {MAX_FILE_SIZE.VIDEO / 1024 / 1024}MB for video,{" "}
                {MAX_FILE_SIZE.SOUND / 1024 / 1024}MB for sound,{" "}
                {MAX_FILE_SIZE.IMAGE / 1024 / 1024}MB for images
              </p>
            </>
          ) : (
            <div
              className="flex w-full items-center gap-4 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {detectedType === "IMAGE" && previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="preview"
                  className="h-20 w-20 rounded-2xl border border-line object-cover"
                />
              )}
              {detectedType === "VIDEO" && previewUrl && (
                <video
                  src={previewUrl}
                  muted
                  className="h-20 w-20 rounded-2xl border border-line object-cover"
                />
              )}
              {detectedType === "SOUND" && (
                <span className="gradient-brand flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white">
                  <Music2 size={22} strokeWidth={1.75} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{file.name}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-dim">
                  {detectedType?.toLowerCase()} ·{" "}
                  {(file.size / 1024 / 1024).toFixed(2)}mb
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleFile(null)}
                className="shrink-0 rounded-full p-1.5 text-dim transition-colors hover:bg-bg hover:text-warn"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
        {fileError && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-warn">
            <AlertCircle size={14} strokeWidth={1.75} />
            {fileError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="upload-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dim">
          title
        </label>
        <input
          id="upload-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="sad-trombone-v2.mp3"
          className="w-full rounded-2xl border border-line bg-panel px-3.5 py-2.5 text-sm text-text shadow-soft outline-none transition-colors focus:border-accent/50"
        />
      </div>

      <div>
        <label htmlFor="upload-description" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dim">
          description
        </label>
        <textarea
          id="upload-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="what is this, when would someone use it?"
          className="w-full rounded-2xl border border-line bg-panel px-3.5 py-2.5 text-sm text-text shadow-soft outline-none transition-colors focus:border-accent/50"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dim">
          tags (max {MAX_TAGS})
        </label>
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel px-3.5 py-2.5 shadow-soft transition-colors focus-within:border-accent/50">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full border border-line bg-bg px-2.5 py-1 text-xs font-medium text-dim"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="text-dim hover:text-warn"
                >
                  <X size={11} strokeWidth={2} />
                </button>
              </span>
            ))}
            {tags.length < MAX_TAGS && (
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagInput);
                  } else if (e.key === "Backspace" && !tagInput && tags.length) {
                    removeTag(tags[tags.length - 1]);
                  }
                }}
                placeholder={tags.length === 0 ? "reaction, cat, wojak…" : ""}
                className="min-w-[8ch] flex-1 bg-transparent text-sm text-text outline-none placeholder:text-dim"
              />
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 z-10 mt-1.5 overflow-hidden rounded-2xl border border-line bg-panel text-sm shadow-soft-lg">
              {suggestions.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => addTag(s)}
                  className="block w-full px-4 py-2 text-left text-dim transition-colors hover:bg-bg hover:text-accent"
                >
                  #{s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-dim">
        <input
          type="checkbox"
          checked={isOriginal}
          onChange={(e) => setIsOriginal(e.target.checked)}
          className="mt-0.5 accent-accent"
        />
        this is my original work
      </label>

      <div className="flex flex-col gap-3.5 rounded-[24px] border border-line bg-panel p-5 shadow-soft">
        <p className="font-heading font-semibold text-text">before you upload</p>

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={ownsRights}
            onChange={(e) => setOwnsRights(e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          {OWNERSHIP_DECLARATION_TEXT}
        </label>

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={agreesToTos}
            onChange={(e) => setAgreesToTos(e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          <span>
            {TOS_DECLARATION_TEXT}{" "}
            <Link
              href="/tos"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent underline"
            >
              read it here
            </Link>
            .
          </span>
        </label>
      </div>

      {submitError && (
        <p className="flex items-center gap-1.5 text-sm text-warn">
          <AlertCircle size={14} strokeWidth={1.75} />
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="gradient-brand rounded-full px-6 py-3 font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {submitting ? "uploading..." : "upload"}
      </button>
    </form>

    <aside className="lg:sticky lg:top-24">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-dim">
        live preview
      </p>
      <div className="rounded-[22px] border border-line bg-panel p-3.5 shadow-soft-lg">
        <div className="relative mb-3.5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-[18px] border border-line bg-bg">
          {detectedType === "IMAGE" && previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : detectedType === "VIDEO" && previewUrl ? (
            <video src={previewUrl} muted className="h-full w-full object-cover" />
          ) : detectedType === "SOUND" ? (
            <span className="gradient-brand flex h-14 w-14 items-center justify-center rounded-2xl text-white">
              <Music2 size={22} strokeWidth={1.75} />
            </span>
          ) : (
            <span className="text-xs text-dim/60">thumbnail preview</span>
          )}
          {detectedType && (
            <span className="absolute bottom-2.5 right-2.5 z-10 rounded-lg bg-[rgba(20,50,60,0.55)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              {detectedType}
            </span>
          )}
        </div>

        <p className="mb-1.5 truncate font-heading text-base font-semibold tracking-tight text-text">
          {title.trim() || "untitled asset"}
        </p>

        <div className="mb-2.5 flex items-center gap-1.5 text-[13px] text-dim">
          <span className="gradient-brand h-5 w-5 shrink-0 rounded-full" />
          <span>by {shortenWallet(creatorWallet)}</span>
        </div>

        {/* Real zeros — this asset doesn't exist yet, so there is nothing
            to have been liked/viewed/downloaded. Once published these
            become the same real, tracked columns AssetCard shows. */}
        <div className="mb-3 flex items-center gap-3.5 border-b border-line pb-3 text-[12.5px] text-dim">
          <span className="flex items-center gap-1.5">
            <Heart size={13} strokeWidth={1.75} />0
          </span>
          <span className="flex items-center gap-1.5">
            <Eye size={13} strokeWidth={1.75} />0
          </span>
          <span className="flex items-center gap-1.5">
            <DownloadIcon size={13} strokeWidth={1.75} />0
          </span>
        </div>

        <div className="flex items-center gap-2 opacity-60">
          <span className="gradient-brand flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-[11px] text-[13.5px] font-semibold text-white">
            <DownloadIcon size={14} strokeWidth={1.75} />
            download
          </span>
          <span className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-[11px] text-[13.5px] font-semibold text-dim">
            <Share2 size={14} strokeWidth={1.75} />
          </span>
        </div>
      </div>

      <p className="mt-3.5 rounded-2xl bg-accent/[0.06] p-3 text-xs leading-relaxed text-dim">
        this is how your card looks once published. likes/views/downloads
        all start at real 0 and grow from actual use — a verdict gets
        added later by the Librarian, so there&apos;s nothing to set here.
      </p>
    </aside>
    </div>
  );
}

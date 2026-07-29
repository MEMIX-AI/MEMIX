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
  Image as ImageIcon,
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

  const thumbInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isOriginal, setIsOriginal] = useState(false);
  const [ownsRights, setOwnsRights] = useState(false);
  const [agreesToTos, setAgreesToTos] = useState(false);
  const [visibility, setVisibility] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">("PUBLIC");
  // Only meaningful when the real file is an image — lets the user relabel
  // an image between "GIF" and "Image / Template" (both honest for the
  // same file), never across a real type boundary. Reset whenever a new
  // file is picked so it can't stick around describing the wrong file.
  const [categoryOverride, setCategoryOverride] = useState<"GIF" | "IMAGE_TEMPLATE" | null>(null);

  const [submittingAction, setSubmittingAction] = useState<"draft" | "publish" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const detectedType = file ? detectAssetType(file.type) : null;

  const autoCategory: "SOUND" | "VIDEO" | "GIF" | "IMAGE_TEMPLATE" | null =
    detectedType === "SOUND"
      ? "SOUND"
      : detectedType === "VIDEO"
        ? "VIDEO"
        : detectedType === "IMAGE"
          ? file?.type === "image/gif"
            ? "GIF"
            : "IMAGE_TEMPLATE"
          : null;
  const category = detectedType === "IMAGE" ? (categoryOverride ?? autoCategory) : autoCategory;

  function handleFile(selected: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCategoryOverride(null);

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

  function handleThumbnail(selected: File | null) {
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);

    if (!selected) {
      setThumbnailFile(null);
      setThumbnailPreviewUrl(null);
      setThumbnailError(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.IMAGE.includes(selected.type)) {
      setThumbnailFile(null);
      setThumbnailPreviewUrl(null);
      setThumbnailError(`unsupported thumbnail type: ${selected.type || "unknown"} (use png/jpeg/webp/gif)`);
      return;
    }
    const result = validateUpload("IMAGE", selected.type, selected.size);
    if (!result.ok) {
      setThumbnailFile(null);
      setThumbnailPreviewUrl(null);
      setThumbnailError(result.error);
      return;
    }

    setThumbnailFile(selected);
    setThumbnailError(null);
    setThumbnailPreviewUrl(URL.createObjectURL(selected));
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
    !!file && title.trim().length > 0 && ownsRights && agreesToTos && !submittingAction;

  async function handleSubmit(action: "draft" | "publish", e?: React.FormEvent) {
    e?.preventDefault();
    if (!file || !canSubmit) return;

    setSubmittingAction(action);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("isOriginal", String(isOriginal));
      formData.append("ownsRights", String(ownsRights));
      formData.append("agreesToTos", String(agreesToTos));
      formData.append("visibility", visibility);
      formData.append("action", action);
      tags.forEach((t) => formData.append("tags", t));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(data.error ?? "upload failed, try again.");
        setSubmittingAction(null);
        return;
      }

      // A draft is invisible everywhere except /my-uploads (see
      // prisma/schema.prisma's AssetStatus.DRAFT comment) — its own detail
      // page would 404, so send the creator somewhere that actually shows
      // it instead.
      router.push(action === "draft" ? "/my-uploads" : `/asset/${data.id}`);
    } catch {
      setSubmitError("upload failed, try again.");
      setSubmittingAction(null);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
    <form onSubmit={(e) => handleSubmit("publish", e)} className="flex flex-col gap-6 rounded-[22px] border border-line bg-panel p-6 shadow-soft-lg">
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
        <input
          ref={thumbInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.IMAGE.join(",")}
          className="hidden"
          onChange={(e) => handleThumbnail(e.target.files?.[0] ?? null)}
        />
        <div
          onClick={() => thumbInputRef.current?.click()}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-panel p-4 transition-colors duration-250 hover:border-accent/50"
        >
          {thumbnailPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailPreviewUrl}
              alt="thumbnail preview"
              className="h-12 w-12 shrink-0 rounded-xl border border-line object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg text-dim">
              <ImageIcon size={16} strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-text">
              {thumbnailFile ? thumbnailFile.name : "upload thumbnail"}
              <span className="ml-1.5 font-normal text-dim">(optional)</span>
            </p>
            <p className="text-xs text-dim">used as the cover shown in cards — otherwise generated automatically</p>
          </div>
          {thumbnailFile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleThumbnail(null);
              }}
              className="shrink-0 rounded-full p-1.5 text-dim transition-colors hover:bg-bg hover:text-warn"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>
        {thumbnailError && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-warn">
            <AlertCircle size={14} strokeWidth={1.75} />
            {thumbnailError}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="upload-category" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dim">
          category
        </label>
        <select
          id="upload-category"
          value={category ?? ""}
          disabled={!file || detectedType !== "IMAGE"}
          onChange={(e) => setCategoryOverride(e.target.value as "GIF" | "IMAGE_TEMPLATE")}
          className="w-full rounded-2xl border border-line bg-panel px-3.5 py-2.5 text-sm text-text shadow-soft outline-none transition-colors focus:border-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {!category && <option value="">pick a file first</option>}
          {category === "SOUND" && <option value="SOUND">Sound</option>}
          {category === "VIDEO" && <option value="VIDEO">Video</option>}
          {(category === "GIF" || category === "IMAGE_TEMPLATE") && (
            <>
              <option value="GIF">GIF</option>
              <option value="IMAGE_TEMPLATE">Image / Template</option>
            </>
          )}
        </select>
        <p className="mt-1.5 text-xs text-dim">
          detected from your file — only relabeling between GIF/Image is allowed.
        </p>
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
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dim">
          visibility
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: "PUBLIC" as const, label: "Public", hint: "anyone can find it" },
              { value: "UNLISTED" as const, label: "Unlisted", hint: "link only" },
              { value: "PRIVATE" as const, label: "Private", hint: "just you" },
            ]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVisibility(opt.value)}
              className={`rounded-xl border px-3 py-2.5 text-center text-[13.5px] font-medium transition-colors duration-150 ${
                visibility === opt.value
                  ? "border-accent bg-accent/[0.08] text-accent"
                  : "border-line bg-panel text-dim hover:border-accent/30"
              }`}
            >
              {opt.label}
              <span className="mt-0.5 block text-[11px] font-normal text-dim">{opt.hint}</span>
            </button>
          ))}
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

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleSubmit("draft")}
          disabled={!canSubmit}
          className="rounded-full border border-line bg-panel px-6 py-3 font-semibold text-text shadow-soft transition-all duration-250 hover:shadow-soft-lg disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submittingAction === "draft" ? "saving..." : "save draft"}
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="gradient-brand flex-1 rounded-full px-6 py-3 font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {submittingAction === "publish" ? "publishing..." : "publish asset"}
        </button>
      </div>
    </form>

    <aside className="lg:sticky lg:top-24">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-dim">
        live preview
      </p>
      <div className="rounded-[22px] border border-line bg-panel p-3.5 shadow-soft-lg">
        <div className="relative mb-3.5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-[18px] border border-line bg-bg">
          {thumbnailPreviewUrl ? (
            // A custom thumbnail always wins server-side too — see
            // app/api/upload/route.ts — so the preview should show it,
            // not the raw file, once one's chosen.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailPreviewUrl} alt="" className="h-full w-full object-cover" />
          ) : detectedType === "IMAGE" && previewUrl ? (
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

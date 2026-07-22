"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const MAX_TAGS = 8;
const ACCEPT_ATTR = Object.values(ALLOWED_MIME_TYPES).flat().join(",");

export function UploadForm({ existingTags }: { existingTags: string[] }) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded border p-8 text-center transition-colors ${
            dragOver ? "border-accent" : "border-line hover:border-accent"
          }`}
        >
          {!file ? (
            <>
              <span className="text-2xl text-dim">▸</span>
              <p className="text-sm text-dim">
                $ drop a file here, or click to browse
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
                  className="h-20 w-20 rounded border border-line object-cover"
                />
              )}
              {detectedType === "VIDEO" && previewUrl && (
                <video
                  src={previewUrl}
                  muted
                  className="h-20 w-20 rounded border border-line object-cover"
                />
              )}
              {detectedType === "SOUND" && (
                <span className="text-2xl text-accent">▸</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{file.name}</p>
                <p className="text-xs uppercase text-dim">
                  {detectedType?.toLowerCase()} ·{" "}
                  {(file.size / 1024 / 1024).toFixed(2)}mb
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleFile(null)}
                className="shrink-0 text-dim hover:text-accent"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        {fileError && <p className="mt-2 text-sm text-dim">✕ {fileError}</p>}
      </div>

      <div>
        <label htmlFor="upload-title" className="mb-1 block text-xs uppercase text-dim">
          title
        </label>
        <input
          id="upload-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="sad-trombone-v2.mp3"
          className="w-full rounded border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="upload-description" className="mb-1 block text-xs uppercase text-dim">
          description
        </label>
        <textarea
          id="upload-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="what is this, when would someone use it?"
          className="w-full rounded border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase text-dim">
          tags (max {MAX_TAGS})
        </label>
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 rounded border border-line bg-bg px-3 py-2 focus-within:border-accent">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded border border-line px-2 py-0.5 text-xs text-dim"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="hover:text-accent"
                >
                  ✕
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
            <div className="absolute left-0 right-0 z-10 mt-1 rounded border border-line bg-panel text-sm">
              {suggestions.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => addTag(s)}
                  className="block w-full px-3 py-1.5 text-left text-dim hover:text-accent"
                >
                  #{s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-dim">
        <input
          type="checkbox"
          checked={isOriginal}
          onChange={(e) => setIsOriginal(e.target.checked)}
          className="mt-0.5"
        />
        this is my original work
      </label>

      <div className="flex flex-col gap-3 rounded border border-line bg-panel p-4">
        <p className="text-accent">▍ before you upload</p>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={ownsRights}
            onChange={(e) => setOwnsRights(e.target.checked)}
            className="mt-0.5"
          />
          {OWNERSHIP_DECLARATION_TEXT}
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={agreesToTos}
            onChange={(e) => setAgreesToTos(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            {TOS_DECLARATION_TEXT}{" "}
            <Link
              href="/tos"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-accent"
            >
              read it here
            </Link>
            .
          </span>
        </label>
      </div>

      {submitError && <p className="text-sm text-dim">✕ {submitError}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded bg-accent px-6 py-3 font-bold text-bg disabled:opacity-40"
      >
        {submitting ? "$ uploading..." : "$ upload"}
      </button>
    </form>
  );
}

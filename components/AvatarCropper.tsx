"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, ZoomIn } from "lucide-react";

const BOX_SIZE = 260; // on-screen crop viewport, CSS px — square, matches the avatar's own shape
const OUTPUT_SIZE = 480; // exported bitmap size — plenty for a 72–104px on-screen avatar
const MAX_ZOOM = 3;

// A from-scratch square cropper (drag to pan, slider to zoom) rather than
// pulling in a cropping library — this is the only place in the app that
// needs one, and the whole implementation is just canvas math plus
// pointer events. Doubles as the fix for real photo uploads erroring out:
// phone/camera photos are routinely 3–15MB, well over the profile
// avatar's 2MB cap (see app/api/profile/route.ts), and previously there
// was no way to get under that limit except finding a smaller file by
// hand. Exporting a fixed 480×480 JPEG here means the uploaded blob is
// always tiny (tens of KB) regardless of the source photo's size.
export function AvatarCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // "Cover" scale — the zoom=1 baseline where the image's shorter side
  // exactly fills the square box, same rule as CSS background-size:cover.
  const baseScale = imgSize ? Math.max(BOX_SIZE / imgSize.w, BOX_SIZE / imgSize.h) : 1;
  const displayScale = baseScale * zoom;
  const displayW = imgSize ? imgSize.w * displayScale : 0;
  const displayH = imgSize ? imgSize.h * displayScale : 0;

  function clampOffset(x: number, y: number) {
    const maxX = Math.max(0, (displayW - BOX_SIZE) / 2);
    const maxY = Math.max(0, (displayH - BOX_SIZE) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(clampOffset(dragState.current.origX + dx, dragState.current.origY + dy));
  }
  function onPointerUp() {
    dragState.current = null;
  }

  function handleZoomChange(next: number) {
    setZoom(next);
    // Re-clamp immediately — zooming out can leave the current offset
    // pointing past the (now smaller) displayed image's edge.
    const nextScale = baseScale * next;
    const nextW = imgSize ? imgSize.w * nextScale : 0;
    const nextH = imgSize ? imgSize.h * nextScale : 0;
    const maxX = Math.max(0, (nextW - BOX_SIZE) / 2);
    const maxY = Math.max(0, (nextH - BOX_SIZE) / 2);
    setOffset((prev) => ({
      x: Math.min(maxX, Math.max(-maxX, prev.x)),
      y: Math.min(maxY, Math.max(-maxY, prev.y)),
    }));
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !imgSize) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outScale = OUTPUT_SIZE / BOX_SIZE;
    const destW = displayW * outScale;
    const destH = displayH * outScale;
    const destX = OUTPUT_SIZE / 2 + offset.x * outScale - destW / 2;
    const destY = OUTPUT_SIZE / 2 + offset.y * outScale - destH / 2;

    ctx.drawImage(img, 0, 0, imgSize.w, imgSize.h, destX, destY, destW, destH);
    canvas.toBlob((blob) => blob && onConfirm(blob), "image/jpeg", 0.87);
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(20,50,60,0.55)] p-5 backdrop-blur-[6px]">
      <div className="w-full max-w-[360px] rounded-[24px] border border-line bg-panel p-5 shadow-soft-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-text">Adjust photo</h3>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-bg text-dim transition-colors hover:text-text"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div
          className="relative mx-auto cursor-grab touch-none select-none overflow-hidden rounded-2xl border border-line bg-bg active:cursor-grabbing"
          style={{ width: BOX_SIZE, height: BOX_SIZE }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={imgUrl}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
              }}
              className="pointer-events-none absolute left-1/2 top-1/2"
              style={{
                width: imgSize ? imgSize.w * displayScale : "auto",
                height: imgSize ? imgSize.h * displayScale : "auto",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <ZoomIn size={15} strokeWidth={1.75} className="shrink-0 text-dim" />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
        <p className="mt-1.5 text-center text-[11.5px] text-dim">drag to reposition · slide to zoom</p>

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={onCancel}
            className="rounded-xl border border-line bg-bg px-4 py-2.5 text-sm font-semibold text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!imgSize}
            className="gradient-brand flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check size={15} strokeWidth={2} />
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}

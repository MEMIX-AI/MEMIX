"use client";

import { useRef, useState } from "react";

const BAR_COUNT = 48;

// Deterministic per-asset "waveform" — not a real audio analysis (that's
// meaningfully heavier than "sederhana" calls for), just a stable-looking
// visual built from the asset id so the same asset always renders the
// same bars.
function barHeights(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const heights: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    heights.push(20 + (h % 1000) / 1000 * 60);
  }
  return heights;
}

export function AudioPlayer({
  assetId,
  src,
  title,
}: {
  assetId: string;
  src: string;
  title: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const heights = barHeights(assetId);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      void audio.play();
    }
  }

  return (
    <div className="rounded border border-line bg-panel p-6">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          if (audio.duration) setProgress(audio.currentTime / audio.duration);
        }}
      >
        <track kind="captions" />
      </audio>

      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          aria-label={playing ? `pause ${title}` : `play ${title}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-line text-xl text-accent hover:border-accent"
        >
          {playing ? "⏸" : "▸"}
        </button>

        <div className="flex h-16 flex-1 items-end gap-[2px] overflow-hidden">
          {heights.map((h, i) => {
            const active = i / heights.length <= progress;
            return (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`w-full rounded-sm ${active ? "bg-accent" : "bg-line"}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

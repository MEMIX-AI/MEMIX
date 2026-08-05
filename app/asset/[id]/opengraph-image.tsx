import { ImageResponse } from "next/og";
import { getShareAsset } from "@/lib/asset-share";
import { isStorageKey } from "@/lib/asset-urls";
import { storage } from "@/lib/storage";
import { VIDEO_PLACEHOLDER_THUMBNAIL_URL } from "@/lib/thumbnail";
import { assetTypeLabel } from "@/lib/format";
import { verdictLabel, verdictStyle } from "@/lib/verdict";

// Our own copy of the site's real heading font (same face as next/font/
// google's Space Grotesk in app/layout.tsx) — next/og needs an explicit
// font for any text it draws. Loaded via fetch(new URL(..., import.meta
// .url)) rather than fs.readFile(process.cwd() + "public/...") on
// purpose: Vercel's serverless bundler traces and bundles files reached
// through that exact pattern, but does NOT include arbitrary files under
// public/ in a function's own filesystem at runtime (public/ is served
// straight from the CDN, not readable via fs from inside the lambda) —
// confirmed live, the fs.readFile version 500'd in production despite
// working fine locally. Colocating the .ttf next to this route file is
// what makes the relative import.meta.url resolution work.
const brandFont = fetch(new URL("./space-grotesk-bold.ttf", import.meta.url)).then((res) =>
  res.arrayBuffer(),
);

// Next.js wires this file's output into og:image/twitter:image
// automatically for every /asset/[id] page — no manual metadata.openGraph
// .images needed. Runs as its own request (a crawler fetches this URL
// separately, after parsing the page's HTML), so it always mints a fresh
// Supabase signed URL server-side rather than ever exposing one directly —
// no expiry-while-cached-by-a-crawler problem, and the image served here
// is always the small thumbnail, never the full downloadable file.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "memix — the librarian for the internet's meme library";

// Static blobs approximating the site's aurora background — Satori
// (next/og's renderer) doesn't support `filter: blur()`, so these are
// plain low-opacity circles instead of true blurred ones. At the scale a
// link-preview card actually renders this at, the difference is
// invisible; the goal is just "recognizably memix," not a pixel match.
function AuroraBg() {
  const blobs = [
    { color: "#4fd8ff", top: -180, left: -80, size: 560, opacity: 0.28 },
    { color: "#9b6bff", top: -160, left: 760, size: 520, opacity: 0.24 },
    { color: "#6df3c4", top: 320, left: 420, size: 480, opacity: 0.16 },
    { color: "#ff6bd6", top: 260, left: 980, size: 380, opacity: 0.14 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            background: b.color,
            opacity: b.opacity,
          }}
        />
      ))}
    </div>
  );
}

// Generated "cover art" for assets with no real thumbnail (sound, or
// video that only got the generic placeholder) — plain divs, not glyphs,
// so it can't ever hit Satori's font-fallback path (the actual crash
// found while testing: emoji characters aren't covered by our supplied
// Space Grotesk font, which forced Satori to fall back to its own bundled
// default font — broken on Windows, and untested/unproven on Vercel).
// An equalizer-bar mark echoes AudioPlayer.tsx's real waveform styling.
function GeneratedCover() {
  const bars = [38, 62, 46, 80, 54, 70, 42, 58, 34, 66];
  return (
    <div
      style={{
        width: 420,
        height: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 28,
        border: "2px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(135deg, #4fd8ff 0%, #6df3c4 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", height: 140 }}>
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: h * 1.5,
              marginLeft: i === 0 ? 0 : 8,
              borderRadius: 8,
              background: "rgba(7,8,11,0.55)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// A crawler hitting this URL and getting a hard 500 is worse than getting
// a generic-but-valid card, so every real failure mode below (DB down,
// Supabase signing failing, a font/Satori quirk we haven't hit yet) falls
// back to this bare-minimum render — no custom font, no remote image,
// nothing that could itself fail — instead of bubbling up as an error.
function PlainCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#07080b",
        color: "#f1f5f8",
        fontSize: 64,
        fontWeight: 700,
      }}
    >
      memix
    </div>
  );
}

export default async function OpengraphImage({ params }: { params: { id: string } }) {
  try {
    return await renderCard(params.id);
  } catch (err) {
    console.error(`opengraph-image render failed for asset ${params.id}:`, err);
    return new ImageResponse(<PlainCard />, size);
  }
}

async function renderCard(assetId: string) {
  const [asset, fontData] = await Promise.all([getShareAsset(assetId), brandFont]);
  const fonts = [{ name: "Space Grotesk", data: fontData, style: "normal" as const, weight: 700 as const }];

  if (!asset) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#07080b",
            color: "#f1f5f8",
            fontSize: 64,
            fontFamily: "Space Grotesk",
            fontWeight: 700,
          }}
        >
          <AuroraBg />
          memix
        </div>
      ),
      { ...size, fonts },
    );
  }

  const hasRealThumbnail = Boolean(
    asset.thumbnailUrl && asset.thumbnailUrl !== VIDEO_PLACEHOLDER_THUMBNAIL_URL,
  );
  const thumbnailSrc = hasRealThumbnail
    ? await (isStorageKey(asset.thumbnailUrl!)
        ? storage.getUrl(asset.thumbnailUrl!)
        : Promise.resolve(asset.thumbnailUrl!)
      ).catch(() => null)
    : null;

  const vStyle = verdictStyle(asset.verdictStatus);
  const verdict = verdictLabel(asset.verdictStatus);
  const vibe = asset.tags[0]?.name ?? assetTypeLabel(asset.type);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 70px",
          background: "#07080b",
          fontFamily: "Space Grotesk",
        }}
      >
        <AuroraBg />

        {/* Cover — real thumbnail when we have one, otherwise a
            generated brand-gradient "poster" card so sounds/videos
            without a real thumbnail still get a real cover, not a blank
            square. */}
        {thumbnailSrc ? (
          // next/image can't run inside next/og's Satori renderer — this
          // JSX never touches a real DOM/browser, it's compiled straight
          // to the output PNG, so a plain <img> is the only option here.
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={thumbnailSrc}
            alt=""
            width={420}
            height={420}
            style={{
              width: 420,
              height: 420,
              objectFit: "cover",
              borderRadius: 28,
              border: "2px solid rgba(255,255,255,0.12)",
            }}
          />
        ) : (
          <GeneratedCover />
        )}

        {/* Copy block */}
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 56, width: 610 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#98a2ad",
              marginBottom: 18,
            }}
          >
            {assetTypeLabel(asset.type)} / {vibe}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 54,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#f1f5f8",
              marginBottom: 28,
            }}
          >
            {asset.title.length > 70 ? asset.title.slice(0, 70).trimEnd() + "..." : asset.title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: 999,
              background: vStyle.bg,
              border: `2px solid ${vStyle.border}`,
              color: vStyle.text,
              fontSize: 26,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
              width: "fit-content",
            }}
          >
            {verdict}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 60,
              fontSize: 30,
              fontWeight: 700,
              color: "#4fd8ff",
            }}
          >
            memix
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

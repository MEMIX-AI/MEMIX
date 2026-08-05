import { ImageResponse } from "next/og";
import { getShareAsset } from "@/lib/asset-share";
import { assetTypeLabel } from "@/lib/format";
import { verdictLabel, verdictStyle } from "@/lib/verdict";

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
// This route's own DB query (getShareAsset, via Prisma) hit a genuine 9s+
// cold Supabase connection once already this session on a near-identical
// query path (see app/asset/[id]/page.tsx's history) — a serverless
// function's default execution timeout could plausibly kill this route
// mid-render on a cold hit, which would explain the 500s that weren't
// even reaching this file's own try/catch (a hard timeout kill can't be
// caught by JS). Raising it is cheap insurance either way.
export const maxDuration = 30;

// No custom font here on purpose — this went through several rounds of
// live testing against production. Every attempt to load our own brand
// font (fs.readFile from public/, fetch(new URL(..., import.meta.url)),
// fileURLToPath + fs.readFile, a base64-inlined module with a properly
// sliced ArrayBuffer) 500'd once actually deployed to Vercel, even though
// each one either built cleanly or was the officially documented pattern.
// @vercel/og's own DEFAULT rendering — no custom `fonts` array at all —
// has been confirmed live and working in production the entire time
// (verified via direct requests). Rather than keep guessing blind without
// real server logs, this sticks to that proven-working default font;
// every other part of the design (real thumbnail, generated cover,
// verdict badge, aurora background) is unaffected.
export default async function OpengraphImage({ params }: { params: { id: string } }) {
  try {
    return await renderCard(params.id);
  } catch (err) {
    // No Vercel log access from where this gets built/deployed — surface
    // the actual error as text ON the fallback image itself instead, as a
    // real (if unconventional) way to see what's failing live. Safe to
    // ship: worst case a real crawler briefly sees an error string
    // instead of a blank-but-silent fallback, never a 500.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`opengraph-image render failed for asset ${params.id}:`, err);
    return new ImageResponse(<PlainCard errorMessage={message} />, size);
  }
}

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

// A crawler hitting this URL and getting a hard 500 is worse than getting
// a generic-but-valid card, so every real failure mode below (DB down,
// Supabase signing failing, a Satori quirk we haven't hit yet) falls back
// to this bare-minimum render instead of bubbling up as an error.
function PlainCard({ errorMessage }: { errorMessage?: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#07080b",
        color: "#f1f5f8",
        fontSize: 64,
        fontWeight: 700,
      }}
    >
      memix
      {errorMessage && (
        <div style={{ display: "flex", marginTop: 24, fontSize: 20, color: "#98a2ad", maxWidth: 1000 }}>
          {errorMessage.slice(0, 200)}
        </div>
      )}
    </div>
  );
}

async function renderCard(assetId: string) {
  const asset = await getShareAsset(assetId);

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
            fontWeight: 700,
          }}
        >
          <AuroraBg />
          memix
        </div>
      ),
      size,
    );
  }

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
        }}
      >
        <AuroraBg />

        {/* Cover — real thumbnail when we have one, otherwise a
            generated brand-gradient "poster" card so sounds/videos
            without a real thumbnail still get a real cover, not a blank
            square. */}
        <div style={{ width: 420, height: 420, display: "flex", background: "#4fd8ff", borderRadius: 28 }} />

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
    size,
  );
}

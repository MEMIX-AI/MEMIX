# MEMEVAULT

AI agent librarian untuk meme library berbasis web. Baca file ini di setiap sesi/fase dan patuhi tanpa terkecuali — instruksi di sini override default behavior.

## KONSEP INTI

- Library meme GRATIS untuk manusia: gambar, video, sound. Semua bisa search & download tanpa login, tanpa wallet, tanpa bayar.
- Konten diupload oleh USER (user-generated content), bukan oleh platform. Ini fondasi posisi legal "platform/penyedia", bukan "penerbit konten".
- Kreator yang punya karya ORIGINAL bisa connect wallet dan membuka lapak untuk menjual karyanya (fase belakangan).
- Monetisasi utama nanti: akses programmatic (API / ACP skill untuk AI agent lain). Manusia gratis, mesin bayar. BUKAN dari menjual konten pihak ketiga.
- Ada AI agent bernama "The Librarian" sebagai muka platform: bisa dichat untuk cari asset, minta rekomendasi, dan lihat trending.

## POSISI LEGAL (WAJIB, jangan pernah dilanggar di fase manapun)

1. Platform TIDAK PERNAH mengupload konten sendiri ke library publik. Semua konten publik berasal dari user.
2. Setiap upload WAJIB melewati deklarasi: uploader mencentang pernyataan bahwa ia pemilik karya / punya hak atas karya tersebut, dan setuju Terms of Service.
3. Konten berhak cipta pihak ketiga TIDAK PERNAH berada di belakang paywall atau fitur berbayar. Yang boleh dijual hanya karya original kreator terverifikasi.
4. Ada sistem REPORT di setiap asset dan sistem TAKEDOWN di panel admin. Semua aksi takedown dicatat (siapa, kapan, alasan) sebagai paper trail.
5. Owner/admin punya kuasa penuh: hapus asset, takedown, ban uploader, feature/unfeature asset.

## PERAN & AKSES

- **Visitor** (tanpa wallet): browse, search, download, report. GRATIS penuh.
- **Creator** (connect wallet): upload asset + deklarasi. Nanti: buka lapak original.
- **Owner/Admin** (wallet address ada di env `ADMIN_WALLETS`): semua akses Creator + panel admin penuh.

## PRINSIP KODE

- Mobile-first, ringan, cepat.
- Jangan pakai localStorage untuk data penting; state di database.
- Tulis kode yang siap dimigrasi: abstraksi storage & DB di satu module supaya pindah ke Supabase itu tinggal ganti adapter.
- Bahasa UI: English (target market global), tone santai internet-native tapi jelas.

## STACK

- Next.js 14 (App Router) + TypeScript + Tailwind CSS.
- Database: SQLite via Prisma (lokal dulu, gampang dimigrasi ke Supabase/Postgres nanti — jangan pakai fitur spesifik SQLite yang tidak portable ke Postgres).
- File storage: folder lokal `/storage` (nanti dimigrasi ke Supabase Storage saat deploy) — semua akses baca/tulis file HARUS lewat satu module adapter di `/lib` (mis. `lib/storage.ts`), jangan akses `fs` langsung dari komponen/route lain.

## PRINSIP DESAIN VISUAL (WAJIB, konsisten di semua halaman & fase — jangan diganti tanpa perintah owner)

**v2 — diganti total 2026-07-25 atas perintah eksplisit owner** (redesign "modern, premium, cerah seperti startup AI/SaaS 2025", referensi Linear/Raycast/Vercel/Framer/Notion Calendar/Arc Browser). Versi v1 (dark terminal/CLI aesthetic — bg near-black, monospace-only, aksen kuning tunggal, tanpa gradient/glassmorphism) sudah tidak berlaku — jangan dikembalikan tanpa perintah owner yang baru. Layout/posisi/struktur halaman TIDAK berubah dari v1; yang berubah murni visual (warna, tipografi, radius, shadow, animasi, ikon).

- Arah: clean, minimal, modern, premium, soft glassmorphism, white theme, gradient halus, rounded corner, smooth animation.
- Font: 3 track (bukan monospace-only lagi) — heading `Space Grotesk` (`font-heading` / `var(--font-heading)`), body `Inter` (default, `var(--font-body)`), code/spec-sheet-style `JetBrains Mono` (`font-mono` / `var(--font-code)`). Dimuat via `next/font/google` di `app/layout.tsx`.
- Semua copy UI tetap lowercase (kecuali nama asset/user-generated content) — konvensi ini TIDAK berubah dari v1.
- Design tokens (CSS variables di `app/globals.css`, jangan hardcode di komponen):
  - `--bg: #f8fafc`
  - `--panel: #ffffff`
  - `--line: #e5e7eb`
  - `--text: #111827`
  - `--dim: #6b7280`
  - `--accent: #6d5df6`, `--accent-2: #8b5cf6`
  - `--ok: #22c55e` (sukses), `--warn: #f59e0b` (peringatan)
  - `--gradient-brand: linear-gradient(135deg, #6d5df6, #a855f7, #60a5fa)` — dipakai lewat utility class `.gradient-brand` (background) / `.gradient-text` (teks), BUKAN lewat `bg-accent` (`background-color` gak bisa nampung gradient).
  - `--shadow-soft`, `--shadow-soft-lg`, `--shadow-glow` — dipakai lewat `.shadow-soft` / `.shadow-soft-lg` / `.shadow-glow` (juga terdaftar di `tailwind.config.ts` sebagai `shadow-soft` dll).
- Vokabuler visual khas v2 (ganti total dari vokabuler ASCII v1 — TIDAK ada lagi `▍ › ▸ $` sebagai section marker/prefix, TIDAK ada lagi bracket nav `[library]`):
  - Section heading pakai dot gradient kecil + `<h2 className="font-heading font-bold">` (lihat `SectionHeading` di `app/page.tsx`).
  - Icon pakai `lucide-react` (sudah jadi dependency) — bukan glyph ASCII (▸ ✕ dst).
  - Tag warna deterministik per nama lewat `lib/tag-colors.ts#tagColor()` — funny=hijau, gaming=oranye, cat=biru, reaction=ungu, sisanya hash ke palet pastel yang sama.
  - Footer tetap satu-satunya tempat monospace/cursor-blink dipertahankan (`memevault :~$▊`, `.cursor-blink`) — ini disengaja, bukan sisa v1 yang lupa dihapus.
- Komponen: border-radius besar & lega (12px default via `tailwind.config.ts borderRadius.DEFAULT`, `rounded-2xl`/`rounded-[20px]`/`rounded-[24px]` untuk card/panel besar, `rounded-full` untuk semua button/pill/tag/nav-link). Border 1px `var(--line)` tetap dipakai tapi lebih sebagai pemisah halus, bukan elemen utama — soft shadow (`.shadow-soft`) yang mendefinisikan kedalaman. Semua CTA/button utama pakai `.gradient-brand text-white` + `.shadow-soft` idle → `.shadow-glow` hover.
- Glassmorphism: `.glass` (`backdrop-blur: 20px` + `bg-white/72%`) dipakai di `Navbar` (sticky) dan panel `LibrarianWidget`.
- Background dekoratif: `.bg-decoration` (fixed, di belakang semua konten, `z-index: -1`) — gradient putih→abu muda + 3 blur blob warna (`.bg-blob-violet/blue/pink`, opacity ~0.22, blur 90px) + dot pattern halus (`.bg-dots`) di `app/layout.tsx`. Tidak pernah mempengaruhi layout/scroll karena `position: fixed`.
- Motion: `.card-lift` (hover naik 6px + shadow bertambah, 200ms) di semua card, `.page-enter` (fade-in 320ms saat halaman dimuat) di root layout, transisi hover/focus 200–300ms di seluruh button/input/tag. Tetap hormati `prefers-reduced-motion` (semua animasi/transisi di-nolkan lewat media query di `globals.css`, tidak berubah dari v1).
- Kontras dari konten: sama seperti v1 — kulit site tetap disiplin (sekarang: putih/lembut, bukan gelap), yang "rame" tetap meme-nya sendiri (thumbnail, tag warna-warni).

## STRUKTUR FOLDER

```
/app         → Next.js App Router (routes, pages, layouts, API routes)
/components  → React components
/lib         → shared logic — storage adapter, prisma client, auth/wallet helpers, agent logic
/prisma      → schema.prisma, migrations
/storage     → uploaded files (gitignored) — never accessed directly outside lib/storage.ts
/docs        → project docs
```

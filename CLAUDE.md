# MEMIX

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

**v4 — diganti 2026-07-26 atas perintah eksplisit owner** ("AI Marketplace premium" — referensi Linear/Arc/Vercel/Perplexity/Raycast, aurora gradient + glassmorphism lebih kuat). Menggantikan v3 (teal/cyan/mint solid, blur 90px, gradient cyan→teal). **Layout/posisi/struktur/ukuran grid TIDAK berubah dari v1–v3 — eksplisit diminta owner** ("yang berubah HANYA visual design") — v4 murni token warna/blur/shadow/motion + dua komponen kecil ditambah (logo icon badge, footer social icon badge), bukan rombak arsitektur.

- Arah: premium AI startup, aurora gradient, frosted glass lebih kuat (blur besar), soft lighting, rounded modern, futuristic — lebih "mahal" dari v3.
- Design tokens (CSS variables di `app/globals.css`, jangan hardcode di komponen — **selalu cek versi terkini di file ini, jangan asumsikan nilai di bawah masih akurat kalau ada redesign lagi setelah ini**):
  - `--bg: #ddfcf6`, `--bg-2: #f0e8ff` (aurora mint→lavender, bukan teal solid v3)
  - `--panel: #fbfffe` (card/panel — kecuali `AssetCard` yang eksplisit `rgba(255,255,255,.65)` + blur, satu-satunya pengecualian)
  - `--line: rgba(60,100,180,.14)` (geser ke abu-biru, dari teal di v3)
  - `--text: #12283a`, `--dim: #4b6478`
  - `--accent: #12c7d6` (cyan, ganti dari teal `#1ca6b8`), `--accent-2: #3b82f6` (biru), `--accent-3: #9f8bff` (lavender), `--hover: #0eb8c9`
  - `--ok: #21c48c` (sukses, tidak berubah), `--warn: #f6b84c` (peringatan, tidak berubah)
  - `--gradient-brand: linear-gradient(135deg, #12c7d6, #3b82f6)` — cyan ke biru (v3: cyan→teal) — dipakai lewat `.gradient-brand`/`.gradient-text`, untuk button/nav-active/category-active/tag-active.
  - `--gradient-logo: linear-gradient(135deg, #12c7d6, #1ca6b8)` — cyan ke teal, **khusus logo** (`.gradient-logo`/`.gradient-logo-text`) — beda gradient dari `--gradient-brand`, ini permintaan eksplisit owner (LOGO section pakai warna beda dari BUTTON section).
  - `--shadow-soft`, `--shadow-soft-lg` (basis geser ke `rgba(30,60,120,...)`, dari teal di v3), `--shadow-glow` (cyan, basis `rgba(18,199,214,.32)`).
- Tag warna deterministik lewat `lib/tag-colors.ts#tagColor()` — **remap total dari v3**: cat=mint, funny=soft green, gaming=soft orange, reaction=soft purple, wojak=soft blue, qa=soft cyan, sisanya hash ke 7 warna yang sama (termasuk fallback sky). `video` (dulu named di v3) sekarang hash generik, gak named lagi.
- Category filter button (lihat `app/library/page.tsx`): default **glass putih** (`bg-white/40 border-white/60 backdrop-blur-md`) — beda dari v3 yang defaultnya transparan penuh tanpa blur.
- Komponen: border-radius besar (12px default, `rounded-[18px]`/`rounded-[20px]`/`rounded-[24px]` untuk card/panel besar, `rounded-full` untuk button/pill/tag/nav-link) — tidak berubah dari v3. `AssetCard` sekarang `rounded-[24px]` (naik dari `rounded-[20px]` di v3) + `bg-white/65 backdrop-blur-[18px] border-white/50` (kaca, bukan solid putih) + `shadow-[0_18px_40px_rgba(0,0,0,.06)]`.
- Glassmorphism lebih kuat: `.glass` sekarang `rgba(255,255,255,.45)` + `backdrop-blur: 28px` (v3: `rgba(240,255,252,.75)` + `18px`) — dipakai di `Navbar` (sekarang juga `rounded-b-[22px]` + `border-white/40`), panel `LibrarianWidget`, dan **`Footer` (baru — v3 footer polos tanpa glass)**. `SearchCommandInput` juga jadi kaca (`bg-white/55 backdrop-blur-xl rounded-[20px]`, gaya Spotlight macOS) — v3 pakai `bg-panel` solid.
- Background dekoratif: `.bg-decoration` (fixed, `z-index: -1`) — gradient aurora `135deg #DDFCF6→#CFF8F7→#C8F4FF→#D9ECFF→#F0E8FF` + 3 blur blob **`.bg-blob-teal/sky/lavender`** (ganti nama dari `-cyan/mint/turquoise`, warna `#54E2D0`/`#62D7FF`/`#9F8BFF`, blur naik ke **320px** dari 90px, opacity turun ke 0.16) + **`.bg-sparkle`** (baru — dot putih jarang, opacity 0.3) + `.bg-dots` (opacity turun ke 0.1, warna ganti ke cyan baru) di `app/layout.tsx`. Blob sekarang punya **animasi drift pelan** (`aurora-float`, 24s, staggered delay) — statis di v3. Gak pernah pengaruhi layout/scroll (`position: fixed`).
- Motion: `.card-lift` (hover naik **8px** + scale 1.02, shadow bertambah, border jadi `var(--hover)`/cyan, **250ms** — naik dari 6px/200ms di v3). Semua `duration-200` di komponen naik ke `duration-250` (custom Tailwind value di `tailwind.config.ts`). `.page-enter` (fade-in 320ms, tidak berubah). Hormati `prefers-reduced-motion` (tidak berubah — otomatis menonaktifkan `aurora-float` juga).
- Icon: `lucide-react`, tidak berubah dari v3, tapi **lebih tipis** — `strokeWidth` diturunkan app-wide (2.5→2, 2.25→1.75) biar kesannya lebih modern/premium. Logo `Navbar` sekarang punya icon badge kecil (`Sparkles` dalam lingkaran `.gradient-logo`) — v3 gak ada icon di logo, cuma wordmark + cursor-blink. Cursor-blink di logo dihapus (sekarang cuma di footer, sesuai klaim lama yang belum konsisten di v3).
- Font: Space Grotesk/Inter/JetBrains Mono via `next/font/google`, tidak berubah dari v2/v3.
- Kontras dari konten: kulit site tetap disiplin (sekarang: aurora mint-cyan-lavender lembut, bukan solid teal ataupun putih polos ataupun gelap), yang "rame" tetap meme-nya sendiri (thumbnail, tag warna-warni).

## STRUKTUR FOLDER

```
/app         → Next.js App Router (routes, pages, layouts, API routes)
/components  → React components
/lib         → shared logic — storage adapter, prisma client, auth/wallet helpers, agent logic
/prisma      → schema.prisma, migrations
/storage     → uploaded files (gitignored) — never accessed directly outside lib/storage.ts
/docs        → project docs
```

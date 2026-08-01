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

**v6 — diganti 2026-08-01 atas perintah eksplisit owner** ("vibrant dark aurora" — background gelap + aurora mesh blob statis + glassmorphism + spektrum gradient cyan→mint→biru→violet→pink di hero). Menggantikan v4/v5 (light aurora mint-lavender). **Layout/posisi/struktur/komponen TIDAK berubah — eksplisit diminta owner** ("Terapkan look-nya, jangan ubah data/logic yang udah jalan") — v6 murni token warna/gradient/shadow + swap logo dari teks "m" ke file gambar asli, bukan rombak arsitektur. Semua versi v4/v5 sebelum ini historis saja; **selalu cek nilai terkini di `app/globals.css`, jangan percaya hex di bawah kalau ada redesign lagi setelah v6**.

- Arah: dark aurora vibrant — near-black background, aurora blob mesh berwarna (cyan/mint/violet/biru/pink) blur besar tapi **statis, tanpa animasi infinite** (baik alasan visual maupun performa — blob statis cukup di-rasterize sekali, blob animasi harus recompute blur tiap frame), glassmorphism di setiap card/nav/modal, grain texture tipis.
- Design tokens (CSS variables di `app/globals.css`):
  - `--bg: #07080b`, `--bg-2: #0b0d11` (near-black, bukan lagi aurora-wash terang)
  - `--panel: rgba(20,23,29,.55)` (glass card/nav/modal — SEMUA surface sekarang pakai value yang sama ini, termasuk `AssetCard` yang di v4/v5 punya pengecualian sendiri; sekarang cuma `bg-panel` biasa)
  - `--line: rgba(255,255,255,.1)`, `--text: #f1f5f8`, `--dim: #98a2ad`, `--faint: #5d6670` (token baru, buat placeholder/teks paling redup)
  - `--accent: #4fd8ff` (cyan, warna utama), `--accent-2: #6df3c4` (mint), `--accent-3: #9b6bff` (violet), `--blue: #5b7cff`, `--pink: #ff6bd6` (token baru buat spektrum gradient), `--hover: #29c6f5`
  - `--ok: #6df3c4` (mint, dulu hijau `#3ccb7f`), `--warn: #ffb84d` (amber), `--coming-soon: #8b95a0`
  - `--gradient-brand: linear-gradient(135deg, #4fd8ff, #6df3c4)` — cyan→mint, dipakai lewat `.gradient-brand`/`.gradient-text` buat button/nav-active/category-active/tag-active/connect-wallet.
  - `--gradient-logo` — sama value dengan `--gradient-brand` sekarang (logo sendiri udah bukan gradient text lagi, lihat poin logo di bawah; token ini disisakan buat kompatibilitas kalau ada yang masih pakai `.gradient-logo-text`).
  - `--gradient-spectrum: linear-gradient(100deg, #4fd8ff 0%, #6df3c4 30%, #5b7cff 55%, #9b6bff 78%, #ff6bd6 100%)` — **token baru**, khusus judul hero "verdict." di `app/page.tsx` lewat class `.gradient-spectrum`, satu-satunya tempat yang pakai 5-stop penuh.
  - `--shadow-soft`/`--shadow-soft-lg` (basis `rgba(0,0,0,...)` gelap, bukan lagi teal/biru tipis), `--shadow-hover` (`rgba(0,0,0,.55)` + glow mint tipis), `--shadow-glow` (mint, `rgba(109,243,196,.4)`).
- Verdict badge (`lib/verdict.ts`) — **WAJIB dari brief**: LIVE = mint glow, DATED = amber, DEAD = abu redup. Formula "glow chip": teks+dot warna cerah penuh, background tint alpha rendah (~.10) dari hue yang sama, plus border ring alpha sedang (~.25-.3) — bukan lagi "teks gelap di atas bg pucat" ala v4/v5 (itu nyaris invisible di background gelap). EMERGING/PEAKING satu keluarga hue cyan (beda shade), FADING/DATED satu keluarga hue amber (beda shade), sama seperti pola lama, cuma hex-nya di-kalibrasi ulang buat kontras di dark bg.
- Tag warna (`lib/tag-colors.ts#tagColor()`) — **remap total dari v4/v5**: formula "glow chip" yang sama kayak verdict badge (dulu pastel pucat + teks gelap, sekarang tint gelap rendah-alpha + teks cerah + border). Named tags (cat/funny/gaming/reaction/wojak/qa) + fallback sky tetap 7 slot yang sama, cuma re-tint.
- Card border-glow-on-hover: `.card-glow-border` (utility baru) — ring gradient 1px (cyan→violet→pink) yang muncul cuma pas hover, dipasang di `AssetCard` lewat `::after` + mask-composite trick. Card butuh `relative` + class ini bareng `card-lift`.
- Logo: **file gambar asli** (`public/logo-memix.png`, 256px, ~12KB — resize+compress dari source 2048px via sharp) gantiin logo teks "m" di kotak gradient. Dipakai di `Navbar` (32px, `rounded-full`, lewat `next/image`) dan `Footer` (26px). Favicon: `app/icon.png` (512px, Next.js App Router auto-detect, gantiin `app/favicon.ico` lama yang udah dihapus — jangan taruh keduanya sekaligus, bikin ambigu logo mana yang kepakai browser).
- ConnectKit (`components/providers/Web3Provider.tsx`): `theme="midnight"` (bawaan ConnectKit, gantiin `"soft"` yang asumsi modal terang) + override `--ck-accent-color`/`--ck-accent-text-color`/`--ck-focus-color` ke cyan brand — jangan hardcode override body-background/body-color lagi, biarin `midnight` handle kontras internal wallet-list/QR-modal yang gak semuanya kekontrol dari sini.
- Background dekoratif: `.bg-decoration` (fixed, `z-index:-1`, di `app/layout.tsx`) — 5 blob blur statis (`.bg-blob-cyan/violet/mint/pink/blue`, blur 90px, opacity 0.24–0.5, posisi beda-beda) + `.bg-dots` sekarang jadi grain texture tipis (radial-gradient dot 1px, size 3px, bukan lagi dot-grid 26px kayak v4/v5). **Tidak ada animasi apapun di layer ini** — beda dari v4 yang blob-nya `aurora-float` 24s drift; v6 eksplisit statis (lihat alasan performa di atas).
- Komponen: border-radius/motion/icon/font semua **tidak berubah** dari v5 (`rounded-[18-24px]`, `card-lift` 250ms, lucide-react strokeWidth 1.75-2, Space Grotesk/Inter/JetBrains Mono) — v6 murni re-tint token, bukan redesign struktural.

## STRUKTUR FOLDER

```
/app         → Next.js App Router (routes, pages, layouts, API routes)
/components  → React components
/lib         → shared logic — storage adapter, prisma client, auth/wallet helpers, agent logic
/prisma      → schema.prisma, migrations
/storage     → uploaded files (gitignored) — never accessed directly outside lib/storage.ts
/docs        → project docs
```

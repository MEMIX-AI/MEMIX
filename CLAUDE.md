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

**v3 — diganti total 2026-07-25 atas perintah eksplisit owner, sesi kedua** (redesign "teal/cyan/mint, modern AI marketplace premium", referensi Linear/Arc/Vercel/Perplexity/Raycast/Warp). Menggantikan v2 (ungu/putih polos — lihat commit "redesign: modern SaaS visual system") yang cuma bertahan satu sesi. **"Jangan pakai tema putih polos"** eksplisit dari owner — v3 pakai wash teal/mint, bukan putih. Layout/posisi/ukuran grid/struktur halaman TIDAK berubah dari v1/v2 — cuma warna, tidak ada perubahan struktural. Font (Space Grotesk/Inter/JetBrains Mono), sistem icon (lucide-react), dan vokabuler visual (dot section heading, tag berwarna deterministik, footer monospace) dari v2 **tetap dipakai** — v3 murni ganti token warna + beberapa detail interaksi (default category button transparan, bukan putih), bukan rombak ulang arsitektur.

- Arah: modern AI startup, glassmorphism, soft gradient, premium, bright but elegant, futuristic.
- Design tokens (CSS variables di `app/globals.css`, jangan hardcode di komponen — **selalu cek versi terkini di file ini, jangan asumsikan nilai di bawah masih akurat kalau ada redesign lagi setelah ini**):
  - `--bg: #cfefea`, `--bg-2: #dff6f3` (bg utama TIDAK putih — teal muda)
  - `--panel: #f2fffd` (card/panel — kecuali `AssetCard` yang eksplisit `#FFFFFF` per spec CARD section, satu-satunya pengecualian)
  - `--line: rgba(40,120,130,.15)`
  - `--text: #12333a`, `--dim: #4b6a72`
  - `--accent: #1ca6b8` (teal), `--accent-2: #48c9c7` (cyan), `--accent-3: #8ee7d7` (mint), `--hover: #13b8c8`
  - `--ok: #21c48c` (sukses), `--warn: #f6b84c` (peringatan)
  - `--gradient-brand: linear-gradient(135deg, #24c4d6, #1ca6b8)` — cyan ke teal, dipakai lewat `.gradient-brand`/`.gradient-text`, BUKAN `bg-accent` (`background-color` gak bisa nampung gradient). `.gradient-brand:hover` (kalau elemennya `<a>`/`<button>`) otomatis `brightness(1.08)`.
  - `--shadow-soft`, `--shadow-soft-lg` (basis: `0 12px 30px rgba(20,120,120,.08)`), `--shadow-glow` (cyan) — lewat `.shadow-soft`/`.shadow-soft-lg`/`.shadow-glow`.
- Tag warna deterministik lewat `lib/tag-colors.ts#tagColor()` — funny=mint, gaming=cyan, cat=turquoise, reaction=soft blue, video=teal, sisanya hash ke palet pastel teal/cyan yang sama. Kalau nambah nama tag baru yang perlu warna spesifik, tambah ke `NAMED_INDEX` di file itu.
- Category filter button (lihat `app/library/page.tsx`): default **transparan** (bukan `bg-panel`), border `border-line`, hover & active pakai `.gradient-brand` + teks putih — beda dari v2 yang defaultnya putih solid.
- Komponen: border-radius besar (12px default, `rounded-[18px]`/`rounded-[20px]`/`rounded-[24px]` untuk card/panel besar, `rounded-full` untuk button/pill/tag/nav-link) — TIDAK berubah dari v2. `AssetCard` thumbnail eksplisit `rounded-[18px]` (bukan `rounded-2xl` generik) dan border/shadow eksplisit sesuai spec CARD, bukan token umum.
- Glassmorphism: `.glass` (`backdrop-blur: 18px` + `rgba(240,255,252,.75)`) di `Navbar` (sticky) dan panel `LibrarianWidget`.
- Background dekoratif: `.bg-decoration` (fixed, `z-index: -1`) — gradient `135deg #D7F5EF→#CBEFEA→#DDF8F6→#EAFDFC` + 3 blur blob (`.bg-blob-cyan/mint/turquoise`, opacity ~0.18, blur 90px) + dot pattern di `app/layout.tsx`. Gak pernah pengaruhi layout/scroll (`position: fixed`).
- Motion: `.card-lift` (hover naik 6px **+ scale 1.02**, shadow bertambah, border jadi `var(--hover)`/cyan, 200ms) — scale ditambahin di v3, TIDAK ada di v2. `.page-enter` (fade-in 320ms), transisi hover/focus 200–300ms di semua interactive element. Hormati `prefers-reduced-motion` (tidak berubah).
- Icon: `lucide-react`, tidak berubah dari v2. Font: Space Grotesk/Inter/JetBrains Mono via `next/font/google`, tidak berubah dari v2. Footer tetap satu-satunya tempat monospace/cursor-blink (`memevault :~$▊`).
- Kontras dari konten: kulit site tetap disiplin (sekarang: teal/mint lembut, bukan putih polos ataupun gelap), yang "rame" tetap meme-nya sendiri (thumbnail, tag warna-warni).

## STRUKTUR FOLDER

```
/app         → Next.js App Router (routes, pages, layouts, API routes)
/components  → React components
/lib         → shared logic — storage adapter, prisma client, auth/wallet helpers, agent logic
/prisma      → schema.prisma, migrations
/storage     → uploaded files (gitignored) — never accessed directly outside lib/storage.ts
/docs        → project docs
```

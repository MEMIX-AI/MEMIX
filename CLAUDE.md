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

- Arah: terminal/CLI aesthetic ala dev.fun — "arsip meme yang dikelola lewat terminal". Serius di kulit, meme di isi.
- Font: monospace untuk SEMUA teks (stack: `ui-monospace, "SF Mono", Menlo, Consolas, monospace`). Tidak ada font kedua.
- Semua copy UI lowercase (kecuali nama asset/user-generated content).
- Design tokens (pakai CSS variables, jangan hardcode di komponen):
  - `--bg: #0b0d10` (near-black)
  - `--panel: #11141a`
  - `--line: #232833` (border 1px)
  - `--text: #e8e6e0`
  - `--dim: #8a919e`
  - `--accent: #ffd23f` (kuning meme — SATU-SATUNYA warna aksen)
  - `--ok: #7ee787` (status sukses saja)
- Vokabuler visual khas (pakai konsisten):
  - Marker section: karakter `▍` warna aksen sebagai pengganti heading dekoratif.
  - Nav pakai bracket: `[library] [upload] [agent] [docs]`.
  - Cursor blink `▊` di logo dan footer (footer selalu diakhiri `:~$▊`).
  - Prefix `$ ` untuk elemen bergaya command, `› ` untuk balasan agent, `▸ ` untuk label panel.
  - Data ditampilkan gaya spec-sheet: grid sel ber-border 1px, label kecil dim di atas value bold.
- Komponen: border-radius kecil (4-8px), border 1px `var(--line)`, hover → border jadi `var(--accent)`. TANPA gradient, TANPA glassmorphism, TANPA drop-shadow warna-warni. Shadow hitam halus boleh untuk panel utama saja.
- Motion minimal: cursor blink, pulse dot untuk status live, transisi border/transform ≤200ms. Hormati `prefers-reduced-motion`.
- Kontras dari konten: kulit site disiplin & monokrom, yang "rame" adalah meme-nya sendiri (thumbnail, emoji di judul asset, dsb).

## STRUKTUR FOLDER

```
/app         → Next.js App Router (routes, pages, layouts, API routes)
/components  → React components
/lib         → shared logic — storage adapter, prisma client, auth/wallet helpers, agent logic
/prisma      → schema.prisma, migrations
/storage     → uploaded files (gitignored) — never accessed directly outside lib/storage.ts
/docs        → project docs
```

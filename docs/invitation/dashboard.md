# Dashboard Undangan — Epic & Task

Dokumen ini adalah kontrak kerja (requirement tidak berubah tanpa keputusan
eksplisit). Task dibuat bertahap sesuai pelajaran dari task sebelumnya.

## Requirements (IMMUTABLE)

- **Login**: Supabase Auth magic link (email), hanya email di `DASHBOARD_EMAILS`
  yang boleh masuk. Setelah login, browser memakai **cookie httpOnly** milik
  aplikasi, bukan token Supabase.
- **Data tamu**: sumber awal Google Sheets (per sheet = grup), diimpor ke tabel
  `guests` di Supabase. Upsert berdasarkan nomor telepon yang sudah dinormalisasi
  ke format `62…`. Slug tamu = nama + 4 karakter acak (`budi-santoso-a1b2`).
- **Pelacakan buka undangan**: saat tamu membuka `/invitation/:slug`,
  `guests.invitation_opened_at` diisi sekali (hanya jika masih null).
- **Wall**: kartu foto/ucapan dikelola dari dashboard (lihat + hapus, termasuk
  file di Storage). Mode `?admin=<token>` lama tetap berfungsi sebagai cadangan.
- **Blast WhatsApp**: **ditunda** (butuh contoh payload Wablas). Skema `wa_sends`
  sudah disiapkan agar tidak perlu migrasi ulang.
- Semua akses DB lewat server function dengan service key; tidak ada key di
  browser kecuali publishable key khusus Supabase Auth.
- Dashboard `noindex, nofollow`.

## Success Criteria

- [ ] `/dashboard` tanpa sesi → redirect ke `/dashboard/login`.
- [ ] Login magic link menghasilkan cookie `dash_session` (httpOnly, 7 hari) dan
      email di luar allowlist ditolak dengan pesan jelas.
- [ ] Cookie dipalsukan/kedaluwarsa → semua halaman dashboard redirect lagi.
- [ ] Tamu hasil impor punya slug unik dan bisa dibuka di `/invitation/:slug`.
- [ ] `invitation_opened_at` terisi tepat sekali per tamu.
- [ ] Hapus kartu wall dari dashboard menghapus row + file Storage.
- [ ] `pnpm lint`, `tsc --noEmit`, `pnpm test`, `pnpm build` hijau.

## Anti-Patterns (FORBIDDEN)

- ❌ **Token Supabase disimpan di localStorage untuk sesi aplikasi** (alasan:
  XSS dapat mencurinya; kita pakai cookie httpOnly yang ditandatangani HMAC).
- ❌ **Token admin di URL untuk dashboard** (alasan: masuk history/referrer,
  dan dashboard memuat nomor telepon tamu).
- ❌ **Service role key di bundle browser** (alasan: bypass RLS; hanya server).
- ❌ **Menyimpan nomor telepon apa adanya** (alasan: Wablas butuh `62…`; nomor
  tidak konsisten membuat upsert gagal dan blast dobel).
- ❌ **Mock Supabase di test integrasi** (alasan: kita menguji alur nyata; mock
  hanya untuk fungsi murni).
- ❌ **Membangun UI blast/konten sekarang** (alasan: blast ditunda, konten fase
  berikutnya; jangan buat kode mati).

## Scope

**In scope (sekarang):** auth + sesi, impor tamu dari Sheets, daftar/edit/hapus
tamu, pelacakan buka undangan, tab wall (lihat + hapus), shell dashboard.

**Out of scope:** blast Wablas, editor konten undangan, analitik lanjutan,
multi-bahasa.

## Setup manual (di luar kode)

1. Supabase → Authentication → URL Configuration: tambah
   `https://anaslabs.my.id/dashboard/auth` dan
   `http://localhost:3000/dashboard/auth`.
2. `.env` (lokal) & `~/anaslabs/.env` (VPS): `SUPABASE_PUBLISHABLE_KEY`,
   `DASHBOARD_EMAILS` (2 email, dipisah koma), `DASHBOARD_SESSION_SECRET`.
3. Jalankan migrasi `supabase/migrations/0002_guests.sql` di SQL Editor (Task 2).

**Catatan arsitektur:** URL + publishable key Supabase **tidak** memakai variabel
`VITE_*`. Image dibangun di GitHub Actions yang tidak punya `.env`, sehingga nilai
build-time akan kosong di produksi. Keduanya dibaca di server lalu dikirim ke
browser lewat `getDashboardAuthConfig`; publishable key memang publik dan tidak
bisa melewati RLS.

## Task 1 — Auth & shell dashboard

Deliverable: login magic link → cookie sesi → halaman `/dashboard` yang
terlindungi.

- [x] `src/lib/dashboard-session.ts` — tanda tangan/verifikasi cookie (HMAC,
      7 hari) + 8 unit test.
- [x] `src/lib/dashboard-auth.ts` — `getDashboardAuthConfig`,
      `createDashboardSession`, `getDashboardUser`, `signOutDashboard`.
- [x] `src/lib/supabase-browser.ts` — client dibuat dari config runtime.
- [x] Route `/dashboard` (guard), `/dashboard/login`, `/dashboard/auth`.
- [x] Verifikasi CDP: tanpa sesi → `/dashboard/login`; cookie palsu → tetap
      redirect; `/dashboard/auth` tanpa token → pesan "Tautan tidak valid";
      halaman login mendeteksi config (tanpa peringatan setup).

## Task berikutnya (dibuat setelah Task 1 selesai)

- Task 2: migrasi `guests` + impor Sheets + daftar/edit/hapus tamu.
- Task 3: pelacakan `invitation_opened_at` dari halaman undangan.
- Task 4: tab Wall (lihat + hapus) memakai `listWallCards`/`deleteWallCard`.
- Nanti: blast Wablas (`wa_sends` sudah disiapkan), editor konten.

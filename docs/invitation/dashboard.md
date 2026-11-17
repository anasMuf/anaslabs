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

1. **Login password (cara utama)**
   ```bash
   node scripts/dashboard-password.mjs "password-panjang-anda"
   ```
   Tempel baris `DASHBOARD_PASSWORD_HASH=…` ke `.env` lokal dan `~/anaslabs/.env`,
   tambahkan `DASHBOARD_IDENTITY=…` bila ingin nama tampil, lalu **restart server**.
2. **Login magic link (opsional)**: Supabase → Authentication → URL Configuration,
   tambahkan `https://anaslabs.my.id/dashboard/auth` dan
   `http://localhost:3000/dashboard/auth`, lalu isi `DASHBOARD_EMAILS`.
   Kena kuota email free (±2/jam), jadi tidak dipakai sebagai jalur utama.
3. Jalankan migrasi `supabase/migrations/0002_guests.sql` di SQL Editor (Task 2).

**Catatan arsitektur:**
- URL + publishable key Supabase **tidak** memakai variabel `VITE_*`. Image
  dibangun di GitHub Actions yang tidak punya `.env`, sehingga nilai build-time
  akan kosong di produksi. Keduanya dibaca di server lalu dikirim ke browser
  lewat `getDashboardAuthConfig`.
- Hash password **wajib** memakai pemisah `:` (bukan `$`): Vite mengekspansi `$`
  di nilai `.env` (dotenv-expand), sehingga hash `$`-separated tiba di server
  dalam keadaan rusak — pernah kejadian dan membuat verifikasi selalu gagal.
- Sesi: cookie `dash_session` httpOnly + `secure` (mengikuti NODE_ENV), bertanda
  tangan HMAC, 7 hari. Password dan magic link berbagi cookie yang sama.
- Rate limit login: 5 percobaan / 10 menit per IP, disimpan di memori proses.

## Task 1 — Auth & shell dashboard

Deliverable: login magic link → cookie sesi → halaman `/dashboard` yang
terlindungi.

- [x] `src/lib/dashboard-session.ts` — tanda tangan/verifikasi cookie (HMAC,
      7 hari) + unit test.
- [x] `src/lib/dashboard-password.ts` + `scripts/dashboard-password.mjs` — login
      password (scrypt), pemisah `:`, unit test.
- [x] `src/lib/rate-limit.ts` — 5 percobaan / 10 menit, unit test.
- [x] `src/lib/dashboard-auth.ts` — `getDashboardLoginMode`,
      `createDashboardPasswordSession`, `createDashboardSession` (magic link),
      `getDashboardUser`, `signOutDashboard`.
- [x] `src/lib/supabase-browser.ts` — client dibuat dari config runtime.
- [x] Route `/dashboard` (guard), `/dashboard/login`, `/dashboard/auth`.
- [x] Verifikasi CDP: password salah → "Password salah."; password benar →
      `/dashboard` dengan cookie httpOnly+secure yang bertahan setelah reload;
      "Keluar" → kembali ke login. Tanpa sesi → redirect; cookie palsu → redirect.

## Task berikutnya (dibuat setelah Task 1 selesai)

- Task 2: migrasi `guests` + impor Sheets + daftar/edit/hapus tamu.
- Task 3: pelacakan `invitation_opened_at` dari halaman undangan.
- Task 4: tab Wall (lihat + hapus) memakai `listWallCards`/`deleteWallCard`.
- Nanti: blast Wablas (`wa_sends` sudah disiapkan), editor konten.

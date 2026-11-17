# Dashboard Undangan — Epic & Task

Dokumen ini adalah kontrak kerja (requirement tidak berubah tanpa keputusan
eksplisit). Task dibuat bertahap sesuai pelajaran dari task sebelumnya.

## Requirements (IMMUTABLE)

- **Login**: Supabase Auth (email + password, akun dibuat di Supabase →
  Authentication → Users). Akses dibatasi tabel `dashboard_users`; email di luar
  tabel ditolak walaupun passwordnya benar. Setelah login, browser memakai
  **cookie httpOnly** milik aplikasi, bukan token Supabase. Tidak ada kredensial
  dashboard di `.env`.
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
- [ ] Login email + password menghasilkan cookie `dash_session` (httpOnly, 7
      hari) dan email di luar `dashboard_users` ditolak dengan pesan jelas.
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

1. **Tabel akses**: jalankan `supabase/migrations/0002_dashboard_users.sql` di
   SQL Editor, lalu isi email Anda berdua:
   ```sql
   insert into public.dashboard_users (email) values
     ('nama1@gmail.com'),
     ('nama2@gmail.com')
   on conflict (email) do nothing;
   ```
2. **Akun login**: Supabase → Authentication → Users → *Add user*, isi email yang
   sama dengan langkah 1 dan password (minimal 8 karakter). Centang
   *Auto Confirm User* agar tidak perlu klik email konfirmasi.
3. **Env server**: pastikan `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
   `SUPABASE_PUBLISHABLE_KEY`, `DASHBOARD_SESSION_SECRET` (≥16 karakter) ada di
   `.env` lokal dan `~/anaslabs/.env`, lalu **restart server**.
4. Jalankan migrasi `supabase/migrations/0003_guests.sql` di SQL Editor (Task 2).

**Catatan arsitektur:**
- URL + publishable key Supabase **tidak** memakai variabel `VITE_*`. Image
  dibangun di GitHub Actions yang tidak punya `.env`, sehingga nilai build-time
  akan kosong di produksi. Keduanya dibaca di server lalu dikirim ke browser
  lewat `getDashboardAuthConfig`.
- Sesi: cookie `dash_session` httpOnly + `secure` (mengikuti NODE_ENV), bertanda
  tangan HMAC, 7 hari. Browser memakai sesi Supabase sekali saja (untuk
  `signInWithPassword`), lalu langsung `signOut` sehingga access token tidak
  tersimpan sebagai sesi aplikasi.
- `getDashboardUser` mengecek ulang `dashboard_users` setiap request: hapus satu
  baris = akses dicabut seketika, tanpa restart.
- Tidak ada secret login di `.env`, jadi proses lama/stale tidak bisa membuat
  login gagal seperti pada pendekatan hash password sebelumnya.

## Task 1 — Auth & shell dashboard

Deliverable: login email + password → cookie sesi → halaman `/dashboard` yang
terlindungi.

- [x] `src/lib/dashboard-session.ts` — tanda tangan/verifikasi cookie (HMAC,
      7 hari) + unit test.
- [x] `src/lib/dashboard-auth.ts` — `getDashboardAuthConfig`,
      `getDashboardLoginMode`, `createDashboardSession` (verifikasi token Supabase
      + cek `dashboard_users`), `getDashboardUser`, `signOutDashboard`.
- [x] `supabase/migrations/0002_dashboard_users.sql` — tabel allowlist akses.
- [x] `src/lib/supabase-browser.ts` — client dibuat dari config runtime.
- [x] Route `/dashboard` (guard), `/dashboard/login`, `/dashboard/auth`.
- [x] Verifikasi CDP: password salah → "Email atau password salah."; email di
      luar `dashboard_users` → ditolak; kredensial benar → `/dashboard` dengan
      cookie httpOnly yang bertahan setelah reload; "Keluar" → kembali ke login.
      Tanpa sesi → redirect; cookie palsu → redirect.

## Task berikutnya (dibuat setelah Task 1 selesai)

- Task 2: migrasi `guests` + impor Sheets + daftar/edit/hapus tamu.
- Task 3: pelacakan `invitation_opened_at` dari halaman undangan.
- Task 4: tab Wall (lihat + hapus) memakai `listWallCards`/`deleteWallCard`.
- Nanti: blast Wablas (`wa_sends` sudah disiapkan), editor konten.

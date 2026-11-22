# Dashboard Undangan — Epic & Task

Dokumen ini adalah kontrak kerja (requirement tidak berubah tanpa keputusan
eksplisit). Task dibuat bertahap sesuai pelajaran dari task sebelumnya.

## Requirements (IMMUTABLE)

- **Login**: Supabase Auth (email + password, akun dibuat di Supabase →
  Authentication → Users). Akses dibatasi tabel `dashboard_users`; email di luar
  tabel ditolak walaupun passwordnya benar. Setelah login, browser memakai
  **cookie httpOnly** milik aplikasi, bukan token Supabase. Tidak ada kredensial
  dashboard di `.env`.
- **Data tamu**: sumber awal Google Sheets (satu sheet per mempelai: `anas`,
  `mila`; kolom `KETERANGAN` = grup). Impor **tempel-salin** dari dashboard:
  blok baris sheet, tempel, pratinjau, terapkan. Kolom dikenali dari judulnya
  (`NAMA`, `KETERANGAN`, `ALAMAT`, `DIUNDANG`, `FISIK/DIGITAL`,
  `STATUS PENGIRIMAN`, opsional `NO HP`), bukan dari urutannya. Nilai `-`
  disimpan sebagai `NULL`.
- **Identitas tamu saat impor**: `(source_sheet, name_key, group_name)`; nama
  boleh kembar dalam satu sheet selama grupnya berbeda (dua "Wildan" di Afindo
  dan Unhasy). Pencocokan impor ulang mendahulukan grup yang sama.
- **Slug tamu**: nama saja (`cak-abid`), tanpa karakter acak; nama kembar diberi
  akhiran `-2`, `-3`. Slug **permanen**: impor ulang tidak pernah mengubahnya.
  Konsekuensi yang diterima: link bisa dienumerasi, jadi halaman undangan tidak
  boleh menampilkan nomor HP atau grup.
- **Edit/hapus tamu**: edit mengubah nama/grup/alamat/DIUNDANG/tipe/HP tanpa
  menyentuh `slug`; "hapus" berarti **arsip** (`archived_at`) supaya link yang
  sudah beredar tetap hidup.
- **Tamu `fisik`** tetap punya baris (untuk status cetak) tetapi link-nya tidak
  dibagikan.
- **Nomor HP** belum ada di sheet; kolomnya sudah disiapkan (`guests.phone`,
  dinormalisasi ke `62…`) untuk blast nanti.
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
- [ ] Tamu hasil impor punya slug unik (nama, akhiran `-2` bila kembar) dan bisa
      dibuka di `/invitation/:slug`; nama hilang dari sheet diarsipkan, bukan
      dihapus, sehingga link lama tetap hidup.
- [ ] `invitation_opened_at` terisi tepat sekali per tamu.
- [ ] Hapus kartu wall dari dashboard menghapus row + file Storage.
- [ ] `pnpm lint`, `tsc --noEmit`, `pnpm test`, `pnpm build` hijau.

## Anti-Patterns (FORBIDDEN)

- ❌ **Token Supabase disimpan di localStorage untuk sesi aplikasi** (alasan:
  XSS dapat mencurinya; kita pakai cookie httpOnly yang ditandatangani HMAC).
- ❌ **Token admin di URL untuk dashboard** (alasan: masuk history/referrer, dan
  dashboard memuat nomor telepon tamu). Mode `?admin=` hanya untuk wall sebagai
  cadangan.
- ❌ **Mengubah slug tamu saat impor ulang** (alasan: link yang sudah beredar
  akan mati; identitas tamu adalah slug, bukan nama di sheet).
- ❌ **Menghapus baris tamu yang hilang dari sheet** (alasan: link lama harus tetap
  hidup; pakai `archived_at`).
- ❌ **Menampilkan nomor HP atau grup di halaman undangan** (alasan: slug hanya
  nama sehingga mudah ditebak/dienumerasi; nama tampil saja sudah cukup).
- ❌ **Kredensial dashboard di `.env`** (alasan: sumber kebenaran adalah Supabase
  Auth + tabel `dashboard_users`, bukan environment).
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
4. Jalankan migrasi `supabase/migrations/0003_guests.sql` di SQL Editor (Task 2),
   lalu `0004_guest_details.sql` (kolom `ALAMAT`/`DIUNDANG` + identitas
   nama+grup).

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

## Task 2 — Tamu & impor sheet

Deliverable: impor tempel-salin → daftar tamu → link undangan → pelacakan buka.

- [x] `supabase/migrations/0003_guests.sql` — tabel `guests`, RLS aktif tanpa
      policy, indeks `(source_sheet, name_key)` dan `invitation_opened_at`.
- [x] `src/lib/guest-import.ts` — parser TSV/CSV (header-driven), `slugifyGuestName`,
      `guestNameKey`, `normalizeGuestPhone`, `planGuestImport` (create / update /
      restore / archive / unchanged) + 21 unit test.
- [x] `src/lib/guests.ts` — `listGuestsPage`, `getGuestStats`, `importGuests`
      (pratinjau & terapkan, upsert per 200 baris), `setGuestSent`,
      `markGuestOpened`; semua dijaga `readDashboardUser`.
- [x] `src/lib/guest-lookup.ts` — slug → nama untuk halaman undangan dan wall,
      dengan fallback ke `data/invitation-guests.ts` (slug lama & `/test`).
- [x] `src/routes/dashboard.tamu.tsx` — panel impor (pilih sheet, tempel,
      pratinjau, terapkan), ringkasan status, pencarian, salin link (hanya
      digital), tandai terkirim.
- [x] `markGuestOpened` dipanggil dari `/invitation/$slug` (sekali saja).
- [ ] Verifikasi E2E setelah migrasi 0003 dijalankan (impor data asli, buka link,
      cek `invitation_opened_at`).

## Task 2b — Kolom ALAMAT & DIUNDANG

Deliverable: sheet terbaru bisa diimpor tanpa kehilangan tamu bernama sama.

- [x] `supabase/migrations/0004_guest_details.sql` — kolom `address`, `invited`;
      unique `(source_sheet, name_key)` diganti indeks
      `(source_sheet, name_key, coalesce(group_name, ''))`.
- [x] `src/lib/guest-import.ts` — header `ALAMAT`/`DIUNDANG`, dedupe per
      nama+grup, pencocokan dua tahap (grup dulu, lalu sisa), diff `alamat` dan
      `undangan`.
- [x] `src/lib/guests.ts` + `/dashboard/tamu` — kolom baru ikut dibaca/ditulis,
      tampil di kartu tamu dan ikut dicari.

## Task 2c — Daftar tamu sebagai tabel + impor terpisah

Deliverable: impor dan daftar tamu berdiri sendiri; daftar bisa di-scroll tanpa
memuat semua baris sekaligus.

- [x] `src/routes/dashboard.impor.tsx` — `/dashboard/impor`: pilih sheet, tempel,
      pratinjau, terapkan, lalu tautan ke daftar. Setelah terapkan, loader
      dashboard di-invalidate.
- [x] `src/lib/guests.ts` — `listGuestsPage` (offset/limit, pencarian server-side
      di nama/grup/alamat/DIUNDANG/slug/HP, urutan stabil `source_sheet, name_key,
      id`, `count: exact`) menggantikan `listGuests`; `getGuestStats` untuk
      ringkasan angka (6 count query paralel).
- [x] `src/routes/dashboard.tamu.tsx` — tabel (Nama, Grup, Alamat, Tipe, Status,
      Aksi) + **infinite scroll** (`IntersectionObserver`, halaman 40 baris,
      tombol "Muat lagi" sebagai cadangan), pencarian debounce 300 ms yang
      mereset daftar ke halaman pertama.
- [x] Navigasi dashboard: Ringkasan · Daftar Tamu · Impor Tamu.

## Task 2d — Filter lengkap & status buka hanya untuk digital

- [x] `listGuestsPage` menerima `source`, `group`, `address`, `delivery`, `sent`,
      `opened` di samping `query`; semuanya difilter di server (PostgREST) dan
      tetap dipakai saat memuat halaman berikutnya.
- [x] `getGuestFilterOptions` — daftar grup & alamat aktif **per sheet**
      (`all`/`anas`/`mila`) untuk dropdown yang saling bergantung.
- [x] `src/routes/dashboard.tamu.tsx` — panel FILTER (Tamu, Grup, Alamat, Tipe,
      Pengiriman, Buka undangan) + tombol Reset; perubahan filter langsung
      mereset daftar ke halaman pertama. **Grup dan alamat mengikuti pilihan
      Tamu** (mis. Mila hanya menampilkan 6 grup miliknya), dan pilihan yang
      tidak ada di sheet baru otomatis dikosongkan.
- [x] **Undangan fisik tidak punya status buka**: kolom Status menampilkan `—`
      (dengan tooltip), filter "Buka undangan" dinonaktifkan saat Tipe=Fisik,
      filter buka hanya mencakup tamu `digital`, dan angka `opened` di ringkasan
      dihitung dari tamu digital saja.

## Task 3 — Edit & hapus tamu

Deliverable: koreksi data dari dashboard tanpa membunuh link yang sudah beredar.

- [x] `updateGuest` (`src/lib/guests.ts`) — ubah nama, grup, alamat, DIUNDANG,
      tipe, dan nomor HP. `slug` **tidak pernah** ditulis; `name_key` mengikuti
      nama baru agar impor berikutnya tetap mengenali tamu. Pelanggaran indeks
      unik `(source_sheet, name_key, group)` (kode `23505`) diubah jadi pesan
      yang bisa dibaca.
- [x] `archiveGuest` — tombol "Hapus tamu" mengisi `archived_at`: hilang dari
      daftar/hitungan, tetapi `/invitation/:slug` tetap hidup. Impor ulang nama
      yang sama memulihkannya.
- [x] `src/components/dashboard/GuestEditDialog.tsx` — dialog ubah data (datalist
      grup & DIUNDANG, nomor dinormalisasi ke `62…`) + konfirmasi hapus.
- [x] `src/routes/dashboard.tamu.tsx` — tombol "Ubah" per baris; baris lokal dan
      angka ringkasan diperbarui tanpa memuat ulang seluruh tabel.
- [ ] Verifikasi E2E lewat UI setelah dev server di-restart.

## Task berikutnya

- Task 4: tab Wall (lihat + hapus) memakai `listWallCards`/`deleteWallCard`.
- Nanti: blast Wablas (`wa_sends`), editor konten.

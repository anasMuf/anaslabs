# Blast WhatsApp (Wablas) — Spec & Epic

Dokumen ini adalah kontrak kerja untuk halaman manajemen blast. Requirement di
bagian **Requirements (IMMUTABLE)** tidak berubah tanpa keputusan eksplisit;
task dibuat bertahap mengikuti pelajaran dari task sebelumnya.

Konteks: `docs/invitation/dashboard.md` sebelumnya menunda blast dan menulis
"skema `wa_sends` sudah disiapkan". Setelah diperiksa, **tidak ada migrasi
`wa_sends`** di repo. Epik ini membuat skema yang sebenarnya, sekaligus
menyelesaikan atribusi nomor, OG metadata, template, pengiriman, dan tracking.

---

## Capability Map

| Module id | Responsibility | Depends on |
|---|---|---|
| `blast-channels` | Simpan & uji kredensial Wablas untuk 2 nomor (Anas, Mila) | — |
| `blast-attribution` | Atribusi nomor pengirim per tamu (`blast_channel` override) | `blast-channels` |
| `invitation-og` | Metadata Open Graph global yang bisa diedit + upload gambar | — |
| `blast-templates` | Template pesan per mempelai, render variabel, pratinjau | — |
| `blast-sending` | Kirim single (langsung) & bulk (antrian + worker) | `blast-channels`, `blast-attribution`, `blast-templates` |
| `blast-tracking` | Riwayat/status per pesan, ringkasan batch, sinkron `sent_at` | `blast-sending` |

Build order: `blast-channels` → `blast-attribution` → `invitation-og` →
`blast-templates` → `blast-sending` → `blast-tracking`.
`invitation-og` tidak bergantung pada modul lain dan boleh dikerjakan paralel
dengan `blast-templates` setelah dua modul pertama selesai.

---

## Requirements (IMMUTABLE)

### Umum

- Semua pemanggilan Wablas dilakukan **di server** (`createServerFn` atau API
  route). Token dan secret key tidak pernah dikirim ke browser, tidak masuk
  log, dan tidak disimpan sebagai plaintext.
- Semua akses DB memakai `getSupabaseAdmin()` dengan `SUPABASE_SECRET_KEY`; RLS
  tetap aktif dan tidak ada key rahasia di bundle.
- Setiap aksi tulis dari dashboard wajib melewati `readDashboardUser()`
  (kecuali endpoint worker yang memakai token worker).

### `blast-channels` — environment Wablas 2 nomor

- Tersedia **dua kanal**: `anas` dan `mila`, masing-masing satu device Wablas.
- Kredensial yang disimpan per kanal: `base_url` (mis.
  `https://jogja.wablas.com`), `token`, `secret_key`, `sender_phone` (opsional,
  hanya untuk tampilan).
- `token` dan `secret_key` **dienkripsi** (AES-256-GCM) dengan kunci turunan
  `DASHBOARD_SESSION_SECRET`. Format ciphertext berversi (`v1:iv:tag:data`).
  API hanya mengembalikan status terisi + 4 karakter terakhir (masked).
- Halaman setup menyediakan tombol **Uji koneksi** yang memanggil
  `GET {base_url}/api/device/info?token={token}` dan menyimpan status terakhir:
  `status` (connected/disconnected), `quota`, `expired_date`, `device_id` &
  `sender`.
- Menyimpan kredensial baru wajib melalui uji koneksi yang berhasil; kredensial
  yang gagal diuji tidak ditulis.
- Kanal bisa dinonaktifkan (`enabled = false`) tanpa menghapus kredensial.
- Menghapus/merotasi `DASHBOARD_SESSION_SECRET` membuat ciphertext lama tidak
  bisa dibaca; UI harus menampilkan pesan "kredensial perlu diisi ulang",
  bukan crash.

### `blast-attribution` — atribusi nomor di daftar tamu

- Nomor pengirim efektif seorang tamu adalah
  `guests.blast_channel ?? guests.source_sheet`.
- `guests.blast_channel` boleh `NULL` (ikut sumber), `anas`, atau `mila`.
- `GuestEditDialog` menampilkan pilihan "Nomor pengirim": *Ikut sumber
  (Anas/Mila)*, *Anas*, *Mila*.
- Daftar tamu menampilkan kanal efektif sebagai teks kecil di samping nama atau
  di detail baris, agar salah atribusi terlihat sebelum blast.
- Mengubah atribusi **tidak** mengubah `slug`, `name_key`, atau `source_sheet`.

### `invitation-og` — metadata Open Graph

- Metadata OG bersifat **global per undangan** (bukan per tamu): `og_title`,
  `og_description`, `og_image_url`.
- Field kosong berarti memakai nilai default yang sekarang:
  judul `${nama pasangan} — Undangan Pernikahan`, deskripsi dari view undangan,
  gambar `${SITE_URL}/invitation/og-card.jpg`.
- Gambar OG dapat diunggah dari dashboard: JPEG/PNG/WebP, maks 2 MB, disarankan
  1200×630. Disimpan di bucket `invitation-media` dengan path `og/<uuid>.<ext>`
  dan URL publiknya disimpan di `invitation_meta`.
- `/invitation/:slug` memakai nilai override bila ada; tag yang dipakai tetap
  `og:title`, `og:description`, `og:type`, `og:image`, `og:image:width`,
  `og:image:height`, `og:image:alt`, `twitter:card`, `twitter:image`.
- Halaman dashboard menyediakan pratinjau kartu OG dan tombol "Salin URL uji".
- Metadata tidak boleh memuat nomor HP atau data tamu.

### `blast-templates` — template & pratinjau

- Satu template per mempelai (`anas`, `mila`), disimpan di `blast_templates`.
- Variabel yang didukung: `{nama}`, `{grup}`, `{alamat}`, `{diundang}`,
  `{link}`, `{mempelai}`.
- Render dilakukan **server-side** sebelum dikirim; tidak memakai spintax
  Wablas dan tidak bergantung pada phonebook Wablas.
- Nilai kosong diganti string aman: `{grup}` → `tamu`, `{alamat}` → `-`,
  `{diundang}` → `-`; `{link}` selalu URL absolut
  `${SITE_URL}/invitation/{slug}`.
- Pratinjau memakai tamu contoh yang bisa dipilih dari daftar tamu (default:
  tamu digital pertama) dan ditampilkan sebagai balon chat WhatsApp.
- Pesan final divalidasi maksimum 1024 karakter (batas Wablas); lebih dari itu
  ditolak sebelum masuk antrian.
- Template bisa "Reset ke default".

### `blast-sending` — single & bulk

- **Single**: kirim satu tamu langsung dari halaman tamu/tracking. Server
  merender pesan, memanggil Wablas satu kali, lalu mencatat `wa_sends` dan
  `guests.sent_at` bila diterima. Ada opsi **Pratinjau** yang tidak mengirim.
- **Bulk**: membuat `blast_batches` + baris `wa_sends` berstatus `queued`.
  Pengiriman dilakukan **worker** yang mengambil antrian secara atomik.
- Kriteria tamu yang boleh masuk antrian:
  `archived_at is null`, `delivery = 'digital'`, `phone is not null`, kanal
  efektif aktif, dan tidak ada `wa_sends` aktif (`queued`/`sending`) untuk tamu
  yang sama.
- Bulk memiliki opsi "hanya yang belum terkirim" (`sent_at is null`).
- Bulk wajib melewati langkah konfirmasi yang menampilkan jumlah penerima per
  kanal + perkiraan kuota; tombol kirim tidak aktif bila 0 penerima.
- Worker: `POST /api/blast/worker`, diamankan header
  `Authorization: Bearer ${BLAST_WORKER_TOKEN}` (perbandingan timing-safe).
  Tanpa token yang cocok → 401; env tidak diset → 503.
- Worker memproses maksimum **25 pesan per kanal per panggilan** memakai
  `POST {base_url}/api/v2/send-message` dengan `data[]` (maks 50 per request
  menurut dokumentasi Wablas).
- Klaim antrian memakai fungsi Postgres `claim_blast_sends(limit)` dengan
  `FOR UPDATE SKIP LOCKED`, sehingga dua worker tidak pernah mengirim pesan
  yang sama.
- Setiap baris `wa_sends` memiliki `ref_id` unik yang dikirim ke Wablas dan
  dipakai untuk mencocokkan `data.messages[]` pada response.
- Status baris: `queued`, `sending`, `sent`, `failed`, `skipped`, `canceled`.
  `sent` berarti **diterima Wablas** (`status: true`, message `status:
  pending|sent`), bukan bukti dibaca.
- Retry: hanya untuk kegagalan transien (HTTP 429, 5xx, jaringan/timeout),
  maksimum 3 percobaan, dengan `available_at` mundur (1, 3, 9 menit). Error
  kredensial/kuota/perangkat/parameter tidak diulang.
- `guests.sent_at` hanya diisi setelah Wablas menerima pesan; tidak pernah
  ditulis untuk pesan yang gagal.
- Setelah antrian diproses, batch dianggap `completed` bila tidak ada baris
  `queued`/`sending` tersisa; `failed` dihitung terpisah.
- Dashboard dapat memicu proses antrian secara manual (server fn dengan sesi
  dashboard) agar single/tes tidak menunggu cron.

### `blast-tracking` — tracking

- Halaman tracking menampilkan ringkasan batch (total, sent, failed, queued)
  dan tabel `wa_sends`: nama tamu, kanal, status, percobaan, error, waktu
  antre/kirim, dan `wablas_message_id`.
- Filter: batch, kanal, status, dan pencarian nama/nomor.
- Status buka undangan tetap dari `guests.invitation_opened_at` (tidak berubah).
- Tidak ada webhook Wablas pada fase ini (keputusan pemilik). Kolom status
  akhir (`delivered`/`read`) tidak dijanjikan; dokumentasikan bahwa `sent` =
  diterima antrian Wablas.
- Aksi tersedia: kirim ulang baris `failed` (membuat percobaan baru dengan
  `ref_id` baru, bukan mengubah baris lama) dan batalkan baris `queued`.

### Infrastruktur

- Env baru: `BLAST_WORKER_TOKEN` (≥16 karakter). Ditambahkan ke `.env.example`
  dan `/api/health` (boolean presence saja).
- `docker-compose.yml` mendapat service `worker` (image ringan, loop tiap 30
  detik memanggil endpoint worker dengan token).
- Migrasi baru: `supabase/migrations/0009_blast.sql`.

---

## Success Criteria (MUST ALL BE TRUE)

- [ ] Dua kanal Wablas dapat diisi dari dashboard, diuji koneksinya, dan token
      tersimpan terenkripsi (tidak ada plaintext di DB/response/log).
- [ ] Uji koneksi menampilkan status device, kuota, dan tanggal kedaluwarsa.
- [ ] Setiap tamu memakai kanal efektif `blast_channel ?? source_sheet`, dan
      override bisa diubah dari dialog edit tamu tanpa mengubah slug.
- [ ] Judul/deskripsi/gambar OG dapat diubah dari dashboard dan benar-benar
      muncul di HTML `/invitation/:slug` (dicek dengan curl).
- [ ] Template per mempelai tersimpan, pratinjau merender semua variabel, dan
      pesan >1024 karakter ditolak dengan pesan jelas.
- [ ] Single send mengisi `wa_sends` + `guests.sent_at` hanya saat Wablas
      menerima; kegagalan tercatat dengan error yang bisa dibaca.
- [ ] Bulk membuat antrian tanpa mengirim; worker mengirim, tidak pernah
      menduplikasi pesan untuk tamu yang sama, dan menghormati batas 25/kanal.
- [ ] Tamu `fisik`, tanpa nomor, atau kanal nonaktif tidak pernah masuk antrian.
- [ ] Halaman tracking menampilkan status per pesan dan ringkasan batch serta
      konsisten dengan daftar tamu.
- [ ] `biome check`, `tsc --noEmit`, `pnpm test`, `pnpm build` hijau.
- [ ] SSR smoke test: halaman dashboard blast 200 dengan cookie sesi; worker
      endpoint 401 tanpa token dan 200 dengan token.
- [ ] `docs/invitation/dashboard.md` diperbarui (blast tidak lagi "ditunda").

---

## Anti-Patterns (FORBIDDEN)

- ❌ **Token/secret Wablas di browser, localStorage, query string, atau log**
  (alasan: kredensial bisa menulis WhatsApp atas nama pemilik).
- ❌ **Menyimpan token Wablas sebagai plaintext di DB** (alasan: dump/backup DB
  membocorkan kredensial; gunakan AES-256-GCM).
- ❌ **Memanggil Wablas langsung dari komponen** (alasan: membocorkan secret dan
  melewati validasi server).
- ❌ **Menganggap `status: true` sebagai "terkirim/dibaca"** (alasan: Wablas
  hanya mengonfirmasi antrian; dokumentasikan `sent` = diterima).
- ❌ **Mengirim satu request per pesan untuk bulk** (alasan: boros rate limit;
  pakai `data[]` maks 25 per panggilan).
- ❌ **Menduplikasi pesan untuk tamu yang sama** (alasan: tamu menerima undangan
  dobel; gunakan partial unique index + `SKIP LOCKED`).
- ❌ **Mengisi `guests.sent_at` sebelum Wablas menerima** (alasan: status di
  daftar tamu jadi bohong).
- ❌ **Mengirim ke tamu `fisik`, tanpa nomor, arsip, atau kanal nonaktif**
  (alasan: tidak ada tujuan yang valid / kuota terbuang).
- ❌ **Memakai spintax/phonebook Wablas untuk personalisasi** (alasan: data
  kontak tidak sinkron dengan tabel tamu; render sendiri).
- ❌ **Endpoint worker tanpa autentikasi** (alasan: siapa pun bisa memicu blast).
- ❌ **Menambah webhook Wablas pada fase ini** (alasan: keputusan pemilik; jangan
  membuat kode mati/endpoint publik yang tidak dipakai).
- ❌ **Mengubah slug tamu saat blast/atribusi** (alasan: link yang beredar mati).
- ❌ **Menghapus riwayat `wa_sends` saat kirim ulang** (alasan: audit dan
  rekonsiliasi butuh jejak percobaan).
- ❌ **Hardcode server Wablas** (alasan: device bisa pindah server; `base_url`
  per kanal).

---

## Architecture

```
src/lib/blast/
  crypto.ts          AES-256-GCM encrypt/decrypt + masked hint
  channels.ts        server fns: list/save/test/toggle channel
  wablas.ts          adapter HTTP (device info, v2 send-message)
  template.ts        pure: render variables, validate length, defaults
  queue.ts           server fns: queue bulk, cancel, status
  send.ts            server fns: single send, process queue once
  worker.ts          processor dipakai API route + server fn
  attribution.ts     pure: effective channel resolution

src/routes/
  dashboard.blast.tsx        shell + ringkasan + tab
  dashboard.blast.setup.tsx  (atau tab) kanal Wablas
  dashboard.blast.template.tsx
  dashboard.blast.kirim.tsx
  dashboard.blast.tracking.tsx
  api.blast.worker.ts        POST /api/blast/worker
  invitation.$slug.tsx       head memakai getInvitationMeta()

src/components/dashboard/blast/
  ChannelForm.tsx, TemplateEditor.tsx, MessagePreview.tsx,
  AudienceTable.tsx, BatchSummary.tsx, TrackingTable.tsx

supabase/migrations/0009_blast.sql
```

Catatan rute: TanStack Start menurunkan path dari nama file; `api.health.ts`
menjadi `/api/health`, jadi `api.blast.worker.ts` menjadi `/api/blast/worker`.
Bila tree memecah tab menjadi beberapa file, semua tetap di bawah
`/dashboard/blast`.

### Alur data

1. Setup kanal → `encrypt(token|secret)` → `blast_channels` → uji
   `/api/device/info` → simpan status/kuota.
2. Tamu → `blast_channel ?? source_sheet` → kanal.
3. Template + tamu → `renderTemplate()` → pesan final (≤1024) + `ref_id`.
4. Single → Wablas langsung → update `wa_sends` + `guests.sent_at`.
5. Bulk → `blast_batches` + `wa_sends(status=queued)` → worker klaim 25 →
   kirim batch v2 → cocokkan `ref_id` → update status/`sent_at` → batch selesai.
6. Tracking membaca `wa_sends` + `guests.invitation_opened_at`.

### Skema DB (ringkas)

```sql
-- 0009_blast.sql
alter table public.guests
  add column if not exists blast_channel text
  check (blast_channel in ('anas', 'mila'));

create table public.blast_channels (
  source text primary key check (source in ('anas', 'mila')),
  label text not null,
  base_url text not null default 'https://jogja.wablas.com',
  sender_phone text,
  device_id text,
  token_cipher text not null,
  secret_cipher text not null,
  enabled boolean not null default true,
  status text,
  quota integer,
  expires_on date,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blast_templates (
  source text primary key check (source in ('anas', 'mila')),
  body text not null,
  updated_at timestamptz not null default now()
);

create table public.invitation_meta (
  id text primary key default 'default' check (id = 'default'),
  og_title text,
  og_description text,
  og_image_url text,
  updated_at timestamptz not null default now()
);

create table public.blast_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('anas', 'mila', 'all')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'canceled')),
  total integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.wa_sends (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.blast_batches(id) on delete set null,
  guest_id uuid references public.guests(id) on delete cascade,
  source text not null,
  phone text not null,
  message text not null,
  ref_id text not null unique,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed', 'skipped', 'canceled')),
  attempts integer not null default 0,
  wablas_message_id text,
  error text,
  available_at timestamptz not null default now(),
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index wa_sends_active_guest_idx
  on public.wa_sends (guest_id) where status in ('queued', 'sending');
create index wa_sends_status_idx on public.wa_sends (status, available_at);

alter table public.blast_channels enable row level security;
alter table public.blast_templates enable row level security;
alter table public.invitation_meta enable row level security;
alter table public.blast_batches enable row level security;
alter table public.wa_sends enable row level security;

create or replace function public.claim_blast_sends(p_limit int, p_source text default null)
returns setof public.wa_sends
language sql
security definer
set search_path = public
as $$
  update public.wa_sends s
  set status = 'sending', attempts = s.attempts + 1, updated_at = now()
  where s.id in (
    select id from public.wa_sends
    where status = 'queued'
      and available_at <= now()
      and (p_source is null or source = p_source)
    order by available_at
    limit p_limit
    for update skip locked
  )
  returning s.*;
$$;

revoke all on function public.claim_blast_sends(int, text) from public, anon, authenticated;
grant execute on function public.claim_blast_sends(int, text) to service_role;
```

`invitation_meta` dan `blast_templates` boleh dibuat di migrasi yang sama agar
jumlah migrasi tetap kecil.

### Adapter Wablas

- Device info: `GET {base_url}/api/device/info?token={token}` (sesuai
  dokumentasi). Response `data: { name, serial, sender, quota, expired_date,
  active, status }`.
- Kirim: `POST {base_url}/api/v2/send-message`
  - Header `Authorization: {token}.{secret_key}`, `Content-Type:
    application/json`, `Accept: application/json`.
  - Body `{ data: [{ phone, message, ref_id }] }`.
  - Sukses hanya bila HTTP 2xx **dan** `body.status === true`.
  - Cocokkan `data.messages[].ref_id`; simpan `id` sebagai
    `wablas_message_id`.
  - Error map: 429/5xx/jaringan → transien; 400/401/403/404/422 dan pesan
    `token invalid`, `secret key invalid`, `device disconnected`,
    `quota is not enough`, `your package not support` → permanen.
- Link preview: pesan yang berisi URL dikirim lewat
  `POST {base_url}/api/v2/send-link` dengan body
  `{ data: [{ phone, message: { text, link }, ref_id }] }`. `text` = isi pesan
  tanpa URL. Bila endpoint ini menolak secara permanen (mis. paket tidak
  mendukung), baris tersebut dikirim ulang sebagai teks biasa lewat
  `send-message` agar undangan tetap sampai (tanpa kartu preview). Error
  transien tetap dilempar supaya worker mengulang.
- Timeout 10 s koneksi / 30 s request (`AbortSignal.timeout`).

### Kriptografi

- Kunci: `sha256(DASHBOARD_SESSION_SECRET + ":blast-v1")` → 32 byte.
- AES-256-GCM, IV acak 12 byte, tag 16 byte.
- Format `v1:<iv b64>:<tag b64>:<cipher b64>`; dekripsi gagal → error
  `"Kredensial perlu diisi ulang"`.
- Masking: tampilkan 4 karakter terakhir token saja.

---

## Boundaries

- **Always**: jalankan `corepack pnpm@10.19.0`; guard sesi untuk semua server
  fn tulis; validasi input dengan zod/whitelist; perbarui `docs/invitation/`
  saat perilaku berubah; uji fungsi murni (template, kripto, atribusi, error
  map) dengan vitest.
- **Ask first**: menambah dependency baru; mengubah `docker-compose.yml`
  produksi; menjalankan migrasi di Supabase; mengubah format `wa_sends` setelah
  dipakai.
- **Never**: commit secret; log token/pesan penuh/nomor HP; mengirim blast
  sungguhan dari test; memakai `console.log` berisi kredensial; menambahkan
  webhook pada fase ini.

---

## Setup manual

1. Jalankan `supabase/migrations/0009_blast.sql` di SQL Editor.
2. Tambahkan `BLAST_WORKER_TOKEN` (mis. `openssl rand -hex 32`) ke `.env` VPS.
   Tanpa token ini endpoint worker menjawab 503 dan `/api/health`
   melaporkan `blastWorker: false`.
3. Buka `/dashboard/blast/setup`, isi server/token/secret tiap mempelai, lalu
   simpan (disimpan hanya bila uji koneksi berhasil).
4. Bila IP restriction Wablas aktif, whitelist IP publik VPS.
5. Service worker di `docker-compose.yml` ditambahkan pada T12.

---

## Progress implementasi

- [x] T1 migrasi `0009_blast.sql` + env worker + health
- [x] T2 kripto AES-256-GCM + test
- [x] T3 adapter Wablas V2 + device info + test
- [x] T4 server fn kanal + uji koneksi
- [x] T5 UI setup 2 nomor
- [x] T6 atribusi `blast_channel` + dialog edit tamu
- [x] T7/T8 metadata OG + upload + head undangan
- [x] T9/T10 template per mempelai + pratinjau
- [x] T11 antrian + kirim single
- [x] T12 worker per kanal + compose sidecar
- [x] T13 halaman kirim + tracking + navigasi
- [ ] T14 verifikasi device nyata (menunggu setup Wablas)

Gate terakhir: `biome check`, `tsc --noEmit`, 183 test, `build`, SSR smoke
(dashboard 200, worker 401/200). Migrasi dan uji kirim nyata belum dijalankan
karena kredensial Wablas diisi nanti.

---

## Open Questions

1. **Format default template** — perlu contoh pesan final dari pemilik agar
   nada bahasanya cocok. Default sementara:
   ```
   Assalamu'alaikum {nama},

   Dengan penuh kebahagiaan, kami mengundang Anda untuk menghadiri pernikahan kami.

   Buka undangan: {link}

   Terima kasih.
   ```
2. **Kuota Wablas** — pastikan paket per device cukup untuk jumlah tamu
   (dicek dari `device/info` saat setup; UI menampilkan peringatan bila kuota <
   penerima).
3. **Nomor pengirim awal** — apakah device Anas dan Mila sudah aktif dan
   menggunakan server `jogja`? `base_url` bisa diubah per kanal.
4. **Jadwal blast** — fase ini hanya kirim sekarang/antrian. Penjadwalan
   (tanggal tertentu) ditunda.
5. **Webhook delivered/read** — ditunda sesuai keputusan pemilik; desain adapter
   menyisakan fungsi untuk menambahkannya nanti.

---

## Design Discovery (ringkas)

### Keputusan

| Pertanyaan | Jawaban | Implikasi |
|---|---|---|
| Penyimpanan kredensial | **B** — tabel DB terenkripsi | Butuh modul kripto + UI setup; rotasi session secret harus ditangani |
| Mekanisme bulk | **A** — antrian DB + worker cron | Butuh `blast_batches`, `wa_sends`, fungsi klaim, endpoint worker, service compose |
| Status pengiriman | **A** — tanpa webhook | `sent` = diterima Wablas; tidak ada janji delivered/read |
| OG metadata | **A** — global editable | Tabel `invitation_meta` + upload gambar + ubah `head()` |
| Template | **A** — per mempelai + pratinjau | Tabel `blast_templates`, render server-side |
| Cakupan | **A** — satu epik bertahap | 6 modul, tiap modul dirilis & diverifikasi sendiri |

### Riset

- **Dokumentasi Wablas** (`https://jogja.wablas.com/documentation/api`):
  V2 `send-message` menerima maks 50 baris per request, auth
  `TOKEN.SECRET_KEY`, response berisi `messages[].id` dan `ref_id`. Rate limit
  200 request & 10.000 baris penerima per kredensial per menit.
  `/api/device/info` memberi status, kuota, dan masa aktif.
- **Kode existing**: `guests.phone` sudah `62…`, `sent_at`/`opened_at` sudah
  dipakai, impor tamu sudah punya normalisasi nomor; `invitation_content`
  memakai pola server fn + secret key; upload media memakai
  `getPublicUrl()`.
- **Infrastruktur**: deploy lewat docker compose (`app` saja) + GitHub Actions,
  sehingga worker ditambahkan sebagai service sidecar, bukan proses terpisah
  di host.

### Dead-end yang dihindari

- **Kirim langsung dari browser** → ditolak: membocorkan token.
- **Satu request per pesan** → ditolak: boros rate limit dan lambat.
- **Webhook tracking sekarang** → ditunda sesuai keputusan, untuk menghindari
  endpoint publik yang belum dipakai.
- **Menyimpan OG di `invitation_content` JSON** → ditolak: mencampur konten
  undangan dengan metadata publik dan memaksa migrasi dokumen konten.

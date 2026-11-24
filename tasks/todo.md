# Task List — Blast WhatsApp (Wablas)

Spec: `docs/invitation/blast.md` · Plan: `tasks/plan.md`

Kerjakan berurutan. Jangan mulai task berikutnya sebelum gate di task berjalan
hijau.

---

- [x] **T1 — Migrasi & konfigurasi worker**
  - Acceptance: `supabase/migrations/0009_blast.sql` berisi `guests.blast_channel`, `blast_channels`, `blast_templates`, `invitation_meta`, `blast_batches`, `wa_sends`, index unik aktif, dan fungsi `claim_blast_sends`. `.env.example` memuat `BLAST_WORKER_TOKEN`. `/api/health` melaporkan `blastWorker: Boolean(BLAST_WORKER_TOKEN)`.
  - Verify: jalankan migrasi di SQL Editor staging; `supabase` select kosong; `curl /api/health`; gate.
  - Files: `supabase/migrations/0009_blast.sql`, `.env.example`, `src/routes/api.health.ts`, `docs/invitation/dashboard.md`.

- [x] **T2 — Kripto kredensial + test**
  - Acceptance: `encryptSecret`/`decryptSecret` AES-256-GCM format `v1:iv:tag:data`, `maskSecret` hanya 4 karakter akhir, dekripsi gagal menghasilkan error yang bisa dibaca. Test round-trip, ciphertext berbeda tiap enkripsi, tamper gagal.
  - Verify: `vitest run src/lib/blast/crypto.test.ts`; gate.
  - Files: `src/lib/blast/crypto.ts`, `src/lib/blast/crypto.test.ts`.

- [x] **T3 — Adapter Wablas + test**
  - Acceptance: `fetchDeviceInfo(channel)` memanggil `GET {base_url}/api/device/info?token=`; `sendMessages(channel, rows)` POST `/api/v2/send-message` dengan `Authorization: token.secret`, body `{data}`, timeout 30 s; parser sukses butuh 2xx + `status === true`; `classifyWablasError()` memetakan transien/permanen; test dengan `fetch` tiruan (bukan jaringan nyata).
  - Verify: unit test adapter + error map; gate.
  - Files: `src/lib/blast/wablas.ts`, `src/lib/blast/wablas.test.ts`.

- [x] **T4 — Server fn kanal**
  - Acceptance: `listBlastChannels`, `saveBlastChannel`, `testBlastChannel`, `setBlastChannelEnabled`. Semua tulis memakai `readDashboardUser()`. Token dienkripsi; respons hanya `tokenHint`, `hasSecret`, status/kuota/expired. Simpan hanya setelah uji koneksi sukses.
  - Verify: unit test helper murni bila ada; SSR smoke (200 dengan cookie); gate.
  - Files: `src/lib/blast/channels.ts`, `src/routes/dashboard.blast.setup.tsx`.

- [x] **T5 — UI setup kanal**
  - Acceptance: form per mempelai (base URL, token, secret, nomor pengirim), tombol Uji koneksi, status device/kuota/expired, toggle aktif, pesan error jelas. Tidak ada nilai token di DOM setelah simpan.
  - Verify: manual di browser (2 kanal); cek HTML tidak memuat token; gate.
  - Files: `src/components/dashboard/blast/ChannelForm.tsx`, `src/routes/dashboard.blast.setup.tsx`, `src/routes/dashboard.blast.tsx` (shell awal).

- [x] **T6 — Atribusi nomor per tamu**
  - Acceptance: `effectiveBlastChannel(guest)` pure (`blast_channel ?? source_sheet`); `updateGuest` menerima `blastChannel` (anas/mila/null); `GuestEditDialog` punya pilihan "Ikut sumber/Anas/Mila"; daftar tamu menampilkan kanal efektif; slug tidak berubah.
  - Verify: unit test resolver; ubah atribusi dua tamu di UI; gate.
  - Files: `src/lib/blast/attribution.ts`, `src/lib/blast/attribution.test.ts`, `src/lib/guests.ts`, `src/components/dashboard/GuestEditDialog.tsx`, `src/routes/dashboard.tamu.tsx`.

- [x] **T7 — Server fn OG metadata**
  - Acceptance: `getInvitationMeta()` publik (dipakai halaman undangan) dan `saveInvitationMeta()`/`uploadOgImage()` dengan sesi. Field kosong → fallback. Upload validasi JPEG/PNG/WebP ≤2 MB, path `og/<uuid>.<ext>`, simpan URL publik.
  - Verify: unit test validasi upload; gate.
  - Files: `src/lib/blast/og.ts`, `src/lib/invitation-upload.ts` (validator OG), `src/lib/blast/og.test.ts`.

- [x] **T8 — Route undangan & dashboard OG**
  - Acceptance: loader `/invitation/:slug` mengambil meta paralel; `head()` memakai override; dashboard `/dashboard/blast/og` punya form judul/deskripsi, upload gambar, pratinjau kartu OG, tombol salin URL uji.
  - Verify: `curl` HTML undangan memuat og:title/og:image override dan fallback; gate.
  - Files: `src/routes/invitation.$slug.tsx`, `src/routes/dashboard.blast.og.tsx`, `src/components/dashboard/blast/OgEditor.tsx`.

- [x] **T9 — Render template pure + test**
  - Acceptance: default template per mempelai; `renderTemplate(body, guest, channel)` mengganti `{nama}`, `{grup}`, `{alamat}`, `{diundang}`, `{link}`, `{mempelai}`; fallback aman; `validateTemplate` menolak >1024 karakter dan variabel tak dikenal; test semua kasus.
  - Verify: `vitest run src/lib/blast/template.test.ts`; gate.
  - Files: `src/lib/blast/template.ts`, `src/lib/blast/template.test.ts`.

- [x] **T10 — Server fn & UI template**
  - Acceptance: `getBlastTemplates`, `saveBlastTemplate`, `resetBlastTemplate`; editor per mempelai dengan penghitung karakter, daftar variabel, pemilih tamu contoh, pratinjau balon WhatsApp.
  - Verify: simpan + reset + pratinjau di browser; gate.
  - Files: `src/lib/blast/templates.ts`, `src/components/dashboard/blast/TemplateEditor.tsx`, `src/components/dashboard/blast/MessagePreview.tsx`, `src/routes/dashboard.blast.template.tsx`.

- [x] **T11 — Queue & single send**
  - Acceptance: `getBlastAudience(source)` mengembalikan penerima/skip + alasan; `queueBlast()` membuat batch + `wa_sends` (tanpa kirim, tanpa duplikat); `cancelQueuedSend`; `getBlastStatus`; `sendSingle({guestId, dryRun})` mengirim langsung, mencatat `wa_sends`, mengisi `sent_at` hanya saat diterima.
  - Verify: unit test eligibility; antrikan 0 dan >0 penerima; dry-run tidak mengirim; gate.
  - Files: `src/lib/blast/queue.ts`, `src/lib/blast/send.ts`, `src/lib/blast/eligibility.ts`, `src/routes/dashboard.blast.kirim.tsx`.

- [x] **T12 — Worker & compose**
  - Acceptance: `processBlastQueue()` klaim maks 25/kanal, kirim batch, cocokkan `ref_id`, update status/`sent_at`, retry transien (maks 3, backoff), batch selesai. `POST /api/blast/worker` 401 tanpa token, 503 tanpa env, 200 dengan token. Server fn sesi untuk "proses sekarang". Service `worker` di compose loop 30 s.
  - Verify: unit test error map (wablas) + curl 401/200; antrian uji 1 tamu berubah `sent`; gate.
  - Files: `src/lib/blast/worker.ts`, `src/lib/blast/worker.test.ts`, `src/routes/api.blast.worker.ts`, `docker-compose.yml`.

- [x] **T13 — Shell, ringkasan & tracking**
  - Acceptance: `/dashboard/blast` punya tab Setup/Template/Kirim/Tracking; ringkasan kanal + antrian; tracking menampilkan batch & tabel `wa_sends` dengan filter batch/kanal/status/cari; aksi kirim ulang `failed` (baris baru) dan batal `queued`. Nav dashboard + kartu Ringkasan ditambahkan; hapus "Menyusul".
  - Verify: navigasi mobile; aksi mengubah status; konsisten dengan daftar tamu; gate.
  - Files: `src/routes/dashboard.blast.tsx`, `src/routes/dashboard.blast.tracking.tsx`, `src/components/dashboard/blast/TrackingTable.tsx`, `src/routes/dashboard.tsx`, `src/routes/dashboard.index.tsx`.

- [x] **T14 — Dokumentasi, gate penuh, smoke**
  - Acceptance: `docs/invitation/dashboard.md` tidak lagi menunda blast; `README`/`.env.example` memuat `BLAST_WORKER_TOKEN`; gate penuh hijau; SSR smoke dashboard 200 + worker 401/200; catatan uji manual device nyata.
  - Verify: `biome`, `tsc`, `vitest`, `build`; SSR smoke; `gh run watch` setelah push.
  - Files: `docs/invitation/dashboard.md`, `docs/invitation/blast.md` (status), `.env.example`, `README.md`.

---

## Catatan eksekusi

- Status 2026-11-24: T1–T14 selesai di kode. Gate hijau: `biome check`,
  `tsc --noEmit`, 183 test, `build`, SSR smoke. **Belum** dijalankan terhadap
  device Wablas nyata karena kredensial diisi belakangan; migrasi `0009` juga
  perlu dijalankan di Supabase sebelum halaman setup bisa menyimpan.
- Gunakan `corepack pnpm@10.19.0` untuk semua perintah.
- Jangan mengirim pesan sungguhan dari test otomatis; gunakan `fetch` tiruan.
- Uji device nyata hanya manual dengan satu nomor pemilik.
- Setiap task diperbarui di file ini (`[x]`) setelah gate hijau.

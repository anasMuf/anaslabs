# Plan — Blast WhatsApp (Wablas)

Spec: `docs/invitation/blast.md`
Task list: `tasks/todo.md`

## Urutan implementasi

| Fase | Modul | Deliverable | Verifikasi |
|---|---|---|---|
| 0 | Fondasi | Migrasi `0009_blast.sql`, fungsi klaim, env worker, health | Migrasi jalan di Supabase; `health` melaporkan env |
| 1 | `blast-channels` | Kripto + adapter + server fn + UI setup + uji koneksi | Unit test kripto/adapter; uji koneksi device nyata/manual |
| 2 | `blast-attribution` | `guests.blast_channel`, resolver, dialog edit, tampilan | Unit test resolver; ubah atribusi lewat UI |
| 3 | `invitation-og` | Tabel meta, server fn, upload, head undangan, dashboard | `curl` HTML menampilkan OG override |
| 4 | `blast-templates` | Render pure + default + server fn + editor + pratinjau | Unit test render/validasi; preview WA |
| 5 | `blast-sending` | Eligibility, queue, single send, worker, API route, compose | Unit test eligibility/error map; worker 401/200; antrian uji |
| 6 | `blast-tracking` | Ringkasan batch, tabel, filter, kirim ulang, batal | Konsistensi dengan tamu; SSR smoke |

## Dependensi & paralelisasi

```
T1 (migrasi+env)
 ├─ T2 (kripto) ─ T3 (adapter) ─ T4 (channel server) ─ T5 (UI setup)
 ├─ T6 (atribusi)                         │
 ├─ T7 (OG) ─ T8 (OG dashboard)           │
 └─ T9 (template pure) ─ T10 (template server+UI)
                     └──────────┬─────────┘
                                T11 (queue + single send)
                                T12 (worker + compose)
                                T13 (shell + tracking UI)
                                T14 (docs + gates + smoke)
```

- T6, T7, dan T9 tidak saling bergantung dan bisa dikerjakan paralel setelah
  T1.
- T11 butuh T4 (kanal), T6 (atribusi), dan T10 (template).
- T12 butuh T11. T13 butuh T11/T12.

## Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Dokumentasi Wablas berbeda dari device aktual | Kirim gagal | Adapter terisolasi + uji koneksi; error map bisa disesuaikan tanpa ubah UI |
| Token tersimpan rusak setelah rotasi session secret | Tidak bisa kirim | Deteksi dekripsi gagal → pesan "isi ulang kredensial" |
| Dua worker memproses baris sama | Pesan dobel | `FOR UPDATE SKIP LOCKED` + partial unique index |
| Kuota Wablas habis di tengah bulk | Sebagian gagal | Tampilkan kuota saat setup & sebelum konfirmasi; error permanen dicatat, batch lanjut |
| Cron sidecar tidak berjalan | Antrian menggantung | Endpoint worker idempoten + tombol "Proses sekarang" di dashboard |
| Pesan >1024 karakter | Ditolak Wablas | Validasi sebelum antre + penghitung karakter di editor |
| OG upload bukan 1200×630 | Pratinjau jelek | Validasi rasio/dimensi di client, tampilkan saran, tidak memblokir |
| Data tamu lama tanpa nomor | 0 penerima | Konfirmasi menampilkan jumlah per kanal + alasan dilewati |

## Checkpoint verifikasi

1. Setelah T1: migrasi sukses, `select * from blast_channels` kosong, fungsi
   `claim_blast_sends` ada.
2. Setelah T5: dua kanal tersimpan terenkripsi, uji koneksi hijau, tidak ada
   token di response/HTML.
3. Setelah T8: `curl /invitation/:slug` memuat OG override; fallback tetap
   benar saat field kosong.
4. Setelah T10: template tersimpan per mempelai, pratinjau semua variabel,
   pesan panjang ditolak.
5. Setelah T12: worker 401 tanpa token, 200 dengan token; antrian uji 1 tamu
   berubah `queued → sent`; `sent_at` terisi; tidak ada dobel.
6. Setelah T14: `biome`, `tsc`, `vitest`, `build`, SSR smoke hijau.

## Gate per task (wajib)

```sh
corepack pnpm@10.19.0 exec biome check
corepack pnpm@10.19.0 exec tsc --noEmit
corepack pnpm@10.19.0 test
corepack pnpm@10.19.0 build
```

Setelah deploy: `curl -s https://anaslabs.my.id/api/health` dan cek worker.

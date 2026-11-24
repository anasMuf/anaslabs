# Frame Editor Photobooth — Spec

Kontrak untuk Task 6 (keputusan pemilik: **4C**). Requirement di bawah immutable
tanpa keputusan eksplisit.

## Keputusan pemilik

| # | Pertanyaan | Keputusan |
|---|---|---|
| 1 | Jumlah slot | **Tetap 1/2/4** — alur capture & pilihan grid tidak berubah |
| 2 | Overlay frame | **PNG transparan di atas foto**, teks tetap di atas overlay |
| 3 | Undo/redo | **Riwayat penuh** (maks 50 langkah) + reset layout |
| 4 | Storage frame | **Bucket `invitation-frames`** (public read; PNG/WebP, + **JPEG untuk background**) |
| 5 | Jumlah & cakupan overlay | **Per layout**, maksimal **5** overlay; urutan array = z-order |
| 6 | Background gambar | **Global**, bisa digeser/zoom manual, warna tetap fallback; bucket `invitation-frames` |

## Requirements (IMMUTABLE)

- Editor tinggal di `/dashboard/photobooth`, memakai dokumen konten yang sama
  (`content.photobooth`); tidak ada tabel baru.
- Layout tetap `1`, `2`, `4` dengan jumlah slot **persis** 1/2/4.
- Setiap layout boleh mengatur:
  - posisi & ukuran tiap slot (`x`, `y`, `w`, `h`),
  - posisi blok teks (`textX`, `textY`),
  - **hingga 5 overlay** (`layouts[*].overlays`), urutan array = z-order.
- Background (`#RRGGBB`) dan radius sudut (0–80 unit) berlaku **global** untuk
  semua layout.
- Background image global: `photobooth.backgroundImage = { url, x, y, width }`,
  digambar **di atas warna fallback dan di bawah foto**. `x`/`y` boleh negatif
  untuk pan; tinggi mengikuti rasio gambar. Berlaku untuk semua layout.
- Upload background memakai bucket `invitation-frames` (PNG/JPEG/WebP, maks 2
  MB). Overlay tetap disarankan PNG/WebP agar transparan; picker overlay
  membatasi ke dua format itu.
  Saat pertama dipilih, gambar di-cover ke kartu lalu bisa digeser/di-zoom lewat
  mode “Atur background”.
- Setiap overlay: `{ url, x, y, width }`; tinggi mengikuti rasio gambar. Urutan
  gambar: foto → overlay (sesuai array) → teks.
- Field `photobooth.frame` lama dimigrasikan saat dibaca menjadi overlay pada
  semua layout, lalu tidak ditulis lagi oleh editor baru.
- Slot, teks, dan overlay bisa digeser; slot & overlay bisa di-resize. Nilai
  juga bisa diketik presisi lewat panel angka.
- Undo/redo minimal 50 langkah, plus reset layout terpilih ke default.
- Semua perubahan tetap lewat `saveInvitationContent` (zod + concurrency).
- Preview dashboard dan kartu tamu memakai `drawComposition` yang sama, sehingga
  hasil unduhan identik dengan pratinjau.
- Konten lama tanpa field baru tetap valid (semua field baru opsional).

## Success Criteria

- [ ] Mengubah posisi/ukuran slot terlihat di preview dan hasil unduhan.
- [ ] Menggeser teks mengubah `textX`/`textY` dan hasil canvas.
- [ ] Background/radius berubah di preview dan unduhan.
- [ ] Upload PNG/WebP (≤ 2 MB) tampil di atas foto; hapus overlay mengembalikan
      kartu ke tampilan biasa.
- [ ] Undo/redo mengembalikan keadaan sebelumnya; reset layout hanya menyentuh
      layout terpilih.
- [ ] Validasi menolak slot di luar kanvas, ukuran ≤ 0, dan MIME/ukuran salah.
- [ ] `lint`, `tsc --noEmit`, `test`, `build` hijau.

## Anti-Patterns (FORBIDDEN)

- ❌ Menambah/mengurangi jumlah slot layout (alasan: capture memilih grid 1/2/4).
- ❌ Menyimpan gambar frame di repo / base64 di JSON (alasan: dokumen membengkak;
  pakai Storage + URL).
- ❌ Menambahkan overlay ke layout lain secara diam-diam (alasan: overlay kini
  per layout; user harus memilih layout yang diedit).
- ❌ Memproses gambar di server (alasan: tidak perlu; canvas tamu sudah menangani
  scaling dan crop).
- ❌ Menimpa konten tanpa validasi/`baseUpdatedAt` (alasan: konten rusak/lost
  update).
- ❌ Editor memakai kamera (alasan: editor hanya mengatur komposisi).
- ❌ Menggambar overlay setelah teks (alasan: teks harus tetap terbaca).
- ❌ Background image di atas foto/teks (alasan: background harus di belakang
  semua konten kartu).
- ❌ Background per layout saat ini (alasan: keputusan pemilik = global; hindari
  data dan UI ganda).

## Arsitektur

| File | Peran |
|---|---|
| `supabase/migrations/0007_invitation_frames.sql` | Bucket `invitation-frames` |
| `supabase/migrations/0008_invitation_frames_jpeg.sql` | Tambah JPEG untuk background |
| `src/lib/invitation-upload.ts` | Validasi PNG/WebP + path frame |
| `src/lib/invitation-content.ts` | `createFrameUploadUrl` (guarded) |
| `src/components/dashboard/content/FrameUpload.tsx` | Upload via signed URL |
| `src/components/dashboard/content/FrameEditor.tsx` | Stage interaktif + panel + undo/redo |
| `src/components/dashboard/content/PhotoboothPreviewCanvas.tsx` | Canvas pratinjau + overlay |
| `src/lib/photobooth/use-frame-image.ts` | Preload gambar overlay (cache, CORS) |
| `src/lib/photobooth/draw-composition.ts` | Gambar overlay di antara foto dan teks |
| `src/lib/invitation-content-schema.ts` | Field `textX`, `background`, `radius` |

## Task

### 6A — Model & rendering

- [x] Schema + tipe: `textX?`, `background?`, `radius?`, `frame?`,
      `backgroundImage?`.
- [x] `buildPhotoboothSettings` meneruskan background/radius/textX/frame dan
      background image global.
- [x] `drawComposition` menggambar background image setelah warna, lalu foto,
      overlay, dan teks.
- [x] Hook `useFrameImage`/`useFrameImages` dipakai preview dashboard dan preview
      tamu.
- [x] Migrasi `0007` + validasi/upload frame & background.

### 6B — Editor interaktif

- [x] Stage DOM dengan slot/teks/overlay yang bisa digeser & di-resize.
- [x] Panel angka untuk elemen terpilih.
- [x] Background/radius + upload/hapus overlay.
- [x] Background image global: upload, mode “Atur background” (geser + resize),
      cover ulang, dan hapus; gambar background juga bisa dipilih & digeser
      langsung di kartu, dengan pegangan resize yang menempel di sudut kanan
      bawah gambar dan di-clamp agar tetap terjangkau. Area geser mode ini dibatasi
      ke area gambar, bukan seluruh kartu.
- [x] Petunjuk interaksi kontekstual untuk slot, teks, overlay, dan background
      saat elemen dipilih; pilihan bisa dilepas lewat tombol “Batalkan pilihan”
      atau Esc (perlu karena background bisa menutupi seluruh kartu).
- [x] Undo/redo + reset layout.
- [x] Perubahan frame yang sudah commit (upload, drag/resize, undo/redo, field
      angka) disimpan otomatis dengan debounce 800 ms, jadi refresh memuat
      gambar dan posisinya seperti terakhir diatur.

### 6C — Verifikasi

- [ ] Unduhan tamu memuat overlay dan posisi baru (uji manual di browser/HP).
- [x] Gate repo hijau (lint, tsc, test, build; SSR editor `200`).

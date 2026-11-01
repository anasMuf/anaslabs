# Undangan Pernikahan — PRD & Arsitektur

**Produk:** Undangan pernikahan digital pribadi (`Anas & Mila`)
**Figma:** [wedding-invitation-template](https://www.figma.com/design/XrLJFRQXNjwEe3JjsfqZ0T/wedding-invitation-template?node-id=384-110) — frame `main page` `384:110`, mobile 412×6418
**Status:** menunggu validasi sebelum implementasi

---

## 1. Product Overview

Satu halaman undangan pernikahan yang dibagikan lewat link personal per tamu
(`/invitation/<slug>`), berisi cover, profil mempelai, detail acara, cerita,
photobooth, hadiah digital, dan penutup. Seluruh konten statis dan hidup di dalam
app `anaslabs` yang sudah ada — tanpa database, tanpa login, tanpa RSVP.

### Problem

Format undangan digital yang umum bergantung pada SaaS berlangganan, membawa
branding pihak ketiga, dan menyimpan data tamu di server orang lain. Link
undangan juga sering "satu untuk semua", sehingga sapaan tamu terasa generik.

### Solution

Undangan di-host sendiri di infrastruktur yang sudah ada (VPS + GHCR + Docker),
konten dikelola sebagai data bertipe di repo, nama tamu dipersonalisasi per slug,
dan tambahan pengalaman (photobooth kamera, musik latar, logo bank) berjalan
sepenuhnya di perangkat tamu.

---

## 2. Requirements (IMMUTABLE)

| ID | Requirement |
|----|-------------|
| R1 | Route undangan: `/invitation/$slug` (mobile-first), dan `/invitation/$slug/photobooth`. |
| R2 | Tampilan undangan **tanpa** Header, Footer, grid background, atau navigasi portfolio. |
| R3 | Nama tamu pada cover diambil dari data tamu berdasarkan `slug`; slug tidak terdaftar → 404 (`notFound()`), bukan nama generik. |
| R4 | Seluruh konten undangan berasal dari satu sumber data bertipe di `src/data/` — tidak ada string konten pernikahan di dalam komponen. |
| R5 | Section sesuai Figma, berurutan: Cover → Couple → Event → Story → Photobooth → Gift → Closing. |
| R6 | Event mendukung **lebih dari satu acara** (Akad Nikah + Unduh Mantu), masing-masing dengan tanggal, waktu, lokasi, dan tautan "Petunjuk Arah" ke Google Maps. |
| R7 | Gift mendukung **lebih dari satu** rekening bank, tiap rekening punya tombol **Salin** nomor dan menampilkan logo bank. |
| R8 | Photobooth berjalan 100% client-side: preview kamera, pilihan grid 1/2/4 foto, timer 0/3/5 s, fallback unggah dari galeri, komposisi `<canvas>`, dan unduh hasil sebagai JPEG. **Tidak ada** foto yang dikirim/diunggah ke server. |
| R9 | Musik latar mulai pada interaksi pertama tamu (tap/scroll), dengan kontrol mute/unmute yang selalu tersedia. Desain cover tidak memiliki tombol gate. |
| R10 | Tipografi & warna mengikuti Figma: Playfair Display (display) + Montserrat (body), palette `#F5F2EC / #34362E / #7B2438 / #706960 / #D6C4BC / #FFFCF7`. |
| R11 | Tidak menambah backend, database, autentikasi, maupun layanan pihak ketiga untuk data tamu. Pipeline deploy yang ada tidak berubah. |
| R12 | Route undangan `noindex` (privasi) dan tetap bisa dibuka lewat link langsung. |

## 3. Success Criteria

- [ ] `/invitation/<slug-terdaftar>` menampilkan nama tamu yang benar; slug lain → 404.
- [ ] Semua 7 section tampil sesuai Figma pada lebar 360–430 px tanpa horizontal scroll.
- [ ] Tema portfolio (header/footer/dark background) tidak muncul di route undangan, dan route portfolio tetap berfungsi seperti sebelumnya.
- [ ] Photobooth dapat menyelesaikan sesi 1, 2, dan 4 foto dan mengunduh JPEG dengan komposisi (foto + teks + frame) sesuai layout data.
- [ ] Tombol Salin menyalin nomor rekening (`clipboard` + fallback) dan memberi umpan balik visual.
- [ ] Musik tidak error saat autoplay diblokir; tombol mute berfungsi dan tidak muncul sebelum gate dibuka.
- [ ] `pnpm test`, `pnpm lint`, dan `pnpm build` lulus.
- [ ] Hasil `pnpm build` tetap bisa dijalankan dengan `vite preview` seperti deploy sekarang.

## 4. Anti-Patterns (FORBIDDEN)

- ❌ **NO database / Prisma / Supabase** — tanpa RSVP & ucapan, persistensi tidak dibutuhkan (scope: R11).
- ❌ **NO API route untuk invitation content** — konten adalah data build-time, bukan runtime fetch (kesederhanaan & kecepatan).
- ❌ **NO react-router-dom / react-query / i18next** — stack app ini TanStack Router; menyalin dependensi referensi akan menduplikasi router dan menambah bundle (konsistensi).
- ❌ **NO menyalin struktur multi-template SaaS** (`templates/`, resolver registry per template, share token, admin preview) — hanya satu undangan (YAGNI).
- ❌ **NO YouTube IFrame API untuk musik** — menambah request pihak ketiga, cookie, dan iframe tersembunyi; cukup `<audio>` (privasi & kesederhanaan).
- ❌ **NO upload/simpan foto photobooth ke server** — privasi tamu; hasil hanya di perangkat.
- ❌ **NO conditional header/footer di `__root.tsx`** — isolasi layout lewat pathless route `_site`, bukan `useMatchRoute` di root (kejelasan arsitektur).
- ❌ **NO string konten hardcoded** di komponen (R4) — semua teks lewat data bertipe.
- ❌ **NO animasi berat / library animasi baru** — CSS transition + `IntersectionObserver` cukup; hormati `prefers-reduced-motion`.
- ❌ **NO placeholder "Lorem ipsum"/"Guest" yang tertinggal di produksi**.
- ❌ **NO merender kartu photobooth sebagai DOM lalu screenshot** — harus `<canvas>`
  yang sama dengan file unduhan (WYSIWYG, konsistensi hasil).

---

## 5. Arsitektur

### 5.1 Struktur route

```
src/routes/
  __root.tsx                        # shell minimal: html/head/body/Scripts
  _site.tsx                         # pathless layout: Header, Footer, grid bg, tema gelap
  _site.index.tsx                   # (dipindah dari index.tsx)
  _site.about.tsx                   # (dipindah)
  _site.blog.index.tsx              # (dipindah)
  _site.blog.$slug.tsx              # (dipindah)
  _site.projects.index.tsx          # (dipindah)
  _site.projects.$slug.tsx          # (dipindah)
  rss[.]xml.ts                      # tetap
  invitation.$slug.tsx              # layout: loader tamu + head + 404
  invitation.$slug.index.tsx        # isi undangan (7 section)
  invitation.$slug.photobooth.tsx   # photobooth full-screen
```

- `_site` memindahkan `<Header />`, `<Footer />`, dua ambient blob, `bg-grid`, dan
  kelas tema gelap dari `__root.tsx`. Route portfolio hanya berubah **nama file**,
  bukan isi.
- `__root.tsx` tinggal memegang `HeadContent`, `Scripts`, dan `body` netral
  (tanpa `bg-[#0a0a0a]`), sehingga undangan bebas menentukan latarnya sendiri.
- Undangan memakai wrapper `bg-[#F5F2EC] text-[#34362E] font-body`, `min-h-dvh`,
  lebar konten `348px` (dari Figma) yang di-center dengan padding 32px.

### 5.2 Lapisan data

```
src/data/invitation.ts          # konten + tipe (satu sumber kebenaran)
src/data/invitation-guests.ts   # slug → { name } + resolveGuest()
src/lib/guest.ts                # server function getGuest(slug)
src/lib/invitation.ts           # helper format tanggal (id-ID)
public/invitation/              # ornamen, foto mempelai, kamera vintage, og image
public/invitation/music/        # track musik latar
```

Bentuk data (disederhanakan):

```ts
export interface InvitationEvent {
  id: string;
  label: string;              // "Akad Nikah" / "Unduh Mantu"
  date: string;               // ISO date
  time?: string;              // "08:00 WIB"
  schedules?: { label: string; time: string }[];
  location: { name: string; address: string; mapsUrl: string };
}

export interface Invitation {
  couple: {
    groom: { fullName: string; label: string; parents: string; photo?: string };
    bride: { fullName: string; label: string; parents: string; photo?: string };
  };
  cover: { title: string; ornament: string; dateLabel: string; scrollLabel: string };
  events: InvitationEvent[];
  story: { date?: string; title: string; body: string }[];
  gift: { method: string; bankName: string; accountNumber: string; accountHolder: string }[];
  closing: { heading: string; body: string; signature: string };
  music?: { url: string; title?: string };
  photobooth: PhotoboothSettings;
}
```

Resolusi tamu:

```ts
// src/lib/guest.ts — server-only lookup, map tidak ikut ke client
import { resolveGuest } from "#/data/invitation-guests";

export const getGuest = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => resolveGuest(slug));

// src/routes/invitation.$slug.tsx — null → notFound()
loader: async ({ params }) => {
  const guest = await getGuest({ data: params.slug });
  if (!guest) throw notFound();
  return guest;
};
```

Alasan memakai server function: peta tamu tidak ikut ke bundle client; yang dikirim
ke browser hanya nama tamu yang diminta. **Risiko deploy:** Docker menjalankan
`vite preview` — Task 1 wajib memverifikasi server function ini di `vite preview`
hasil build. Bila tidak berjalan, fallback: import peta tamu langsung di route
(bundle client) dan catat keputusan di bagian Open Questions.

### 5.3 Komponen

```
src/components/invitation/
  InvitationPage.tsx            # komposisi section + scroll-in orchestrator
  Cover.tsx                     # cover + nama tamu
  sections/{Couple,Event,Story,Photobooth,Gift,Closing}.tsx
  ui/{Ornament,SectionHeading,CopyButton,MapsButton,BankLogo,Reveal}.tsx
  ui/InkLine.tsx                # garis tangan dari Figma (357:2215/357:2218), reusable
  ui/ink-line-paths.ts          # data path kedua varian garis (generated dari ekspor Figma)
  audio/{InvitationAudio,MusicButton}.tsx
  photobooth/{PhotoboothPage,PhotoboothCapture,PhotoboothPreview}.tsx

src/lib/photobooth/
  types.ts                     # kontrak layout & settings
  draw-composition.ts          # build settings + canvas composition + kamera
  use-camera-stream.ts         # getUserMedia + switch camera
```

Pemetaan dari `docs/references/`:

| Referensi | Perlakuan |
|---|---|
| `photobooth/types.ts` | Dipakai apa adanya (template-agnostic). |
| `photobooth/settings.ts` | Diganti: layout berasal dari `invitation.photobooth`, bukan registry template. |
| `photobooth/useCameraStream.ts` | Port apa adanya (sudah menangani `exact`→`ideal`, denied, unavailable). |
| `photobooth/drawComposition.ts` | Port apa adanya (`coverRect`, `captureFrame`, `drawComposition`, `downloadCanvas`). |
| `photobooth/PhotoboothCapture.tsx` | Port; buang i18next & react-router, ganti label dari data. Struktur/ukuran kontrol mengikuti Figma (`384:2550/2589/2631`). |
| `photobooth/PhotoboothPage.tsx` | Diganti `PhotoboothPage` milik kita: tanpa react-query, `preview`, `share`; tetap memuat layout dari data. |
| `photobooth/PhotoboothPreview.tsx` | Port logikanya (render canvas + simpan), tapi layout kartu & aksi mengikuti frame hasil Figma. |
| `music/InvitationAudio.tsx` | Port apa adanya (autoplay fallback + gesture listener). |
| `music/MusicController.tsx` | Restyle ke palette cream; props tetap `isPlaying`/`onToggle`/`accentColor`. |
| `music/UniversalAudioPlayer.tsx`, `TemplateAudio.tsx` | **Tidak dipakai** (YouTube API). |
| `icon/BankLogo.tsx` | Port dengan import per-logo (`idn-finlogos`) hanya untuk bank yang dipakai. |

### 5.4 Tema & font

`ui/InkLine.tsx` adalah satu-satunya sumber garis dekoratif: dua stroke tangan dari
Figma (`357:2215`/`357:2218`) disimpan sebagai path `fill` di dalam viewBox 76×2,
di-*stretch* dengan `preserveAspectRatio="none"` sehingga bisa dipakai di lebar
apa pun tanpa kehilangan ujung stroke yang tidak rata. Warna mengikuti
`currentColor`, jadi pemakaian di tempat lain cukup:

```tsx
<InkLine className="h-0.5 flex-1 text-inv-ink" />            // cover, garis tanggal
<InkLine variant="b" className="h-0.5 w-[52px] text-inv-rule" /> // mis. Ornament
```

Koordinat path dibulatkan ke 0.1 unit (0.1px pada tinggi 2px) untuk memangkas
payload: total ±15,7 KB mentah / ±4,3 KB gzip untuk dua varian, dengan selisih
render rata-rata 0,9/255 per channel dibanding path asli (tidak terlihat mata).

- Tambah `@theme` di `src/styles.css`: `--font-display: "Playfair Display"`,
  `--font-body: "Montserrat"`, plus variabel warna undangan
  (`--inv-bg`, `--inv-ink`, `--inv-accent`, `--inv-muted`, `--inv-rule`, `--inv-card`).
- Font di-self-host lewat `@fontsource-variable/playfair-display` dan
  `@fontsource-variable/montserrat` (tanpa request ke Google Fonts saat runtime,
  tetap tampil benar saat SSR/preview offline).
- Skala tipografi dari Figma: display 64/38, body 13 (line-height 1.7),
  label 10–12 dengan `letter-spacing: 0.34em` untuk eyebrow.

### 5.5 Photobooth

Tiga layar, semua ada di Figma:

| Layar | Node Figma | Karakter |
|---|---|---|
| Capture grid 1 | `384:2550` | full-screen kamera, tanpa panduan dashed |
| Capture grid 2 | `384:2589` | kamera + bingkai dashed + 2 thumbnail di kanan |
| Capture grid 4 | `384:2631` | kamera + bingkai dashed + 4 thumbnail vertikal di kanan |
| Hasil grid 1 | `384:2760` | kartu putih 348×530 di atas latar `#F5F2EC` |
| Hasil grid 2 | `384:2817` | kartu 348×542 |
| Hasil grid 4 | `384:2787` | kartu 348×535 |

**Layar capture** — latar `#000000`, teks/ikon putih:
- Tombol kembali bulat **44 px** di kiri atas (header ±64 px tinggi).
- Area kamera **full-bleed**: mengisi lebar penuh dan sisa tinggi viewport setelah
  header + kontrol — tanpa batas lebar pada portrait (dulu dibatasi 520px, yang
  menyisakan margin pada 520–807px). Rasio kotak dibaca langsung dari DOM saat
  tombol shutter ditekan, jadi hasil foto selalu sama dengan area yang dibingkai,
  tanpa bergantung pada timing render React.
- Footer portrait memakai lebar penuh (dulu isinya dibatasi 420px): baris tombol
  memakai `justify-between` sehingga ganti kamera dan galeri berada dekat tepi layar,
  shutter tetap di tengah. Padding horizontal bertahap: 16px (<420), 20px (≥420),
  32px (≥640), 48px (≥900) — panel landscape tetap 12px. Pilihan grid/timer
  memakai lebar fluid (maks 190px per grup) supaya padding bisa lega tanpa overflow
  di 320px; target sentuh opsi tetap ≥44px.
- Bingkai dashed mengikuti rasio slot dan selalu di-*fit* oleh CSS memakai container
  query units (`100cqh`) — tidak pernah keluar dari kotak kamera meski orientasi
  berubah. Thumbnail slot berada di sisi kanan dalam area kamera.
- **Landscape / layar melebar:** kontrol (grid, timer, ganti kamera, shutter, galeri)
  pindah ke panel kanan selebar 240px, sehingga kamera memakai seluruh lebar yang
  tersisa (604px pada 844×390, 1200px pada 1440×900) alih-alih hanya 133px tinggi.
- Bar kontrol di bawah: selector pill `grid` (1/2/4) dan `timer` (off/3s/5s),
  lalu tiga tombol bulat — ganti kamera (56 px), shutter (84 px), unggah dari
  galeri (56 px).
- Bingkai dashed ditampilkan untuk **semua** grid, termasuk grid 1, agar hasil
  yang diunduh sama persis dengan area yang dilihat tamu (keputusan: WYSIWYG).

**Kartu hasil** (unit Figma, origin kartu; radius 10, `background: #FFFFFF`):

```ts
// src/data/invitation.ts — photobooth.layouts
1: { canvas: { w: 348, h: 530 }, slots: [{ x: 26, y: 32, w: 296, h: 393 }], text: { y: 448 } },
2: { canvas: { w: 348, h: 542 }, slots: [
      { x: 26, y: 38,  w: 296, h: 193 },
      { x: 26, y: 238, w: 296, h: 193 }], text: { y: 454 } },
4: { canvas: { w: 348, h: 535 }, slots: [
      { x: 26,  y: 35,  w: 144, h: 192 },
      { x: 177, y: 35,  w: 144, h: 192 },
      { x: 26,  y: 234, w: 144, h: 192 },
      { x: 177, y: 234, w: 144, h: 192 }], text: { y: 450 } },
```

Tiga baris teks di dalam kartu, semua `x: 60`, `width: 228`, rata tengah,
warna `#000000`, relatif terhadap `text.y`:

| Baris | Offset y | Tipografi |
|---|---|---|
| `THE WEDDING OF` | 0 | Playfair Display 8 px, `letter-spacing: 0.1em` |
| `Anas & Mila` | +16 | Playfair Display 18 px |
| `19 - 20 Desember 2026` | +41 | Montserrat 8 px, `letter-spacing: 0.1em` |

- `scale: 3` → hasil unduh 1044×1590 / 1626 / 1605 px; teks canvas menunggu
  `document.fonts.ready` sebelum digambar.
- Font canvas: hasil `document.fonts.load(font, text)` diverifikasi (`[]` berarti
  `@font-face` belum terdaftar) dengan retry ±1,2 s, canvas digambar ulang pada
  `document.fonts.ready`/`loadingdone`, dan digambar sekali lagi tepat sebelum unduh —
  sehingga kartu tidak pernah tersimpan dengan font fallback.
- Kartu dirender sebagai `<canvas>` (WYSIWYG dengan file unduhan), bukan DOM →
  tidak ada perbedaan hasil layar vs hasil simpan.
- Aksi hasil: **hanya** `Ulangi` dan `Simpan`. Layar hasil tidak menampilkan header
  atau tombol kembali, dan tombol back perangkat/browser diblokir selama fase ini
  (history entry dipasang ulang pada `popstate`) sehingga hasil tidak terbuang
  tanpa sengaja.
- Fallback: kamera ditolak/tidak ada → unggah dari galeri; status jelas
  (`requesting`, `denied`, `unavailable`).
- Route terpisah, dibuka di tab baru dari section Photobooth (`target="_blank"`).

### 5.6 Musik

- `<audio loop preload="auto">`, `play()` dicoba saat mount, diulang pada gesture
  pertama — dipicu langsung oleh tap "Buka Undangan" sehingga umumnya berhasil di iOS.
- Kontrol bulat fixed kanan bawah (mengikuti `MusicController`), warna aksen maroon.

### 5.7 SEO, privasi, performa

- `head()` per route: title `Anas & Mila — Undangan untuk <Nama>`, OG image statis
  `public/invitation/og.jpg` (1200×630, diekspor dari cover Figma lalu dikomposisi
  dengan `sips`; regenerate bila nama/tanggal berubah), `robots: noindex, nofollow`.
- Gambar: format modern (WebP/AVIF), `width`/`height` eksplisit, `loading="lazy"`
  untuk section di bawah cover, `fetchPriority="high"` untuk ornamen cover.
- Animasi reveal per section memutar ulang setiap kali section masuk viewport lagi;
  konten tetap tampil tanpa JS (fallback `<noscript>` + `@media (scripting: none)`)
  dan saat `prefers-reduced-motion: reduce`.
- Photobooth route memuat modul kamera secara lazy agar bundle undangan utama ringan.

### 5.9 Perilaku scroll & zoom

- **Zoom dikunci** hanya pada route undangan + photobooth: viewport meta
  `maximum-scale=1, user-scalable=no` (satu-satunya meta viewport karena head rute
  menimpa root), `touch-action: pan-y` pada wrapper, serta listener
  `gesturestart/gesturechange/gestureend`, `touchmove` multi-touch, dan
  ctrl/⌘+wheel. Portfolio tetap bisa di-zoom (terverifikasi: wheel tidak diblokir
  dan viewport meta-nya normal). Ini trade-off aksesibilitas (WCAG 1.4.4) yang
  diminta secara eksplisit, dan Safari tetap bisa mengabaikan `user-scalable=no`
  sehingga listener gesture menjadi lapisan kedua.
- **Scroll per section** (pola referensi `docs/references/midnight-glamour`): scroll
  container sendiri (`h-dvh overflow-y-auto overscroll-contain no-scrollbar`) dengan
  `snap-y snap-mandatory`; setiap section `scroll-snap-align: start` dan tepat
  `100dvh`. Mandatory (bukan `proximity`) supaya tiap gestur selalu mendarat pas di
  batas section.
- **Tanpa nested scroll:** gestur tidak boleh pernah masuk ke scroll container
  section, karena itu yang dulu membuat scroll terasa berhenti lalu lanjut (jeda).
  Selain merapatkan spacing (Hari Bahagia, Photobooth, Tanda Kasih), konten tiap
  section di-*fit* otomatis oleh `ui/Reveal.tsx`: bila konten lebih tinggi dari
  ruang section, `zoom` diturunkan bertahap (mulai 1, minimum 0.8) sampai muat.
  Pengukuran memakai `getBoundingClientRect()` (bukan `offsetHeight`, yang tidak
  akurat saat `zoom` aktif), `ResizeObserver` pada section **dan** node konten
  (menangkap font yang baru selesai dimuat), plus reset ke 100% saat `resize`
  (rotasi/papan ketik) agar pembesaran layar tetap memakai ukuran penuh.
  `overflow-y-auto` tetap dipasang sebagai jaring pengaman bila konten masih meluber
  di bawah zoom 0.8 (layar sangat pendek).
- **Snap selalu aktif di semua ukuran:** tidak ada lagi media query yang mematikan
  snap (perilaku lama: snap mati di tinggi < 840px / lebar < 360px — itu yang membuat
  snap “hilang” di ponsel). Untuk layar pendek hanya padding section yang dirapatkan
  (`@media (max-height: 839px)` → `padding-block: 2rem`).
- **Reveal berulang**: `IntersectionObserver` tidak di-disconnect; section
  disembunyikan lagi setelah keluar viewport sehingga animasi diputar ulang setiap
  kali section itu dilewati.

**Verifikasi CDP (Chrome headless, viewport asli):**

| Viewport | `scrollSnapType` | Section meluber | `zoom` terpakai |
|---|---|---|---|
| 390×844, 360×844, 768×1024 | `y mandatory` | 0 | 1 (tidak perlu) |
| 390×800 | `y mandatory` | 0 | 1 (tidak perlu) |
| 390×740 | `y mandatory` | 0 | 0.967–0.981 |
| 320×640 | `y mandatory` | 0 | 0.80–0.901 |

Scroll 100px dari posisi 0 mendarat tepat di `scrollTop = 0`; scroll ke
`2 × tinggi + 300` mendarat tepat di `2 × tinggi` — snap bekerja, bukan sekadar
`proximity`. Setelah viewport diperbesar ke 390×844, `zoom` kembali ke 1 di semua
section.

### 5.8 Deploy

Tidak ada perubahan pipeline. `Dockerfile` sudah menyalin `src`, `dist`, dan
`.content-collections`; aset baru di `public/` ikut ke `dist/client`. Deploy tetap
`docker compose up` melalui `.github/workflows/deploy.yml`.

### 5.10 Audit aksesibilitas & performa

**Kontras (WCAG AA, teks normal ≥ 4.5:1)**

| Pasangan | Rasio | Status |
|---|---|---|
| ink `#34362E` / bg `#F5F2EC` | 10.97 | AAA |
| muted `#706960` / bg `#F5F2EC` | 4.85 | AA |
| accent `#7B2438` / bg `#F5F2EC` | 8.73 | AAA |
| cream / accent (tombol) | 8.73 | AAA |
| putih / hitam (photobooth) | 21.0 | AAA |

Ditemukan & diperbaiki: label "Scroll Down" memakai `#727272` (4.31:1, gagal AA) →
diganti ke `--color-inv-muted` (4.85:1).

**Perbaikan aksesibilitas**

- `html lang="id"` (sebelumnya `en`, konten berbahasa Indonesia).
- Tap target ≥ 44px: tautan Scroll Down, `Petunjuk Arah`, `Salin`, opsi grid/timer,
  tombol Kembali (hasil & 404) — area klik diperluas dengan pseudo-elemen agar
  ukuran visual Figma tetap.
- `focus-visible` ring pada semua kontrol interaktif.
- Nama aksesibel: dua tautan Petunjuk Arah dibedakan per acara + "(membuka tab baru)";
  CTA photobooth punya teks sr-only "membuka tab baru"; canvas hasil `role="img"`
  dengan label jumlah foto; h1 sr-only di kedua layar photobooth.
- Status kamera memakai `<output>` (live region) + progres "n dari 4 foto" sr-only;
  overlay hitung mundur `aria-hidden`.
- Reduced motion: reveal, transisi, dan `scroll-behavior` dihormati.
- Tanpa JS: konten reveal tetap tampil (`<noscript>` + `@media (scripting: none)`).
- Gambar dekoratif `alt=""`, dimensi eksplisit (anti-CLS), `loading="lazy"` +
  `decoding="async"` di bawah fold, `fetchPriority="high"` untuk ornamen cover.

**Performa**

- Aset PNG 961–842 px → WebP @2x sesuai ukuran tampil: **696 KB → 164 KB (−76%)**
  (`cover-ornament` 26 KB, `couple-bouquet` 41 KB, `photobooth-camera` 73 KB,
  `photobooth-keepsake` 24 KB).
- Font di-self-host (`@fontsource-variable/inter`, `playfair-display`, `montserrat`);
  tidak ada permintaan ke Google Fonts. Browser hanya mengunduh subset `latin`
  (~160 KB total: Inter 47 + Playfair 38 + italic 38 + Montserrat 37).
- Route photobooth (kamera + canvas) berada di chunk terpisah, sehingga undangan
  utama tidak memuat modul kamera.
- Interaksi selain cover memakai CSS transition (tanpa library animasi).
- Trade-off yang tersisa: subset italic Playfair (~38 KB) hanya dipakai untuk glyph
  `&`; bisa di-subset lebih lanjut bila ukuran jadi prioritas.

---

## 6. Spesifikasi Section (dari Figma)

| # | Section | Isi |
|---|---|---|
| 1 | Cover (`384:431`) | Ornamen simpul, eyebrow "UNDANGAN PERNIKAHAN", nama "Anas & Mila" (64 px Playfair, `&` maroon), tanggal "19 - 20 Desember 2026" dengan garis kiri-kanan (`357:2215`/`357:2218`: stroke 2 px `#34362E`, ±75 px, konten di tengah layar), "Kepada, <Nama>" dari slug, "Scroll Down" di dasar layar, CTA buka undangan |
| 2 | Couple (`384:430`) | Heading + intro, profil mempelai pria (label, nama, orang tua), gambar buket, profil mempelai wanita, ornamen penutup |
| 3 | Event (`384:429`) | Heading + intro, kartu Akad Nikah (tanggal, jadwal 08:00 & 14:00, lokasi, tombol Petunjuk Arah), ornamen, kartu Unduh Mantu (tanggal, waktu, lokasi, Petunjuk Arah) |
| 4 | Story (`384:2942`) | Heading + intro, timeline 3 milestone (tanggal, judul, cerita) dengan garis & marker vertikal, ornamen |
| 5 | Photobooth (`384:428`) + layar (`384:2550/2589/2631/2760/2817/2787`) | Heading "Potret Hari Ini, Kenangan Abadi", kamera vintage, strip foto dekoratif, tombol "Buka Photobooth" → layar capture gelap (grid 1/2/4, timer off/3s/5s, ganti kamera, galeri) → kartu hasil putih dengan 3 baris teks (lihat 5.5) |
| 6 | Gift (`384:2909`) | Heading + intro, dua blok transfer bank (metode, nama bank, nomor + Salin, atas nama), divider ornamen, ucapan terima kasih, ornamen |
| 7 | Closing (`384:427`) | Heading + intro, ornamen, pesan penutup, label & nama pemilik undangan, ornamen |

Ornamen berulang (`Fine rule` 52×1 `#D6C4BC` + `&` italic 20 px maroon) dijadikan
satu komponen `Ornament` dengan varian ukuran.

---

## 7. Scope Boundaries

**In scope:** 7 section di atas, personalisasi nama tamu, photobooth, musik, gift + copy, peta, ornamen/aset Figma, SEO noindex, test unit untuk logika non-visual.

**Out of scope (deferred):**
- RSVP & buku ucapan (diputuskan tidak dipakai).
- Galeri foto pre-wedding (tidak ada di desain; bisa jadi section P1).
- Multi-undangan / template registry / admin.
- Countdown timer (tidak ada di desain; lihat Open Questions).
- Amplop fisik/delivery address (frame Figma-nya `hidden`).
- E-wallet/QRIS (desain hanya dua rekening bank; data model tetap mendukung penambahan).

---

## 8. Open Questions

1. **Data asli** — isi cerita (`story[].date` / `story[].body` masih kosong sehingga
   hanya judul milestone yang tampil), alamat lengkap final, tanggal & jam final,
   daftar tamu — perlu dilengkapi sebelum build produksi.
2. **File musik** belum tersedia: `invitation.music` masih `null`, sehingga tombol mute
   tidak tampil. Isi dengan URL file di `public/invitation/music/` untuk mengaktifkannya.
   **Foto mempelai** tidak dibutuhkan oleh desain (Couple hanya memakai ilustrasi buket).
3. **Server function untuk lookup tamu** sudah diverifikasi berjalan di
   `vite preview` (SSR 200 untuk slug valid, 404 untuk slug asing, peta tamu hanya
   ada di chunk server).

**Keputusan yang sudah diambil:** cover tanpa gate (musik via interaksi pertama),
bingkai dashed pada semua grid photobooth, tiga tombol aksi di layar hasil,
countdown tidak dibuat.

---

## 9. Design Discovery (Reference Context)

### Key Decisions

| Pertanyaan | Jawaban | Implikasi |
|---|---|---|
| Penempatan aplikasi? | Route di app ini | Tanpa infra baru, deploy tetap, `_site` layout untuk isolasi |
| RSVP/ucapan? | Tidak dipakai | Tanpa DB/auth/API; konten statis bertipe |
| Personalisasi tamu? | Via slug URL | `guests` map + `notFound()`; tanpa token |
| Photobooth/music/icon? | Diambil dari `docs/references` | Port logika, buang dependensi referensi |
| Desain layar photobooth? | Ada di Figma (6 frame) | Capture gelap + kartu hasil putih; geometri slot & teks masuk data |
| Bingkai capture grid 1? | Tampilkan dashed (WYSIWYG) | Preview = hasil unduhan, meski berbeda dari mock |
| Aksi layar hasil? | Default 3 tombol (Simpan/Ulangi/Kembali) | Tidak ada di Figma, ditambahkan di bawah kartu |
| Layout refactor? | Setuju `_site` pathless layout | Rename file route portfolio, isi tidak berubah |
| Slug tak dikenal? | 404 | Tidak ada nama generik |
| Bank logo? | Tambah `idn-finlogos` | Import per-logo untuk menjaga ukuran chunk |

### Research Findings

**Codebase**
- `src/routes/__root.tsx:61-63` — Header/Footer/grid dirender global; harus dipindah.
- `src/data/site.json`, `src/data/projects.json` — pola konten JSON; digantikan TS
  bertipe untuk undangan karena butuh union/optional yang kompleks.
- `src/styles.css:5-7` — `@theme` hanya mendefinisikan `--font-sans`; token undangan ditambahkan di sini.
- `content-collections.ts:7-34` — pola markdown/MDX; **tidak** dipakai karena konten undangan
  berbentuk struktur (event, rekening), bukan prosa panjang.
- `Dockerfile:22-31`, `.github/workflows/deploy.yml:54-59` — deploy `vite preview`; tidak diubah.

**Referensi eksternal (`docs/references/`)**
- `photobooth/drawComposition.ts` — komposisi canvas memakai unit Figma × `scale`; bisa
  dipakai langsung dengan koordinat dari desain ini.
- `photobooth/useCameraStream.ts` — menangani `exact`→`ideal`, `NotAllowedError`, `NotFoundError`.
- `music/InvitationAudio.tsx` — strategi autoplay + gesture listener; paling ringan.
- `icon/BankLogo.tsx:125-172` — import per-logo menghindari seluruh map ikon masuk bundle.
- `photobooth/index.ts:25-30` — `getPhotoboothUrl` bergantung pada route `/i/:slug`; diganti
  `Link` TanStack ke `/invitation/$slug/photobooth`.

### Approaches Considered

**1. Config-driven, satu undangan, route di app ini ✓**
Data bertipe di `src/data`, section komponen, photobooth/music sebagai modul.
Dipilih karena: konsisten dengan pola data repo, nol dependensi infrastruktur,
type-safety penuh, deploy tidak berubah.

**2. Content-collections (`content/invitation/*.mdx`)** ❌
Ideal untuk prosa, tetapi event/rekening/jadwal adalah data terstruktur; schema MDX
menambah lapisan tanpa manfaat. *Ditinjau ulang hanya bila konten undangan tumbuh
menjadi artikel/cerita panjang.*

**3. Template engine multi-undangan (struktur referensi)** ❌
Membutuhkan DB, admin, auth, template registry. Di luar scope undangan pribadi.
*Ditinjau ulang hanya bila produk ini dijual sebagai layanan.*

### Dead Ends

- **Memakai `useMatchRoute` di `__root.tsx` untuk menyembunyikan chrome** — bekerja,
  tapi menyembunyikan coupling root↔undangan dan menyulitkan layout undangan
  sepenuhnya full-bleed. Ditinggalkan demi `_site` pathless layout.
- **Fetch konten undangan dari API route** — memindahkan data build-time ke runtime
  tanpa kebutuhan; menambah latensi dan permukaan error.
- **YouTube player untuk musik** — menambah iframe/script pihak ketiga dan masalah
  autoplay iOS; `<audio>` cukup untuk file milik sendiri.

---

## 10. Task 1 (hanya task pertama; berikutnya dibuat iteratif)

**Goal:** undangan bisa dibuka di `/invitation/$slug` dengan layout terisolasi,
token desain, data bertipe, dan cover yang sudah sesuai Figma.

Rincian:

1. Verifikasi baseline: `pnpm test`, `pnpm lint`, `pnpm build`, dan `pnpm preview`.
2. Refactor layout: `__root.tsx` minimal + `_site.tsx` baru; rename 6 route portfolio
   menjadi `_site.*`; pastikan route portfolio & RSS tetap sama.
3. Tambah dependensi font (`@fontsource-variable/playfair-display`,
   `@fontsource-variable/montserrat`) dan `@theme` token undangan di `src/styles.css`.
4. Buat `src/data/invitation.ts` (tipe + konten placeholder terstruktur) dan
   `src/data/invitation-guests.ts` (3 slug contoh), plus `src/lib/invitation.ts`
   (`getGuestName` server function + helper format tanggal).
5. Buat route `invitation.$slug.tsx` dengan loader tamu, `notFound()`, `head()` noindex,
   dan komponen `CoverGate` + `Ornament` + `SectionHeading`.
6. Uji: server function berjalan pada `pnpm build && pnpm preview`
   (bila tidak, terapkan fallback dan catat di PRD Open Questions).
7. Test unit: `resolveInvitation`/`getGuestName` (slug valid vs invalid) dan helper format tanggal.
8. `pnpm test && pnpm lint && pnpm build` lulus; cek visual cover pada 360/390/430 px.

**Success criteria Task 1:** link tamu menampilkan nama benar, slug asing 404,
cover sesuai Figma, route portfolio tidak berubah, semua quality gate lulus.

**Status: selesai.** Layout terisolasi (`_site`), token desain + self-host font,
data & helper bertipe, server function lookup tamu, cover personal, 11 unit test,
`tsc`/lint/build/preview lulus.

### Progress

| Task | Cakupan | Status |
|---|---|---|
| 1 | Layout `_site`, token desain, data + lookup tamu, Cover | selesai |
| 2 | Section Couple + Event (jadwal, lokasi, Petunjuk Arah), aset buket | selesai |
| 3 | Section Story + Gift (timeline, logo bank BCA/BSI, tombol Salin) | selesai |
| 4 | Photobooth: entry section, route terpisah, capture grid 1/2/4 + timer + galeri, kartu hasil canvas, unduh JPEG | selesai |
| 5 | Section Closing + musik latar (autoplay + fallback gesture, tombol mute) | selesai |
| 6 | OG image 1200×630 + meta `og:image`/`twitter:image`, scroll reveal dengan fallback reduced-motion & no-JS | selesai |
| 7 | Audit aksesibilitas + performa semua section (kontras, tap target, label, aset WebP, font self-host) | selesai |

## Product Overview

**Nama Produk:** (Placeholder: **OnTimeSholat** / **FajrTrack**)
**Deskripsi:** Sebuah aplikasi pelacakan sholat berbasis web yang berfokus pada kedisiplinan waktu. Aplikasi ini tidak hanya mencatat apakah pengguna sudah sholat, tetapi juga mengukur seberapa cepat pengguna merespons panggilan adzan dengan mempertimbangkan variabel manusiawi seperti wudhu, perjalanan, dan persiapan teknis lainnya.

---

## Background: Problem & Solution

### **The Problem**

- **Bias Pencatatan:** Aplikasi pelacak kebiasaan umumnya hanya mencatat "Sudah" atau "Belum", tanpa memperhitungkan apakah sholat dilakukan di awal waktu atau di akhir waktu.
- **Kebutuhan Persiapan:** Pengguna membutuhkan waktu transisi (adzan, wudhu, perjalanan ke masjid/mushola) yang seringkali membuat mereka merasa "terlambat" jika standarnya adalah tepat saat adzan berkumandang.
- **Kurangnya Metrik Kedisiplinan:** Sulit untuk mengukur tren perbaikan diri dalam hal menjaga waktu sholat secara objektif.

### **The Solution**

- **Smart Buffer System:** Memberikan toleransi waktu yang dapat dipersonalisasi (misal: 15–25 menit) untuk mencakup aktivitas persiapan.
- **Precision Tracking:** Menggunakan *timestamp* asli untuk memvalidasi status sholat (Tepat Waktu vs. Terlaksana vs. Terlambat).
- **Discipline Analytics:** Visualisasi data yang menunjukkan rata-rata waktu tunggu (*response time*) dari adzan hingga pelaksanaan.

---

## Features

### **1. Core Features (P0 - Minimum Viable Product)**

- **Manual Timestamp Check-in:** Tombol satu klik untuk menandai sholat selesai dan merekam waktu presisi.
- **Customizable Buffer (Toleransi):** Pengaturan global untuk menambahkan menit setelah adzan yang masih dianggap sebagai "Tepat Waktu".
- **Automated Prayer Times:** Integrasi API jadwal sholat berdasarkan koordinat GPS atau lokasi (seperti Mojokerto/Surabaya).
- **Daily Status Indicators:** * **On-Time (Hijau):** Selesai dalam rentang adzan + toleransi.
- **Performed (Kuning):** Selesai sebelum waktu sholat berikutnya, tapi di luar batas toleransi.
- **Missed (Merah):** Tidak dicatat hingga waktu sholat berikutnya masuk.

### **2. Nice to Have (P1 - Peningkatan Pengalaman)**

- **Specific Prayer Buffers:** Pengaturan toleransi yang berbeda tiap waktu (misal: Subuh 25 menit, Maghrib 15 menit).
- **Weekly Discipline Score:** Skor 0–100 berdasarkan konsistensi ketepatan waktu dalam seminggu.
- **Streak System:** Menghitung berapa hari berturut-turut pengguna sholat "Tepat Waktu" untuk semua waktu.
- **Export Data:** Mengunduh riwayat sholat dalam format CSV/PDF untuk evaluasi mandiri.

### **3. Plan to Have (P2 - Skalabilitas)**

- **Location-Based Buffer:** Otomatis menambah toleransi jika GPS mendeteksi pengguna sedang jauh dari masjid yang biasa dikunjungi.
- **Social Leaderboard:** Fitur kompetisi positif dalam lingkaran keluarga (BAM) untuk saling memotivasi dalam ketepatan waktu.
- **AI Insight:** Memberikan saran berdasarkan data, misalnya: "Anda sering terlambat di hari Selasa, mungkin karena beban kerja tinggi?"

---

## User Stories

| Role | Action | Reason |
| --- | --- | --- |
| **Pengguna** | Ingin mengatur toleransi waktu 20 menit | Agar waktu yang saya habiskan untuk wudhu dan perjalanan tidak dianggap sebagai keterlambatan. |
| **Pengguna** | Ingin menekan tombol segera setelah salam | Agar aplikasi merekam *timestamp* yang akurat untuk evaluasi kedisiplinan saya. |
| **Pengguna** | Ingin melihat rata-rata waktu respon mingguan | Agar saya bisa melihat apakah saya semakin cepat atau semakin lambat dalam memenuhi panggilan sholat. |
| **Pengguna** | Ingin mendapat label "On-Time" meskipun sholat 10 menit setelah adzan | Agar saya tetap termotivasi karena progres saya dihargai secara realistis. |

---

## Reference

- **Kemenag API / Al-Adhan API:** Referensi utama untuk pengambilan data jadwal sholat yang akurat di Indonesia.
- **Toggl Track:** Referensi UI untuk pencatatan berbasis waktu (*one-click tracking*).
- **Google Fit / Apple Health:** Referensi visualisasi grafik *consistency* dan *trends*.
- **Pomodoro Technique:** Konsep "buffer" atau jeda yang diadaptasi untuk transisi antar aktivitas.

---
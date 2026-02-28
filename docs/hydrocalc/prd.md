# HydroCalc

**Estimasi Waktu Pengisian Air & Manajemen Wadah**

## Product Overview

**HydroCalc** adalah aplikasi web responsif yang berfungsi untuk menghitung estimasi waktu yang dibutuhkan untuk mengisi berbagai jenis wadah air hingga penuh (atau hingga level tertentu). Aplikasi ini ditujukan untuk penggunaan rumah tangga maupun industri kecil guna efisiensi penggunaan air dan waktu.

---

## Background: Problem & Solution

### **Background & Problem**

Banyak orang sering meninggalkan keran air menyala saat mengisi bak mandi, tandon, atau drum, lalu lupa mematikannya. Hal ini mengakibatkan:

- Pemborosan air (air meluber).
- Lantai menjadi licin atau bahkan merusak area sekitar.
- Tagihan air membengkak.
- Ketidakpastian waktu; pengguna tidak tahu apakah mereka punya cukup waktu untuk melakukan aktivitas lain selagi menunggu wadah penuh.

### **Solution**

Aplikasi ini menyediakan kalkulator presisi yang menggabungkan parameter **Volume Wadah** dan **Debit Air (Flow Rate)**. Dengan input yang mudah, pengguna mendapatkan estimasi waktu yang akurat dan pengingat (timer) untuk mematikan air.

---

## Features

### **Core Features (Must Have)**

- **Kalkulator Volume Wadah:** Input dimensi berdasarkan bentuk (Balok/Kubus, Tabung/Silinder, Kerucut Terpancung).
- **Input Debit Air:** Pilihan input manual (liter/menit) atau fitur "Uji Debit" (menghitung debit dengan mengisi wadah kecil dalam waktu tertentu).
- **Estimasi Waktu Real-time:** Menampilkan hasil dalam format Jam:Menit:Detik.
- **Progress Visualization:** Bar visual yang menunjukkan estimasi pengisian saat ini.

### **Nice to Have (NTH)**

- **Smart Timer & Notification:** Notifikasi suara atau *push notification* saat waktu pengisian hampir habis.
- **Preset Wadah:** Menyimpan dimensi wadah yang sering digunakan (misal: "Bak Mandi Utama", "Tandon Atas").
- **Mode Pengisian Parsial:** Menghitung waktu jika wadah sudah terisi sebagian (misal: isi dari 20% ke 80%).

### **Plan to Have (PTH)**

- **Cost Estimator:** Menghitung estimasi biaya air per pengisian berdasarkan tarif per .
- **Multi-Device Sync:** Sinkronisasi data preset antar perangkat menggunakan akun.
- **IoT Integration:** Integrasi dengan sensor aliran air (flow sensor) untuk monitoring otomatis.

---

## User Stories

| Role | User Story |
| --- | --- |
| **Ibu Rumah Tangga** | Sebagai pengguna, saya ingin tahu berapa lama bak mandi saya penuh, sehingga saya bisa memasak tanpa takut air meluber. |
| **Pemilik Usaha** | Sebagai pemilik depot air, saya ingin menghitung waktu pengisian galon/drum secara presisi agar antrean lebih teratur. |
| **User Umum** | Sebagai pengguna, saya ingin menyimpan ukuran tandon rumah saya agar tidak perlu mengukur ulang setiap kali ingin mengisi. |

---

## Reference & Logic

Untuk menghitung estimasi, aplikasi akan menggunakan rumus dasar fisika:

$$
Waktu (t) = \frac{Volume (V)}{Debit (Q)}
$$

**Rumus Volume Wadah:**

- **Balok/Bak:**

$$
V = p \times l \times t
$$

- **Tabung/Drum:**

$$
V = \pi \times r^2 \times t
$$

**Metode Penentuan Debit (Flow Rate):**
Jika pengguna tidak tahu debit airnya, aplikasi akan memandu pengguna:

1. Ambil botol 1 Liter.
2. Hitung berapa detik yang dibutuhkan untuk penuh ().
3. rumus:

$$
Debit (Q) = \frac{1}{s} \text{ Liter/detik}.
$$
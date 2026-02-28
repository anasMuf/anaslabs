## Overview

Body Fit adalah web application yang membantu pengguna dalam menjalani program diet atau menjaga kebugaran dengan cara menghitung BMI, kebutuhan kalori (TDEE), dan heart rate zone dalam satu platform sederhana tanpa perlu berpindah website.

## Problem & Solution

Beberapa aplikasi kebugaran yang terlalu kompleks, dan kalkulator kesehatan yang terpecah di beberapa website sehingga menyulitkan user dalam mengaksesnya, maka kita buat web app untuk menyederhanakannya menjadi satu aplikasi. body fit hadir dengan pendekatan minimalis:

- **Profil Terpusat:** Menyimpan data tubuh user secara persisten (tidak perlu input ulang setiap kali menghitung).
- **Kalkulasi Otomatis:** Memberikan angka pasti untuk BMI, TDEE, dan Zona Heart Rate berdasarkan data profil.
- **Tracking Sederhana:** Memungkinkan user melihat riwayat berat badan mereka dari waktu ke waktu.

## Features

### **Core-Features**

Fitur ini wajib ada pada rilis pertama agar aplikasi dapat berfungsi sesuai tujuan utamanya.

1. **User Authentication**
    - Registration & login (email/password)
    - Manajemen sesi user (logout)
2. **Body Profiling**
    - Input profile: usia, gender, tinggi badan, berat badan saat ini
    - Update profile secara berkala
3. **Health Calculators**
    - **BMI Calculator:** Menghitung Body Mass Index dan memberikan label kategori (Underweight, Normal, Overweight, Obese).
    - **TDEE Calculator:** Menghitung *Total Daily Energy Expenditure* berdasarkan tingkat aktivitas (Sedentary, Light, Moderate, Active).
    - **Heart Rate Zone:** Menghitung *Maximum Heart Rate* (MHR) dan rentang detak jantung untuk zona *Fat Burn* (biasanya 60-70% dari MHR).
    - **Daily Water Intake:** menghitung kebutuhan air minum harian berdasarkan berat badan
4. **Weight Tracker**
    - Mencatat berat badan harian/mingguan dengan *timestamp*.
    - List history berat badan.

### **NTH (Nice to Have)**

Fitur tambahan yang memberikan nilai lebih jika waktu pengembangan memungkinkan.

1. **Dashboard Visual:** Grafik garis sederhana (*line chart*) untuk melihat tren perubahan berat badan.
2. **Activity Level Selector:** Dropdown yang lebih detail untuk memilih tingkat aktivitas harian dengan penjelasan contoh kegiatan.
3. **Target Setting:** Input target berat badan yang diinginkan, lalu sistem menghitung estimasi waktu pencapaian berdasarkan defisit kalori standar.

### **PTH (Plan to Have / Future Roadmap)**

Ide fitur untuk pengembangan jangka panjang (v2.0 ke atas).

1. **Meal Planner Generator:** Saran menu makanan sederhana berdasarkan target kalori (TDEE).
2. **Export Data:** Fitur untuk mengunduh riwayat berat badan dalam format .CSV atau .PDF.
3. **Progress Photo:** Fitur upload foto tubuh untuk perbandingan visual ("Before & After").

## User Stories

- Sebagai user, saya ingin melakukan registrasi dan login agar data kesehatan pribadi saya dapat tersimpan dengan aman, serta dapat mengakses fitur-fitur aplikasi.
- Sebagai user, saya ingin memasukkan data tubuh (tinggi, berat, usia, gender) agar kebutuhan profiling tubuh dapat tersimpan di database
- Sebagai user, saya ingin menghitung BMI dan melihat riwayat perhitungannya agar dapat memantau perubahan berat badan dari waktu ke waktu.
- Sebagai user, saya ingin menghitung kebutuhan kalori harian (TDEE) berdasarkan aktivitas fisik saya agar dapat mengatur pola makan sesuai target kesehatan, serta pembagian makronutrien agar dapat mengatur pola diet dengan lebih efektif.
- Sebagai user, saya ingin tahu di angka detak jantung berapa saya harus berolahraga agar dapat mengoptimalkan aktivitas olahraga dalam membakar lemak.
- Sebagai pengguna, saya ingin mengetahui kebutuhan air minum harian agar dapat menjaga hidrasi tubuh dengan baik.
- Sebagai user, saya ingin mencatat berat badan saya hari ini. agar dapat memantau progress program diet saya.

## Reference

### **BMI Calculation:**

$$
BMI = Berat(kg)/(Tinggi(m))2
$$

<aside>
💡

Hasil BMI dapat di kategorikan sebagai berikut:

- < 18.5: Underweight
- 18.5 - 24.9: Normal
- 25 - 29.9: Overweight
- 30: Obese
</aside>

### **TDEE Calorie Calculation:**

Menggunakan rumus Mifflin-St Jeor

Rumus Mifflin-St Jeor adalah rumus untuk menghitung BMR (Basal Metabolic Rate) yaitu jumlah kalori yang dibutuhkan tubuh saat istirahat total. BMR ditujukan sebagai langkah awal sebelum menghitung TDEE.

1. Rumus BMR:
    - Untuk Pria: BMR = (10 × weightkg) + (6.25 × heightcm) - (5 × age) + 5
    - Untuk Wanita: BMR = (10 × weightkg) + (6.25 × heightcm) - (5 × age) - 161
2. TDEE
    - TDEE = BMR × Activity Multiplier
    
    <aside>
    💡
    
    Activity level multiplier:
    
    - Sedentary (office job): 1.2
    - Light exercise (1-2 days/week): 1.375
    - Moderate exercise (3-5 days/week): 1.55
    - Heavy exercise (6-7 days/week): 1.725
    - Athlete (2x per day): 1.9
    </aside>
    

### **Heart Rate (Fat Burn Zone):**

- sistem menghitung max heart rate: 220 - age
- sistem menghitung fat burn zone: 60-70% dari max heart rate

### **Daily Water Intake**

- Kebutuhan air (ml) = berat badan (kg) × 30 ml

### **Inspired:**

https://www.calculator.net/fitness-and-health-calculator.html, https://www.fatsecret.com/,

https://tdeecalculator.net/
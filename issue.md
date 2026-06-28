# Issue: Implementasi Role-Based Access Control (RBAC) pada API

**Deskripsi Tugas:**
Saat ini, layanan API dan dokumentasi Swagger kita terlalu terbuka dan dapat diakses oleh siapa saja. Kita perlu meningkatkan keamanan dengan menerapkan *Role-Based Access Control* (RBAC). Dengan RBAC, setiap endpoint API hanya akan dapat diakses oleh pengguna yang memiliki peran (*role*) yang sesuai (misalnya: Admin, Dosen, Mahasiswa).

Harap ikuti tahapan-tahapan berikut secara berurutan. Kerjakan selangkah demi selangkah.

---

## 1. Pembuatan Skema Hak Akses (Role-Based Mapping)
Tujuan dari tahap ini adalah merencanakan dan memetakan batasan akses untuk setiap endpoint yang ada.

**Langkah-langkah yang harus diimplementasikan:**
- [ ] **Definisikan Tipe Role:** Pastikan sistem (database dan model aplikasi) sudah memiliki definisi yang jelas mengenai peran pengguna (misal menggunakan Enum: `ADMIN`, `DOSEN`, `MAHASISWA`, `PRODI`, `KEUANGAN`).
- [ ] **Pemetaan Endpoint:** Buat pemetaan logika sederhana (bisa di dalam struktur kode routing) yang mendeskripsikan *role* mana saja yang boleh mengakses endpoint tertentu. 
  * *Contoh 1:* Endpoint untuk mengubah nilai mahasiswa (`PUT /api/nilai`) hanya boleh diakses oleh `DOSEN` atau `ADMIN`.
  * *Contoh 2:* Endpoint untuk melihat profil pengguna (`GET /api/profile`) bisa diakses oleh `DOSEN`, `MAHASISWA`, dan `ADMIN`.
  * *Contoh 3:* Endpoint keuangan/tagihan dikhususkan untuk `KEUANGAN` (dan `ADMIN`), sedangkan verifikasi akademik untuk `PRODI`.
- [ ] **Sertakan Data Role di Token:** Pastikan saat proses Login berhasil, sistem memasukkan informasi *role* pengguna ke dalam *payload* JWT (JSON Web Token) yang dikembalikan ke *client*.

---

## 2. Melindungi Layanan API dan Dokumentasi (Implementasi Middleware)
Tujuan tahap ini adalah mengeksekusi logika penolakan akses jika pengguna tidak memenuhi kriteria *role* yang diizinkan.

**Langkah-langkah yang harus diimplementasikan:**
- [ ] **Buat Middleware Autentikasi (Authentication):** Pastikan ada fungsi perantara (*middleware*) yang bertugas mengecek validitas token JWT pada setiap request API yang bersifat privat. Jika token salah atau tidak ada, kembalikan response `401 Unauthorized`.
- [ ] **Buat Middleware Otorisasi Role (Authorization):** Buat sebuah fungsi *guard* yang dapat memvalidasi peran pengguna. Fungsi ini akan mengambil data *role* dari token pengguna dan mencocokkannya dengan *role* yang disyaratkan oleh endpoint tersebut. Jika *role* tidak cocok, tolak request dengan response `403 Forbidden`.
- [ ] **Terapkan Middleware pada Semua Route:** Pasangkan middleware tersebut ke rute-rute (*routes*) API yang sesuai dengan pemetaan di tahap 1.
- [ ] **Amankan Halaman Swagger:** Endpoint dokumentasi API (misalnya `/swagger`) juga terlalu terbuka. Disarankan untuk menonaktifkan fitur Swagger (tidak melakukan inisialisasi plugin Swagger) jika aplikasi berjalan di mode `production` (misal menggunakan pengecekan `NODE_ENV !== 'production'`).
- [ ] **Pengujian (Testing):** Lakukan simulasi request untuk memastikan keamanan berjalan baik. Coba akses endpoint milik Admin dengan menggunakan token login milik Mahasiswa, dan pastikan sistem mengembalikan error `403 Forbidden`.

---
**Catatan untuk Junior Programmer / AI Assistant:**
Bekerjalah secara bertahap. Terapkan pada satu modul rute terlebih dahulu (misalnya modul `users`), lakukan testing, lalu baru terapkan ke rute-rute lainnya. Hati-hati, pastikan endpoint yang memang harus terbuka untuk publik (seperti `/api/login`) tidak ikut terkunci.

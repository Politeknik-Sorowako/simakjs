# Issue: Setup Deployment, Branching, & CI/CD ke VPS

**Deskripsi Tugas:**
Kita perlu menyiapkan alur kerja (workflow) untuk deployment aplikasi ini ke VPS. Tugas ini mencakup pengaturan server (VPS), strategi percabangan (branching) Git, dan pembuatan pipeline CI/CD yang berjalan secara otomatis.

Harap ikuti tahapan-tahapan berikut secara berurutan. Kerjakan selangkah demi selangkah.

---

## 1. Persiapan & Tahapan Deploy ke VPS (Manual Setup)
Tujuan dari tahap ini adalah menyiapkan server agar siap menjalankan dan melayani aplikasi kita.

**Langkah-langkah yang harus diimplementasikan:**
- [ ] **Akses VPS:** Pastikan bisa login ke VPS melalui SSH.
- [ ] **Install Kebutuhan Sistem:** Install perangkat lunak (software) utama di server:
  - Node.js (dan `npm` atau `yarn` atau `pnpm`).
  - Git.
  - Process Manager seperti `PM2` (direkomendasikan agar aplikasi tetap hidup di background).
  - Web Server Nginx (berfungsi sebagai Reverse Proxy agar aplikasi bisa diakses melalui domain atau port 80/443).
- [ ] **Clone Repository:** Clone project ini dari repository (misalnya GitHub) ke direktori server, contohnya di `/var/www/simakjs`.
- [ ] **Setup Environment Variabel:** Buat file `.env` di VPS yang berisi konfigurasi rahasia untuk production (seperti URL Database, Secret Keys, dll).
- [ ] **Build & Testing Manual:** Jalankan instalasi (`npm install`), lakukan build kode (`npm run build`), dan jalankan aplikasi secara manual menggunakan PM2 untuk memastikan tidak ada error. Terakhir, sambungkan port aplikasi tersebut dengan konfigurasi Nginx.

---

## 2. Pengaturan Strategi Branching (Percabangan Kode)
Kita perlu memisahkan kode yang sedang dikerjakan dengan kode yang sudah stabil.

**Langkah-langkah yang harus diimplementasikan:**
- [x] **Aktifkan Branch `production` (atau `main`):** Branch ini **KHUSUS** untuk versi aplikasi yang stabil dan ter-deploy di VPS. Tidak boleh ada commit langsung ke branch ini.
- [x] **Aktifkan Branch `development`:** Branch utama tempat semua fitur baru digabungkan. Setiap programmer mengerjakan fitur di branch masing-masing, lalu di-merge ke sini.
- [x] **Aktifkan Branch `testing` (atau `staging`):** Branch khusus untuk tahap pengujian (QA). Kode dari `development` akan masuk ke sini untuk diuji sebelum dirilis ke pengguna.
- **Aturan Alur Kerja:** Alur rilis fitur yang benar adalah: `[Branch Fitur] -> development -> testing -> production`.

---

## 3. Setup CI/CD Pipeline (Deployment Otomatis)
Tujuan tahap ini adalah membuat proses update aplikasi di VPS terjadi secara otomatis setiap kali ada pembaruan kode pada branch `production`.

**Langkah-langkah yang harus diimplementasikan:**
- [x] **Persiapan Secrets di Repository:** Tambahkan variabel rahasia di pengaturan CI/CD (misal di GitHub Secrets). Tambahkan rahasia seperti: IP/Host VPS, Username VPS, dan SSH Private Key.
- [x] **Buat File Konfigurasi Workflow:** Buat file script CI/CD (misalnya `.github/workflows/deploy.yml` jika menggunakan GitHub Actions).
- [x] **Tentukan Trigger (Pemicu):** Atur agar workflow tersebut HANYA berjalan secara otomatis ketika ada kode yang masuk (push atau merge) ke branch `production`.
- [x] **Tulis Script Deployment Otomatis:** Di dalam script workflow tersebut, berikan instruksi agar server CI/CD melakukan SSH ke VPS kita, lalu mengeksekusi perintah berikut di dalam VPS:
  1. Masuk ke direktori aplikasi (`cd /var/www/simakjs`).
  2. Tarik update terbaru (`git pull origin production`).
  3. Perbarui dependensi (`npm install`).
  4. Build aplikasi (`npm run build`).
  5. Restart aplikasi yang sedang berjalan (`pm2 restart simakjs`).
- [ ] **Testing CI/CD:** Lakukan perubahan kecil pada kode, lalu merge ke branch `production`. Pastikan aplikasi di VPS ter-update dengan sendirinya tanpa perlu login SSH manual.

---
**Catatan untuk Junior Programmer / AI Assistant:**
Pastikan kamu memahami arsitektur aplikasi (frontend/backend/database) sebelum mengeksekusi langkah-langkah di atas. Lakukan pengecekan dan validasi (tes) setiap kali kamu menyelesaikan satu tahapan sebelum lanjut ke tahapan berikutnya.

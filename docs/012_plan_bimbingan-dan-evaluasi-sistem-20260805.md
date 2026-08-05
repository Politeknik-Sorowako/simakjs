# Rencana Implementasi: Penyederhanaan /bimbingan & Modul Evaluasi/Review Sistem

## 1. Ringkasan Fitur

### A. Penyederhanaan Halaman `/bimbingan`
- **Tujuan**: Mengubah halaman `/bimbingan` agar tampilan utamanya berfokus pada **Riwayat Bimbingan Dosen Per Semester** (PA/Akademik, Asistensi, Tugas Akhir, Skripsi, dll.). Fitur komunikasi/chat dijadikan fasilitas sekunder/tambahan untuk komunikasi.
- **Fokus Utama**:
  1. Pengelompokan riwayat pembimbingan mahasiswa oleh dosen per `periodeAkademik` dan per `kategori` bimbingan.
  2. Tampilan default menyajikan log bimbingan, tanggal, topik/permasalahan, rekomendasi/solusi, serta status persetujuan & status BKD.
  3. Fitur chat/diskusi berada di tab sekunder atau dialog interaktif tambahan.

### B. Modul Evaluasi & Review Sistem
- **Tujuan**: Memungkinkan user memberikan evaluasi/review/usul pengembangan sistem, yang sifatnya **modular** (dapat diaktifkan/dinonaktifkan sewaktu-waktu oleh Admin).
- **Fokus Utama**:
  1. Memanfaatkan tabel `system_feedback` dan route `/evaluasi-sistem` yang sudah ada di backend & frontend.
  2. Menambahkan konfigurasi `system_settings` (`feature_feedback_enabled`) untuk kontrol aktif/non-aktif secara terpusat.
  3. Menyesuaikan Sidebar dan Route guard frontend agar mengikuti status keaktifan modul secara dinamis.

---

## 2. Perubahan Teknis

### Backend (`apps/backend`)
- **Schema (`src/models/schema.ts`)**:
  - Kolom `kategori` (`varchar`) pada tabel `bimbingan` (`pa_akademik`, `asistensi`, `tugas_akhir`, `skripsi`).
  - Tabel `system_settings` (`key`, `value`, `description`, `updatedAt`).
- **Migrasi**: `drizzle/0033_add_bimbingan_kategori_and_system_settings.sql` (Idempotent).
- **Service & Routes**:
  - `SettingsService` & `SettingsController`: Mengelola pengaktifan modul.
  - `BimbinganService`: Query riwayat per semester & kategori.
  - Middleware / Guard pada `FeedbackController` untuk memvalidasi modul aktif.

### Frontend (`apps/frontend`)
- **Halaman `/bimbingan` (`src/routes/Bimbingan.tsx`)**:
  - Re-layout dengan tab utama: **Riwayat Bimbingan Per Semester** dan tab sekunder: **Fasilitas Chat**.
- **Sidebar & Routing**:
  - Render menu "Evaluasi Sistem" secara kondisional berdasar status modular setting.

---

## 3. Rencana Verifikasi & Testing
- Pre-commit checks:
  ```bash
  bun run lint
  cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json
  cd apps/frontend && bunx tsc --noEmit
  ```
- Pengujian manual flow bimbingan semesteran & toggle modul evaluasi dari Admin.

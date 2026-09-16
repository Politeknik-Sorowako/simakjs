# Implementation Plan: Penyempurnaan Sistem Audit Log SIMAK Vokasi

Penyempurnaan menyeluruh pada modul Audit Log SIMAK Vokasi agar menghasilkan jejak audit yang kontekstual, bermakna, akurat secara status, bersih dari noise bot scanner, dilengkapi fitur ekspor fleksibel (filtered vs seluruh data), serta dioptimalkan dari segi arsitektur query database agar efisien dan tidak membebani performa server.

---

## 1. Analisis Kebutuhan & Akar Masalah

### A. Evaluasi Beban Server & Volume Log (1.000 Data dalam 7 Hari)
1. **Dampak Performa:** 1.000 data dalam 7 hari (~142 baris/hari atau ~6 baris/jam) hanya memakan penyimpanan ~1 MB di PostgreSQL. Secara komputasi dan I/O, volume ini **sangat ringan dan aman**.
2. **Kualitas Data & Noise:** Angka ini cepat meningkat karena sistem saat ini mencatat request bot scanner fiktif (seperti `POST /rds/execute` $\rightarrow$ 404) dan request gagal (4xx/5xx) seolah-olah sebagai perubahan data sukses ("Sistem melakukan tambah data...").
3. **Optimasi Query yang Diperlukan:**
   - Menghilangkan `leftJoin` redundan ke tabel `users` pada eksekusi `count(*)` jika tidak ada filter nama user.
   - Menambahkan kolom fisik `status_code` dan `is_success` terindeks untuk menggantikan scanning field `metadata (JSONB)` yang lambat saat dataset membesar.
   - Menerapkan streaming / chunked fetching pada ekspor CSV untuk mencegah lonjakan konsumsi memori (*memory spike*).

---

## 2. Rincian Fitur yang Dikembangkan

1. **Pembersihan Noise & Koreksi Status (Backend Hook):**
   - Mengabaikan (*early return*) request dengan status HTTP 404 Not Found (endpoint tidak terdaftar/bot probe).
   - Membedakan aksi `SUKSES` ($< 400$) vs `GAGAL` ($\ge 400$) pada deskripsi dan metadata.
2. **Format Deskripsi Kontekstual & Human-Readable:**
   - Menggunakan kamus label modul ramah manusia (`MODULE_DISPLAY_NAMES`) menggantikan nama tabel fisik database.
   - Memperluas resolusi entitas (`resolveEntity`) untuk modul `tagihan`, `kelas-kuliah`, `kompensasi-bayar`, `sesi-apel`, `kurikulum`, dan `nilai-praktik`.
3. **Filter Tingkat Lanjut Berdasarkan Status Respons:**
   - Opsi filter status pada UI dan Backend: `Semua`, `Sukses (2xx)`, `Gagal Validasi / Izin (4xx)`, dan `Error Server (5xx)`.
4. **Fleksibilitas Ekspor CSV:**
   - **Download Log Terfilter:** Mengunduh CSV hanya untuk data yang cocok dengan kriteria pencarian/filter aktif.
   - **Export Seluruh Audit Log:** Mengunduh seluruh arsip audit log (dengan limit pengaman / chunking).
5. **Optimasi Query & Struktur Database:**
   - Migrasi idempotent: Penambahan kolom `status_code` (integer), `is_success` (boolean), serta indeks komposit `(is_success, timestamp)` dan `(status_code, timestamp)`.
   - Optimasi query Drizzle ORM pada `AuditService.getAll` dan `AuditService.exportCsv`.

---

## 3. User Review Required

> [!IMPORTANT]
> **Kebijakan Pengabaian HTTP 404 pada Audit Log:**  
> Request mutasi (`POST/PUT/DELETE`) yang menghasilkan respons `404 Not Found` (seperti bot scanning probe URL fiktif `/rds/execute`, `/.env`, `/wp-login.php`) **tidak akan dicatat ke tabel `audit_logs`**, karena tidak ada entitas akademik atau data yang termodifikasi. Log ini tetap dapat dipantau melalui log web server / Nginx / WAF jika diperlukan untuk analisis keamanan jaringan.

---

## 4. Proposed Changes

### Backend Components

#### [NEW] [0068_add_audit_log_status_columns.sql](file:///home/nasrulhamid/app-projects/simakjs/apps/backend/drizzle/0068_add_audit_log_status_columns.sql)
- Migrasi SQL idempotent:
  - `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status_code INTEGER DEFAULT 200;`
  - `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_success BOOLEAN DEFAULT TRUE;`
  - `CREATE INDEX IF NOT EXISTS idx_audit_logs_status_timestamp ON audit_logs (status_code, timestamp);`
  - `CREATE INDEX IF NOT EXISTS idx_audit_logs_success_timestamp ON audit_logs (is_success, timestamp);`

#### [MODIFY] [apps/backend/src/models/schema.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/backend/src/models/schema.ts)
- Tambahkan definisi kolom `statusCode` dan `isSuccess` pada tabel `auditLogs` beserta indeksnya.

#### [MODIFY] [apps/backend/src/plugins/audit.plugin.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/backend/src/plugins/audit.plugin.ts)
- Pada `auditBeforeHandle` & `auditAfterResponse`:
  - Abaikan pencatatan jika `set?.status === 404`.
  - Simpan `statusCode` dan `isSuccess = statusCode < 400` ke tabel `audit_logs`.
  - Perluas fungsi `resolveEntity()` untuk:
    - `tagihan`: Nama Mahasiswa + NIM + Jenis Tagihan.
    - `kelas-kuliah`: Nama Kelas + Kode/Nama Mata Kuliah.
    - `kompensasi-bayar`: Nama Mahasiswa + NIM + Total Menit Kompensasi.
    - `sesi-apel`: Nama Sesi Apel + Tanggal Pelaksanaan.
    - `kurikulum`: Nama Kurikulum + Tahun Berlaku.
    - `nilai-praktik`: Nama Mahasiswa + Mata Kuliah/Komponen.

#### [MODIFY] [apps/backend/src/utils/audit-format.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/backend/src/utils/audit-format.ts)
- Tambahkan `MODULE_DISPLAY_NAMES` untuk pemetaan modul ke nama bahasa Indonesia.
- Perbarui `formatDescription`:
  - Jika `statusCode >= 400`: `"[waktu] [User] gagal melakukan [aksi] pada [Modul]: [Pesan Error] (HTTP [Status])."`
  - Jika sukses: Format standar deskriptif dengan modul ramah manusia.

#### [MODIFY] [apps/backend/src/services/audit.service.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/backend/src/services/audit.service.ts)
- Optimasi `buildFilters`:
  - Tambahkan filter `statusCategory` (`'all' | 'success' | 'client_error' | 'server_error'`).
- Optimasi `getAll`:
  - Hilangkan `leftJoin(users)` pada `count(*)` jika tidak ada filter pencarian `userName` atau keyword `search`.
- Optimasi `exportCsv`:
  - Dukung ekspor hasil filter maupun ekspor penuh (*all*).
  - Gunakan batching saat mengambil baris data untuk mencegah *out-of-memory*.

#### [MODIFY] [apps/backend/src/controllers/audit.controller.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/backend/src/controllers/audit.controller.ts)
- Terima parameter query `statusCategory` (`'all' | 'success' | 'client_error' | 'server_error'`) pada endpoint `getAll` dan `exportCsv`.

#### [MODIFY] [apps/backend/src/__tests__/audit-format.test.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/backend/src/__tests__/audit-format.test.ts)
- Tambahkan unit test untuk format aksi gagal, label modul ramah manusia, dan kompatibilitas regex format lama.

#### [MODIFY] [apps/backend/src/__tests__/audit-log.test.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/backend/src/__tests__/audit-log.test.ts)
- Tambahkan integration test untuk validasi pengabaian status 404 dan filtering status respons.

---

### Frontend Components

#### [MODIFY] [apps/frontend/src/controllers/auditController.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/src/controllers/auditController.ts)
- Perbarui interface `AuditLog` dengan kolom `statusCode` dan `isSuccess`.
- Tambahkan opsi `statusCategory?: 'all' | 'success' | 'client_error' | 'server_error'` pada `AuditLogFilters`.
- Tambahkan helper `exportAllCsv()` terpisah atau flag `isFullExport` pada `exportCsv()`.

#### [MODIFY] [apps/frontend/src/routes/AuditLog.tsx](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/src/routes/AuditLog.tsx)
- Tambahkan tab/pill filter status respons:
  - `Semua Status`
  - `Sukses (2xx)`
  - `Gagal Validasi / Izin (4xx)`
  - `Error Server (5xx)`
- Pisahkan aksi ekspor menjadi 2 opsi:
  - **"Export Hasil Filter (CSV)"** (mengunduh data sesuai filter aktif).
  - **"Export Seluruh Log (CSV)"** (mengunduh seluruh log dari database).
- Tampilkan badge status respons pada baris tabel:
  - Hijau: `SUKSES (200/201)`
  - Kuning/Oranye: `GAGAL (400/403/422)`
  - Merah: `ERROR (500)`
- Tampilkan nama modul yang komunikatif pada dropdown dan tabel.
- Tampilkan rincian kegagalan/error pada modal Detail Audit Log.

---

## 5. Step-by-Step Implementation

### Tahap 1: Struktur Data & Migrasi Database
- **Langkah 1.1**: Buat berkas migrasi SQL idempotent `0068_add_audit_log_status_columns.sql` dan update `apps/backend/src/models/schema.ts`.
- **Langkah 1.2**: Eksekusi migrasi menggunakan `bun run db:safe-migrate`.

### Tahap 2: Backend Plugin & Formatter Refactoring
- **Langkah 2.1**: Update `apps/backend/src/utils/audit-format.ts` dengan kamus modul ramah manusia dan generator deskripsi kontekstual.
- **Langkah 2.2**: Update `apps/backend/src/plugins/audit.plugin.ts` untuk mengabaikan 404, menyimpan `statusCode`/`isSuccess`, serta menambahkan resolver entitas (`tagihan`, `kelas-kuliah`, `kompensasi`, `sesi-apel`, `kurikulum`, `nilai-praktik`).

### Tahap 3: Optimasi Query & Endpoint Controller Backend
- **Langkah 3.1**: Update `apps/backend/src/services/audit.service.ts` untuk optimasi `count(*)`, filtering `statusCategory`, dan ekspor data aman.
- **Langkah 3.2**: Update `apps/backend/src/controllers/audit.controller.ts` untuk mendukung parameter `statusCategory`.

### Tahap 4: Antarmuka Pengguna (Frontend SolidJS)
- **Langkah 4.1**: Update `apps/frontend/src/controllers/auditController.ts` dengan tipe data baru dan fungsi ekspor.
- **Langkah 4.2**: Update `apps/frontend/src/routes/AuditLog.tsx` dengan filter status respons, tombol ekspor ganda (filtered vs all), badge visual Apple-inspired, dan modal detail yang informatif.

### Tahap 5: Pengujian, Linting & Verifikasi
- **Langkah 5.1**: Jalankan unit test `bun test apps/backend/src/__tests__/audit-format.test.ts`.
- **Langkah 5.2**: Jalankan linting `bun run lint` dan type check `bunx tsc --noEmit`.

---

## 6. Verification Plan

### Automated Verification
```bash
# 1. Unit Testing Formatter Audit Log
bun test apps/backend/src/__tests__/audit-format.test.ts

# 2. Monorepo Linting (Biome)
bun run lint

# 3. Strict TypeScript Compilation Check
cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json
cd apps/frontend && bunx tsc --noEmit
```

### Manual Verification
1. **Verifikasi Penolakan Noise 404:**
   - Jalankan `curl -X POST http://localhost:3000/rds/execute` atau `POST /api/random-probe`.
   - Pastikan tidak ada data baru yang masuk ke tabel `audit_logs`.
2. **Verifikasi Pencatatan Aksi Gagal:**
   - Picu kegagalan validasi (HTTP 422) atau unauthorized (HTTP 401/403).
   - Verifikasi log mencatat status `GAGAL` beserta pesan error dan tidak menuliskan "berhasil tambah data".
3. **Verifikasi Filter Status Respons di UI:**
   - Pilih tab "Gagal Validasi / Izin (4xx)" di halaman Audit Log.
   - Pastikan hanya transaksi gagal yang muncul.
4. **Verifikasi Fitur Ekspor CSV:**
   - Uji tombol "Export Hasil Filter" dan periksa isi CSV sesuai dengan filter aktif.
   - Uji tombol "Export Seluruh Log" dan periksa seluruh data terunduh dengan lengkap.
5. **Verifikasi Resolusi Entitas:**
   - Lakukan operasi CRUD pada modul `tagihan` atau `kelas-kuliah`.
   - Pastikan kolom Entitas menampilkan nama mahasiswa / nama kelas dengan jelas.

# Issue: Fitur Pengajuan Cuti & Penonaktifan Kuliah (Keluar, DO, dll.)

Dokumen ini berisi perencanaan implementasi fitur Pengajuan Cuti (diajukan oleh Mahasiswa, disetujui Dosen PA, Keuangan, dan Prodi/Admin) serta fitur Penonaktifan Kuliah (keluar/DO, dicatat langsung oleh Admin/Prodi). Fitur-fitur ini dirancang agar kompatibel dengan data sinkronisasi PDDIKTI (Neo Feeder).

---

## Konteks Proyek

- **Tech Stack**: SolidJS (frontend), ElysiaJS + Drizzle ORM (backend), PostgreSQL (database).
- **Lokasi Kode**:
  - Backend: `apps/backend/src/`
  - Frontend: `apps/frontend/src/`
- **Pola yang Diikuti**: Setiap modul backend terdiri dari: `schema (models)` → `service` → `controller` → `routes` → `schema (validation)`. Di frontend: `route page` → integrasi API.
- **Pola PDDIKTI**: Setiap tabel yang bisa disinkronkan ke PDDIKTI harus punya kolom `idPddikti` (UUID), `isSynced` (boolean), dan `lastSyncAt` (timestamp). Kolom status mahasiswa akan disesuaikan dengan status di PDDIKTI.

---

## Bagian 1: Perubahan Database (Backend Drizzle ORM)

Tambahkan dua tabel baru ke `apps/backend/src/models/schema.ts` beserta relasinya.

### 1A. Tabel `pengajuan_cuti`
Digunakan untuk menampung riwayat pengajuan cuti mahasiswa per semester/periode akademik.

| Nama Kolom | Tipe Data | Keterangan |
|------------|-----------|------------|
| `id` | serial, PK | Auto-increment primary key |
| `mahasiswaId` | integer, FK | `references(() => mahasiswa.id, { onDelete: 'cascade' })`, NOT NULL |
| `periodeId` | varchar(5), FK | `references(() => periodeAkademik.id)`, NOT NULL (contoh: "20241") |
| `alasan` | text | Alasan mengajukan cuti, NOT NULL |
| `status` | varchar(50) | Status approval: `'pending'`, `'disetujui_pa'`, `'disetujui_keuangan'`, `'disetujui_prodi'`, `'ditolak'`. Default: `'pending'` |
| `catatan` | text | Catatan penolakan atau tambahan (nullable) |
| `noSuratIzin` | varchar(100) | Nomor Surat Izin Cuti dari kampus (nullable) -> sinkron ke PDDIKTI `no_surat_izin_cuti` |
| `tanggalSuratIzin` | date | Tanggal terbit Surat Izin (nullable) -> sinkron ke PDDIKTI `tgl_surat_izin_cuti` |
| `idPddikti` | varchar(50) | UUID dari PDDIKTI jika sudah sinkron (nullable) |
| `isSynced` | boolean | Penanda sinkronisasi ke PDDIKTI, default `false` |
| `lastSyncAt` | timestamp | Waktu sinkronisasi terakhir (nullable) |
| `createdAt` | timestamp | `defaultNow()`, NOT NULL |
| `updatedAt` | timestamp | `defaultNow()`, NOT NULL |

### 1B. Tabel `penonaktifan_mahasiswa`
Digunakan untuk mencatat riwayat perubahan status non-aktif (Keluar, Drop Out, Wafat, Pindah, dll.).

| Nama Kolom | Tipe Data | Keterangan |
|------------|-----------|------------|
| `id` | serial, PK | Auto-increment primary key |
| `mahasiswaId` | integer, FK | `references(() => mahasiswa.id, { onDelete: 'cascade' })`, NOT NULL |
| `periodeId` | varchar(5), FK | `references(() => periodeAkademik.id)`, NOT NULL |
| `statusBaru` | varchar(50) | Nilai status baru: `'keluar'`, `'drop_out'`, `'pindah'`, `'wafat'`, `'non_aktif'`. NOT NULL |
| `tanggalKeluar` | date | Tanggal efektif status dinonaktifkan, NOT NULL -> sinkron ke PDDIKTI `tanggal_keluar` |
| `alasanKeluar` | text | Keterangan tambahan alasan keluar (nullable) |
| `noSk` | varchar(100) | Nomor SK Rektor/Direktur/Yudisium (nullable) -> sinkron ke PDDIKTI `no_sk_yudisium` |
| `tanggalSk` | date | Tanggal terbit SK (nullable) -> sinkron ke PDDIKTI `tanggal_sk_yudisium` |
| `ipk` | numeric(3,2) | IPK terakhir mahasiswa saat keluar/DO (nullable) -> sinkron ke PDDIKTI `ipk` |
| `nomorIjazah` | varchar(100) | Nomor Ijazah jika statusnya lulus/keluar dengan gelar (nullable) |
| `idPddikti` | varchar(50) | UUID dari PDDIKTI (nullable) |
| `isSynced` | boolean | default `false` |
| `lastSyncAt` | timestamp | (nullable) |
| `createdAt` | timestamp | `defaultNow()`, NOT NULL |
| `updatedAt` | timestamp | `defaultNow()`, NOT NULL |

### 1C. Update Relasi Tabel `mahasiswa`
Di file `apps/backend/src/models/schema.ts`, tambahkan relasi di dalam `mahasiswaRelations`:
- `pengajuanCuti: many(pengajuanCuti)`
- `penonaktifan: many(penonaktifanMahasiswa)`

*Catatan Migrasi*: Setelah merancang skema ini, jalankan `bun db:generate` dan `bun db:push` (atau setara) pada folder backend untuk memperbarui skema database PostgreSQL lokal.

---

## Bagian 2: API Endpoints (Backend ElysiaJS)

Buat Controller, Service, Route, dan Validation Schema terpisah untuk masing-masing modul.

### 2A. Modul Pengajuan Cuti (`/pengajuan-cuti`)

1. **`POST /pengajuan-cuti`**
   - **Akses**: Mahasiswa
   - **Tujuan**: Mengajukan cuti akademik baru.
   - **Validasi**: Cek jika mahasiswa memiliki tagihan yang belum lunas (opsional, tergantung kebijakan, namun default: biarkan mengajukan, status akan dicek Keuangan). Cek jika pada periode tersebut mahasiswa sudah pernah mengajukan cuti.
   - **Input**: `{ periodeId: string, alasan: string }`

2. **`GET /pengajuan-cuti`**
   - **Akses**: Mahasiswa, Dosen PA, Keuangan, Admin/Prodi
   - **Tujuan**: Mengambil daftar pengajuan cuti.
   - **Filter**:
     - *Mahasiswa*: Hanya menampilkan riwayat pengajuannya sendiri.
     - *Dosen PA*: Hanya menampilkan mahasiswa bimbingannya (`mahasiswa.dosenPaId === dosen.id`).
     - *Keuangan*: Menampilkan semua pengajuan yang berstatus setidaknya `'disetujui_pa'` (atau `'pending'`).
     - *Admin/Prodi*: Menampilkan semua pengajuan cuti.

3. **`GET /pengajuan-cuti/:id`**
   - **Akses**: Semua role terkait.
   - **Tujuan**: Detail pengajuan cuti.

4. **`PUT /pengajuan-cuti/:id/approve`**
   - **Akses**: Dosen PA, Keuangan, Admin/Prodi
   - **Input**: `{ action: 'approve' | 'reject', catatan?: string, noSuratIzin?: string, tanggalSuratIzin?: string }`
   - **Logika Alur Approval**:
     - **Dosen PA**: Mengubah status dari `'pending'` menjadi `'disetujui_pa'` (atau `'ditolak'`).
     - **Keuangan**: Mengubah status dari `'disetujui_pa'` menjadi `'disetujui_keuangan'` (atau `'ditolak'`).
     - **Admin/Prodi**: Mengubah status dari `'disetujui_keuangan'` menjadi `'disetujui_prodi'` (final approval, atau `'ditolak'`). Pada tahap ini, Admin/Prodi wajib menginput `noSuratIzin` dan `tanggalSuratIzin`.
     - **Efek Samping**: Saat status berubah menjadi `'disetujui_prodi'`, perbarui kolom `status` pada tabel `mahasiswa` milik mahasiswa yang bersangkutan menjadi `'cuti'`.

5. **`DELETE /pengajuan-cuti/:id`**
   - **Akses**: Mahasiswa (hanya jika status pengajuan masih `'pending'`).

### 2B. Modul Penonaktifan Kuliah (`/penonaktifan`)

Modul ini dikelola penuh oleh Admin/Prodi untuk mencatat mahasiswa yang keluar atau dikeluarkan.

1. **`POST /penonaktifan`**
   - **Akses**: Admin, Prodi
   - **Tujuan**: Menonaktifkan mahasiswa (karena Keluar, DO, Pindah, Wafat, dll.).
   - **Input**: `{ mahasiswaId: number, periodeId: string, statusBaru: string, tanggalKeluar: string, alasanKeluar?: string, noSk?: string, tanggalSk?: string, ipk?: number, nomorIjazah?: string }`
   - **Efek Samping**: Setelah berhasil dicatat, perbarui kolom `status` di tabel `mahasiswa` menjadi nilai `statusBaru` (misalnya `'drop_out'`, `'keluar'`, dll.).

2. **`GET /penonaktifan`**
   - **Akses**: Admin, Prodi, Dosen PA (read-only)
   - **Tujuan**: Melihat riwayat penonaktifan mahasiswa.

3. **`DELETE /penonaktifan/:id`**
   - **Akses**: Admin, Prodi
   - **Tujuan**: Membatalkan penonaktifan.
   - **Efek Samping**: Mengembalikan status di tabel `mahasiswa` menjadi `'aktif'` dan menghapus baris riwayat penonaktifan terkait.

---

## Bagian 3: Registrasi Routes (ElysiaJS App)

Daftarkan route-route baru tersebut pada file `apps/backend/src/app.ts`:
```ts
import { cutiRoutes } from './routes/cuti.routes';
import { penonaktifanRoutes } from './routes/penonaktifan.routes';

// Daftarkan di app instance
app.use(cutiRoutes);
app.use(penonaktifanRoutes);
```

---

## Bagian 4: Halaman Frontend (SolidJS)

Buat halaman baru di folder `apps/frontend/src/routes/` dan daftarkan di `App.tsx`.

### 4A. Halaman Cuti Mahasiswa (`apps/frontend/src/routes/CutiMahasiswa.tsx`)
- **Tampilan untuk Mahasiswa**:
  - Tombol "Ajukan Cuti".
  - Form dialog/modal untuk memilih periode akademik (default: periode aktif selanjutnya) dan mengisi kolom alasan cuti.
  - Tabel riwayat pengajuan cuti mahasiswa beserta status approval saat ini (`pending` -> `disetujui_pa` -> `disetujui_keuangan` -> `disetujui_prodi`).
  - Tombol batal (delete) hanya jika status masih `pending`.

### 4B. Halaman Approval Cuti (`apps/frontend/src/routes/CutiApproval.tsx`)
- **Tampilan untuk Staff / Dosen**:
  - Disesuaikan dengan role pengguna saat ini:
    - **Dosen PA**: Menampilkan daftar pengajuan berstatus `'pending'` dari mahasiswa bimbingannya. Terdapat tombol Setujui (ke PA) dan Tolak.
    - **Keuangan**: Menampilkan daftar pengajuan berstatus `'disetujui_pa'`. Menyediakan informasi status pembayaran tagihan mahasiswa terkait. Terdapat tombol Setujui (ke Keuangan) dan Tolak.
    - **Prodi/Admin**: Menampilkan daftar pengajuan berstatus `'disetujui_keuangan'`. Form approval final harus meminta input `noSuratIzin` dan `tanggalSuratIzin`. Terdapat tombol Setujui Final dan Tolak.
  - Sediakan filter periode akademik dan pencarian berdasarkan NIM/Nama mahasiswa.

### 4C. Halaman Penonaktifan Kuliah (`apps/frontend/src/routes/Penonaktifan.tsx`)
- **Tampilan untuk Admin / Prodi**:
  - Form pencarian mahasiswa aktif yang akan dinonaktifkan.
  - Form penginputan status baru (dropdown: Keluar, Drop Out, Pindah, Wafat, Non-Aktif), tanggal efektif keluar, nomor SK, tanggal SK, nilai IPK terakhir, nomor ijazah (opsional), dan alasan.
  - Tabel daftar riwayat mahasiswa non-aktif dengan opsi tombol "Batal Non-Aktif" (untuk mengembalikan mahasiswa menjadi aktif kembali).

---

## Bagian 5: Navigasi & Routing Frontend

### 5A. Daftarkan Halaman Baru di `apps/frontend/src/App.tsx`
```tsx
import CutiMahasiswa from './routes/CutiMahasiswa';
import CutiApproval from './routes/CutiApproval';
import Penonaktifan from './routes/Penonaktifan';

// Di dalam <Routes>
<Route
  path="/pengajuan-cuti"
  element={
    <ProtectedRoute allowedRoles={['mahasiswa']}>
      <CutiMahasiswa />
    </ProtectedRoute>
  }
/>
<Route
  path="/approval-cuti"
  element={
    <ProtectedRoute allowedRoles={['admin', 'dosen', 'prodi', 'keuangan']}>
      <CutiApproval />
    </ProtectedRoute>
  }
/>
<Route
  path="/penonaktifan"
  element={
    <ProtectedRoute allowedRoles={['admin', 'prodi']}>
      <Penonaktifan />
    </ProtectedRoute>
  }
/>
```

### 5B. Tambahkan Menu Navigasi di `apps/frontend/src/components/Sidebar.tsx`
- Tambahkan menu **"Pengajuan Cuti"** untuk user dengan role `mahasiswa`.
- Tambahkan menu **"Persetujuan Cuti"** untuk user dengan role `dosen`, `keuangan`, `prodi`, atau `admin`.
- Tambahkan menu **"Penonaktifan Mahasiswa"** untuk user dengan role `admin` atau `prodi`.

---

## Bagian 6: Langkah Pengujian (Testing Scenario)

Junior programmer atau model AI yang lebih murah harus membuat unit test pada folder `apps/backend/src/__tests__/`:

1. **Skenario Cuti Mahasiswa**:
   - `POST /pengajuan-cuti` dengan data valid -> mengembalikan HTTP 201.
   - `POST /pengajuan-cuti` di periode yang sama -> mengembalikan HTTP 400 (duplikat).
   - `PUT /pengajuan-cuti/:id/approve` oleh PA -> status berubah menjadi `disetujui_pa`.
   - `PUT /pengajuan-cuti/:id/approve` oleh Keuangan -> status berubah menjadi `disetujui_keuangan`.
   - `PUT /pengajuan-cuti/:id/approve` oleh Prodi/Admin (final) -> status berubah menjadi `disetujui_prodi`, dan `mahasiswa.status` berubah menjadi `cuti`.
   - `DELETE /pengajuan-cuti/:id` pada status selain `pending` -> mengembalikan HTTP 400 (tidak boleh dihapus).

2. **Skenario Penonaktifan**:
   - `POST /penonaktifan` dengan role admin -> mengembalikan HTTP 201, status `mahasiswa` berubah menjadi sesuai pilihan.
   - `DELETE /penonaktifan/:id` -> mengembalikan HTTP 200, status `mahasiswa` kembali menjadi `aktif`.

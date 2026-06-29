# Issue: Fitur Kurikulum, RPS, Impor Data & Integrasi BAP

Dokumen ini berisi perencanaan untuk 4 fitur. Kerjakan secara berurutan karena fitur selanjutnya bergantung pada fitur sebelumnya.

> **Referensi**: Semua skema database telah disesuaikan dengan field-field API Neo Feeder PDDIKTI agar data bisa disinkronkan.

---

## Konteks Proyek

- **Tech Stack**: SolidJS (frontend), ElysiaJS + Drizzle ORM (backend), PostgreSQL (database)
- **Lokasi Kode**:
  - Backend: `apps/backend/src/`
  - Frontend: `apps/frontend/src/`
- **Pola yang Diikuti**: Setiap modul terdiri dari file: `schema (models)` → `service` → `controller` → `routes` → `schema (validation)`. Di frontend: `controller` → `route page`.
- **Pola PDDIKTI**: Setiap tabel yang bisa disinkronkan ke PDDIKTI harus punya kolom `idPddikti` (UUID), `isSynced` (boolean), dan `lastSyncAt` (timestamp). Lihat contoh di tabel `mahasiswa` atau `dosen` yang sudah ada.

---

## Fitur 0: Penyesuaian Tabel Database yang Sudah Ada (PDDIKTI Compliance)

### Tujuan
Menambahkan field-field yang dibutuhkan API Neo Feeder PDDIKTI pada tabel yang sudah ada di `apps/backend/src/models/schema.ts`, agar data bisa dikirim ke PDDIKTI tanpa error.

> **Penting**: Semua field baru harus `nullable` agar data lama tidak rusak saat migrasi. Data lama bisa dilengkapi lewat form edit atau impor CSV nanti.

### 0A. Tabel `dosen` — Tambah 2 Field Wajib

PDDIKTI API `InsertBiodataDosen` membutuhkan `tempat_lahir` dan `id_agama` yang belum ada.

| Field Baru | Tipe | Keterangan |
|------------|------|------------|
| tempatLahir | varchar(100), nullable | → mapping ke `tempat_lahir` PDDIKTI |
| idAgama | integer, nullable | → mapping ke `id_agama` PDDIKTI (1=Islam, 2=Kristen, dst) |

```ts
// Tambahkan di tabel dosen, sebelum createdAt
tempatLahir: varchar('tempat_lahir', { length: 100 }),
idAgama: integer('id_agama'),
```

### 0B. Tabel `mahasiswa` — Tambah 7 Field Wajib

PDDIKTI API `InsertBiodataMahasiswa` membutuhkan data alamat dan demografi yang belum ada (wajib sejak Neo Feeder patch 3.1).

| Field Baru | Tipe | Keterangan |
|------------|------|------------|
| tempatLahir | varchar(100), nullable | → mapping ke `tempat_lahir` PDDIKTI |
| idAgama | integer, nullable | → mapping ke `id_agama` PDDIKTI |
| jalan | text, nullable | → mapping ke `jalan` PDDIKTI |
| rt | varchar(5), nullable | → mapping ke `rt` PDDIKTI |
| rw | varchar(5), nullable | → mapping ke `rw` PDDIKTI |
| kodePos | varchar(10), nullable | → mapping ke `kode_pos` PDDIKTI |
| kewarganegaraan | varchar(5), nullable, default "ID" | → mapping ke `kewarganegaraan` PDDIKTI |

```ts
// Tambahkan di tabel mahasiswa, sebelum createdAt
tempatLahir: varchar('tempat_lahir', { length: 100 }),
idAgama: integer('id_agama'),
jalan: text('jalan'),
rt: varchar('rt', { length: 5 }),
rw: varchar('rw', { length: 5 }),
kodePos: varchar('kode_pos', { length: 10 }),
kewarganegaraan: varchar('kewarganegaraan', { length: 5 }).default('ID'),
```

### 0C. Tabel `mata_kuliah` — Tambah 2 Field Wajib

PDDIKTI API `InsertMataKuliah` membutuhkan `sks_praktek_lapangan` dan `sks_simulasi` yang belum ada.

| Field Baru | Tipe | Keterangan |
|------------|------|------------|
| sksPraktekLapangan | integer, default 0 | → mapping ke `sks_praktek_lapangan` PDDIKTI |
| sksSimulasi | integer, default 0 | → mapping ke `sks_simulasi` PDDIKTI |

```ts
// Tambahkan di tabel mata_kuliah, setelah sksPraktek
sksPraktekLapangan: integer('sks_praktek_lapangan').default(0),
sksSimulasi: integer('sks_simulasi').default(0),
```

### 0D. Tabel `kelas_kuliah` — Tambah 2 Field Wajib

PDDIKTI API `InsertKelasKuliah` membutuhkan `tanggal_mulai_efektif` dan `tanggal_akhir_efektif`.

| Field Baru | Tipe | Keterangan |
|------------|------|------------|
| tanggalMulaiEfektif | date, nullable | → mapping ke `tanggal_mulai_efektif` PDDIKTI |
| tanggalAkhirEfektif | date, nullable | → mapping ke `tanggal_akhir_efektif` PDDIKTI |

```ts
// Tambahkan di tabel kelas_kuliah, setelah isLocked
tanggalMulaiEfektif: date('tanggal_mulai_efektif'),
tanggalAkhirEfektif: date('tanggal_akhir_efektif'),
```

### 0E. Update Form UI yang Sudah Ada

Setelah menambahkan field di database, perbarui form pada halaman berikut agar field baru bisa diinput:

- `apps/frontend/src/routes/Dosen.tsx` — tambah input Tempat Lahir, Agama (dropdown)
- `apps/frontend/src/routes/Mahasiswa.tsx` — tambah input Tempat Lahir, Agama, Alamat (jalan, RT, RW, kode pos)
- `apps/frontend/src/routes/MataKuliah.tsx` — tambah input SKS Praktek Lapangan, SKS Simulasi
- `apps/frontend/src/routes/KelasKuliah.tsx` — tambah input Tanggal Mulai, Tanggal Akhir

> **Referensi Agama**: Gunakan dropdown statis: 1=Islam, 2=Kristen, 3=Katolik, 4=Hindu, 5=Buddha, 6=Konghucu, 7=Lainnya (sesuai referensi PDDIKTI).

---

## Fitur 1: Modul Kurikulum, Mata Kuliah & RPS

### Tujuan
Membuat modul untuk menyusun kurikulum per program studi, mengatur mata kuliah dalam kurikulum tersebut, dan membuat Rencana Pembelajaran Semester (RPS) lengkap dengan topik/bahasan per pertemuan.

### 1A. Tabel Database Baru

Tambahkan tabel berikut di `apps/backend/src/models/schema.ts`:

#### Tabel `kurikulum`

Mapping ke PDDIKTI API: `InsertKurikulum`

| Kolom | Tipe | Mapping PDDIKTI |
|-------|------|-----------------|
| id | serial, PK | |
| kode | varchar(50), unique | Kode internal, contoh: "KUR-2024" |
| nama | varchar(255) | → `nama_kurikulum` |
| programStudiId | integer, FK → program_studi.id | → `id_prodi` (via idPddikti prodi) |
| semesterMulai | varchar(5), FK → periode_akademik.id | → `id_semester` (contoh: "20241") |
| jumlahSksLulus | integer | → `jumlah_sks_lulus` |
| jumlahSksWajib | integer | → `jumlah_sks_wajib` |
| jumlahSksPilihan | integer | → `jumlah_sks_pilihan` |
| isAktif | boolean, default false | Hanya 1 kurikulum aktif per prodi |
| idPddikti | varchar(50), unique, nullable | UUID dari PDDIKTI |
| isSynced | boolean, default false | Flag sinkronisasi |
| lastSyncAt | timestamp, nullable | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

#### Tabel `kurikulum_mata_kuliah` (pivot/relasi many-to-many)

Mapping ke PDDIKTI API: `InsertMataKuliahKurikulum`

| Kolom | Tipe | Mapping PDDIKTI |
|-------|------|-----------------|
| id | serial, PK | |
| kurikulumId | integer, FK → kurikulum.id | → `id_kurikulum` |
| mataKuliahId | integer, FK → mata_kuliah.id | → `id_matkul` |
| semester | integer | → `semester` (1-8) |
| sksMataKuliah | integer | → `sks_mata_kuliah` |
| sksTatapMuka | integer | → `sks_tatap_muka` |
| sksPraktek | integer | → `sks_praktek` |
| sksPraktekLapangan | integer, default 0 | → `sks_praktek_lapangan` |
| sksSimulasi | integer, default 0 | → `sks_simulasi` |
| isWajib | boolean, default true | → `apakah_wajib` (1=wajib, 0=pilihan) |
| createdAt | timestamp | |

> **Tips**: Saat menambahkan MK ke kurikulum, default-kan SKS dari data di tabel `mata_kuliah` agar user tidak perlu isi ulang.

#### Tabel `rps` (Rencana Pembelajaran Semester)

Tabel internal SIMAK (tidak dikirim langsung ke PDDIKTI). Berfungsi sebagai "header" yang mengelompokkan topik-topik per mata kuliah per periode.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | serial, PK | |
| mataKuliahId | integer, FK → mata_kuliah.id | |
| periodeId | varchar(5), FK → periode_akademik.id | |
| deskripsi | text | Deskripsi umum mata kuliah |
| cplProdi | text | Capaian Pembelajaran Lulusan |
| createdAt | timestamp | |
| updatedAt | timestamp | |

#### Tabel `rps_topik` (Topik/Bahasan per Pertemuan)

Mapping ke PDDIKTI API: `InsertRencanaAjar`

| Kolom | Tipe | Mapping PDDIKTI |
|-------|------|-----------------|
| id | serial, PK | |
| rpsId | integer, FK → rps.id, ON DELETE CASCADE | |
| pertemuanKe | integer | → `minggu_ajar` (1-16) |
| topik | varchar(255) | → `topik_ajar` |
| subTopik | text, nullable | Internal saja |
| metode | varchar(100) | Internal saja, contoh: "Ceramah, Praktek" |
| cpmkId | integer, nullable, FK → cpmk.id | Internal saja (link ke CPMK) |
| idPddikti | varchar(50), unique, nullable | ID dari PDDIKTI |
| createdAt | timestamp | |

#### Tabel `rencana_evaluasi` (Opsional, tapi wajib PDDIKTI 2024+)

Mapping ke PDDIKTI API: `InsertRencanaEvaluasi`

| Kolom | Tipe | Mapping PDDIKTI |
|-------|------|-----------------|
| id | serial, PK | |
| mataKuliahId | integer, FK → mata_kuliah.id | → `id_matkul` |
| namaEvaluasi | varchar(100) | → `nama_evaluasi` (contoh: "UTS", "UAS") |
| bobotEvaluasi | numeric(5,2) | → `bobot_evaluasi` (total harus 100) |
| deskripsi | text, nullable | → `deskripsi_evaluasi` |
| idPddikti | varchar(50), unique, nullable | ID dari PDDIKTI |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### 1B. Backend API

Buat file-file baru mengikuti pola yang sudah ada:

**Service** (`apps/backend/src/services/`):
- `kurikulum.service.ts` — CRUD untuk tabel kurikulum + kurikulum_mata_kuliah
- `rps.service.ts` — CRUD untuk tabel rps + rps_topik + rencana_evaluasi

**Controller** (`apps/backend/src/controllers/`):
- `kurikulum.controller.ts` — Handler request kurikulum
- `rps.controller.ts` — Handler request RPS

**Routes** (`apps/backend/src/routes/`):
- `kurikulum.routes.ts`
- `rps.routes.ts`

**Schema Validasi** (`apps/backend/src/schemas/`):
- `kurikulum.schema.ts`
- `rps.schema.ts`

#### Endpoint yang Dibuat

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/kurikulum` | List semua kurikulum (filter by prodiId) |
| GET | `/kurikulum/:id` | Detail kurikulum beserta daftar mata kuliah |
| POST | `/kurikulum` | Buat kurikulum baru |
| PUT | `/kurikulum/:id` | Update kurikulum |
| DELETE | `/kurikulum/:id` | Hapus kurikulum |
| POST | `/kurikulum/:id/mata-kuliah` | Tambahkan mata kuliah ke kurikulum |
| DELETE | `/kurikulum/:id/mata-kuliah/:mkId` | Hapus mata kuliah dari kurikulum |
| GET | `/rps?mataKuliahId=X&periodeId=Y` | Ambil RPS + topik-topiknya |
| POST | `/rps` | Buat RPS baru |
| PUT | `/rps/:id` | Update RPS |
| POST | `/rps/:id/topik` | Tambah topik ke RPS |
| PUT | `/rps/topik/:topikId` | Edit topik RPS |
| DELETE | `/rps/topik/:topikId` | Hapus topik RPS |
| GET | `/rencana-evaluasi?mataKuliahId=X` | List rencana evaluasi MK |
| POST | `/rencana-evaluasi` | Buat rencana evaluasi |
| PUT | `/rencana-evaluasi/:id` | Edit rencana evaluasi |
| DELETE | `/rencana-evaluasi/:id` | Hapus rencana evaluasi |

> **Penting**: Jangan lupa daftarkan routes baru di `apps/backend/src/app.ts` seperti modul lainnya.

### 1C. Frontend

**Controller** (`apps/frontend/src/controllers/`):
- `kurikulumController.ts` — Panggil API kurikulum
- `rpsController.ts` — Panggil API RPS + rencana evaluasi

**Halaman** (`apps/frontend/src/routes/`):
- `Kurikulum.tsx` — Halaman kelola kurikulum + daftar mata kuliah di dalamnya
- `Rps.tsx` — Halaman kelola RPS + topik per pertemuan (tabel 16 baris) + tab rencana evaluasi

**Routing** — Tambahkan di `apps/frontend/src/App.tsx`:
```tsx
<Route path="/kurikulum" element={<ProtectedRoute allowedRoles={['admin']}><Kurikulum /></ProtectedRoute>} />
<Route path="/rps" element={<ProtectedRoute allowedRoles={['admin', 'dosen']}><Rps /></ProtectedRoute>} />
```

**Referensi UI**: Gunakan pola yang sama seperti `apps/frontend/src/routes/MataKuliah.tsx` untuk tampilan tabel + modal form. Gunakan komponen `MainLayout`, `Table`, `Modal`, `Input`, dan `Button` yang sudah ada.

---

## Fitur 2: Impor Data CSV untuk Data Master

### Tujuan
Tambahkan tombol "Impor CSV" di halaman data master (Mahasiswa, Dosen, Mata Kuliah, Program Studi) agar admin bisa mengupload file CSV untuk menambahkan data secara massal.

### 2A. Backend — Endpoint Impor

Tambahkan endpoint baru di masing-masing route file yang sudah ada:

| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/mahasiswa/import` | Impor data mahasiswa dari CSV |
| POST | `/dosen/import` | Impor data dosen dari CSV |
| POST | `/mata-kuliah/import` | Impor data mata kuliah dari CSV |
| POST | `/prodi/import` | Impor data program studi dari CSV |

#### Alur Kerja Endpoint Impor
1. Terima file CSV dari request body (gunakan `multipart/form-data`)
2. Parse CSV menjadi array objek
3. Validasi setiap baris (format email, kolom wajib, dll)
4. Jika ada baris error, kembalikan daftar error beserta nomor barisnya
5. Jika semua valid, simpan ke database pakai `db.insert(...).values([...])` (batch insert)
6. Kembalikan jumlah data yang berhasil disimpan

#### Format CSV yang Diharapkan

> **Catatan**: Format CSV sudah disesuaikan dengan field PDDIKTI yang ditambahkan di Fitur 0.

**Mahasiswa**: `nim, nama, email, programStudiKode, status, namaIbuKandung, nik, jenisKelamin, tanggalLahir, tempatLahir, idAgama, jalan, rt, rw, kodePos, kewarganegaraan`
**Dosen**: `nip, nama, email, programStudiKode, nidn, nik, jenisKelamin, tanggalLahir, tempatLahir, idAgama`
**Mata Kuliah**: `kode, nama, sksTotal, sksTatapMuka, sksPraktek, sksPraktekLapangan, sksSimulasi, programStudiKode`
**Program Studi**: `kode, nama, jenjang`

> **Catatan**: Kolom `programStudiKode` di CSV akan di-resolve ke `programStudiId` berdasarkan kode prodi yang sudah ada di database. Kolom baru (`tempatLahir`, `idAgama`, dll) bersifat opsional di CSV — jika tidak diisi, akan disimpan sebagai `null`.

### 2B. Frontend — Komponen dan UI

#### Komponen Baru: `ImportCsvModal.tsx`

Buat di `apps/frontend/src/components/ui/ImportCsvModal.tsx`:

- Modal berisi:
  - Input file (accept=".csv")
  - Tombol "Download Template" (opsional, unduh contoh CSV kosong)
  - Preview tabel (tampilkan 5 baris pertama dari CSV)
  - Tombol "Impor"
  - Area error (menampilkan baris yang gagal validasi)

#### Integrasi ke Halaman yang Sudah Ada

Tambahkan tombol "📥 Impor CSV" di sebelah tombol "Tambah" pada halaman:
- `apps/frontend/src/routes/Mahasiswa.tsx`
- `apps/frontend/src/routes/Dosen.tsx`
- `apps/frontend/src/routes/MataKuliah.tsx`
- `apps/frontend/src/routes/ProgramStudi.tsx`

Setelah impor berhasil, panggil `refetch()` untuk memuat ulang tabel.

---

## Fitur 3: Topik/Bahasan RPS pada BAP

### Tujuan
Saat dosen membuat Berita Acara Perkuliahan (BAP), tampilkan daftar topik dari RPS sebagai pilihan dropdown untuk kolom "Materi". Ini agar materi yang diajarkan sesuai dengan rencana di RPS.

### 3A. Backend

Tambahkan endpoint untuk mengambil topik RPS berdasarkan mata kuliah dan periode:

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/rps/topik?mataKuliahId=X&periodeId=Y` | List topik RPS yang tersedia |

> **Catatan**: Endpoint ini sudah akan ada jika Fitur 1 dikerjakan. Jika belum, buatkan endpoint khusus ini.

### 3B. Frontend — Modifikasi Form BAP

File yang diubah: `apps/frontend/src/routes/BapPresensi.tsx`

#### Langkah Perubahan

1. **Fetch topik RPS** — Saat kelas dipilih, ambil `mataKuliahId` dan `periodeId` dari kelas tersebut, lalu panggil API untuk mendapatkan daftar topik RPS.

2. **Ubah input "Materi" menjadi combo** — Pada modal "Buat Jurnal Harian (BAP) Baru" (sekitar baris 467-474), ubah field materi:
   - Jika ada topik RPS: tampilkan `<select>` berisi daftar topik dari RPS, diurutkan berdasarkan `pertemuanKe`
   - Tampilkan opsi "Lainnya (ketik manual)" di akhir dropdown
   - Jika dipilih "Lainnya", tampilkan input teks biasa (seperti sekarang)
   - Jika tidak ada RPS/topik: tampilkan input teks biasa (fallback, seperti yang sekarang)

3. **Auto-fill pertemuan ke** — Jika dosen memilih topik dari RPS, otomatis isi field "Pertemuan Ke" sesuai `pertemuanKe` dari topik yang dipilih.

4. **Auto-fill CPMK** — Jika topik RPS punya `cpmkId`, otomatis pilih CPMK yang sesuai di dropdown CPMK.

#### Contoh Tampilan Dropdown Topik

```
-- Pilih Topik dari RPS --
[1] Pengenalan dan Dasar Pemrograman
[2] Variabel, Tipe Data dan Operator
[3] Struktur Kontrol: Percabangan
...
[16] Ujian Akhir Semester
──────────────
Lainnya (ketik manual)
```

---

## Urutan Pengerjaan

```
Fitur 0 (DB Patch)  ──→  Fitur 1 (Kurikulum & RPS)  ──→  Fitur 2 (Impor CSV)  ──→  Fitur 3 (Topik RPS di BAP)
      ↑                          ↑                              ↑                           ↑
 Dikerjakan pertama       Butuh tabel DB yang             Bisa paralel,              Butuh tabel rps_topik
 karena memodifikasi      sudah di-patch                  tapi setelah tabel          dari Fitur 1
 tabel yang ada                                           master siap
```

## Checklist Verifikasi

Setelah selesai, pastikan:
- [ ] `bun run --cwd apps/backend db:push` berhasil tanpa error (schema migrasi)
- [ ] Data lama tidak rusak setelah menambahkan field baru (semua nullable)
- [ ] Form Dosen, Mahasiswa, MataKuliah, KelasKuliah menampilkan field baru
- [ ] Semua endpoint baru muncul di Swagger (`/swagger`)
- [ ] Halaman Kurikulum dan RPS bisa diakses dan CRUD berjalan
- [ ] Impor CSV berhasil untuk setiap tipe data master (termasuk field baru)
- [ ] Form BAP menampilkan dropdown topik jika RPS tersedia
- [ ] Tampilan terbaca dengan baik di mode terang dan mode gelap

## Referensi API Neo Feeder PDDIKTI

Mapping field lokal ke PDDIKTI untuk sinkronisasi:

| Entitas Lokal | Action PDDIKTI | Field Penting |
|---------------|----------------|---------------|
| kurikulum | `InsertKurikulum` | nama→nama_kurikulum, semesterMulai→id_semester, jumlahSksLulus, jumlahSksWajib, jumlahSksPilihan |
| kurikulum_mk | `InsertMataKuliahKurikulum` | semester, sksMataKuliah, sksTatapMuka, sksPraktek, sksPraktekLapangan, sksSimulasi, isWajib→apakah_wajib |
| rps_topik | `InsertRencanaAjar` | pertemuanKe→minggu_ajar, topik→topik_ajar |
| rencana_evaluasi | `InsertRencanaEvaluasi` | namaEvaluasi→nama_evaluasi, bobotEvaluasi→bobot_evaluasi |
| dosen | `InsertBiodataDosen` | nama→nama_dosen, tempatLahir→tempat_lahir, idAgama→id_agama |
| mahasiswa | `InsertBiodataMahasiswa` | nama→nama_mahasiswa, tempatLahir→tempat_lahir, idAgama→id_agama, jalan, rt, rw, kodePos→kode_pos |
| mata_kuliah | `InsertMataKuliah` | kode→kode_mata_kuliah, nama→nama_mata_kuliah, sksPraktekLapangan→sks_praktek_lapangan, sksSimulasi→sks_simulasi |
| kelas_kuliah | `InsertKelasKuliah` | namaKelas→nama_kelas_kuliah, tanggalMulaiEfektif→tanggal_mulai_efektif, tanggalAkhirEfektif→tanggal_akhir_efektif |

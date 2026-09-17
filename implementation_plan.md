# Implementation Plan: Filter Prodi + Kolom Prodi + Sorting Tabel `/monitoring-bimbingan`

Dokumen perencanaan struktural. Tujuan: menambah filter Program Studi, menampilkan kolom Program Studi mahasiswa, dan mengizinkan sorting tabel monitoring bimbingan.

---

## 1. Latar Belakang

Halaman `apps/frontend/src/routes/MonitoringBimbingan.tsx` saat ini:
- Filter: Periode Semester, Dosen PA, dan search (NIM/Mahasiswa/Dosen, debounced 400ms).
- Prodi hanya implisit via `workspace.activeProdiId()` (hanya aktif untuk role `admin`), tanpa dropdown eksplisit.
- Tabel: `['No','NIM','Nama Mahasiswa','Dosen PA','Periode','Jumlah Sesi','Status Approval']` — tanpa kolom Prodi, tanpa sorting server-side.
- Export CSV & print: tanpa kolom Prodi. `handlePrint` juga tidak mengirim `prodiId`.

Target:
1. Filter Program Studi eksplisit (dropdown).
2. Tampilkan **Program Studi mahasiswa** pada tabel, CSV, dan print.
3. Sorting server-side berdasarkan `nim`, `nama mahasiswa`, `dosen PA`, `prodi`, dan `jumlah sesi`.

Nilai Prodi diambil dari **program studi mahasiswa** (`mahasiswa.programStudiId -> programStudi.nama`), bukan prodi dosen PA.

---

## 2. Keputusan Desain

- **Server-side sorting** via query param `sortBy` + `sortOrder` (pola `ApelVerifikasi.tsx`, `LaporanKompensasi.tsx`). Client-side ditolak karena hanya mengurutkan halaman aktif dan merusak paginasi/export.
- **`totalSesi` (derived)** diurutkan dengan Opsi A: muat seluruh baris terfilter, hitung `totalSesi` in-memory, sort global, lalu slice per halaman. Kolom lain (`nim/nama/dosenPa/prodi`) memakai `ORDER BY` DB.
- **Filter Prodi efektif**: `selectedProdi() ?? workspace.activeProdiId() ?? undefined`, reset ke halaman 1 saat berubah.
- Kontrak sort: `'nim' | 'nama' | 'dosenPa' | 'prodi' | 'totalSesi'`; default `sortBy` kosong -> fallback perilaku lama `asc(mahasiswa.id)`.

---

## 3. File Target

### Backend
1. `apps/backend/src/schemas/bimbingan.schema.ts` — tambah `getMonitoringLengkapSchema` (query validation).
2. `apps/backend/src/routes/bimbingan.routes.ts` — pasang schema pada `/monitoring-lengkap`.
3. `apps/backend/src/controllers/bimbingan.controller.ts` — parse + whitelist `sortBy`/`sortOrder`.
4. `apps/backend/src/services/bimbingan.service.ts` — `leftJoin(programStudi)`, select `prodiNama`, sorting whitelist + cabang `totalSesi`, mapping `prodiNama`.

### Frontend
5. `apps/frontend/src/controllers/bimbinganController.ts` — tipe `prodiNama`, param `sortBy`/`sortOrder`.
6. `apps/frontend/src/routes/MonitoringBimbingan.tsx` — dropdown Prodi, kolom Prodi (tabel/CSV/print), `SortableHeader`, plumbing filter + sort.

### Test
7. `apps/backend/src/__tests__/bimbingan-monitoring-sort.test.ts` — integration test filter prodi + sorting.

Tidak diubah: `Table.tsx`, `SortableHeader.tsx`, `WorkspaceContext.tsx`, `prodiController.ts`, migrasi DB, `schema.ts`.

---

## 4. Rincian Perubahan

### 4.1 Backend Service (`getMonitoringBimbinganLengkap`)
- Tambah `leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))` pada query data dan count query.
- Tambah `prodiNama: programStudi.nama` pada select dan respons (`mhs.prodiNama || '-'`).
- Whitelist sort DB:
  - `nim -> mahasiswa.nim`
  - `nama -> mahasiswa.nama`
  - `dosenPa -> dosen.nama`
  - `prodi -> programStudi.nama`
- `sortBy === 'totalSesi'`: muat seluruh mahasiswa terfilter, batch load `bimbingan` + `sesiBimbingan`, hitung `totalSesi`, sort global (tiebreak `mahasiswa.id`), slice `offset..offset+limit`.
- `sortBy` kosong/invalid: fallback `asc(mahasiswa.id)` (perilaku lama).
- `meta.total`/`meta.totalPages` konsisten dengan set terfilter.

### 4.2 Backend Controller
- Parse `sortBy` (string) dan `sortOrder` (`'asc' | 'desc'`, default `asc`).
- Validasi whitelist `['nim','nama','dosenPa','prodi','totalSesi']`; invalid -> `undefined`.

### 4.3 Backend Schema & Route
- `getMonitoringLengkapSchema.query`: `periodeId`, `prodiId`, `dosenPaId`, `kategori`, `search`, `page`, `limit`, `sortBy`, `sortOrder`.

### 4.4 Frontend Controller
- `MonitoringBimbinganLengkapItem`: tambah `prodiNama: string | null`.
- `getMonitoringLengkap(filter)`: tambah `sortBy?: string; sortOrder?: 'asc' | 'desc'` + append ke `URLSearchParams`.

### 4.5 Frontend Page
- State: `selectedProdi`, `sortBy`, `sortOrder`; `toggleSort(field)` (default `totalSesi -> desc`, lainnya `asc`); `prodis` resource.
- Resource `monitoringData` key += `prodiId`, `sortBy`, `sortOrder`.
- Dropdown Prodi di bar filter (`-- Semua Prodi --`).
- Tabel: kolom Prodi setelah Nama Mahasiswa; `SortableHeader` untuk NIM, Nama, Prodi, Dosen PA, Jumlah Sesi.
- CSV: tambah kolom Prodi; sertakan `prodiId/sortBy/sortOrder` pada fetch export.
- Print: sertakan `prodiId/sortBy/sortOrder` (perbaiki bug), tambah kolom Prodi, tampilkan Prodi terpilih di header cetak.

---

## 5. Pengujian

Targeted test saja (hindari `bun test` blanket di root).

- `apps/backend/src/__tests__/bimbingan-monitoring-sort.test.ts`:
  - `prodiNama` hadir di setiap row.
  - Filter `prodiId` memotong benar; kombinasi `prodiId + search + sort` benar.
  - Sort `nim/nama/dosenPa/prodi` asc/desc benar.
  - Sort `totalSesi` desc/asc benar lintas halaman.
  - `sortBy` invalid -> fallback tanpa error; `sortOrder` tanpa `sortBy` diabaikan.
  - `meta.total`/`meta.totalPages` konsisten.
- Frontend: `bun run lint` + `bunx biome ci .` + `bunx tsc --noEmit`.

---

## 6. Risiko

- `programStudiId` NULL -> `prodiNama` NULL ditampilkan `'-'`.
- Konsistensi join pada count query.
- Perubahan struktur CSV (penambahan kolom Prodi) diumumkan di PR.
- Scoping role prodi/dosen tetap mengikuti guard eksisting; tidak melebarkan akses.

---

## 7. Urutan Eksekusi

1. Backend schema + route.
2. Backend controller.
3. Backend service.
4. Test backend + targeted run.
5. Frontend controller.
6. Frontend page.
7. Verifikasi lint + tsc + manual QA.
8. PR staging-first ke `development`.

---

## 8. Kriteria Selesai

- Dropdown Prodi memfilter tabel, CSV, dan print.
- Kolom Prodi tampil di tabel/CSV/print dan dapat diurutkan bersama NIM, Nama, Dosen PA, Jumlah Sesi.
- `lint` + `tsc` hijau, test baru hijau, tanpa migrasi DB, tanpa push langsung ke `development`/`main`.

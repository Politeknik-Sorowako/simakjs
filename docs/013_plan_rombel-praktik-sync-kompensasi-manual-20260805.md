# Technical Implementation Plan — Rombel Praktik Sync & Kompensasi Manual

Tanggal: 2026-08-05
Role: Lead Software Architect

## Ringkasan Fitur

1. **Rombel Praktik & Rekap Otomatis ke Kelas Matakuliah**
   - Dosen membuat kelompok praktik (Rombel) di dalam kelas matakuliah.
   - Presensi, BAP, dan penilaian praktikum dilakukan per rombel.
   - Engine rekapitulasi menyinkronkan hasil praktikum langsung ke rekapitulasi kelas matakuliah induk.

2. **Kompensasi Mahasiswa Manual & Deteksi Duplikasi**
   - Dosen/Admin dapat menginput kompensasi manual: Sakit, Izin, Alpa, Terlambat, Rusak.
   - Sakit/Izin/Alpa otomatis dihitung 480 menit (asumsi tidak hadir sehari penuh) tanpa input durasi.
   - Terlambat/Rusak wajib mengisi jumlah menit.
   - Cegah duplikat: total durasi kompensasi per mahasiswa per hari tidak boleh melebihi 480 menit.
   - Notifikasi dan daftar riwayat kompensasi berpeluang ganda (lebih dari satu data kompen dalam sehari).

## Audit Codebase

Sudah ada (tidak dibuat ulang):
- Tabel `rombel_praktikum`, `rombel_praktikum_mahasiswa`, `bap_praktikum`, `presensi_praktikum` — `apps/backend/src/models/schema.ts:2269-2377`
- CRUD Rombel Praktikum — `rombel-praktikum.controller.ts`, `.service.ts`, `.routes.ts`
- Tabel `kompensasi_bayar` dan kalkulasi kompensasi dari presensi teori/apel — `presensi.service.ts`

Gap yang ditutup:
- `presensi_praktikum` belum masuk kalkulasi kompensasi.
- Belum ada tabel `nilai_praktik` dan penilaian praktikum.
- Belum ada sync dari praktikum ke kelas induk.
- Belum ada input kompensasi manual + validasi 480 menit/hari.
- Belum ada deteksi & riwayat kompensasi ganda.

## Database Baru

### `kompensasi_manual`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | SERIAL PK | |
| mahasiswa_id | INTEGER FK mahasiswa (CASCADE) | |
| tanggal | DATE NOT NULL | |
| jenis_kompen | VARCHAR(20) CHECK IN (sakit, izin, alpa, terlambat, rusak) | |
| durasi_menit | INTEGER DEFAULT 0 | Auto 480 untuk sakit/izin/alpa |
| keterangan | TEXT NULL | |
| created_by | INTEGER FK users (SET NULL) | |
| created_at / updated_at | TIMESTAMP | |

Index: `(mahasiswa_id, tanggal)`, `(jenis_kompen)`.

### `nilai_praktik`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | SERIAL PK | |
| rombel_praktikum_id | INTEGER FK rombel_praktikum (CASCADE) | |
| mahasiswa_id | INTEGER FK mahasiswa (CASCADE) | |
| komponen_nilai_id | INTEGER FK komponen_nilai (SET NULL) | |
| nilai_angka | NUMERIC(5,2) CHECK 0..100 | |
| keterangan | TEXT NULL | |
| created_by | INTEGER FK users (SET NULL) | |
| created_at / updated_at | TIMESTAMP | |

UNIQUE `(rombel_praktikum_id, mahasiswa_id, komponen_nilai_id)`.

## Aturan Validasi

1. Auto-set `durasi_menit = 480` di backend untuk sakit/izin/alpa (abaikan input UI).
2. Terlambat/rusak wajib `durasi_menit > 0`.
3. `SUM(existing) + durasi_baru <= 480` per `mahasiswa_id` per `tanggal` — cek sebelum INSERT/UPDATE.
4. Deteksi duplikat: `GROUP BY mahasiswa_id, tanggal HAVING COUNT(*) > 1`.

## API Contract (ringkas)

- `POST /kompensasi-manual` — input kompensasi manual (admin/dosen).
- `PUT /kompensasi-manual/:id` — update (admin).
- `DELETE /kompensasi-manual/:id` — hapus (admin).
- `GET /kompensasi-manual/riwayat/:mahasiswaId` — riwayat per mahasiswa.
- `GET /kompensasi-manual/duplicate-risk?mahasiswaId=` — daftar potensi ganda.
- `GET /kompensasi-manual/stats` — statistik kompensasi manual.
- `POST /nilai-praktik/bulk` — simpan nilai praktikum (replace-all).
- `GET /nilai-praktik/rombel/:rombelPraktikumId` — daftar nilai per rombel.
- `POST /rombel-praktikum/:id/sync-presensi` — sync presensi praktikum ke kelas induk.
- `POST /rombel-praktikum/:id/sync-nilai` — sync nilai praktikum ke KRS kelas induk.

## Checklist Implementasi (PR terpisah)

1. **PR A:** Schema DB + migration `kompensasi_manual` & `nilai_praktik`.
2. **PR B:** Backend kompensasi manual (service, controller, schema, routes).
3. **PR C:** Backend nilai praktik (service, controller, schema, routes).
4. **PR D:** Sync engine + integrasi `kompensasi_manual` ke `presensi.service`.
5. **PR E:** Frontend input kompensasi manual.
6. **PR F:** Frontend duplicate risk & riwayat.
7. **PR G:** Frontend tab praktikum + tombol sync di BapPresensi.

## Catatan Deployment

- Migration idempotent (`CREATE TABLE IF NOT EXISTS`).
- Perubahan additive, tidak ada breaking change API.
- Jalankan `bun run lint`, `cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json`, `cd apps/frontend && bunx tsc --noEmit` sebelum push.

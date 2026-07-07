# Activity Log: Implementasi RPS, Kurikulum, & Perbaikan Database

**Tanggal:** 2026-07-07
**Developer:** AI Agent
**Branch:** `db/kurikulum`
**PR:** [#76](https://github.com/Politeknik-Sorowako/simakjs/pull/76)

---

## Ringkasan

Implementasi fitur kurikulum, perbaikan struktur database, redesign halaman RPS, dan berbagai perbaikan critical issues.

---

## Perubahan Backend

### Database (`models/schema.ts`)
- **Hapus** `programStudiId` dari tabel `mata_kuliah` — MK bersifat global
- **Tambah** field `is_locked` di tabel `kurikulum`
- **Tabel baru** `angkatan_kurikulum` — mapping prodi + angkatan ke kurikulum

### Endpoint Baru
| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/angkatan-kurikulum` | List binding angkatan ke kurikulum |
| POST | `/angkatan-kurikulum` | Create binding (auto-lock kurikulum) |
| GET | `/kelas-kuliah/by-mk` | Daftar kelas per MK |
| POST | `/rps/bulk-generate` | Generate RPS massal dari kurikulum |
| POST | `/rps/copy` | Copy RPS dari periode sebelumnya |
| POST | `/kurikulum/:id/copy-from` | Copy MK dari kurikulum lain |
| POST | `/kurikulum/:id/duplicate` | Duplikasi kurikulum + MK |
| POST | `/kurikulum/:id/import-mk` | Import MK via CSV |
| GET | `/krs/rencana-studi` | Rencana studi dari kurikulum |
| GET | `/krs/validasi` | Validasi KRS terhadap kurikulum |

### Perbaikan Critical Issues
- **Unique constraint violation** di `angkatan-kurikulum.create` — fix: delete-before-insert
- **Performance** `mata-kuliah.getAll` — fast path: DB-level pagination tanpa kurikulum
- **Logic bug** `krs.validasi` — `totalSksDiKrs` sekarang hitung SKS bukan record count
- **Missing transaction** di `copyRps`, `copyFromKurikulum`, `duplicate`, `importMkCsv`, `create`, `update`
- **CSV parsing** — handle BOM, CRLF, batch lookup MK, validasi semester

---

## Perubahan Frontend

### Halaman RPS (Redesain)
- Filter cascading: Periode (default aktif) → Prodi → Kurikulum → MK
- Panel daftar kelas yang mengambil MK
- Copy RPS dari periode sebelumnya
- Loading states untuk resources
- Fix: array mutation `.sort()` saat render → `[...arr].sort()`
- Fix: race condition dua `createEffect` → gabung jadi satu dengan prioritas

### Halaman Kurikulum
- Modal detail MK per semester (grouped by semester)
- Tambah/hapus MK dalam kurikulum
- Copy MK dari kurikulum lain
- Import CSV MK
- Duplikasi kurikulum
- Download template CSV
- `mkBySemester` → `createMemo`
- Null safety `?.data?.`

### Halaman Mata Kuliah
- Filter kurikulum, semester
- Sorting by kode, nama, SKS, semester, prodi, kurikulum
- Kolom prodi dari kurikulum
- Search by kode AND nama
- Auto-select kurikulum pertama

### Halaman Binding Angkatan
- Baru: binding angkatan ke kurikulum
- Fix: NaN bug — signal `formProdiId` terpisah dari `prodiFilter`

### Halaman Kelas Kuliah
- Tombol [RPS] → navigasi ke `/rps?mataKuliahId=X&periodeId=Y`

---

## Perbaikan Lain
- README.md tetap di root, dokumentasi lain dipindah ke `docs/` dengan format `NNN_type_subject-YYYYMMDD.md`
- Periode akademik: saat satu diaktifkan, yang lain otomatis dinonaktifkan
- Pencarian MK by kode AND nama (ilike + or)

# Implementation Plan (Follow-up): PDF DNU, Toleransi Bobot, Pemetaan Impor Nilai

Dokumen perencanaan struktural untuk item yang **belum diimplementasi** pada PR #399
(`feat/input-nilai-export-redesign`). Belum berisi implementasi kode penuh. Tanpa migrasi DB.

---

## 0. Konteks & Keputusan yang Sudah Dikunci

PR #399 masih **OPEN** (belum di-merge). Tiga item sengaja ditunda dan menjadi scope dokumen ini:

| Kode | Item | Keputusan |
| :--- | :--- | :--- |
| F3 | Pemetaan kolom impor manual + pratinjau + unduh error | Opsi B: panel lokal di `InputNilai.tsx`, `ImportCsvModal` tidak diubah |
| F1 | PDF DNU (Daftar Nilai Ujian) siap cetak | **Kop resmi institusi** (logo + nama + alamat); `exportToPDF` diberi parameter opsional dengan default tidak berubah |
| F2 | Toleransi bobot desimal | Disetujui, **EPS 0.01**, FE + BE + test serentak dalam satu PR |

**Urutan eksekusi:** F3 -> F1 -> F2. Rekomendasi satu PR per item (staging-first ke `development`).
**Prasyarat:** branch follow-up dibuat dari `development` **setelah PR #399 merge** untuk menghindari
konflik pada `apps/frontend/src/routes/InputNilai.tsx`.

**Tidak dikerjakan (eksplisit):**
- Endpoint export backend (`GET /yudisium/kelas/:id/export`) — kondisional, hanya bila terbukti berat (>500 mhs).
- Persist alias nama kolom impor; normalisasi bobot otomatis; `nilai-export.test.ts` backend (export tetap client-side).

---

## 1. F3 — Pemetaan Kolom Impor Manual + Pratinjau + Unduh Error

### 1.1 Latar Belakang
`handleImportNilais` (`InputNilai.tsx`) mencocokkan nama kolom CSV ke komponen/sub **by-name** (case-insensitive).
Satu perbedaan huruf/spasi membuat seluruh kolom ditolak tanpa jalan perbaikan di UI. Auto-match
`templateHeaders` tetap dipertahankan sebagai default.

### 1.2 Target File
- **Modify:** `apps/frontend/src/routes/InputNilai.tsx`
  - State baru: `pendingImportRows: string[][] | null`, `columnMapping: Record<number, string>`.
  - Alur baru: `ImportCsvModal.onImport` tidak langsung menyimpan; ia mengembalikan error "perlu pemetaan"
    ATAU modal menyerahkan rows mentah ke handler lokal. Rancangan dipilih saat eksekusi:
    (i) tangkap `onImport` di wrapper lokal lalu tampilkan panel, atau
    (ii) tambah callback `onParsed(rows)` pada pemakaian modal (tanpa ubah komponen bersama).
  - Panel "Pemetaan Kolom Impor" (modal/section): per kolom CSV -> dropdown target (`nim`, nama komponen,
    nama sub, atau `Abaikan`), pratinjau 5 baris, tombol `Unduh Daftar Error`, `Lanjutkan Impor`.
  - Fungsi normalisasi header: ganti header CSV sesuai mapping lalu teruskan ke `handleImportNilais`
    **tanpa mengubah logika validasi/save** di dalamnya.
- **Tidak diubah:** `apps/frontend/src/components/ui/ImportCsvModal.tsx` (dipakai lintas halaman),
  `apps/frontend/src/utils/export.ts` (reuse `exportToCSV` untuk unduh error), backend.

### 1.3 Perilaku
1. User pilih file -> `parseCsv` -> deteksi header.
2. Auto-match: nama kolom identik dengan `templateHeaders`/definisi -> mapping terisi otomatis.
3. Kolom tak dikenal -> default `Abaikan` + sorot; user bisa petakan manual.
4. Validasi ringan saat pratinjau: duplikat NIM, nilai non-numerik, di luar envelope. Error per baris
   dapat diunduh sebagai CSV.
5. `Lanjutkan Impor` -> kirim rows ternormalisasi ke `handleImportNilais` -> validasi + simpan backend tetap
   menjadi penentu akhir (envelope, lock, dedupe).

### 1.4 Dependensi
- Definisi komponen (`components()`), sub (`subsByKomponen()`), `nilaiEnvelope()`, `parseGradeInput`,
  `studentsGrades()` (peta NIM->krsId) — semuanya sudah tersedia di PR #399.
- `exportToCSV` (`utils/export.ts`).

### 1.5 Risiko
| Risiko | Mitigasi |
| :--- | :--- |
| Duplikat nama sub antar-komponen | Tetap ditolak seperti perilaku lama; pesan jelas di panel mapping |
| Modal bersama berubah | Opsi B: tidak menyentuh `ImportCsvModal`; semua logika di `InputNilai.tsx` |
| Mapping hanya sesi berjalan | Diterima (tanpa persist) |

### 1.6 Langkah Eksekusi
1. S0 baseline: `bun run lint`, `biome ci`, `tsc` FE.
2. Tambah state + penangkapan rows mentah dari modal.
3. Bangun panel mapping + auto-match + pratinjau 5 baris.
4. Tambah normalisasi header + tombol unduh error + tombol lanjutkan.
5. QA round-trip: CSV ejaan salah -> mapping manual -> impor sukses; template terisi -> auto-match tanpa mapping.
6. Verifikasi + PR `development`.

---

## 2. F1 — PDF DNU (Daftar Nilai Ujian) dengan Kop Resmi

### 2.1 Latar Belakang
Belum ada dokumen cetak resmi nilai per MK. PDF DNU = kop institusi + tabel nilai + footer tanggal &
tanda tangan (dosen pengampu, kaprodi). Helper `exportToPDF` (`utils/export.ts:65-129`) sudah ada
(landscape A4, kop generik, footer "SIMAK Vokasi"), tetapi **belum mendukung kop resmi institusi**.

### 2.2 Target File
- **Modify:** `apps/frontend/src/utils/export.ts`
  - Tambah parameter **opsional** pada `exportToPDF` (mis. `options?: { kop?: { logoUrl?: string; institusi?: string; alamat?: string; judulDokumen?: string }; signatures?: string[] }`).
  - **Default tidak berubah** agar pemakai lain (`KHS`, laporan) tidak terdampak.
- **Modify:** `apps/frontend/src/routes/InputNilai.tsx`
  - `handleExportPDF`: rakit baris dari **nilai tersimpan** memakai `buildRingkasanRows` + `buildRingkasanColumns`
    (sudah ada di PR #399), panggil `exportToPDF(...)` dengan kop + tanda tangan.
  - Tombol `Cetak PDF (DNU)` di Actions + sticky bar.
- **Aset:** sumber logo institusi perlu diverifikasi (kemungkinan `apps/frontend/public/`). Bila logo belum
  tersedia, blokir F1 dan minta aset ke user (jangan menebak URL/path).
- **Tidak diubah:** backend.

### 2.3 Format Dokumen
- Orientasi landscape A4.
- Kop: logo + nama institusi + alamat + judul `DAFTAR NILAI UJIAN` + baris MK/kelas/periode/prodi/dosen.
- Tabel: `No | NIM | Nama | [Komponen (bobot%) ...] | Nilai Akhir | Huruf | Indeks`.
- Footer: tanggal cetak + kolom tanda tangan (Dosen Pengampu, Kaprodi) + nomor halaman.
- Strategi tabel lebar (komponen banyak): font 7–8pt + kolom padat; **varian ringkas** (tanpa kolom komponen,
  hanya NA/Huruf/Indeks) sebagai opsi bila komponen > ambang tertentu. Ambang diputuskan saat eksekusi.

### 2.4 Risiko
| Risiko | Mitigasi |
| :--- | :--- |
| Perubahan helper merusak halaman lain | Parameter baru opsional; default = perilaku kini; regresi manual KHS/laporan |
| Logo belum tersedia | Verifikasi aset lebih dulu; tanpa aset -> tunda F1, minta ke user |
| Tabel terlalu lebar | Font padat + opsi varian ringkas; uji 30–100 baris + multi-halaman |

### 2.5 Langkah Eksekusi
1. Verifikasi aset logo + kunci format kop & label tanda tangan.
2. Tambah parameter opsional di `exportToPDF` (tanpa mengubah default).
3. Implementasi `handleExportPDF` + tombol.
4. QA cetak: A4 landscape, header berulang tiap halaman, tanda tangan, dark-mode tidak ikut.
5. Verifikasi + PR `development`.

---

## 3. F2 — Toleransi Bobot Desimal (EPS 0.01)

### 3.1 Latar Belakang
Validasi total bobot memakai kesetaraan float strict `!== 100` di:
- `apps/frontend/src/routes/InputNilai.tsx` (`handleSaveComponents`),
- `apps/frontend/src/components/SubKomponenEditor.tsx` (validasi 100%),
- `apps/backend/src/services/yudisium.service.ts` (save komponen + sub).

Akibatnya bobot desimal wajar (mis. `33.33 + 33.33 + 33.34`) berisiko ditolak. `recalcFinalGrades`
juga melewatkan KRS bila bobot terdaftar `!= 100`, sehingga NA lama dipertahankan diam-diam.

### 3.2 Keputusan
- **EPS = 0.01.** Lolos bila `Math.abs(total - 100) < 0.01`.
- NA memakai bobot **apa adanya**, tanpa normalisasi. Selisih `<0.01` poin dianggap negligible dan
  didokumentasikan pada komentar kode.
- Perubahan FE + BE + test dalam **satu PR** (hindari divergensi).

### 3.3 Target File
- **Modify:** `apps/backend/src/utils/grade-calc.ts`
  - Konstanta tunggal `BOBOT_EPSILON = 0.01` + helper `isBobotComplete(weight: number): boolean`.
  - Terapkan di `computeKomponenScore` (`weight === 100`) dan `buildFinalScore` (`registeredWeight === 100`).
- **Modify:** `apps/backend/src/services/yudisium.service.ts`
  - Ganti cek `!= 100` komponen & sub dengan `isBobotComplete(...)` (jangan duplikasi angka).
- **Modify:** `apps/frontend/src/routes/InputNilai.tsx`
  - `handleSaveComponents` pakai `Math.abs(total - 100) < 0.01`; tambah indikator lolos/gagal pada `Total: {..}%`.
- **Modify:** `apps/frontend/src/components/SubKomponenEditor.tsx`
  - Validasi `totalBobot` pakai toleransi yang sama.
- **Modify (test):** `apps/backend/src/__tests__/nilai-akhir.test.ts` (tambah kasus 99.99 lolos, 99.0 ditolak),
  verifikasi `sub-komponen.test.ts`, `nilai-envelope.test.ts`.

### 3.4 Risiko
| Risiko | Mitigasi |
| :--- | :--- |
| Divergensi FE/BE | Satu konstanta di BE + konstanta FE yang sama; test di kedua sisi dalam PR yang sama |
| Kelengkapan NA berubah | `isBobotComplete` menggantikan `=== 100` secara konsisten di kalkulasi & validasi |
| Bobot 99.0 ikut lolos | Diuji eksplisit ditolak (di luar EPS) |

### 3.5 Langkah Eksekusi
1. S0 baseline: lint + biome ci + tsc BE/FE + test nilai regresi.
2. Tambah `BOBOT_EPSILON` + `isBobotComplete` di `grade-calc.ts`.
3. Terapkan di `yudisium.service.ts` (komponen + sub).
4. Terapkan di FE (`InputNilai.tsx`, `SubKomponenEditor.tsx`).
5. Update/tambah test (99.99 lolos, 99.0 ditolak, agregasi & leaf).
6. Verifikasi + PR `development`.

---

## 4. Ringkasan Urutan & Verifikasi

```
F3 (mapping impor)  -> F1 (PDF DNU, butuh aset logo)  -> F2 (EPS 0.01, FE+BE+test)
```

Verifikasi tiap PR:
```bash
bun run lint
bunx @biomejs/biome ci .
cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json
cd apps/frontend && bunx tsc --noEmit
# khusus F2 (DB test lokal localhost:5433):
bun test apps/backend/src/__tests__/nilai-akhir.test.ts
```
Semua PR menyasar `development` (staging-first); tanpa migrasi DB.

## 5. Kriteria Selesai per Item
- [ ] **F3:** CSV dengan nama kolom beda ejaan dapat dipetakan manual dan diimpor; error per baris dapat diunduh;
      template terisi tetap auto-match; `ImportCsvModal` & backend tidak berubah.
- [ ] **F1:** satu klik mengunduh PDF DNU landscape dengan kop resmi + tanda tangan + nomor halaman;
      `exportToPDF` default tidak berubah untuk pemakai lain.
- [ ] **F2:** bobot `99.99` lolos dan `99.0` ditolak di FE & BE; test regresi nilai hijau; `lint`/`tsc` hijau.

---

## 6. Status Implementasi (diperbarui saat eksekusi)

### Selesai
- **F3** — Panel pemetaan kolom impor (`Modal` lokal) + auto-match + pratinjau 5 baris + unduh daftar error +
  tombol Lanjutkan. `ImportCsvModal` dan backend tidak disentuh.
- **F1** — Tombol `Cetak PDF (DNU)` dengan kop resmi institusi (logo `src/assets/logo.png` dimuat sebagai data URL),
  info MK/kelas/periode/prodi/dosen, dan blok tanda tangan (Dosen Pengampu, Ketua Program Studi).
  `exportToPDF` diberi parameter opsional `PdfKopOptions`; default pemakai lain tidak berubah.
- **F2 (parsial)** — Toleransi `isBobotComplete` (EPS 0.01, membandingkan `round2(100 - weight)`) di
  `grade-calc.ts`, `yudisium.service.ts` (komponen/sub), `InputNilai.tsx`, `SubKomponenEditor.tsx`.
  Schema `bobot` (body + response `yudisium`/`khs`) diubah `t.Integer` -> `t.Number`. Unit test murni
  `isBobotComplete` ditambahkan; regresi ditolak (99.0) diuji di endpoint.

### BLOCKER: F2 memerlukan migrasi DB (bertentangan dengan asumsi plan)
Kolom `komponen_nilai.bobot` dan `sub_komponen_nilai.bobot` di `schema.ts` bertipe **`integer`**
(`integer('bobot')`), sehingga bobot desimal (mis. `33.33`) gagal di level Postgres
(`insert ... bobot=33.33` ditolak). Karena itu **bobot desimal belum dapat dipersist** tanpa migrasi:

- Ubah kolom menjadi `numeric(5,2) { mode: 'number' }` (Drizzle mendukung `mode: 'number'` agar TS tetap `number`).
- Migrasi idempotent + snapshot `drizzle-kit`, wajib backup DB sebelum deploy staging/produksi (AGENTS.md).
- Dampak: memperluas scope plan (yang semula menyatakan "tanpa migrasi DB").

Keputusan diperlukan: setujui PR migrasi terpisah `0070_nilai_bobot_numeric.sql`, atau batalkan target bobot desimal.
Selama belum ada migrasi, validasi toleran tetap aman (no-op untuk bobot integer) namun tidak membuka input desimal.

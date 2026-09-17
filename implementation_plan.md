# Implementation Plan: Export Nilai + Redesign Metode Input `/input-nilai`

## 1. Latar Belakang & Scope

Halaman `apps/frontend/src/routes/InputNilai.tsx` (1783 baris) adalah satu-satunya
layanan input nilai per `kelasKuliah`, dengan 3 metode non-destruktif:
M1 nilai akhir, M2 per komponen, M3 per sub-komponen. Dua permintaan:

1. **Export nilai MK dari level sub-komponen sampai nilai akhir** (belum ada tombol
   export sama sekali; satu-satunya arah data keluar adalah simpan ke server).
2. **Redesign metode penginputan agar jelas terbaca & mudah dioperasikan**
   (tabel melebar tak terkendali, input mikro `w-14/w-16`, draft tertimpa refetch,
   tanpa rekap pra-simpan, bulk timpang, impor rapuh nama).

Tanpa perubahan skema DB. Kalkulasi preseden tetap (`grade-calc.ts`):
nilai langsung (L1) menang atas agregasi sub (L2); NA dihitung ulang hanya bila
bobot terdaftar `===100`. Validasi bobot tetap strict `===100` (toleransi epsilon
menjadi follow-up terpisah, belum disetujui). PDF DNU ditunda dari PR ini.

## 2. Keputusan Desain

- **D1. Export client-side dulu.** `GET /yudisium/kelas/:id/nilai` + `komponen` + `sub-komponen` sudah mengembalikan seluruh L0+L1+L2 satu kelas → cukup untuk workbook via `exportToExcelMultipleSheets`. Endpoint backend (`GET /yudisium/kelas/:id/export`) hanya follow-up bila butuh arsip otoritatif / kelas >500 mhs.
- **D2. Redesign bertahap, tanpa ubah API/kontrak simpan.** Urutan: sticky action bar + rekap pra-simpan → mode fokus-satu-komponen + input 44px → bulk M3 + template terisi + pemetaan kolom impor.
- **D3. NA di export = NA tersimpan**, bukan live preview. Kolom `Status` + `Sisa Kosong` sebagai penanda kelengkapan. Live preview hanya di layar (panel rekap).
- **D4. Skala envelope ditampilkan di panel definisi** (`0-10` vs `0-100`) agar dosen tahu rentang valid.
- **D5. Bobot tetap strict `===100`.** Follow-up terpisah bila disetujui.
- **D6. PDF DNU ditunda.** PR ini hanya XLSX multi-sheet + CSV + Template Terisi.

## 3. Pain Points UX + Redesign Terstruktur

| # | Pain point | Usulan | Prioritas |
|---|---|---|---|
| P1 | Tabel raksasa satu layar: N kolom komponen, M3 = N sub input vertikal, scroll ganda, header tidak sticky, kolom Mahasiswa tidak frozen | Mode **fokus-satu-komponen** (S-C): tab/dropdown komponen aktif, tabel `☑ | Mahasiswa (frozen) | Nilai fokus | Status`, kolom NA frozen kanan; M3 tampilkan sub sebagai baris kartu per-mahasiswa (bukan kolom bersarang) | Tinggi |
| P2 | Input mikro `w-14/w-16/w-20 text-xs/11px`, label sub truncate, target tap di bawah 44px | Input tinggi 44px font 17px `rounded-lg 18px`, border hairline + fokus `#0071e3`, sel invalid ring rose + pesan (S-D) | Tinggi |
| P3 | Draft tertimpa refetch | Dirty-guard: `refetch` pasca-simpan tidak menimpa draft belum-simpan; badge `Belum disimpan (N)`; konfirmasi ganti kelas/metode bila dirty (S-E) | Tinggi |
| P4 | Tanpa rekap pra-simpan | Panel per-mahasiswa (NA live vs tersimpan + delta), per-komponen (rata-rata, % terisi, min/max), daftar sel kosong/invalid (S-B) | Tinggi |
| P5 | Tanpa export sama sekali | Tombol `Export XLSX` + `Export CSV` + `Unduh Template Terisi` (§5.1) | Tinggi |
| P6 | Bulk timpang: M3 tidak ada bulk | Bulk-fill per sub terpilih, isi-kosong-saja (S-F) | Sedang |
| P7 | Impor rapuh nama | Pemetaan kolom manual (dropdown CSV→target) + pratinjau 5 baris + unduh error per baris (S-G) | Sedang |
| P8 | Sticky action bar: tombol Simpan harus scroll ke atas | Sticky bar bawah: ringkasan kiri + aksi kanan (S-A) | Tinggi |
| P9 | Tombol `Simpan Terpilih (N)` tanpa ringkasan status | Rekap: `Terisi X/Y • Σ bobot=100% • envelope 0-100` (S-B) | Sedang |
| P10 | Bulk hanya satu komponen per aksi | Samakan semantik M1/M2/M3; bulk M3 iterasi sub terpilih (S-F) | Sedang |

## 4. Target File

### Modify
1. **`apps/frontend/src/routes/InputNilai.tsx`** — ekstensif: tombol Export XLSX/CSV/Template, sticky action bar, rekap pra-simpan, mode fokus-satu-komponen, input 44px + ring invalid, dirty-guard draft, bulk M3, pemetaan kolom impor, badge envelope.
2. **`apps/frontend/src/controllers/khsController.ts`** — opsional: ekstrak builder workbook ke sini bila logika terlalu panjang di page (tiru `KompensasiManual` pattern: data fetching tetap di page, export cols didefinisikan di page).
3. **`apps/frontend/src/components/SubKomponenEditor.tsx`** — referensi pola `dirty`/`syncedSignature` untuk guard draft halaman; minim ubah.
4. **`apps/frontend/src/utils/export.ts`** — tidak diubah (helper sudah cukup; `exportToExcel`, `exportToExcelMultipleSheets`, `exportToCSV` dipakai langsung).

### Tidak diubah
Backend (`yudisium.*`, `grade-calc.ts`, `schema.ts`), migrasi DB, `Table.tsx`, `WorkspaceContext`, kontrak save M1/M2/M3, `konversiRules` flow.

## 5. Rincian Perubahan

### 5.1 Export (client-side, 3 format)

**Sumber data:** `getNilaiMahasiswa(kelasId)` → L0 + L1 + L2 per mahasiswa;
`getKomponen(kelasId)` → daftar komponen + bobot;
`getSubKomponen(kelasId)` → daftar sub per komponen + bobot.

Pola tiruan: `KompensasiManual.tsx:227-258` / `LaporanKompensasi.tsx:154-186` — fetch penuh (`getNilaiMahasiswa` sudah return full kelas), definisi `ExportColumn[]`, panggil helper.

#### Export XLSX (multi-sheet)

Sheet 1 **Ringkasan**:
```
NIM | Nama | [Komponen A (30%) | Komponen B (40%) | ... ] | Nilai Akhir | Huruf | Indeks | Status | Sisa Kosong
```
- Kolom komponen dinamis, berisi NA dari level L1 (`nilaiKomponen[].nilai`) atau
  aggregated dari L2 bila tidak ada override L1.
- `Nilai Akhir` = `nilaiAngka` (L0, NA tersimpan).
- `Huruf/Indeks` dari `nilaiHuruf`/`nilaiIndeks`.
- `Status` = `isComplete ? 'Lengkap' : 'Belum Lengkap'` (per krs).
- `Sisa Kosong` = jumlah sel kosong per baris (informasi, bukan validasi).

Sheet 2 **Detail Sub-Komponen**:
```
NIM | Nama | Komponen | Bobot Komponen | Sub-Komponen | Bobot Sub | Nilai | Agregat Komponen | Sumber
```
- `Agregat Komponen` = hasil `computeKomponenScore` (atau L1 override bila ada).
- `Sumber` = `'L1'` bila ada `nilaiKomponen`, `'L2-agregated'` bila dari sub.

Sheet 3 **Definisi + Meta**:
```
Komponen | Bobot% | Sub-Komponen | Bobot Sub% | envelope | kelas | periode | prodi | total_mahasiswa | locked_by | exported_at
```

**Filename:** `Nilai_{kodeMK}_{namaKelas}_{periode}.xlsx`

#### Export CSV
Format sama Sheet 1 Ringkasan, single file dengan BOM `\uFEFF`.

#### Unduh Template Terisi
Header kompatibel 1:1 dengan `handleImportNilais` (`importTemplateHeaders:843-857`):
nama komponen/sub aktual sebagai header kolom; baris berisi NIM + nilai tersimpan
(agregasi L2 atau L1 override); `Σ` dan `NA` sebagai kolom terakhir (read-only).
Tujuan: dosen mengunduh, mengedit offline, mengimpor ulang via `ImportCsvModal`.

#### Implementasi

```
const handleExportXLSX = async () => {
  setIsExporting(true);
  try {
    const data = await khsController.getNilaiMahasiswa(kelasId);
    const comps = components();          // dari getKomponen
    const subs = subComponents();        // dari getSubKomponen
    const konv = konversiRules();

    // Sheet 1
    const ringkasan = data.map(d => {
      const row = { nim: d.nim, nama: d.nama, ... };
      for (const c of comps) {
        const l1 = d.nilaiKomponen?.find(n => n.komponenNilaiId === c.id)?.nilai;
        const subGrades = new Map((d.nilaiSub ?? []).filter(...).map(...));
        const subDefs = subs.filter(s => s.komponenNilaiId === c.id);
        row[c.nama] = l1 ?? (subDefs.length > 0 ? computeKomponenScore(subGrades, subDefs).score : null) ?? '-';
      }
      row['Nilai Akhir'] = d.nilaiAngka ?? '-';
      row['Huruf'] = d.nilaiHuruf ?? '-';
      row['Status'] = d.nilaiAngka !== null ? 'Lengkap' : 'Belum';
      return row;
    });

    // Sheet 2, Sheet 3 similarly
    exportToExcelMultipleSheets([...], filename);
  } finally { setIsExporting(false); }
};
```

### 5.2 Sticky Action Bar (S-A)

Di bawah layar (`fixed bottom-0 z-40`), dua kolom:
- **Kiri:** ringkasan live — `Terisi X/Y sel • Σ bobot = 100% • envelope 0-100 • {locked ? '🔒 Terkunci' : '🔓 Terbuka'}`.
- **Kanan:** tombol aksi — `Simpan Terpilih ({selectedCount})` (primer pill) + `Export XLSX` (ghost) + `Export CSV` (ghost) + `Unduh Template` (ghost).
- Tombol `Kunci` tetap di panel kiri (posisi atas, tidak di sticky bar).
- `show` hanya bila `selectedKelasId()` terisi; `hidden print:hidden` agar tidak ikut export/cetak.

### 5.3 Rekap Pra-Simpan (S-B)

Panel di bawah komposisi bobot (kiri grid), expandable:
- **Per-mahasiswa:** tabel ringkas `NIM | Nama | NA Live | NA Tersimpan | Delta | Status | Sisa Kosong`, di-sort by `Delta` desc default (perbaikan terbanyak di atas). Klik baris → scroll ke baris di tabel utama.
- **Per-komponen:** kartu mini `Komponen A: 85.00 | Terisi 28/30 | Min 45 | Max 98`.
- **Ringkasan global:** `Total: 30 mhs • Kelengkapan: 28/30 (93%) • Belum simpan: 5 sel`.
- Live update via `createMemo` berbasis `inputGrades`/`inputSubGrades`/`inputAkhir` + `studentsGrades`.

### 5.4 Mode Fokus-Satu-Komponen (S-C)

**Di atas tabel**, bar switcher pill + dropdown komponen:

```
[ Semua Komponen | Komponen A (30%) | Komponen B (40%) | ... ]  envelope: 0-100
```

- `Semua Komponen` = tampil tabel penuh seperti sekarang (backward-compatible, tetap dipertahankan sebagai fallback).
- Pilih komponen spesifik → tabel mengecil:
  - Kolom: `☑ | Mahasiswa (avatar + NIM + Nama, frozen) | Nilai {nama} (44px input) | Status`.
  - Untuk M3 (sub aktif): dropdown `Sub` di atas kolom nilai → nilainya `Sub A (30%) | Sub B (70%)`; input sesuai sub aktif; `Agregat` tetap terlihat.
  - Kolom `NA` frozen di kanan (selalu terlihat meski scroll horizontal).
- Tombol `Simpan` tetap (bulk atau per-baris, tidak berubah).
- Tabel `overflow-x-auto` tidak diperlukan lagi pada mode fokus (kolom menyusut).

### 5.5 Input 44px + Validasi Visual (S-D)

- Input: `h-11 px-3 py-2 text-base rounded-lg border border-secondary-200 dark:border-secondary-700 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20` (44px height, 17px text).
- Sel `text-center` untuk numeric; `w-20` (120px) cukup untuk 3 digit + desimal.
- Sel invalid (di luar `0-100` / envelope): `ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/30` + tooltip/pes kecil `12px text-rose-600`.
- Agregat `Σ` sub naik ke `text-xs font-medium` (bukan 9px); badge `L1`/`L2` sebagai penanda sumber.
- Tombol `Simpan`: `active:scale-95` tetap; loading state pada tombol saat submit.

### 5.6 Dirty-Guard Draft (S-E)

Pola dari `SubKomponenEditor.tsx:17-46`:
- `dirty = false` awal; set `dirty = true` saat `setInput*()` dipanggil dari user input (bukan dari sync server).
- Sebelum `setInput*()` dari effect sync server: skip bila `dirty === true`.
- Reset `dirty = false` setelah `refetchStudentsGrades` berhasil.
- Badge di sticky bar: `Belum disimpan (N sel)` berdasarkan jumlah `dirty` keys.
- Saat ganti kelas/mode/periode: `if (dirty()) confirm('...')` sebelum proceed.
- Defer: karena kedua `createSignal` tetap, implementation memerlukan `Set<string>` terpisah untuk track `dirtyKeys` per metode.

### 5.7 Bulk M3 (S-F)

- Tombol `Bulk Isi Sub` (hanya bila `activeMethod === 'sub'`).
- Pilih target sub (dropdown dari `subComponents`), input nilai, target: mahasiswa ter-checkbox **yang sel sub-nya masih kosong**.
- Pola sama `handleBulkFill` M1/M2: `isSubCellEmpty(key)`, lapor `Terisi X, dilewati Y`.
- Validasi `0-100` + envelope.

### 5.8 Pemetaan Kolom Impor (S-G)

Di `ImportCsvModal` atau step baru sebelum impor:
- Tampilkan kolom CSV yang terdeteksi + dropdown mapping ke komponen/sub target.
- Pratinjau 5 baris pertama + validasi per baris (duplikat NIM, non-numerik, out-of-range).
- Daftar error per baris bisa diunduh sebagai CSV terpisah (`exportToCSV`).
- Pertahankan `templateHeaders` sebagai default auto-match bila nama identik.

## 6. Pengujian

- **Targeted backend** (DB test `localhost:5433`, larang blanket root):
  `bun test apps/backend/src/__tests__/nilai-export.test.ts` — matriks L2→L1→L0, preseden override L1 atas L2, `isComplete` vs bobot ≠100, huruf via rules + fallback, envelope 0-10 vs 0-100, uniqueness constraint `(krsId, komponenNilaiId)`.
- **Regresi wajib:** `bun test apps/backend/src/__tests__/nilai-akhir.test.ts nilai-envelope.test.ts sub-komponen.test.ts nilai-overwrite.test.ts nilai-hierarchy-preserve.test.ts`.
- **Frontend:** `bun run lint`, `bunx biome ci .`, `cd apps/frontend && bunx tsc --noEmit`.
- **QA manual:** sticky bar muncul, rekap akurat, mode fokus komponen berpindah, input 44px, dark mode kontras, 375px scrollable, export XLSX dibuka di Excel tanpa error, template terisi → impor round-trip, dirty-guard mempertahankan draft.

## 7. Risiko

| Risiko | Mitigasi |
|---|---|
| Kelas besar → workbook sheet 2 (L2) sangat lebar | Batasi export per kelas terpilih; follow-up endpoint backend bila >500 mhs |
| NA live vs tersimpan membingungkan arsip | Export hanya pakai NA tersimpan (bukan live) + kolom Status |
| Mirror kalkulasi FE/BE divergen | Export memakai fungsi preview eksisting; tidak ada logika kalkulasi baru |
| Mode fokus-satu-komponen menambah kompleksitas state | Pertahankan `activeMethod` sebagai prioritas render; `Semua Komponen` = backward-compatible fallback |
| Bulk M3 menambah iteration loop | Iterasi `subComponents` per komponen; bulk hanya isi kosong (non-destruktif) |

## 8. Langkah Eksekusi

1. **S0 baseline:** `bun run lint`, `tsc` BE (`tsconfig.ci.json`) + FE, test regresi nilai (5 file).
2. **S1 export XLSX multi-sheet + CSV** (tiru `KompensasiManual/LaporanKompensasi`); `isExporting` state + toast.
3. **S2 Unduh Template Terisi** (kompatibel 1:1 `handleImportNilais`); round-trip verify.
4. **S3 sticky action bar** (fixed bottom, ringkasan + aksi); `show` bila kelas terpilih.
5. **S4 rekap pra-simpan** (per-mahasiswa delta, per-komponen stat, ringkasan global).
6. **S5 mode fokus-satu-komponen** (dropdown komponen, tabel 4 kolom, NA frozen kanan).
7. **S6 input 44px + validasi visual** (ring rose + pesan, envelope badge, label sub).
8. **S7 dirty-guard draft** + bulk M3 + pemetaan kolom impor.
9. **S8 verifikasi penuh** (lint + biome ci + tsc ×2 + test regresi + QA manual + export round-trip).
10. **S9 PR staging-first** ke `development`.

## 9. Kriteria Selesai

- [ ] Satu klik mengunduh XLSX (3 sheets: ringkasan + sub-komponen + definisi), CSV, dan Template yang bisa diimpor ulang.
- [ ] Dosen mengisi puluhan baris tanpa scroll-ganda tersesat; input ≥44px terbaca; draft tak hilang saat refetch; rekap pra-simpan akurat.
- [ ] `lint` + `biome ci` + kedua `tsc` hijau; test baru + regresi nilai hijau; tanpa migrasi; PR ke `development`.

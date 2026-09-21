# CODEBASE_CONTEXT.md — SIMAK Vokasi Architectural & Knowledge Base

---

## 1. Executive Summary

**SIMAK Vokasi** (Sistem Informasi Akademik Politeknik Sorowako / Pendidikan Vokasi) adalah platform manajemen akademik berbasis web yang dirancang khusus untuk kebutuhan perguruan tinggi vokasi. 

Sistem ini mencakup siklus akademik end-to-end:
- **Penerimaan Mahasiswa Baru (Admisi & Seleksi)**
- **Struktur Kurikulum & Outcome-Based Education (OBE)** (Visi Misi, Profil Lulusan, CPL, CPMK, Sub-CPMK, Bahan Kajian, RPS, Copy RPS Lintas Prodi)
- **Registrasi & Kartu Rencana Studi (KRS)** (termasuk toggle proteksi tunggakan)
- **Manajemen Kelas & Rombel Praktikum** (termasuk Self-Enrollment via QR/Link)
- **Jurnal Perkuliahan (BAP) & Presensi** (Teori & Praktikum dengan verifikasi presensi unknown dan self-healing)
- **Sistem Kedisiplinan, Apel & Kompensasi** (Pelanggaran, Apel Lintas Prodi dengan autosave, Hitungan Denda/Poin Menit Alpa dengan Cap 480 Menit/Hari)
- **Bimbingan Akademik & Konseling** (Diskusi dua arah dosen wali-mahasiswa & lampiran berkas)
- **Penilaian & Kartu Hasil Studi (KHS)** (Multi-metode input M1/M2/M3 & envelope konversi nilai dinamis)
- **Keuangan & Tagihan** (Skema tarif, tagihan UKT/SPP, riwayat pembayaran)
- **Pengajuan Cuti Akademik & Yudisium/Kelulusan**
- **Evaluasi Sistem & Feedback Pengguna**
- **Audit Log & Riwayat Aktivitas Sistem**
- **Integrasi PDDIKTI Neo Feeder**

---

## 2. Tech Stack Overview

| Layer | Teknologi / Pustaka | Keterangan & Versi |
| :--- | :--- | :--- |
| **Runtime & Monorepo** | **Bun** | Runtime JavaScript/TypeScript super cepat & paket manager monorepo (`apps/*`). |
| **Backend Framework** | **ElysiaJS v1.0.0** | Web framework berbasis Bun yang sangat cepat dan terintegrasi type-safety. |
| **Backend ORM & DB** | **Drizzle ORM v0.45.x** + **PostgreSQL** (`pg` v8.11) | Object-Relational Mapping dengan performa tinggi dan skema terdefinisi di TypeScript. |
| **Frontend Framework** | **SolidJS v1.8.x** | Reactive UI framework fine-grained tanpa Virtual DOM. |
| **Build Tool (Frontend)** | **Vite v5.0.x** | Bundler frontend ultra-cepat dengan HMR. |
| **State & Data Fetching** | **Solid Query v5.40.x** (`@tanstack/solid-query`) | Asynchronous state management & caching. |
| **API Contract & Type Safety** | **Elysia Eden Treaty v1.4.3** (`@elysiajs/eden`) | End-to-end type safety antara backend ElysiaJS dan frontend SolidJS. |
| **Styling** | **TailwindCSS v3.4.x** + **Vanilla CSS** | System styling berbasis utility class dan custom design tokens (Apple-inspired). |
| **Code Formatting & Linting** | **Biome v2.5.2** | Linting & formatting terpadu cepat menggantikan ESLint & Prettier. |
| **Testing** | **Bun Test** (Backend), **Playwright v1.61.x** (Frontend E2E) | Unit/integration testing backend & E2E testing frontend. |
| **Email** | **Resend** (`resend` v6.16.0) | Pengiriman email transaksional (aktivasi akun, reset password) dengan sender kampus terverifikasi. |
| **Export & Visualisasi** | **Chart.js**, **jsPDF + AutoTable**, **XLSX**, **QRCode** | Visualisasi grafik, ekspor PDF/Excel, dan pembuatan QR Code. |

---

## 3. Directory Structure Map

```
simakjs/
├── apps/
│   ├── backend/                     # App Backend (ElysiaJS + Drizzle)
│   │   ├── src/
│   │   │   ├── app.ts               # Inisialisasi Elysia app, plugin, CORS, & Swagger
│   │   │   ├── index.ts             # Entry point runner Bun
│   │   │   ├── controllers/         # Handler HTTP request (53 file controller)
│   │   │   ├── services/            # Logika bisnis & query Drizzle (55 file service)
│   │   │   ├── routes/              # Definisi endpoint Elysia (54 file route)
│   │   │   ├── models/
│   │   │   │   └── schema.ts        # Skema Drizzle ORM (tabel, enum, relasi DB)
│   │   │   ├── middlewares/         # Auth & context middlewares
│   │   │   ├── plugins/             # Plugin custom (Audit Log otomatis, JWT)
│   │   │   ├── schemas/             # TypeBox schema validation
│   │   │   ├── utils/               # Timezone, DB connection, role utils, dosen-scope, grade-calc, email helper
│   │   │   ├── scripts/             # Script DB migration, seed, backup, & safe-migrate
│   │   │   └── __tests__/           # Test suite backend
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                    # App Frontend (SolidJS + Vite)
│       ├── src/
│       │   ├── index.tsx            # Entry point mount SolidJS
│       │   ├── App.tsx              # Router utama & provider wrapper
│       │   ├── index.css            # Custom CSS tokens & utilities
│       │   ├── components/          # Komponen UI (Layout, Sidebar, Modal, UI primitives, Pagination)
│       │   ├── controllers/         # Signal/resource wrappers memanggil Eden API (45 file)
│       │   ├── routes/              # Halaman UI / Views per fitur
│       │   ├── contexts/            # Reactivity contexts (Auth, Theme, Toast, Workspace)
│       │   ├── hooks/               # Custom hooks SolidJS (e.g. usePagination)
│       │   └── utils/               # Client Eden Treaty (`eden.ts`), export, format
│       ├── package.json
│       ├── vite.config.ts
│       └── tailwind.config.js
│
├── docs/                            # Dokumentasi proyek & panduan deployment
├── scripts/                         # Script pembantu monorepo & versioning
├── AGENTS.md                        # Aturan standar AI Agent (MANDATORY)
├── DESIGN.md                        # Pedoman Sistem Desain UI (Apple-inspired)
├── CODEBASE_CONTEXT.md              # Peta pengetahuan arsitektur proyek ini
├── biome.json                       # Konfigurasi linter & formatter Biome
├── docker-compose.yml               # Konfigurasi containerized database Postgres
├── package.json                     # Monorepo root package.json
└── deploy.sh                        # Script otomatisasi deployment
```

---

## 4. Data Model & Schema Summary

Seluruh entitas database dikelola melalui Drizzle ORM pada file [schema.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/backend/src/models/schema.ts).

### Modul Entitas Utama:

1. **Pengguna, Hak Akses, Parameter & Audit:**
   - `users`: Data kredensial pengguna (email, password hash bcrypt, status aktif).
   - `userRoles`: Pemetaan role pengguna dengan enum `user_role` (`super_admin`, `admin`, `kaprodi`, `prodi`, `dosen`, `plp`, `instruktur`, `mahasiswa`, `keuangan`, `guest`, `calon_mahasiswa`).
   - `systemSettings`: Parameter dinamis sistem (`system_settings`) seperti timezone `APP_TIMEZONE`, toggle blocking KRS/KHS, skala nilai max, toleransi kompensasi.
   - `auditLogs`: Pencatatan otomatis audit riwayat aktivitas dan mutasi data sistem.
   - `passwordResets`: Token reset kata sandi pengguna.

2. **Struktur Akademik & Data Master:**
   - `programStudi`: Data Program Studi dan jenjang pendidikan.
   - `periodeAkademik`: Semester/Tahun Ajaran aktif dan historis.
   - `dosen`: Data master dosen (NIDN, NIP, nama, prodi, status).
   - `mahasiswa`: Data master mahasiswa (NIM, nama, prodi, angkatan, status akademik).
   - `mahasiswaKeluar`: Catatan mahasiswa drop-out/lulus/pindah.

3. **Kurikulum & Outcome-Based Education (OBE):**
   - `kurikulum`, `kurikulumMataKuliah`, `angkatanKurikulum`: Kurikulum dan pemetaannya per angkatan.
   - `mataKuliah`: Data mata kuliah (kode, nama, SKS teori/praktik).
   - `profilLulusan`, `cpl`, `cplProfilLulusan`: Capaian Pembelajaran Lulusan & Profil Lulusan.
   - `cpmk`, `subCpmk`, `cpmkCpl`: Capaian Pembelajaran Mata Kuliah dan relasinya ke CPL.
   - `bahanKajian`, `bahanKajianCpl`, `mataKuliahBahanKajian`: Bahan kajian kurikulum.
   - `visiMisiProdi`: Visi dan misi tiap program studi.
   - `rps`, `rpsTopik`, `rencanaEvaluasi`, `rencanaEvaluasiSubCpmk`: Rencana Pembelajaran Semester.

4. **Perkuliahan & Rombel Praktikum:**
   - `kelasKuliah`: Kelas perkuliahan induk per periode.
   - `dosenPengajarKelas`: Penugasan tim dosen pengajar kelas.
   - `krs`: Kartu Rencana Studi mahasiswa (status: `draft`, `submitted`, `approved`, `rejected`).
   - `rombelPraktikum`, `rombelPraktikumMahasiswa`, `rombelDosenPengajar`: Kelompok praktikum kecil di bawah kelas induk.
   - `rombelEnrollmentLog`: Log pendaftaran praktikum via QR Code / Link.

5. **Jurnal BAP & Presensi:**
   - `bap`: Buku Catatan Pelaksanaan Perkuliahan (materi, dosen hadir, jam).
   - `presensi`: Kehadiran mahasiswa teori (status: `H`, `I`, `S`, `A`, `T`, `?`).
   - `bapPraktikum`, `presensiPraktikum`: BAP dan Presensi khusus kelompok praktikum yang disinkronkan ke kelas induk.

6. **Kedisiplinan, Apel, Ketidakhadiran & Kompensasi:**
   - `kelompokApel`, `kelompokApelAnggota`, `sesiApel`, `presensiApel`: Pengelolaan kehadiran kegiatan Apel (fleksibel lintas prodi & autosave).
   - `ketidakhadiran`: Tabel agregat sentral ketidakhadiran mahasiswa lintas sumber (`BAP`, `APEL`, `MANUAL`, `PRAKTIKUM`) dengan fitur verifikasi unknown presensi & self-healing.
   - `pasalPelanggaran`, `pelanggaran`: Catatan poin pelanggaran mahasiswa (hard-delete independen oleh admin & prodi).
   - `kompensasiBayar`: Catatan pembayaran/pelunasan menit kompensasi alpa.
   - `kompensasiManual`: Penambahan/pengurangan poin kompensasi manual.

7. **Bimbingan Akademik & Konseling:**
   - `kategoriBimbingan`, `bimbingan`, `bimbinganThread`, `sesiBimbingan`, `sesiBimbinganBalasan`, `bimbinganAttachments`: Diskusi, balasan dua arah, dan lampiran berkas bimbingan dosen wali.

8. **Penilaian, Keuangan, Yudisium & Feedback:**
   - `komponenNilai`, `nilaiKomponenMahasiswa`, `nilaiPraktik`: Komponen bobot & nilai multi-metode (M1, M2, M3).
   - `konversiNilai`, `skalaPredikatKelulusan`: Aturan skala konversi huruf mutu, indeks, & predikat kelulusan.
   - `pengajuanYudisium`: Pengajuan kelulusan mahasiswa.
   - `gelombangAdmisi`, `pendaftar`, `dokumenPendaftar`, `seleksiPendaftar`, `pembayaranAdmisi`: Modul Admisi.
   - `tagihan`, `transaksiPembayaran`, `skemaTarif`: Modul Keuangan & Pembayaran UKT/SPP.
   - `pengajuanCuti`: Pengajuan izin cuti akademik mahasiswa.
   - `systemFeedbacks`: Umpan balik dan evaluasi pengguna terhadap kinerja sistem (`/evaluasi-sistem`).

---

## 5. Core Business Logic Reference

### A. Standarisasi Timezone (Asia/Makassar / WITA UTC+8)
- Seluruh logika waktu dan tanggal sistem beroperasi secara standar pada zona waktu **Asia/Makassar (WITA, UTC+8)**.
- Dikelola melalui helper terpusat `apps/backend/src/utils/timezone.ts` (`getNowDateString()`, `getNowTimeString()`, `formatDateTimeInTimezone()`, `getAppTimezone()`) dan `SystemParameterService`.
- Backend memastikan tanggal dan jam tetap konsisten terhadap perbatasan pergantian hari UTC (misal UTC 23:30 = jam 07:30 WITA hari berikutnya).

### B. Kalkulasi Poin Kompensasi & Batas Harian (Cap 480 Menit)
- Ketidakhadiran (Alpa/Mangkir) dan Izin/Sakit/Terlambat dihitung dalam durasi menit.
- **Pengali (Multiplier)**: Poin dikalkulasi menggunakan nilai konfigurasional sistem (`pengaliMangkir` = 2x, `pengaliIzinSakit` = 1x).
- **Batas Maksimal Harian (Daily Cap Limit)**: Total durasi mentah akumulasi perkuliahan per mahasiswa per hari dibatasi maksimal **480 menit (8 jam)** via parameter `DURASI_HARIAN_MENIT`. Jika total mentah melebihi 480 menit, poin dihitung secara proporsional berpatokan pada batas 480 menit.
- **Sisa Kompensasi**: `sisaKompensasi` = `totalKompensasi` (Presensi + Apel + Pelanggaran + Manual) - `totalDibayar` (`kompensasiBayar`).

### C. Multi-Metode Penilaian & Envelope Aturan Konversi Nilai
- **Metode Penilaian Non-Destruktif**:
  - **M1**: Nilai Akhir Langsung.
  - **M2**: Nilai per Komponen (diturunkan dari bobot komponen).
  - **M3**: Nilai per Sub-Komponen (diturunkan dari sub-kriteria evaluasi).
- **Envelope Rentang Nilai Dinamis**:
  - Validasi rentang nilai input (`0-100` atau `0.00-10.00`) mengikuti envelope aturan konversi nilai global yang dikonfigurasi pada `/khs` (`resolveNilaiEnvelope()` di `apps/backend/src/utils/grade-calc.ts`).

### D. Rombel Praktikum & Rekapitulasi ke Kelas Induk
- Kelas mata kuliah praktikum dapat dipecah menjadi kelompok praktikum (`rombelPraktikum`).
- Dosen/Instruktur dapat mengisi `bapPraktikum` dan `presensiPraktikum` untuk masing-masing kelompok.
- Metode `syncPresensiPraktikumToKelas` merakapitulasi kehadiran dari seluruh rombel praktikum ke BAP & Presensi `kelasKuliah` induk.

### E. Multi-Role Access Control (RBAC) & Scoping
- **Single-Role Restriction**: Role `super_admin`, `mahasiswa`, `guest`, dan `calon_mahasiswa` bersifat eksklusif (tidak bisa digabung dengan role lain).
- **Multi-Role Allowed**: User staf seperti `admin`, `kaprodi`, `prodi`, `dosen`, `keuangan`, `plp`, `instruktur` dapat memiliki kombinasi beberapa role sekaligus.
- **Prodi Scoping**: Pengguna non-admin dibatasi akses data berdasarkan `programStudiId` yang ditautkan.
- **Dosen Scoping (`dosen-scope.ts`)**: Method `guardMkScope`, `guardKelasScope`, dan `guardRombelScope` memastikan dosen/instruktur hanya dapat mengelola MK, kelas, dan rombel yang benar-benar mereka ampu.

### F. Audit Logging Otomatis (`audit.plugin.ts`)
- Plugin audit global secara otomatis mengintersep dan mencatat setiap operasi mutasi (`POST`, `PUT`, `PATCH`, `DELETE`) ke tabel `audit_logs`.
- Mencatat `userId`, `actionType`, `tableName`, `recordId`, dan payload detail sebelum/sesudah mutasi tanpa perlu instrumentasi manual di setiap controller.

### G. Self-Healing Verifikasi Presensi Unknown
- Jika baris ketidakhadiran berstatus *orphan* (hilang karena inkonsistensi historis tetapi catatan sumber presensi BAP masih ada), sistem verifikasi secara otomatis merekonstruksi baris ketidakhadiran sebelum menerapkan anulir/penyesuaian durasi.

### H. Penanganan Tanggal (Eden Date Handling)
- **Kolom `date()` (Calendar Date, misal `tanggal`, `tanggalLahir`)**: Menggunakan Drizzle `date('col', { mode: 'string' })` dan schema Eden `t.String()`. String di-pass murni dalam format `'YYYY-MM-DD'` tanpa konversi timezone atau `new Date().toISOString()` untuk mencegah bugs selisih hari.
- **Kolom `timestamp()` (misal `createdAt`, `updatedAt`)**: Menggunakan schema Eden `t.Date()`.

### I. Pengiriman Email (Resend) & Sender `EMAIL_FROM`
- Seluruh email transaksional (aktivasi akun, reset password) dikirim via **Resend** (`resend` v6.16.0) dengan sender terpusat `getEmailFrom()` di `apps/backend/src/utils/email.ts`.
- Sender default `SIMAK <postman@politekniksorowako.ac.id>` (domain kampus terverifikasi di dashboard Resend); dapat di-override via env `EMAIL_FROM`. Wajib diset eksplisit di setiap env deploy (staging/prod). DILARANG hardcode `from` pada pemanggilan email.

---

## 6. API & Route Patterns

### Backend Endpoint Definition (ElysiaJS)
Endpoint backend didefinisikan secara modular di `apps/backend/src/routes/` dan dipasang pada instance Elysia di `apps/backend/src/app.ts`.

Contoh struktur Route + Controller:
```ts
// routes/mahasiswa.routes.ts
import { Elysia } from 'elysia';
import { MahasiswaController } from '../controllers/mahasiswa.controller';

export const mahasiswaRoutes = new Elysia({ prefix: '/mahasiswa' })
  .get('/', MahasiswaController.getAll)
  .post('/', MahasiswaController.create);
```

### Type-Safe Frontend API Client (Eden Treaty)
Frontend memanggil API secara type-safe melalui instance Eden pada [eden.ts](file:///home/nasrulhamid/app-projects/simakjs/apps/frontend/src/utils/eden.ts):

```ts
import { eden, unwrap } from '@/utils/eden';

// Pemanggilan endpoint type-safe dengan unwrap error handling
const data = await unwrap(eden.api.mahasiswa.get({ query: { page: 1 } }));
```

Kredensial JWT otomatis disisipkan di header `Authorization: Bearer <token>` melalui fetcher di `eden.ts`.

---

## 7. Developer Conventions & Rules for AI Agents

Setiap AI Agent yang bekerja pada repositori ini **WAJIB** mematuhi aturan berikut (sesuai `AGENTS.md`):

1. **Strict Type-Safety**:
   - Mandatory `"strict": true`.
   - Dilarang keras menggunakan tipe `any` pada kode baru (`noExplicitAny` diset `"error"` di `biome.json`). Gunakan `unknown`, `SafeAny` (`Record<string, unknown>`), atau interface spesifik.
   - Pengecualian `any` hanya diizinkan pada return type Elysia `Promise<any>` & `AuthContext<any>` dengan komentar `// biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement`.

2. **Pola Backend**:
   - Controller menggunakan static methods yang mendestrukturisasi `AuthContext`, memeriksa `getCurrentUser()`, dan dibungkus `try/catch`.
   - Service & DB layer menggunakan static methods Drizzle ORM dengan klausa `where` eksplisit (hindari unbounded queries).
   - Operasi impor CSV wajib diproses per baris (row-by-row) dengan error handling individu.

3. **Pola Frontend (SolidJS) & UI Design System**:
   - **Otoritas Desain `@DESIGN.md`**: Selalu merujuk ke `DESIGN.md` sebelum membuat/mengubah UI. Wajib mematuhi estetika Apple (SF Pro/Inter typography ladder, Action Blue interactive color `#0066cc`, pearl surfaces, pill/capsule buttons `rounded-full`, hairline dividers, scale micro-interactions `active:scale-95`).
   - Komponen mengekspor deklarasi fungsi standar sebagai `default` dibungkus `<MainLayout>`.
   - Menggunakan reaktivitas native SolidJS (`createSignal`, `createResource`, `createMemo`) bukan React hooks.
   - **Props Integrity**: Dilarang mendestrukturisasi `props` pada signature komponen SolidJS untuk menjaga tracking chain reaktivitas signal.

4. **Git & CI/CD Workflow**:
   - **Dilarang Direct Push**: Jangan pernah melakukan push langsung ke cabang `development` atau `main`.
   - **Pull Request (PR) — Staging-First**: Semua perubahan fitur/hotfix WAJIB dikirim via Pull Request menyasar cabang `development` (staging) terlebih dahulu. Merge ke `development` memicu staging deploy. Setelah verifikasi staging, promot ke produksi HANYA melalui PR lanjutan `development -> main`; `main` tidak menerima PR fitur/hotfix langsung.
   - **Sandbox Token Clean**: Selalu jalankan `env -u GITHUB_TOKEN git ...` sebelum operasi git remote.

5. **Pre-commit Verification & Testing Strategy**:
   Sebelum melakukan commit/push/PR, agen WAJIB memastikan seluruh cek berikut:
   ```bash
   # 1. Linting & Type-Safety (Cepat, < 2 detik)
   bun run lint
   cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json
   cd apps/frontend && bunx tsc --noEmit
   ```
   - **Testing Scoped**: Hindari menjalankan `bun test` blanket di root. Gunakan targeted test untuk modul terkait (e.g. `bun test apps/backend/src/tests/<modul>.test.ts` atau `bun test -t "<nama-fitur>"`).
   - **Backend DB Test**: Jika menguji integrasi DB backend secara lokal, pastikan PostgreSQL aktif lalu jalankan `cd apps/backend && bun run test`.
   - **Frontend Only**: Cukup lakukan linting dan `tsc --noEmit` frontend.

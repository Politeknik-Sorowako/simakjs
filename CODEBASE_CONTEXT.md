# CODEBASE_CONTEXT.md — SIMAK Vokasi Architectural & Knowledge Base

---

## 1. Executive Summary

**SIMAK Vokasi** (Sistem Informasi Akademik Politeknik Sorowako / Pendidikan Vokasi) adalah platform manajemen akademik berbasis web yang dirancang khusus untuk kebutuhan perguruan tinggi vokasi. 

Sistem ini mencakup siklus akademik end-to-end:
- **Penerimaan Mahasiswa Baru (Admisi & Seleksi)**
- **Struktur Kurikulum & Outcome-Based Education (OBE)** (Visi Misi, Profil Lulusan, CPL, CPMK, Sub-CPMK, Bahan Kajian, RPS)
- **Registrasi & Kartu Rencana Studi (KRS)**
- **Manajemen Kelas & Rombel Praktikum** (termasuk Self-Enrollment via QR/Link)
- **Jurnal Perkuliahan (BAP) & Presensi** (Teori & Praktikum)
- **Sistem Kedisiplinan & Kompensasi** (Pelanggaran, Apel, Hitungan Denda/Poin Menit Alpa dengan Cap 480 Menit/Hari)
- **Bimbingan Akademik & Konseling**
- **Penilaian & Kartu Hasil Studi (KHS)**
- **Keuangan & Tagihan**
- **Yudisium & Kelulusan**
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
| **Styling** | **TailwindCSS v3.4.x** + **Vanilla CSS** | System styling berbasis utility class dan custom design tokens. |
| **Code Formatting & Linting** | **Biome v2.5.2** | Linting & formatting terpadu cepat menggantikan ESLint & Prettier. |
| **Testing** | **Bun Test** (Backend), **Playwright v1.61.x** (Frontend E2E) | Unit/integration testing backend & E2E testing frontend. |
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
│   │   │   ├── plugins/             # Plugin custom (Audit Log, JWT)
│   │   │   ├── schemas/             # TypeBox schema validation
│   │   │   ├── utils/               # DB connection, role utils, dosen-scope
│   │   │   ├── scripts/             # Script DB migration, seed, backup, & safe-migrate
│   │   │   └── __tests__/           # Test suite backend
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                    # App Frontend (SolidJS + Vite)
│       ├── src/
│       │   ├── index.tsx            # Entry point mount Mount SolidJS
│       │   ├── App.tsx              # Router utama & provider wrapper
│       │   ├── index.css            # Custom CSS tokens & utilities
│       │   ├── components/          # Komponen UI (Layout, Sidebar, Modal, UI primitives)
│       │   ├── controllers/         # Signal/resource wrappers memanggil Eden API (45 file)
│       │   ├── routes/              # Halaman UI / Views per fitur
│       │   ├── contexts/            # Reactivity contexts (Auth, Theme, Toast, Workspace)
│       │   └── utils/               # Client Eden Treaty (`eden.ts`), export, format
│       ├── package.json
│       ├── vite.config.ts
│       └── tailwind.config.js
│
├── docs/                            # Dokumentasi proyek & panduan deployment
├── scripts/                         # Script pembantu monorepo & versioning
├── AGENTS.md                        # Aturan standar AI Agent (MANDATORY)
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

1. **Pengguna, Hak Akses & Keamanan:**
   - `users`: Data kredensial pengguna (email, password hash bcrypt, status aktif).
   - `userRoles`: Pemetaan role pengguna dengan enum `user_role` (`super_admin`, `admin`, `kaprodi`, `prodi`, `dosen`, `plp`, `instruktur`, `mahasiswa`, `keuangan`, `guest`, `calon_mahasiswa`).
   - `passwordResets`, `auditLogs`: Token reset kata sandi dan log audit aktivitas sistem.

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
   - `rombelPraktikum`, `rombelPraktikumMahasiswa`: Kelompok praktikum kecil di bawah kelas induk.
   - `rombelEnrollmentLog`: Log pendaftaran praktikum via QR Code / Link.

5. **Jurnal BAP & Presensi:**
   - `bap`: Buku Catatan Pelaksanaan Perkuliahan (materi, dosen hadir, jam).
   - `presensi`: Kehadiran mahasiswa teori (status: `H`, `I`, `S`, `A`, `T`).
   - `bapPraktikum`, `presensiPraktikum`: BAP dan Presensi khusus kelompok praktikum yang disinkronkan ke kelas induk.

6. **Kedisiplinan, Apel & Kompensasi:**
   - `kelompokApel`, `kelompokApelAnggota`, `sesiApel`, `presensiApel`: Pengelolaan kehadiran kegiatan Apel.
   - `pasalPelanggaran`, `pelanggaran`: Catatan poin pelanggaran mahasiswa.
   - `kompensasiBayar`: Catatan pembayaran/pelunasan menit kompensasi alpa.
   - `kompensasiManual`: Penambahan/pengurangan poin kompensasi manual.

7. **Bimbingan Akademik & Konseling:**
   - `kategoriBimbingan`, `bimbingan`, `bimbinganThread`, `sesiBimbingan`: Diskusi dan catatan bimbingan dosen wali.

8. **Penilaian, Keuangan & Yudisium:**
   - `komponenNilai`, `nilaiKomponenMahasiswa`, `nilaiPraktik`: Komponen bobot & nilai akhir.
   - `konversiNilai`, `skalaPredikatKelulusan`: Skala penentuan huruf mutu & predikat IPK.
   - `pengajuanYudisium`: Pengajuan kelulusan mahasiswa.
   - `gelombangAdmisi`, `pendaftar`, `dokumenPendaftar`, `seleksiPendaftar`, `pembayaranAdmisi`: Modul Admisi.
   - `tagihan`, `transaksiPembayaran`, `skemaTarif`: Modul Keuangan & Pembayaran UKT/SPP.
   - `pengajuanCuti`: Pengajuan izin cuti akademik.

---

## 5. Core Business Logic Reference

### A. Kalkulasi Poin Kompensasi & Batas Harian (Cap 480 Menit)
- Ketidakhadiran (Alpa/Mangkir) dan Izin/Sakit/Terlambat dihitung dalam durasi menit.
- **Pengali (Multiplier)**: Poin dikalkulasi menggunakan nilai konfigurasional sistem (`pengaliMangkir` = 2x, `pengaliIzinSakit` = 1x).
- **Batas Maksimal Harian (Daily Cap Limit)**: Total durasi mentah akumulasi perkuliahan per mahasiswa per hari dibatasi maksimal **480 menit (8 jam)** via parameter `DURASI_HARIAN_MENIT`. Jika total mentah melebihi 480 menit, poin dihitung secara proporsional berpatokan pada batas 480 menit.
- **Sisa Kompensasi**: `sisaKompensasi` = `totalKompensasi` (Presensi + Apel + Pelanggaran + Manual) - `totalDibayar` (`kompensasiBayar`).

### B. Rombel Praktikum & Rekapitulasi ke Kelas Induk
- Kelas mata kuliah praktikum dapat dipecah menjadi kelompok praktikum (`rombelPraktikum`).
- Dosen/Instruktur dapat mengisi `bapPraktikum` dan `presensiPraktikum` untuk masing-masing kelompok.
- Metode `syncPresensiPraktikumToKelas` merakapitulasi kehadiran dari seluruh rombel praktikum ke BAP & Presensi `kelasKuliah` induk.

### C. Multi-Role Access Control (RBAC) & Program Studi Scoping
- **Single-Role Restriction**: Role `super_admin`, `mahasiswa`, `guest`, dan `calon_mahasiswa` bersifat eksklusif (tidak bisa digabung dengan role lain).
- **Multi-Role Allowed**: User staf seperti `admin`, `kaprodi`, `prodi`, `dosen`, `keuangan`, `plp`, `instruktur` dapat memiliki kombinasi beberapa role sekaligus.
- **Prodi Scoping**: Pengguna non-admin dibatasi akses data berdasarkan `programStudiId` yang ditautkan.
- **Dosen Scoping (`dosen-scope.ts`)**: Method `guardMkScope`, `guardKelasScope`, dan `guardRombelScope` memastikan dosen/instruktur hanya dapat mengelola MK, kelas, dan rombel yang benar-benar mereka ampu.

### D. Penanganan Tanggal (Eden Date Handling)
- **Kolom `date()` (Calendar Date, misal `tanggal`, `tanggalLahir`)**: Menggunakan Drizzle `date('col', { mode: 'string' })` dan schema Eden `t.String()`. String di-pass murni dalam format `'YYYY-MM-DD'` tanpa konversi timezone atau `new Date().toISOString()` untuk mencegah bugs selisih hari.
- **Kolom `timestamp()` (misal `createdAt`, `updatedAt`)**: Menggunakan schema Eden `t.Date()`.

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
   - Service & DB layer menggunakan static methods Drizzle ORM dengan klausa `where` eksplisit.
   - Operasi impor CSV wajib diproses per baris (row-by-row) dengan error handling individu.

3. **Pola Frontend (SolidJS)**:
   - Komponen mengekspor deklarasi fungsi standar sebagai `default` dibungkus `<MainLayout>`.
   - Menggunakan reaktivitas native SolidJS (`createSignal`, `createResource`, `createMemo`) bukan React hooks.

4. **Git & CI/CD Workflow**:
   - **Dilarang Direct Push**: Jangan pernah melakukan push langsung ke cabang `development` atau `main`.
   - **Pull Request (PR)**: Semua perubahan wajib dikirim via Pull Request menyasar cabang `development` (staging) atau `main` (production).
   - **Sandbox Token Clean**: Selalu jalankan `env -u GITHUB_TOKEN git ...` sebelum operasi git remote.

5. **Pre-commit Verification Checklist**:
   Sebelum melakukan commit/push/PR, agen WAJIB memastikan seluruh cek berikut lulus tanpa error:
   ```bash
   bun run lint
   cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json
   cd apps/frontend && bunx tsc --noEmit
   ```

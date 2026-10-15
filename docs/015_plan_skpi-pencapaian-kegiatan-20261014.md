# PRD: Pengelolaan Pencapaian Kegiatan Mahasiswa untuk SKPI

- **Dokumen**: `docs/015_plan_skpi-pencapaian-kegiatan-20261014.md`
- **Tanggal**: 14 Oktober 2026
- **Penulis**: Senior System Analyst
- **Status**: **Selesai Tahap 1–7** — PR #534 (Tahap 1 backend fondasi), #536 (Tahap 2 dokumen + TTE), #537 (Tahap 3 frontend), #538 (input staf + kelola kategori), #539 (perbaikan UX panel kategori), #540 (follow-up filter/cetak), #541 (staf-sign, unverify + edit hasil verifikasi, cetak staf), #542 (halaman terpadu tab Rekaman/Verifikasi/Penerbitan, impor CSV, verifikasi massal, terbit/cabut massal, cetak per mahasiswa), dan PR Tahap 7 (US-8 ekspor rekap PDF/Excel mengikuti filter + kop/nomor surat via `system_settings`). **Keputusan final**: self-sign mahasiswa DITUTUP — tanda tangan digital SKPI hanya staf-verifier. Sisa: UAT staging Tahap 7 + promosi produksi `development -> main` (lihat `docs/016_uat-skpi-staging.md` untuk gate UAT & runbook).
- **Target Implementasi**: Feature branch → PR ke `development` (staging-first) — selesai

---

## 1. Ringkasan Fitur

**Surat Keterangan Pendamping Ijazah (SKPI)** adalah dokumen resmi yang merangkum pencapaian non-akademik mahasiswa: pelatihan, seminar, workshop, kegiatan organisasi, dan prestasi yang pernah diikuti selama studi. Saat ini tidak ada basis data terpusat untuk rekaman kegiatan tersebut — proses penyusunan SKPI masih manual (mencari data dan merangkum), rawan kehilangan bukti (sertifikat), dan lambat.

**Problem Statement (masukan pengguna):**

> *Data SKPI terkait pelatihan, seminar, atau kegiatan yang pernah diikuti mahasiswa. Sebaiknya terdapat basis data yang dapat diisi oleh mahasiswa atau admin dan diverifikasi kesesuaiannya oleh pihak terkait, sehingga dalam pencetakan SKPI tidak perlu mencari data dan merangkumnya lagi.*

**Solusi**: Modul basis data rekaman kegiatan mahasiswa dengan alur verifikasi berjenjang, lampiran bukti sertifikat, master kategori & poin kegiatan, serta menu cetak/download SKPI elektronik bertanda tangan digital (QR signed-hash, mengikuti pola TTE KHS Fase 1).

---

## 2. Tujuan & Stakeholder

### Tujuan
1. Menyediakan basis data rekaman kegiatan mahasiswa (pelatihan, seminar, workshop, organisasi, prestasi, kegiatan lain) yang dapat diisi mahasiswa/sendiri atau staf.
2. Menjamin kesesuaian data melalui verifikasi oleh pihak berwenang (Dosen Pendamping/PA, kemahasiswaan, admin/prodi) sebelum masuk ke dokumen SKPI.
3. Menyediakan tombol unduh/cetak SKPI mandiri di menu SKPI — dokumen tersusun otomatis dari rekaman terverifikasi, tanpa perlu merangkum manual.
4. Menjamin keaslian dokumen SKPI melalui tanda tangan elektronik QR signed-hash dan halaman verifikasi publik (pola KHS).

### Stakeholder & Peran

| Peran | Kebutuhan |
| :-- | :-- |
| **Mahasiswa** | Input & melacak rekaman kegiatannya; mengunggah bukti sertifikat; mengunduh/mencetak SKPI. |
| **Dosen Pendamping (PA)** | Memverifikasi (approve/reject + catatan) rekaman kegiatan mahasiswa bimbingannya (`mahasiswa.dosenPaId`). |
| **Kemahasiswaan** (role baru) | Memverifikasi rekaman lintas prodi dalam unit kerjanya; mengelola kategori & poin kegiatan. |
| **Admin / Prodi** | Verifikasi fallback dengan prodi-scoping; mengelola data & kategori. |
| **Kaprodi / Pimpinan** | Penandatangan SKPI (otomatis via `resolveSigner`); pemantau rekap kegiatan. |

---

## 3. User Stories & Prioritas (MoSCoW)

| # | User Story | Prioritas |
| :-- | :-- | :-- |
| US-1 | Sebagai mahasiswa, saya dapat menginput rekaman kegiatan (pelatihan/seminar/organisasi/prestasi) beserta lampiran sertifikat agar data saya tercatat. | **Must** |
| US-2 | Sebagai mahasiswa, saya dapat mengedit/menghapus rekaman saya selama masih berstatus `pending` atau `ditolak`. | **Must** |
| US-3 | Sebagai Dosen PA / kemahasiswaan / admin / prodi, saya dapat melihat antrean verifikasi rekaman kegiatan (dengan filter prodi/mahasiswa/status) dan menyetujui atau menolaknya beserta catatan verifikasi. | **Must** |
| US-4 | Sebagai mahasiswa, saya dapat mengunduh/mencetak SKPI dari menu SKPI yang berisi identitas saya + daftar kegiatan terverifikasi + tanda tangan digital QR verifikasi. | **Must** |
| US-5 | Sebagai admin/kemahasiswaan, saya dapat mengelola master kategori kegiatan (nama, jenis, bobot/poin, aktif) untuk penilaian pencapaian. | **Must** |
| US-6 | Sebagai kaprodi/pimpinan, SKPI yang saya tandatangani bersifat idempoten dan dapat diverifikasi publik melalui QR. | **Must** |
| US-7 | Sebagai mahasiswa, saya dapat melihat ringkasan poin pencapaian dari kegiatan terverifikasi di halaman SKPI saya. | **Could** |
| US-8 | Sebagai staf, saya dapat mengekspor rekap kegiatan per prodi/periode (PDF/Excel). | **Could** |
| US-9 | Sebagai admin, saya dapat menetapkan syarat minimum kegiatan terverifikasi sebelum SKPI dapat diterbitkan. | **Should** |
| US-10 | Sebagai staf-verifier, saya dapat membatalkan hasil verifikasi (`unverify`) dan mengedit poin/catatan hasil (`hasil-verifikasi`) tanpa mengubah status. | **Should** |
| US-11 | Sebagai verifikator (staf), saya dapat mengimpor daftar kegiatan mahasiswa via CSV dengan laporan error per baris. | **Must** |
| US-12 | Sebagai verifikator, saya dapat menyetujui banyak rekaman sekaligus (bulk approve). | **Must** |
| US-13 | Sebagai staf, saya melihat tab Penerbitan berisi mahasiswa dengan ≥1 rekaman dan dapat menerbitkan/mencabut tanda tangan SKPI satu per satu maupun massal; cetak selalu rekap per mahasiswa. | **Must** |

Catatan prioritas ekspor (US-8): implementasi **frontend-only mengikuti filter aktif** (keputusan produk Tahap 7) — bukan per periode tanggal; "periode" ditafsirkan sebagai filter status/kategori/mahasiswa/prodi yang sedang aktif di tabel.

---

## 4. Alur Bisnis

### 4.1 Alur Utama — Input → Verifikasi → Cetak

```mermaid
flowchart TD
    A[Mahasiswa/Staf input rekaman kegiatan<br/>+ lampiran sertifikat] --> B[Status: pending]
    B --> C{Verifikator}
    C -->|Dosen PA / kemahasiswaan / admin / prodi| D[Review berkas & data]
    D -->|Approve| E[Status: diverifikasi<br/>+ verifiedBy/verifiedAt]
    D -->|Reject| F[Status: ditolak<br/>+ catatan verifikator]
    F -->|Mahasiswa edit & resubmit| B
    E --> G[Mahasiswa buka menu SKPI]
    G --> H[Sign SKPI: docHash payload snapshot<br/>+ HMAC-SHA256 + QR verifikasi]
    H --> I[Download / Cetak SKPI<br/>pola KhsCetak: HTML + window.print]
    I --> J[Verifikasi publik /v/:uuid<br/>VALID / REVOKED / TAMPERED]
```

### 4.2 State Machine Rekaman Kegiatan

| State | Aksi yang boleh | Penanggung jawab |
| :-- | :-- | :-- |
| `pending` | edit, hapus, submit verifikasi | Pemilik (mahasiswa/staf input) |
| `diverifikasi` | tidak bisa diedit (freeze data cetak); koreksi oleh staf: `unverify` (→ pending) & `edit hasil` (poin/catatan, status tetap) | Verifikator (approve); koreksi staff-verifier |
| `ditolak` | edit, resubmit ke `pending`, hapus; koreksi oleh staf: `unverify` (→ pending) | Verifikator (reject + catatan wajib); koreksi staff-verifier |

Aturan transisi (mengikuti pola `CutiService.approve` — `apps/backend/src/services/cuti.service.ts:241-302`):
- `pending → diverifikasi` / `pending → ditolak` oleh verifikator berwenang.
- `ditolak → pending` (resubmit) oleh pemilik; `pending → hapus` oleh pemilik.
- Rekaman `diverifikasi` **tidak dapat dihapus/diedit** oleh mahasiswa; koreksi oleh admin via mekanisme "unverify" (opsional, admin-only) yang mencatat audit log.

### 4.3 Otoritas Verifikasi (Role & Scoping)

**Penambahan role baru**: `kemahasiswaan` ditambahkan ke enum `user_role` (multi-role allowed, seperti `admin`/`prodi`).

Verifikator yang berwenang memverifikasi suatu rekaman kegiatan mahasiswa M:
1. **Dosen PA** — akun dosen yang cocok dengan `mahasiswa.dosenPaId` (pola guard `apps/backend/src/controllers/bimbingan.controller.ts:49-52`).
2. **Kemahasiswaan** — user dengan role `kemahasiswaan` (dibatasi prodi-scope-nya via `ProdiScopeService.getUserAccessibleProdiIds`).
3. **Admin / Prodi / Kaprodi** — role staf dengan prodi-scoping (admin global; prodi/kaprodi dibatasi `programStudiId`).

Dosen pengajar biasa (tanpa PA) dan mahasiswa lain **tidak** boleh memverifikasi.

### 4.4 Syarat Penerbitan SKPI
- Mahasiswa memiliki data identitas lengkap (NIM, nama, prodi, program studi) di tabel `mahasiswa`.
- Status akademik: `aktif`, `cuti`, atau `lulus` (SKPI boleh dicetak mahasiswa aktif maupun lulus).
- Minimum kegiatan terverifikasi: dikonfigurasi via `system_settings` (key: `skpi_min_kegiatan`, default `1`); jika belum terpenuhi, tombol cetak dinonaktifkan dengan pesan informatif.
- Hanya kegiatan berstatus `diverifikasi` yang dimasukkan ke dokumen.

---

## 5. Desain Data (Skema Database)

### 5.1 Tabel Baru

**`kategori_kegiatan_skpi`** — master kategori & bobot poin:

| Kolom | Tipe | Keterangan |
| :-- | :-- | :-- |
| `id` | serial PK | |
| `nama` | varchar (unique) | contoh: "Pelatihan", "Seminar", "Workshop", "Organisasi Kemahasiswaan", "Prestasi Akademik", "Prestasi Non-Akademik", "Magang/Praktik Kerja", "Kegiatan Sosial/Relawan" |
| `jenis` | varchar | `pelatihan` \| `seminar` \| `organisasi` \| `prestasi` \| `lainnya` |
| `poinDefault` | integer default 0 | bobot poin bawaan per kegiatan |
| `isAktif` | boolean default true | kategori dapat dinonaktifkan tanpa menghapus riwayat |
| `createdAt` / `updatedAt` | timestamp | |

**`kegiatan_mahasiswa_skpi`** — rekaman kegiatan:

| Kolom | Tipe | Keterangan |
| :-- | :-- | :-- |
| `id` | serial PK | |
| `mahasiswaId` | FK → `mahasiswa.id` | pemilik rekaman |
| `kategoriKegiatanId` | FK → `kategori_kegiatan_skpi.id` | |
| `namaKegiatan` | varchar NOT NULL | nama pelatihan/seminar/kegiatan |
| `penyelenggara` | varchar | instansi penyelenggara |
| `tanggalMulai` | date (`mode: 'string'`) | calendar date — pola `date()` sesuai AGENTS.md |
| `tanggalSelesai` | date nullable | |
| `lokasi` | varchar nullable | |
| `deskripsi` | text nullable | ursing singkat peran/hasil kegiatan |
| `nomorSertifikat` | varchar nullable | nomor/serial sertifikat |
| `poin` | integer default 0 | poin final (default dari kategori, boleh disesuaikan verifikator) |
| `status` | varchar default `'pending'` | `'pending'` \| `'diverifikasi'` \| `'ditolak'` (komentar enumerasi, pola `pengajuanCuti`) |
| `catatanVerifikator` | text nullable | wajib diisi saat reject |
| `verifiedById` | FK nullable → `users.id` | |
| `verifiedAt` | timestamp nullable | |
| `createdById` | FK → `users.id` | input (mahasiswa sendiri atau staf) |
| `createdAt` / `updatedAt` | timestamp | |

Index: `(mahasiswaId, status)`, `(status)` untuk antrean verifikasi.

**Lampiran bukti sertifikat**: reuse pola lampiran — buat tabel `lampiran_kegiatan_skpi` (atau genericisasi `statusMahasiswaLampiran` bila diperlukan) dengan kolom `kegiatanId` FK, `fileName`, `filePath` (storage `skpi/`), `mimeType`, `fileSize`, `uploadedById`, `createdAt`. Storage: `apps/backend/src/utils/lampiran-storage.ts` (direktori dibuat di `app.ts` saat boot, pola `storage/status-mahasiswa`). Batas: 1 lampiran opsional per kegiatan (PDF/JPG/PNG, maks 5 MB).

**`document_signatures`** — tidak ada perubahan skema; hanya perluasan `DocType` union (lihat §6.3).

### 5.2 Relasi
- `kegiatanMahasiswaSkpi.mahasiswa` → `mahasiswa` (many-to-one).
- `kegiatanMahasiswaSkpi.kategori` → `kategoriKegiatanSkpi` (many-to-one).
- `kegiatanMahasiswaSkpi.lampiran` → `many(lampiranKegiatanSkpi)`.
- `mahasiswa` → `many(kegiatanMahasiswaSkpi)`.

### 5.3 Migrasi
- File: `apps/backend/drizzle/0084_skpi_kegiatan_mahasiswa.sql`.
- **Idempoten wajib**: `CREATE TABLE IF NOT EXISTS`, `DO $$ ... ADD CONSTRAINT IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` (gaya `0083_status_mahasiswa_lampiran.sql`).
- Role baru `kemahasiswaan`: `DO $$ BEGIN IF NOT EXISTS (...pg_enum...) THEN ALTER TYPE user_role ADD VALUE 'kemahasiswaan'; END IF; END $$;` (catatan: `ALTER TYPE ... ADD VALUE` tidak bisa di dalam transaksi — ikuti pola pasti dari migrasi enum sebelumnya).
- Alur: edit `schema.ts` → `bun run db:generate` → review SQL → commit `schema.ts` + `drizzle/` bersamaan (`docs/MIGRATION_WORKFLOW.md`).
- Deploy: **backup DB wajib** sebelum `db:safe-migrate` ke staging/produksi.

---

## 6. Spesifikasi API (Backend)

Prefix route: `/skpi`, semua endpoint terproteksi `authMiddleware` kecuali verifikasi publik.

### 6.1 Master Kategori
| Method & Path | Aksi | Otorisasi |
| :-- | :-- | :-- |
| `GET /skpi/kategori` | Daftar kategori aktif | semua role terautentikasi |
| `POST /skpi/kategori` | Buat kategori | `super_admin`, `admin`, `kemahasiswaan` |
| `PUT /skpi/kategori/:id` | Update kategori | idem |
| `DELETE /skpi/kategori/:id` | Hapus (hanya bila belum dipakai) | `super_admin`, `admin` |

### 6.2 Rekaman Kegiatan
| Method & Path | Aksi | Otorisasi |
| :-- | :-- | :-- |
| `GET /skpi/kegiatan` | Daftar rekaman (query: `mahasiswaId`, `status`, `kategoriId`, `page`, prodi scope otomatis) | mahasiswa: own-only; staf: sesuai scope |
| `POST /skpi/kegiatan` | Input rekaman (status `pending`) | `mahasiswa` (own), staf (untuk mahasiswa dalam scope) |
| `PUT /skpi/kegiatan/:id` | Edit (hanya `pending`/`ditolak`) | pemilik atau admin |
| `DELETE /skpi/kegiatan/:id` | Hapus (hanya `pending`/`ditolak`) | pemilik atau admin |
| `POST /skpi/kegiatan/:id/verifikasi` | Body: `action: 'approve' \| 'reject'`, `catatan?`, `poin?` | Dosen PA / `kemahasiswaan` / `admin` / `prodi` / `kaprodi` (prodi scope) |
| `PUT /skpi/kegiatan/:id/unverify` | Batalkan hasil verifikasi (diverifikasi/ditolak → pending; metadata verifikator dihapus) | `kemahasiswaan` / `admin` / `prodi` / `kaprodi` / `super_admin` (prodi scope) |
| `PUT /skpi/kegiatan/:id/hasil-verifikasi` | Edit poin & catatan hasil verifikasi rekaman `diverifikasi` (status tetap) | idem unverify |
| `POST /skpi/kegiatan/import` | **Impor CSV** rekaman kegiatan (multipart field `file`); hasil `pending`; progres per baris (`successCount`/`errors[{line,error}]`) — header wajib `nim,nama_kategori,nama_kegiatan,tanggal_mulai` (+opsional `tanggal_selesai,penyelenggara,lokasi,nomor_sertifikat,deskripsi`); NIM/kategori/scope salah = error per baris, bukan 403 utuh | staf-verifier + scope prodi (baris luar scope → error per baris) |
| `POST /skpi/kegiatan/verifikasi-bulk` | **Approve massal** `{ ids: number[1..100] }` → `{ approved[], failed[{id,error}] }`; hanya `pending` yang diproses (lain = `failed`); **reject massal TIDAK disediakan** (catatan wajib per rekaman) | Dosen PA pemilik / staf-verifier scope (otorisasi per baris) |
| `POST /skpi/kegiatan/:id/lampiran` | Upload bukti (`t.File()`, pola `uploadLampiranCutiSchema`) | pemilik / staf scope |
| `DELETE /skpi/kegiatan/:id/lampiran/:lampiranId` | Hapus lampiran | pemilik / admin |

### 6.3 Dokumen SKPI (TTE/QR)
| Method & Path | Aksi | Otorisasi |
| :-- | :-- | :-- |
| `GET /skpi/dokumen/:mhsId` | Ambil ringkasan siap cetak (identitas + kegiatan terverifikasi + status signature bila ada) | mahasiswa own / staf scope |
| `POST /skpi/dokumen/:mhsId/sign` | Terbitkan signature (idempoten, pola `signKhs`) | **Khusus staf** `super_admin`/`admin`/`prodi`/`kaprodi`/`kemahasiswaan` scope — **keputusan final (Tahap 7)**: mahasiswa (termasuk pemilik) TIDAK boleh menandatangani sendiri |
| `POST /skpi/dokumen/:mhsId/revoke` | **Cabut** signature SKPI (alasan ≥3 karakter); `400` bila belum pernah ditandatangani | idem sign (staf-verifier + scope) — jalur khusus SKPI, **lebih luas** dari `POST /document-signatures/:uuid/revoke` generik yang dibatasi admin/kaprodi |
| `POST /skpi/dokumen/bulk-sign` | **Terbitkan massal** `{ mahasiswaIds: number[1..50] }` → `{ signedCount, failed[{mahasiswaId,error}] }`; seluruh id wajib scope (403 utuh bila ada luar lingkup); syarat §4.4 dienforce per mahasiswa (gagal → `failed`, bukan membatalkan sisanya); idempoten | idem sign |
| `POST /skpi/dokumen/bulk-revoke` | **Cabut massal** `{ mahasiswaIds, reason }` → `{ revokedCount, failed[] }`; belum ditandatangani → `failed` per baris; aman re-run | idem sign |
| `GET /skpi/penerbitan` | **Tab Penerbitan**: mahasiswa dengan ≥1 rekaman (status apa pun) + hitung per status + total poin + syarat + status signature (batch); query `page,limit,search,prodiId,siapTerbit`; agregasi 1 query grup (tanpa N+1) | khusus staf-verifier + scope |
| `GET /document-signatures/verify/:uuid` | **Sudah ada** — verifikasi publik tanpa auth | publik (`PUBLIC_NO_SESSION_PATHS` di `app.ts`) |

**Perubahan integrasi signing**:
- `apps/backend/src/services/document-signature.service.ts:24` — perluas `DocType` menjadi `'KHS' | 'TRANSKRIP' | 'SKPI'`.
- `refId` SKPI: `skpi:<mhsId>`; payload snapshot stabil: identitas mahasiswa (NIM, nama, prodi, jenjang), daftar kegiatan terverifikasi (nama, kategori, tanggal, penyelenggara), poin total, tahun terbit. **Field volatil (mis. `requestedByUserId`) tidak masuk hash** (aturan Fase 1).
- Idempoten per `(tenant, 'SKPI', 'skpi:<mhsId>')`; jika daftar kegiatan terverifikasi berubah setelah signing → revoke signature lama + insert baru (pola `signKhs` baris 189-212).
- Penandatangan: `resolveSigner(programStudiId)` (Kaprodi → fallback pimpinan) — tanpa perubahan.
- QR mengarah ke `VERIFY_BASE_URL` + `/v/:uuid` (env existing).

### 6.4 Skema & Pola Wajib
- Validasi input: TypeBox `t.*` di `apps/backend/src/schemas/skpi.schema.ts` (format `{ detail: { tags, summary, description }, body/query/params }`).
- Controller: static methods + destructure `AuthContext` + `getCurrentUser()`; `try/catch` → `{ error }` + status; dilarang `any` (kecuali pengecualian framework dengan biome-ignore).
- Service: static methods Drizzle ORM; klausul `where` eksplisit; state transition dijaga di service (throw `Error` untuk business logic).
- Semua mutasi tercatat otomatis via `audit.plugin.ts` (tanpa instrumentasi manual).
- File baru: `skpi.routes.ts`, `skpi.controller.ts`, `skpi.service.ts`, `skpi.schema.ts`; mount di `app.ts` (blok `.use(...)` route ± baris 429-481).

---

## 7. Spesifikasi UI (Frontend — SolidJS)

### 7.1 Menu & Routing

**Sidebar** (`apps/frontend/src/components/Sidebar.tsx`):
- Section **Layanan Mahasiswa**: item **"SKPI Mahasiswa"** → `/skpi` (`isMahasiswa()`) & item **"SKPI"** → `/skpi` (staf-verifier). Kedua entri memakai `currentPath === '/skpi'` (exact match) pada auto-expand.
- **Entri "Verifikasi SKPI" dihapus** — verifikasi kini menjadi tab di `/skpi` (keputusan produk tahap ini).

**Routing** (`apps/frontend/src/App.tsx`):
```tsx
<Route path="/skpi" element={
  <ProtectedRoute allowedRoles={['mahasiswa','admin','prodi','kaprodi','dosen','kemahasiswaan','super_admin']}>
    <Skpi/>
  </ProtectedRoute>} />
{/* Redirect permanen — bookmark/tautan lama tidak 404 */}
<Route path="/skpi/verifikasi" element={<Navigate href="/skpi" />} />
<Route path="/skpi/cetak/:mhsId" element={...} />
```
- Lazy import untuk semua halaman baru (pola baris 22-107).
- **`ProtectedRoute.tsx:8-20`** — tambahkan `'kemahasiswaan'` ke union `allowedRoles`.

**Tab per peran** (shell `routes/Skpi.tsx`):
| Tab | mahasiswa | dosen (PA) | staf-verifier |
| :-- | :-- | :-- | :-- |
| Rekaman | ✅ (milik sendiri) | — | ✅ (scope + impor CSV) |
| Verifikasi | — | ✅ (bimbingan PA) | ✅ (scope) |
| Penerbitan | — | — | ✅ |

Tab bar pill (`rounded-full`) hanya ditampilkan bila >1 tab tersedia; tab aktif jatuh ke tab pertama per peran (dosen → Verifikasi).

### 7.2 Halaman

| Route | File | Fitur |
| :-- | :-- | :-- |
| `/skpi` | `routes/Skpi.tsx` (shell tab) + `components/skpi/TabRekaman.tsx` + `TabVerifikasi.tsx` + `TabPenerbitan.tsx` | **Shell**: header + tab bar per peran + ringkasan dokumen mahasiswa (total kegiatan/poin/syarat/tanda tangan + **tombol "Unduh/Cetak SKPI"** → `/skpi/cetak/:mhsId`, aktif bila syarat §4.4). **Tab Rekaman**: daftar rekaman + form tambah/edit + lampiran + kelola kategori (staf) — **tanpa tombol Cetak per baris**. **Tab Verifikasi**: filter (search/status/kategori/mahasiswa/prodi), detail + lampiran, Approve/Reject per baris, **checkbox + "Setujui Terpilih" (approve massal)**, Edit Hasil/Batalkan (staff), **tombol "Impor CSV"** (staff) dengan modal format + unduh template + laporan error per baris — **tanpa tombol Cetak per baris**. **Tab Penerbitan** (staff): daftar mahasiswa ≥1 rekaman (semua status) dengan hitung V/P/D, badge syarat + alasan, status tanda tangan; aksi per baris **Cetak (rekap per mahasiswa)** / **Terbitkan** (gate syarat) / **Cabut** (alasan wajib) + seleksi massal **"Terbitkan Terpilih"** / **"Cabut Terpilih"**. |
| `/skpi/verifikasi` | — (redirect `<Navigate href="/skpi" />`) | Halaman lama digabung sebagai tab — tanpa duplikasi pemeliharaan. |
| `/skpi/cetak/:mhsId` | `routes/SkpiCetak.tsx` | Dokumen cetak — **pola `KhsCetak.tsx`**: `createResource` GET dokumen, regenerasi QR via `QRCode.toDataURL(verifyUrl)`, auto-print setelah siap, tombol Cetak, blok tanda tangan (nama jabatan penandatangan dari `resolveSigner`) + `docHash`/`verifyUuid` di footer, modal konfirmasi satu-satunya jalur penerbitan signature. **Tombol cetak TIDAK lagi disediakan per entri kegiatan — cetak selalu per mahasiswa (rekap).** |

### 7.3 Aturan Komponen (DESIGN.md + AGENTS.md)
- Komponen: `export default function X()` dibungkus `<MainLayout>`.
- SolidJS primitives (`createSignal`, `createResource`, `createMemo`); **tanpa destruktur props**; `<For>` bertipe (named interface / `SafeAny`).
- Date handling: kolom `date()` = string `YYYY-MM-DD` polos — **dilarang** `new Date(x).toISOString().split('T')[0]`.
- Timestamp Eden dikirim sebagai `Date` → sanitize ke locale string saat render.
- Estetika Apple: pill buttons (`rounded-full`), hairline divider, ink `#1d1d1f`, parchment `#f5f5f7`, Action Blue `#0066cc`, `active:scale-95`.
- Frontend controller: `controllers/skpiController.ts` berbasis `fetchApi`, export interface tipe (`SkpiKegiatan`, `SkpiKategori`) untuk dipakai ulang di props/state.

---

## 8. Dokumen SKPI — Komponen Cetak

Struktur dokumen (A4 portrait, HTML + `window.print()`):
1. **Kop surat** global (`surat_kop_global` di `system_settings`, diedit via tab **Kop Surat** pada Pengaturan Sistem; identik untuk semua dokumen cetak — KHS, SKPI, BKD, KRS, Surat Peringatan, Invoice/Bukti Bayar, dst.). Judul SKPI + Nomor Surat tetap di **bawah** garis kop.
2. **Judul**: "SURAT KETERANGAN PENDAMPING IJAZAH (SKPI)" + nomor (auto, format internal).
3. **Identitas mahasiswa**: NIM, nama lengkap, program studi, jenjang, tahun akademik masuk/akhir, status kelulusan.
4. **Daftar kegiatan terverifikasi** (tabel, diurut `tanggalMulai` asc): No., Nama Kegiatan, Jenis/Kategori, Penyelenggara, Tanggal, Lokasi, Nomor Sertifikat.
5. **Rekap poin** pencapaian (total poin kegiatan terverifikasi).
6. **Pernyataan** keaslian data (dapat diverifikasi melalui QR).
7. **Blok tanda tangan**: tempat & tanggal terbit, nama & jabatan penandatangan (Kaprodi/Pimpinan), QR verifikasi + teks `verifyUuid`.
8. **Footer teknis** (kecil): `docHash` (prefix) & tautan verifikasi — pola footer `KhsCetak.tsx`.

Pilihan download: **PDF via print dialog** (Save as PDF) — konsisten dengan KHS; tidak perlu jsPDF untuk dokumen ini.

---

## 9. Keamanan & Scoping

1. **Own-only mahasiswa**: `GET/POST/PUT/DELETE /skpi/kegiatan*` — non-staf hanya boleh akses rekaman miliknya (`mahasiswaId` = record milik akun, pola `getMahasiswaIdByEmail`).
2. **Prodi scope**: semua akses staf melalui `ProdiScopeService.canAccessProdi` / `assertMahasiswaInScope` (admin global bypass).
3. **Guard Dosen PA**: verifikasi dosen hanya bila `mahasiswa.dosenPaId === dosenId` akun.
4. **Rekaman `diverifikasi` freeze**: service menolak edit/hapus non-admin.
5. **Upload lampiran**: validasi MIME/ekstensi whitelist (pdf/jpg/png), maks 5 MB, nama file di-random (pola `lampiran-storage.ts`), disajikan via endpoint terautentikasi (bukan path publik).
6. **Signing**: secret HMAC hanya via env `SIGN_HMAC_KEYS`/`SIGN_ACTIVE_KID`; jangan hardcode domain (`VERIFY_BASE_URL`).
7. **Audit log** otomatis untuk semua mutasi CRUD & verifikasi.
8. **Endpoint publik** tetap hanya `GET /document-signatures/verify/:uuid` yang terdaftar di `PUBLIC_NO_SESSION_PATHS`.

---

## 10. Penerimaan Kriteria (Acceptance Criteria)

| US | Acceptance Criteria |
| :-- | :-- |
| US-1 | Mahasiswa dapat membuat rekaman kegiatan dengan semua field wajib; status awal `pending`; lampiran (PDF/JPG/PNG ≤5 MB) terunggah dan bisa dipratinjau verifikator. |
| US-2 | Edit/hapus hanya berfungsi pada `pending`/`ditolak`; percobaan pada `diverifikasi` ditolak dengan pesan jelas. |
| US-3 | Verifikator berwenang melihat antrean `pending`; approve memerlukan konfirmasi; reject mewajibkan catatan; verifikator di luar cakupan (dosen non-PA, mahasiswa lain) menerima 403. |
| US-4 | Tombol "Unduh/Cetak SKPI" menghasilkan halaman cetak berisi identitas + tabel kegiatan terverifikasi + QR + blok tanda tangan; hanya kegiatan `diverifikasi` yang tampil; memicu `window.print()`. |
| US-5 | Admin/kemahasiswaan dapat CRUD kategori; menonaktifkan kategori tidak menghapus riwayat rekaman lama; kategori non-aktif tidak muncul di form input baru. |
| US-6 | `POST /sign` idempoten untuk payload sama; perubahan daftar kegiatan terverifikasi menyebabkan signature lama revoked dan QR baru valid; verifikasi publik mengembalikan `VALID`; **otorisasi khusus staf** — mahasiswa (termasuk pemilik) menerima 403. |
| US-9 | Bila jumlah kegiatan terverifikasi < `skpi_min_kegiatan`, tombol cetak disabled dengan pesan; nilai setting dapat diubah admin via system settings. |
| US-10 | Staff-verifier dalam scope dapat membatalkan hasil verifikasi (`unverify`: diverifikasi/ditolak → pending) dan mengedit hasil (`hasil-verifikasi`: poin/catatan, status tetap); non-staf & luar lingkup menerima 403; hasil cetak SKPI (screen & print) memuat tabel riwayat kegiatan. |
| US-11 | Verifikator (staf) dapat **mengimpor daftar kegiatan mahasiswa via CSV** (`POST /import`): baris valid masuk `pending`; NIM/kategori/scope salah → laporan error **per baris** tanpa membatalkan baris lain; template CSV tersedia untuk diunduh; non-staf → 403. |
| US-12 | Verifikator dapat **memverifikasi sekaligus (bulk approve)**: checkbox hanya pada baris `pending`, tombol "Setujui Terpilih" dengan modal konfirmasi; respons melaporkan `approved`/`failed` per id; reject massal tidak tersedia (catatan wajib per rekaman); dosen non-PA/luar lingkup → seluruh baris `failed` tanpa perubahan data. |
| US-13 | Tab **Penerbitan** (staf): daftar mahasiswa dengan ≥1 rekaman (status apa pun) berisi hitung V/P/D, total poin, badge syarat (+alasan), status tanda tangan; **terbitkan/cabut satu per satu maupun massal** (gate syarat §4.4; cabut wajib alasan ≥3 karakter; belum ditandatangani → `failed` per baris); tombol **Cetak per mahasiswa (rekap)** — **tombol Cetak per entri kegiatan dihapus dari tab Rekaman & Verifikasi**. |

---

## 11. Risiko & Pertimbangan

| Risiko | Mitigasi |
| :-- | :-- |
| Penambahan role `kemahasiswaan` menyentuh banyak titik (enum DB, `ProtectedRoute`, `Sidebar`, `role.ts` `ROLE_LABELS`, RBAC bila ada) | Migrasi idempoten; checklist file wajib di §5.3 & §7.1; lint/typecheck menyeluruh |
| `ALTER TYPE ... ADD VALUE` tidak dalam transaksi | Ikuti pola migrasi enum pasti di repo; jalankan via `db:safe-migrate` dengan backup |
| Data kegiatan berubah setelah SKPI ditandatangani → dokumen cetak tidak konsisten dengan snapshot | Idempotent re-sign: snapshot hash berubah → revoke + insert baru (pola KHS); QR lama tampil `REVOKED` |
| Pemalsuan upload sertifikat | Verifikator wajib memeriksa lampiran; catatan verifikasi tercatat; audit log penuh; skala manual trust institution |
| Dokumen SKPI format institusi bervariasi antar kampus | Kop global (`surat_kop_global`, tab Kop Surat), nomor surat (`skpi_nomor_format`), dan paragraf pembuka dikonfigurasi (opsional `system_settings`) agar mudah disesuaikan tanpa perubahan kode |
| Flaky integration test seeding berat | Test file skpi dijalankan scoped (`bun test apps/backend/src/__tests__/skpi*.test.ts --timeout 15000`) |

---

## 12. Rencana Verifikasi & Testing

### Pre-commit (wajib)
```bash
bun run lint
cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json
cd apps/frontend && bunx tsc --noEmit
```

### Backend Integration Test (scoped)
- File baru: `apps/backend/src/__tests__/skpi.test.ts` — skenario: CRUD kegiatan own-only; guard dosen PA; reject wajib catatan; freeze rekaman `diverifikasi`; sign idempoten; re-sign saat data berubah.
- Jalankan: `cd apps/backend && bun run src/scripts/pre-test.ts && bun run test --timeout 15000 src/__tests__/skpi.test.ts` (Postgres test di `localhost:5433` aktif).
- **Dilarang** blanket `bun test` di root.

### Uji Manual Flow
1. Mahasiswa login → input kegiatan + lampiran → cek status `pending`.
2. Dosen PA login → verifikasi panel → approve → rekaman masuk dokumen.
3. Mahasiswa → menu SKPI → Unduh/Cetak → QR tampil (diterbitkan staf) → scan/verify → `VALID`.
4. Verifikator lain (non-PA, non-scope) → 403.
5. Admin ubah kategori non-aktif → form baru tidak menawarkan kategori tsb.
6. Staff-verifier: Edit Hasil (ubah poin) pada rekaman terverifikasi → status tetap; Batalkan → `pending` lalu verifikasi ulang.
7. Mahasiswa membuka `/skpi/cetak/:mhsId` → TIDAK ada tombol tanda tangan (hanya cetak); admin/prodi/kemahasiswaan → tombol ada & hasilkan QR `VALID`.
8. Cetak/Simpan PDF SKPI → tabel riwayat kegiatan + total poin tampil (regresi allowlist print).
9. Admin → `/skpi` → tab bar (Rekaman/Verifikasi/Penerbitan); dosen PA hanya tab Verifikasi; mahasiswa tanpa tab bar + ringkasan dokumen.
10. Tab Verifikasi → **Impor CSV** (unduh template, isi 2 baris valid + 1 NIM salah) → 2 masuk `pending`, 1 dilaporkan error per baris; non-staf 403.
11. Tab Verifikasi → centang 2 baris `pending` → Setujui Terpilih → toast 2 disetujui; baris non-pending/luar otorisasi dilewati & dilaporkan.
12. Tab Penerbitan → Terbitkan (per baris & massal terpilih) → badge Ditandatangani; Cabut dengan alasan → badge kembali Belum & QR lama `REVOKED`/410; belum ditandatangani pada bulk → `failed` per baris.
13. Regresi: **tidak ada tombol "Cetak" pada baris tab Rekaman & Verifikasi** — cetak hanya dari tab Penerbitan (per mahasiswa) / tombol Unduh-Cetak mahasiswa.
14. Buka `/skpi/verifikasi` lama → redirect ke `/skpi` (tanpa 404).

### CI/CD
- PR feature → `development` (staging-first); verifikasi staging; promosi `development -> main` via PR terpisah.
- Backup DB produksi wajib sebelum migrate.

---

## Lampiran A: File yang Disentuh Implementasi

**Backend (baru)**: `src/schemas/skpi.schema.ts`, `src/services/skpi.service.ts`, `src/controllers/skpi.controller.ts`, `src/routes/skpi.routes.ts`, `src/__tests__/skpi.test.ts`, `src/__tests__/skpi-dokumen.test.ts`, `drizzle/0084_skpi_kegiatan_mahasiswa.sql`.

**Backend (edit)**: `src/models/schema.ts` (3 tabel + relasi + enum role), `src/app.ts` (mount route + storage dir), `src/services/document-signature.service.ts` (`DocType` + `signSkpi` + `getActiveByRefs` batch), `src/services/csv-import.service.ts` (`importKegiatanSkpi`), `src/utils/role.ts` (label role).

**Frontend (baru)**: `src/routes/Skpi.tsx` (shell tab), `src/components/skpi/TabRekaman.tsx`, `TabVerifikasi.tsx`, `TabPenerbitan.tsx`, `src/routes/SkpiCetak.tsx`, `src/controllers/skpiController.ts`, `tests/skpi-cetak-print.spec.ts`, `tests/skpi-penerbitan.spec.ts`.

**Frontend (dihapus)**: `src/routes/SkpiVerifikasi.tsx` (digabung sebagai tab).

**Frontend (edit)**: `src/App.tsx` (lazy + route + redirect `/skpi/verifikasi`), `src/components/Sidebar.tsx` (hapus entri Verifikasi SKPI + auto-expand), `src/components/ProtectedRoute.tsx` (union role).

**Fitur Kop Surat Global (lintas dokumen, PR terpisah)**:
- **Backend (baru)**: `src/utils/kop-storage.ts` (logo: simpan/hapus/cari di `storage/kop/`), `src/__tests__/settings-kop.test.ts` (6 skenario).
- **Backend (edit)**: `src/services/system-parameter.service.ts` (`KopSuratConfig` + `DEFAULT_KOP_SURAT` + key `surat_kop_global` + `getKopSurat()`; parameter `skpi_kop_nama`/`skpi_kop_alamat` dihapus, `skpi_nomor_format` dipertahankan), `src/controllers/settings.controller.ts` (`getKop`, `updateKop`, `uploadKopLogo`, `deleteKopLogo`, `getKopLogo`), `src/routes/settings.routes.ts` (5 route; baca semua role, tulis admin/super_admin), `src/services/skpi.service.ts` (`getDokumen` → kop global + `nomorSurat`), `src/app.ts` (mkdir `storage/kop/`).
- **Frontend (baru)**: `src/components/cetak/KopSurat.tsx` (komponen kop bersama + `KOPI_FALLBACK`), `src/components/konfigurasi/TabKopSurat.tsx` (editor + live preview + upload/reset logo).
- **Frontend (edit)**: `src/controllers/systemController.ts` (tipe & method kop), `src/routes/KonfigurasiParameter.tsx` (shell 2 tab Parameter/Kop Surat), `src/controllers/skpiController.ts` (`SkpiDokumen.kop`), `src/routes/SkpiCetak.tsx`, `KhsCetak.tsx`, `KrsCetak.tsx`, `BkdCetak.tsx`, `Khs.tsx`, `Pelanggaran.tsx`, `KeuanganDashboard.tsx`, `InputNilai.tsx`, `reports/LaporanBKD.tsx`, `src/utils/bkd-bulk-print.ts` (jsPDF), `src/components/skpi/TabPenerbitan.tsx` + `TabVerifikasi.tsx` (ekspor PDF mengikuti kop global).

# Changelog

Semua perubahan penting pada proyek ini akan dicatat di sini.

Konteks format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan versioning mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Nilai versi dibaca otomatis dari `package.json`.

## [Unreleased]

### Added
- **Modul Aktivitas MBKM (Magang & Kuliah Kerja Praktik)**:
  - Tabel `jenis_aktivitas_mbkm`, `aktivitas_mbkm`, `anggota_aktivitas_mbkm`, `bimbing_aktivitas_mbkm`, dan `konversi_aktivitas_mbkm` (cerminan entitas `aktivitas_mahasiswa` Neo Feeder). Migrasi `0088_aktivitas_mbkm.sql`.
  - Alur persetujuan `draft → diajukan → disetujui/ditolak → selesai` dengan prasyarat: periode akademik, SKS > 0, minimal satu anggota, dan minimal satu pembimbing.
  - Auto-taut bimbingan kategori `MAGANG` saat aktivitas disetujui (idempoten) sehingga sesi bimbingan PKL tercatat dan ter-kredit ke rekap BKD.
  - Rekognisi SKS ke mata kuliah (unik per aktivitas × MK, total tidak melebihi SKS aktivitas).
  - Halaman `/aktivitas-mbkm`: form periode semester terisi otomatis dari periode aktif, dropdown dengan pencarian untuk daftar panjang, ubah isian (status draft), hapus aktivitas (draft/ditolak tanpa bimbingan tertaut), serta tambah/hapus rekognisi SKS.
- **Override status persetujuan MBKM** (`POST /aktivitas-mbkm/:id/override-status`): `admin`/`super_admin`/`prodi`/`kaprodi` dapat memaksa status ke salah satu dari 5 status di luar alur normal. Alasan **wajib** (10–500 karakter) dan tersimpan permanen di tabel `aktivitas_mbkm_status_log` (migrasi `0089`), karena audit log otomatis hanya mencatat pelaku dan endpoint. Riwayat dapat dibaca via `GET /aktivitas-mbkm/:id/status-log` dan ditampilkan di modal detail.
- **Modul Penetapan Pembimbing** (migrasi `0087_pembimbing_mahasiswa.sql`): tabel `pembimbing_mahasiswa` untuk slot `PKL`, `TA_UTAMA`, dan `TA_PENDAMPING`; mendukung pembimbing internal (`dosenId`) maupun eksternal (nama + instansi). Endpoint `/pembimbing/*` (set, bulk, impor CSV, nonaktifkan).
- **Penarikan data PDDIKTI Neo Feeder**: `POST /pddikti/test-connection`, `GET /pddikti/pull/entities`, `GET /pddikti/pull/preview`, `POST /pddikti/pull/apply`. Alur **preview → apply** yang idempoten terhadap kunci `idPddikti`, mencakup data referensi/master, data transaksional (kelas, KRS & nilai, transkrip, aktivitas MBKM), dan penugasan dosen pengajar kelas.
- Halaman **About & Versioning**: seksi Changelog kini dimuat dinamis dari `CHANGELOG.md` melalui endpoint baru `GET /system/changelog` (tidak lagi hardcoded).
- Akses **Peringatan/Kedisiplinan** untuk admin, dosen, instruktur, dan prodi. Dropdown mahasiswa pada panel tambah peringatan kini memakai `SearchableSelect` dengan pencarian server-side, filter status aktif, dan lazy-load. Dosen dapat membuat peringatan ke **seluruh mahasiswa aktif**, termasuk yang bukan bimbingan PA (param `allStudents`).
- **Tanda Tangan Elektronik (TTE) Fase 1 — QR Signed-Hash internal** untuk dokumen cetak (prioritas KHS):
  - Tabel baru `document_signatures` (multi-tenant) menyimpan `doc_hash` (SHA-256 kanonik snapshot payload), `signature` (HMAC-SHA256 dari `<kid>:<docHash>`), `kid`, `verify_uuid` unik, identitas penandatangan, `payload_snapshot` (jsonb), dan `revoked_at`.
  - Endpoint publik `GET /document-signatures/verify/:uuid` (tanpa sesi) mengembalikan `VALID` / `REVOKED` (410) / `TAMPERED` / `NOT_FOUND` (404) dengan PII di-mask; endpoint terproteksi `POST /document-signatures/khs/:mhsId/:periodeId/sign` (idempoten), `GET /document-signatures/khs/:mhsId/:periodeId`, dan `POST /document-signatures/:uuid/revoke`.
  - Halaman verifikasi publik `/verifikasi/:uuid` & `/v/:uuid`; blok QR + hash + penandatangan pada cetak KHS.
  - Util `utils/document-signing.ts` (`canonicalJson`, `sha256Hex`, `hmacSign`, `getSigningKeyConfig`, `getVerifyBaseUrl`, `maskNama`, `maskNim`); env baru `SIGN_HMAC_KEYS`, `SIGN_ACTIVE_KID`, `VERIFY_BASE_URL` (default `https://verify.politekniksorowako.ac.id`).
  - Migrasi `0079_document_signatures.sql`; dependensi `qrcode` (backend & frontend).
- Test `apps/backend/src/__tests__/drizzle-journal.test.ts` yang gagal bila ada file migrasi lebih baru yang tidak terdaftar di `_journal.json`, atau entri journal tanpa file.

### Changed
- **Rebrand global sesuai `DESIGN.md`**: aksen interaktif tunggal Action Blue (`#0066cc`, fokus `#0071e3`, `#2997ff` di dark), tombol pill, hairline divider tanpa shadow pada chrome, micro-interaction `active:scale-95`. Token lama `brand-*`/`accent-*` dipertahankan untuk chrome sidebar dan identitas kampus.
- **Enkripsi parameter rahasia at-rest** (`SETTINGS_SECRET_KEY`, AES-256-GCM): `FEEDER_PASSWORD` kini disimpan dengan prefix `enc:v1:`; nilai plaintext lama tetap terbaca (fallback pass-through) agar deploy tidak memutus koneksi Feeder. Bila env tidak tersedia, penyimpanan jatuh ke plaintext dengan satu warning (tidak memblokir boot).
- **Guard parameter env-only**: key `SETTINGS_SECRET_KEY`, `JWT_SECRET`, `SIGN_*`, `VERIFY_BASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, dan `FEEDER_*` kini **ditolak (400)** bila ditulis via `PUT /system/parameters/:key`, agar admin tidak menyangka nilai dari UI berpengaruh.
- **Write guard PDDIKTI**: operasi tulis ke Feeder dibatasi lewat konfigurasi, sehingga penarikan data tidak otomatis mengubah data di Feeder.
- **Access Control**: dosen/instruktur hanya dapat mengelola RPS, BAP, nilai/komponen, dan presensi untuk kelas yang mereka ampu (`dosen_pengajar_kelas`). Admin/super_admin/prodi tetap akses penuh.
- **Access Control**: menu & route `/penetapan-pembimbing` tidak lagi dibuka untuk role `dosen` murni; dosen yang juga memegang role `admin`/`kaprodi`/`prodi` tetap punya akses.
- Laporan kompensasi (`getLaporanKompensasi` / `getLaporanKompensasiStats`) dibatasi kembali ke admin & dosen karena agregatnya mencakup sumber global (apel/manual) yang tidak bisa di-scope per kelas.
- **Email Sender (Resend)**: pengirim email aktivasi & reset password kini memakai `SIMAK <postman@politekniksorowako.ac.id>` (via env `EMAIL_FROM`, default di helper `getEmailFrom()` di `utils/email.ts`), menggantikan sender sandbox `onboarding@resend.dev`.

### Fixed
- **`GET /aktivitas-mbkm` mengembalikan 500** (`relation "aktivitas_mbkm_status_log" does not exist`): migrasi `0089` sudah ada tetapi tidak terdaftar di `drizzle/meta/_journal.json`, sehingga `drizzle-kit migrate` melewatinya tanpa error dan tabelnya tidak pernah dibuat di staging/produksi. Kini entri journal ditambahkan; `composeItems` juga menghormati `includeHistory` sehingga endpoint list tidak lagi bergantung pada tabel riwayat, dan `getById` memakai `includeHistory: true` agar detail tetap memuat riwayat.
- **Header tabel tidak sejajar dengan body** pada `/penetapan-pembimbing` dan `/aktivitas-mbkm`: penyebabnya `<tbody>` bersarang (komponen `Table` sudah menyediakan satu `<tbody>`), yang membuat browser membentuk kisi kolom terpisah. Wrapper `<tbody>` dihapus dari route terkait dan `Table` diberi guard saat mode DEV.
- **`Escape` pada dropdown `SearchableSelect` ikut menutup `Modal`**: `Modal` memasang listener Escape global di `document`, sedangkan SolidJS mendelegasikan `onKeyDown` ke `document` sehingga `stopPropagation()` di dalam handler berjalan terlalu lambat. Event kini dihentikan di fase capture pada container dropdown.
- Error "resource enroll rombel" (*info.error* bukan fungsi) pada halaman enroll rombel.
- Panel "Kelas Diampu" pada dashboard dosen kosong karena filter `currentOnly` yang bergantung pada tanggal efektif.
- Ikon seksi sidebar tidak tampil pada mode collapsed.

## [1.0.0] - 2026-08-07

### Added
- Modul **Konfigurasi** menggantikan menu **Integrasi Data**, berisi:
  - Manajemen User (existing, penyesuaian peran Vokasi).
  - Pemberian Akses per Role Group — matriks RBAC (baris = modul, kolom = role group) dengan aksi View, Create, Update, Delete, Export, Approve.
  - Pemberian Scope Program Studi — pemberian akses multi-prodi per user + opsi `is_global_scope`.
  - Parameter Kompensasi & Akademik — aturan dinamis Vokasi (durasi harian, pengali denda mangkir / izin-sakit, ambang SP1/SP2/SP3, kunci kartu ujian).
  - Usulan dan Evaluasi Sistem (pindah ke bawah Konfigurasi).
  - About & Versioning — versi otomatis dari `package.json` dipadukan dengan nomor build, git commit hash, dan status kesehatan sistem.
- Tabel baru: `role_groups`, `permissions`, `role_group_permissions`, `user_prodi_scopes`.
- Kolom baru: `users.is_global_scope`, `system_settings.param_type`, `system_settings.updated_by`.
- Peran Vokasi baru pada enum `user_role`: `kaprodi`, `plp`, `instruktur`.
- Skrip `scripts/generate-version.js` untuk membangun `version.json` saat build.
- Endpoint sistem: `/system/version`, `/system/health`, `/system/parameters`, `/rbac/*`, `/prodi-scope/*`.
- Nilai kompensasi (batas harian & pengali denda) kini dinamis melalui `system_parameters`, tidak lagi di-hardcode.
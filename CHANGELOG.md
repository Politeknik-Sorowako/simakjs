# Changelog

Semua perubahan penting pada proyek ini akan dicatat di sini.

Konteks format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan versioning mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Nilai versi dibaca otomatis dari `package.json`.

## [Unreleased]

### Added
- Halaman **About & Versioning**: seksi Changelog kini dimuat dinamis dari `CHANGELOG.md` melalui endpoint baru `GET /system/changelog` (tidak lagi hardcoded).
- Akses **Peringatan/Kedisiplinan** untuk admin, dosen, instruktur, dan prodi. Dropdown mahasiswa pada panel tambah peringatan kini memakai `SearchableSelect` dengan pencarian server-side, filter status aktif, dan lazy-load. Dosen dapat membuat peringatan ke **seluruh mahasiswa aktif**, termasuk yang bukan bimbingan PA (param `allStudents`).
- **Tanda Tangan Elektronik (TTE) Fase 1 — QR Signed-Hash internal** untuk dokumen cetak (prioritas KHS):
  - Tabel baru `document_signatures` (multi-tenant) menyimpan `doc_hash` (SHA-256 kanonik snapshot payload), `signature` (HMAC-SHA256 dari `<kid>:<docHash>`), `kid`, `verify_uuid` unik, identitas penandatangan, `payload_snapshot` (jsonb), dan `revoked_at`.
  - Endpoint publik `GET /document-signatures/verify/:uuid` (tanpa sesi) mengembalikan `VALID` / `REVOKED` (410) / `TAMPERED` / `NOT_FOUND` (404) dengan PII di-mask; endpoint terproteksi `POST /document-signatures/khs/:mhsId/:periodeId/sign` (idempoten), `GET /document-signatures/khs/:mhsId/:periodeId`, dan `POST /document-signatures/:uuid/revoke`.
  - Halaman verifikasi publik `/verifikasi/:uuid` & `/v/:uuid`; blok QR + hash + penandatangan pada cetak KHS.
  - Util `utils/document-signing.ts` (`canonicalJson`, `sha256Hex`, `hmacSign`, `getSigningKeyConfig`, `getVerifyBaseUrl`, `maskNama`, `maskNim`); env baru `SIGN_HMAC_KEYS`, `SIGN_ACTIVE_KID`, `VERIFY_BASE_URL` (default `https://verify.politekniksorowako.ac.id`).
  - Migrasi `0079_document_signatures.sql`; dependensi `qrcode` (backend & frontend).

### Changed
- **Access Control**: dosen/instruktur hanya dapat mengelola RPS, BAP, nilai/komponen, dan presensi untuk kelas yang mereka ampu (`dosen_pengajar_kelas`). Admin/super_admin/prodi tetap akses penuh.
- Laporan kompensasi (`getLaporanKompensasi` / `getLaporanKompensasiStats`) dibatasi kembali ke admin & dosen karena agregatnya mencakup sumber global (apel/manual) yang tidak bisa di-scope per kelas.
- **Email Sender (Resend)**: pengirim email aktivasi & reset password kini memakai `SIMAK <postman@politekniksorowako.ac.id>` (via env `EMAIL_FROM`, default di helper `getEmailFrom()` di `utils/email.ts`), menggantikan sender sandbox `onboarding@resend.dev`.

### Fixed
- Error "resource enroll rombel" (*info.error* bukan fungsi) pada halaman enroll rombel.
- Panel "Kelas Diampu" pada dashboard dosen kosong karena filter `currentOnly` yang bergantung pada tanggal efektif.

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
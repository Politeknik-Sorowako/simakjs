# Changelog

Semua perubahan penting pada proyek ini akan dicatat di sini.

Konteks format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan versioning mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Nilai versi dibaca otomatis dari `package.json`.

## [Unreleased]

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
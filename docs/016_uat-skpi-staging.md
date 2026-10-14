# UAT SKPI Staging — Panduan Pengujian, Gate Rilis & Runbook

- **Dokumen**: `docs/016_uat-skpi-staging.md`
- **Tanggal**: 14 Oktober 2026
- **Target**: `https://staging-simak.politekniksorowako.ac.id` (branch `development`)
- **Prasyarat kode**: fitur SKPI Tahap 1–3 + follow-up sudah ter-merge ke `development` dan **Deploy to Staging** sukses (cek: GitHub Actions → run `Deploy to Staging` terakhir = hijau).
- **Peran dokumen ini**: gate sebelum promosi `development -> main` (PR promotion). Promosi hanya dibuka setelah seluruh seksi "Kriteria Lolos" terpenuhi dan sign-off terisi.

---

## 1. Prasyarat Akun (disiapkan manual admin di staging)

| # | Peran | Kebutuhan data akun | Dipakai untuk |
| :-- | :-- | :-- | :-- |
| 1 | Mahasiswa (M1) | Akun login dengan email yang cocok dengan kolom `mahasiswa.email`; status akademik `aktif`; punya `dosenPaId` | US-1, US-2, US-4, US-7, US-9 |
| 2 | Mahasiswa (M2) | Beda prodi dari M1 (untuk uji scoping) | Kasus 403 |
| 3 | Dosen PA | Dosen yang merupakan `dosenPaId` M1 | US-3 (verifikasi PA) |
| 4 | Kemahasiswaan | Role `kemahasiswaan`, di-scope ke prodi M1 | US-3, US-5 |
| 5 | Prodi | Role `prodi`, di-scope ke prodi M1 | US-3, US-5 |
| 6 | Admin | Role `admin` (global) | US-5, hapus rekaman |

> Jangan simpan password di dokumen ini. Catat hasil uji (Pass/Fail) saja.

## 2. Prasyarat Data & Konfigurasi

- [ ] Minimal **1 kategori kegiatan aktif** dibuat admin (menu `/skpi` → Kelola Kategori). Bila belum ada, buat: nama `Pelatihan`, jenis `pelatihan`, poin default `10`.
- [ ] Parameter `skpi_min_kegiatan` diketahui (menu Konfigurasi → Parameter; default `1`).
- [ ] Env staging valid — deploy script sudah mem-validasi `SIGN_HMAC_KEYS`; verifikasi manual:
  - [ ] `SIGN_HMAC_KEYS` terisi (JSON per-`kid`, dibungkus single quote di `.env`)
  - [ ] `SIGN_ACTIVE_KID` cocok dengan salah satu `kid` di `SIGN_HMAC_KEYS`
  - [ ] `VERIFY_BASE_URL` staging (bila kosong, QR memakai default domain staging)
- [ ] Backup staging terbaru ada (otomatis sebelum deploy; lihat `apps/backend/backups/backup-*.sql.gz` di server).

## 3. Uji Manual — Langkah per Acceptance Criteria

Tandai Pass/Fail per baris. Catat bukti (screenshot/log) bila Fail.

### US-1 — Input rekaman + lampiran (Mahasiswa)

- [ ] Login M1 → menu **SKPI Mahasiswa** → **+ Tambah Kegiatan** → isi kategori/nama/tanggal → Simpan. Status: **Menunggu Verifikasi**.
- [ ] Unggah lampiran sertifikat (PDF/JPG/PNG ≤5 MB) → tombol **Lihat** muncul & berfungsi.
- [ ] Uji batas: unggah >5 MB → ditolak dengan pesan jelas.

### US-2 — Edit/hapus `pending`/`ditolak`

- [ ] Edit rekaman `pending` → Simpan → status kembali **Menunggu Verifikasi**.
- [ ] Hapus rekaman `pending` milik sendiri → hilang dari daftar.

### US-3 — Verifikasi (PA / kemahasiswaan / prodi / admin)

- [ ] Login Dosen PA → menu **Verifikasi SKPI** → rekaman M1 terlihat (default filter: pending).
- [ ] **Reject** tanpa catatan → ditolak (validasi "catatan wajib").
- [ ] **Reject** dengan catatan → status **Ditolak**; catatan tampil di daftar M1.
- [ ] M1 edit rekaman `ditolak` → resubmit → **Menunggu Verifikasi**.
- [ ] **Approve** (opsional ubah poin) → status **Terverifikasi**.
- [ ] Filter baru: pencarian NIM/nama mahasiswa menemukan rekaman M1; dropdown **Mahasiswa** & **Prodi** berfungsi; **Reset Filter** mengembalikan tampilan penuh.
- [ ] **403**: login Dosen non-PA → `PUT /skpi/kegiatan/:id/verifikasi` (via curl/Postman) → 403.
- [ ] **403**: login M2 → akses `GET /skpi/dokumen/:mhsId` M1 → 403.
- [ ] **403**: staf dengan prodi berbeda → filter `prodiId` di luar lingkup → 403.

### US-4 — Unduh/Cetak SKPI (Mahasiswa)

- [ ] Login M1 → `/skpi` → tombol **Unduh/Cetak SKPI** aktif (syarat terpenuhi) → buka di tab baru.
- [ ] Dokumen memuat: kop, identitas, **tabel kegiatan termasuk kolom No. Sertifikat**, rekap poin, pernyataan, blok TTD + QR, footer `verifyUrl`/`UUID`/`Hash`.
- [ ] Print dialog terbuka otomatis (auto-print) dan via tombol Cetak.

### US-5 — Kelola kategori (admin/kemahasiswaan)

- [ ] Tambah kategori baru → panel tetap terbuka, kategori muncul di select form input.
- [ ] Nonaktifkan kategori → hilang dari select form input, tetap terlihat di panel kelola.
- [ ] Hapus kategori terpakai rekaman → error jelas dari server; tombol Hapus tidak muncul untuk prodi/kaprodi/kemahasiswaan.

### US-6 — Tanda tangan + verifikasi publik

- [ ] M1 (atau admin) → cetak SKPI → modal konfirmasi → tandatangani → QR tampil.
- [ ] Scan/buka QR → halaman verifikasi publik **VALID** (tanpa login); baris **Periode** tidak tampil untuk SKPI.
- [ ] Sign ulang tanpa perubahan data → `verifyUuid` **stabil** (idempoten).
- [ ] Setelah ada perubahan kegiatan terverifikasi → sign ulang → QR lama menampilkan **DICABUT/REVOKED**, QR baru **VALID**.

### US-7 — Ringkasan poin

- [ ] `/skpi` M1 menampilkan kartu: kegiatan terverifikasi, total poin, syarat, status tanda tangan.

### US-9 — Gate minimum kegiatan

- [ ] Set `skpi_min_kegiatan` = jumlah besar (mis. `5`) → tombol cetak disabled + pesan alasan.
- [ ] Kembalikan ke nilai semula → tombol aktif kembali.

## 4. Smoke Test Pasca-Deploy (5 menit, jalankan segera setiap deploy staging/produksi)

- [ ] `GET /health` → 200.
- [ ] Buka halaman verifikasi publik tanpa login: `/v/<uuid-sah>` (dari QR langkah US-6) → memuat hasil.
- [ ] Login admin → `/skpi` → daftar termuat tanpa error konsol.
- [ ] Buat 1 rekaman uji cepat → verifikasi → hapus kembali (data staging boleh dibersihkan).

## 5. Gate Rilis — Promosi ke Produksi

Promosi `development -> main` **hanya** setelah:

- [ ] Seluruh checklist §3 Pass (Fail = perbaiki dulu di PR baru ke `development`).
- [ ] Smoke test §4 Pass.
- [ ] **Env checklist produksi** (isi nilai, jangan simpan rahasia di dokumen ini):
  - [ ] `SIGN_HMAC_KEYS` produksi terisi & `SIGN_ACTIVE_KID` cocok
  - [ ] `VERIFY_BASE_URL` = domain verifikasi produksi (`https://verify.politekniksorowako.ac.id`)
  - [ ] `EMAIL_FROM` ter-set (domain terverifikasi Resend)
  - [ ] `APP_TIMEZONE` = `Asia/Makassar`
- [ ] Backup produksi terbaru ada & intakes valid (otomatis `deploy.sh`; verifikasi `pg_dump` non-kosong).
- [ ] Environment GitHub `production` punya **required reviewer** (setup sekali: Settings → Environments → production).
- [ ] CI hijau terakhir di PR promosi (required checks: Lint Code, Type Check Backend, Build Frontend, Docker Build Check).
- [ ] Sign-off di §7 terisi.

## 6. Runbook Pemulihan (Rollback)

**Gejala pemicu**: `/health` gagal >60s pasca-deploy, error massal API, atau data rusak.

1. **Rollback otomatis** (bila deploy gagal & `ROLLBACK_ON_FAILURE=true`): script `deploy.sh` menjalankan `scripts/rollback.sh` sendiri.
2. **Rollback manual dari server produksi** (`/var/www/simakjs`):

   ```bash
   ./scripts/rollback.sh list                        # lihat backup tersedia
   ./scripts/rollback.sh backup-YYYYMMDD-HHMMSS      # restore ke backup terpilih
   ```

3. **Kembalikan kode** bila bug aplikasi (bukan data) — tetap ikuti alur staging-first (AGENTS.md §1): buat **PR revert/hotfix ke `development`** (branch baru, bukan push langsung), verifikasi di staging, lalu promosikan `development -> main` via PR terpisah. Jangan push/revert langsung ke `main`.
4. **Catatan penting**:
   - Rollback DB = **restore backup**, bukan revert migrasi (migrasi SKPI tidak punya down-script; tabel baru bersifat inkremental dan aman ditinggalkan).
   - Setelah restore, restart backend agar koneksi DB bersih: `docker compose restart backend` (atau sesuai compose file env).
   - Kirim notifikasi Telegram manual ke tim bila insiden berdampak pengguna.
5. **Uji pemahaman**: latih jalur ini minimal sekali di staging per rilis besar (`./scripts/rollback.sh list` cukup untuk memastikan backup terdeteksi).

## 7. Sign-Off

| Peran | Nama | Tanggal | Hasil (Pass/Fail) | Catatan |
| :-- | :-- | :-- | :-- | :-- |
| Pengujian UAT | | | | |
| Reviewer kode | | | | |
| Penerima rilis (prod) | | | | |
